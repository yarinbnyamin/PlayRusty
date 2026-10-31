import { describe, expect, it } from "vitest";
import { attack, canHint, fightStars, heartsFor, hintsFor, nextRound, startFight, takeHint } from "../src/engine/fight";

describe("fight rules", () => {
  it("gives n HP, n-1 hearts and n-2 hints", () => {
    expect(startFight(4)).toEqual({
      rounds: 4, round: 0, bossHp: 4, halves: 6, hintsLeft: 2, hintsUsed: 0, roundHinted: false, status: "fighting",
    });
    expect([heartsFor(3), hintsFor(3)]).toEqual([2, 1]);
  });

  it("wins a round with a hit and the fight with the last hit", () => {
    let fight = attack(startFight(3), "hit");
    expect([fight.bossHp, fight.status]).toEqual([2, "roundWon"]);
    expect(attack(fight, "hit")).toBe(fight);
    fight = nextRound(fight);
    expect([fight.round, fight.status]).toEqual([1, "fighting"]);
    fight = nextRound(attack(fight, "hit"));
    fight = attack(fight, "hit");
    expect([fight.bossHp, fight.status]).toEqual([0, "won"]);
  });

  it("costs a whole heart for a miss and half for a fizzle", () => {
    let fight = attack(startFight(4), "miss");
    expect(fight.halves).toBe(4);
    fight = attack(fight, "fizzle");
    expect([fight.halves, fight.status]).toEqual([3, "fighting"]);
  });

  it("is lost when the hearts run out", () => {
    let fight = attack(attack(startFight(3), "miss"), "fizzle");
    expect(fight.status).toBe("fighting");
    fight = attack(fight, "miss");
    expect([fight.halves, fight.status]).toEqual([0, "lost"]);
    expect(attack(fight, "hit")).toBe(fight);
    expect(attack(attack(attack(startFight(3), "fizzle"), "miss"), "miss").halves).toBe(0);
  });

  it("allows one hint per round and n-2 in total", () => {
    let fight = takeHint(startFight(4));
    expect([fight.hintsLeft, fight.hintsUsed, canHint(fight)]).toEqual([1, 1, false]);
    expect(takeHint(fight)).toBe(fight);
    fight = takeHint(nextRound(attack(fight, "hit")));
    expect([fight.hintsLeft, canHint(fight)]).toEqual([0, false]);
    fight = nextRound(attack(fight, "hit"));
    expect([fight.roundHinted, canHint(fight)]).toEqual([false, false]);
  });

  it("turns lost hearts and hints into stars", () => {
    expect(fightStars(startFight(4))).toBe(3);
    expect(fightStars(attack(startFight(4), "fizzle"))).toBe(3);
    expect(fightStars(attack(attack(startFight(4), "fizzle"), "fizzle"))).toBe(2);
    expect(fightStars(takeHint(attack(startFight(4), "miss")))).toBe(1);
    const twoHintsAndAMiss = takeHint(nextRound(attack(takeHint(attack(startFight(4), "miss")), "hit")));
    expect(fightStars(twoHintsAndAMiss)).toBe(1);
  });
});
