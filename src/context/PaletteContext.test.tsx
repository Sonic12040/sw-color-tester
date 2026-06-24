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

describe("PaletteContext — rooms & surfaces (E15)", () => {
  it("adds rooms and surfaces to the active project", () => {
    const { result } = setup();
    act(() => result.current.addRoom("Kitchen"));
    expect(result.current.rooms).toHaveLength(1);
    const roomId = result.current.rooms[0].id;
    expect(result.current.rooms[0].name).toBe("Kitchen");

    act(() => result.current.addSurface(roomId));
    // New surfaces default to walls with 2 coats.
    expect(result.current.rooms[0].surfaces[0]).toMatchObject({
      type: "wall",
      coats: 2,
    });
  });

  it("updates a surface and clears fields set to undefined", () => {
    const { result } = setup();
    act(() => result.current.addRoom("Bath"));
    const roomId = result.current.rooms[0].id;
    act(() => result.current.addSurface(roomId));
    const surfaceId = result.current.rooms[0].surfaces[0].id;

    act(() =>
      result.current.updateSurface(roomId, surfaceId, {
        colorId: "tricorn",
        finish: "satin",
        areaSqFt: 200,
      }),
    );
    expect(result.current.rooms[0].surfaces[0]).toMatchObject({
      colorId: "tricorn",
      finish: "satin",
      areaSqFt: 200,
    });

    // Passing undefined clears the key (e.g. unassigning a color).
    act(() =>
      result.current.updateSurface(roomId, surfaceId, { colorId: undefined }),
    );
    expect(result.current.rooms[0].surfaces[0].colorId).toBeUndefined();
  });

  it("deletes surfaces and rooms", () => {
    const { result } = setup();
    act(() => result.current.addRoom("Hall"));
    const roomId = result.current.rooms[0].id;
    act(() => result.current.addSurface(roomId));
    const surfaceId = result.current.rooms[0].surfaces[0].id;

    act(() => result.current.deleteSurface(roomId, surfaceId));
    expect(result.current.rooms[0].surfaces).toHaveLength(0);
    act(() => result.current.deleteRoom(roomId));
    expect(result.current.rooms).toHaveLength(0);
  });

  it("keeps rooms per-project (a new project starts with none)", () => {
    const { result } = setup();
    act(() => result.current.addRoom("Kitchen"));
    act(() => result.current.createProject("Studio"));
    expect(result.current.rooms).toEqual([]);
  });

  it("migrates a stored project with rooms, dropping invalid surfaces", () => {
    localStorage.setItem(
      STORAGE_KEYS.palette,
      JSON.stringify({
        projects: [
          {
            id: "p1",
            name: "Job",
            entries: ["a"],
            rooms: [
              {
                id: "r1",
                name: "Kitchen",
                surfaces: [
                  { id: "s1", type: "wall", colorId: "a", coats: 2 },
                  { id: "s2", type: "bogus" }, // invalid type → dropped
                  { id: "s3", type: "trim", finish: "satin", areaSqFt: 50 },
                ],
              },
            ],
          },
        ],
        activeId: "p1",
      }),
    );
    const { result } = setup();
    expect(result.current.rooms).toHaveLength(1);
    expect(result.current.rooms[0].surfaces.map((s) => s.id)).toEqual([
      "s1",
      "s3",
    ]);
  });

  it("ignores legacy projects without a rooms array", () => {
    localStorage.setItem(STORAGE_KEYS.palette, JSON.stringify(["a", "b"]));
    const { result } = setup();
    expect(result.current.rooms).toEqual([]);
  });
});
