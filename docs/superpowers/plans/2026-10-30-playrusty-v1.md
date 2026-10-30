# PlayRusty v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PlayRusty v1. It is a browser game that teaches Rust the way rustlings does, through a world-map adventure. Version 1 has a complete engine plus three playable islands: Variables, Functions and If.

**Architecture:**
- It is a static site built with Vite and TypeScript: plain DOM, no UI framework.
- The `engine/` layer is pure logic: types, progress rules and the save store.
- `puzzles/` holds the four offline puzzle types. `playground/` talks to the official Rust Playground HTTP API to compile real Rust code.
- `content/` holds islands as typed data files.
- `ui/` renders the screens and is the only layer that touches the DOM, apart from the puzzle renderers.
- A Node script compiles every boss and every runnable example with real `cargo`, so broken exercises fail CI.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 4 with jsdom, CodeMirror 6 with `@codemirror/lang-rust`, tsx for scripts, Rust stable through cargo, GitHub Actions and GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-30-playrusty-design.md`

## Global Constraints

**Environment and tooling**
- Node ≥ 22 is required; v25.8 was used while planning. Rust stable with `cargo` must be on PATH.
- Dependency versions, exactly as pinned in Task 1:
  - `vite ^8.3.5`, `typescript ^7.0.2`, `vitest ^4.1.12`, `jsdom ^29.1.1`, `tsx ^4.23.15`, `@types/node ^26.6.6`
  - `codemirror ^6.0.2`, `@codemirror/lang-rust ^6.0.2`, `@codemirror/view ^6.43.15`, `@codemirror/commands ^6.11.1`
  - Add no other runtime dependencies.
- TypeScript is `strict`, and `npm run typecheck` (`tsc -p .`) must pass at the end of every task.
- Rust edition is **2024** everywhere: Playground requests, the verify script and Cargo.toml files.

**Deployment and URLs**
- The Vite `base` is `"/PlayRusty/"`, because the GitHub repository must be named `PlayRusty`. In dev, the app is served at `http://localhost:5173/PlayRusty/`.
- The Playground endpoint is `POST https://play.rust-lang.org/execute` with body `{ channel: "stable", mode: "debug", edition: "2024", crateType: "bin", tests, code, backtrace: false }`. The request times out after 20 000 ms.
- The save key is `playrusty.save`. A corrupt save is backed up to `playrusty.save.backup-<timestamp>`.
- Hash routes:
  - `#/`
  - `#/map`
  - `#/settings`
  - `#/island/:islandId`
  - `#/stage/:islandId/:stageId`
  - `#/boss/:islandId`
  - `#/celebrate/:islandId`

**Game rules**
- XP: 10 per puzzle and 50 per boss, awarded the first time only.
- Stage stars: 0 mistakes → 3, 1–2 mistakes → 2, 3 or more → 1.
- Boss stars: 0 hints → 3, 1 hint → 2, 2 or more → 1.
- Replays keep the best star count.
- Hidden boss tests are wrapped as `#[cfg(test)] mod boss_tests { use super::*; … }` and appended to the player's code.

**Content**
- Teaching rule: no puzzle or boss may use a concept that hasn't been taught on an earlier tutorial page.
- A `runnable: true` tutorial page holds a complete program with `fn main` that compiles and runs.

**Git**
- Every commit message ends with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The commit commands below pass it as a second `-m`.
- Work happens on `main` in the local repo. Nothing is pushed in this plan.

## File Map

```
index.html                         app shell (#app root)
package.json / tsconfig.json / vite.config.ts / .gitignore / LICENSE / README.md
src/main.ts                        bootstrap: save store → app context → router → screens
src/router.ts                      Route type, parseRoute, routeToHash, onRouteChange
src/engine/types.ts                all shared types (content + save)
src/engine/progress.ts             pure rules: visibility, unlocks, stars, XP, recording
src/engine/save.ts                 localStorage save store with backup/migrate/reset
src/content/helpers.ts             rs`` dedent tag, INTEGER_TYPES
src/content/validate.ts            content validator (used by tests)
src/content/index.ts               islands[] + coming-soon roadmap
src/content/islands/01-variables.ts / 02-functions.ts / 03-if.ts
src/playground/client.ts           runCode() → RunResult
src/playground/bossProgram.ts      buildBossProgram(), countTests()
src/playground/testOutput.ts       parseTestOutput() → TestReport
src/puzzles/{fillGap,pickFix,predict,spotBug}.ts   render + check per type
src/puzzles/index.ts               renderPuzzle() dispatcher
src/ui/dom.ts                      h() element helper
src/ui/markdown.ts                 renderMarkdown(), prose()
src/ui/app.ts                      AppContext, Cleanup, noop
src/ui/components/                 codeBlock, codeEditor, console, runner, hpBar, hud, ferris, badge, stars, tutorialPage
src/ui/screens/                    title, settings, mapLayout, map, island, stage, boss, celebrate
src/styles/main.css                all styles
scripts/rust-checks.ts             collectChecks(), crateName() (pure, tested)
scripts/verify-rust.ts             runs every check with real cargo
tests/                             Vitest tests (+ fixtures.ts)
.github/workflows/deploy.yml       CI + GitHub Pages deploy
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `LICENSE`, `src/main.ts`, `src/styles/main.css` (placeholder), `tests/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test`, `typecheck` and `verify:rust`. Vitest runs `tests/**/*.test.ts` in jsdom by default.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "playrusty",
  "version": "0.1.0",
  "private": true,
  "description": "Learn Rust by playing: a browser adventure based on rustlings.",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p . && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc -p .",
    "verify:rust": "tsx scripts/verify-rust.ts"
  },
  "dependencies": {
    "@codemirror/commands": "^6.11.1",
    "@codemirror/lang-rust": "^6.0.2",
    "@codemirror/view": "^6.43.15",
    "codemirror": "^6.0.2"
  },
  "devDependencies": {
    "@types/node": "^26.6.6",
    "jsdom": "^29.1.1",
    "tsx": "^4.23.15",
    "typescript": "^7.0.2",
    "vite": "^8.3.5",
    "vitest": "^4.1.12"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node", "vite/client"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src", "tests", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/PlayRusty/",
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `index.html`, `src/main.ts`, placeholder CSS, `.gitignore`, `LICENSE`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Learn Rust by playing: sail an archipelago of puzzles with Ferris the crab." />
    <title>PlayRusty</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` (temporary; Task 11 replaces it):
```ts
import "./styles/main.css";

const root = document.getElementById("app");
if (root) root.textContent = "PlayRusty is loading…";
```

`src/styles/main.css`:
```css
body { margin: 0; font-family: system-ui, sans-serif; }
```

`.gitignore`:
```
node_modules/
dist/
*.log
```

`LICENSE`:
```
MIT License

Copyright (c) 2026 PlayRusty contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Write a smoke test** in `tests/smoke.test.ts`

```ts
import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs in a DOM environment", () => {
    const div = document.createElement("div");
    div.textContent = "ahoy";
    expect(div.textContent).toBe("ahoy");
  });
});
```

- [ ] **Step 6: Install and verify**

Run: `npm install`, then `npm test`, then `npm run typecheck`, then `npm run build`
Expected:
- `npm test`: 1 test passes.
- `npm run typecheck`: no errors.
- `npm run build`: writes `dist/index.html`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore LICENSE src tests
git commit -m "chore: scaffold Vite + TypeScript + Vitest project" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Core types, content helpers and content validator

**Files:**
- Create: `src/engine/types.ts`, `src/content/helpers.ts`, `src/content/validate.ts`, `src/content/index.ts`, `tests/fixtures.ts`, `tests/helpers.test.ts`, `tests/validate.test.ts`, `tests/content.test.ts`

**Interfaces:**
- Produces types: `Mode`, `Audience`, `Stars`, `TutorialPage`, `FillGapPuzzle`, `PickFixPuzzle`, `PredictPuzzle`, `SpotBugPuzzle`, `Puzzle`, `Stage`, `Boss`, `Island`, `ComingSoonIsland` and `SaveData`.
- Produces content helpers:
  - `rs(strings, ...values): string`, a dedenting raw template tag
  - `INTEGER_TYPES: string[]`
- Produces validators:
  - `validateIslands(islands: Island[]): string[]`
  - `validateIsland(island: Island): string[]`
  - `validatePuzzle(p: Puzzle): string | null`
- Produces from `src/content/index.ts`: `islands: Island[]` and `comingSoon: ComingSoonIsland[]`
- Produces test fixtures in `tests/fixtures.ts`: `makeStage`, `makeIsland`, `emptySave`

- [ ] **Step 1: Create `src/engine/types.ts`**

```ts
export type Mode = "beginner" | "experienced";
export type Audience = "beginner" | "all" | "experienced";
export type Stars = 1 | 2 | 3;

export interface TutorialPage {
  audience: Audience;
  title: string;
  /** Markdown subset: paragraphs (blank line), `code`, **bold**, [text](https://url). */
  text: string;
  code?: string;
  /** When true, `code` is a complete program with `fn main` the player can run. */
  runnable?: boolean;
}

export interface FillGapPuzzle {
  type: "fillGap";
  id: string;
  prompt: string;
  /** Code containing one or more `___` gaps. */
  code: string;
  /** answers[i] lists the accepted strings for the i-th gap. */
  answers: string[][];
  hint: string;
  explanation: string;
}

export interface PickFixPuzzle {
  type: "pickFix";
  id: string;
  prompt: string;
  options: { code: string; correct: boolean }[];
  explanation: string;
}

export interface PredictPuzzle {
  type: "predict";
  id: string;
  prompt: string;
  code: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface SpotBugPuzzle {
  type: "spotBug";
  id: string;
  prompt: string;
  code: string;
  /** 1-based line number of the line the compiler rejects. */
  bugLine: number;
  explanation: string;
}

export type Puzzle = FillGapPuzzle | PickFixPuzzle | PredictPuzzle | SpotBugPuzzle;

export interface Stage {
  id: string;
  title: string;
  beginnerOnly?: boolean;
  tutorial: TutorialPage[];
  puzzles: Puzzle[];
}

export interface Boss {
  name: string;
  story: string;
  starter: string;
  /** Body of the hidden test module: #[test] functions only. */
  tests: string;
  /** Reference solution, used only by the verify script. */
  solution: string;
  hints: string[];
}

export interface Island {
  id: string;
  number: number;
  name: string;
  topic: string;
  rustBook: string;
  stages: Stage[];
  boss: Boss;
}

export interface ComingSoonIsland {
  number: number;
  name: string;
  topic: string;
}

export interface SaveData {
  version: 1;
  mode: Mode | null;
  xp: number;
  /** Keyed by "islandId/stageId". */
  stages: Record<string, { stars: Stars }>;
  /** Keyed by islandId. */
  bosses: Record<string, { stars: Stars }>;
  /** "islandId/stageId/puzzleId" entries, so XP is only awarded once. */
  solvedPuzzles: string[];
  /** Player's last boss code, keyed by islandId. */
  bossCode: Record<string, string>;
}
```

- [ ] **Step 2: Write failing tests for helpers** in `tests/helpers.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { INTEGER_TYPES, rs } from "../src/content/helpers";

describe("rs", () => {
  it("removes the common indentation and surrounding blank lines", () => {
    const code = rs`
      fn main() {
          println!("hi");
      }
    `;
    expect(code).toBe('fn main() {\n    println!("hi");\n}');
  });

  it("keeps backslash escapes as written (raw)", () => {
    expect(rs`println!("a\nb");`).toBe('println!("a\\nb");');
  });
});

describe("INTEGER_TYPES", () => {
  it("lists the signed and unsigned integer types", () => {
    expect(INTEGER_TYPES).toContain("i32");
    expect(INTEGER_TYPES).toContain("usize");
    expect(INTEGER_TYPES).toHaveLength(12);
  });
});
```

- [ ] **Step 3: Run to see it fail**

Run: `npx vitest run tests/helpers.test.ts`
Expected: FAIL, because the module `../src/content/helpers` can't be resolved.

- [ ] **Step 4: Implement `src/content/helpers.ts`**

```ts
/**
 * Template tag for Rust code in content files. Uses the raw string (so `\n` inside a
 * Rust string literal stays `\n`), strips the leading/trailing blank line and removes
 * the indentation shared by all non-empty lines.
 */
export function rs(strings: TemplateStringsArray, ...values: unknown[]): string {
  const lines = String.raw(strings, ...values)
    .replace(/^[ \t]*\n/, "")
    .replace(/\n[ \t]*$/, "")
    .split("\n");
  const indent = Math.min(
    ...lines.filter((line) => line.trim() !== "").map((line) => line.match(/^ */)?.[0].length ?? 0),
  );
  return lines.map((line) => line.slice(indent)).join("\n");
}

export const INTEGER_TYPES = [
  "i8", "i16", "i32", "i64", "i128", "isize",
  "u8", "u16", "u32", "u64", "u128", "usize",
];
```

- [ ] **Step 5: Run to see it pass**

Run: `npx vitest run tests/helpers.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Create test fixtures** in `tests/fixtures.ts`

```ts
import type { Island, Mode, SaveData, Stage } from "../src/engine/types";

export function makeStage(id: string, extra: Partial<Stage> = {}): Stage {
  return {
    id,
    title: `Stage ${id}`,
    tutorial: [{ audience: "all", title: "Page", text: "Text" }],
    puzzles: [
      { type: "predict", id: "p1", prompt: "?", code: "fn main() {}", choices: ["a", "b"], correctIndex: 0, explanation: "Because." },
    ],
    ...extra,
  };
}

export function makeIsland(id: string, stages: Stage[] = [makeStage("s1"), makeStage("s2")]): Island {
  return {
    id,
    number: 1,
    name: `Island ${id}`,
    topic: "Topic",
    rustBook: "https://doc.rust-lang.org/book/",
    stages,
    boss: {
      name: "Boss",
      story: "A story.",
      starter: "fn main() {}",
      tests: "#[test]\nfn t() {}",
      solution: "fn main() {}",
      hints: ["A hint."],
    },
  };
}

export function emptySave(mode: Mode | null = "beginner"): SaveData {
  return { version: 1, mode, xp: 0, stages: {}, bosses: {}, solvedPuzzles: [], bossCode: {} };
}
```

- [ ] **Step 7: Write failing validator tests** in `tests/validate.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { validateIsland, validateIslands, validatePuzzle } from "../src/content/validate";
import { makeIsland, makeStage } from "./fixtures";

describe("validatePuzzle", () => {
  it("accepts a fillGap whose answer lists match its gaps", () => {
    expect(validatePuzzle({ type: "fillGap", id: "g", prompt: "", code: "let ___ x = ___;", answers: [["mut"], ["1"]], hint: "", explanation: "" })).toBeNull();
  });

  it("rejects a fillGap with a gap/answer mismatch", () => {
    expect(validatePuzzle({ type: "fillGap", id: "g", prompt: "", code: "let ___ x = 1;", answers: [["mut"], ["x"]], hint: "", explanation: "" })).toMatch(/1 gaps but 2/);
  });

  it("rejects a fillGap with no gap", () => {
    expect(validatePuzzle({ type: "fillGap", id: "g", prompt: "", code: "let x = 1;", answers: [], hint: "", explanation: "" })).toMatch(/no ___ gap/);
  });

  it("rejects pickFix without exactly one correct option", () => {
    const options = [{ code: "a", correct: true }, { code: "b", correct: true }];
    expect(validatePuzzle({ type: "pickFix", id: "p", prompt: "", options, explanation: "" })).toMatch(/exactly one/);
  });

  it("rejects predict with correctIndex out of range", () => {
    expect(validatePuzzle({ type: "predict", id: "p", prompt: "", code: "", choices: ["a", "b"], correctIndex: 2, explanation: "" })).toMatch(/correctIndex/);
  });

  it("rejects spotBug with bugLine out of range", () => {
    expect(validatePuzzle({ type: "spotBug", id: "s", prompt: "", code: "a\nb", bugLine: 3, explanation: "" })).toMatch(/bugLine/);
  });
});

describe("validateIsland", () => {
  it("accepts a well-formed island", () => {
    expect(validateIsland(makeIsland("ok"))).toEqual([]);
  });

  it("reports duplicate stage ids", () => {
    const errors = validateIsland(makeIsland("dup", [makeStage("a"), makeStage("a")]));
    expect(errors.some((e) => e.includes("duplicate stage id"))).toBe(true);
  });

  it("requires a stage visible in experienced mode", () => {
    const errors = validateIsland(makeIsland("x", [makeStage("a", { beginnerOnly: true })]));
    expect(errors.some((e) => e.includes("experienced mode"))).toBe(true);
  });

  it("requires a tutorial page visible to experienced players on normal stages", () => {
    const stage = makeStage("a", { tutorial: [{ audience: "beginner", title: "t", text: "t" }] });
    expect(validateIsland(makeIsland("x", [stage])).some((e) => e.includes("no tutorial page visible in experienced"))).toBe(true);
  });

  it("requires runnable pages to contain fn main", () => {
    const stage = makeStage("a", { tutorial: [{ audience: "all", title: "t", text: "t", code: "let x = 1;", runnable: true }] });
    expect(validateIsland(makeIsland("x", [stage])).some((e) => e.includes("runnable"))).toBe(true);
  });

  it("checks the boss", () => {
    const island = makeIsland("x");
    island.boss = { ...island.boss, tests: "fn nope() {}", hints: [] };
    const errors = validateIsland(island);
    expect(errors.some((e) => e.includes("#[test]"))).toBe(true);
    expect(errors.some((e) => e.includes("hints"))).toBe(true);
  });
});

describe("validateIslands", () => {
  it("reports duplicate island ids", () => {
    expect(validateIslands([makeIsland("a"), makeIsland("a")])).toContain('duplicate island id "a"');
  });
});
```

- [ ] **Step 8: Run to see it fail**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL, because the module `../src/content/validate` can't be resolved.

- [ ] **Step 9: Implement `src/content/validate.ts`**

```ts
import type { Island, Mode, Puzzle, Stage } from "../engine/types";

export function validateIslands(islands: Island[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const island of islands) {
    if (seen.has(island.id)) errors.push(`duplicate island id "${island.id}"`);
    seen.add(island.id);
    errors.push(...validateIsland(island));
  }
  return errors;
}

export function validateIsland(island: Island): string[] {
  const errors: string[] = [];
  const report = (path: string, message: string) => errors.push(`${island.id}${path}: ${message}`);

  if (island.stages.length === 0) report("", "has no stages");
  if (!island.stages.some((stage) => !stage.beginnerOnly)) report("", "has no stage visible in experienced mode");

  const stageIds = new Set<string>();
  for (const stage of island.stages) {
    if (stageIds.has(stage.id)) report(`/${stage.id}`, "duplicate stage id");
    stageIds.add(stage.id);
    validateStage(stage, (message) => report(`/${stage.id}`, message));
  }

  const boss = island.boss;
  if (!boss.starter.trim()) report("/boss", "starter is empty");
  if (!boss.solution.trim()) report("/boss", "solution is empty");
  if (!boss.tests.includes("#[test]")) report("/boss", "tests contain no #[test]");
  if (boss.hints.length < 1 || boss.hints.length > 3) report("/boss", "needs 1-3 hints");
  return errors;
}

function validateStage(stage: Stage, report: (message: string) => void): void {
  if (stage.tutorial.length === 0) report("has no tutorial pages");
  if (stage.puzzles.length === 0) report("has no puzzles");

  const hasPageFor = (mode: Mode) => stage.tutorial.some((page) => page.audience === "all" || page.audience === mode);
  if (!hasPageFor("beginner")) report("has no tutorial page visible in beginner mode");
  if (!stage.beginnerOnly && !hasPageFor("experienced")) report("has no tutorial page visible in experienced mode");

  stage.tutorial.forEach((page, index) => {
    if (page.runnable && !page.code?.includes("fn main")) report(`tutorial page ${index + 1} is runnable but has no fn main`);
  });

  const puzzleIds = new Set<string>();
  for (const puzzle of stage.puzzles) {
    if (puzzleIds.has(puzzle.id)) report(`duplicate puzzle id "${puzzle.id}"`);
    puzzleIds.add(puzzle.id);
    const problem = validatePuzzle(puzzle);
    if (problem) report(`puzzle "${puzzle.id}": ${problem}`);
  }
}

export function validatePuzzle(puzzle: Puzzle): string | null {
  switch (puzzle.type) {
    case "fillGap": {
      const gaps = puzzle.code.split("___").length - 1;
      if (gaps === 0) return "code has no ___ gap";
      if (gaps !== puzzle.answers.length) return `has ${gaps} gaps but ${puzzle.answers.length} answer lists`;
      if (puzzle.answers.some((accepted) => accepted.length === 0)) return "a gap has no accepted answers";
      return null;
    }
    case "pickFix": {
      if (puzzle.options.length < 2 || puzzle.options.length > 4) return "needs 2-4 options";
      if (puzzle.options.filter((option) => option.correct).length !== 1) return "needs exactly one correct option";
      return null;
    }
    case "predict": {
      if (puzzle.choices.length < 2 || puzzle.choices.length > 4) return "needs 2-4 choices";
      const inRange = Number.isInteger(puzzle.correctIndex) && puzzle.correctIndex >= 0 && puzzle.correctIndex < puzzle.choices.length;
      return inRange ? null : "correctIndex out of range";
    }
    case "spotBug": {
      const lines = puzzle.code.split("\n").length;
      const inRange = Number.isInteger(puzzle.bugLine) && puzzle.bugLine >= 1 && puzzle.bugLine <= lines;
      return inRange ? null : "bugLine out of range";
    }
  }
}
```

- [ ] **Step 10: Run to see it pass**

Run: `npx vitest run tests/validate.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 11: Create `src/content/index.ts`** (no islands yet) **and the content test**

`src/content/index.ts`:
```ts
import type { ComingSoonIsland, Island } from "../engine/types";

export const islands: Island[] = [];

/** The whole journey, one island per rustlings topic. Playable islands are filtered out below. */
const ROADMAP: ComingSoonIsland[] = [
  { number: 1, name: "Mutable Marsh", topic: "Variables" },
  { number: 2, name: "Function Fjord", topic: "Functions" },
  { number: 3, name: "Branching Bay", topic: "If" },
  { number: 4, name: "Primitive Peaks", topic: "Primitive types" },
  { number: 5, name: "Vector Volcano", topic: "Vectors" },
  { number: 6, name: "Ownership Outpost", topic: "Move semantics" },
  { number: 7, name: "Struct Strand", topic: "Structs" },
  { number: 8, name: "Enum Atoll", topic: "Enums" },
  { number: 9, name: "String Shoals", topic: "Strings" },
  { number: 10, name: "Module Mesa", topic: "Modules" },
  { number: 11, name: "HashMap Highlands", topic: "Hash maps" },
  { number: 12, name: "Option Oasis", topic: "Options" },
  { number: 13, name: "Error Estuary", topic: "Error handling" },
  { number: 14, name: "Generic Glacier", topic: "Generics" },
  { number: 15, name: "Trait Tundra", topic: "Traits" },
  { number: 16, name: "Lifetime Lagoon", topic: "Lifetimes" },
  { number: 17, name: "Test Tower", topic: "Tests" },
  { number: 18, name: "Iterator Isles", topic: "Iterators" },
  { number: 19, name: "Pointer Peninsula", topic: "Smart pointers" },
  { number: 20, name: "Thread Thicket", topic: "Threads" },
  { number: 21, name: "Macro Mountains", topic: "Macros" },
  { number: 22, name: "Clippy Cliffs", topic: "Clippy" },
  { number: 23, name: "Conversion Cove", topic: "Conversions" },
];

export const comingSoon: ComingSoonIsland[] = ROADMAP.filter(
  (entry) => !islands.some((island) => island.number === entry.number),
);
```

`tests/content.test.ts`:
```ts
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
```

- [ ] **Step 12: Run all tests and typecheck**

Run: `npm test`, then `npm run typecheck`
Expected: every test passes and typecheck reports no errors.

- [ ] **Step 13: Commit**

```bash
git add src tests
git commit -m "feat: add core types, content helpers and validator" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Progress rules

**Files:**
- Create: `src/engine/progress.ts`, `tests/progress.test.ts`

**Interfaces:**
- Consumes: the types from Task 2, and the fixtures `makeIsland`, `makeStage` and `emptySave`.
- Produces:
  - Constants: `XP_PER_PUZZLE = 10` and `XP_PER_BOSS = 50`
  - Keys and visibility:
    - `stageKey(islandId, stageId): string`
    - `puzzleKey(islandId, stageId, puzzleId): string`
    - `modeOf(save): Mode`
    - `visibleStages(island, mode): Stage[]`
    - `visiblePages(stage, mode): TutorialPage[]`
  - Completion and unlocking:
    - `isStageComplete(save, islandId, stageId): boolean`
    - `isBossDefeated(save, islandId): boolean`
    - `isIslandUnlocked(islands, islandId, save): boolean`
    - `isStageUnlocked(islands, islandId, stageId, save): boolean`
    - `isBossUnlocked(islands, islandId, save): boolean`
    - `currentIslandId(islands, save): string | null`
  - Scoring:
    - `starsForMistakes(mistakes): Stars`
    - `starsForHints(hints): Stars`
    - `totalStars(save): number`
  - Recording (pure; each returns a new `SaveData`):
    - `recordPuzzleSolved(save, islandId, stageId, puzzleId): SaveData`
    - `recordStageComplete(save, islandId, stageId, mistakes): SaveData`
    - `recordBossDefeated(save, islandId, hintsUsed): SaveData`

- [ ] **Step 1: Write failing tests** in `tests/progress.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  XP_PER_BOSS, XP_PER_PUZZLE, currentIslandId, isBossUnlocked, isIslandUnlocked, isStageUnlocked,
  recordBossDefeated, recordPuzzleSolved, recordStageComplete, starsForHints, starsForMistakes,
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
    expect(isIslandUnlocked(islands, "b", recordBossDefeated(save, "a", 0))).toBe(true);
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

  it("unlocks the boss when every visible stage is complete", () => {
    let save = emptySave("experienced");
    expect(isBossUnlocked(islands, "a", save)).toBe(false);
    save = recordStageComplete(save, "a", "s1", 0);
    save = recordStageComplete(save, "a", "s2", 0);
    expect(isBossUnlocked(islands, "a", save)).toBe(true);
    expect(isBossUnlocked(islands, "a", { ...save, mode: "beginner" })).toBe(false);
  });

  it("finds the island Ferris should stand on", () => {
    const save = emptySave();
    expect(currentIslandId(islands, save)).toBe("a");
    const afterA = recordBossDefeated(save, "a", 0);
    expect(currentIslandId(islands, afterA)).toBe("b");
    expect(currentIslandId(islands, recordBossDefeated(afterA, "b", 0))).toBe("b");
    expect(currentIslandId([], save)).toBeNull();
  });
});

describe("scoring", () => {
  it("turns mistakes into stars", () => {
    expect([0, 1, 2, 3, 9].map(starsForMistakes)).toEqual([3, 2, 2, 1, 1]);
  });

  it("turns hints into stars", () => {
    expect([0, 1, 2, 3].map(starsForHints)).toEqual([3, 2, 1, 1]);
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
    let save = recordBossDefeated(emptySave(), "a", 2);
    expect(save.xp).toBe(XP_PER_BOSS);
    expect(save.bosses.a.stars).toBe(1);
    save = recordBossDefeated(save, "a", 0);
    expect(save.xp).toBe(XP_PER_BOSS);
    expect(save.bosses.a.stars).toBe(3);
  });

  it("sums stage and boss stars", () => {
    let save = recordStageComplete(emptySave(), "a", "s1", 0);
    save = recordBossDefeated(save, "a", 1);
    expect(totalStars(save)).toBe(5);
  });

  it("never mutates the save it is given", () => {
    const save = emptySave();
    recordPuzzleSolved(save, "a", "s1", "p1");
    recordStageComplete(save, "a", "s1", 0);
    recordBossDefeated(save, "a", 0);
    expect(save).toEqual(emptySave());
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL, because the module `../src/engine/progress` can't be resolved.

- [ ] **Step 3: Implement `src/engine/progress.ts`**

```ts
import type { Island, Mode, SaveData, Stage, Stars, TutorialPage } from "./types";

export const XP_PER_PUZZLE = 10;
export const XP_PER_BOSS = 50;

export const stageKey = (islandId: string, stageId: string): string => `${islandId}/${stageId}`;
export const puzzleKey = (islandId: string, stageId: string, puzzleId: string): string =>
  `${islandId}/${stageId}/${puzzleId}`;

export function modeOf(save: SaveData): Mode {
  return save.mode ?? "beginner";
}

export function visibleStages(island: Island, mode: Mode): Stage[] {
  return mode === "experienced" ? island.stages.filter((stage) => !stage.beginnerOnly) : island.stages;
}

export function visiblePages(stage: Stage, mode: Mode): TutorialPage[] {
  return stage.tutorial.filter((page) => page.audience === "all" || page.audience === mode);
}

export function isStageComplete(save: SaveData, islandId: string, stageId: string): boolean {
  return stageKey(islandId, stageId) in save.stages;
}

export function isBossDefeated(save: SaveData, islandId: string): boolean {
  return islandId in save.bosses;
}

export function isIslandUnlocked(islands: Island[], islandId: string, save: SaveData): boolean {
  const index = islands.findIndex((island) => island.id === islandId);
  if (index < 0) return false;
  if (index === 0) return true;
  return isBossDefeated(save, islands[index - 1].id);
}

export function isStageUnlocked(islands: Island[], islandId: string, stageId: string, save: SaveData): boolean {
  const island = islands.find((i) => i.id === islandId);
  if (!island || !isIslandUnlocked(islands, islandId, save)) return false;
  if (isStageComplete(save, islandId, stageId)) return true;
  const stages = visibleStages(island, modeOf(save));
  const index = stages.findIndex((stage) => stage.id === stageId);
  if (index < 0) return false;
  return stages.slice(0, index).every((stage) => isStageComplete(save, islandId, stage.id));
}

export function isBossUnlocked(islands: Island[], islandId: string, save: SaveData): boolean {
  const island = islands.find((i) => i.id === islandId);
  if (!island || !isIslandUnlocked(islands, islandId, save)) return false;
  if (isBossDefeated(save, islandId)) return true;
  return visibleStages(island, modeOf(save)).every((stage) => isStageComplete(save, islandId, stage.id));
}

/** The island Ferris stands on: the first unlocked, undefeated island, else the last one. */
export function currentIslandId(islands: Island[], save: SaveData): string | null {
  const next = islands.find((island) => isIslandUnlocked(islands, island.id, save) && !isBossDefeated(save, island.id));
  return next?.id ?? islands.at(-1)?.id ?? null;
}

export function starsForMistakes(mistakes: number): Stars {
  if (mistakes === 0) return 3;
  return mistakes <= 2 ? 2 : 1;
}

export function starsForHints(hints: number): Stars {
  if (hints === 0) return 3;
  return hints === 1 ? 2 : 1;
}

function bestStars(previous: Stars | undefined, next: Stars): Stars {
  return previous !== undefined && previous > next ? previous : next;
}

export function recordPuzzleSolved(save: SaveData, islandId: string, stageId: string, puzzleId: string): SaveData {
  const key = puzzleKey(islandId, stageId, puzzleId);
  if (save.solvedPuzzles.includes(key)) return save;
  return { ...save, xp: save.xp + XP_PER_PUZZLE, solvedPuzzles: [...save.solvedPuzzles, key] };
}

export function recordStageComplete(save: SaveData, islandId: string, stageId: string, mistakes: number): SaveData {
  const key = stageKey(islandId, stageId);
  const stars = bestStars(save.stages[key]?.stars, starsForMistakes(mistakes));
  return { ...save, stages: { ...save.stages, [key]: { stars } } };
}

export function recordBossDefeated(save: SaveData, islandId: string, hintsUsed: number): SaveData {
  const previous = save.bosses[islandId]?.stars;
  const stars = bestStars(previous, starsForHints(hintsUsed));
  return {
    ...save,
    xp: previous === undefined ? save.xp + XP_PER_BOSS : save.xp,
    bosses: { ...save.bosses, [islandId]: { stars } },
  };
}

export function totalStars(save: SaveData): number {
  const sum = (records: Record<string, { stars: Stars }>) =>
    Object.values(records).reduce((total, record) => total + record.stars, 0);
  return sum(save.stages) + sum(save.bosses);
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run tests/progress.test.ts`, then `npm run typecheck`
Expected: PASS (15 tests) and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/progress.ts tests/progress.test.ts
git commit -m "feat: add progress rules (unlocks, stars, XP)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Save store

**Files:**
- Create: `src/engine/save.ts`, `tests/save.test.ts`

**Interfaces:**
- Consumes: `SaveData` from Task 2.
- Produces:
  - `SAVE_KEY = "playrusty.save"`
  - `newSave(): SaveData`
  - `migrate(data: unknown): SaveData | null`
  - `interface SaveStore { readonly persistent: boolean; load(): SaveData; write(data: SaveData): void; reset(): SaveData }`
  - `createSaveStore(storage: Storage | null, now?: () => number): SaveStore`
  - `getBrowserStorage(): Storage | null`

- [ ] **Step 1: Write failing tests** in `tests/save.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { SAVE_KEY, createSaveStore, migrate, newSave } from "../src/engine/save";

beforeEach(() => localStorage.clear());

describe("migrate", () => {
  it("accepts a valid version 1 save", () => {
    const save = { ...newSave(), mode: "beginner", xp: 30 };
    expect(migrate(save)).toEqual(save);
  });

  it("rejects unknown versions and broken shapes", () => {
    expect(migrate({ ...newSave(), version: 99 })).toBeNull();
    expect(migrate({ ...newSave(), xp: "lots" })).toBeNull();
    expect(migrate({ ...newSave(), mode: "wizard" })).toBeNull();
    expect(migrate(null)).toBeNull();
    expect(migrate([])).toBeNull();
  });
});

describe("createSaveStore with localStorage", () => {
  it("starts with a fresh save", () => {
    expect(createSaveStore(localStorage).load()).toEqual(newSave());
  });

  it("round-trips a save", () => {
    const store = createSaveStore(localStorage);
    const save = { ...newSave(), mode: "experienced" as const, xp: 120 };
    store.write(save);
    expect(createSaveStore(localStorage).load()).toEqual(save);
  });

  it("backs up a corrupt save and starts fresh", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    const save = createSaveStore(localStorage, () => 123).load();
    expect(save).toEqual(newSave());
    expect(localStorage.getItem(`${SAVE_KEY}.backup-123`)).toBe("{not json");
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("backs up a save from an unknown version", () => {
    const raw = JSON.stringify({ version: 7 });
    localStorage.setItem(SAVE_KEY, raw);
    createSaveStore(localStorage, () => 5).load();
    expect(localStorage.getItem(`${SAVE_KEY}.backup-5`)).toBe(raw);
  });

  it("reset clears the stored save", () => {
    const store = createSaveStore(localStorage);
    store.write({ ...newSave(), xp: 10 });
    expect(store.reset()).toEqual(newSave());
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});

describe("createSaveStore without storage", () => {
  it("keeps the save in memory and reports it is not persistent", () => {
    const store = createSaveStore(null);
    expect(store.persistent).toBe(false);
    store.write({ ...newSave(), xp: 40 });
    expect(store.load().xp).toBe(40);
    expect(store.reset()).toEqual(newSave());
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/save.test.ts`
Expected: FAIL, because the module `../src/engine/save` can't be resolved.

- [ ] **Step 3: Implement `src/engine/save.ts`**

```ts
import type { SaveData } from "./types";

export const SAVE_KEY = "playrusty.save";

export function newSave(): SaveData {
  return { version: 1, mode: null, xp: 0, stages: {}, bosses: {}, solvedPuzzles: [], bossCode: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns a valid current-version save, or null when the data can't be understood. */
export function migrate(data: unknown): SaveData | null {
  if (!isRecord(data) || data.version !== 1) return null;
  const modeOk = data.mode === null || data.mode === "beginner" || data.mode === "experienced";
  const shapeOk =
    typeof data.xp === "number" &&
    isRecord(data.stages) &&
    isRecord(data.bosses) &&
    Array.isArray(data.solvedPuzzles) &&
    isRecord(data.bossCode);
  return modeOk && shapeOk ? (data as unknown as SaveData) : null;
}

export interface SaveStore {
  readonly persistent: boolean;
  load(): SaveData;
  write(data: SaveData): void;
  reset(): SaveData;
}

export function createSaveStore(storage: Storage | null, now: () => number = Date.now): SaveStore {
  if (!storage) {
    let memory = newSave();
    return {
      persistent: false,
      load: () => memory,
      write: (data) => {
        memory = data;
      },
      reset: () => (memory = newSave()),
    };
  }

  return {
    persistent: true,
    load() {
      const raw = storage.getItem(SAVE_KEY);
      if (raw === null) return newSave();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      const save = migrate(parsed);
      if (save) return save;
      storage.setItem(`${SAVE_KEY}.backup-${now()}`, raw);
      storage.removeItem(SAVE_KEY);
      return newSave();
    },
    write(data) {
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        // Storage full or blocked mid-session: keep playing; the next write may succeed.
      }
    },
    reset() {
      storage.removeItem(SAVE_KEY);
      return newSave();
    },
  };
}

/** localStorage if it works (it throws in some private modes), otherwise null. */
export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = "playrusty.probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run tests/save.test.ts`, then `npm run typecheck`
Expected: PASS (8 tests) and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/save.ts tests/save.test.ts
git commit -m "feat: add localStorage save store with backup and reset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Rust Playground client, boss program builder and test-output parser

**Files:**
- Create: `src/playground/client.ts`, `src/playground/bossProgram.ts`, `src/playground/testOutput.ts`, `tests/client.test.ts`, `tests/bossProgram.test.ts`, `tests/testOutput.test.ts`

**Interfaces:**
- Produces from `src/playground/client.ts`:
  - `PLAYGROUND_URL`
  - `BRIDGE_DOWN_MESSAGE`
  - `type RunResult = { ok: true; success: boolean; stdout: string; stderr: string } | { ok: false; reason: "network" | "timeout" | "http"; message: string }`
  - `runCode(code: string, options: { tests: boolean; timeoutMs?: number; fetchFn?: typeof fetch }): Promise<RunResult>`
- Produces from `src/playground/bossProgram.ts`:
  - `buildBossProgram(playerCode: string, tests: string): string`
  - `countTests(tests: string): number`
- Produces from `src/playground/testOutput.ts`:
  - `interface TestReport { compiled: boolean; passed: string[]; failed: string[] }`
  - `parseTestOutput(stdout: string, stderr: string): TestReport`. Names are reported without the `boss_tests::` prefix, and only `boss_tests` tests are counted.

- [ ] **Step 1: Write failing tests**

`tests/bossProgram.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildBossProgram, countTests } from "../src/playground/bossProgram";

describe("buildBossProgram", () => {
  it("appends the tests inside an indented boss_tests module", () => {
    const program = buildBossProgram("fn one() -> i32 { 1 }\n", "#[test]\nfn works() {\n    assert_eq!(one(), 1);\n}");
    expect(program).toBe(
      "fn one() -> i32 { 1 }\n\n#[cfg(test)]\nmod boss_tests {\n    use super::*;\n\n" +
        "    #[test]\n    fn works() {\n        assert_eq!(one(), 1);\n    }\n}\n",
    );
  });

  it("keeps blank lines between tests unindented", () => {
    expect(buildBossProgram("", "#[test]\nfn a() {}\n\n#[test]\nfn b() {}")).toContain("fn a() {}\n\n    #[test]");
  });
});

describe("countTests", () => {
  it("counts #[test] attributes", () => {
    expect(countTests("#[test]\nfn a() {}\n#[test]\nfn b() {}")).toBe(2);
    expect(countTests("fn helper() {}")).toBe(0);
  });
});
```

`tests/testOutput.test.ts` (fixtures are real Playground output captured on 2026-10-30):
```ts
import { describe, expect, it } from "vitest";
import { parseTestOutput } from "../src/playground/testOutput";

const ALL_PASS_STDOUT =
  "\nrunning 2 tests\ntest boss_tests::adds ... ok\ntest boss_tests::adds_neg ... ok\n\n" +
  "test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n";

const ONE_FAIL_STDOUT =
  "\nrunning 2 tests\ntest boss_tests::adds ... ok\ntest boss_tests::adds_neg ... FAILED\n\nfailures:\n\n" +
  "---- boss_tests::adds_neg stdout ----\n\nthread 'boss_tests::adds_neg' (43) panicked at src/main.rs:10:21:\n" +
  "assertion `left == right` failed\n  left: -5\n right: 1\n\n\nfailures:\n    boss_tests::adds_neg\n\n" +
  "test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n";

const COMPILE_ERROR_STDERR =
  "   Compiling playground v0.0.1 (/playground)\nerror[E0425]: cannot find value `c` in this scope\n" +
  " --> src/main.rs:1:37\n\nFor more information about this error, try `rustc --explain E0425`.\n" +
  'error: could not compile `playground` (bin "playground" test) due to 1 previous error\n';

describe("parseTestOutput", () => {
  it("reports all tests passing", () => {
    expect(parseTestOutput(ALL_PASS_STDOUT, "")).toEqual({ compiled: true, passed: ["adds", "adds_neg"], failed: [] });
  });

  it("reports failing tests", () => {
    expect(parseTestOutput(ONE_FAIL_STDOUT, "error: test failed, to rerun pass `--bin playground`\n")).toEqual({
      compiled: true,
      passed: ["adds"],
      failed: ["adds_neg"],
    });
  });

  it("reports a compile error", () => {
    expect(parseTestOutput("", COMPILE_ERROR_STDERR)).toEqual({ compiled: false, passed: [], failed: [] });
  });

  it("ignores tests outside boss_tests", () => {
    const stdout = "test my_own_test ... ok\ntest boss_tests::real ... ok\n";
    expect(parseTestOutput(stdout, "").passed).toEqual(["real"]);
  });
});
```

`tests/client.test.ts`:
```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BRIDGE_DOWN_MESSAGE, PLAYGROUND_URL, runCode } from "../src/playground/client";

describe("runCode", () => {
  it("posts the expected request and returns the output", async () => {
    let url = "";
    let init: RequestInit | undefined;
    const fetchFn = (async (input: RequestInfo | URL, options?: RequestInit) => {
      url = String(input);
      init = options;
      return new Response(JSON.stringify({ success: true, exitDetail: "", stdout: "hi\n", stderr: "" }));
    }) as typeof fetch;

    const result = await runCode("fn main() {}", { tests: true, fetchFn });

    expect(url).toBe(PLAYGROUND_URL);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      channel: "stable", mode: "debug", edition: "2024", crateType: "bin",
      tests: true, code: "fn main() {}", backtrace: false,
    });
    expect(result).toEqual({ ok: true, success: true, stdout: "hi\n", stderr: "" });
  });

  it("reports HTTP errors", async () => {
    const fetchFn = (async () => new Response("busy", { status: 503 })) as typeof fetch;
    expect(await runCode("", { tests: false, fetchFn })).toEqual({ ok: false, reason: "http", message: BRIDGE_DOWN_MESSAGE });
  });

  it("reports network errors", async () => {
    const fetchFn = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    expect(await runCode("", { tests: false, fetchFn })).toEqual({ ok: false, reason: "network", message: BRIDGE_DOWN_MESSAGE });
  });

  it("times out", async () => {
    const fetchFn = ((_input: RequestInfo | URL, options?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })) as typeof fetch;
    const result = await runCode("", { tests: false, fetchFn, timeoutMs: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/bossProgram.test.ts tests/testOutput.test.ts tests/client.test.ts`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement the three modules**

`src/playground/bossProgram.ts`:
```ts
/** Appends the hidden boss tests to the player's code, inside `mod boss_tests`. */
export function buildBossProgram(playerCode: string, tests: string): string {
  const body = tests
    .trim()
    .split("\n")
    .map((line) => (line.length > 0 ? `    ${line}` : line))
    .join("\n");
  return `${playerCode.trimEnd()}\n\n#[cfg(test)]\nmod boss_tests {\n    use super::*;\n\n${body}\n}\n`;
}

export function countTests(tests: string): number {
  return (tests.match(/#\[test\]/g) ?? []).length;
}
```

Note: when `playerCode` is empty, `"".trimEnd()` gives `""`, so the program starts with `\n\n#[cfg(test)]`. This is fine.

`src/playground/testOutput.ts`:
```ts
export interface TestReport {
  compiled: boolean;
  passed: string[];
  failed: string[];
}

const TEST_LINE = /^test boss_tests::(\S+) \.\.\. (ok|FAILED)$/gm;

export function parseTestOutput(stdout: string, stderr: string): TestReport {
  const passed: string[] = [];
  const failed: string[] = [];
  for (const match of stdout.matchAll(TEST_LINE)) {
    (match[2] === "ok" ? passed : failed).push(match[1]);
  }
  const ranTests = passed.length + failed.length > 0;
  const compileFailed = /could not compile|error\[E\d+\]/.test(stderr);
  return { compiled: ranTests || !compileFailed, passed, failed };
}
```

`src/playground/client.ts`:
```ts
export const PLAYGROUND_URL = "https://play.rust-lang.org/execute";
export const BRIDGE_DOWN_MESSAGE = "The compiler bridge is down. Check your connection and try again.";
const TIMEOUT_MESSAGE = "The compiler took too long to answer. Try again in a moment.";

export type RunResult =
  | { ok: true; success: boolean; stdout: string; stderr: string }
  | { ok: false; reason: "network" | "timeout" | "http"; message: string };

export interface RunOptions {
  tests: boolean;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

interface PlaygroundResponse {
  success?: boolean;
  stdout?: string;
  stderr?: string;
}

export async function runCode(code: string, options: RunOptions): Promise<RunResult> {
  const { tests, timeoutMs = 20_000 } = options;
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(PLAYGROUND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "stable", mode: "debug", edition: "2024", crateType: "bin", tests, code, backtrace: false }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "http", message: BRIDGE_DOWN_MESSAGE };
    const data = (await response.json()) as PlaygroundResponse;
    return { ok: true, success: data.success === true, stdout: data.stdout ?? "", stderr: data.stderr ?? "" };
  } catch {
    if (controller.signal.aborted) return { ok: false, reason: "timeout", message: TIMEOUT_MESSAGE };
    return { ok: false, reason: "network", message: BRIDGE_DOWN_MESSAGE };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run tests/bossProgram.test.ts tests/testOutput.test.ts tests/client.test.ts`, then `npm run typecheck`
Expected: PASS (11 tests) and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/playground tests/bossProgram.test.ts tests/testOutput.test.ts tests/client.test.ts
git commit -m "feat: add Rust Playground client and boss test parsing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Rust verification script

Every boss is checked with real `cargo test`: its starter must **fail** and its solution must **pass**. Every `runnable` tutorial example must pass `cargo run`.

**Important:** each check gets a **unique package name**. Planning found that projects sharing one `CARGO_TARGET_DIR` under the same package name silently reuse a stale binary, which makes failing code "pass".

**Files:**
- Create: `scripts/rust-checks.ts`, `scripts/verify-rust.ts`, `tests/rust-checks.test.ts`

**Interfaces:**
- Consumes: `Island` (Task 2), `buildBossProgram` (Task 5) and `islands` (Task 2).
- Produces:
  - `interface RustCheck { name: string; kind: "test" | "run"; code: string; expect: "pass" | "fail" }`
  - `collectChecks(islands: Island[]): RustCheck[]`
  - `crateName(checkName: string): string`
  - the CLI command `npm run verify:rust`, which exits with code 1 on any unexpected result

- [ ] **Step 1: Write failing tests** in `tests/rust-checks.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { collectChecks, crateName } from "../scripts/rust-checks";
import { makeIsland, makeStage } from "./fixtures";

describe("collectChecks", () => {
  it("checks runnable examples and both sides of every boss", () => {
    const stage = makeStage("hello", {
      tutorial: [
        { audience: "all", title: "Run me", text: "", code: "fn main() {}", runnable: true },
        { audience: "all", title: "Snippet", text: "", code: "let x = 5;" },
      ],
    });
    const checks = collectChecks([makeIsland("vars", [stage])]);
    expect(checks.map((c) => [c.name, c.kind, c.expect])).toEqual([
      ["vars-hello-page1", "run", "pass"],
      ["vars-boss-starter", "test", "fail"],
      ["vars-boss-solution", "test", "pass"],
    ]);
    expect(checks[1].code).toContain("mod boss_tests");
  });
});

describe("crateName", () => {
  it("makes a valid, unique-per-check cargo package name", () => {
    expect(crateName("vars-boss-starter")).toBe("check_vars_boss_starter");
    expect(crateName("If-Island page1")).toBe("check_if_island_page1");
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/rust-checks.test.ts`
Expected: FAIL, because the module `../scripts/rust-checks` can't be resolved.

- [ ] **Step 3: Implement `scripts/rust-checks.ts`**

```ts
import type { Island } from "../src/engine/types";
import { buildBossProgram } from "../src/playground/bossProgram";

export interface RustCheck {
  name: string;
  kind: "test" | "run";
  code: string;
  expect: "pass" | "fail";
}

export function collectChecks(islands: Island[]): RustCheck[] {
  const checks: RustCheck[] = [];
  for (const island of islands) {
    for (const stage of island.stages) {
      stage.tutorial.forEach((page, index) => {
        if (page.runnable && page.code) {
          checks.push({ name: `${island.id}-${stage.id}-page${index + 1}`, kind: "run", code: page.code, expect: "pass" });
        }
      });
    }
    const { starter, solution, tests } = island.boss;
    checks.push({ name: `${island.id}-boss-starter`, kind: "test", code: buildBossProgram(starter, tests), expect: "fail" });
    checks.push({ name: `${island.id}-boss-solution`, kind: "test", code: buildBossProgram(solution, tests), expect: "pass" });
  }
  return checks;
}

/** Cargo package names must be unique per check: a shared target dir otherwise reuses stale binaries. */
export function crateName(checkName: string): string {
  return `check_${checkName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run tests/rust-checks.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `scripts/verify-rust.ts`**

```ts
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { islands } from "../src/content/index";
import { collectChecks, crateName, type RustCheck } from "./rust-checks";

const root = mkdtempSync(join(tmpdir(), "playrusty-verify-"));
const env = { ...process.env, CARGO_TARGET_DIR: join(root, "target") };

function runCheck(check: RustCheck): { passed: boolean; output: string } {
  const name = crateName(check.name);
  const dir = join(root, name);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "Cargo.toml"), `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2024"\n`);
  writeFileSync(join(dir, "src", "main.rs"), check.code);
  const result = spawnSync("cargo", [check.kind, "--quiet"], { cwd: dir, env, encoding: "utf8" });
  if (result.error) throw new Error(`Could not run cargo: ${result.error.message}`);
  return { passed: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

const checks = collectChecks(islands);
let failures = 0;
try {
  for (const check of checks) {
    const { passed, output } = runCheck(check);
    const asExpected = passed === (check.expect === "pass");
    console.log(`${asExpected ? "ok  " : "FAIL"} ${check.name} (should ${check.expect})`);
    if (!asExpected) {
      failures += 1;
      console.log(output);
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log(`\n${checks.length - failures}/${checks.length} Rust checks behaved as expected.`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 6: Run it with no islands yet**

Run: `npm run verify:rust`
Expected: prints `0/0 Rust checks behaved as expected.` and exits with code 0.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck` (expected: no errors)

```bash
git add scripts tests/rust-checks.test.ts
git commit -m "feat: add cargo-based verification for bosses and examples" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Island 1 content — Mutable Marsh (Variables)

This island covers rustlings `00_intro` and `01_variables`. Boss starter and solution were verified with cargo during planning: the starter fails with E0384, E0381, E0308 and "missing type for const"; the solution passes 4/4 tests.

**Files:**
- Create: `src/content/islands/01-variables.ts`
- Modify: `src/content/index.ts` (register the island)

**Interfaces:**
- Consumes: `Island` from Task 2, and `rs` and `INTEGER_TYPES` from `src/content/helpers.ts`.
- Produces: `export const variablesIsland: Island` with `id: "variables"`.

- [ ] **Step 1: Create `src/content/islands/01-variables.ts`**

```ts
import type { Island } from "../../engine/types";
import { INTEGER_TYPES, rs } from "../helpers";

export const variablesIsland: Island = {
  id: "variables",
  number: 1,
  name: "Mutable Marsh",
  topic: "Variables",
  rustBook: "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html",
  stages: [
    {
      id: "harbor",
      title: "The Harbor: your first program",
      tutorial: [
        {
          audience: "all",
          title: "Welcome aboard!",
          text:
            "Ahoy! I'm **Ferris**, the Rust crab. Together we'll sail from island to island, and each island teaches one part of the Rust language.\n\n" +
            "Every stage starts with a short lesson like this one, followed by a few puzzles. At the end of each island a **boss** waits: a broken Rust program that you fix in a real code editor, checked by the real Rust compiler.",
        },
        {
          audience: "beginner",
          title: "What is a program?",
          text:
            "A program is a list of instructions for the computer. The computer follows them **in order**, from top to bottom.\n\n" +
            "Rust is a **compiled** language: before your program runs, a tool called the **compiler** reads all of it and checks it for mistakes. If it finds one, it refuses to build the program and explains what's wrong. Rust's compiler is famously helpful, so learning to read its messages is a superpower.",
        },
        {
          audience: "all",
          title: "Hello, Rust!",
          text:
            "Every Rust program starts running at a function called `main`. `fn main() { ... }` defines it, and the curly braces `{ }` hold the instructions to run.\n\n" +
            "`println!` prints a line of text. The `!` means it's a **macro**, a special kind of command. For now, just remember that `println!` always needs its `!`.\n\n" +
            "Each instruction ends with a semicolon `;`. Press **Run it yourself** to compile this program on the Rust Playground, then try changing the text.",
          code: rs`
            fn main() {
                println!("Hello, Rust!");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Printing values",
          text:
            "Inside the text, `{}` is a **placeholder**. Rust replaces it with the value that comes after the comma.\n\n" +
            "You can use several placeholders: they're filled in order, so `println!(\"{} and {}\", 1, 2)` prints `1 and 2`.",
          code: rs`
            fn main() {
                println!("1 + 2 = {}", 1 + 2);
                println!("{} and {}", "Ferris", "friends");
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "`println!` is Rust's `print()` / `console.log` / `System.out.println`. The `!` marks a **macro**: it's expanded at compile time, which is how Rust checks that the number of `{}` placeholders matches the number of values. A mismatch is a compile error, not a runtime surprise.\n\n" +
            "There's no top-level script code in Rust: everything runs inside `fn main`.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "harbor-bang",
          prompt: "Fill the gap so this program prints a greeting.",
          code: rs`
            fn main() {
                println___("Ahoy, Rustacean!");
            }
          `,
          answers: [["!"]],
          hint: "`println` is a macro. What symbol do macros always have after their name?",
          explanation: "Macros like `println!` are always called with a `!` after their name.",
        },
        {
          type: "pickFix",
          id: "harbor-pick",
          prompt: "Which program compiles and prints `Hello, world!`?",
          options: [
            { code: rs`
              fn main() {
                  println("Hello, world!");
              }
            `, correct: false },
            { code: rs`
              fn main() {
                  println!("Hello, world!");
              }
            `, correct: true },
            { code: rs`
              fn main() {
                  println!(Hello, world!);
              }
            `, correct: false },
          ],
          explanation: "`println!` needs its `!`, and text must be inside double quotes: `\"Hello, world!\"`.",
        },
        {
          type: "predict",
          id: "harbor-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                println!("{} + {} = {}", 2, 3, 2 + 3);
            }
          `,
          choices: ["2 + 3 = 5", "{} + {} = {}", "5 + 5 = 5", "It doesn't compile"],
          correctIndex: 0,
          explanation: "Each `{}` is replaced, in order, by the values after the text: `2`, `3`, then `2 + 3`, which is `5`.",
        },
      ],
    },
    {
      id: "let-and-mut",
      title: "let and mut",
      tutorial: [
        {
          audience: "beginner",
          title: "What is a variable?",
          text:
            "A **variable** is a name for a value, like a labelled box. You put a value in, then use the name whenever you need it.\n\n" +
            "Without variables you'd have to repeat every value by hand. With them, you write `score` and the computer looks up whatever is stored in it.",
        },
        {
          audience: "all",
          title: "Creating variables with let",
          text:
            "`let` creates a variable: `let coins = 5;` means \"from now on, `coins` is 5\".\n\n" +
            "You can put a variable's name directly inside the braces, like `{coins}`, or use an empty `{}` and pass the value after the comma.\n\n" +
            "Variable names in Rust use **snake_case**: lowercase words joined by underscores, like `gold_coins`.",
          code: rs`
            fn main() {
                let coins = 5;
                println!("I have {coins} coins");
                println!("Double that is {}", coins * 2);
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Immutable by default",
          text:
            "In Rust, variables are **immutable** by default: once a value is in the box, it can't be changed. The code below doesn't compile. The compiler says `cannot assign twice to immutable variable`.\n\n" +
            "This is on purpose: when a value can't change, you never have to wonder who changed it.",
          code: rs`
            fn main() {
                let coins = 5;
                coins = 6; // error!
            }
          `,
        },
        {
          audience: "all",
          title: "Making a variable mutable",
          text:
            "Add `mut` (short for **mutable**) after `let`, and you can change the value later.\n\n" +
            "`coins = coins + 3;` reads the old value, adds 3 and stores the result. The shorter `coins += 3;` does the same thing.",
          code: rs`
            fn main() {
                let mut coins = 5;
                println!("Before: {coins}");
                coins = coins + 3;
                println!("After: {coins}");
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust's `let` is like `const` in JavaScript or `final` in Java: the variable can't be reassigned. `let mut` is like JavaScript's `let`.\n\n" +
            "Make things mutable only when you need to. The compiler even warns you about a `mut` you never use.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "let-gap",
          prompt: "Fill the gap to create the variable.",
          code: rs`
            fn main() {
                ___ x = 5;
                println!("x has the value {x}");
            }
          `,
          answers: [["let"]],
          hint: "Which keyword creates a new variable?",
          explanation: "`let` creates a new variable. Without it, Rust thinks you're assigning to a variable that doesn't exist.",
        },
        {
          type: "fillGap",
          id: "mut-gap",
          prompt: "Fill the gap so `count` can be changed.",
          code: rs`
            fn main() {
                let ___ count = 0;
                count += 1;
                println!("{count}");
            }
          `,
          answers: [["mut"]],
          hint: "Which keyword after `let` makes a variable changeable?",
          explanation: "`let mut` creates a mutable variable, so `count += 1` is allowed.",
        },
        {
          type: "predict",
          id: "reassign-predict",
          prompt: "What happens when you compile and run this program?",
          code: rs`
            fn main() {
                let x = 5;
                x = 6;
                println!("{x}");
            }
          `,
          choices: ["It prints 5", "It prints 6", "It doesn't compile"],
          correctIndex: 2,
          explanation: "`x` was declared without `mut`, so `x = 6;` is a compile error: cannot assign twice to immutable variable.",
        },
        {
          type: "spotBug",
          id: "spot-let",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                let mut lives = 3;
                lives = lives - 1;
                let score = 10;
                score = score + 5;
                println!("{lives} {score}");
            }
          `,
          bugLine: 5,
          explanation: "`score` was created with plain `let`, so it can't be changed. `lives` is fine because it's `let mut`.",
        },
      ],
    },
    {
      id: "shadowing",
      title: "Shadowing",
      tutorial: [
        {
          audience: "all",
          title: "Reusing a name",
          text:
            "You can declare a **new** variable with the same name as an old one. The new one **shadows** the old one: from that line on, the name refers to the new value.\n\n" +
            "This isn't the same as `mut`. Each `let` creates a brand-new variable; the old one is just hidden.",
          code: rs`
            fn main() {
                let level = 1;
                let level = level + 1;
                let level = level * 10;
                println!("level is {level}");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Shadowing can change the type",
          text:
            "Because shadowing creates a new variable, the new one can hold a different **kind** of value. Here `spaces` starts as some text and becomes a number: `.len()` gives the length of the text.\n\n" +
            "With `mut` you couldn't do this: a mutable variable can change its value, but never its kind.",
          code: rs`
            fn main() {
                let spaces = "   ";
                let spaces = spaces.len();
                println!("There are {spaces} spaces");
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Most languages forbid redeclaring a variable in the same scope. Rust allows it on purpose: it's idiomatic for transforming a value step by step (`let input = input.trim();`) without inventing names like `input2`.",
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "shadow-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let x = 5;
                let x = x + 1;
                let x = x * 2;
                println!("{x}");
            }
          `,
          choices: ["5", "6", "12", "It doesn't compile"],
          correctIndex: 2,
          explanation: "Each `let` shadows the previous `x`: 5, then 5 + 1 = 6, then 6 * 2 = 12.",
        },
        {
          type: "pickFix",
          id: "shadow-pick",
          prompt: "We want `name` to end up holding the length of the text. Which version compiles?",
          options: [
            { code: rs`
              let mut name = "Ferris";
              name = name.len();
            `, correct: false },
            { code: rs`
              let name = "Ferris";
              let name = name.len();
            `, correct: true },
            { code: rs`
              let name = "Ferris";
              name = name.len();
            `, correct: false },
          ],
          explanation: "Only shadowing with a second `let` can change the kind of value. A `mut` variable can change its value, but it must stay the same type.",
        },
        {
          type: "fillGap",
          id: "shadow-gap",
          prompt: "Fill the gap so the number shadows the text.",
          code: rs`
            fn main() {
                let number = "T-H-R-E-E";
                println!("Spell a number: {number}");
                ___ number = 3;
                println!("Number plus two is: {}", number + 2);
            }
          `,
          answers: [["let"]],
          hint: "To shadow a variable, you declare it again.",
          explanation: "`let number = 3;` creates a new variable that shadows the text one, so `number + 2` works.",
        },
      ],
    },
    {
      id: "types",
      title: "Types and annotations",
      tutorial: [
        {
          audience: "beginner",
          title: "Values have types",
          text:
            "Every value has a **type** that says what kind of value it is: a whole number, a number with a decimal point, true or false, a piece of text...\n\n" +
            "The type decides what you can do with a value. You can multiply two numbers, but multiplying two pieces of text makes no sense, so Rust won't let you.",
        },
        {
          audience: "all",
          title: "Common types",
          text:
            "You can write a variable's type after its name with a colon. This is a **type annotation**.\n\n" +
            "`i32` is a whole number that can be negative (`u32` is one that can't). `f64` is a number with a decimal point. `bool` is `true` or `false`. `char` is a single character in single quotes. Text in double quotes is a **string**; you'll meet strings properly on a later island.",
          code: rs`
            fn main() {
                let lives: i32 = 3;
                let speed: f64 = 2.5;
                let is_open: bool = true;
                let letter: char = 'R';
                println!("{lives} {speed} {is_open} {letter}");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Type inference",
          text:
            "Most of the time you don't need annotations: Rust **infers** the type from the value. `let lives = 3;` becomes an `i32`, and `let speed = 2.5;` becomes an `f64`.\n\n" +
            "When there's no value to look at, Rust needs your help, and that's when you write the annotation yourself.",
          code: rs`
            let lives = 3;      // i32
            let speed = 2.5;    // f64
            let open = true;    // bool
          `,
        },
        {
          audience: "all",
          title: "Give it a value before you use it",
          text:
            "You can declare a variable before giving it a value, but you **must** give it one before you use it. Rust never lets you read a variable that was never set: there's no `undefined` or random leftover value.\n\n" +
            "The fix here is to give `x` a value: `let x: i32 = 42;`.",
          code: rs`
            fn main() {
                let x: i32;
                println!("{x}"); // error: used before it has a value
            }
          `,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust is statically typed like Java or C++, with inference closer to TypeScript or Kotlin. Integer types state their size: `i8` to `i128` are signed, `u8` to `u128` unsigned, plus `usize` for sizes and indexes.\n\n" +
            "There are no implicit conversions between number types: putting an `i32` into an `i64` variable is a compile error.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "type-gap",
          prompt: "Fill the gap with a type that can hold a whole number.",
          code: rs`
            fn main() {
                let age: ___ = 30;
                println!("Ferris is {age} years old");
            }
          `,
          answers: [INTEGER_TYPES],
          hint: "Whole numbers use types like `i32` or `u32`.",
          explanation: "Any integer type works here, for example `i32` or `u32`.",
        },
        {
          type: "predict",
          id: "infer-predict",
          prompt: "What type does Rust infer for `price`?",
          code: rs`let price = 9.99;`,
          choices: ["i32", "f64", "bool", "char"],
          correctIndex: 1,
          explanation: "A number with a decimal point is inferred as `f64` by default.",
        },
        {
          type: "predict",
          id: "uninit-predict",
          prompt: "What happens with this program?",
          code: rs`
            fn main() {
                let x: i32;
                println!("Number {x}");
            }
          `,
          choices: ["It prints Number 0", "It prints Number undefined", "It doesn't compile"],
          correctIndex: 2,
          explanation: "`x` is declared but never given a value. Rust refuses to compile code that reads it: used binding `x` isn't initialized.",
        },
        {
          type: "spotBug",
          id: "type-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                let open: bool = true;
                let initial: char = 'F';
                let lives: i32 = 2.5;
                println!("{open} {initial} {lives}");
            }
          `,
          bugLine: 4,
          explanation: "`2.5` isn't a whole number, so it can't go in an `i32`. It would need `f64`.",
        },
      ],
    },
    {
      id: "constants",
      title: "Constants",
      tutorial: [
        {
          audience: "beginner",
          title: "Why constants?",
          text:
            "Constants give a name to a fixed value, like the number of lives in a game. If you write `MAX_LIVES` instead of `3` everywhere, the code explains itself, and if you ever change the rule you only edit one line.",
        },
        {
          audience: "all",
          title: "const",
          text:
            "A **constant** is a value that never changes, ever. You create one with `const` instead of `let`.\n\n" +
            "Constants have three rules: their names use `SCREAMING_SNAKE_CASE`, they **always** need a type annotation, and they can't be `mut`. They can live outside `main`, so the whole program can use them.",
          code: rs`
            const MAX_LIVES: u32 = 3;

            fn main() {
                println!("You start with {MAX_LIVES} lives");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Readable numbers",
          text: "Big numbers are easier to read with underscores: `100_000` is the same as `100000`. Rust ignores the underscores.",
          code: rs`const SECONDS_PER_DAY: u32 = 86_400;`,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "A Rust `const` is like `static final` in Java or `constexpr` in C++: the value is known at compile time and copied into every place it's used. Unlike `let`, the type annotation is **mandatory**; constants get no inference.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "const-gap",
          prompt: "Fill the gap to declare a constant.",
          code: rs`
            ___ MAX_SPEED: u32 = 120;

            fn main() {
                println!("Top speed: {MAX_SPEED}");
            }
          `,
          answers: [["const"]],
          hint: "Which keyword creates a value that never changes?",
          explanation: "`const` declares a constant. `let` isn't allowed outside a function.",
        },
        {
          type: "spotBug",
          id: "const-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            const NUMBER = 3;

            fn main() {
                println!("Number: {NUMBER}");
            }
          `,
          bugLine: 1,
          explanation: "Constants always need a type annotation: `const NUMBER: i32 = 3;`.",
        },
        {
          type: "predict",
          id: "const-mut",
          prompt: "Does this line compile?",
          code: rs`const mut LIVES: u32 = 3;`,
          choices: ["Yes, `const mut` works like `let mut`", "No, constants can never be mutable"],
          correctIndex: 1,
          explanation: "Constants never change, so `mut` isn't allowed on a `const`.",
        },
      ],
    },
  ],
  boss: {
    name: "The Immutable Golem",
    story:
      "A hulking golem of grey stone blocks the bridge out of the marsh. \"NOTHING HERE MAY CHANGE,\" it rumbles. Fix its four broken lines to prove you understand variables, mutability and constants, and it will crumble.",
    starter: rs`
      // Fix every line marked FIX ME so the program compiles and all the tests pass.
      //
      // The fn ... { lines are functions. You'll learn them on the next island;
      // for now, leave those lines as they are and fix the code inside.

      const BRIDGE_TOLL: u32 = 3;
      const GOLEM_HEIGHT = 12; // FIX ME

      fn coins_after_bridge() -> u32 {
          let coins = 10;
          coins = coins - BRIDGE_TOLL; // FIX ME
          coins
      }

      fn rune_count() -> usize {
          let mut runes = "rust!";
          runes = runes.len(); // FIX ME
          runes
      }

      fn bridge_length() -> i32 {
          let length: i32; // FIX ME: the bridge is 20 steps long
          length
      }

      fn golem_height() -> u32 {
          GOLEM_HEIGHT
      }

      fn main() {
          println!("Coins left: {}", coins_after_bridge());
      }
    `,
    tests: rs`
      #[test]
      fn golem_height_is_12() {
          assert_eq!(golem_height(), 12);
      }

      #[test]
      fn pay_the_toll() {
          assert_eq!(coins_after_bridge(), 7);
      }

      #[test]
      fn count_the_runes() {
          assert_eq!(rune_count(), 5);
      }

      #[test]
      fn measure_the_bridge() {
          assert_eq!(bridge_length(), 20);
      }
    `,
    solution: rs`
      const BRIDGE_TOLL: u32 = 3;
      const GOLEM_HEIGHT: u32 = 12;

      fn coins_after_bridge() -> u32 {
          let mut coins = 10;
          coins = coins - BRIDGE_TOLL;
          coins
      }

      fn rune_count() -> usize {
          let runes = "rust!";
          let runes = runes.len();
          runes
      }

      fn bridge_length() -> i32 {
          let length: i32 = 20;
          length
      }

      fn golem_height() -> u32 {
          GOLEM_HEIGHT
      }

      fn main() {
          println!("Coins left: {}", coins_after_bridge());
      }
    `,
    hints: [
      "Start at the top: a constant always needs a type. Look at how `BRIDGE_TOLL` is written.",
      "`coins` changes after it's created, so it must be mutable. `runes` changes from text to a number, which only shadowing (a second `let`) can do.",
      "`let length: i32;` declares a variable but never gives it a value. Give it the value 20 on that same line.",
    ],
  },
};
```

Rule for all content files: **never put backticks inside `rs` templates**. `String.raw` would keep an escaping backslash in the Rust code.

- [ ] **Step 2: Register the island** in `src/content/index.ts`

Add the import at the top:
```ts
import { variablesIsland } from "./islands/01-variables";
```
Then change `export const islands: Island[] = [];` to:
```ts
export const islands: Island[] = [variablesIsland];
```

- [ ] **Step 3: Run the content tests**

Run: `npx vitest run tests/content.test.ts`
Expected: PASS. If the validator reports errors, fix the content until it's clean.

- [ ] **Step 4: Verify the Rust with cargo**

Run: `npm run verify:rust`
Expected: 8 checks, all `ok`:
- `variables-harbor-page3`, `variables-harbor-page4`
- `variables-let-and-mut-page2`, `variables-let-and-mut-page4`
- `variables-shadowing-page1`, `variables-shadowing-page2`
- `variables-types-page2`, `variables-constants-page2`
- `variables-boss-starter`
- `variables-boss-solution`

That is 10 lines in total, ending with `10/10 Rust checks behaved as expected.`

- [ ] **Step 5: Commit**

```bash
git add src/content
git commit -m "content: add island 1, Mutable Marsh (variables)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: DOM helper, Markdown renderer and router

**Files:**
- Create: `src/ui/dom.ts`, `src/ui/markdown.ts`, `src/router.ts`, `tests/dom.test.ts`, `tests/markdown.test.ts`, `tests/router.test.ts`

**Interfaces:**
- Produces from `src/ui/dom.ts`: `h(tag, attrs?, ...children)`
  - `attrs` keys starting with `on` become event listeners.
  - `class` sets `className`.
  - `true` sets an empty attribute; `false` and `undefined` are skipped.
  - `null`, `undefined` and `false` children are skipped.
- Produces from `src/ui/markdown.ts`:
  - `renderMarkdown(text: string): DocumentFragment`
  - `prose(text: string): HTMLDivElement`, which returns a `.prose` div
- Produces from `src/router.ts`:
  - `Route`
  - `parseRoute(hash: string): Route`
  - `routeToHash(route: Route): string`
  - `onRouteChange(handler: (route: Route) => void): void`

- [ ] **Step 1: Write failing tests**

`tests/dom.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { h } from "../src/ui/dom";

describe("h", () => {
  it("builds elements with attributes, classes and children", () => {
    const el = h("a", { class: "btn", href: "#/map", hidden: false, disabled: true }, "Go", null, h("span", {}, "!"));
    expect(el.className).toBe("btn");
    expect(el.getAttribute("href")).toBe("#/map");
    expect(el.hasAttribute("hidden")).toBe(false);
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.textContent).toBe("Go!");
  });

  it("wires on* attributes as event listeners", () => {
    const onClick = vi.fn();
    h("button", { onclick: onClick }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("treats string children as text, not HTML", () => {
    expect(h("p", {}, "<b>bold</b>").querySelector("b")).toBeNull();
  });
});
```

`tests/markdown.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { prose, renderMarkdown } from "../src/ui/markdown";

function render(text: string): HTMLDivElement {
  const div = document.createElement("div");
  div.append(renderMarkdown(text));
  return div;
}

describe("renderMarkdown", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    const div = render("First line\ncontinues.\n\nSecond.");
    expect([...div.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["First line continues.", "Second."]);
  });

  it("renders inline code, bold and links", () => {
    const div = render("Use `let mut` for **mutable** values. See [the Book](https://doc.rust-lang.org/book/).");
    expect(div.querySelector("code")?.textContent).toBe("let mut");
    expect(div.querySelector("strong")?.textContent).toBe("mutable");
    const link = div.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://doc.rust-lang.org/book/");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(div.textContent).toBe("Use let mut for mutable values. See the Book.");
  });

  it("never interprets HTML", () => {
    const div = render("<img src=x onerror=alert(1)> `<b>`");
    expect(div.querySelector("img")).toBeNull();
    expect(div.querySelector("b")).toBeNull();
  });

  it("leaves non-http links as plain text", () => {
    const div = render("[click](javascript:alert(1))");
    expect(div.querySelector("a")).toBeNull();
  });
});

describe("prose", () => {
  it("wraps rendered markdown in a .prose div", () => {
    const el = prose("Hello **there**");
    expect(el.className).toBe("prose");
    expect(el.querySelector("strong")?.textContent).toBe("there");
  });
});
```

`tests/router.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseRoute, routeToHash, type Route } from "../src/router";

describe("router", () => {
  it("parses every route", () => {
    expect(parseRoute("")).toEqual({ name: "title" });
    expect(parseRoute("#/")).toEqual({ name: "title" });
    expect(parseRoute("#/map")).toEqual({ name: "map" });
    expect(parseRoute("#/settings")).toEqual({ name: "settings" });
    expect(parseRoute("#/island/variables")).toEqual({ name: "island", islandId: "variables" });
    expect(parseRoute("#/stage/variables/let-and-mut")).toEqual({ name: "stage", islandId: "variables", stageId: "let-and-mut" });
    expect(parseRoute("#/boss/variables")).toEqual({ name: "boss", islandId: "variables" });
    expect(parseRoute("#/celebrate/variables")).toEqual({ name: "celebrate", islandId: "variables" });
  });

  it("falls back to the title screen for unknown or incomplete routes", () => {
    expect(parseRoute("#/nowhere")).toEqual({ name: "title" });
    expect(parseRoute("#/stage/variables")).toEqual({ name: "title" });
  });

  it("round-trips routes through hashes", () => {
    const routes: Route[] = [
      { name: "title" }, { name: "map" }, { name: "settings" },
      { name: "island", islandId: "if" }, { name: "stage", islandId: "if", stageId: "else if" },
      { name: "boss", islandId: "if" }, { name: "celebrate", islandId: "if" },
    ];
    for (const route of routes) expect(parseRoute(routeToHash(route))).toEqual(route);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/dom.test.ts tests/markdown.test.ts tests/router.test.ts`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement**

`src/ui/dom.ts`:
```ts
type Child = Node | string | null | undefined | false;
type AttrValue = string | number | boolean | EventListener | undefined;

/** Creates an element. `on*` attrs become listeners; string children are text, never HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "class") el.className = String(value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) el.append(child);
  }
  return el;
}
```

`src/ui/markdown.ts`:
```ts
import { h } from "./dom";

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Renders the content Markdown subset: paragraphs, `code`, **bold**, [links](https://…). */
export function renderMarkdown(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const paragraph of text.trim().split(/\n\s*\n/)) {
    const p = document.createElement("p");
    appendInline(p, paragraph.replace(/\s*\n\s*/g, " "));
    fragment.append(p);
  }
  return fragment;
}

function appendInline(parent: HTMLElement, text: string): void {
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parent.append(text.slice(last, index));
    if (match[1]) parent.append(h("code", {}, match[1].slice(1, -1)));
    else if (match[2]) parent.append(h("strong", {}, match[2].slice(2, -2)));
    else parent.append(h("a", { href: match[4], target: "_blank", rel: "noopener" }, match[3]));
    last = index + match[0].length;
  }
  if (last < text.length) parent.append(text.slice(last));
}

export function prose(text: string): HTMLDivElement {
  const div = h("div", { class: "prose" });
  div.append(renderMarkdown(text));
  return div;
}
```

`src/router.ts`:
```ts
export type Route =
  | { name: "title" }
  | { name: "map" }
  | { name: "settings" }
  | { name: "island"; islandId: string }
  | { name: "stage"; islandId: string; stageId: string }
  | { name: "boss"; islandId: string }
  | { name: "celebrate"; islandId: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [name = "", a = "", b = ""] = parts;
  switch (name) {
    case "map":
      return { name: "map" };
    case "settings":
      return { name: "settings" };
    case "island":
      if (a) return { name: "island", islandId: a };
      break;
    case "stage":
      if (a && b) return { name: "stage", islandId: a, stageId: b };
      break;
    case "boss":
      if (a) return { name: "boss", islandId: a };
      break;
    case "celebrate":
      if (a) return { name: "celebrate", islandId: a };
      break;
  }
  return { name: "title" };
}

export function routeToHash(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.name) {
    case "title":
      return "#/";
    case "map":
      return "#/map";
    case "settings":
      return "#/settings";
    case "island":
      return `#/island/${enc(route.islandId)}`;
    case "stage":
      return `#/stage/${enc(route.islandId)}/${enc(route.stageId)}`;
    case "boss":
      return `#/boss/${enc(route.islandId)}`;
    case "celebrate":
      return `#/celebrate/${enc(route.islandId)}`;
  }
}

/** Calls `handler` now and on every hash change. */
export function onRouteChange(handler: (route: Route) => void): void {
  const fire = () => handler(parseRoute(window.location.hash));
  window.addEventListener("hashchange", fire);
  fire();
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run tests/dom.test.ts tests/markdown.test.ts tests/router.test.ts`, then `npm run typecheck`
Expected: PASS (11 tests) and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/dom.ts src/ui/markdown.ts src/router.ts tests/dom.test.ts tests/markdown.test.ts tests/router.test.ts
git commit -m "feat: add DOM helper, markdown subset renderer and hash router" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Puzzle types

**Files:**
- Create: `src/ui/components/codeBlock.ts`, `src/puzzles/fillGap.ts`, `src/puzzles/pickFix.ts`, `src/puzzles/predict.ts`, `src/puzzles/spotBug.ts`, `src/puzzles/index.ts`, `tests/puzzles.test.ts`

**Interfaces:**
- Consumes: puzzle types (Task 2) and `h` (Task 8).
- Produces:
  - `codeBlock(code: string): HTMLPreElement`, which returns `pre.code > code`
  - per type:
    - `checkFillGap(p, answer: string[])` and `renderFillGap(p, container, onSubmit: (answer: string[]) => void)`
    - `checkPickFix(p, index: number)` and `renderPickFix(p, container, onSubmit: (index: number) => void)`
    - `checkPredict(p, index: number)` and `renderPredict(p, container, onSubmit: (index: number) => void)`
    - `checkSpotBug(p, line: number)` and `renderSpotBug(p, container, onSubmit: (line: number) => void)`
  - the dispatcher `renderPuzzle(puzzle: Puzzle, container: HTMLElement, onResult: (correct: boolean) => void): void`

- [ ] **Step 1: Write failing tests** in `tests/puzzles.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { FillGapPuzzle, PickFixPuzzle, PredictPuzzle, SpotBugPuzzle } from "../src/engine/types";
import { checkFillGap, renderFillGap } from "../src/puzzles/fillGap";
import { renderPuzzle } from "../src/puzzles/index";
import { checkPickFix } from "../src/puzzles/pickFix";
import { checkPredict } from "../src/puzzles/predict";
import { checkSpotBug, renderSpotBug } from "../src/puzzles/spotBug";

const fillGap: FillGapPuzzle = {
  type: "fillGap", id: "g", prompt: "Fill it", code: "let ___ x: ___ = 1;",
  answers: [["mut"], ["i32", "u32"]], hint: "h", explanation: "e",
};
const pickFix: PickFixPuzzle = {
  type: "pickFix", id: "p", prompt: "Pick",
  options: [{ code: "bad", correct: false }, { code: "good", correct: true }], explanation: "e",
};
const predict: PredictPuzzle = {
  type: "predict", id: "r", prompt: "Predict", code: "fn main() {}", choices: ["A", "B", "C"], correctIndex: 2, explanation: "e",
};
const spotBug: SpotBugPuzzle = {
  type: "spotBug", id: "s", prompt: "Spot", code: "fn main() {\n    let x = 5;\n    x = 6;\n}", bugLine: 3, explanation: "e",
};

describe("checks", () => {
  it("fillGap compares trimmed answers per gap", () => {
    expect(checkFillGap(fillGap, [" mut ", "u32"])).toBe(true);
    expect(checkFillGap(fillGap, ["mut", "f64"])).toBe(false);
    expect(checkFillGap(fillGap, ["MUT", "i32"])).toBe(false);
    expect(checkFillGap(fillGap, ["mut"])).toBe(false);
  });

  it("pickFix, predict and spotBug compare the chosen index/line", () => {
    expect(checkPickFix(pickFix, 1)).toBe(true);
    expect(checkPickFix(pickFix, 0)).toBe(false);
    expect(checkPickFix(pickFix, 7)).toBe(false);
    expect(checkPredict(predict, 2)).toBe(true);
    expect(checkPredict(predict, 0)).toBe(false);
    expect(checkSpotBug(spotBug, 3)).toBe(true);
    expect(checkSpotBug(spotBug, 2)).toBe(false);
  });
});

describe("renderers", () => {
  it("fillGap renders one input per gap and submits their values", () => {
    const container = document.createElement("div");
    let submitted: string[] = [];
    renderFillGap(fillGap, container, (answer) => (submitted = answer));
    const inputs = container.querySelectorAll("input");
    expect(inputs).toHaveLength(2);
    inputs[0].value = "mut";
    inputs[1].value = "i32";
    container.querySelector("button")?.click();
    expect(submitted).toEqual(["mut", "i32"]);
  });

  it("spotBug renders one button per line and submits the 1-based line", () => {
    const container = document.createElement("div");
    let line = 0;
    renderSpotBug(spotBug, container, (n) => (line = n));
    const buttons = container.querySelectorAll<HTMLButtonElement>("button.line");
    expect(buttons).toHaveLength(4);
    buttons[2].click();
    expect(line).toBe(3);
  });

  it("renderPuzzle reports correctness for choice puzzles", () => {
    const results: boolean[] = [];
    for (const puzzle of [pickFix, predict]) {
      const container = document.createElement("div");
      renderPuzzle(puzzle, container, (correct) => results.push(correct));
      const buttons = container.querySelectorAll<HTMLButtonElement>("button.choice");
      buttons[0].click();
      buttons[buttons.length - 1].click();
    }
    expect(results).toEqual([false, true, false, true]);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/puzzles.test.ts`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement**

`src/ui/components/codeBlock.ts`:
```ts
import { h } from "../dom";

export function codeBlock(code: string): HTMLPreElement {
  return h("pre", { class: "code" }, h("code", {}, code));
}
```

`src/puzzles/fillGap.ts`:
```ts
import type { FillGapPuzzle } from "../engine/types";
import { h } from "../ui/dom";

export function checkFillGap(puzzle: FillGapPuzzle, answer: string[]): boolean {
  return puzzle.answers.every((accepted, i) => accepted.includes((answer[i] ?? "").trim()));
}

export function renderFillGap(puzzle: FillGapPuzzle, container: HTMLElement, onSubmit: (answer: string[]) => void): void {
  const code = h("code");
  const inputs: HTMLInputElement[] = [];
  const parts = puzzle.code.split("___");
  parts.forEach((part, i) => {
    code.append(part);
    if (i < parts.length - 1) {
      const input = h("input", { class: "gap", type: "text", "aria-label": `Gap ${i + 1}`, autocomplete: "off", spellcheck: "false" });
      inputs.push(input);
      code.append(input);
    }
  });
  const submit = () => onSubmit(inputs.map((input) => input.value));
  for (const input of inputs) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
  }
  container.append(
    h("p", { class: "prompt" }, puzzle.prompt),
    h("pre", { class: "code" }, code),
    h("button", { class: "btn primary", onclick: submit }, "Check"),
  );
}
```

`src/puzzles/pickFix.ts`:
```ts
import type { PickFixPuzzle } from "../engine/types";
import { codeBlock } from "../ui/components/codeBlock";
import { h } from "../ui/dom";

export function checkPickFix(puzzle: PickFixPuzzle, index: number): boolean {
  return puzzle.options[index]?.correct === true;
}

export function renderPickFix(puzzle: PickFixPuzzle, container: HTMLElement, onSubmit: (index: number) => void): void {
  const choices = h("div", { class: "choices" });
  puzzle.options.forEach((option, i) => {
    choices.append(h("button", { class: "choice", "aria-label": `Option ${i + 1}`, onclick: () => onSubmit(i) }, codeBlock(option.code)));
  });
  container.append(h("p", { class: "prompt" }, puzzle.prompt), choices);
}
```

`src/puzzles/predict.ts`:
```ts
import type { PredictPuzzle } from "../engine/types";
import { codeBlock } from "../ui/components/codeBlock";
import { h } from "../ui/dom";

export function checkPredict(puzzle: PredictPuzzle, index: number): boolean {
  return index === puzzle.correctIndex;
}

export function renderPredict(puzzle: PredictPuzzle, container: HTMLElement, onSubmit: (index: number) => void): void {
  const choices = h("div", { class: "choices" });
  puzzle.choices.forEach((choice, i) => {
    choices.append(h("button", { class: "choice", onclick: () => onSubmit(i) }, choice));
  });
  container.append(h("p", { class: "prompt" }, puzzle.prompt), codeBlock(puzzle.code), choices);
}
```

`src/puzzles/spotBug.ts`:
```ts
import type { SpotBugPuzzle } from "../engine/types";
import { h } from "../ui/dom";

export function checkSpotBug(puzzle: SpotBugPuzzle, line: number): boolean {
  return line === puzzle.bugLine;
}

export function renderSpotBug(puzzle: SpotBugPuzzle, container: HTMLElement, onSubmit: (line: number) => void): void {
  const lines = h("div", { class: "lines", role: "group", "aria-label": "Code lines: click the broken one" });
  puzzle.code.split("\n").forEach((text, i) => {
    lines.append(
      h("button", { class: "line", "aria-label": `Line ${i + 1}: ${text.trim()}`, onclick: () => onSubmit(i + 1) },
        h("span", { class: "ln" }, String(i + 1)),
        h("code", {}, text || " ")),
    );
  });
  container.append(h("p", { class: "prompt" }, puzzle.prompt), lines);
}
```

`src/puzzles/index.ts`:
```ts
import type { Puzzle } from "../engine/types";
import { checkFillGap, renderFillGap } from "./fillGap";
import { checkPickFix, renderPickFix } from "./pickFix";
import { checkPredict, renderPredict } from "./predict";
import { checkSpotBug, renderSpotBug } from "./spotBug";

/** Renders any puzzle and reports whether each submitted answer was correct. */
export function renderPuzzle(puzzle: Puzzle, container: HTMLElement, onResult: (correct: boolean) => void): void {
  switch (puzzle.type) {
    case "fillGap":
      return renderFillGap(puzzle, container, (answer) => onResult(checkFillGap(puzzle, answer)));
    case "pickFix":
      return renderPickFix(puzzle, container, (index) => onResult(checkPickFix(puzzle, index)));
    case "predict":
      return renderPredict(puzzle, container, (index) => onResult(checkPredict(puzzle, index)));
    case "spotBug":
      return renderSpotBug(puzzle, container, (line) => onResult(checkSpotBug(puzzle, line)));
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run tests/puzzles.test.ts`, then `npm run typecheck`
Expected: PASS (5 tests) and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/puzzles src/ui/components/codeBlock.ts tests/puzzles.test.ts
git commit -m "feat: add the four offline puzzle types" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: UI components and styles

**Files:**
- Create:
  - `src/ui/app.ts`
  - `src/ui/components/codeEditor.ts`, `console.ts`, `runner.ts`, `hpBar.ts`, `hud.ts`, `ferris.ts`, `badge.ts`, `stars.ts`, `tutorialPage.ts`
  - `tests/components.test.ts`
- Modify: `src/styles/main.css` (replace the placeholder)

**Interfaces:**
- Consumes: `h`, `prose` and `renderMarkdown` (Task 8); `runCode` (Task 5); `codeBlock` (Task 9); `routeToHash` and `Route` (Task 8); `totalStars` (Task 3); `SaveStore` (Task 4); types.
- Produces from `src/ui/app.ts`:
  - `type Cleanup = () => void`
  - `noop: Cleanup`
  - `interface AppContext { islands; comingSoon; persistent; getSave(); update(change); resetProgress(); go(route) }`
  - `createAppContext(store: SaveStore, islands: Island[], comingSoon: ComingSoonIsland[]): AppContext`
- Produces from `codeEditor.ts`:
  - `interface CodeEditor { getCode(): string; setCode(code: string): void; destroy(): void }`
  - `createCodeEditor(parent: HTMLElement, code: string): CodeEditor`
- Produces from `console.ts`:
  - `cleanCargoNoise(stderr: string): string`
  - `linkErrorCodes(text: string): DocumentFragment`
  - `type MessageKind = "info" | "success" | "error"`
  - `interface GameConsole { showRunning(): void; showOutput(stdout, stderr, heading?: { text: string; kind: MessageKind }): void; showError(message, onRetry): void }`
  - `createConsole(parent: HTMLElement): GameConsole`
- Produces the remaining components:
  - `createRunner(parent: HTMLElement, code: string): { destroy(): void }` from `runner.ts`
  - `createHpBar(parent: HTMLElement, name: string, total: number): { set(remaining: number): void }` from `hpBar.ts`
  - `renderHud(ctx: AppContext): HTMLElement` from `hud.ts`
  - `ferrisSvg(width: number): SVGSVGElement` from `ferris.ts`
  - `badgeSvg(islandNumber: number): SVGSVGElement` from `badge.ts`
  - `starsLabel(stars: Stars | undefined): string` from `stars.ts`, e.g. `★★☆`
  - `renderTutorialPage(page: TutorialPage): { el: HTMLElement; destroy(): void }` from `tutorialPage.ts`

- [ ] **Step 1: Write failing tests** in `tests/components.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { cleanCargoNoise, createConsole, linkErrorCodes } from "../src/ui/components/console";
import { createHpBar } from "../src/ui/components/hpBar";
import { starsLabel } from "../src/ui/components/stars";
import { renderTutorialPage } from "../src/ui/components/tutorialPage";

describe("console helpers", () => {
  it("removes cargo progress lines but keeps real messages", () => {
    const stderr =
      "   Compiling playground v0.0.1 (/playground)\nwarning: unused variable: `x`\n" +
      "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.38s\n" +
      "     Running `target/debug/playground`\nerror: test failed, to rerun pass `--bin playground`\n";
    expect(cleanCargoNoise(stderr)).toBe("warning: unused variable: `x`");
  });

  it("links rustc error codes to their explanation", () => {
    const div = document.createElement("div");
    div.append(linkErrorCodes("error[E0384]: cannot assign twice"));
    const link = div.querySelector("a");
    expect(link?.textContent).toBe("E0384");
    expect(link?.getAttribute("href")).toBe("https://doc.rust-lang.org/error_codes/E0384.html");
    expect(div.textContent).toBe("error[E0384]: cannot assign twice");
  });

  it("shows a retry button for connection errors", () => {
    const host = document.createElement("div");
    let retried = false;
    createConsole(host).showError("The compiler bridge is down.", () => (retried = true));
    host.querySelector("button")?.click();
    expect(retried).toBe(true);
  });
});

describe("hp bar", () => {
  it("shows remaining health", () => {
    const host = document.createElement("div");
    const bar = createHpBar(host, "Golem", 4);
    bar.set(1);
    expect(host.querySelector<HTMLElement>(".hp-fill")?.style.width).toBe("25%");
    expect(host.textContent).toContain("Golem: 1/4 HP");
  });
});

describe("stars", () => {
  it("renders earned and missing stars", () => {
    expect(starsLabel(2)).toBe("★★☆");
    expect(starsLabel(undefined)).toBe("");
  });
});

describe("tutorial page", () => {
  it("renders title, text, audience tag and code", () => {
    const page = renderTutorialPage({ audience: "experienced", title: "Hi", text: "Use `let`.", code: "let x = 1;" });
    expect(page.el.querySelector("h2")?.textContent).toBe("Hi");
    expect(page.el.querySelector(".tag")?.textContent).toBe("Coming from another language");
    expect(page.el.querySelector("pre.code")?.textContent).toBe("let x = 1;");
    expect(page.el.querySelector("button")).toBeNull();
  });

  it("offers a run button for runnable pages", () => {
    const page = renderTutorialPage({ audience: "all", title: "Run", text: "t", code: "fn main() {}", runnable: true });
    expect(page.el.querySelector("button")?.textContent).toContain("Run it yourself");
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement `src/ui/app.ts`**

```ts
import type { ComingSoonIsland, Island, SaveData } from "../engine/types";
import type { SaveStore } from "../engine/save";
import { routeToHash, type Route } from "../router";

export type Cleanup = () => void;
export const noop: Cleanup = () => {};

export interface AppContext {
  readonly islands: Island[];
  readonly comingSoon: ComingSoonIsland[];
  /** False when the browser blocks storage and progress lives only in memory. */
  readonly persistent: boolean;
  getSave(): SaveData;
  update(change: (save: SaveData) => SaveData): void;
  resetProgress(): void;
  go(route: Route): void;
}

export function createAppContext(store: SaveStore, islands: Island[], comingSoon: ComingSoonIsland[]): AppContext {
  let save = store.load();
  return {
    islands,
    comingSoon,
    persistent: store.persistent,
    getSave: () => save,
    update(change) {
      save = change(save);
      store.write(save);
    },
    resetProgress() {
      save = store.reset();
    },
    go(route) {
      window.location.hash = routeToHash(route);
    },
  };
}
```

- [ ] **Step 4: Implement the small components**

`src/ui/components/stars.ts`:
```ts
import type { Stars } from "../../engine/types";

export function starsLabel(stars: Stars | undefined): string {
  return stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : "";
}
```

`src/ui/components/ferris.ts` (an original crab drawing in the spirit of Ferris, the public-domain Rust mascot):
```ts
const FERRIS = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 44" class="ferris-art" aria-hidden="true">
  <g fill="#f74c00" stroke="#a52b00" stroke-width="1.5" stroke-linejoin="round">
    <path d="M14 34 l-8 8 M20 36 l-5 7 M50 34 l8 8 M44 36 l5 7" fill="none" stroke-width="3" stroke-linecap="round"/>
    <path d="M10 20 q-9 -9 -1 -16 q0 7 6 9 z"/>
    <path d="M54 20 q9 -9 1 -16 q0 7 -6 9 z"/>
    <ellipse cx="32" cy="26" rx="22" ry="13"/>
  </g>
  <circle cx="25" cy="21" r="4" fill="#fff"/>
  <circle cx="39" cy="21" r="4" fill="#fff"/>
  <circle cx="26" cy="21.5" r="2" fill="#111"/>
  <circle cx="40" cy="21.5" r="2" fill="#111"/>
  <path d="M27 30 q5 4 10 0" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

/** A fresh Ferris SVG, `width` px wide. The markup is a constant, so innerHTML is safe here. */
export function ferrisSvg(width: number): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = FERRIS.trim();
  const svg = template.content.firstElementChild as SVGSVGElement;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(Math.round((width * 44) / 64)));
  return svg;
}
```

`src/ui/components/badge.ts`:
```ts
/** A gold medal showing the island number. Only a number is interpolated, so innerHTML is safe. */
export function badgeSvg(islandNumber: number): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" class="badge" viewBox="0 0 100 120" width="120" height="144" aria-hidden="true">
  <path d="M30 0 h14 l6 30 l6 -30 h14 l-12 40 h-16 z" fill="#3fb6e0"/>
  <circle cx="50" cy="74" r="40" fill="#f2b632" stroke="#a87700" stroke-width="5"/>
  <circle cx="50" cy="74" r="29" fill="none" stroke="#fff3c4" stroke-width="2"/>
  <text x="50" y="87" text-anchor="middle" font-size="36" font-weight="700" fill="#5a3d00">${Math.trunc(islandNumber)}</text>
</svg>`.trim();
  return template.content.firstElementChild as SVGSVGElement;
}
```

`src/ui/components/hpBar.ts`:
```ts
import { h } from "../dom";

export interface HpBar {
  set(remaining: number): void;
}

export function createHpBar(parent: HTMLElement, name: string, total: number): HpBar {
  const fill = h("div", { class: "hp-fill" });
  const label = h("span", { class: "hp-label" });
  const bar = h("div", { class: "hp", role: "meter", "aria-label": `${name} health`, "aria-valuemin": 0, "aria-valuemax": total }, fill);
  parent.append(h("div", { class: "hp-wrap" }, label, bar));
  const set = (remaining: number) => {
    fill.style.width = `${total === 0 ? 0 : (remaining / total) * 100}%`;
    bar.setAttribute("aria-valuenow", String(remaining));
    label.textContent = `${name}: ${remaining}/${total} HP`;
  };
  set(total);
  return { set };
}
```

`src/ui/components/console.ts`:
```ts
import { h } from "../dom";

const NOISE = /^\s*(Compiling|Finished|Running) |^error: test failed, to rerun/;

/** Drops cargo's progress lines so players only see compiler messages. */
export function cleanCargoNoise(stderr: string): string {
  return stderr
    .split("\n")
    .filter((line) => !NOISE.test(line))
    .join("\n")
    .trim();
}

/** Turns codes like E0384 into links to the official error index. */
export function linkErrorCodes(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(/\bE\d{4}\b/g)) {
    const index = match.index ?? 0;
    fragment.append(text.slice(last, index));
    fragment.append(
      h("a", { href: `https://doc.rust-lang.org/error_codes/${match[0]}.html`, target: "_blank", rel: "noopener" }, match[0]),
    );
    last = index + match[0].length;
  }
  fragment.append(text.slice(last));
  return fragment;
}

export type MessageKind = "info" | "success" | "error";

export interface GameConsole {
  showRunning(): void;
  showOutput(stdout: string, stderr: string, heading?: { text: string; kind: MessageKind }): void;
  showError(message: string, onRetry: () => void): void;
}

export function createConsole(parent: HTMLElement): GameConsole {
  const el = h("div", { class: "console", role: "log", "aria-live": "polite" });
  parent.append(el);
  const message = (text: string, kind: MessageKind) => h("p", { class: `console-msg ${kind}` }, text);
  return {
    showRunning() {
      el.replaceChildren(message("Compiling on the Rust Playground…", "info"));
    },
    showOutput(stdout, stderr, heading) {
      el.replaceChildren();
      if (heading) el.append(message(heading.text, heading.kind));
      const errors = cleanCargoNoise(stderr);
      if (stdout.trim()) el.append(h("pre", { class: "out" }, stdout.trimEnd()));
      if (errors) {
        const pre = h("pre", { class: "err" });
        pre.append(linkErrorCodes(errors));
        el.append(pre);
      }
      if (!stdout.trim() && !errors && !heading) el.append(message("(no output)", "info"));
    },
    showError(text, onRetry) {
      el.replaceChildren(message(text, "error"), h("button", { class: "btn", onclick: onRetry }, "Retry"));
    },
  };
}
```

`src/ui/components/codeEditor.ts`:
```ts
import { indentWithTab } from "@codemirror/commands";
import { rust } from "@codemirror/lang-rust";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";

export interface CodeEditor {
  getCode(): string;
  setCode(code: string): void;
  destroy(): void;
}

const theme = EditorView.theme({
  "&": { backgroundColor: "#fdfaf3", color: "#1a1a1a", fontSize: "15px" },
  ".cm-content": { fontFamily: "var(--mono)", caretColor: "#f74c00" },
  ".cm-gutters": { backgroundColor: "#f1ebdd", color: "#8a7f6a", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#f6eedc" },
});

export function createCodeEditor(parent: HTMLElement, code: string): CodeEditor {
  const view = new EditorView({
    parent,
    doc: code,
    extensions: [basicSetup, keymap.of([indentWithTab]), rust(), theme],
  });
  return {
    getCode: () => view.state.doc.toString(),
    setCode: (next) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } }),
    destroy: () => view.destroy(),
  };
}
```

`src/ui/components/runner.ts`:
```ts
import { runCode } from "../../playground/client";
import { h } from "../dom";
import { createCodeEditor } from "./codeEditor";
import { createConsole } from "./console";

/** An editable copy of a tutorial example that runs on the Rust Playground. */
export function createRunner(parent: HTMLElement, code: string): { destroy(): void } {
  const editorHost = h("div", { class: "editor" });
  const consoleHost = h("div");
  const runButton = h("button", { class: "btn primary" }, "▶ Run");
  const wrap = h("div", { class: "runner" }, editorHost, runButton, consoleHost);
  parent.append(wrap);
  const editor = createCodeEditor(editorHost, code);
  const output = createConsole(consoleHost);

  async function run(): Promise<void> {
    runButton.disabled = true;
    output.showRunning();
    const result = await runCode(editor.getCode(), { tests: false });
    runButton.disabled = false;
    if (!result.ok) output.showError(result.message, () => void run());
    else output.showOutput(result.stdout, result.stderr);
  }
  runButton.addEventListener("click", () => void run());

  return {
    destroy() {
      editor.destroy();
      wrap.remove();
    },
  };
}
```

`src/ui/components/tutorialPage.ts`:
```ts
import type { TutorialPage } from "../../engine/types";
import { h } from "../dom";
import { prose } from "../markdown";
import { codeBlock } from "./codeBlock";
import { createRunner } from "./runner";

const TAGS = { beginner: "Programming basics", experienced: "Coming from another language" } as const;

export function renderTutorialPage(page: TutorialPage): { el: HTMLElement; destroy(): void } {
  const el = h("article", { class: "tutorial-page" },
    page.audience === "all" ? null : h("span", { class: `tag ${page.audience}` }, TAGS[page.audience]),
    h("h2", {}, page.title),
    prose(page.text),
    page.code ? codeBlock(page.code) : null);

  let runner: { destroy(): void } | null = null;
  const code = page.code;
  if (code && page.runnable) {
    const button = h("button", { class: "btn" }, "▶ Run it yourself");
    button.addEventListener("click", () => {
      button.remove();
      runner = createRunner(el, code);
    });
    el.append(button);
  }
  return { el, destroy: () => runner?.destroy() };
}
```

`src/ui/components/hud.ts`:
```ts
import { totalStars } from "../../engine/progress";
import { routeToHash } from "../../router";
import type { AppContext } from "../app";
import { h } from "../dom";
import { ferrisSvg } from "./ferris";

export function renderHud(ctx: AppContext): HTMLElement {
  const save = ctx.getSave();
  return h("header", { class: "hud" },
    h("a", { class: "brand", href: routeToHash({ name: "map" }) }, ferrisSvg(32), "PlayRusty"),
    h("div", { class: "stats" },
      h("span", { title: "Experience points" }, `⚡ ${save.xp} XP`),
      h("span", { title: "Stars earned" }, `★ ${totalStars(save)}`),
      h("span", { title: "Island badges" }, `🏅 ${Object.keys(save.bosses).length}`)),
    h("a", { class: "btn small", href: routeToHash({ name: "settings" }) }, "Settings"),
    ctx.persistent ? null : h("p", { class: "notice" }, "Your browser is blocking storage, so progress won't be saved after you close this tab."));
}
```

- [ ] **Step 5: Replace `src/styles/main.css`**

```css
:root {
  --sea-deep: #0a2233;
  --sea: #0f3550;
  --card: #15435f;
  --card-hover: #1b5274;
  --line: #2b6a8c;
  --text: #f3efe6;
  --muted: #a9c3d3;
  --rust: #f74c00;
  --rust-soft: #ff8a4c;
  --sand: #e9d3a6;
  --good: #4cc38a;
  --bad: #ff7a7a;
  --gold: #f2b632;
  --mono: ui-monospace, "Cascadia Code", "Fira Code", Consolas, monospace;
  --radius: 12px;
  color-scheme: dark;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at 50% 0%, var(--sea) 0%, var(--sea-deep) 70%) fixed;
  color: var(--text);
  font: 17px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
a { color: var(--rust-soft); }
:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
main { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px; }
main.map { max-width: 1200px; }
h1 { font-size: 2rem; margin: 0.4em 0; }
.muted { color: var(--muted); }
.center { text-align: center; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.row { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }

.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;
  border-radius: 999px; border: 2px solid var(--line); background: var(--card);
  color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer;
}
.btn:hover:not(:disabled) { background: var(--card-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: var(--rust); border-color: var(--rust); color: #fff; }
.btn.primary:hover:not(:disabled) { background: #ff5f14; }
.btn.danger { border-color: var(--bad); color: var(--bad); }
.btn.small { padding: 4px 12px; font-size: 0.9rem; }
.btn.big { font-size: 1.2rem; padding: 14px 28px; }

.hud {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 10px 16px;
  background: rgba(0, 0, 0, 0.25); border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 8px; color: var(--text); font-weight: 800; text-decoration: none; font-size: 1.1rem; }
.stats { display: flex; gap: 16px; margin-left: auto; font-weight: 600; }
.notice { width: 100%; margin: 0; color: var(--gold); font-size: 0.9rem; }

.title-screen { text-align: center; padding-top: 48px; }
.title-screen h1 { font-size: 3.2rem; margin: 0.2em 0 0; color: var(--rust-soft); }
.tagline { font-size: 1.2rem; color: var(--muted); }
.mode-pick { display: grid; gap: 14px; max-width: 520px; margin: 32px auto 0; }
.mode-pick h2 { font-size: 1.2rem; }
.card-btn {
  display: grid; gap: 4px; text-align: left; padding: 18px 22px; border-radius: var(--radius);
  border: 2px solid var(--line); background: var(--card); color: var(--text); font: inherit; cursor: pointer;
}
.card-btn:hover { border-color: var(--rust); background: var(--card-hover); }
.card-btn span { color: var(--muted); }
.title-actions { display: flex; justify-content: center; gap: 12px; margin-top: 32px; flex-wrap: wrap; }

.settings fieldset { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 18px; }
.radio { display: flex; gap: 10px; align-items: center; padding: 6px 0; cursor: pointer; }

.map-svg { width: 100%; height: auto; display: block; }
.route { fill: none; stroke: var(--sand); stroke-width: 4; stroke-dasharray: 2 14; stroke-linecap: round; opacity: 0.6; }
.island-node .land { fill: #2f7d4f; stroke: var(--sand); stroke-width: 6; }
.island-node text { text-anchor: middle; fill: #fff; font-weight: 700; pointer-events: none; }
.island-node .num { font-size: 22px; }
.island-node .name { font-size: 14px; }
.island-node .topic { font-size: 12px; font-weight: 500; fill: var(--sand); }
.island-node.open, .island-node.done { cursor: pointer; }
.island-node.open:hover .land { fill: #3a9a62; }
.island-node.done .land { fill: #2a6b8a; }
.island-node.locked .land { fill: #4b5560; stroke: #7c8791; }
.island-node.soon .land { fill: #1d3d52; stroke: #4a6b80; stroke-dasharray: 10 8; }
.island-node.soon text { fill: #8fa9b8; }
.island-node:focus { outline: none; }
.island-node:focus-visible .land { stroke: var(--gold); stroke-width: 8; }
.ferris { transition: transform 1.2s ease-in-out; pointer-events: none; }

.back { display: inline-block; margin-bottom: 8px; }
.stage-list { list-style: none; padding: 0; display: grid; gap: 10px; }
.stage-card {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 20px;
  border-radius: var(--radius); background: var(--card); border: 2px solid var(--line);
  color: var(--text); text-decoration: none; font-weight: 600;
}
a.stage-card:hover { border-color: var(--rust); background: var(--card-hover); }
.stage-card.locked { opacity: 0.6; }
.stage-card.boss { margin-top: 18px; border-color: var(--rust); }
.stars { color: var(--gold); letter-spacing: 2px; }
.stars.big { font-size: 2.4rem; margin: 8px 0; }

.step { color: var(--muted); font-size: 0.85rem; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
.tutorial-page, .puzzle, .stage-done {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px 24px; margin-top: 12px;
}
.tag { display: inline-block; font-size: 0.8rem; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.tag.beginner { background: #2f7d4f; }
.tag.experienced { background: #6b4fbf; }
.prose code, .prompt code {
  font-family: var(--mono); background: rgba(0, 0, 0, 0.3); padding: 1px 6px; border-radius: 6px; font-size: 0.92em;
}
pre.code {
  font-family: var(--mono); font-size: 0.95rem; background: #08192a; border: 1px solid var(--line);
  border-radius: 10px; padding: 14px 16px; overflow-x: auto; margin: 12px 0; line-height: 1.5;
}
pre.code code { font-family: inherit; }
.gap {
  font-family: var(--mono); font-size: inherit; background: #fff8e0; color: #1a1a1a;
  border: 2px solid var(--gold); border-radius: 6px; padding: 0 4px; width: 7ch;
}
.choices { display: grid; gap: 10px; }
.choice {
  text-align: left; padding: 12px 16px; border-radius: 10px; border: 2px solid var(--line);
  background: var(--sea-deep); color: var(--text); font: inherit; cursor: pointer;
}
.choice:hover:not(:disabled) { border-color: var(--rust); }
.choice pre.code { margin: 0; border: none; background: transparent; padding: 0; }
.lines {
  font-family: var(--mono); background: #08192a; border: 1px solid var(--line);
  border-radius: 10px; padding: 8px 0; margin: 12px 0; overflow-x: auto;
}
.line {
  display: flex; gap: 14px; width: 100%; text-align: left; background: transparent; border: none;
  color: var(--text); font: inherit; padding: 2px 16px; cursor: pointer; white-space: pre;
}
.line:hover:not(:disabled) { background: rgba(247, 76, 0, 0.25); }
.ln { color: var(--muted); min-width: 2ch; text-align: right; user-select: none; }
.feedback .good { color: var(--good); font-weight: 700; }
.feedback .bad { color: var(--bad); font-weight: 700; }

.editor { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; margin: 12px 0; }
.editor .cm-editor { max-height: 480px; }
.console pre {
  font-family: var(--mono); font-size: 0.88rem; white-space: pre-wrap; background: #050f19;
  border-radius: 10px; padding: 12px 14px; margin: 8px 0;
}
.console pre.err { color: #ffd2c2; }
.console-msg.info { color: var(--muted); }
.console-msg.success { color: var(--good); font-weight: 700; }
.console-msg.error { color: var(--bad); font-weight: 700; }

.hp-wrap { margin: 16px 0; }
.hp-label { font-weight: 700; }
.hp { height: 18px; background: #3a1010; border-radius: 999px; overflow: hidden; border: 2px solid #000; }
.hp-fill { height: 100%; background: linear-gradient(90deg, #e33, var(--rust)); transition: width 0.6s ease; }
.hints li { margin: 6px 0; color: var(--sand); }

.celebrate { text-align: center; padding-top: 40px; }
.celebrate .row { justify-content: center; }

@media (prefers-reduced-motion: reduce) {
  .ferris, .hp-fill { transition: none; }
}
@media (max-width: 600px) {
  body { font-size: 16px; }
  .stats { margin-left: 0; }
  .tutorial-page, .puzzle, .stage-done { padding: 16px; }
}
```

- [ ] **Step 6: Run to see the tests pass**

Run: `npx vitest run tests/components.test.ts`, then `npm test`, then `npm run typecheck`
Expected: every test passes and there are no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/ui src/styles tests/components.test.ts
git commit -m "feat: add UI components (editor, console, runner, HUD, Ferris) and styles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: App shell, title screen and settings

**Files:**
- Create: `src/ui/screens/title.ts`, `src/ui/screens/settings.ts`
- Modify: `src/main.ts` (full rewrite)

**Interfaces:**
- Consumes: `createSaveStore` and `getBrowserStorage` (Task 4); `islands` and `comingSoon` (Task 2/7); `createAppContext`, `AppContext`, `Cleanup` and `noop` (Task 10); `onRouteChange` and `Route` (Task 8); `renderHud` and `ferrisSvg` (Task 10); `prose` (Task 8).
- Produces:
  - `renderTitle(root: HTMLElement, ctx: AppContext): Cleanup`
  - `renderSettings(root: HTMLElement, ctx: AppContext): Cleanup`
  - the screen dispatcher in `main.ts`. Later tasks add map, island, stage, boss and celebrate to it.

- [ ] **Step 1: Implement `src/ui/screens/title.ts`**

```ts
import type { Mode } from "../../engine/types";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { ferrisSvg } from "../components/ferris";
import { h } from "../dom";

export function renderTitle(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const pickMode = (mode: Mode) => {
    ctx.update((s) => ({ ...s, mode }));
    ctx.go({ name: "map" });
  };

  const actions =
    save.mode === null
      ? h("div", { class: "mode-pick" },
          h("h2", {}, "Before we set sail: how much programming do you know?"),
          h("button", { class: "card-btn", onclick: () => pickMode("beginner") },
            h("strong", {}, "I'm new to programming"),
            h("span", {}, "Explain the basics too: what variables, functions and decisions are.")),
          h("button", { class: "card-btn", onclick: () => pickMode("experienced") },
            h("strong", {}, "I already know another language"),
            h("span", {}, "Skip the general basics and show me how Rust does it.")),
          h("p", { class: "muted" }, "You can change this any time in Settings."))
      : h("div", { class: "title-actions" },
          h("button", { class: "btn primary big", onclick: () => ctx.go({ name: "map" }) }, "Continue your journey"),
          h("a", { class: "btn", href: routeToHash({ name: "settings" }) }, "Settings"));

  root.append(
    h("main", { class: "title-screen" },
      ferrisSvg(160),
      h("h1", {}, "PlayRusty"),
      h("p", { class: "tagline" }, "Learn Rust by sailing an archipelago of puzzles with Ferris the crab."),
      actions),
  );
  return noop;
}
```

- [ ] **Step 2: Implement `src/ui/screens/settings.ts`**

```ts
import type { Mode } from "../../engine/types";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";

const CREDITS =
  "The curriculum follows [rustlings](https://github.com/rust-lang/rustlings) (MIT licence). " +
  "Your code is compiled by the official [Rust Playground](https://play.rust-lang.org). " +
  "Ferris the crab is the unofficial Rust mascot, released into the public domain by Karen Rustad Tölva.";

export function renderSettings(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const modeOption = (mode: Mode, label: string) =>
    h("label", { class: "radio" },
      h("input", { type: "radio", name: "mode", value: mode, checked: save.mode === mode, onchange: () => ctx.update((s) => ({ ...s, mode })) }),
      label);

  const reset = () => {
    if (window.confirm("Reset all progress? Your XP, stars, badges and boss code will be erased.")) {
      ctx.resetProgress();
      ctx.go({ name: "title" });
    }
  };

  root.append(
    renderHud(ctx),
    h("main", { class: "settings" },
      h("h1", {}, "Settings"),
      h("fieldset", {},
        h("legend", {}, "Learner mode"),
        modeOption("beginner", "I'm new to programming"),
        modeOption("experienced", "I already know another language")),
      h("section", {}, h("h2", {}, "Progress"), h("button", { class: "btn danger", onclick: reset }, "Reset progress")),
      h("section", {}, h("h2", {}, "Credits"), prose(CREDITS)),
      h("a", { class: "btn", href: routeToHash({ name: "map" }) }, "Back to the map")),
  );
  return noop;
}
```

- [ ] **Step 3: Rewrite `src/main.ts`**

```ts
import "./styles/main.css";
import { comingSoon, islands } from "./content/index";
import { createSaveStore, getBrowserStorage } from "./engine/save";
import { onRouteChange, type Route } from "./router";
import { createAppContext, type Cleanup } from "./ui/app";
import { renderSettings } from "./ui/screens/settings";
import { renderTitle } from "./ui/screens/title";

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Missing #app element");
const root: HTMLElement = rootElement;

const ctx = createAppContext(createSaveStore(getBrowserStorage()), islands, comingSoon);
let cleanup: Cleanup | null = null;

function show(route: Route): void {
  cleanup?.();
  cleanup = null;
  root.replaceChildren();
  window.scrollTo(0, 0);

  if (ctx.getSave().mode === null && route.name !== "title" && route.name !== "settings") {
    ctx.go({ name: "title" });
    return;
  }

  switch (route.name) {
    case "title":
      cleanup = renderTitle(root, ctx);
      break;
    case "settings":
      cleanup = renderSettings(root, ctx);
      break;
    default:
      // Screens for the remaining routes are added in later tasks.
      cleanup = renderTitle(root, ctx);
  }
}

onRouteChange(show);
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, then open `http://localhost:5173/PlayRusty/`
Expected:
- The title screen shows Ferris, "PlayRusty" and the two mode cards.
- Clicking "I'm new to programming" changes the URL to `#/map`. The title screen renders again, because of the `default` branch, and now shows "Continue your journey".
- `#/settings` shows the radio set to the chosen mode. Switching it and reloading keeps the new choice.
- "Reset progress", confirmed, brings back the mode cards.
- There are no console errors.

- [ ] **Step 5: Typecheck, test and commit**

Run: `npm run typecheck`, then `npm test` (expected: no errors, every test passes)

```bash
git add src/main.ts src/ui/screens
git commit -m "feat: add app shell, title screen with learner modes, and settings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: World map and island screens

**Files:**
- Create: `src/ui/screens/mapLayout.ts`, `src/ui/screens/map.ts`, `src/ui/screens/island.ts`, `tests/mapLayout.test.ts`
- Modify: `src/main.ts` (add the `map` and `island` cases)

**Interfaces:**
- Consumes:
  - from progress (Task 3): `currentIslandId`, `isBossDefeated`, `isIslandUnlocked`, `isStageUnlocked`, `isBossUnlocked`, `visibleStages`, `modeOf`, `stageKey`
  - from Task 10: `renderHud`, `ferrisSvg`, `starsLabel`
  - `routeToHash` and `h` from Task 8
- Produces:
  - `mapSlot(index: number, cols?: number): { x: number; y: number }`
  - `mapSize(count: number, cols?: number): { width: number; height: number }`
  - `renderMap(root, ctx): Cleanup`
  - `renderIsland(root, ctx, islandId): Cleanup`

- [ ] **Step 1: Write failing layout tests** in `tests/mapLayout.test.ts`

```ts
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
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/mapLayout.test.ts`
Expected: FAIL, because the module can't be resolved.

- [ ] **Step 3: Implement `src/ui/screens/mapLayout.ts`**

```ts
export interface Point {
  x: number;
  y: number;
}

export const MAP_COLUMNS = 6;
const MARGIN = 110;
const COLUMN_GAP = 196;
const ROW_GAP = 190;

/** Position of the index-th island on a snaking path (even rows run left→right, odd rows right→left). */
export function mapSlot(index: number, cols = MAP_COLUMNS): Point {
  const row = Math.floor(index / cols);
  const position = index % cols;
  const column = row % 2 === 0 ? position : cols - 1 - position;
  return { x: MARGIN + column * COLUMN_GAP, y: MARGIN + row * ROW_GAP };
}

export function mapSize(count: number, cols = MAP_COLUMNS): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(count / cols));
  return { width: 2 * MARGIN + (cols - 1) * COLUMN_GAP, height: 2 * MARGIN + (rows - 1) * ROW_GAP };
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run tests/mapLayout.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/ui/screens/map.ts`**

```ts
import { currentIslandId, isBossDefeated, isIslandUnlocked } from "../../engine/progress";
import type { Island } from "../../engine/types";
import { noop, type AppContext, type Cleanup } from "../app";
import { ferrisSvg } from "../components/ferris";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { mapSize, mapSlot } from "./mapLayout";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Where Ferris stood the last time the map was shown, so he can walk to his new island. */
let ferrisWasAt: string | null = null;

interface MapEntry {
  number: number;
  name: string;
  topic: string;
  island?: Island;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function svgText(className: string, y: number, text: string): SVGTextElement {
  const el = svg("text", { class: className, y });
  el.textContent = text;
  return el;
}

export function renderMap(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const entries: MapEntry[] = [
    ...ctx.islands.map((island) => ({ number: island.number, name: island.name, topic: island.topic, island })),
    ...ctx.comingSoon,
  ].sort((a, b) => a.number - b.number);

  const { width, height } = mapSize(entries.length);
  const map = svg("svg", { viewBox: `0 0 ${width} ${height}`, class: "map-svg", role: "group", "aria-label": "World map" });
  const points = entries.map((_, i) => {
    const p = mapSlot(i);
    return `${p.x},${p.y}`;
  });
  map.append(svg("polyline", { class: "route", points: points.join(" ") }));

  entries.forEach((entry, index) => {
    const { x, y } = mapSlot(index);
    const island = entry.island;
    const unlocked = island !== undefined && isIslandUnlocked(ctx.islands, island.id, save);
    const done = island !== undefined && isBossDefeated(save, island.id);
    const state = !island ? "soon" : done ? "done" : unlocked ? "open" : "locked";
    const node = svg("g", { class: `island-node ${state}`, transform: `translate(${x} ${y})` });
    const title = svg("title");
    title.textContent = `${entry.number}. ${entry.name}: ${entry.topic}`;
    const topicText = !island ? "coming soon" : unlocked ? entry.topic : `🔒 ${entry.topic}`;
    node.append(
      title,
      svg("circle", { r: 62, class: "land" }),
      svgText("num", -14, done ? "🏅" : String(entry.number)),
      svgText("name", 10, entry.name),
      svgText("topic", 30, topicText),
    );
    if (island && unlocked) {
      const open = () => ctx.go({ name: "island", islandId: island.id });
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "link");
      node.setAttribute("aria-label", `Island ${entry.number}: ${entry.name}, ${entry.topic}${done ? ", completed" : ""}`);
      node.addEventListener("click", open);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
    map.append(node);
  });

  const target = currentIslandId(ctx.islands, save);
  const targetIndex = entries.findIndex((entry) => entry.island?.id === target);
  if (targetIndex >= 0) {
    const ferris = svg("g", { class: "ferris" });
    const art = ferrisSvg(56);
    art.setAttribute("x", "-28");
    art.setAttribute("y", "-100");
    ferris.append(art);
    map.append(ferris);
    const place = (index: number) => {
      const p = mapSlot(index);
      ferris.style.transform = `translate(${p.x}px, ${p.y}px)`;
    };
    const fromIndex = entries.findIndex((entry) => entry.island?.id === ferrisWasAt);
    if (fromIndex >= 0 && fromIndex !== targetIndex) {
      place(fromIndex);
      requestAnimationFrame(() => requestAnimationFrame(() => place(targetIndex)));
    } else {
      place(targetIndex);
    }
    ferrisWasAt = target;
  }

  root.append(
    renderHud(ctx),
    h("main", { class: "map" },
      h("h1", { class: "visually-hidden" }, "World map"),
      map,
      h("p", { class: "muted center" },
        `Islands ${ctx.islands.length + 1} to ${entries.length} are still being built. PlayRusty is open source, and new islands are welcome!`)),
  );
  return noop;
}
```

- [ ] **Step 6: Implement `src/ui/screens/island.ts`**

```ts
import { isBossUnlocked, isIslandUnlocked, isStageUnlocked, modeOf, stageKey, visibleStages } from "../../engine/progress";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { h } from "../dom";

export function renderIsland(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const island = ctx.islands.find((i) => i.id === islandId);
  if (!island || !isIslandUnlocked(ctx.islands, islandId, save)) {
    ctx.go({ name: "map" });
    return noop;
  }

  const list = h("ol", { class: "stage-list" });
  for (const stage of visibleStages(island, modeOf(save))) {
    const unlocked = isStageUnlocked(ctx.islands, island.id, stage.id, save);
    const stars = save.stages[stageKey(island.id, stage.id)]?.stars;
    list.append(
      h("li", {},
        unlocked
          ? h("a", { class: "stage-card", href: routeToHash({ name: "stage", islandId: island.id, stageId: stage.id }) },
              h("span", {}, stage.title),
              h("span", { class: "stars", "aria-label": stars ? `${stars} of 3 stars` : "not completed" }, starsLabel(stars)))
          : h("div", { class: "stage-card locked", "aria-disabled": "true" }, h("span", {}, `🔒 ${stage.title}`))),
    );
  }

  const bossStars = save.bosses[island.id]?.stars;
  const bossCard = isBossUnlocked(ctx.islands, island.id, save)
    ? h("a", { class: "stage-card boss", href: routeToHash({ name: "boss", islandId: island.id }) },
        h("span", {}, `⚔ Boss: ${island.boss.name}`),
        h("span", { class: "stars" }, starsLabel(bossStars)))
    : h("div", { class: "stage-card boss locked", "aria-disabled": "true" },
        h("span", {}, `🔒 Boss: ${island.boss.name}`),
        h("span", { class: "muted" }, "Finish every stage to face the boss"));

  root.append(
    renderHud(ctx),
    h("main", { class: "island-screen" },
      h("a", { class: "back", href: routeToHash({ name: "map" }) }, "← World map"),
      h("h1", {}, `${island.number}. ${island.name}`),
      h("p", { class: "muted" }, `Topic: ${island.topic} · `,
        h("a", { href: island.rustBook, target: "_blank", rel: "noopener" }, "Read the Rust Book chapter")),
      list,
      bossCard),
  );
  return noop;
}
```

- [ ] **Step 7: Add the routes to `src/main.ts`**

Add imports:
```ts
import { renderIsland } from "./ui/screens/island";
import { renderMap } from "./ui/screens/map";
```
Add cases before `default:`:
```ts
    case "map":
      cleanup = renderMap(root, ctx);
      break;
    case "island":
      cleanup = renderIsland(root, ctx, route.islandId);
      break;
```

- [ ] **Step 8: Verify in the browser**

Run: `npm run dev`, then open `http://localhost:5173/PlayRusty/#/map`
Expected:
- The map shows 23 islands on a snaking dotted path. Island 1, Mutable Marsh, is green with Ferris above it. Islands 2–23 are dashed "coming soon" circles.
- Tab focuses island 1, and Enter opens `#/island/variables`.
- The island screen lists the five stages. Only "The Harbor" is a link; the others and the boss are locked.
- The Rust Book link opens in a new tab.
- In Settings, switching to "I already know another language" changes nothing on island 1, because it has no beginnerOnly stages.
- There are no console errors.

- [ ] **Step 9: Typecheck, test and commit**

Run: `npm run typecheck`, then `npm test`

```bash
git add src/ui/screens src/main.ts tests/mapLayout.test.ts
git commit -m "feat: add world map with Ferris and island stage list" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Stage screen (tutorial, then puzzles, then result)

**Files:**
- Create: `src/ui/screens/stage.ts`
- Modify: `src/main.ts` (add the `stage` case)

**Interfaces:**
- Consumes:
  - from progress: `isStageUnlocked`, `modeOf`, `recordPuzzleSolved`, `recordStageComplete`, `starsForMistakes`, `visiblePages`, `visibleStages`
  - from earlier tasks: `renderPuzzle` (Task 9); `renderTutorialPage`, `renderHud` and `starsLabel` (Task 10); `prose`, `h` and `routeToHash` (Task 8)
- Produces: `renderStage(root, ctx, islandId, stageId): Cleanup`

- [ ] **Step 1: Implement `src/ui/screens/stage.ts`**

```ts
import {
  isStageUnlocked, modeOf, recordPuzzleSolved, recordStageComplete, starsForMistakes, visiblePages, visibleStages,
} from "../../engine/progress";
import type { Island, Stage } from "../../engine/types";
import { renderPuzzle } from "../../puzzles/index";
import { routeToHash, type Route } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { renderTutorialPage } from "../components/tutorialPage";
import { h } from "../dom";
import { prose } from "../markdown";

export function renderStage(root: HTMLElement, ctx: AppContext, islandId: string, stageId: string): Cleanup {
  const save = ctx.getSave();
  const mode = modeOf(save);
  const foundIsland = ctx.islands.find((i) => i.id === islandId);
  if (!foundIsland) {
    ctx.go({ name: "map" });
    return noop;
  }
  const island: Island = foundIsland;
  const stages = visibleStages(island, mode);
  const foundStage = stages.find((s) => s.id === stageId);
  if (!foundStage || !isStageUnlocked(ctx.islands, islandId, stageId, save)) {
    ctx.go({ name: "island", islandId });
    return noop;
  }
  const stage: Stage = foundStage;
  const pages = visiblePages(stage, mode);

  let mistakes = 0;
  let cleanups: Cleanup[] = [];
  const main = h("main", { class: "stage" });
  root.append(renderHud(ctx), main);

  function clear(): void {
    cleanups.forEach((fn) => fn());
    cleanups = [];
    main.replaceChildren(h("a", { class: "back", href: routeToHash({ name: "island", islandId }) }, `← ${island.name}`));
  }

  function showPage(index: number): void {
    clear();
    const page = renderTutorialPage(pages[index]);
    cleanups.push(page.destroy);
    const last = index === pages.length - 1;
    main.append(
      h("p", { class: "step" }, `${stage.title}: lesson ${index + 1} of ${pages.length}`),
      page.el,
      h("div", { class: "row" },
        index > 0 ? h("button", { class: "btn", onclick: () => showPage(index - 1) }, "← Back") : null,
        h("button", { class: "btn primary", onclick: () => (last ? showPuzzle(0) : showPage(index + 1)) },
          last ? "Start the puzzles →" : "Next →")),
    );
  }

  function showPuzzle(index: number): void {
    clear();
    const puzzle = stage.puzzles[index];
    const area = h("div");
    const feedback = h("div", { class: "feedback", "aria-live": "polite" });
    main.append(
      h("p", { class: "step" }, `${stage.title}: puzzle ${index + 1} of ${stage.puzzles.length}`),
      h("section", { class: "puzzle" }, area, feedback),
    );

    let solved = false;
    renderPuzzle(puzzle, area, (correct) => {
      if (solved) return;
      if (!correct) {
        mistakes += 1;
        const tip = puzzle.type === "fillGap" ? puzzle.hint : puzzle.explanation;
        feedback.replaceChildren(h("p", { class: "bad" }, "✗ Not quite. Try again!"), prose(tip));
        return;
      }
      solved = true;
      ctx.update((s) => recordPuzzleSolved(s, island.id, stage.id, puzzle.id));
      area.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach((el) => (el.disabled = true));
      const isLast = index === stage.puzzles.length - 1;
      const next = h("button", { class: "btn primary", onclick: () => (isLast ? finish() : showPuzzle(index + 1)) },
        isLast ? "Finish the stage →" : "Continue →");
      feedback.replaceChildren(h("p", { class: "good" }, "✓ Correct!"), prose(puzzle.explanation), next);
      next.focus();
    });
  }

  function finish(): void {
    clear();
    ctx.update((s) => recordStageComplete(s, island.id, stage.id, mistakes));
    const nextStage = stages[stages.findIndex((s) => s.id === stage.id) + 1];
    const nextRoute: Route = nextStage
      ? { name: "stage", islandId: island.id, stageId: nextStage.id }
      : { name: "boss", islandId: island.id };
    main.append(
      h("section", { class: "stage-done" },
        h("h2", {}, `Stage complete: ${stage.title}`),
        h("p", { class: "stars big", "aria-label": `${starsForMistakes(mistakes)} of 3 stars` }, starsLabel(starsForMistakes(mistakes))),
        h("p", {}, mistakes === 0
          ? "Flawless: no mistakes!"
          : `${mistakes} mistake${mistakes === 1 ? "" : "s"}. Replay any time to earn more stars.`),
        h("div", { class: "row" },
          h("a", { class: "btn primary", href: routeToHash(nextRoute) },
            nextStage ? `Next: ${nextStage.title} →` : `Face the boss: ${island.boss.name} ⚔`),
          h("a", { class: "btn", href: routeToHash({ name: "island", islandId: island.id }) }, "Back to the island"))),
    );
  }

  if (pages.length > 0) showPage(0);
  else showPuzzle(0);
  return () => cleanups.forEach((fn) => fn());
}
```

Note: the HUD XP counter doesn't refresh mid-stage. It updates on the next screen, which is acceptable for v1.

- [ ] **Step 2: Add the route to `src/main.ts`**

Add the import `import { renderStage } from "./ui/screens/stage";` and this case before `default:`:
```ts
    case "stage":
      cleanup = renderStage(root, ctx, route.islandId, route.stageId);
      break;
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`. Reset progress in Settings, pick **beginner** mode, then open island 1 → The Harbor.

Expected:
1. The lesson pages appear with "Programming basics" tags on the beginner pages. Back and Next work.
2. On "Hello, Rust!", **Run it yourself** opens an editor. **Run** shows `Hello, Rust!` from the real Playground.
3. Disconnect the network in DevTools and press **Run**. The console shows "The compiler bridge is down…" with a Retry button.
4. In the puzzles:
   - Typing `x` in the fillGap shows the hint with a ✗.
   - Typing `!` shows ✓ and the explanation, then Continue.
   - The pickFix and predict buttons work.
5. The finish screen shows 2 stars after one mistake, and its link goes to the next stage.
6. Back on the island, The Harbor shows ★★☆, and "let and mut" is now unlocked.
7. In experienced mode, beginner pages are hidden and "Coming from another language" pages are shown.
8. There are no console errors.

- [ ] **Step 4: Typecheck, test and commit**

Run: `npm run typecheck`, then `npm test`

```bash
git add src/ui/screens/stage.ts src/main.ts
git commit -m "feat: add stage screen with tutorials, puzzles and results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Boss fight and celebration screens

**Files:**
- Create: `src/ui/screens/boss.ts`, `src/ui/screens/celebrate.ts`
- Modify: `src/main.ts` (add the `boss` and `celebrate` cases, and remove the now-unneeded `default` branch)

**Interfaces:**
- Consumes:
  - from progress: `isBossUnlocked` and `recordBossDefeated`
  - from Task 5: `runCode`, `buildBossProgram`, `countTests` and `parseTestOutput`
  - from Task 10: `createCodeEditor`, `createConsole`, `createHpBar`, `renderHud`, `badgeSvg` and `starsLabel`
  - `prose`, `h` and `routeToHash` from Task 8
- Produces:
  - `renderBoss(root, ctx, islandId): Cleanup`
  - `renderCelebrate(root, ctx, islandId): Cleanup`
  - `noteBossXp(xp: number): void`, which tells the celebration screen how much XP the win gave

- [ ] **Step 1: Implement `src/ui/screens/celebrate.ts`**

```ts
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { badgeSvg } from "../components/badge";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { h } from "../dom";

let xpFromLastWin = 0;

/** Called by the boss screen right before navigating here. */
export function noteBossXp(xp: number): void {
  xpFromLastWin = xp;
}

export function renderCelebrate(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const island = ctx.islands.find((i) => i.id === islandId);
  const result = save.bosses[islandId];
  if (!island || !result) {
    ctx.go({ name: "map" });
    return noop;
  }
  const next = ctx.islands[ctx.islands.indexOf(island) + 1];
  const xp = xpFromLastWin;
  xpFromLastWin = 0;

  root.append(
    renderHud(ctx),
    h("main", { class: "celebrate" },
      badgeSvg(island.number),
      h("h1", {}, `${island.boss.name} is defeated!`),
      h("p", { class: "stars big", "aria-label": `${result.stars} of 3 stars` }, starsLabel(result.stars)),
      h("p", {}, `You earned the ${island.name} badge${xp > 0 ? ` and ${xp} XP` : ""}.`),
      h("p", { class: "muted" }, next
        ? `A new island has appeared on the map: ${next.name}.`
        : "You've beaten every island built so far. More are on the way. Thanks for playing!"),
      h("div", { class: "row" },
        h("a", { class: "btn primary", href: routeToHash({ name: "map" }) }, next ? `Sail on to ${next.name} ⛵` : "Back to the map"),
        h("a", { class: "btn", href: routeToHash({ name: "island", islandId: island.id }) }, `Revisit ${island.name}`))),
  );
  return noop;
}
```

- [ ] **Step 2: Implement `src/ui/screens/boss.ts`**

```ts
import { isBossUnlocked, recordBossDefeated } from "../../engine/progress";
import type { Island } from "../../engine/types";
import { buildBossProgram, countTests } from "../../playground/bossProgram";
import { runCode } from "../../playground/client";
import { parseTestOutput } from "../../playground/testOutput";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { createCodeEditor } from "../components/codeEditor";
import { createConsole } from "../components/console";
import { createHpBar } from "../components/hpBar";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";
import { noteBossXp } from "./celebrate";

export function renderBoss(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const foundIsland = ctx.islands.find((i) => i.id === islandId);
  if (!foundIsland) {
    ctx.go({ name: "map" });
    return noop;
  }
  if (!isBossUnlocked(ctx.islands, islandId, save)) {
    ctx.go({ name: "island", islandId });
    return noop;
  }
  const island: Island = foundIsland;
  const boss = island.boss;
  const total = countTests(boss.tests);
  let hintsUsed = 0;
  let alive = true;

  const main = h("main", { class: "boss" });
  root.append(renderHud(ctx), main);
  main.append(
    h("a", { class: "back", href: routeToHash({ name: "island", islandId }) }, `← ${island.name}`),
    h("h1", {}, `⚔ ${boss.name}`),
    prose(boss.story),
    h("p", { class: "muted" }, "Fix the code below. When you press Run, hidden tests attack the boss: every passing test is a hit."),
  );
  const hp = createHpBar(main, boss.name, total);

  const editorHost = h("div", { class: "editor" });
  const runButton = h("button", { class: "btn primary" }, "▶ Run");
  const hintButton = h("button", { class: "btn", disabled: true, title: "Run your code once to unlock hints" },
    `Hint (0/${boss.hints.length})`);
  const resetButton = h("button", { class: "btn" }, "Reset code");
  const hintList = h("ol", { class: "hints" });
  const consoleHost = h("div");
  main.append(editorHost, h("div", { class: "row" }, runButton, hintButton, resetButton), hintList, consoleHost);

  const editor = createCodeEditor(editorHost, save.bossCode[island.id] ?? boss.starter);
  const output = createConsole(consoleHost);
  const persistCode = () =>
    ctx.update((s) => ({ ...s, bossCode: { ...s.bossCode, [island.id]: editor.getCode() } }));

  hintButton.addEventListener("click", () => {
    if (hintsUsed >= boss.hints.length) return;
    hintList.append(h("li", {}, prose(boss.hints[hintsUsed])));
    hintsUsed += 1;
    hintButton.textContent = `Hint (${hintsUsed}/${boss.hints.length})`;
    hintButton.disabled = hintsUsed >= boss.hints.length;
  });

  resetButton.addEventListener("click", () => {
    if (window.confirm("Replace your code with the original starter code?")) {
      editor.setCode(boss.starter);
      persistCode();
    }
  });

  async function run(): Promise<void> {
    persistCode();
    runButton.disabled = true;
    output.showRunning();
    const result = await runCode(buildBossProgram(editor.getCode(), boss.tests), { tests: true });
    if (!alive) return;
    runButton.disabled = false;
    if (!result.ok) {
      output.showError(result.message, () => void run());
      return;
    }
    hintButton.disabled = hintsUsed >= boss.hints.length;
    hintButton.removeAttribute("title");

    const report = parseTestOutput(result.stdout, result.stderr);
    if (!report.compiled) {
      hp.set(total);
      output.showOutput("", result.stderr, {
        text: "💥 Your attack fizzled: the code doesn't compile yet. Read the compiler's message below.",
        kind: "error",
      });
      return;
    }
    hp.set(total - report.passed.length);
    if (report.failed.length === 0 && report.passed.length === total) {
      const xpBefore = ctx.getSave().xp;
      ctx.update((s) => recordBossDefeated(s, island.id, hintsUsed));
      noteBossXp(ctx.getSave().xp - xpBefore);
      ctx.go({ name: "celebrate", islandId: island.id });
      return;
    }
    output.showOutput(result.stdout, "", {
      text: `${report.passed.length} of ${total} hits landed. ${boss.name} is still standing!`,
      kind: "info",
    });
  }
  runButton.addEventListener("click", () => void run());

  return () => {
    alive = false;
    persistCode();
    editor.destroy();
  };
}
```

- [ ] **Step 3: Finish the dispatcher in `src/main.ts`**

Add the imports:
```ts
import { renderBoss } from "./ui/screens/boss";
import { renderCelebrate } from "./ui/screens/celebrate";
```
Replace the `default:` branch, including its comment, with:
```ts
    case "boss":
      cleanup = renderBoss(root, ctx, route.islandId);
      break;
    case "celebrate":
      cleanup = renderCelebrate(root, ctx, route.islandId);
      break;
```
The switch now covers every `Route` variant.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`. Finish all five stages of island 1; experienced mode is faster. Then open the boss.

Expected:
1. The HP bar reads `The Immutable Golem: 4/4 HP`. Hint is disabled until the first Run.
2. **Run** on the untouched starter shows "Your attack fizzled", then compiler errors, with `E0384` and `E0381` as links. HP stays 4/4, and Hint becomes enabled.
3. Fix only `const GOLEM_HEIGHT: u32 = 12;` and `let mut coins`. The code still doesn't compile, because errors remain on the other lines.
4. Fix everything except the bridge length, using `let length: i32 = 0;`. Run shows "3 of 4 hits landed" with the failing test's output, and HP shows 1/4.
5. Fix it to 20. The game navigates to the celebration screen, showing the badge "1", stars based on the hints used, and "+50 XP".
6. Return to the map. Ferris walks toward island 1's 🏅. There is no island 2 yet, so he stays on island 1.
7. Reload while on the boss screen. Your edited code is restored.
8. There are no console errors.

- [ ] **Step 5: Typecheck, test and commit**

Run: `npm run typecheck`, then `npm test`

```bash
git add src/ui/screens src/main.ts
git commit -m "feat: add boss fights on the real compiler and celebration screen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Island 2 content — Function Fjord (Functions)

This island covers rustlings `02_functions`. Boss starter and solution were verified with cargo during planning: the starter fails with a parse error, E0308 ×3 and E0425; the solution passes 4/4.

**Files:**
- Create: `src/content/islands/02-functions.ts`
- Modify: `src/content/index.ts`

**Interfaces:**
- Consumes: `Island`, `rs` and `INTEGER_TYPES`
- Produces: `export const functionsIsland: Island` with `id: "functions"` and `number: 2`

- [ ] **Step 1: Create `src/content/islands/02-functions.ts`**

```ts
import type { Island } from "../../engine/types";
import { INTEGER_TYPES, rs } from "../helpers";

export const functionsIsland: Island = {
  id: "functions",
  number: 2,
  name: "Function Fjord",
  topic: "Functions",
  rustBook: "https://doc.rust-lang.org/book/ch03-03-how-functions-work.html",
  stages: [
    {
      id: "functions-101",
      title: "What is a function?",
      beginnerOnly: true,
      tutorial: [
        {
          audience: "beginner",
          title: "Named recipes",
          text:
            "A **function** is a named block of instructions, like a recipe. You write the recipe once, then **call** it by name whenever you need it.\n\n" +
            "You've already used one: `main` is a function. Rust calls it for you when your program starts.",
        },
        {
          audience: "beginner",
          title: "Define once, call many times",
          text:
            "Here we **define** a function called `cheer`, and `main` **calls** it twice by writing `cheer();`. Each call runs every instruction inside `cheer`, then the program continues where it left off.\n\n" +
            "Defining a function doesn't run it. Only calling it does.",
          code: rs`
            fn main() {
                cheer();
                cheer();
            }

            fn cheer() {
                println!("Hip hip, hooray!");
            }
          `,
          runnable: true,
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "calls-predict",
          prompt: "How many lines does this program print?",
          code: rs`
            fn main() {
                wave();
                wave();
                wave();
            }

            fn wave() {
                println!("o/");
            }
          `,
          choices: ["0", "1", "3"],
          correctIndex: 2,
          explanation: "`wave` is called three times, and each call prints one line.",
        },
        {
          type: "predict",
          id: "define-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                println!("Start");
            }

            fn secret() {
                println!("Secret!");
            }
          `,
          choices: ["Start", "Start, then Secret!", "Secret!, then Start"],
          correctIndex: 0,
          explanation: "`secret` is defined but never called, so it never runs. Rust even warns you that it's unused.",
        },
      ],
    },
    {
      id: "defining-functions",
      title: "Defining functions",
      tutorial: [
        {
          audience: "all",
          title: "The fn keyword",
          text:
            "Define a function with `fn`, a name, parentheses `()` and a body in curly braces. Function names use `snake_case`, like variables.\n\n" +
            "Call it by writing its name followed by `()` and a semicolon.",
          code: rs`
            fn main() {
                greet();
                println!("Back in main");
            }

            fn greet() {
                println!("Hello from greet!");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Order doesn't matter",
          text:
            "Functions can be defined before or after the code that calls them. Rust reads the whole file before running anything, so `main` can call `greet` even though `greet` is written below it.",
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust uses the short keyword `fn`, not `function` or `def`. Functions live at the top level of a file (or inside `impl` blocks, which come later), and their order doesn't matter, unlike Python scripts or C without prototypes.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "fn-gap",
          prompt: "Fill the gap to define the function.",
          code: rs`
            fn main() {
                call_me();
            }

            ___ call_me() {
                println!("Ring ring!");
            }
          `,
          answers: [["fn"]],
          hint: "Which short keyword starts a function definition?",
          explanation: "Functions are defined with `fn`.",
        },
        {
          type: "spotBug",
          id: "fn-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                greet();
            }

            function greet() {
                println!("Hi!");
            }
          `,
          bugLine: 5,
          explanation: "Rust's keyword is `fn`, not `function`.",
        },
        {
          type: "pickFix",
          id: "call-pick",
          prompt: "Which line inside `main` actually calls the function `say_hi`?",
          options: [
            { code: rs`say_hi;`, correct: false },
            { code: rs`call say_hi();`, correct: false },
            { code: rs`say_hi();`, correct: true },
          ],
          explanation: "Calling a function needs parentheses: `say_hi();`. Without them, `say_hi;` only names the function and does nothing.",
        },
      ],
    },
    {
      id: "parameters",
      title: "Parameters",
      tutorial: [
        {
          audience: "beginner",
          title: "Giving a function input",
          text:
            "Functions get more useful when you can hand them information. These inputs are called **parameters**. A recipe that says \"bake for N minutes\" is more flexible than one that always says 20.",
        },
        {
          audience: "all",
          title: "Parameters have types",
          text:
            "Parameters go inside the parentheses as `name: type`. In Rust the type is **required** for every parameter: `fn print_coins(amount: u32)`.\n\n" +
            "When you call the function, you pass a value for each parameter: `print_coins(5)`. Inside the function, `amount` is a normal variable holding that value.",
          code: rs`
            fn main() {
                print_coins(5);
                print_coins(12);
            }

            fn print_coins(amount: u32) {
                println!("You have {amount} coins");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Several parameters",
          text: "Separate parameters with commas, and give each one its own type. When calling, pass the values in the same order.",
          code: rs`
            fn main() {
                print_total(3, 4);
            }

            fn print_total(a: i32, b: i32) {
                println!("{a} + {b} = {}", a + b);
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Local variables get type inference, but function signatures never do: every parameter type (and the return type, next stage) is written explicitly. That keeps signatures reliable as documentation. There are no default parameters, optional parameters or overloading.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "param-gap",
          prompt: "Fill the gap with the parameter's type.",
          code: rs`
            fn main() {
                call_me(3);
            }

            fn call_me(num: ___) {
                println!("Ring! Call number {num}");
            }
          `,
          answers: [INTEGER_TYPES],
          hint: "Every parameter needs a type, and `3` is a whole number.",
          explanation: "Parameters must have a type annotation, for example `num: i32` or `num: u8`.",
        },
        {
          type: "pickFix",
          id: "arg-pick",
          prompt: "`fn call_me(num: u8)` takes one number. Which call compiles?",
          options: [
            { code: rs`call_me();`, correct: false },
            { code: rs`call_me(3);`, correct: true },
            { code: rs`call_me("3");`, correct: false },
          ],
          explanation: "You must pass exactly one value of the right type. `\"3\"` is text, not a number.",
        },
        {
          type: "spotBug",
          id: "param-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                add(1, 2);
            }

            fn add(a, b: i32) {
                println!("{}", a + b);
            }
          `,
          bugLine: 5,
          explanation: "Every parameter needs its own type: `fn add(a: i32, b: i32)`.",
        },
      ],
    },
    {
      id: "return-values",
      title: "Return values",
      tutorial: [
        {
          audience: "beginner",
          title: "Getting an answer back",
          text:
            "Some functions just do something, like printing. Others **compute** something and hand the result back to the caller. That result is the function's **return value**.",
        },
        {
          audience: "all",
          title: "The -> arrow",
          text:
            "Write the return type after an arrow: `-> i32`.\n\n" +
            "The last line of the body, `n * n`, has **no semicolon**. That makes it the value the function returns. You can store the result in a variable or use it directly.",
          code: rs`
            fn main() {
                let result = square(4);
                println!("4 squared is {result}");
            }

            fn square(n: i32) -> i32 {
                n * n
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Statements and expressions",
          text:
            "Rust separates **expressions**, which produce a value (`n * n`, `5`, `square(3)`), from **statements**, which just do something (`let x = 5;`).\n\n" +
            "Adding a semicolon turns an expression into a statement and throws its value away. So with `n * n;` the function returns nothing, and the compiler complains about `mismatched types`. This is one of the most common beginner mistakes!",
          code: rs`
            fn square(n: i32) -> i32 {
                n * n; // error: the semicolon throws the value away
            }
          `,
        },
        {
          audience: "all",
          title: "The return keyword",
          text:
            "You can also return with the `return` keyword: `return 42;`. It's mainly used to leave a function early. At the end of a function, Rust programmers usually just write the final expression without `return`.",
          code: rs`
            fn answer() -> i32 {
                return 42;
            }
          `,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust is expression-oriented: a block `{ ... }` evaluates to its last expression, so the final expression of a function body is its return value. A function without `->` returns `()`, the empty \"unit\" type, similar to `void`. Watch the trailing `;`: it's the difference between returning a value and returning `()`.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "arrow-gap",
          prompt: "Fill the gap so the function returns an `i32`.",
          code: rs`
            fn main() {
                println!("{}", double(21));
            }

            fn double(n: i32) ___ i32 {
                n * 2
            }
          `,
          answers: [["->"]],
          hint: "The return type comes after a small arrow made of two characters.",
          explanation: "`-> i32` declares that the function returns an `i32`.",
        },
        {
          type: "predict",
          id: "semicolon-predict",
          prompt: "What happens with this program?",
          code: rs`
            fn square(num: i32) -> i32 {
                num * num;
            }

            fn main() {
                println!("{}", square(3));
            }
          `,
          choices: ["It prints 9", "It prints 0", "It doesn't compile"],
          correctIndex: 2,
          explanation: "The semicolon after `num * num` turns it into a statement, so the function returns `()` instead of an `i32`: mismatched types.",
        },
        {
          type: "spotBug",
          id: "return-spot",
          prompt: "One line causes the compile error. Click it.",
          code: rs`
            fn main() {
                let total = add_tax(100);
                println!("{total}");
            }

            fn add_tax(price: u32) {
                price + price / 10
            }
          `,
          bugLine: 6,
          explanation: "The function produces a value but declares no return type. It needs `-> u32` after the parameters.",
        },
      ],
    },
  ],
  boss: {
    name: "The Signature Sphinx",
    story:
      "On a cliff above the fjord sits the Signature Sphinx. \"Answer my four riddles,\" it purrs, \"and you may sail on.\" Each riddle is a function, and each one is wrong.",
    starter: rs`
      // Fix each riddle so the program compiles and all four tests pass.

      // Riddle 1: return twice the number of legs.
      fn riddle_one(legs: u32) -> u32 {
          legs * 2;
      }

      // Riddle 2: return the sum of a and b.
      fn riddle_two(a: i32, b) -> i32 {
          a + b
      }

      // Riddle 3: return the number 42.
      fn riddle_three() {
          42
      }

      // Riddle 4: write a function named riddle_four that takes no
      // parameters and returns the u32 number 7. It doesn't exist yet!

      fn main() {
          println!("The Sphinx is waiting...");
      }
    `,
    tests: rs`
      #[test]
      fn riddle_one_doubles() {
          assert_eq!(riddle_one(4), 8);
      }

      #[test]
      fn riddle_two_adds() {
          assert_eq!(riddle_two(2, 3), 5);
      }

      #[test]
      fn riddle_three_is_42() {
          assert_eq!(riddle_three(), 42);
      }

      #[test]
      fn riddle_four_is_7() {
          assert_eq!(riddle_four(), 7);
      }
    `,
    solution: rs`
      fn riddle_one(legs: u32) -> u32 {
          legs * 2
      }

      fn riddle_two(a: i32, b: i32) -> i32 {
          a + b
      }

      fn riddle_three() -> i32 {
          42
      }

      fn riddle_four() -> u32 {
          7
      }

      fn main() {
          println!("The Sphinx is waiting...");
      }
    `,
    hints: [
      "Riddle 1: look at the last line of the body. What does a semicolon do to a value?",
      "Riddle 2: every parameter needs a type. Riddle 3: a function that returns a value needs `-> type`.",
      "Riddle 4: write a new function from scratch: `fn riddle_four() -> u32 { ... }` with `7` as its last expression.",
    ],
  },
};
```

- [ ] **Step 2: Register the island** in `src/content/index.ts`

Add `import { functionsIsland } from "./islands/02-functions";`, then change the list to `export const islands: Island[] = [variablesIsland, functionsIsland];`.

- [ ] **Step 3: Verify the content**

Run: `npx vitest run tests/content.test.ts`, then `npm run verify:rust`
Expected:
- The content tests pass.
- The verify script reports `17/17 Rust checks behaved as expected`. That breaks down as island 1's 10 checks plus 7 for island 2:
  - 5 runnable pages: `functions-101` page 2, `defining-functions` page 1, `parameters` pages 2 and 3, `return-values` page 2
  - the boss starter
  - the boss solution

- [ ] **Step 4: Play-test in the browser**

Beginner mode shows "What is a function?" as the first stage of Function Fjord. Experienced mode starts at "Defining functions". Beat the Sphinx using the solution, and check that the map now shows island 2 unlocked, with Ferris walking there.

- [ ] **Step 5: Commit**

```bash
git add src/content
git commit -m "content: add island 2, Function Fjord (functions)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Island 3 content — Branching Bay (If)

This island covers rustlings `03_if`. Boss starter and solution were verified with cargo during planning: the starter fails with E0308 ×2 and E0317; the solution passes 4/4.

**Files:**
- Create: `src/content/islands/03-if.ts`
- Modify: `src/content/index.ts`

**Interfaces:**
- Consumes: `Island` and `rs`
- Produces: `export const ifIsland: Island` with `id: "if"` and `number: 3`

- [ ] **Step 1: Create `src/content/islands/03-if.ts`**

```ts
import type { Island } from "../../engine/types";
import { rs } from "../helpers";

export const ifIsland: Island = {
  id: "if",
  number: 3,
  name: "Branching Bay",
  topic: "If",
  rustBook: "https://doc.rust-lang.org/book/ch03-05-control-flow.html",
  stages: [
    {
      id: "if-else",
      title: "if and else",
      tutorial: [
        {
          audience: "beginner",
          title: "Making decisions",
          text:
            "Programs often need to choose: if the player has a key, open the door; otherwise, keep it shut. That's what `if` does: it checks a **condition**, a question whose answer is `true` or `false`, and runs code only when the answer is `true`.\n\n" +
            "`else` adds a second path for when the answer is `false`.",
        },
        {
          audience: "all",
          title: "if / else in Rust",
          text:
            "Write `if`, then the condition, then the code to run in curly braces. The `else` block runs when the condition is `false`. Try changing `tide` to `3` and run it again.",
          code: rs`
            fn main() {
                let tide = 7;
                if tide > 5 {
                    println!("High tide: the ship can sail!");
                } else {
                    println!("Low tide: wait a while.");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Comparing values",
          text:
            "Conditions usually compare values. `==` checks \"equal\" (two `=` signs; a single `=` is assignment), `!=` is \"not equal\", and `<`, `>`, `<=`, `>=` compare sizes.\n\n" +
            "Combine conditions with `&&` (and) and `||` (or), and flip one with `!` (not).",
          code: rs`
            fn main() {
                let has_key = true;
                let coins = 12;
                if has_key && coins >= 10 {
                    println!("The door opens.");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Conditions must be bool",
          text:
            "In Rust the condition must be exactly `true` or `false`. A number isn't automatically \"true\" when it isn't zero, so write the comparison you mean: `if fish > 0`.",
          code: rs`
            fn main() {
                let fish = 3;
                if fish { // error: expected bool, found integer
                    println!("Dinner!");
                }
            }
          `,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "There are no parentheses around the condition (they're allowed, but the compiler warns), and braces are **always** required, even for one line. There's no truthiness: `if count`, `if name` or `if list` won't compile, because the condition must be a `bool`.",
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "if-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let n = 7;
                if n > 5 {
                    println!("big");
                } else {
                    println!("small");
                }
            }
          `,
          choices: ["big", "small", "big, then small"],
          correctIndex: 0,
          explanation: "`7 > 5` is `true`, so only the first block runs.",
        },
        {
          type: "pickFix",
          id: "bool-pick",
          prompt: "Which condition compiles and checks that `fish` isn't zero?",
          options: [
            { code: rs`if fish {`, correct: false },
            { code: rs`if fish != 0 {`, correct: true },
            { code: rs`if fish = 0 {`, correct: false },
          ],
          explanation: "The condition must be a `bool`. `fish != 0` compares and gives `true` or `false`; `=` is assignment, not comparison.",
        },
        {
          type: "spotBug",
          id: "eq-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                let coins = 3;
                if coins = 3 {
                    println!("Exactly three!");
                }
            }
          `,
          bugLine: 3,
          explanation: "`=` assigns a value. To compare, use `==`: `if coins == 3`.",
        },
        {
          type: "predict",
          id: "and-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let has_map = true;
                let has_boat = false;
                if has_map && has_boat {
                    println!("Set sail!");
                } else {
                    println!("Not ready yet.");
                }
            }
          `,
          choices: ["Set sail!", "Not ready yet."],
          correctIndex: 1,
          explanation: "`&&` needs **both** sides to be `true`. `has_boat` is `false`, so the `else` block runs.",
        },
      ],
    },
    {
      id: "else-if",
      title: "else if chains",
      tutorial: [
        {
          audience: "all",
          title: "More than two paths",
          text:
            "Chain extra conditions with `else if`. Rust checks them **from top to bottom** and runs only the **first** block whose condition is `true`; the rest are skipped. The final `else` catches everything else.",
          code: rs`
            fn main() {
                let score = 85;
                if score >= 90 {
                    println!("Grade: A");
                } else if score >= 80 {
                    println!("Grade: B");
                } else {
                    println!("Grade: C");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "The remainder operator",
          text:
            "`%` gives the **remainder** of a division: `7 % 3` is `1`, and `10 % 5` is `0`. A number is divisible by `n` when `number % n == 0`, which makes `%` the classic tool for puzzles like FizzBuzz.",
          code: rs`
            fn main() {
                let n = 15;
                if n % 15 == 0 {
                    println!("FizzBuzz");
                } else if n % 3 == 0 {
                    println!("Fizz");
                } else if n % 5 == 0 {
                    println!("Buzz");
                } else {
                    println!("{n}");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "`else if` works as you'd expect. When you find yourself comparing one value against many options, Rust has a more powerful tool called `match`, which you'll meet on Enum Atoll.",
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "order-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let score = 92;
                if score >= 80 {
                    println!("B");
                } else if score >= 90 {
                    println!("A");
                } else {
                    println!("C");
                }
            }
          `,
          choices: ["A", "B", "A and B", "C"],
          correctIndex: 1,
          explanation: "Rust stops at the **first** true condition. `92 >= 80` is true, so it prints B and never checks `>= 90`. Put the most specific check first!",
        },
        {
          type: "fillGap",
          id: "else-if-gap",
          prompt: "Fill the two gaps to add a middle case.",
          code: rs`
            fn main() {
                let temp = 15;
                if temp > 25 {
                    println!("Hot");
                } ___ ___ temp > 10 {
                    println!("Mild");
                } else {
                    println!("Cold");
                }
            }
          `,
          answers: [["else"], ["if"]],
          hint: "You need two keywords: one for \"otherwise\" and one for a new condition.",
          explanation: "`else if` adds another condition to the chain.",
        },
        {
          type: "predict",
          id: "mod-predict",
          prompt: "What value does `r` get?",
          code: rs`let r = 17 % 5;`,
          choices: ["3", "2", "3.4", "0"],
          correctIndex: 1,
          explanation: "17 divided by 5 is 3 with a remainder of 2, so `17 % 5` is `2`.",
        },
      ],
    },
    {
      id: "if-expressions",
      title: "if as an expression",
      tutorial: [
        {
          audience: "all",
          title: "if gives back a value",
          text:
            "In Rust, `if` is an **expression**: it produces a value. Each block's last expression (no semicolon!) is the value of that branch, so you can store the result directly with `let`.\n\n" +
            "Remember expressions from Function Fjord? This is the same idea.",
          code: rs`
            fn main() {
                let tide = 4;
                let status = if tide > 5 { "sail" } else { "wait" };
                println!("Captain says: {status}");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Both branches must match",
          text:
            "Rust needs to know the type of `label` when compiling, so every branch must produce the **same type**. Here one branch gives text and the other a number, which is a compile error: `if` and `else` have incompatible types.",
          code: rs`
            fn main() {
                let n = 3;
                let label = if n > 2 { "many" } else { 0 }; // error
            }
          `,
        },
        {
          audience: "all",
          title: "if as a return value",
          text:
            "Because `if` is an expression, it can be the last expression of a function, and its value becomes the return value. Notice there's no semicolon after `a` or `b`.\n\n" +
            "When `if` produces a value it **needs an `else`**: otherwise there'd be no value when the condition is false, and that's a compile error.",
          code: rs`
            fn bigger(a: i32, b: i32) -> i32 {
                if a > b {
                    a
                } else {
                    b
                }
            }

            fn main() {
                println!("{}", bigger(3, 8));
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "This replaces the ternary operator: Rust has no `cond ? a : b`; you write `if cond { a } else { b }`. Since a function body's last expression is its return value, `if`/`else` is often the entire body of a small function.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "if-expr-gap",
          prompt: "Fill the gap so `parity` is \"even\" or \"odd\".",
          code: rs`
            fn main() {
                let n = 4;
                let parity = ___ n % 2 == 0 { "even" } else { "odd" };
                println!("{n} is {parity}");
            }
          `,
          answers: [["if"]],
          hint: "`let parity = ...` needs a value. Which keyword can produce one from a condition?",
          explanation: "`if` is an expression, so its result can be stored with `let`.",
        },
        {
          type: "predict",
          id: "types-predict",
          prompt: "What happens with this program?",
          code: rs`
            fn main() {
                let n = 3;
                let label = if n > 2 { "many" } else { 0 };
                println!("{label}");
            }
          `,
          choices: ["It prints many", "It prints 0", "It doesn't compile"],
          correctIndex: 2,
          explanation: "Both branches must have the same type. `\"many\"` is text and `0` is a number, so this is a compile error.",
        },
        {
          type: "spotBug",
          id: "if-semi-spot",
          prompt: "One line breaks this function. Click it.",
          code: rs`
            fn smaller(a: i32, b: i32) -> i32 {
                if a < b {
                    a
                } else {
                    b;
                }
            }
          `,
          bugLine: 5,
          explanation: "The semicolon after `b` throws its value away, so the `else` branch produces `()` instead of an `i32`.",
        },
        {
          type: "pickFix",
          id: "no-else-pick",
          prompt: "Which function compiles?",
          options: [
            { code: rs`
              fn sign(n: i32) -> i32 {
                  if n >= 0 { 1 }
              }
            `, correct: false },
            { code: rs`
              fn sign(n: i32) -> i32 {
                  if n >= 0 { 1 } else { -1 }
              }
            `, correct: true },
          ],
          explanation: "When `if` produces a value, it needs an `else`. Otherwise there's no value when the condition is false.",
        },
      ],
    },
  ],
  boss: {
    name: "The Fork Kraken",
    story:
      "The water of Branching Bay boils, and the Fork Kraken rises! Each of its tentacles is a function that has to choose the right path. Fix them all to send it back to the deep.",
    starter: rs`
      // Fix or finish each function so the program compiles and all the tests pass.

      // Tentacle 1: return the bigger of a and b.
      fn bigger(a: i32, b: i32) -> i32 {
          // Write an if/else expression here.
      }

      // Tentacle 2: return 1 for positive numbers, -1 for negative numbers,
      // and 0 for zero.
      fn sign(n: i32) -> i32 {
          if n > 0 {
              1
          } else if n < 0 {
              -1
          }
      }

      // Tentacle 3: a number is lucky if it's divisible by 7
      // or if its last digit is 7 (that is, n % 10 == 7).
      fn is_lucky(n: u32) -> bool {
          if n % 7 == 0 || n % 10 == 7 {
              true
          } else {
              "false"
          }
      }

      fn main() {
          println!("The Kraken rises!");
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

      #[test]
      fn sign_handles_all_cases() {
          assert_eq!(sign(5), 1);
          assert_eq!(sign(-3), -1);
          assert_eq!(sign(0), 0);
      }

      #[test]
      fn lucky_numbers() {
          assert!(is_lucky(14));
          assert!(is_lucky(27));
          assert!(!is_lucky(10));
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

      fn sign(n: i32) -> i32 {
          if n > 0 {
              1
          } else if n < 0 {
              -1
          } else {
              0
          }
      }

      fn is_lucky(n: u32) -> bool {
          if n % 7 == 0 || n % 10 == 7 {
              true
          } else {
              false
          }
      }

      fn main() {
          println!("The Kraken rises!");
      }
    `,
    hints: [
      "Tentacle 1: the body is empty, so it returns nothing. Make `if a > b { a } else { b }` the last expression.",
      "Tentacle 2: when `if` produces a value, every path needs one. What happens when `n` is 0?",
      "Tentacle 3: both branches must have the same type. `\"false\"` in quotes is text, but `false` is a `bool`.",
    ],
  },
};
```

- [ ] **Step 2: Register the island** in `src/content/index.ts`

Add `import { ifIsland } from "./islands/03-if";`, then change the list to `export const islands: Island[] = [variablesIsland, functionsIsland, ifIsland];`.

- [ ] **Step 3: Verify the content**

Run: `npx vitest run tests/content.test.ts`, then `npm run verify:rust`
Expected:
- The content tests pass.
- Every check is `ok`. Island 3 adds 8 checks:
  - 6 runnable pages: `if-else` pages 2 and 3, `else-if` pages 1 and 2, `if-expressions` pages 1 and 3
  - the boss starter
  - the boss solution
- The script ends with `25/25 Rust checks behaved as expected.`

- [ ] **Step 4: Commit**

```bash
git add src/content
git commit -m "content: add island 3, Branching Bay (if)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: CI, GitHub Pages deploy, README and full play-through

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: the npm scripts from Task 1.
- Produces: a CI workflow that runs tests and Rust verification on every push and PR, and deploys `dist/` to GitHub Pages on pushes to `main`.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: CI and deploy

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm test
      - run: npm run verify:rust
      - run: npm run build
      - if: github.event_name == 'push'
        uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    if: github.event_name == 'push'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create `README.md`**

````markdown
# PlayRusty 🦀

**Learn Rust by playing.** PlayRusty is a free browser game that teaches Rust from zero, following the
same path as [rustlings](https://github.com/rust-lang/rustlings): sail an archipelago with Ferris the crab,
learn one concept per island, solve puzzles, and defeat each island's boss by fixing real Rust code that's
compiled by the real Rust compiler.

**Play it:** https://YOUR-GITHUB-USERNAME.github.io/PlayRusty/

## Features

- **Two learner modes.** New to programming? You get the general basics too. Already know another language?
  Skip them and get "Coming from Python/JS/Java/C++" notes instead.
- **Short lessons with runnable examples.** Edit any example and run it on the
  [Rust Playground](https://play.rust-lang.org).
- **Four puzzle types:** fill the gap, pick the fix, predict the output, spot the bug.
- **Boss fights on the real compiler.** Hidden `#[test]`s hit the boss; read real compiler errors to win.
- **XP, stars and badges**, saved in your browser. No account needed.

Islands 1–3 (Variables, Functions, If) are playable now; the rest of the rustlings topics are on the map
as "coming soon".

## Development

You need Node 22+ and, for checking Rust content, a Rust toolchain with `cargo`.

```bash
npm install
npm run dev          # http://localhost:5173/PlayRusty/
npm test             # unit + content tests
npm run verify:rust  # compiles every boss and runnable example with cargo
npm run build        # static site in dist/
```

## Adding an island

1. Create `src/content/islands/NN-topic.ts` exporting an `Island`. Copy an existing island for the shape.
   Use the `rs` template tag for Rust code, and don't put backticks inside `rs` templates.
2. Add it to `islands` in `src/content/index.ts`. It disappears from the "coming soon" list automatically.
3. Follow the teaching rule: never use a concept in a puzzle or boss before a tutorial page teaches it.
   Give every stage pages for both modes (`all`, or both `beginner` and `experienced`).
4. Every boss needs `starter` (must fail its tests), `solution` (must pass), `tests` and 1–3 `hints`.
5. Run `npm test` and `npm run verify:rust` before opening a pull request.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, verifies the Rust content, builds,
and publishes to GitHub Pages. In the repository's **Settings → Pages**, set **Source** to
**GitHub Actions** once. The repository must be named `PlayRusty` to match the Vite `base`.

## Credits

- Curriculum: [rustlings](https://github.com/rust-lang/rustlings) by the Rust community (MIT).
- Compiler: the official [Rust Playground](https://play.rust-lang.org).
- Ferris the crab is the unofficial Rust mascot, released into the public domain by Karen Rustad Tölva.
  PlayRusty's Ferris is an original drawing in that spirit.

## License

[MIT](LICENSE)
````

- [ ] **Step 3: Run the full check suite locally**

Run: `npm test`, then `npm run typecheck`, then `npm run verify:rust`, then `npm run build`
Expected:
- `npm test`: every test passes.
- `npm run typecheck`: no type errors.
- `npm run verify:rust`: `25/25 Rust checks behaved as expected.`
- `npm run build`: writes `dist/`.

- [ ] **Step 4: Full play-through in the built site**

Run: `npm run preview`, then open the printed URL plus `/PlayRusty/`. Do this in **both** modes, resetting progress in between.

Expected:
- [ ] Beginner mode: all 3 islands in order. Function Fjord starts with "What is a function?".
- [ ] Experienced mode: beginner pages and stages are hidden, and "Coming from another language" pages are shown.
- [ ] Every runnable example runs on the Playground with the expected output.
- [ ] Each boss: the starter doesn't compile, partial fixes show partial HP, and the full fix leads to the celebration screen.
- [ ] Ferris walks to each newly unlocked island on the map.
- [ ] Reload mid-island: progress, XP, stars and boss code persist.
- [ ] Keyboard only: Tab and Enter work through the map, stages and puzzles. Focus is always visible.
- [ ] With the OS set to "reduce motion", Ferris jumps instead of walking.
- [ ] Phone width (375px): screens are usable and nothing overflows horizontally, except long code lines, which scroll inside their block.
- [ ] No console errors at any point.

Fix any issue found here before committing, and say what was fixed in the commit message.

- [ ] **Step 5: Commit**

```bash
git add .github README.md
git commit -m "ci: add GitHub Pages deploy workflow and README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Publishing is **not** part of this plan. Ask the user before creating the GitHub repository or pushing.
