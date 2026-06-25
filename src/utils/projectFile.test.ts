import { describe, it, expect } from "vitest";
import type { PaletteProject } from "../domain/paletteData.js";
import {
  PROJECT_FILE_KIND,
  PROJECT_FILE_VERSION,
  parseProjectFile,
  serializeProject,
} from "./projectFile.js";

const project: PaletteProject = {
  id: "proj-1",
  name: "Kitchen remodel",
  entries: [
    { id: "c1", note: "Front door", room: "Entry", role: "Accent" },
    { id: "c2" },
  ],
  rooms: [
    {
      id: "r1",
      name: "Kitchen",
      surfaces: [
        {
          id: "s1",
          type: "wall",
          colorId: "c1",
          finish: "satin",
          coats: 2,
          areaSqFt: 200,
          done: true,
        },
      ],
    },
  ],
};

describe("serializeProject", () => {
  it("wraps the project in a versioned envelope", () => {
    const file = serializeProject(project);
    expect(file.kind).toBe(PROJECT_FILE_KIND);
    expect(file.version).toBe(PROJECT_FILE_VERSION);
    expect(file.project).toEqual(project);
  });
});

describe("parseProjectFile", () => {
  it("round-trips a full project losslessly (colors + rooms + progress)", () => {
    const file = serializeProject(project);
    const back = parseProjectFile(JSON.parse(JSON.stringify(file)));
    expect(back).toEqual(project);
  });

  it("accepts a bare project object without the envelope", () => {
    const back = parseProjectFile(project);
    expect(back?.name).toBe("Kitchen remodel");
    expect(back?.rooms).toHaveLength(1);
  });

  it("rejects a file with a foreign kind", () => {
    expect(parseProjectFile({ kind: "something-else", project })).toBeNull();
  });

  it("rejects malformed input gracefully", () => {
    expect(parseProjectFile(null)).toBeNull();
    expect(parseProjectFile("not an object")).toBeNull();
    expect(parseProjectFile({ kind: PROJECT_FILE_KIND })).toBeNull();
    expect(parseProjectFile({})).toBeNull();
  });

  it("drops invalid surfaces/entries while keeping valid data (migrate)", () => {
    const dirty = {
      kind: PROJECT_FILE_KIND,
      version: 1,
      project: {
        id: "p",
        name: "Mixed",
        entries: ["c1", { id: "c2" }, { note: "no id" }, 42],
        rooms: [
          {
            id: "r1",
            name: "Room",
            surfaces: [
              { id: "s1", type: "wall" },
              { id: "s2", type: "not-a-surface" },
              { type: "wall" },
            ],
          },
        ],
      },
    };
    const back = parseProjectFile(dirty);
    expect(back?.entries.map((e) => e.id)).toEqual(["c1", "c2"]);
    expect(back?.rooms?.[0].surfaces).toHaveLength(1);
  });
});
