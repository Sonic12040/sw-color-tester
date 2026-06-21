import { createContext, useContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

/** A color saved to a palette, with optional designer annotations. */
export interface PaletteEntry {
  id: string;
  note?: string;
  room?: string;
}

/** A named palette (a "project" — e.g. one per room or client). */
export interface PaletteProject {
  id: string;
  name: string;
  entries: PaletteEntry[];
}

interface PaletteData {
  projects: PaletteProject[];
  activeId: string;
}

export interface PaletteContextValue {
  // --- Active-project view (back-compatible API used across the app) ---
  /** Color ids in the active project (order preserved). */
  palette: string[];
  /** Full entries (with notes/room) of the active project. */
  entries: PaletteEntry[];
  inPalette: (id: string) => boolean;
  togglePalette: (id: string) => void;
  removeFromPalette: (id: string) => void;
  clearPalette: () => void;
  /** Replace the active project's colors by id (reorder / load shared); notes are preserved for ids that remain. */
  setPalette: (ids: string[]) => void;
  setEntryNote: (id: string, note: string) => void;
  setEntryRoom: (id: string, room: string) => void;

  // --- Projects ---
  projects: PaletteProject[];
  activeProject: PaletteProject;
  selectProject: (id: string) => void;
  createProject: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used inside <PaletteProvider>");
  return ctx;
}

const DEFAULT_ID = "default";
const newDefault = (): PaletteData => ({
  projects: [{ id: DEFAULT_ID, name: "My palette", entries: [] }],
  activeId: DEFAULT_ID,
});

let idCounter = 0;
function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `p-${idCounter}`;
}

function normalizeEntries(raw: unknown): PaletteEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PaletteEntry[] = [];
  for (const e of raw) {
    if (typeof e === "string") out.push({ id: e });
    else if (e && typeof e === "object" && typeof e.id === "string") {
      out.push({
        id: e.id,
        ...(typeof e.note === "string" ? { note: e.note } : {}),
        ...(typeof e.room === "string" ? { room: e.room } : {}),
      });
    }
  }
  return out;
}

/** Parse stored data, migrating the legacy `string[]` palette to a single project. */
function parsePaletteData(raw: unknown): PaletteData | null {
  // Legacy format: a bare array of color ids.
  if (Array.isArray(raw)) {
    return {
      projects: [
        { id: DEFAULT_ID, name: "My palette", entries: normalizeEntries(raw) },
      ],
      activeId: DEFAULT_ID,
    };
  }
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as PaletteData).projects)
  ) {
    const projects = (raw as PaletteData).projects
      .filter(
        (p) => p && typeof p.id === "string" && typeof p.name === "string",
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        entries: normalizeEntries(p.entries),
      }));
    if (projects.length === 0) return null;
    const storedActive = (raw as PaletteData).activeId;
    const activeId = projects.some((p) => p.id === storedActive)
      ? storedActive
      : projects[0].id;
    return { projects, activeId };
  }
  return null;
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = usePersistentState<PaletteData>(
    STORAGE_KEYS.palette,
    newDefault(),
    parsePaletteData,
  );

  const activeProject =
    data.projects.find((p) => p.id === data.activeId) ?? data.projects[0];

  const actions = useMemo(() => {
    // Update the active project's entries immutably.
    const editActive = (fn: (entries: PaletteEntry[]) => PaletteEntry[]) =>
      setData((d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id === d.activeId ? { ...p, entries: fn(p.entries) } : p,
        ),
      }));

    return {
      togglePalette: (id: string) =>
        editActive((es) =>
          es.some((e) => e.id === id)
            ? es.filter((e) => e.id !== id)
            : [...es, { id }],
        ),
      removeFromPalette: (id: string) =>
        editActive((es) => es.filter((e) => e.id !== id)),
      clearPalette: () => editActive(() => []),
      // Reconcile by id so reordering keeps notes/room, and newly shared ids start blank.
      setPalette: (ids: string[]) =>
        editActive((es) => {
          const byId = new Map(es.map((e) => [e.id, e]));
          return ids.map((id) => byId.get(id) ?? { id });
        }),
      setEntryNote: (id: string, note: string) =>
        editActive((es) =>
          es.map((e) => (e.id === id ? { ...e, note: note || undefined } : e)),
        ),
      setEntryRoom: (id: string, room: string) =>
        editActive((es) =>
          es.map((e) => (e.id === id ? { ...e, room: room || undefined } : e)),
        ),
      selectProject: (id: string) =>
        setData((d) =>
          d.projects.some((p) => p.id === id) ? { ...d, activeId: id } : d,
        ),
      createProject: (name: string) =>
        setData((d) => {
          const id = genId();
          return {
            projects: [
              ...d.projects,
              { id, name: name.trim() || "Untitled palette", entries: [] },
            ],
            activeId: id,
          };
        }),
      renameProject: (id: string, name: string) =>
        setData((d) => ({
          ...d,
          projects: d.projects.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),
      deleteProject: (id: string) =>
        setData((d) => {
          const remaining = d.projects.filter((p) => p.id !== id);
          const projects = remaining.length ? remaining : newDefault().projects;
          const activeId = projects.some((p) => p.id === d.activeId)
            ? d.activeId
            : projects[0].id;
          return { projects, activeId };
        }),
    };
  }, [setData]);

  const value = useMemo<PaletteContextValue>(
    () => ({
      palette: activeProject.entries.map((e) => e.id),
      entries: activeProject.entries,
      inPalette: (id: string) => activeProject.entries.some((e) => e.id === id),
      projects: data.projects,
      activeProject,
      ...actions,
    }),
    [data.projects, activeProject, actions],
  );

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}
