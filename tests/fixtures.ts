import type { BossRound, Island, Mode, SaveData, Stage } from "../src/engine/types";

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

export function makeIsland(id: string, stages: Stage[] = [makeStage("s1"), makeStage("s2")]): Island {
  return {
    id,
    number: 1,
    name: `Island ${id}`,
    topic: "Topic",
    rustBook: "https://doc.rust-lang.org/book/",
    stages,
    boss: { name: "Boss", story: "A story.", rounds: [1, 2, 3, 4].map(makeRound) },
  };
}

export function emptySave(mode: Mode | null = "beginner"): SaveData {
  return { version: 1, mode, xp: 0, stages: {}, bosses: {}, solvedPuzzles: [], bossCode: {} };
}

/** A minimal in-memory Storage for tests. */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}
