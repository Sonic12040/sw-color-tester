import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Color } from "../data/types.js";
import { hsl, classifyLrv, hueRelation } from "../utils/colorMath.js";
import {
  assignRoles,
  suggestCompanions,
  PALETTE_ROLES,
} from "../utils/paletteIntelligence.js";
import { explainRole } from "../utils/colorCopy.js";
import { colorPath, BASENAME } from "../utils/base.js";
import { toSlug } from "../utils/slug.js";
import { copyText } from "../utils/clipboard.js";
import { parseProjectFile } from "../utils/projectFile.js";
import {
  decodeProjectParam,
  encodeProjectParam,
} from "../utils/projectShare.js";
import type { PaletteProject } from "../domain/paletteData.js";
import { useAppContext } from "../context/AppContext.js";
import { usePalette, type PaletteEntry } from "../context/PaletteContext.js";
import { useToast } from "../components/Toast/Toast.js";
import { EmptyState } from "../components/EmptyState/EmptyState.js";
import { WorkOrderView } from "../components/Workspace/WorkOrderView.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { exportService } from "../appModel.js";
import styles from "./PalettePage.module.css";

/** Project lens (US15.3): Designer Board vs Painter Work Order. */
type PaletteLens = "board" | "workorder";
const LENSES: { key: PaletteLens; label: string }[] = [
  { key: "board", label: "Board" },
  { key: "workorder", label: "Work Order" },
];
const isLens = (v: unknown): v is PaletteLens =>
  v === "board" || v === "workorder";

export function PalettePage() {
  const { colorModel } = useAppContext();
  const {
    entries,
    setPalette,
    togglePalette,
    removeFromPalette,
    clearPalette,
    setEntryNote,
    setEntryRoom,
    setEntryRole,
    projects,
    activeProject,
    selectProject,
    createProject,
    renameProject,
    deleteProject,
    importProject,
  } = usePalette();
  const [searchParams] = useSearchParams();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showCompanions, setShowCompanions] = useState(false);
  // View preference persists across visits (US15.3); flat/empty projects render
  // the same in either lens, so the toggle only appears once there are colors.
  const [lens, setLens] = usePersistentState<PaletteLens>(
    STORAGE_KEYS.paletteLens,
    "board",
    (raw) => (isLens(raw) ? raw : null),
  );
  const showToast = useToast();
  useDocumentMeta("My palette | Sherwin-Williams Color Atlas");

  // Resolve each entry to its color, dropping any that no longer exist.
  const rows = entries
    .map((entry) => ({ entry, color: colorModel.getColorById(entry.id) }))
    .filter((r): r is { entry: PaletteEntry; color: Color } =>
      Boolean(r.color),
    );
  const colors = rows.map((r) => r.color);

  // 60-30-10 role + proportion across the whole palette (honoring overrides).
  const roleByIndex = assignRoles(
    colors,
    Object.fromEntries(rows.map((r) => [r.color.id, r.entry.role])),
  );

  // Companion suggestions are computed on demand (cheap full-catalog scan).
  const companions = showCompanions
    ? suggestCompanions(colors, colorModel.getActiveColors(), 4)
    : [];

  // A shared palette arrives as ?c=slug,slug,… — resolve it to ids on demand.
  const sharedIds = useMemo(() => {
    const raw = searchParams.get("c");
    if (!raw) return [];
    return raw
      .split(",")
      .map((slug) => colorModel.getColorBySlug(slug.trim())?.id)
      .flatMap((id) => (id ? [id] : []));
  }, [searchParams, colorModel]);

  // A full structured Project arrives compressed in ?project= (E18.2). Decode is
  // async (gzip), so resolve it into state and offer an explicit import.
  const projectParam = searchParams.get("project");
  const [sharedProject, setSharedProject] = useState<PaletteProject | null>(
    null,
  );
  useEffect(() => {
    if (!projectParam) {
      setSharedProject(null);
      return;
    }
    let cancelled = false;
    decodeProjectParam(projectParam).then((p) => {
      if (!cancelled) setSharedProject(p);
    });
    return () => {
      cancelled = true;
    };
  }, [projectParam]);

  const move = (index: number, delta: number) => {
    const ids = rows.map((r) => r.color.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setPalette(ids); // reconciles by id — notes/room are preserved
  };

  const copyShareLink = async () => {
    const slugs = colors.map((c) => toSlug(c)).join(",");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${BASENAME}/palette?c=${slugs}`;
    showToast(
      (await copyText(url))
        ? "Share link copied to clipboard"
        : "Couldn't copy link",
    );
  };

  // E18.2: copy a link carrying the whole structured Project (compressed). Above
  // the size threshold the encoder returns null → steer the user to a file.
  const copyProjectLink = async () => {
    const param = await encodeProjectParam(activeProject);
    if (!param) {
      showToast(
        "This project is too large to share by link — export a file instead.",
      );
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${BASENAME}/palette?project=${param}`;
    showToast(
      (await copyText(url))
        ? "Project link copied to clipboard"
        : "Couldn't copy link",
    );
  };

  // E18.1: export the active Project to a versioned JSON file.
  const exportProjectFile = () => {
    try {
      exportService.exportProjectFile(activeProject);
    } catch {
      showToast("Couldn't export the project file");
    }
  };

  // E18.1: import a project file as a NEW project (no silent overwrite).
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const project = parseProjectFile(JSON.parse(await file.text()));
      if (!project) {
        showToast("That file isn't a valid project export");
        return;
      }
      importProject(project);
      showToast(`Imported “${project.name}”`);
    } catch {
      showToast("Couldn't read that file");
    }
  };

  const exportOpts = {
    project: activeProject.name,
    annotations: Object.fromEntries(
      rows.map((r) => [
        r.color.id,
        { note: r.entry.note, room: r.entry.room, role: r.entry.role },
      ]),
    ),
  };
  const exportPdf = async () => {
    try {
      await exportService.exportSpecPdf(colors, exportOpts);
    } catch {
      showToast("Couldn't generate the PDF");
    }
  };
  const exportPng = async () => {
    try {
      await exportService.exportBoardPng(colors, exportOpts);
    } catch {
      showToast("Couldn't generate the image");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>My palette</h1>
          {/* Export/share/clear only make sense with colors in the palette — hide
            them when empty rather than showing a row of disabled buttons. */}
          {colors.length > 0 && (
            <div className={styles.actions}>
              <button
                type="button"
                className="btn-on-dark"
                onClick={copyShareLink}
              >
                Copy share link
              </button>
              <button
                type="button"
                className="btn-on-dark"
                onClick={copyProjectLink}
              >
                Copy project link
              </button>
              <button type="button" className="btn-on-dark" onClick={exportPdf}>
                Export PDF
              </button>
              <button type="button" className="btn-on-dark" onClick={exportPng}>
                Export PNG
              </button>
              <Link
                className="btn-on-dark"
                to={`/embed-builder?c=${colors.map((c) => toSlug(c)).join(",")}`}
              >
                Embed
              </Link>
              <button
                type="button"
                className="btn-on-dark"
                onClick={clearPalette}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Projects: switch between named palettes, rename, add, delete. */}
        <div className={styles.projects}>
          <label className={styles.projectField}>
            <span className={styles.projectLabel}>Palette</span>
            <select
              className="field-on-dark"
              value={activeProject.id}
              onChange={(e) => selectProject(e.target.value)}
              aria-label="Select palette"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.projectField}>
            <span className={styles.projectLabel}>Name</span>
            <input
              className={`field-on-dark ${styles.projectName}`}
              value={activeProject.name}
              onChange={(e) => renameProject(activeProject.id, e.target.value)}
              aria-label="Palette name"
            />
          </label>
          <button
            type="button"
            className="btn-on-dark"
            onClick={() => createProject(`Palette ${projects.length + 1}`)}
          >
            New palette
          </button>
          <button
            type="button"
            className="btn-on-dark"
            disabled={projects.length <= 1}
            onClick={() => deleteProject(activeProject.id)}
          >
            Delete palette
          </button>
          {/* E18.1: project file portability — no account needed. */}
          <button
            type="button"
            className="btn-on-dark"
            onClick={exportProjectFile}
          >
            Export file
          </button>
          <button
            type="button"
            className="btn-on-dark"
            onClick={() => importInputRef.current?.click()}
          >
            Import file
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import project file"
            onChange={onImportFile}
          />
        </div>

        {sharedIds.length > 0 && (
          <div className={styles.banner}>
            <span>
              A shared palette of {sharedIds.length} colors is in this link.
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPalette(sharedIds)}
            >
              Load shared palette
            </button>
          </div>
        )}

        {sharedProject && (
          <div className={styles.banner}>
            <span>
              A shared project “{sharedProject.name}” is in this link
              {sharedProject.rooms?.length
                ? ` (${sharedProject.rooms.length} room${
                    sharedProject.rooms.length === 1 ? "" : "s"
                  })`
                : ""}
              .
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                importProject(sharedProject);
                showToast(`Imported “${sharedProject.name}”`);
              }}
            >
              Import shared project
            </button>
          </div>
        )}

        {colors.length === 0 ? (
          <EmptyState
            onDark
            title="This palette is empty."
            description="Open any color and choose “Add to palette” to start building one."
            action={
              <Link to="/" className="btn-secondary">
                Browse colors
              </Link>
            }
          />
        ) : (
          <>
            {/* Project lens toggle (US15.3): Designer Board ↔ Painter Work
                Order over the same data. Uses the shared on-dark toggle look. */}
            <div
              className={styles.lensToggle}
              role="group"
              aria-label="Palette view"
            >
              {LENSES.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  className={`btn-on-dark ${lens === l.key ? "is-active" : ""}`}
                  aria-pressed={lens === l.key}
                  onClick={() => setLens(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {lens === "workorder" ? (
              <WorkOrderView />
            ) : (
              <>
                <div className={styles.strip} aria-hidden="true">
                  {colors.map((c) => (
                    <div
                      key={c.id}
                      className={styles.stripCell}
                      style={{ background: hsl(c) }}
                    />
                  ))}
                </div>
                <ol className={styles.list}>
                  {rows.map(({ entry, color: c }, i) => (
                    <li className={styles.row} key={c.id}>
                      <span
                        className={styles.swatch}
                        style={{ background: hsl(c) }}
                      />
                      <span className={styles.info}>
                        <Link className={styles.name} to={colorPath(toSlug(c))}>
                          {c.name}
                        </Link>
                        <span className={styles.meta}>
                          {" "}
                          SW {c.colorNumber} · {classifyLrv(c.lrv)} · LRV{" "}
                          {c.lrv.toFixed(1)}
                        </span>
                        {i > 0 && (
                          <span
                            className={styles.relation}
                            title="Hue relationship to the color above"
                          >
                            {hueRelation(colors[i - 1], c)} from previous
                          </span>
                        )}
                        <span className={styles.roleLine}>
                          <span
                            className={styles.roleBadge}
                            data-role={roleByIndex[i].role}
                            title={explainRole(roleByIndex[i].role)}
                          >
                            {roleByIndex[i].role} · {roleByIndex[i].proportion}%
                          </span>
                          <select
                            className="field-on-dark"
                            value={entry.role ?? "auto"}
                            aria-label={`Role for ${c.name}`}
                            onChange={(e) =>
                              setEntryRole(
                                c.id,
                                e.target.value === "auto"
                                  ? null
                                  : (e.target
                                      .value as (typeof PALETTE_ROLES)[number]),
                              )
                            }
                          >
                            <option value="auto">Auto</option>
                            {PALETTE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </span>
                        <span className={styles.entryFields}>
                          <input
                            className={`field-on-dark ${styles.entryInput}`}
                            value={entry.note ?? ""}
                            placeholder="Note"
                            aria-label={`Note for ${c.name}`}
                            onChange={(e) => setEntryNote(c.id, e.target.value)}
                          />
                          <input
                            className={`field-on-dark ${styles.entryRoom}`}
                            value={entry.room ?? ""}
                            placeholder="Room"
                            aria-label={`Room for ${c.name}`}
                            onChange={(e) => setEntryRoom(c.id, e.target.value)}
                          />
                        </span>
                      </span>
                      <span className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label={`Move ${c.name} up`}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label={`Move ${c.name} down`}
                          disabled={i === rows.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label={`Remove ${c.name}`}
                          onClick={() => removeFromPalette(c.id)}
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>

                <section
                  className={styles.companions}
                  aria-label="Palette intelligence"
                >
                  <div className={styles.companionsHead}>
                    <h2 className={styles.subTitle}>Suggested companions</h2>
                    <button
                      type="button"
                      className="btn-on-dark"
                      aria-expanded={showCompanions}
                      onClick={() => setShowCompanions((v) => !v)}
                    >
                      {showCompanions
                        ? "Hide suggestions"
                        : "Suggest companions"}
                    </button>
                  </div>
                  {showCompanions &&
                    (companions.length > 0 ? (
                      <>
                        <p className={styles.companionsHint}>
                          Colors that round out this palette — balancing
                          neutrality, light/dark range, and hue variety.
                        </p>
                        <ul className={styles.companionList}>
                          {companions.map((c) => (
                            <li key={c.id} className={styles.companion}>
                              <span
                                className={styles.companionSwatch}
                                style={{ background: hsl(c) }}
                              />
                              <span className={styles.info}>
                                <Link
                                  className={styles.name}
                                  to={colorPath(toSlug(c))}
                                >
                                  {c.name}
                                </Link>
                                <span className={styles.meta}>
                                  SW {c.colorNumber} · {classifyLrv(c.lrv)}
                                </span>
                              </span>
                              <button
                                type="button"
                                className="btn-on-dark"
                                aria-label={`Add ${c.name} to palette`}
                                onClick={() => {
                                  togglePalette(c.id);
                                  showToast(`Added ${c.name} to palette`);
                                }}
                              >
                                Add
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className={styles.companionsHint}>
                        No suggestions right now — try removing a color or two.
                      </p>
                    ))}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
