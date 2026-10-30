# PlayRusty — Design Spec

**Date:** 2026-10-30
**Status:** Approved design, pending implementation plan

## 1. Goal

PlayRusty is a free, open-source browser game that teaches Rust from zero, covering the
same concepts as [rustlings](https://github.com/rust-lang/rustlings) in an interactive,
playful way. It is hosted on GitHub Pages and needs no install and no account.

**Version 1 scope:** the complete game engine plus three fully written islands
(Variables, Functions, If). The remaining rustlings topics are added in later rounds as
content files only, with no engine changes.

### Non-goals for v1
- No backend, accounts, leaderboards or cloud saves
- No audio
- No translations (English only)
- No islands beyond the first three
- No drag-and-drop puzzle types

## 2. Player experience

### 2.1 First launch
A title screen asks the player to pick a learner mode:
- **"I'm new to programming"** (`beginner`)
- **"I already know another language"** (`experienced`)

The mode can be changed at any time in Settings. Changing it never removes earned progress.

### 2.2 World map
- An inline-SVG archipelago with one island per rustlings topic.
- Ferris the crab (public-domain mascot from rustacean.net) stands on the current island
  and walks along a dotted path when the player travels.
- Islands that are not yet available are shown greyed out with a lock. In v1, islands 4+
  appear as "coming soon" so players can see the whole journey.
- A HUD shows total XP, total stars and earned badges.

| # | Island name     | rustlings topic(s)   |
|---|-----------------|----------------------|
| 1 | Mutable Marsh   | 00_intro, 01_variables |
| 2 | Function Fjord  | 02_functions         |
| 3 | Branching Bay   | 03_if                |

### 2.3 Inside an island
An island screen lists its stages in order, then the boss. Each stage has two parts:

1. **Tutorial**: a sequence of short pages, one idea per page. A page has text (a small
   Markdown subset: paragraphs, `inline code`, **bold**, links) and an optional code
   example. Code examples have a **▶ Run it** button that opens them in an editable
   mini-editor and runs them on the real compiler (see §5).
2. **Puzzles**: 2–4 puzzles that practise exactly what the tutorial taught.

**Teaching rule:** no puzzle or boss may use a concept that hasn't been taught in an
earlier tutorial page. This is enforced by content review, not by code.

Island 1 starts with a short "Harbor" tutorial stage that teaches the game controls and
`println!` (covering rustlings `00_intro`).

### 2.4 Learner modes in content
Each tutorial page has an `audience`:
- `beginner`: general programming concepts (what a variable or a function is, how `if/else` works). Shown only in beginner mode.
- `all`: how the concept works in Rust. Always shown.
- `experienced`: "Coming from Python/JS/Java/C++" comparison notes. Shown only in experienced mode.

A stage can be flagged `beginnerOnly: true`. Experienced players don't see it, and it
doesn't count toward unlocking the boss.

### 2.5 Puzzle types (checked offline)

| Type      | Player sees | Correct when |
|-----------|-------------|--------------|
| `fillGap` | Code with one or more `___` gaps, each an inline text input | Every gap's trimmed input matches one of that gap's accepted answers (exact, case-sensitive) |
| `pickFix` | A prompt plus 2–4 code snippets | The player selects the one snippet marked `correct` |
| `predict` | A code snippet and a question ("What happens?") with 2–4 text choices, e.g. "Doesn't compile", "Prints 5" | The player selects the correct choice |
| `spotBug` | A code snippet with clickable lines | The player clicks the line marked as the bug (1-based line number) |

On a wrong answer the player sees that puzzle's `explanation` (or `hint` for `fillGap`)
and may try again. Every wrong attempt counts as a mistake. On a correct answer the
`explanation` is shown as a "Why?" note, then **Continue**.

### 2.6 Boss fights (real compiler)
- The player gets a code editor (CodeMirror 6 with Rust highlighting) containing broken
  starter code in the rustlings style: a `fn main()` plus functions to fix.
- A short story line frames the fight, e.g. "The Immutable Golem blocks the bridge!"
- **Run** sends the player's code with the hidden tests appended, in Playground test mode.
- **The boss's HP bar = number of hidden tests.** Each passing test removes one chunk.
  All tests passing defeats the boss.
- If the code doesn't compile, the boss takes no damage. The compiler output appears in a
  console panel, and error codes such as `E0384` link to
  `https://doc.rust-lang.org/error_codes/E0384.html`.
- Up to 3 hints unlock one at a time via a "Hint" button. Each hint is available only
  after at least one Run.
- **Reset code** restores the starter code.

### 2.7 Progression and rewards
- **Unlocking**:
  - Stages within an island unlock in order.
  - The boss unlocks when every stage visible in the current mode is complete.
  - The next island unlocks when the boss is defeated.
  - The first stage of island 1 is always unlocked.
- **XP**: 10 XP per puzzle solved and 50 XP per boss defeated. XP is awarded only the first
  time; replays never reduce or re-award XP.
- **Stage stars**:
  - 3 stars for zero mistakes
  - 2 stars for 1–2 mistakes
  - 1 star for 3 or more mistakes
- **Boss stars**:
  - 3 stars for zero hints
  - 2 stars for one hint
  - 1 star for two or more hints
- **Replays**: replaying keeps the best star count ever earned.
- **Badges**: one badge per island, awarded when its boss is defeated. A celebration
  screen shows the badge and the XP earned.

## 3. Architecture

**Stack:**
- Vite, TypeScript (strict) and plain DOM. No UI framework.
- CodeMirror 6 with `@codemirror/lang-rust`.
- Vitest for tests.

**Routing:** hash-based routes, which work on GitHub Pages without server configuration.
- `#/` is the title screen.
- `#/map` is the world map.
- `#/island/:islandId` is an island.
- `#/stage/:islandId/:stageId` is a stage.
- `#/boss/:islandId` is a boss fight.
- `#/settings` is the settings screen.

```
PlayRusty/
├─ index.html
├─ src/
│  ├─ main.ts                 bootstraps router + loads save
│  ├─ router.ts               hash router → screen render functions
│  ├─ engine/
│  │  ├─ types.ts             Island, Stage, TutorialPage, Puzzle, Boss, SaveData
│  │  ├─ progress.ts          unlock rules, star/XP calculation (pure functions)
│  │  └─ save.ts              load/save/migrate/reset localStorage save
│  ├─ puzzles/
│  │  ├─ index.ts             registry: puzzle type → module
│  │  ├─ fillGap.ts
│  │  ├─ pickFix.ts
│  │  ├─ predict.ts
│  │  └─ spotBug.ts
│  ├─ playground/
│  │  ├─ client.ts            execute(code, {tests}) → result, with timeout
│  │  └─ testOutput.ts        parse cargo test output → per-test pass/fail
│  ├─ ui/
│  │  ├─ screens/             title, map, island, stage, boss, settings, celebrate
│  │  ├─ components/          tutorialPage, codeEditor, console, hud, hpBar
│  │  └─ markdown.ts          tiny safe Markdown-subset → DOM renderer
│  ├─ content/
│  │  ├─ index.ts             ordered list of all islands (+ "coming soon" stubs)
│  │  └─ islands/
│  │     ├─ 01-variables.ts
│  │     ├─ 02-functions.ts
│  │     └─ 03-if.ts
│  └─ styles/
├─ scripts/
│  └─ verify-bosses.ts        CI: compile every boss with real cargo
├─ tests/                     Vitest unit tests
├─ .github/workflows/deploy.yml
├─ LICENSE                    MIT
└─ README.md                  includes credit to rustlings (MIT) and the Rust Playground
```

### 3.1 Unit boundaries
- **`engine/`** has no DOM access. `progress.ts` is pure functions over `(content, save, mode)`.
- **`puzzles/`**: each module exports a `PuzzleModule` with
  `render(puzzle, container, onAnswer)` and a pure `check(puzzle, answer) → boolean`.
  The stage screen uses only this interface.
- **`playground/`** knows nothing about the game. It takes a code string and returns a result.
- **`content/`** is pure typed data with no logic.
- **`ui/`** connects the other units together. It is the only layer that touches the DOM.

## 4. Content data model

```ts
type Audience = "beginner" | "all" | "experienced";

interface TutorialPage { audience: Audience; title: string; text: string; code?: string; runnable?: boolean }

type Puzzle =
  | { type: "fillGap"; id: string; prompt: string; code: string; answers: string[][]; hint: string; explanation: string }
  | { type: "pickFix"; id: string; prompt: string; options: { code: string; correct: boolean }[]; explanation: string }
  | { type: "predict"; id: string; prompt: string; code: string; choices: string[]; correctIndex: number; explanation: string }
  | { type: "spotBug"; id: string; prompt: string; code: string; bugLine: number; explanation: string };

interface Stage { id: string; title: string; beginnerOnly?: boolean; tutorial: TutorialPage[]; puzzles: Puzzle[] }

interface Boss {
  name: string;          // "The Immutable Golem"
  story: string;         // one or two sentences of framing
  starter: string;       // broken code shown to the player
  tests: string;         // body of the hidden test module: #[test] fns only
  solution: string;      // reference solution, used only by CI
  hints: string[];       // 1–3 hints
}

interface Island { id: string; number: number; name: string; topic: string; rustBook: string; stages: Stage[]; boss: Boss }
```

For `fillGap`, `answers[i]` lists the accepted strings for the i-th `___` in `code`.

The hidden tests are wrapped by code, not by content authors:

```rust
<player code>

#[cfg(test)]
mod boss_tests {
    use super::*;
    <boss.tests>
}
```

### Version 1 content targets
| Island | Stages | Puzzles | Boss |
|--------|--------|---------|------|
| Mutable Marsh | Harbor (intro/`println!`), let & mut, shadowing, constants, type annotations | ~14 | The Immutable Golem |
| Function Fjord | what a function is (`beginnerOnly`), parameters, return values & expressions vs statements, calling functions | ~12 | The Signature Sphinx |
| Branching Bay | if/else (`beginnerOnly` intro page), `if` as an expression, `else if` chains, comparisons with booleans | ~12 | The Fork Kraken |

## 5. Rust Playground integration

- **Endpoint:** `POST https://play.rust-lang.org/execute`. We verified on 2026-10-30 that it sends `access-control-allow-origin: *`.
- **Request body:**
  `{ channel: "stable", mode: "debug", edition: "2024", crateType: "bin", tests, code, backtrace: false }`.
  `tests` is `true` for bosses and `false` for tutorial "Run it".
- **Response:** `{ success, exitDetail, stdout, stderr }`.
- **Parsing test results:** `testOutput.ts` parses lines matching
  `test boss_tests::<name> ... ok|FAILED` from stdout, and returns
  `{ compiled: boolean, passed: string[], failed: string[] }`.
  `compiled` is false when stdout has no test lines and stderr contains `error[` or
  `error:` from compilation.
- **Timeout:** 20 seconds via `AbortController`.
- **Errors:**
  - On a network error, timeout or HTTP status other than 200, the console shows "The
    compiler bridge is down. Check your connection and try again", with a **Retry**
    button.
  - The game state is untouched. Puzzles and tutorials never depend on the network.
- **Usage limits:** code compiles only on an explicit click. The Run button is disabled
  while a request is in flight.

## 6. Save data

- **Storage:** `localStorage` key `playrusty.save`.

```ts
interface SaveData {
  version: 1;
  mode: "beginner" | "experienced" | null;   // null → show mode picker
  xp: number;
  stages: Record<string /* islandId/stageId */, { stars: 1 | 2 | 3 }>;
  bosses: Record<string /* islandId */, { stars: 1 | 2 | 3 }>;
  solvedPuzzles: string[];                    // "islandId/stageId/puzzleId", for XP-once
  bossCode: Record<string, string>;           // player's last boss code, restored on return
}
```

- **Saving:** the game saves after every state change.
- **Bad saves:** if `load()` finds an unparsable save or an unknown version, it copies the
  raw value to `playrusty.save.backup-<timestamp>` and starts fresh. `migrate()` exists
  as an extension point for future versions.
- **Reset:** Settings has a "Reset progress" button, guarded by a confirm dialog.
- **Unavailable storage:** if `localStorage` throws (private mode), the game runs with
  in-memory state and shows a small "progress won't be saved" notice.

## 7. Testing

- **Unit (Vitest):**
  - `progress.ts`: unlocks per mode, `beginnerOnly` handling, star thresholds, XP-once rule
  - `save.ts`: load/save, corrupt save → backup, unknown version, `localStorage` unavailable
  - each puzzle module's `check`
  - `testOutput.ts`, using real captured Playground outputs (all pass, some fail, compile error)
  - `markdown.ts`: subset rendering and HTML escaping
- **Content validator test:** runs on every island and checks that:
  - all ids are unique within their scope
  - `fillGap` `___` count = `answers.length`, and every gap has ≥1 answer
  - every `pickFix` has exactly one correct option
  - `predict.correctIndex` and `spotBug.bugLine` are in range
  - every boss has ≥1 `#[test]`, 1–3 hints and a non-empty solution
  - every stage has ≥1 tutorial page and ≥1 puzzle
  - the island has ≥1 stage visible in experienced mode
- **Boss verification (`scripts/verify-bosses.ts`):** for each boss, writes a temp cargo
  project (edition 2024) and runs `cargo test`. It asserts that **starter + tests fail**
  and **solution + tests pass**. It runs locally (`npm run verify:bosses`) and in CI.
- **Manual:** play through all three islands in both modes in the browser before release.

## 8. Deployment

- **Vite config:** `base: "/PlayRusty/"` for GitHub Pages.
- **`.github/workflows/deploy.yml`:** on push to `main`, it runs these steps:
  1. checkout
  2. setup Node and stable Rust
  3. `npm ci`
  4. `npm test`
  5. `npm run verify:bosses`
  6. `npm run build`
  7. upload the Pages artifact
  8. deploy with `actions/deploy-pages`
- Pull requests run steps 1–6 only.
- **License:** MIT. The README credits rustlings (MIT) as the curriculum source and the
  Rust Playground as the compiler, and includes a "How to add an island" guide for
  contributors.

## 9. Accessibility and layout

- Every action is reachable by keyboard, with visible focus rings.
- Puzzle feedback is conveyed by text, not colour alone.
- `prefers-reduced-motion` turns off Ferris's walk animation and the HP-bar animations.
- The layout targets desktop and tablet widths. On phones (<600px) the game is usable but
  the editor fills the full width.
