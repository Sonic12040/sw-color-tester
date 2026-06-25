import { createContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { useRequiredContext } from "./useRequiredContext.js";
import type { PaletteRole } from "../domain/types.js";
import {
  type Room,
  type Surface,
  type SurfaceType,
} from "../domain/project.js";
import {
  genId,
  newDefault,
  parsePaletteData,
  type PaletteData,
  type PaletteEntry,
  type PaletteProject,
} from "../domain/paletteData.js";

// Re-exported for back-compat: UI keeps importing these from the context.
export type { PaletteEntry, PaletteProject };

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
  /** Pin a 60-30-10 role for a color, or pass `null` to revert to auto. */
  setEntryRole: (id: string, role: PaletteRole | null) => void;

  // --- Projects ---
  projects: PaletteProject[];
  activeProject: PaletteProject;
  selectProject: (id: string) => void;
  createProject: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  /** Add a (validated) project as a new entry with a fresh id, and select it (E18.1). */
  importProject: (project: PaletteProject) => void;

  // --- Rooms & surfaces (active project's structured job model, E15) ---
  rooms: Room[];
  addRoom: (name?: string) => void;
  renameRoom: (roomId: string, name: string) => void;
  deleteRoom: (roomId: string) => void;
  addSurface: (roomId: string, type?: SurfaceType) => void;
  updateSurface: (
    roomId: string,
    surfaceId: string,
    patch: Partial<Surface>,
  ) => void;
  deleteSurface: (roomId: string, surfaceId: string) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePalette(): PaletteContextValue {
  return useRequiredContext(PaletteContext, "usePalette", "PaletteProvider");
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

    // Update the active project's rooms immutably (rooms default to []).
    const editRooms = (fn: (rooms: Room[]) => Room[]) =>
      setData((d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id === d.activeId ? { ...p, rooms: fn(p.rooms ?? []) } : p,
        ),
      }));

    const editSurfaces = (
      roomId: string,
      fn: (surfaces: Surface[]) => Surface[],
    ) =>
      editRooms((rooms) =>
        rooms.map((r) =>
          r.id === roomId ? { ...r, surfaces: fn(r.surfaces) } : r,
        ),
      );

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
      setEntryRole: (id: string, role: PaletteRole | null) =>
        editActive((es) =>
          es.map((e) => (e.id === id ? { ...e, role: role ?? undefined } : e)),
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
      // Land an imported project as a NEW project (fresh id, no silent
      // overwrite); the incoming data is already validated by `normalizeProject`.
      importProject: (project: PaletteProject) =>
        setData((d) => {
          const id = genId();
          const imported: PaletteProject = {
            ...project,
            id,
            name: project.name.trim() || "Imported project",
          };
          return {
            projects: [...d.projects, imported],
            activeId: id,
          };
        }),

      // --- Rooms & surfaces ---
      addRoom: (name?: string) =>
        editRooms((rooms) => [
          ...rooms,
          {
            id: genId(),
            name: name?.trim() || `Room ${rooms.length + 1}`,
            surfaces: [],
          },
        ]),
      renameRoom: (roomId: string, name: string) =>
        editRooms((rooms) =>
          rooms.map((r) =>
            r.id === roomId ? { ...r, name: name.trim() || r.name } : r,
          ),
        ),
      deleteRoom: (roomId: string) =>
        editRooms((rooms) => rooms.filter((r) => r.id !== roomId)),
      addSurface: (roomId: string, type: SurfaceType = "wall") =>
        editSurfaces(roomId, (surfaces) => [
          ...surfaces,
          { id: genId(), type, coats: 2 },
        ]),
      // Merge a partial surface; keys explicitly set to `undefined` are cleared
      // (e.g. unassigning a color, or switching between area ↔ dimensions).
      updateSurface: (
        roomId: string,
        surfaceId: string,
        patch: Partial<Surface>,
      ) =>
        editSurfaces(roomId, (surfaces) =>
          surfaces.map((s) => {
            if (s.id !== surfaceId) return s;
            const next: Surface = { ...s, ...patch };
            for (const k of Object.keys(patch) as (keyof Surface)[]) {
              if (patch[k] === undefined) delete next[k];
            }
            return next;
          }),
        ),
      deleteSurface: (roomId: string, surfaceId: string) =>
        editSurfaces(roomId, (surfaces) =>
          surfaces.filter((s) => s.id !== surfaceId),
        ),
    };
  }, [setData]);

  const value = useMemo<PaletteContextValue>(
    () => ({
      palette: activeProject.entries.map((e) => e.id),
      entries: activeProject.entries,
      inPalette: (id: string) => activeProject.entries.some((e) => e.id === id),
      projects: data.projects,
      activeProject,
      rooms: activeProject.rooms ?? [],
      ...actions,
    }),
    [data.projects, activeProject, actions],
  );

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}
