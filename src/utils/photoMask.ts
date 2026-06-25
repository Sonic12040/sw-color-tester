/**
 * Upload-your-room photo recolor (Room Visualizer v2) — the pure, framework-free
 * core, so the algorithm is unit-tested in Node while the GPU path
 * (`utils/photoGL.ts`) and the CPU fallback (here) share it.
 *
 * The photo never leaves the browser (no backend). The user "magic-wands" a wall
 * region (a contiguous flood fill within a color tolerance) into a coverage mask;
 * masked pixels are recolored to the chosen paint color **preserving the original
 * luminance** (so shadows/edges/texture read through), then an optional lighting
 * tint is blended over the whole image.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Lighting overlay resolved from a preset (hex → rgb), ready to blend. */
export interface LightParams {
  overlay: Rgb | null;
  opacity: number;
  blend: "normal" | "screen" | "soft-light";
}

const clamp255 = (n: number): number => (n < 0 ? 0 : n > 255 ? 255 : n);

/** Parse `#rrggbb` to 0–255 channels (mid-gray on malformed input). */
export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return { r: 136, g: 136, b: 136 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Rec.601 luma (0–255) — cheap perceptual brightness. */
export function luma({ r, g, b }: Rgb): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Squared Euclidean RGB distance (avoids a sqrt in the hot loop). */
export function rgbDistanceSq(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

const pixelAt = (data: Uint8ClampedArray, p: number): Rgb => ({
  r: data[p * 4],
  g: data[p * 4 + 1],
  b: data[p * 4 + 2],
});

/**
 * Magic-wand flood fill (4-connected) from a seed pixel over RGBA `data`,
 * selecting the contiguous run of pixels within `tolerance` (0–255, Euclidean)
 * of the seed color. Returns a coverage mask (`255` selected, `0` not). Pass an
 * existing mask as `into` to accumulate multiple clicks.
 */
export function floodFillMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  tolerance: number,
  into?: Uint8Array,
): Uint8Array {
  const mask = into ?? new Uint8Array(width * height);
  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) return mask;

  const seed = pixelAt(data, seedY * width + seedX);
  const tolSq = tolerance * tolerance;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [seedY * width + seedX];

  while (stack.length) {
    const p = stack.pop() as number;
    if (visited[p]) continue;
    visited[p] = 1;
    if (rgbDistanceSq(pixelAt(data, p), seed) > tolSq) continue;
    mask[p] = 255;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }
  return mask;
}

/** Mean luma over the masked pixels — the reference the recolor scales around. */
export function maskedMeanLuma(
  data: Uint8ClampedArray,
  mask: Uint8Array,
): number {
  let sum = 0;
  let n = 0;
  for (let p = 0; p < mask.length; p += 1) {
    if (mask[p]) {
      sum += luma(pixelAt(data, p));
      n += 1;
    }
  }
  return n ? sum / n : 0;
}

/**
 * Recolor one pixel to `target` while preserving its luminance: scale the target
 * by `origLuma / refLum`, so a pixel darker than the wall's mean lands darker
 * (shadows) and lighter lands lighter (highlights).
 */
export function recolorPixel(orig: Rgb, target: Rgb, refLum: number): Rgb {
  const scale = refLum > 0 ? luma(orig) / refLum : 1;
  return {
    r: clamp255(target.r * scale),
    g: clamp255(target.g * scale),
    b: clamp255(target.b * scale),
  };
}

const softLight = (b: number, o: number): number => {
  if (o <= 0.5) return b - (1 - 2 * o) * b * (1 - b);
  const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
  return b + (2 * o - 1) * (d - b);
};
const screen = (b: number, o: number): number => 1 - (1 - b) * (1 - o);

/** Blend a lighting tint over a pixel (white-balance/exposure feel). */
export function applyLighting(rgb: Rgb, light: LightParams): Rgb {
  if (!light.overlay || light.opacity <= 0 || light.blend === "normal") {
    return rgb;
  }
  const fn = light.blend === "screen" ? screen : softLight;
  const a = light.opacity;
  const ch = (base: number, over: number): number => {
    const b = base / 255;
    const o = over / 255;
    return clamp255(255 * (b + (fn(b, o) - b) * a));
  };
  return {
    r: ch(rgb.r, light.overlay.r),
    g: ch(rgb.g, light.overlay.g),
    b: ch(rgb.b, light.overlay.b),
  };
}

/**
 * CPU compositor (also the no-WebGL fallback): recolor the masked region to
 * `target` preserving luminance, then blend `light` over everything. Returns a
 * fresh RGBA buffer; pure, so it's unit-tested without a canvas.
 */
export function compositeRgba(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  target: Rgb,
  light: LightParams,
  strength = 1,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const refLum = maskedMeanLuma(data, mask);
  for (let p = 0; p < mask.length; p += 1) {
    const o = p * 4;
    let rgb: Rgb = { r: data[o], g: data[o + 1], b: data[o + 2] };
    if (mask[p]) {
      const recolored = recolorPixel(rgb, target, refLum);
      const t = (mask[p] / 255) * strength;
      rgb = {
        r: rgb.r + (recolored.r - rgb.r) * t,
        g: rgb.g + (recolored.g - rgb.g) * t,
        b: rgb.b + (recolored.b - rgb.b) * t,
      };
    }
    const lit = applyLighting(rgb, light);
    out[o] = lit.r;
    out[o + 1] = lit.g;
    out[o + 2] = lit.b;
  }
  return out;
}
