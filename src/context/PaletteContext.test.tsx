import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { PaletteProvider, usePalette } from "./PaletteContext.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const setup = () =>
  renderHook(() => usePalette(), { wrapper: PaletteProvider });

describe("PaletteContext", () => {
  it("toggles colors, preserving insertion order (no cap)", () => {
    const { result } = setup();
    act(() => {
      result.current.togglePalette("a");
      result.current.togglePalette("b");
      result.current.togglePalette("c");
    });
    expect(result.current.palette).toEqual(["a", "b", "c"]);
    expect(result.current.inPalette("b")).toBe(true);
    act(() => result.current.togglePalette("b"));
    expect(result.current.palette).toEqual(["a", "c"]);
  });

  it("replaces the whole palette (loading a shared one)", () => {
    const { result } = setup();
    act(() => result.current.setPalette(["x", "y", "z"]));
    expect(result.current.palette).toEqual(["x", "y", "z"]);
  });

  it("removes and clears", () => {
    const { result } = setup();
    act(() => result.current.setPalette(["a", "b"]));
    act(() => result.current.removeFromPalette("a"));
    expect(result.current.palette).toEqual(["b"]);
    act(() => result.current.clearPalette());
    expect(result.current.palette).toEqual([]);
  });

  it("persists the projects shape to localStorage", () => {
    const { result } = setup();
    act(() => result.current.togglePalette("a"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.palette)!);
    expect(stored.projects[0].entries).toEqual([{ id: "a" }]);
    expect(stored.activeId).toBe(stored.projects[0].id);
  });

  it("migrates a legacy string[] palette into one project", () => {
    localStorage.setItem(STORAGE_KEYS.palette, JSON.stringify(["a", "b"]));
    const { result } = setup();
    expect(result.current.palette).toEqual(["a", "b"]);
    expect(result.current.projects).toHaveLength(1);
  });

  it("manages independent named projects", () => {
    const { result } = setup();
    act(() => result.current.togglePalette("a")); // default project
    act(() => result.current.createProject("Kitchen"));
    expect(result.current.activeProject.name).toBe("Kitchen");
    expect(result.current.palette).toEqual([]); // new project starts empty
    act(() => result.current.togglePalette("b"));
    expect(result.current.palette).toEqual(["b"]);

    const firstId = result.current.projects[0].id;
    act(() => result.current.selectProject(firstId));
    expect(result.current.palette).toEqual(["a"]); // original project intact
  });

  it("keeps per-color notes through a reorder", () => {
    const { result } = setup();
    act(() => result.current.setPalette(["a", "b"]));
    act(() => result.current.setEntryNote("a", "front door"));
    act(() => result.current.setPalette(["b", "a"])); // reorder by id
    expect(result.current.entries.find((e) => e.id === "a")?.note).toBe(
      "front door",
    );
  });

  it("never deletes the last project", () => {
    const { result } = setup();
    act(() => result.current.deleteProject(result.current.activeProject.id));
    expect(result.current.projects).toHaveLength(1);
  });
});
