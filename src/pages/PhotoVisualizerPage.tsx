import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Color } from "../data/types.js";
import { LIGHTING_PRESETS, resolveLighting } from "../utils/sceneRender.js";
import {
  compositeRgba,
  floodFillMask,
  hexToRgb,
  maskedMeanLuma,
  type LightParams,
} from "../utils/photoMask.js";
import { PhotoRenderer, isWebGLAvailable } from "../utils/photoGL.js";
import { hsl } from "../utils/colorMath.js";
import { useAppContext } from "../context/AppContext.js";
import { usePalette } from "../context/PaletteContext.js";
import { useToast } from "../components/Toast/Toast.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import styles from "../components/Visualizer/PhotoVisualizer.module.css";

const DEFAULT_COLOR_NUMBER = "7015"; // Repose Gray
/** Cap the working resolution so flood fill + GPU stay snappy on phones. */
const MAX_EDGE = 1400;

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

interface Source {
  canvas: HTMLCanvasElement; // 2D, holds the downscaled photo (GL tex source)
  data: Uint8ClampedArray; // RGBA pixels (flood fill + CPU composite)
  width: number;
  height: number;
}

/** Resolve a lighting preset to blend params (hex overlay → rgb). */
function lightParams(key: string): LightParams {
  const p = resolveLighting(key);
  return {
    overlay: p.overlay ? hexToRgb(p.overlay) : null,
    opacity: p.opacity,
    blend: p.blend === "multiply" ? "normal" : p.blend,
  };
}

/**
 * Upload-your-room recolor studio (Room Visualizer v2) — preview a paint color on
 * a photo of the user's *own* room. The photo is processed entirely in the
 * browser (no upload, no backend): magic-wand the wall, recolor preserving its
 * shadows/texture, and try lighting presets. Rendered via WebGL
 * (`utils/photoGL.ts`) with a pure CPU fallback (`utils/photoMask.ts`).
 */
export function PhotoVisualizerPage() {
  const { colorModel } = useAppContext();
  const { entries, inPalette, togglePalette } = usePalette();
  const showToast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<Source | null>(null);
  const maskRef = useRef<Uint8Array | null>(null);
  const rendererRef = useRef<PhotoRenderer | null>(null);
  const modeRef = useRef<"gl" | "cpu">("cpu");

  const [ready, setReady] = useState(false);
  const [colorNumber, setColorNumber] = useState(DEFAULT_COLOR_NUMBER);
  const [lightingKey, setLightingKey] = useState("neutral");
  const [tolerance, setTolerance] = useState(40);
  const [numberQuery, setNumberQuery] = useState("");
  const [recentIds, setRecentIds] = usePersistentState<string[]>(
    STORAGE_KEYS.visualizerRecent,
    [],
    (raw) => (isStringArray(raw) ? raw : null),
  );

  useDocumentMeta(
    "Upload your room | Sherwin-Williams Color Atlas",
    "Preview a Sherwin-Williams paint color on a photo of your own room — recolor the walls and try different lighting, all in your browser.",
  );

  const paletteColors = entries
    .map((e) => colorModel.getColorById(e.id))
    .filter((c): c is Color => Boolean(c));
  const recentColors = recentIds
    .map((id) => colorModel.getColorById(id))
    .filter((c): c is Color => Boolean(c));
  const color =
    colorModel.getColorByNumber(colorNumber) ??
    colorModel.getColorByNumber(DEFAULT_COLOR_NUMBER) ??
    colorModel.getActiveColors()[0];

  // Re-composite with the current mask, color, and lighting.
  const renderComposite = useCallback(() => {
    const src = sourceRef.current;
    const mask = maskRef.current;
    const canvas = canvasRef.current;
    if (!src || !mask || !canvas || !color) return;
    const target = { r: color.red, g: color.green, b: color.blue };
    const light = lightParams(lightingKey);
    const refLum = maskedMeanLuma(src.data, mask);

    if (modeRef.current === "gl" && rendererRef.current) {
      rendererRef.current.setMask(mask, src.width, src.height);
      rendererRef.current.render({ target, refLum, strength: 1, light });
      return;
    }
    // CPU fallback.
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const out = compositeRgba(src.data, mask, target, light, 1);
    ctx.putImageData(
      new ImageData(
        out as unknown as Uint8ClampedArray<ArrayBuffer>,
        src.width,
        src.height,
      ),
      0,
      0,
    );
  }, [color, lightingKey]);

  // Re-render when the color or lighting changes (mask changes call it directly).
  useEffect(() => {
    if (ready) renderComposite();
  }, [ready, renderComposite]);

  // Tear down the GL renderer on unmount.
  useEffect(() => () => rendererRef.current?.dispose(), []);

  const applyColor = (c: Color) => {
    setColorNumber(c.colorNumber);
    setRecentIds((ids) =>
      [c.id, ...ids.filter((id) => id !== c.id)].slice(0, 6),
    );
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const img = await loadImage(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const octx = off.getContext("2d");
      if (!octx) throw new Error("2D context unavailable");
      octx.drawImage(img, 0, 0, width, height);
      const data = octx.getImageData(0, 0, width, height).data;
      sourceRef.current = { canvas: off, data, width, height };
      maskRef.current = new Uint8Array(width * height);

      // Pick the render path now that we have a canvas to bind.
      const display = canvasRef.current;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      modeRef.current = "cpu";
      if (display && isWebGLAvailable()) {
        try {
          const renderer = new PhotoRenderer(display);
          renderer.setPhoto(off, width, height);
          rendererRef.current = renderer;
          modeRef.current = "gl";
        } catch {
          modeRef.current = "cpu";
        }
      }
      if (modeRef.current === "cpu" && display) {
        display.width = width;
        display.height = height;
        display.getContext("2d")?.drawImage(off, 0, 0);
      }
      setReady(true);
      // Effects render after state commits; render once explicitly too.
      requestAnimationFrame(renderComposite);
    } catch {
      showToast("Couldn't read that image");
    }
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const src = sourceRef.current;
    const mask = maskRef.current;
    const canvas = canvasRef.current;
    if (!src || !mask || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * src.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * src.height);
    floodFillMask(src.data, src.width, src.height, x, y, tolerance, mask);
    renderComposite();
  };

  const resetSelection = () => {
    const src = sourceRef.current;
    if (!src) return;
    maskRef.current = new Uint8Array(src.width * src.height);
    renderComposite();
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Couldn't export the image");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sw-room-${color?.colorNumber ?? "preview"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const saveColor = () => {
    if (!color) return;
    if (!inPalette(color.id)) togglePalette(color.id);
    showToast(`Saved ${color.name} to your palette`);
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>Upload your room</h1>
          <p className={styles.subtitle}>
            Preview {color ? color.name : "a color"} on a photo of your own
            room.
          </p>
          <Link className={`btn-on-dark ${styles.modeLink}`} to="/visualizer">
            ← Use a curated scene instead
          </Link>
        </div>

        {!ready && (
          <div className={styles.dropzone}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose a room photo
            </button>
            <p className={styles.privacy}>
              Your photo is processed entirely in your browser — it's never
              uploaded to a server. Tip: a well-lit wall with an even color
              works best.
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload a room photo"
          onChange={onUpload}
        />

        {ready && (
          <>
            <div className={styles.stage}>
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                role="img"
                aria-label={`Your room with the selected wall painted ${color?.name ?? ""}`}
                onClick={onCanvasClick}
              />
            </div>
            <p className={styles.hint}>
              Click a wall to select it (click more areas to add). Adjust the
              match tolerance if too much or too little is selected.
            </p>

            {/* Wall selection. */}
            <section
              aria-label="Wall selection"
              className={styles.controlGroup}
            >
              <h2 className={styles.controlTitle}>Wall selection</h2>
              <div className={styles.slider}>
                <label htmlFor="photo-tolerance">Match tolerance</label>
                <input
                  id="photo-tolerance"
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                />
                <span>{tolerance}</span>
                <button
                  type="button"
                  className="btn-on-dark"
                  onClick={resetSelection}
                >
                  Reset selection
                </button>
                <button
                  type="button"
                  className="btn-on-dark"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change photo
                </button>
              </div>
            </section>

            {/* Lighting. */}
            <section aria-label="Lighting" className={styles.controlGroup}>
              <h2 className={styles.controlTitle}>Lighting</h2>
              <div className={styles.chips}>
                {LIGHTING_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`btn-on-dark ${p.key === lightingKey ? "is-active" : ""}`}
                    aria-pressed={p.key === lightingKey}
                    onClick={() => setLightingKey(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Color switcher. */}
            <section
              aria-label="Choose a color"
              className={styles.controlGroup}
            >
              <h2 className={styles.controlTitle}>Color</h2>
              <form
                className={styles.search}
                role="search"
                onSubmit={lookUpNumber}
              >
                <label className="sr-only" htmlFor="photo-number-search">
                  Look up a color by SW number
                </label>
                <input
                  id="photo-number-search"
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
                  <PhotoSwatchRow
                    colors={paletteColors}
                    activeId={color?.id}
                    onPick={applyColor}
                  />
                </>
              )}
              {recentColors.length > 0 && (
                <>
                  <h3 className={styles.swatchHeading}>Recent</h3>
                  <PhotoSwatchRow
                    colors={recentColors}
                    activeId={color?.id}
                    onPick={applyColor}
                  />
                </>
              )}
            </section>

            <div className={styles.actions}>
              <button type="button" className="btn-on-dark" onClick={saveColor}>
                Save color to palette
              </button>
              <button type="button" className="btn-on-dark" onClick={download}>
                Download image
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PhotoSwatchRow({
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

/** Load a File into an image element (decoded), for drawing to a canvas. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}
