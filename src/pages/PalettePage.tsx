import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import type { Color } from "../data/types.js";
import { hsl, classifyLrv, hueRelation } from "../utils/colorMath.js";
import { colorPath, BASENAME } from "../utils/base.js";
import { toSlug } from "../utils/slug.js";
import { copyText } from "../utils/clipboard.js";
import { useAppContext } from "../context/AppContext.js";
import { usePalette, type PaletteEntry } from "../context/PaletteContext.js";
import { useToast } from "../components/Toast/Toast.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { exportService } from "../appModel.js";
import styles from "./PalettePage.module.css";

export function PalettePage() {
  const { colorModel } = useAppContext();
  const {
    entries,
    setPalette,
    removeFromPalette,
    clearPalette,
    setEntryNote,
    setEntryRoom,
    projects,
    activeProject,
    selectProject,
    createProject,
    renameProject,
    deleteProject,
  } = usePalette();
  const [searchParams] = useSearchParams();
  const showToast = useToast();
  useDocumentMeta("My palette | Sherwin-Williams Color Atlas");

  // Resolve each entry to its color, dropping any that no longer exist.
  const rows = entries
    .map((entry) => ({ entry, color: colorModel.getColorById(entry.id) }))
    .filter((r): r is { entry: PaletteEntry; color: Color } =>
      Boolean(r.color),
    );
  const colors = rows.map((r) => r.color);

  // A shared palette arrives as ?c=slug,slug,… — resolve it to ids on demand.
  const sharedIds = useMemo(() => {
    const raw = searchParams.get("c");
    if (!raw) return [];
    return raw
      .split(",")
      .map((slug) => colorModel.getColorBySlug(slug.trim())?.id)
      .flatMap((id) => (id ? [id] : []));
  }, [searchParams, colorModel]);

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

  const exportJson = () =>
    exportService.exportColors(colors, {
      project: activeProject.name,
      annotations: Object.fromEntries(
        rows.map((r) => [
          r.color.id,
          { note: r.entry.note, room: r.entry.room },
        ]),
      ),
    });

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>My palette</h1>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn-secondary"
            disabled={colors.length === 0}
            onClick={copyShareLink}
          >
            Copy share link
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={colors.length === 0}
            onClick={exportJson}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={colors.length === 0}
            onClick={clearPalette}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Projects: switch between named palettes, rename, add, delete. */}
      <div className={styles.projects}>
        <label className={styles.projectField}>
          <span className={styles.projectLabel}>Palette</span>
          <select
            className={styles.projectSelect}
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
            className={styles.projectName}
            value={activeProject.name}
            onChange={(e) => renameProject(activeProject.id, e.target.value)}
            aria-label="Palette name"
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => createProject(`Palette ${projects.length + 1}`)}
        >
          New palette
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={projects.length <= 1}
          onClick={() => deleteProject(activeProject.id)}
        >
          Delete palette
        </button>
      </div>

      {sharedIds.length > 0 && (
        <div className={styles.banner}>
          <span>
            A shared palette of {sharedIds.length} colors is in this link.
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setPalette(sharedIds)}
          >
            Load shared palette
          </button>
        </div>
      )}

      {colors.length === 0 ? (
        <div className={styles.empty}>
          <p>This palette is empty.</p>
          <p>
            Open any color and choose “Add to palette” to start building one.
          </p>
          <Link to="/" className="btn-primary">
            Browse colors
          </Link>
        </div>
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
                  <span className={styles.entryFields}>
                    <input
                      className={styles.entryInput}
                      value={entry.note ?? ""}
                      placeholder="Note"
                      aria-label={`Note for ${c.name}`}
                      onChange={(e) => setEntryNote(c.id, e.target.value)}
                    />
                    <input
                      className={styles.entryRoom}
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
        </>
      )}
    </div>
  );
}
