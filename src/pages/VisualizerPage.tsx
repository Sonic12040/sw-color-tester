import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import type { Color } from "../data/types.js";
import { SCENES } from "../data/scenes.js";
import {
  LIGHTING_PRESETS,
  resolveLighting,
  resolveScene,
} from "../utils/sceneRender.js";
import { hsl, classifyLrv } from "../utils/colorMath.js";
import { BASENAME, colorPath } from "../utils/base.js";
import { toSlug } from "../utils/slug.js";
import { copyText } from "../utils/clipboard.js";
import { useAppContext } from "../context/AppContext.js";
import { usePalette } from "../context/PaletteContext.js";
import { useToast } from "../components/Toast/Toast.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { RoomScene } from "../components/Visualizer/RoomScene.js";
import styles from "../components/Visualizer/Visualizer.module.css";

/** Default wall color when none is chosen / shared — a popular flexible neutral. */
const DEFAULT_COLOR_NUMBER = "7015"; // Repose Gray

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * Room Visualizer (E9) — preview a color on real surfaces in a curated scene,
 * switch colors (search / palette / recent), try lighting presets, and save or
 * share the look. State lives in the URL (`?scene=&color=&lighting=`) so every
 * look is deep-linkable and shareable (US9.3/9.5) — fully client-side, no backend.
 */
export function VisualizerPage() {
  const { colorModel } = useAppContext();
  const { entries, inPalette, togglePalette } = usePalette();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [numberQuery, setNumberQuery] = useState("");
  const [recentIds, setRecentIds] = usePersistentState<string[]>(
    STORAGE_KEYS.visualizerRecent,
    [],
    (raw) => (isStringArray(raw) ? raw : null),
  );

  useDocumentMeta(
    "Room Visualizer | Sherwin-Williams Color Atlas",
    "Preview Sherwin-Williams paint colors on real room surfaces — pick a scene, switch colors, and try different lighting.",
  );

  const scene = resolveScene(SCENES, searchParams.get("scene"));
  const lighting = resolveLighting(searchParams.get("lighting"));

  const paletteColors = entries
    .map((e) => colorModel.getColorById(e.id))
    .filter((c): c is Color => Boolean(c));
  const recentColors = recentIds
    .map((id) => colorModel.getColorById(id))
    .filter((c): c is Color => Boolean(c));

  // Resolve the active color: ?color= number → palette → recent → default.
  const colorParam = searchParams.get("color");
  const color =
    (colorParam ? colorModel.getColorByNumber(colorParam) : undefined) ??
    paletteColors[0] ??
    recentColors[0] ??
    colorModel.getColorByNumber(DEFAULT_COLOR_NUMBER) ??
    colorModel.getActiveColors()[0];

  // URL is the source of truth; patch it (replace, so we don't spam history).
  const patch = (next: Record<string, string>) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) params.set(k, v);
        return params;
      },
      { replace: true },
    );

  const applyColor = (c: Color) => {
    patch({ color: c.colorNumber });
    setRecentIds((ids) =>
      [c.id, ...ids.filter((id) => id !== c.id)].slice(0, 6),
    );
  };

  const lookUpNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const n = numberQuery.replace(/[^0-9]/g, "");
    if (!n) return;
    const found = colorModel.getColorByNumber(n);
    if (found) {
      applyColor(found);
      setNumberQuery("");
    } else {
      showToast(`No color found for SW ${n}`);
    }
  };

  const saveLook = () => {
    if (!color) return;
    if (!inPalette(color.id)) togglePalette(color.id);
    showToast(`Saved ${color.name} to your palette`);
  };

  const copyLookLink = async () => {
    if (!color) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${BASENAME}/visualizer?scene=${scene.slug}&color=${color.colorNumber}&lighting=${lighting.key}`;
    showToast(
      (await copyText(url))
        ? "Look link copied to clipboard"
        : "Couldn't copy link",
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>Room Visualizer</h1>
          {color && (
            <p className={styles.subtitle}>
              {scene.name} ·{" "}
              <Link className={styles.colorLink} to={colorPath(toSlug(color))}>
                {color.name}
              </Link>{" "}
              <span className={styles.dim}>
                SW {color.colorNumber} · {classifyLrv(color.lrv)}
              </span>
            </p>
          )}
          <Link
            className={`btn-on-dark ${styles.uploadLink}`}
            to="/visualizer/upload"
          >
            Use your own room photo →
          </Link>
        </div>

        <div className={styles.stage}>
          {color && (
            <RoomScene scene={scene} color={color} lighting={lighting} />
          )}
        </div>

        {/* Scene picker (US9.1). */}
        <section aria-label="Choose a scene" className={styles.controlGroup}>
          <h2 className={styles.controlTitle}>Scene</h2>
          <div className={styles.chips}>
            {SCENES.map((s) => (
              <button
                key={s.slug}
                type="button"
                className={`btn-on-dark ${s.slug === scene.slug ? "is-active" : ""}`}
                aria-pressed={s.slug === scene.slug}
                onClick={() => patch({ scene: s.slug })}
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>

        {/* Lighting presets (US9.4). */}
        <section aria-label="Lighting" className={styles.controlGroup}>
          <h2 className={styles.controlTitle}>Lighting</h2>
          <div className={styles.chips}>
            {LIGHTING_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`btn-on-dark ${p.key === lighting.key ? "is-active" : ""}`}
                aria-pressed={p.key === lighting.key}
                onClick={() => patch({ lighting: p.key })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Color switcher: number search + palette + recent (US9.3). */}
        <section aria-label="Choose a color" className={styles.controlGroup}>
          <h2 className={styles.controlTitle}>Color</h2>
          <form className={styles.search} role="search" onSubmit={lookUpNumber}>
            <label className="sr-only" htmlFor="viz-number-search">
              Look up a color by SW number
            </label>
            <input
              id="viz-number-search"
              className="field-on-dark"
              type="text"
              inputMode="numeric"
              placeholder="Find by SW number, e.g. 6258"
              value={numberQuery}
              onChange={(e) => setNumberQuery(e.target.value)}
            />
            <button type="submit" className="btn-on-dark">
              Apply
            </button>
          </form>

          {paletteColors.length > 0 && (
            <>
              <h3 className={styles.swatchHeading}>From your palette</h3>
              <ColorSwatchRow
                colors={paletteColors}
                activeId={color?.id}
                onPick={applyColor}
              />
            </>
          )}
          {recentColors.length > 0 && (
            <>
              <h3 className={styles.swatchHeading}>Recent</h3>
              <ColorSwatchRow
                colors={recentColors}
                activeId={color?.id}
                onPick={applyColor}
              />
            </>
          )}
        </section>

        <div className={styles.actions}>
          <button type="button" className="btn-on-dark" onClick={saveLook}>
            Save to palette
          </button>
          <button type="button" className="btn-on-dark" onClick={copyLookLink}>
            Copy look link
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorSwatchRow({
  colors,
  activeId,
  onPick,
}: {
  colors: Color[];
  activeId: string | undefined;
  onPick: (c: Color) => void;
}) {
  return (
    <div className={styles.swatchRow}>
      {colors.map((c) => (
        <button
          key={c.id}
          type="button"
          className={styles.swatch}
          data-active={c.id === activeId ? true : undefined}
          style={{ background: hsl(c) }}
          aria-label={`Paint the walls ${c.name} (SW ${c.colorNumber})`}
          aria-pressed={c.id === activeId}
          title={`${c.name} · SW ${c.colorNumber}`}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
}
