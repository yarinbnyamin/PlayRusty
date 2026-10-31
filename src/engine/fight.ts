import type { Stars } from "./types";

/** What one Run of a round did: every test passed, a test failed, or the code didn't compile. */
export type Attack = "hit" | "miss" | "fizzle";
export type FightStatus = "fighting" | "roundWon" | "won" | "lost";

export interface FightState {
  rounds: number;
  /** 0-based index of the current round. */
  round: number;
  bossHp: number;
  /** The player's hearts left, counted in halves. */
  halves: number;
  hintsLeft: number;
  hintsUsed: number;
  /** True once the current round's hint has been shown. */
  roundHinted: boolean;
  status: FightStatus;
}

export const heartsFor = (rounds: number): number => Math.max(1, rounds - 1);
export const hintsFor = (rounds: number): number => Math.max(0, rounds - 2);

export function startFight(rounds: number): FightState {
  return {
    rounds,
    round: 0,
    bossHp: rounds,
    halves: 2 * heartsFor(rounds),
    hintsLeft: hintsFor(rounds),
    hintsUsed: 0,
    roundHinted: false,
    status: "fighting",
  };
}

export function attack(state: FightState, result: Attack): FightState {
  if (state.status !== "fighting") return state;
  if (result === "hit") {
    const bossHp = state.bossHp - 1;
    return { ...state, bossHp, status: bossHp === 0 ? "won" : "roundWon" };
  }
  const halves = Math.max(0, state.halves - (result === "miss" ? 2 : 1));
  return { ...state, halves, status: halves === 0 ? "lost" : "fighting" };
}

export function nextRound(state: FightState): FightState {
  if (state.status !== "roundWon") return state;
  return { ...state, round: state.round + 1, roundHinted: false, status: "fighting" };
}

export function canHint(state: FightState): boolean {
  return state.status === "fighting" && !state.roundHinted && state.hintsLeft > 0;
}

export function takeHint(state: FightState): FightState {
  if (!canHint(state)) return state;
  return { ...state, hintsLeft: state.hintsLeft - 1, hintsUsed: state.hintsUsed + 1, roundHinted: true };
}

/** 3 stars, minus one per whole heart lost and one per hint used, never below 1. */
export function fightStars(state: FightState): Stars {
  const halvesLost = 2 * heartsFor(state.rounds) - state.halves;
  return Math.max(1, 3 - Math.floor(halvesLost / 2) - state.hintsUsed) as Stars;
}
