import { describe, it, expect } from "vitest";
import type { PaletteProject } from "../domain/paletteData.js";
import {
  MAX_SHARE_PARAM_LENGTH,
  decodeProjectParam,
  encodeProjectParam,
} from "./projectShare.js";

const project: PaletteProject = {
  id: "proj-1",
  name: "Whole house",
  entries: [{ id: "c1", note: "Trim" }, { id: "c2" }],
  rooms: [
    {
      id: "r1",
      name: "Living room",
      surfaces: [{ id: "s1", type: "wall", colorId: "c1", coats: 2 }],
    },
  ],
};

describe("project share link", () => {
  it("round-trips a project through encode → decode", async () => {
    const param = await encodeProjectParam(project);
    expect(param).toBeTruthy();
    const back = await decodeProjectParam(param as string);
    expect(back).toEqual(project);
  });

  it("produces a URL-safe param (no +, /, =)", async () => {
    const param = (await encodeProjectParam(project)) as string;
    expect(param).not.toMatch(/[+/=]/);
  });

  it("compresses — a repetitive project stays well under the threshold", async () => {
    const big: PaletteProject = {
      id: "p",
      name: "Big",
      entries: Array.from({ length: 200 }, (_, i) => ({ id: `c${i}` })),
    };
    const param = await encodeProjectParam(big);
    expect(param).toBeTruthy();
    expect((param as string).length).toBeLessThan(MAX_SHARE_PARAM_LENGTH);
  });

  it("returns null when the encoded project exceeds the size threshold", async () => {
    // Unique notes defeat compression, pushing past the URL ceiling.
    const huge: PaletteProject = {
      id: "p",
      name: "Huge",
      entries: Array.from({ length: 4000 }, (_, i) => ({
        id: `color-${i}`,
        note: `unique annotation number ${i} ${Math.sin(i).toString(36)}`,
      })),
    };
    expect(await encodeProjectParam(huge)).toBeNull();
  });

  it("decodes malformed params to null instead of throwing", async () => {
    expect(await decodeProjectParam("")).toBeNull();
    expect(await decodeProjectParam("not-valid-base64!!")).toBeNull();
    expect(await decodeProjectParam("YWJj")).toBeNull(); // valid b64, not gzip
  });
});
