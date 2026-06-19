import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import { toSlug } from "./slug.js";

const c = (colorNumber: string, name: string): Color =>
  ({ colorNumber, name }) as Color;

describe("toSlug", () => {
  it("builds sw-<number>-<kebab name>", () => {
    expect(toSlug(c("6258", "Tricorn Black"))).toBe("sw-6258-tricorn-black");
  });

  it("strips punctuation and collapses separators", () => {
    expect(toSlug(c("9001", "Audrey's Blush"))).toBe("sw-9001-audrey-s-blush");
    expect(toSlug(c("7005", "Pure White & Bright"))).toBe(
      "sw-7005-pure-white-bright",
    );
  });

  it("lowercases and trims edge separators", () => {
    expect(toSlug(c("0001", "  Mulberry Silk  "))).toBe(
      "sw-0001-mulberry-silk",
    );
  });
});
