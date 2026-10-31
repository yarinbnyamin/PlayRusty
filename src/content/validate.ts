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
