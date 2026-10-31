import { describe, expect, it } from "vitest";
import { collectChecks, crateName } from "../scripts/rust-checks";
import { makeIsland, makeStage } from "./fixtures";

describe("collectChecks", () => {
  it("checks runnable examples and both sides of every boss round", () => {
    const stage = makeStage("hello", {
      tutorial: [
        { audience: "all", title: "Run me", text: "", code: "fn main() {}", runnable: true },
        { audience: "all", title: "Snippet", text: "", code: "let x = 5;" },
      ],
    });
    const checks = collectChecks([makeIsland("vars", [stage])]);
    expect(checks.map((c) => [c.name, c.kind, c.expect])).toEqual([
      ["vars-hello-page1", "run", "pass"],
      ...[1, 2, 3, 4].flatMap((n) => [
        [`vars-boss-r${n}-starter`, "test", "fail"],
        [`vars-boss-r${n}-solution`, "test", "pass"],
      ]),
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
