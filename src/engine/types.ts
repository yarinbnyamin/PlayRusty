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
  /** Unused since rolling boss fights; kept so old saves still load. */
  bossCode: Record<string, string>;
}
