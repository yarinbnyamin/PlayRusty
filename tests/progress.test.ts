import { describe, expect, it } from "vitest";
import {
  XP_PER_BOSS, XP_PER_PUZZLE, currentIslandId, isIslandUnlocked, isJumpChallenge, isStageUnlocked,
  recordBossDefeated, recordPuzzleSolved, recordStageComplete, starsForMistakes,
  totalStars, visiblePages, visibleStages,
} from "../src/engine/progress";
import type { Stage } from "../src/engine/types";
import { emptySave, makeIsland, makeStage } from "./fixtures";

const intro = makeStage("intro", { beginnerOnly: true });
const islandA = makeIsland("a", [intro, makeStage("s1"), makeStage("s2")]);
const islandB = makeIsland("b");
const islands = [islandA, islandB];

describe("visibility", () => {
  it("hides beginnerOnly stages from experienced players", () => {
    expect(visibleStages(islandA, "beginner").map((s) => s.id)).toEqual(["intro", "s1", "s2"]);
    expect(visibleStages(islandA, "experienced").map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("shows pages for the player's audience plus 'all'", () => {
    const stage: Stage = makeStage("x", {
      tutorial: [
        { audience: "beginner", title: "b", text: "" },
        { audience: "all", title: "a", text: "" },
        { audience: "experienced", title: "e", text: "" },
      ],
    });
    expect(visiblePages(stage, "beginner").map((p) => p.title)).toEqual(["b", "a"]);
    expect(visiblePages(stage, "experienced").map((p) => p.title)).toEqual(["a", "e"]);
  });
});

describe("unlocking", () => {
  it("unlocks the first island only, until its boss is defeated", () => {
    const save = emptySave();
    expect(isIslandUnlocked(islands, "a", save)).toBe(true);
    expect(isIslandUnlocked(islands, "b", save)).toBe(false);
    expect(isIslandUnlocked(islands, "b", recordBossDefeated(save, "a", 3))).toBe(true);
    expect(isIslandUnlocked(islands, "nope", save)).toBe(false);
  });

  it("unlocks stages in order", () => {
    let save = emptySave("beginner");
    expect(isStageUnlocked(islands, "a", "intro", save)).toBe(true);
    expect(isStageUnlocked(islands, "a", "s1", save)).toBe(false);
    save = recordStageComplete(save, "a", "intro", 0);
    expect(isStageUnlocked(islands, "a", "s1", save)).toBe(true);
    expect(isStageUnlocked(islands, "a", "s2", save)).toBe(false);
  });

  it("skips beginnerOnly stages for experienced players", () => {
    const save = emptySave("experienced");
    expect(isStageUnlocked(islands, "a", "s1", save)).toBe(true);
    expect(isStageUnlocked(islands, "a", "intro", save)).toBe(false);
  });

  it("keeps completed stages unlocked after switching modes", () => {
    let save = emptySave("experienced");
    save = recordStageComplete(save, "a", "s1", 0);
    save = { ...save, mode: "beginner" };
    expect(isStageUnlocked(islands, "a", "s1", save)).toBe(true);
  });

  it("unlocks every island up to and after a boss beaten by jumping ahead", () => {
    const four = [islandA, islandB, makeIsland("c"), makeIsland("d")];
    const save = recordBossDefeated(emptySave(), "c", 3);
    expect(isIslandUnlocked(four, "a", save)).toBe(true);
    expect(isIslandUnlocked(four, "b", save)).toBe(true);
    expect(isIslandUnlocked(four, "c", save)).toBe(true);
    expect(isIslandUnlocked(four, "d", save)).toBe(true);
  });

  it("marks the bosses of locked islands as jump challenges", () => {
    const save = emptySave();
    expect(isJumpChallenge(islands, "a", save)).toBe(false);
    expect(isJumpChallenge(islands, "b", save)).toBe(true);
    expect(isJumpChallenge(islands, "b", recordBossDefeated(save, "a", 3))).toBe(false);
    expect(isJumpChallenge(islands, "nope", save)).toBe(false);
  });

  it("opens every stage once the island's boss is beaten", () => {
    const save = recordBossDefeated(emptySave("beginner"), "a", 3);
    expect(isStageUnlocked(islands, "a", "s2", save)).toBe(true);
    expect(isStageUnlocked(islands, "a", "nope", save)).toBe(false);
  });

  it("finds the island Ferris should stand on", () => {
    const save = emptySave();
    expect(currentIslandId(islands, save)).toBe("a");
    const afterA = recordBossDefeated(save, "a", 3);
    expect(currentIslandId(islands, afterA)).toBe("b");
    expect(currentIslandId(islands, recordBossDefeated(afterA, "b", 3))).toBe("b");
    const three = [islandA, islandB, makeIsland("c")];
    expect(currentIslandId(three, recordBossDefeated(save, "b", 3))).toBe("c");
    expect(currentIslandId([], save)).toBeNull();
  });
});

describe("scoring", () => {
  it("turns mistakes into stars", () => {
    expect([0, 1, 2, 3, 9].map(starsForMistakes)).toEqual([3, 2, 2, 1, 1]);
  });

  it("awards puzzle XP only once", () => {
    const once = recordPuzzleSolved(emptySave(), "a", "s1", "p1");
    const twice = recordPuzzleSolved(once, "a", "s1", "p1");
    expect(once.xp).toBe(XP_PER_PUZZLE);
    expect(twice.xp).toBe(XP_PER_PUZZLE);
    expect(twice.solvedPuzzles).toEqual(["a/s1/p1"]);
  });

  it("keeps the best stage stars", () => {
    let save = recordStageComplete(emptySave(), "a", "s1", 1);
    expect(save.stages["a/s1"].stars).toBe(2);
    save = recordStageComplete(save, "a", "s1", 5);
    expect(save.stages["a/s1"].stars).toBe(2);
    save = recordStageComplete(save, "a", "s1", 0);
    expect(save.stages["a/s1"].stars).toBe(3);
  });

  it("awards boss XP once and keeps the best boss stars", () => {
    let save = recordBossDefeated(emptySave(), "a", 1);
    expect(save.xp).toBe(XP_PER_BOSS);
    expect(save.bosses.a.stars).toBe(1);
    save = recordBossDefeated(save, "a", 3);
    expect(save.xp).toBe(XP_PER_BOSS);
    expect(save.bosses.a.stars).toBe(3);
    save = recordBossDefeated(save, "a", 2);
    expect(save.bosses.a.stars).toBe(3);
  });

  it("sums stage and boss stars", () => {
    let save = recordStageComplete(emptySave(), "a", "s1", 0);
    save = recordBossDefeated(save, "a", 2);
    expect(totalStars(save)).toBe(5);
  });

  it("never mutates the save it is given", () => {
    const save = emptySave();
    recordPuzzleSolved(save, "a", "s1", "p1");
    recordStageComplete(save, "a", "s1", 0);
    recordBossDefeated(save, "a", 3);
    expect(save).toEqual(emptySave());
  });
});
