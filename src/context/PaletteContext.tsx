import { createContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { useRequiredContext } from "./useRequiredContext.js";
import type { PaletteRole } from "../domain/types.js";
import {
  isFinish,
  isSurfaceType,
  type Room,
  type Surface,
  type SurfaceDimensions,
  type SurfaceType,
} from "../domain/project.js";

const PALETTE_ROLES: PaletteRole[] = ["Dominant", "Secondary", "Accent"];
const isRole = (v: unknown): v is PaletteRole =>
  typeof v === "string" && (PALETTE_ROLES as string[]).includes(v);

/** A color saved to a palette, with optional designer annotations. */
export interface PaletteEntry {
  id: string;
  note?: string;
  room?: string;
  /** Manual 60-30-10 role override; absent = auto-assigned from the palette. */
  role?: PaletteRole;
}

/** A named palette (a "project" — e.g. one per room or client). */
export interface PaletteProject {
  id: string;
  name: string;
  entries: PaletteEntry[];
  /** Optional structured job model (E15): rooms → surfaces. Absent = flat list. */
  rooms?: Room[];
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
  /** Pin a 60-30-10 role for a color, or pass `null` to revert to auto. */
  setEntryRole: (id: string, role: PaletteRole | null) => void;

  // --- Projects ---
  projects: PaletteProject[];
  activeProject: PaletteProject;
  selectProject: (id: string) => void;
  createProject: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;

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
        ...(isRole(e.role) ? { role: e.role } : {}),
      });
    }
  }
  return out;
}

const isFiniteNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function normalizeDimensions(raw: unknown): SurfaceDimensions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  if (
    !isFiniteNum(d.lengthFt) ||
    !isFiniteNum(d.widthFt) ||
    !isFiniteNum(d.heightFt)
  )
    return undefined;
  return {
    lengthFt: d.lengthFt,
    widthFt: d.widthFt,
    heightFt: d.heightFt,
    ...(isFiniteNum(d.doors) ? { doors: d.doors } : {}),
    ...(isFiniteNum(d.windows) ? { windows: d.windows } : {}),
  };
}

function normalizeSurfaces(raw: unknown): Surface[] {
  if (!Array.isArray(raw)) return [];
  const out: Surface[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    if (typeof s.id !== "string" || !isSurfaceType(s.type)) continue;
    const dimensions = normalizeDimensions(s.dimensions);
    out.push({
      id: s.id,
      type: s.type,
      ...(typeof s.colorId === "string" ? { colorId: s.colorId } : {}),
      ...(isFinish(s.finish) ? { finish: s.finish } : {}),
      ...(isFiniteNum(s.coats) ? { coats: s.coats } : {}),
      ...(isFiniteNum(s.areaSqFt) ? { areaSqFt: s.areaSqFt } : {}),
      ...(dimensions ? { dimensions } : {}),
    });
  }
  return out;
}

function normalizeRooms(raw: unknown): Room[] {
  if (!Array.isArray(raw)) return [];
  const out: Room[] = [];
  for (const r of raw) {
    if (
      r &&
      typeof r === "object" &&
      typeof r.id === "string" &&
      typeof r.name === "string"
    ) {
      out.push({
        id: r.id,
        name: r.name,
        surfaces: normalizeSurfaces(r.surfaces),
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
      .map((p) => {
        const rooms = normalizeRooms((p as PaletteProject).rooms);
        return {
          id: p.id,
          name: p.name,
          entries: normalizeEntries(p.entries),
          ...(rooms.length ? { rooms } : {}),
        };
      });
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
