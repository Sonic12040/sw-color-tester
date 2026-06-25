/**
 * Project file format (E18.1) — the versioned envelope a Project is exported to
 * and imported from, so work is portable across devices / teammates **without an
 * account**. Import runs the payload back through `normalizeProject` (the same
 * validation as stored data), so malformed or legacy files fail safe.
 */

import {
  normalizeProject,
  type PaletteProject,
} from "../domain/paletteData.js";

/** Discriminator so we can tell our files from arbitrary JSON. */
export const PROJECT_FILE_KIND = "sw-color-tester/project";
/** Bump when the on-disk shape changes incompatibly; `parse` migrates older. */
export const PROJECT_FILE_VERSION = 1;

export interface ProjectFile {
  kind: typeof PROJECT_FILE_KIND;
  version: number;
  project: PaletteProject;
}

/** Pure: wrap a project in the versioned export envelope. */
export function serializeProject(project: PaletteProject): ProjectFile {
  return {
    kind: PROJECT_FILE_KIND,
    version: PROJECT_FILE_VERSION,
    project,
  };
}

/**
 * Pure: validate + normalize an imported file (parsed JSON) back into a project,
 * or `null` if it isn't a recognizable project export. Accepts both the wrapped
 * envelope and a bare project object (lenient on hand-edited / legacy files).
 */
export function parseProjectFile(raw: unknown): PaletteProject | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<ProjectFile> & PaletteProject;
  // Wrapped envelope: require our kind, then normalize the inner project.
  if (typeof obj.kind === "string") {
    if (obj.kind !== PROJECT_FILE_KIND) return null;
    return normalizeProject(obj.project);
  }
  // Bare project object (no envelope) — still accept it if it normalizes.
  return normalizeProject(raw);
}
