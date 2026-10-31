# Rolling Boss Fights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each boss fight into a sequence of separate rounds with boss HP, player half-hearts and per-round hints.

**Architecture:** A pure fight state machine (`src/engine/fight.ts`) holds HP, hearts (in halves), hints and status. The boss content changes from one program to `rounds[]`, each a self-contained program. The boss screen renders one round at a time, runs it on the Playground, classifies the result as hit/miss/fizzle and feeds it to the state machine.

**Tech Stack:** Vite 8, TypeScript 7 strict, Vitest 4 + jsdom, CodeMirror 6, plain DOM via `h()`.

Spec: `docs/superpowers/specs/2026-10-31-rolling-boss-fights-design.md`.

## Global Constraints

- Boss with `n` rounds: boss HP `n`, player hearts `n − 1` (tracked as `2 × (n − 1)` halves), hints `n − 2` total, at most one per round.
- hit = compiled and every round test passed (boss HP − 1); miss = compiled but a test failed or not all ran (−2 halves); fizzle = did not compile (−1 half). Playground `ok: false` results cost nothing.
- Stars on a win: `3 − floor(halvesLost / 2) − hintsUsed`, minimum 1.
- Content rule: 3 to 6 rounds per boss; every round has non-empty `title`, `task`, `starter`, `solution`, `hint`; `tests` contains `#[test]`; `starter` and `solution` contain `fn main`.
- Rust check names: `{island}-boss-r{N}-starter` (expect fail) and `{island}-boss-r{N}-solution` (expect pass), N 1-based.
- UI strings (exact):
  - round heading: `Round {i} of {n}: {title}`
  - hint button: `💡 Hint ({k} left)`; disabled titles `You've used this round's hint` / `No hints left`
  - hearts: ❤️ full, 💔 half, 🤍 empty; `role="img"`, `aria-label="Your hearts: {halves/2} of {hearts}"` (e.g. `Your hearts: 2.5 of 3`)
  - hit: `💥 Hit! {boss} loses 1 HP.` and a primary button `Next round →`
  - miss: `🛡 {boss} blocked your attack and hit back. You lose a heart.`
  - fizzle: `💨 Your attack fizzled: the code doesn't compile, and you lose half a heart. Read the compiler's message below.`
  - defeat heading `{boss} wins this time.`, text `You ran out of hearts. Every fight starts fresh, so try again whenever you're ready.`, buttons `Try again` and link `Back to {island}`
  - intro line: `Solve one round at a time. Each solved round hits the boss. A failed test costs you a heart; code that doesn't compile costs half a heart.`
- No mid-fight saving. `SaveData.bossCode` stays in the type and save format but is no longer read or written.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Fight rules engine

**Files:**
- Create: `src/engine/fight.ts`
- Test: `tests/fight.test.ts`

**Interfaces:**
- Produces: `Attack`, `FightStatus`, `FightState`, `heartsFor`, `hintsFor`, `startFight`, `attack`, `nextRound`, `canHint`, `takeHint`, `fightStars` exactly as below. Task 2 imports them.

- [ ] **Step 1: Write the failing test** `tests/fight.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/fight.test.ts`
Expected: FAIL, cannot resolve `../src/engine/fight`.

- [ ] **Step 3: Implement** `src/engine/fight.ts`:

```ts
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
```

- [ ] **Step 4: Run the test, then the suite and typecheck**

Run: `npx vitest run tests/fight.test.ts` → PASS. Then `npm test` and `npm run typecheck` → green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/fight.ts tests/fight.test.ts
git commit -m "feat: fight rules for rolling boss fights"
```

---

### Task 2: Rounds content, checks and the rolling boss screen

**Files:**
- Modify: `src/engine/types.ts` (Boss → rounds), `src/engine/progress.ts` (`recordBossDefeated` takes stars; remove `starsForHints`)
- Modify: `src/content/validate.ts`, `scripts/rust-checks.ts`
- Modify: `src/content/islands/01-variables.ts`, `02-functions.ts`, `03-if.ts` (replace each `boss: { ... }` object)
- Create: `src/ui/components/hearts.ts`
- Rewrite: `src/ui/screens/boss.ts`
- Modify: `src/styles/main.css`
- Modify tests: `tests/fixtures.ts`, `tests/progress.test.ts`, `tests/validate.test.ts`, `tests/rust-checks.test.ts`
- Create test: `tests/bossFight.test.ts`

**Interfaces:**
- Consumes (Task 1, `src/engine/fight.ts`): `Attack`, `FightState`, `startFight(rounds)`, `attack(state, result)`, `nextRound(state)`, `canHint(state)`, `takeHint(state)`, `fightStars(state): Stars`.
- Existing: `buildBossProgram(playerCode, tests)`, `countTests(tests)` (`src/playground/bossProgram.ts`); `runCode(code, { tests: true })` returning `{ ok: true; success; stdout; stderr } | { ok: false; reason; message }` (`src/playground/client.ts`); `parseTestOutput(stdout, stderr) → { compiled, passed, failed }`; `createConsole(parent)` with `showRunning()`, `showOutput(stdout, stderr, heading?)`, `showError(message, onRetry)`; `createCodeEditor(parent, code)` with `getCode/setCode/destroy` (the parent must already be in its parent element: it inserts a tip after itself); `createHpBar(parent, name, total)` with `set(remaining)`; `noteBossWin(xp, jumped, newlyOpened)`.
- Produces: `BossRound` type; `Boss = { name; story; rounds: BossRound[] }`; `recordBossDefeated(save, islandId, stars: Stars)`; `judgeRun(round, stdout, stderr): Attack` exported from `src/ui/screens/boss.ts`; `createHearts(parent, totalHalves)` with `set(halves)`.

- [ ] **Step 1: Types.** In `src/engine/types.ts` replace the `Boss` interface with:

```ts
export interface BossRound {
  title: string;
  /** Markdown subset, shown above the round's editor. */
  task: string;
  /** Complete program with fn main. Must fail its tests. */
  starter: string;
  /** Body of the hidden test module: #[test] functions only. */
  tests: string;
  /** Reference solution, used only by the verify script. */
  solution: string;
  /** Markdown subset. */
  hint: string;
}

export interface Boss {
  name: string;
  story: string;
  rounds: BossRound[];
}
```

Leave `SaveData.bossCode` and its doc comment as they are, but change the comment to `/** Unused since rolling boss fights; kept so old saves still load. */`.

- [ ] **Step 2: Stars.** In `src/engine/progress.ts` delete `starsForHints` and change `recordBossDefeated`:

```ts
export function recordBossDefeated(save: SaveData, islandId: string, stars: Stars): SaveData {
  const previous = save.bosses[islandId]?.stars;
  return {
    ...save,
    xp: previous === undefined ? save.xp + XP_PER_BOSS : save.xp,
    bosses: { ...save.bosses, [islandId]: { stars: bestStars(previous, stars) } },
  };
}
```

In `tests/progress.test.ts` remove `starsForHints` from the import, delete the test `"turns hints into stars"`, and replace the test `"awards boss XP once and keeps the best boss stars"` with:

```ts
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
```

- [ ] **Step 3: Fixtures.** In `tests/fixtures.ts` import `BossRound` with the other types, add above `makeIsland`:

```ts
export function makeRound(n: number): BossRound {
  return {
    title: `Round ${n}`,
    task: `Task ${n}.`,
    starter: `fn main() {} // round ${n}`,
    tests: "#[test]\nfn t() {}",
    solution: "fn main() {}",
    hint: `Hint ${n}.`,
  };
}
```

and make `makeIsland`'s boss `{ name: "Boss", story: "A story.", rounds: [1, 2, 3, 4].map(makeRound) }`.

- [ ] **Step 4: Validation.** In `src/content/validate.ts` replace the four boss checks (from `const boss = island.boss;` to the hints check) with:

```ts
  const rounds = island.boss.rounds;
  if (rounds.length < 3 || rounds.length > 6) report("/boss", "needs 3-6 rounds");
  rounds.forEach((round, index) => {
    const where = `/boss/round ${index + 1}`;
    for (const field of ["title", "task", "starter", "solution", "hint"] as const) {
      if (!round[field].trim()) report(where, `${field} is empty`);
    }
    if (!round.tests.includes("#[test]")) report(where, "tests contain no #[test]");
    if (!round.starter.includes("fn main")) report(where, "starter has no fn main");
    if (!round.solution.includes("fn main")) report(where, "solution has no fn main");
  });
```

In `tests/validate.test.ts` replace the test `"checks the boss"` with:

```ts
  it("checks the boss rounds", () => {
    const island = makeIsland("x");
    island.boss = { ...island.boss, rounds: [{ ...island.boss.rounds[0], tests: "fn nope() {}", hint: " ", starter: "let x = 1;" }] };
    const errors = validateIsland(island);
    expect(errors.some((e) => e.includes("3-6 rounds"))).toBe(true);
    expect(errors).toContain("x/boss/round 1: tests contain no #[test]");
    expect(errors).toContain("x/boss/round 1: hint is empty");
    expect(errors).toContain("x/boss/round 1: starter has no fn main");
  });
```

- [ ] **Step 5: Rust checks.** In `scripts/rust-checks.ts` replace the three lines from `const { starter, solution, tests } = island.boss;` with:

```ts
    island.boss.rounds.forEach((round, index) => {
      const name = `${island.id}-boss-r${index + 1}`;
      checks.push({ name: `${name}-starter`, kind: "test", code: buildBossProgram(round.starter, round.tests), expect: "fail" });
      checks.push({ name: `${name}-solution`, kind: "test", code: buildBossProgram(round.solution, round.tests), expect: "pass" });
    });
```

In `tests/rust-checks.test.ts` change the expected list to:

```ts
    expect(checks.map((c) => [c.name, c.kind, c.expect])).toEqual([
      ["vars-hello-page1", "run", "pass"],
      ...[1, 2, 3, 4].flatMap((n) => [
        [`vars-boss-r${n}-starter`, "test", "fail"],
        [`vars-boss-r${n}-solution`, "test", "pass"],
      ]),
    ]);
```

(keep the `mod boss_tests` assertion and rename the test to `"checks runnable examples and both sides of every boss round"`).

- [ ] **Step 6: Content.** Replace each island's whole `boss: { ... },` object with the one below. Keep the `rs` tag (from `../helpers`) and never put backticks inside `rs` templates.

`src/content/islands/01-variables.ts`:

```ts
  boss: {
    name: "The Immutable Golem",
    story:
      "A hulking golem of grey stone blocks the bridge out of the marsh. \"NOTHING HERE MAY CHANGE,\" it rumbles. Break its four runes one at a time to prove you understand variables, mutability and constants, and it will crumble.",
    rounds: [
      {
        title: "The height rune",
        task: "The golem's height is a constant, but this one won't compile. Fix the line marked FIX ME.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.
          // A last line with no semicolon hands its value back.

          const GOLEM_HEIGHT = 12; // FIX ME: the golem's height is a u32

          fn golem_height() -> u32 {
              GOLEM_HEIGHT
          }

          fn main() {
              println!("The golem is {} blocks tall.", golem_height());
          }
        `,
        tests: rs`
          #[test]
          fn golem_height_is_12() {
              assert_eq!(golem_height(), 12);
          }
        `,
        solution: rs`
          const GOLEM_HEIGHT: u32 = 12;

          fn golem_height() -> u32 {
              GOLEM_HEIGHT
          }

          fn main() {
              println!("The golem is {} blocks tall.", golem_height());
          }
        `,
        hint: "A constant always needs its type written after its name: `const NAME: type = value;`.",
      },
      {
        title: "The toll rune",
        task: "Pay the bridge toll: the coins must go down by the toll. Fix the line marked FIX ME.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.

          const BRIDGE_TOLL: u32 = 3;

          fn coins_after_bridge() -> u32 {
              let coins = 10;
              coins = coins - BRIDGE_TOLL; // FIX ME
              coins
          }

          fn main() {
              println!("Coins left: {}", coins_after_bridge());
          }
        `,
        tests: rs`
          #[test]
          fn pay_the_toll() {
              assert_eq!(coins_after_bridge(), 7);
          }
        `,
        solution: rs`
          const BRIDGE_TOLL: u32 = 3;

          fn coins_after_bridge() -> u32 {
              let mut coins = 10;
              coins = coins - BRIDGE_TOLL;
              coins
          }

          fn main() {
              println!("Coins left: {}", coins_after_bridge());
          }
        `,
        hint: "`coins` changes after it's created. Which keyword lets a variable change?",
      },
      {
        title: "The counting rune",
        task: "Count the letters on the rune. Fix the line marked FIX ME without changing the text.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.

          fn rune_count() -> usize {
              let mut runes = "rust!";
              runes = runes.len(); // FIX ME
              runes
          }

          fn main() {
              println!("The rune has {} letters.", rune_count());
          }
        `,
        tests: rs`
          #[test]
          fn count_the_runes() {
              assert_eq!(rune_count(), 5);
          }
        `,
        solution: rs`
          fn rune_count() -> usize {
              let runes = "rust!";
              let runes = runes.len();
              runes
          }

          fn main() {
              println!("The rune has {} letters.", rune_count());
          }
        `,
        hint: "`runes` starts as text and has to become a number. `mut` can't change a variable's type, but a second `let` (shadowing) can.",
      },
      {
        title: "The bridge rune",
        task: "Measure the bridge: it's 20 steps long. Fix the line marked FIX ME.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.

          fn bridge_length() -> i32 {
              let length: i32; // FIX ME: the bridge is 20 steps long
              length
          }

          fn main() {
              println!("The bridge is {} steps long.", bridge_length());
          }
        `,
        tests: rs`
          #[test]
          fn measure_the_bridge() {
              assert_eq!(bridge_length(), 20);
          }
        `,
        solution: rs`
          fn bridge_length() -> i32 {
              let length: i32 = 20;
              length
          }

          fn main() {
              println!("The bridge is {} steps long.", bridge_length());
          }
        `,
        hint: "`let length: i32;` declares a variable but never gives it a value. Give it the value 20 on that same line.",
      },
    ],
  },
```

`src/content/islands/02-functions.ts`:

```ts
  boss: {
    name: "The Signature Sphinx",
    story:
      "On a cliff above the fjord sits the Signature Sphinx. \"Answer my four riddles, one at a time,\" it purrs, \"and you may sail on.\" Each riddle is a function, and each one is wrong.",
    rounds: [
      {
        title: "The riddle of legs",
        task: "Return twice the number of legs.",
        starter: rs`
          fn riddle_one(legs: u32) -> u32 {
              legs * 2;
          }

          fn main() {
              println!("{}", riddle_one(4));
          }
        `,
        tests: rs`
          #[test]
          fn riddle_one_doubles() {
              assert_eq!(riddle_one(4), 8);
          }
        `,
        solution: rs`
          fn riddle_one(legs: u32) -> u32 {
              legs * 2
          }

          fn main() {
              println!("{}", riddle_one(4));
          }
        `,
        hint: "Look at the last line of the body. What does a semicolon do to a value?",
      },
      {
        title: "The riddle of sums",
        task: "Return the sum of `a` and `b`.",
        starter: rs`
          fn riddle_two(a: i32, b) -> i32 {
              a + b
          }

          fn main() {
              println!("{}", riddle_two(2, 3));
          }
        `,
        tests: rs`
          #[test]
          fn riddle_two_adds() {
              assert_eq!(riddle_two(2, 3), 5);
          }
        `,
        solution: rs`
          fn riddle_two(a: i32, b: i32) -> i32 {
              a + b
          }

          fn main() {
              println!("{}", riddle_two(2, 3));
          }
        `,
        hint: "Every parameter needs a type, just like `a` has one.",
      },
      {
        title: "The riddle of the answer",
        task: "Return the number 42.",
        starter: rs`
          fn riddle_three() {
              42
          }

          fn main() {
              println!("{}", riddle_three());
          }
        `,
        tests: rs`
          #[test]
          fn riddle_three_is_42() {
              assert_eq!(riddle_three(), 42);
          }
        `,
        solution: rs`
          fn riddle_three() -> i32 {
              42
          }

          fn main() {
              println!("{}", riddle_three());
          }
        `,
        hint: "A function that gives back a value needs `-> type` after its parentheses.",
      },
      {
        title: "The missing riddle",
        task: "Write a function named `riddle_four` that takes no parameters and returns the `u32` number 7. It doesn't exist yet!",
        starter: rs`
          // Write riddle_four here.

          fn main() {
              println!("The Sphinx is waiting...");
          }
        `,
        tests: rs`
          #[test]
          fn riddle_four_is_7() {
              assert_eq!(riddle_four(), 7);
          }
        `,
        solution: rs`
          fn riddle_four() -> u32 {
              7
          }

          fn main() {
              println!("The Sphinx is waiting...");
          }
        `,
        hint: "Write it from scratch: `fn riddle_four() -> u32 { ... }` with `7` as its last expression.",
      },
    ],
  },
```

`src/content/islands/03-if.ts`:

```ts
  boss: {
    name: "The Fork Kraken",
    story:
      "The water of Branching Bay boils, and the Fork Kraken rises! Each of its four tentacles is a function that has to choose the right path. Fix them one at a time to send it back to the deep.",
    rounds: [
      {
        title: "The tentacle of choice",
        task: "Return the bigger of `a` and `b`.",
        starter: rs`
          fn bigger(a: i32, b: i32) -> i32 {
              // Write an if/else expression here.
          }

          fn main() {
              println!("{}", bigger(10, 8));
          }
        `,
        tests: rs`
          #[test]
          fn bigger_picks_the_first() {
              assert_eq!(bigger(10, 8), 10);
          }

          #[test]
          fn bigger_picks_the_second() {
              assert_eq!(bigger(32, 42), 42);
          }
        `,
        solution: rs`
          fn bigger(a: i32, b: i32) -> i32 {
              if a > b {
                  a
              } else {
                  b
              }
          }

          fn main() {
              println!("{}", bigger(10, 8));
          }
        `,
        hint: "The body is empty, so it gives back nothing. Make an `if a > b { ... } else { ... }` expression the last thing in the body.",
      },
      {
        title: "The tentacle of signs",
        task: "Return 1 for positive numbers, -1 for negative numbers and 0 for zero.",
        starter: rs`
          fn sign(n: i32) -> i32 {
              if n > 0 {
                  1
              } else if n < 0 {
                  -1
              }
          }

          fn main() {
              println!("{}", sign(-3));
          }
        `,
        tests: rs`
          #[test]
          fn sign_handles_all_cases() {
              assert_eq!(sign(5), 1);
              assert_eq!(sign(-3), -1);
              assert_eq!(sign(0), 0);
          }
        `,
        solution: rs`
          fn sign(n: i32) -> i32 {
              if n > 0 {
                  1
              } else if n < 0 {
                  -1
              } else {
                  0
              }
          }

          fn main() {
              println!("{}", sign(-3));
          }
        `,
        hint: "When `if` produces a value, every path needs one. What happens when `n` is 0?",
      },
      {
        title: "The tentacle of luck",
        task: "A number is lucky if it's divisible by 7 or its last digit is 7 (that is, `n % 10 == 7`).",
        starter: rs`
          fn is_lucky(n: u32) -> bool {
              if n % 7 == 0 || n % 10 == 7 {
                  true
              } else {
                  "false"
              }
          }

          fn main() {
              println!("{}", is_lucky(27));
          }
        `,
        tests: rs`
          #[test]
          fn lucky_numbers() {
              assert!(is_lucky(14));
              assert!(is_lucky(27));
              assert!(!is_lucky(10));
          }
        `,
        solution: rs`
          fn is_lucky(n: u32) -> bool {
              if n % 7 == 0 || n % 10 == 7 {
                  true
              } else {
                  false
              }
          }

          fn main() {
              println!("{}", is_lucky(27));
          }
        `,
        hint: "Both branches must have the same type. `\"false\"` in quotes is text, but `false` is a `bool`.",
      },
      {
        title: "The tentacle of speed",
        task: "A ship sails at speed 1 in a storm and speed 3 in calm water. Make `ship_speed` give back the right number.",
        starter: rs`
          fn ship_speed(storm: bool) -> u32 {
              let speed = if storm {
                  1;
              } else {
                  3;
              };
              speed
          }

          fn main() {
              println!("Speed in a storm: {}", ship_speed(true));
          }
        `,
        tests: rs`
          #[test]
          fn ship_speed_matches_the_weather() {
              assert_eq!(ship_speed(true), 1);
              assert_eq!(ship_speed(false), 3);
          }
        `,
        solution: rs`
          fn ship_speed(storm: bool) -> u32 {
              let speed = if storm {
                  1
              } else {
                  3
              };
              speed
          }

          fn main() {
              println!("Speed in a storm: {}", ship_speed(true));
          }
        `,
        hint: "Look inside each branch: a semicolon after a value turns it into a statement, so the branch gives back nothing. The `let` line itself still ends with `;`.",
      },
    ],
  },
```

- [ ] **Step 7: Hearts component** `src/ui/components/hearts.ts`:

```ts
import { h } from "../dom";

export interface Hearts {
  set(halves: number): void;
}

/** The player's hearts as full, half and empty hearts. Both counts are in halves. */
export function createHearts(parent: HTMLElement, totalHalves: number): Hearts {
  const el = h("p", { class: "hearts", role: "img" });
  parent.append(el);
  const set = (halves: number) => {
    const full = Math.floor(halves / 2);
    const half = halves % 2;
    const empty = Math.max(0, Math.floor(totalHalves / 2) - full - half);
    el.textContent = "❤️".repeat(full) + "💔".repeat(half) + "🤍".repeat(empty);
    el.setAttribute("aria-label", `Your hearts: ${halves / 2} of ${totalHalves / 2}`);
  };
  set(totalHalves);
  return { set };
}
```

- [ ] **Step 8: Write the failing screen test** `tests/bossFight.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveStore } from "../src/engine/save";
import { runCode } from "../src/playground/client";
import { createAppContext } from "../src/ui/app";
import { renderBoss } from "../src/ui/screens/boss";
import { emptySave, makeIsland } from "./fixtures";

vi.mock("../src/playground/client", () => ({ runCode: vi.fn() }));
const run = vi.mocked(runCode);
type Result = Awaited<ReturnType<typeof runCode>>;

const HIT: Result = { ok: true, success: true, stdout: "test boss_tests::t ... ok\n", stderr: "" };
const MISS: Result = { ok: true, success: false, stdout: "test boss_tests::t ... FAILED\n", stderr: "" };
const FIZZLE: Result = { ok: true, success: false, stdout: "", stderr: "error[E0308]: mismatched types\nerror: could not compile `x`" };
const DOWN: Result = { ok: false, reason: "network", message: "The compiler bridge is down." };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
let cleanups: (() => void)[] = [];

function setup() {
  const ctx = createAppContext(createSaveStore(null), [makeIsland("a")], []);
  ctx.update(() => emptySave("beginner"));
  const root = document.createElement("div");
  document.body.append(root);
  const cleanup = renderBoss(root, ctx, "a");
  cleanups.push(() => {
    cleanup();
    root.remove();
  });
  const button = (label: string) =>
    [...root.querySelectorAll("button")].find((b) => b.textContent?.startsWith(label)) as HTMLButtonElement;
  const heading = () => root.querySelector(".round h2")?.textContent;
  const hearts = () => root.querySelector(".hearts")?.getAttribute("aria-label");
  const hp = () => root.querySelector(".hp-label")?.textContent;
  const attack = async (result: Result) => {
    run.mockResolvedValueOnce(result);
    button("▶ Run").click();
    await flush();
  };
  const winRound = async () => {
    await attack(HIT);
    button("Next round →")?.click();
  };
  return { ctx, root, button, heading, hearts, hp, attack, winRound };
}

beforeEach(() => {
  run.mockReset();
  window.location.hash = "";
});

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
});

describe("rolling boss fight", () => {
  it("starts at round 1 with full HP, 3 hearts and 2 hints", () => {
    const fight = setup();
    expect(fight.heading()).toBe("Round 1 of 4: Round 1");
    expect(fight.hearts()).toBe("Your hearts: 3 of 3");
    expect(fight.hp()).toBe("Boss: 4/4 HP");
    expect(fight.button("💡 Hint").textContent).toBe("💡 Hint (2 left)");
    expect(fight.button("💡 Hint").disabled).toBe(false);
  });

  it("moves to the next round after a hit", async () => {
    const fight = setup();
    await fight.attack(HIT);
    expect(fight.root.textContent).toContain("💥 Hit! Boss loses 1 HP.");
    expect(fight.hp()).toBe("Boss: 3/4 HP");
    expect(fight.button("▶ Run").disabled).toBe(true);
    fight.button("Next round →").click();
    expect(fight.heading()).toBe("Round 2 of 4: Round 2");
    expect(fight.button("▶ Run").disabled).toBe(false);
    expect(run.mock.calls[0][0]).toContain("// round 1");
    expect(run.mock.calls[0][0]).toContain("mod boss_tests");
  });

  it("costs a whole heart for a failed test and half for a compile error", async () => {
    const fight = setup();
    await fight.attack(MISS);
    expect(fight.hearts()).toBe("Your hearts: 2 of 3");
    expect(fight.root.textContent).toContain("You lose a heart.");
    await fight.attack(FIZZLE);
    expect(fight.hearts()).toBe("Your hearts: 1.5 of 3");
    expect(fight.root.textContent).toContain("you lose half a heart");
    expect(fight.heading()).toBe("Round 1 of 4: Round 1");
  });

  it("does not cost a heart when the Playground can't be reached", async () => {
    const fight = setup();
    await fight.attack(DOWN);
    expect(fight.hearts()).toBe("Your hearts: 3 of 3");
    expect(fight.root.textContent).toContain("The compiler bridge is down.");
  });

  it("ends the fight when the hearts run out and lets you try again", async () => {
    const fight = setup();
    await fight.winRound();
    await fight.attack(MISS);
    await fight.attack(MISS);
    await fight.attack(MISS);
    expect(fight.root.textContent).toContain("Boss wins this time.");
    expect(fight.button("▶ Run").disabled).toBe(true);
    fight.button("Try again").click();
    expect(fight.heading()).toBe("Round 1 of 4: Round 1");
    expect(fight.hearts()).toBe("Your hearts: 3 of 3");
    expect(fight.hp()).toBe("Boss: 4/4 HP");
    expect(fight.root.textContent).not.toContain("wins this time");
  });

  it("gives one hint per round, about that round only", async () => {
    const fight = setup();
    fight.button("💡 Hint").click();
    expect(fight.root.querySelector(".hints")?.textContent).toBe("Hint 1.");
    expect(fight.button("💡 Hint").textContent).toBe("💡 Hint (1 left)");
    expect(fight.button("💡 Hint").disabled).toBe(true);
    expect(fight.button("💡 Hint").title).toBe("You've used this round's hint");
    await fight.winRound();
    expect(fight.root.querySelector(".hints")?.textContent).toBe("");
    fight.button("💡 Hint").click();
    expect(fight.root.querySelector(".hints")?.textContent).toBe("Hint 2.");
    await fight.winRound();
    expect(fight.button("💡 Hint").disabled).toBe(true);
    expect(fight.button("💡 Hint").title).toBe("No hints left");
  });

  it("records the win with stars from hearts and hints, then celebrates", async () => {
    const fight = setup();
    fight.button("💡 Hint").click();
    await fight.attack(MISS);
    for (let i = 0; i < 4; i += 1) await fight.winRound();
    expect(fight.ctx.getSave().bosses.a).toEqual({ stars: 1 });
    expect(window.location.hash).toBe("#/celebrate/a");
  });

  it("gives 3 stars for a clean fight", async () => {
    const fight = setup();
    await fight.attack(FIZZLE);
    for (let i = 0; i < 4; i += 1) await fight.winRound();
    expect(fight.ctx.getSave().bosses.a).toEqual({ stars: 3 });
  });
});
```

Run: `npx vitest run tests/bossFight.test.ts` → FAIL (old boss screen).

- [ ] **Step 9: Rewrite** `src/ui/screens/boss.ts` completely:

```ts
import { attack, canHint, fightStars, nextRound, startFight, takeHint, type Attack, type FightState } from "../../engine/fight";
import { isIslandUnlocked, isJumpChallenge, recordBossDefeated } from "../../engine/progress";
import type { BossRound, Island } from "../../engine/types";
import { buildBossProgram, countTests } from "../../playground/bossProgram";
import { runCode } from "../../playground/client";
import { parseTestOutput } from "../../playground/testOutput";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { createCodeEditor, type CodeEditor } from "../components/codeEditor";
import { createConsole } from "../components/console";
import { createHearts } from "../components/hearts";
import { createHpBar } from "../components/hpBar";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";
import { noteBossWin } from "./celebrate";

/** Classifies one Run of a round: every test passed, a test failed, or the code didn't compile. */
export function judgeRun(round: BossRound, stdout: string, stderr: string): Attack {
  const report = parseTestOutput(stdout, stderr);
  if (!report.compiled) return "fizzle";
  const allPassed = report.failed.length === 0 && report.passed.length === countTests(round.tests);
  return allPassed ? "hit" : "miss";
}

export function renderBoss(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const foundIsland = ctx.islands.find((i) => i.id === islandId);
  if (!foundIsland) {
    ctx.go({ name: "map" });
    return noop;
  }
  const island: Island = foundIsland;
  const boss = island.boss;
  const jump = isJumpChallenge(ctx.islands, islandId, ctx.getSave());
  let fight: FightState = startFight(boss.rounds.length);
  let editor: CodeEditor | null = null;
  let alive = true;

  const main = h("main", { class: "boss" });
  root.append(renderHud(ctx), main);
  main.append(
    h("a", { class: "back", href: routeToHash({ name: "island", islandId }) }, `← ${island.name}`),
    h("h1", {}, `⚔ ${boss.name}`),
    prose(boss.story),
    ...(jump ? [h("p", { class: "jump-notice" }, `Jump challenge: beat this boss to unlock every island up to ${island.name}.`)] : []),
    h("p", { class: "muted" },
      "Solve one round at a time. Each solved round hits the boss. A failed test costs you a heart; code that doesn't compile costs half a heart."),
  );
  const hp = createHpBar(main, boss.name, fight.bossHp);
  const hearts = createHearts(main, fight.halves);
  const panel = h("section", { class: "round" });
  main.append(panel);

  function closeEditor(): void {
    editor?.destroy();
    editor = null;
  }

  function win(): void {
    const before = ctx.getSave();
    const wasOpen = new Set(ctx.islands.filter((i) => isIslandUnlocked(ctx.islands, i.id, before)).map((i) => i.id));
    ctx.update((s) => recordBossDefeated(s, island.id, fightStars(fight)));
    const after = ctx.getSave();
    const newlyOpened = ctx.islands
      .filter((i) => !wasOpen.has(i.id) && isIslandUnlocked(ctx.islands, i.id, after))
      .map((i) => i.id);
    noteBossWin(after.xp - before.xp, jump, newlyOpened);
    ctx.go({ name: "celebrate", islandId: island.id });
  }

  function restart(): void {
    fight = startFight(boss.rounds.length);
    hp.set(fight.bossHp);
    hearts.set(fight.halves);
    showRound();
  }

  function showRound(): void {
    closeEditor();
    panel.replaceChildren();
    const round = boss.rounds[fight.round];
    const heading = h("h2", { tabindex: -1 }, `Round ${fight.round + 1} of ${fight.rounds}: ${round.title}`);
    const editorHost = h("div", { class: "editor" });
    const runButton = h("button", { class: "btn primary" }, "▶ Run");
    const hintButton = h("button", { class: "btn" });
    const resetButton = h("button", { class: "btn" }, "Reset code");
    const hintList = h("ol", { class: "hints" });
    const consoleHost = h("div");
    const nextRow = h("div", { class: "row" });
    panel.append(heading, prose(round.task), editorHost,
      h("div", { class: "row" }, runButton, hintButton, resetButton), hintList, consoleHost, nextRow);
    const roundEditor = createCodeEditor(editorHost, round.starter);
    editor = roundEditor;
    const output = createConsole(consoleHost);
    if (fight.round > 0) heading.focus();

    const syncHint = () => {
      hintButton.textContent = `💡 Hint (${fight.hintsLeft} left)`;
      hintButton.disabled = !canHint(fight);
      const why = fight.roundHinted ? "You've used this round's hint" : fight.hintsLeft === 0 ? "No hints left" : null;
      if (why) hintButton.title = why;
      else hintButton.removeAttribute("title");
    };
    syncHint();

    hintButton.addEventListener("click", () => {
      if (!canHint(fight)) return;
      fight = takeHint(fight);
      hintList.append(h("li", {}, prose(round.hint)));
      syncHint();
    });

    resetButton.addEventListener("click", () => {
      if (window.confirm("Replace your code with this round's starter code?")) roundEditor.setCode(round.starter);
    });

    async function run(): Promise<void> {
      runButton.disabled = true;
      output.showRunning();
      const result = await runCode(buildBossProgram(roundEditor.getCode(), round.tests), { tests: true });
      if (!alive || editor !== roundEditor) return;
      if (!result.ok) {
        runButton.disabled = false;
        output.showError(result.message, () => void run());
        return;
      }
      const outcome = judgeRun(round, result.stdout, result.stderr);
      fight = attack(fight, outcome);
      hp.set(fight.bossHp);
      hearts.set(fight.halves);
      if (fight.status === "won") {
        win();
        return;
      }
      syncHint();
      if (outcome === "hit") {
        output.showOutput(result.stdout, "", { text: `💥 Hit! ${boss.name} loses 1 HP.`, kind: "success" });
        const next = h("button", { class: "btn primary" }, "Next round →");
        next.addEventListener("click", () => {
          fight = nextRound(fight);
          showRound();
        });
        nextRow.append(next);
        next.focus();
        return;
      }
      if (outcome === "miss") {
        output.showOutput(result.stdout, "", { text: `🛡 ${boss.name} blocked your attack and hit back. You lose a heart.`, kind: "error" });
      } else {
        output.showOutput("", result.stderr, {
          text: "💨 Your attack fizzled: the code doesn't compile, and you lose half a heart. Read the compiler's message below.",
          kind: "error",
        });
      }
      if (fight.status === "lost") {
        showDefeat(resetButton);
        return;
      }
      runButton.disabled = false;
    }
    runButton.addEventListener("click", () => void run());
  }

  function showDefeat(resetButton: HTMLButtonElement): void {
    resetButton.disabled = true;
    const title = h("h2", { tabindex: -1 }, `${boss.name} wins this time.`);
    const retry = h("button", { class: "btn primary" }, "Try again");
    retry.addEventListener("click", restart);
    panel.prepend(h("div", { class: "defeat" },
      title,
      h("p", {}, "You ran out of hearts. Every fight starts fresh, so try again whenever you're ready."),
      h("div", { class: "row" }, retry, h("a", { class: "btn", href: routeToHash({ name: "island", islandId }) }, `Back to ${island.name}`)),
    ));
    title.focus();
  }

  showRound();

  return () => {
    alive = false;
    closeEditor();
  };
}
```

Note: `.round h2` in the test finds the round heading because the defeat box's `h2` is removed by `showRound()` on Try again; while the defeat box is shown, the test does not read `heading()`.

If `h()` does not accept a number for `tabindex`, pass `"-1"`.

- [ ] **Step 10: CSS.** Append to `src/styles/main.css` (next to the `.hp` rules):

```css
.hearts { font-size: 1.4rem; letter-spacing: 4px; margin: 4px 0 16px; }
.round { border-top: 2px solid var(--line); margin-top: 8px; padding-top: 4px; }
.defeat { border: 2px solid var(--bad); border-radius: 12px; padding: 4px 16px; margin: 16px 0; }
```

- [ ] **Step 11: Nothing else may read the old fields.** Run `grep -rn "boss\.\(starter\|tests\|solution\|hints\)\|bossCode\|starsForHints" src scripts tests`. Only `bossCode` in `src/engine/types.ts`, `src/engine/save.ts` and `tests/fixtures.ts` may remain.

- [ ] **Step 12: Verify**

Run: `npx vitest run tests/bossFight.test.ts` → PASS. Then `npm test`, `npm run typecheck`, `npm run build` → green. Then `npm run verify:rust` → `31/31 Rust checks behaved as expected.` (19 page checks + 12 round checks; if the page count differs, the round checks must still all be `ok`).

- [ ] **Step 13: Commit**

```bash
git add -A src scripts tests
git commit -m "feat: rolling boss fights with hearts and per-round hints"
```
