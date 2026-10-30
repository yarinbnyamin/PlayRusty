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
