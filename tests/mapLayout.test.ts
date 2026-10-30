import { describe, expect, it } from "vitest";
import { mapSize, mapSlot } from "../src/ui/screens/mapLayout";

describe("map layout", () => {
  it("snakes left-to-right, then right-to-left", () => {
    expect(mapSlot(0)).toEqual({ x: 110, y: 110 });
    expect(mapSlot(5)).toEqual({ x: 1090, y: 110 });
    expect(mapSlot(6)).toEqual({ x: 1090, y: 300 });
    expect(mapSlot(11)).toEqual({ x: 110, y: 300 });
    expect(mapSlot(12)).toEqual({ x: 110, y: 490 });
  });

  it("sizes the map to fit every row", () => {
    expect(mapSize(23)).toEqual({ width: 1200, height: 790 });
    expect(mapSize(6)).toEqual({ width: 1200, height: 220 });
  });
});
