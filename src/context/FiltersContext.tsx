import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import type { Undertone } from "../utils/colorPresentation.js";
import type {
  AtlasView,
  FilterCriteria,
  SortKey,
} from "../models/ColorModel.js";

export interface LrvRange {
  min: number;
  max: number;
}

export type UseType = "interior" | "exterior" | null;

export interface FiltersContextValue {
  // Facet state
  search: string;
  families: string[];
  undertones: Undertone[];
  lrvMin: number;
  lrvMax: number;
  lrvRange: LrvRange;
  useType: UseType;
  collections: string[];
  designerOnly: boolean;
  view: AtlasView;
  sort: SortKey;

  // Setters / togglers
  setSearch: (s: string) => void;
  toggleFamily: (f: string) => void;
  toggleUndertone: (u: Undertone) => void;
  setLrvRange: (min: number, max: number) => void;
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
  isLrvActive: boolean;
}

export const FiltersContext = createContext<FiltersContextValue | null>(null);

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters must be used inside <FiltersProvider>");
  }
  return ctx;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const DEFAULT_RANGE: LrvRange = { min: 0, max: 100 };

function parseLrvRange(raw: unknown): LrvRange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.min !== "number" || typeof r.max !== "number") return null;
  return { min: clamp(r.min), max: clamp(r.max) };
}

const SORT_KEYS: SortKey[] = ["family", "hue", "lrv-asc", "lrv-desc", "name"];
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
  const [useType, setUseType] = useState<UseType>(null);
  const [collections, setCollections] = useState<string[]>([]);
  const [designerOnly, setDesignerOnly] = useState(false);
  const [view, setView] = useState<AtlasView>("all");

  // Persisted preferences.
  const [range, setRange] = usePersistentState<LrvRange>(
    STORAGE_KEYS.lrv,
    DEFAULT_RANGE,
    parseLrvRange,
  );
  const [sort, setSort] = usePersistentState<SortKey>(
    STORAGE_KEYS.sort,
    "family",
    parseSort,
  );

  const { min: lrvMin, max: lrvMax } = range;

  const setLrvRange = useCallback(
    (min: number, max: number) =>
      setRange({ min: clamp(min), max: clamp(max) }),
    [setRange],
  );
  const toggleFamily = useCallback(
    (f: string) => setFamilies((prev) => toggle(prev, f)),
    [],
  );
  const toggleUndertone = useCallback(
    (u: Undertone) => setUndertones((prev) => toggle(prev, u)),
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
    setUseType(null);
    setCollections([]);
    setDesignerOnly(false);
    setView("all");
    setRange(DEFAULT_RANGE);
  }, [setRange]);

  const isLrvActive = lrvMin > 0 || lrvMax < 100;

  const activeFacetCount =
    families.length +
    undertones.length +
    collections.length +
    (useType ? 1 : 0) +
    (designerOnly ? 1 : 0) +
    (isLrvActive ? 1 : 0);

  const criteria = useMemo<FilterCriteria>(
    () => ({
      search,
      families,
      undertones,
      lrvRange: range,
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
      range,
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
      lrvMin,
      lrvMax,
      lrvRange: range,
      useType,
      collections,
      designerOnly,
      view,
      sort,
      setSearch,
      toggleFamily,
      toggleUndertone,
      setLrvRange,
      setUseType,
      toggleCollection,
      setDesignerOnly,
      setView,
      setSort,
      resetAll,
      criteria,
      activeFacetCount,
      isLrvActive,
    }),
    [
      search,
      families,
      undertones,
      lrvMin,
      lrvMax,
      range,
      useType,
      collections,
      designerOnly,
      view,
      sort,
      setLrvRange,
      toggleFamily,
      toggleUndertone,
      toggleCollection,
      setSort,
      resetAll,
      criteria,
      activeFacetCount,
      isLrvActive,
    ],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}
