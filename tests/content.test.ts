import { describe, expect, it } from "vitest";
import { comingSoon, islands } from "../src/content/index";
import { validateIslands } from "../src/content/validate";

describe("game content", () => {
  it("passes the content validator", () => {
    expect(validateIslands(islands)).toEqual([]);
  });

  it("numbers playable islands 1..n in order", () => {
    expect(islands.map((island) => island.number)).toEqual(islands.map((_, i) => i + 1));
  });

  it("never lists a playable island as coming soon", () => {
    for (const island of islands) {
      expect(comingSoon.some((entry) => entry.number === island.number)).toBe(false);
    }
  });
});
