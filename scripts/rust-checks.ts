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
