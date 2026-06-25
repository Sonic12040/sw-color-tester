import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Color } from "../data/types.js";
import {
  EMBED_THEMES,
  buildEmbedIframe,
  buildEmbedSrc,
  suggestEmbedHeight,
  type EmbedTheme,
} from "../utils/embed.js";
import { BASENAME } from "../utils/base.js";
import { toSlug } from "../utils/slug.js";
import { copyText } from "../utils/clipboard.js";
import { useAppContext } from "../context/AppContext.js";
import { usePalette } from "../context/PaletteContext.js";
import { useToast } from "../components/Toast/Toast.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { EmptyState } from "../components/EmptyState/EmptyState.js";
import { EmbedWidget } from "../components/Embed/EmbedWidget.js";
import styles from "./EmbedBuilder.module.css";

type EmbedKind = "palette" | "swatch";

/**
 * Embed builder (E14, US14.2) — pick swatch vs palette + theme + width, see a
 * live preview, and copy a ready-to-paste `<iframe>` snippet. Colors come from a
 * `?c=` preset (e.g. "Embed" from the palette page) or the active palette.
 * Self-serve, static, no backend.
 */
export function EmbedBuilderPage() {
  const { colorModel } = useAppContext();
  const { entries } = usePalette();
  const showToast = useToast();
  const [searchParams] = useSearchParams();
  const [kind, setKind] = useState<EmbedKind>("palette");
  const [theme, setTheme] = useState<EmbedTheme>("light");
  const [width, setWidth] = useState(600);

  useDocumentMeta(
    "Embed builder | Sherwin-Williams Color Atlas",
    "Build a copy-paste embed of a Sherwin-Williams swatch or palette for your own site.",
  );

  // Source colors: a ?c= preset wins, else the active palette.
  const presetSlugs = (searchParams.get("c") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sourceColors: Color[] = (
    presetSlugs.length
      ? presetSlugs.map((slug) => colorModel.getColorBySlug(slug))
      : entries.map((e) => colorModel.getColorById(e.id))
  ).filter((c): c is Color => Boolean(c));

  const colors = kind === "swatch" ? sourceColors.slice(0, 1) : sourceColors;
  const slugs = colors.map((c) => toSlug(c));

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src = buildEmbedSrc(`${origin}${BASENAME}`, { slugs, theme });
  const height = suggestEmbedHeight(colors.length, width);
  const snippet = buildEmbedIframe(src, {
    width,
    height,
    title: "Sherwin-Williams colors",
  });

  const copySnippet = async () => {
    showToast(
      (await copyText(snippet))
        ? "Embed snippet copied to clipboard"
        : "Couldn't copy the snippet",
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>Embed builder</h1>
          <p className={styles.subtitle}>
            Drop a live Sherwin-Williams swatch or palette onto your own site.
          </p>
        </div>

        {sourceColors.length === 0 ? (
          <EmptyState
            onDark
            title="No colors to embed yet."
            description="Add colors to a palette (or open this from a shared link), then come back to build an embed."
            action={
              <Link to="/palette" className="btn-secondary">
                Go to palette
              </Link>
            }
          />
        ) : (
          <>
            <div className={styles.controls}>
              <fieldset className={styles.field}>
                <legend className={styles.legend}>Embed</legend>
                <div className={styles.segmented} role="group">
                  <button
                    type="button"
                    className={`btn-on-dark ${kind === "palette" ? "is-active" : ""}`}
                    aria-pressed={kind === "palette"}
                    onClick={() => setKind("palette")}
                  >
                    Palette ({sourceColors.length})
                  </button>
                  <button
                    type="button"
                    className={`btn-on-dark ${kind === "swatch" ? "is-active" : ""}`}
                    aria-pressed={kind === "swatch"}
                    onClick={() => setKind("swatch")}
                  >
                    Single swatch
                  </button>
                </div>
              </fieldset>

              <fieldset className={styles.field}>
                <legend className={styles.legend}>Theme</legend>
                <div className={styles.segmented} role="group">
                  {EMBED_THEMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn-on-dark ${theme === t ? "is-active" : ""}`}
                      aria-pressed={theme === t}
                      onClick={() => setTheme(t)}
                    >
                      {t === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className={styles.field}>
                <span className={styles.legend}>Width (px)</span>
                <input
                  className="field-on-dark"
                  type="number"
                  min={240}
                  max={960}
                  step={20}
                  value={width}
                  aria-label="Embed width in pixels"
                  onChange={(e) =>
                    setWidth(
                      Math.min(
                        960,
                        Math.max(240, Number(e.target.value) || 600),
                      ),
                    )
                  }
                />
              </label>
            </div>

            <section aria-label="Live preview" className={styles.previewWrap}>
              <h2 className={styles.sectionTitle}>Live preview</h2>
              <div
                className={styles.preview}
                style={{ maxWidth: `${width}px` }}
              >
                <EmbedWidget colors={colors} theme={theme} campaign="builder" />
              </div>
            </section>

            <section aria-label="Embed code" className={styles.snippetWrap}>
              <div className={styles.snippetHead}>
                <h2 className={styles.sectionTitle}>Embed code</h2>
                <button
                  type="button"
                  className="btn-on-dark"
                  onClick={copySnippet}
                >
                  Copy snippet
                </button>
              </div>
              <textarea
                className={styles.snippet}
                readOnly
                rows={4}
                aria-label="Embed iframe snippet"
                value={snippet}
                onFocus={(e) => e.currentTarget.select()}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
