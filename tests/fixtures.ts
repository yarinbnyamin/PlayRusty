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
