/**
 * Room Visualizer rendering helpers (E9) — pure, framework-free so they're
 * unit-tested and shared by the page + the scene component.
 *
 * Lighting presets (US9.4) are a full-scene tint overlay applied with a CSS
 * blend mode: warm/cool shift white balance, daylight lifts exposure, neutral is
 * a no-op. Deep-link parsing (US9.3/9.5) resolves `?scene=&color=&lighting=` into
 * concrete objects, tolerating missing/unknown values.
 */

import type { Scene } from "../domain/scene.js";

export type BlendMode = "normal" | "multiply" | "screen" | "soft-light";

export interface LightingPreset {
  key: string;
  label: string;
  /** Overlay tint; `null` = no overlay (neutral). */
  overlay: string | null;
  opacity: number;
  blend: BlendMode;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    key: "neutral",
    label: "Neutral",
    overlay: null,
    opacity: 0,
    blend: "normal",
  },
  {
    key: "warm",
    label: "Warm",
    overlay: "#ff9b3d",
    opacity: 0.2,
    blend: "soft-light",
  },
  {
    key: "cool",
    label: "Cool",
    overlay: "#3d7bff",
    opacity: 0.18,
    blend: "soft-light",
  },
  {
    key: "daylight",
    label: "Daylight",
    overlay: "#ffffff",
    opacity: 0.12,
    blend: "screen",
  },
];

export const DEFAULT_LIGHTING = LIGHTING_PRESETS[0];

/** Resolve a lighting key to its preset, defaulting to neutral. */
export function resolveLighting(
  key: string | null | undefined,
): LightingPreset {
  return LIGHTING_PRESETS.find((p) => p.key === key) ?? DEFAULT_LIGHTING;
}

/** Find a scene by slug (default: the first scene). */
export function resolveScene(
  scenes: Scene[],
  slug: string | null | undefined,
): Scene {
  return scenes.find((s) => s.slug === slug) ?? scenes[0];
}
