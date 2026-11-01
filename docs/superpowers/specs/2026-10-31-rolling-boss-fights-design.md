# PlayRusty: rolling boss fights (addendum)

Date: 2026-10-31. Extends `2026-10-30-playrusty-design.md` and `2026-10-31-skip-ahead-and-music-design.md`. Where they disagree, this addendum wins.

## 1. What changes

A boss fight is no longer one program with every test at once. It is a sequence of **rounds**, one small program each, played one after another. Solving a round hits the boss for 1 HP. Failing costs the player hearts. A few hints help along the way, each about the current round only.

## 2. Rules (pure functions in `src/engine/fight.ts`)

For a boss with `n` rounds (content allows 3 to 6; every current boss has 4):

- **Boss HP:** `n`. Each solved round takes 1 HP.
- **Player hearts:** `n − 1`, tracked in half-hearts (`2 × (n − 1)` halves).
- **Hints:** `n − 2` for the whole fight, at most one per round. A hint shows that round's own hint text and never costs a heart.
- **A Run's outcome** is one of:
  - `hit`: the program compiled and every test in the round passed. Boss HP − 1. If HP is 0 the fight is won; otherwise the round is won and the player moves on with "Next round →".
  - `miss`: the program compiled but a test failed or no test ran. The player loses 1 whole heart (2 halves).
  - `fizzle`: the program did not compile. The player loses half a heart (1 half).
  - Playground network, HTTP and timeout errors are not outcomes: they cost nothing and the player retries.
- **Defeat:** when the hearts reach 0 the fight is lost. "Try again" restarts at round 1 with full HP, hearts and hints.
- **Stars on a win:** start at 3, minus one per **whole** heart lost (`floor(halvesLost / 2)`), minus one per hint used, minimum 1. Best stars are kept, as before.
- XP, badges, jump challenges and the `newlyOpened` celebrate note are unchanged.

## 3. Content model

```ts
interface BossRound {
  title: string;     // e.g. "The height rune"
  task: string;      // markdown, one or two sentences shown above the editor
  starter: string;   // complete program with fn main; must fail its tests
  tests: string;     // #[test] functions only
  solution: string;  // complete program with fn main; must pass
  hint: string;      // markdown
}
interface Boss { name: string; story: string; rounds: BossRound[] }
```

The old `starter`, `tests`, `solution` and `hints` boss fields are removed.

- **Island 1, The Immutable Golem:** four rounds from its four FIX ME lines: the constant's type, `mut`, shadowing, an initialised `let`.
- **Island 2, The Signature Sphinx:** its four riddles, one round each.
- **Island 3, The Fork Kraken:** `bigger`, `sign`, `is_lucky`, plus a new fourth tentacle `ship_speed`: an `if` used as a value in a `let`, whose branches end in stray semicolons (taught in the "if as an expression" stage).

Validation: 3 to 6 rounds; every round has a non-empty title, task, starter, solution and hint; tests contain `#[test]`; starter and solution contain `fn main`.

`verify:rust` checks every round: `{island}-boss-r{N}-starter` must fail and `{island}-boss-r{N}-solution` must pass.

## 4. Boss screen

- Top: back link, `⚔ {boss}`, story, jump notice if any, boss HP bar (`{boss}: x/n HP`), and the player's hearts as ❤️ / 💔 (half) / 🤍 (empty) with `role="img"` and `aria-label="Your lives: 2.5 of 3", under a visible bold label `Your lives: 2.5/3``.
- Round panel: heading `Round {i} of {n}: {title}`, the task, a code editor with only that round's starter, buttons **▶ Run**, **💡 Hint ({k} left)**, **Reset code**, the hint list (only this round's hint), and the console.
- Hint button is disabled with title "You've used this round's hint" or "No hints left" when it can't be used.
- Console headings:
  - hit (not last): "💥 Hit! {boss} loses 1 HP." plus a primary **Next round →** button; Run is disabled.
  - miss: "🛡 {boss} blocked your attack and hit back. You lose a heart." with the test output.
  - fizzle: "💨 Your attack fizzled: the code doesn't compile, and you lose half a heart. Read the compiler's message below." with the compiler output.
- Final hit: record the win and go to the celebrate screen (as before).
- Defeat: the round panel is replaced by "{boss} wins this time. You ran out of hearts." with **Try again** (restart) and a link back to the island.
- No mid-fight saving: leaving or reloading restarts the fight. `SaveData.bossCode` stays in the save format for old saves but is no longer written or read.
- Hints are available from the start (the old "run once first" gate is gone).

## 5. Testing

- `tests/fight.test.ts`: start values for 3 and 4 rounds; hit, miss, fizzle; win and loss; hint limits (one per round, total); `nextRound`; stars.
- `tests/bossFight.test.ts` (jsdom, `runCode` mocked): a hit advances to round 2; miss and fizzle hearts; a network error is free; losing and "Try again"; the hint shows only the current round's hint; winning every round records the boss and navigates to celebrate.
- Content and validation tests updated; `verify:rust` runs 12 boss checks.
- Manual: a real fight on the Playground in the browser.
