import { describe, it, expect } from "vitest";
import type { Scene } from "../domain/scene.js";
import {
  DEFAULT_LIGHTING,
  LIGHTING_PRESETS,
  resolveLighting,
  resolveScene,
} from "./sceneRender.js";

const scenes: Scene[] = [
  { slug: "a", name: "A", width: 100, height: 100, walls: [], foreground: "" },
  { slug: "b", name: "B", width: 100, height: 100, walls: [], foreground: "" },
];

describe("resolveLighting", () => {
  it("returns the matching preset", () => {
    expect(resolveLighting("warm").label).toBe("Warm");
  });
  it("defaults to neutral for unknown/missing keys", () => {
    expect(resolveLighting(null)).toBe(DEFAULT_LIGHTING);
    expect(resolveLighting("nope")).toBe(DEFAULT_LIGHTING);
    expect(DEFAULT_LIGHTING.key).toBe("neutral");
  });
  it("neutral applies no overlay", () => {
    expect(DEFAULT_LIGHTING.overlay).toBeNull();
    expect(DEFAULT_LIGHTING.opacity).toBe(0);
  });
  it("offers warm, cool, and daylight presets", () => {
    const keys = LIGHTING_PRESETS.map((p) => p.key);
    expect(keys).toEqual(
      expect.arrayContaining(["neutral", "warm", "cool", "daylight"]),
    );
  });
});

describe("resolveScene", () => {
  it("finds a scene by slug", () => {
    expect(resolveScene(scenes, "b").name).toBe("B");
  });
  it("defaults to the first scene for unknown/missing slugs", () => {
    expect(resolveScene(scenes, null).slug).toBe("a");
    expect(resolveScene(scenes, "zzz").slug).toBe("a");
  });
});
