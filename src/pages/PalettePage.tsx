import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { hsl, classifyLrv } from "../utils/colorMath.js";
import { colorPath, BASENAME } from "../utils/base.js";
import { toSlug } from "../utils/slug.js";
import { copyText } from "../utils/clipboard.js";
import { useAppContext } from "../context/AppContext.js";
import { usePalette } from "../context/PaletteContext.js";
import { useToast } from "../components/Toast/Toast.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { exportService } from "../appModel.js";
import styles from "./PalettePage.module.css";

export function PalettePage() {
  const { colorModel } = useAppContext();
  const { palette, setPalette, removeFromPalette, clearPalette } = usePalette();
  const [searchParams] = useSearchParams();
  const showToast = useToast();
  useDocumentMeta("My palette | Sherwin-Williams Color Atlas");

  const colors = palette
    .map((id) => colorModel.getColorById(id))
    .flatMap((c) => (c ? [c] : []));

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
    const next = [...palette];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPalette(next);
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
            onClick={() => exportService.exportColors(colors)}
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
          <p>Your palette is empty.</p>
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
            {colors.map((c, i) => (
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
                    disabled={i === colors.length - 1}
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
