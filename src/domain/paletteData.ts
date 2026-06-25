/**
 * Palette data layer: the persisted shape (projects + active id) and the pure
 * parse/normalize/migrate functions that guard every entry into the app —
 * whether it comes from `localStorage`, an imported project file (E18.1), or a
 * shared project link (E18.2). Keeping these pure and framework-free means the
 * same validation runs in the context, in file import, and in unit tests.
 *
 * `PaletteContext` consumes (and re-exports) these; UI keeps importing the types
 * from the context for back-compat.
 */

import type { PaletteRole } from "./types.js";
import {
  isFinish,
  isSurfaceType,
  type Room,
  type Surface,
  type SurfaceDimensions,
} from "./project.js";

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

export interface PaletteData {
  projects: PaletteProject[];
  activeId: string;
}

export const DEFAULT_ID = "default";

export const newDefault = (): PaletteData => ({
  projects: [{ id: DEFAULT_ID, name: "My palette", entries: [] }],
  activeId: DEFAULT_ID,
});

let idCounter = 0;
export function genId(): string {
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
      ...(s.done === true ? { done: true } : {}),
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

/**
 * Pure: validate + normalize one project (the per-project half of
 * `parsePaletteData`). Returns `null` for anything that isn't a usable project
 * (missing id/name). Reused by file import + project-link decode (E18).
 */
export function normalizeProject(raw: unknown): PaletteProject | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<PaletteProject>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  const rooms = normalizeRooms(p.rooms);
  return {
    id: p.id,
    name: p.name,
    entries: normalizeEntries(p.entries),
    ...(rooms.length ? { rooms } : {}),
  };
}

/** Parse stored data, migrating the legacy `string[]` palette to a single project. */
export function parsePaletteData(raw: unknown): PaletteData | null {
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
      .map(normalizeProject)
      .filter((p): p is PaletteProject => p !== null);
    if (projects.length === 0) return null;
    const storedActive = (raw as PaletteData).activeId;
    const activeId = projects.some((p) => p.id === storedActive)
      ? storedActive
      : projects[0].id;
    return { projects, activeId };
  }
  return null;
}
