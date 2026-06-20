import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { LRV_CLASSES } from "../utils/colorMath.js";
import type {
  AtlasView,
  FilterCriteria,
  LrvClass,
  NeutralClass,
  SortKey,
  Undertone,
  UseType,
} from "../domain/types.js";

export interface FiltersContextValue {
  // Facet state
  search: string;
  families: string[];
  undertones: Undertone[];
  lightness: LrvClass[];
  neutrality: NeutralClass[];
  useType: UseType;
  collections: string[];
  designerOnly: boolean;
  view: AtlasView;
  sort: SortKey;

  // Setters / togglers
  setSearch: (s: string) => void;
  toggleFamily: (f: string) => void;
  toggleUndertone: (u: Undertone) => void;
  toggleLightness: (l: LrvClass) => void;
  toggleNeutrality: (n: NeutralClass) => void;
  setUseType: (t: UseType) => void;
  toggleCollection: (c: string) => void;
  setDesignerOnly: (v: boolean) => void;
  setView: (v: AtlasView) => void;
  setSort: (s: SortKey) => void;
  resetAll: () => void;

  // Derived
  criteria: FilterCriteria;
  /** Count of active facets (excludes search/sort/view) — for the "Filters (n)" badge. */
  activeFacetCount: number;
}

export const FiltersContext = createContext<FiltersContextValue | null>(null);

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters must be used inside <FiltersProvider>");
  }
  return ctx;
}

function parseLightness(raw: unknown): LrvClass[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((x): x is LrvClass =>
    (LRV_CLASSES as string[]).includes(x),
  );
}

const SORT_KEYS: SortKey[] = [
  "family",
  "hue",
  "lrv-asc",
  "lrv-desc",
  "name",
  "neutral-high",
  "neutral-low",
];
const parseSort = (raw: unknown): SortKey | null =>
  typeof raw === "string" && (SORT_KEYS as string[]).includes(raw)
    ? (raw as SortKey)
    : null;

const toggle = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  // Ephemeral, per-session facets (not persisted — they describe a transient query).
  const [search, setSearch] = useState("");
  const [families, setFamilies] = useState<string[]>([]);
  const [undertones, setUndertones] = useState<Undertone[]>([]);
  const [neutrality, setNeutrality] = useState<NeutralClass[]>([]);
  const [useType, setUseType] = useState<UseType>(null);
  const [collections, setCollections] = useState<string[]>([]);
  const [designerOnly, setDesignerOnly] = useState(false);
  const [view, setView] = useState<AtlasView>("all");

  // Persisted preferences.
  const [lightness, setLightness] = usePersistentState<LrvClass[]>(
    STORAGE_KEYS.lightness,
    [],
    parseLightness,
  );
  const [sort, setSort] = usePersistentState<SortKey>(
    STORAGE_KEYS.sort,
    "family",
    parseSort,
  );

  const toggleFamily = useCallback(
    (f: string) => setFamilies((prev) => toggle(prev, f)),
    [],
  );
  const toggleUndertone = useCallback(
    (u: Undertone) => setUndertones((prev) => toggle(prev, u)),
    [],
  );
  const toggleLightness = useCallback(
    (l: LrvClass) => setLightness((prev) => toggle(prev, l)),
    [setLightness],
  );
  const toggleNeutrality = useCallback(
    (n: NeutralClass) => setNeutrality((prev) => toggle(prev, n)),
    [],
  );
  const toggleCollection = useCallback(
    (c: string) => setCollections((prev) => toggle(prev, c)),
    [],
  );

  const resetAll = useCallback(() => {
    setSearch("");
    setFamilies([]);
    setUndertones([]);
    setNeutrality([]);
    setUseType(null);
    setCollections([]);
    setDesignerOnly(false);
    setView("all");
    setLightness([]);
  }, [setLightness]);

  const activeFacetCount =
    families.length +
    undertones.length +
    lightness.length +
    neutrality.length +
    collections.length +
    (useType ? 1 : 0) +
    (designerOnly ? 1 : 0);

  const criteria = useMemo<FilterCriteria>(
    () => ({
      search,
      families,
      undertones,
      lightness,
      neutrality,
      useType,
      collections,
      designerOnly,
      view,
      sort,
    }),
    [
      search,
      families,
      undertones,
      lightness,
      neutrality,
      useType,
      collections,
      designerOnly,
      view,
      sort,
    ],
  );

  const value = useMemo<FiltersContextValue>(
    () => ({
      search,
      families,
      undertones,
      lightness,
      neutrality,
      useType,
      collections,
      designerOnly,
      view,
      sort,
      setSearch,
      toggleFamily,
      toggleUndertone,
      toggleLightness,
      toggleNeutrality,
      setUseType,
      toggleCollection,
      setDesignerOnly,
      setView,
      setSort,
      resetAll,
      criteria,
      activeFacetCount,
    }),
    [
      search,
      families,
      undertones,
      lightness,
      neutrality,
      useType,
      collections,
      designerOnly,
      view,
      sort,
      toggleFamily,
      toggleUndertone,
      toggleLightness,
      toggleNeutrality,
      toggleCollection,
      setSort,
      resetAll,
      criteria,
      activeFacetCount,
    ],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}
