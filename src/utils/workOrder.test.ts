import { describe, it, expect } from "vitest";
import { TEST_COLORS } from "../test/fixtures.js";
import type { Room } from "../domain/project.js";
import { buildShoppingList, shoppingListText } from "./workOrder.js";

const colorsMap = new Map(TEST_COLORS.map((c) => [c.id, c]));

const rooms: Room[] = [
  {
    id: "a",
    name: "Room A",
    surfaces: [
      {
        id: "a1",
        type: "wall",
        colorId: "tricorn",
        finish: "satin",
        areaSqFt: 350,
      }, // ×2 coats → 700
    ],
  },
  {
    id: "b",
    name: "Room B",
    surfaces: [
      {
        id: "b1",
        type: "wall",
        colorId: "tricorn",
        finish: "satin",
        areaSqFt: 350,
      }, // same color×finish → merges
      {
        id: "b2",
        type: "trim",
        colorId: "tricorn",
        finish: "semi-gloss",
        areaSqFt: 175,
      }, // ×2 → 350
      {
        id: "b3",
        type: "ceiling",
        colorId: "repose",
        finish: "flat",
        coats: 1,
        areaSqFt: 350,
      }, // ×1 → 350
      { id: "b4", type: "door", areaSqFt: 100 }, // unassigned → skipped
    ],
  },
];

describe("buildShoppingList", () => {
  it("aggregates one row per color × finish across rooms", () => {
    const items = buildShoppingList(rooms, colorsMap);
    expect(items).toHaveLength(3);

    // Tricorn × Satin merges Room A + Room B (700 sq ft, 1400 sq-ft·coats / 350).
    const satin = items[0];
    expect(satin).toMatchObject({
      name: "Tricorn Black",
      number: "6258",
      finishLabel: "Satin",
      rack: "194-C1",
      areaSqFt: 700,
      cans: 4,
    });

    // Same color, different finish → its own row.
    expect(items[1]).toMatchObject({
      number: "6258",
      finishLabel: "Semi-Gloss",
      areaSqFt: 175,
      cans: 1,
    });
  });

  it("carries a null rack when the color has no locator", () => {
    const repose = buildShoppingList(rooms, colorsMap).find(
      (i) => i.number === "7015",
    )!;
    expect(repose).toMatchObject({ finishLabel: "Flat", rack: null, cans: 1 });
  });

  it("skips unassigned and unmeasured surfaces", () => {
    const items = buildShoppingList(
      [
        {
          id: "r",
          name: "R",
          surfaces: [
            { id: "s1", type: "wall", finish: "satin", areaSqFt: 200 }, // no color
            { id: "s2", type: "wall", colorId: "tricorn", finish: "satin" }, // no area
          ],
        },
      ],
      colorsMap,
    );
    expect(items).toEqual([]);
  });
});

describe("shoppingListText", () => {
  it("renders copy-pasteable lines with finish, rack, and cans", () => {
    const text = shoppingListText(buildShoppingList(rooms, colorsMap), "Job");
    expect(text.split("\n")).toEqual([
      "Shopping list — Job",
      "Tricorn Black (SW 6258) · Satin · rack 194-C1 · 4 cans",
      "Tricorn Black (SW 6258) · Semi-Gloss · rack 194-C1 · 1 can",
      "Repose Gray (SW 7015) · Flat · rack n/a · 1 can",
    ]);
  });
});
