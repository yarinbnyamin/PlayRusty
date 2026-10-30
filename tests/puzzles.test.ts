import { describe, expect, it } from "vitest";
import type { FillGapPuzzle, PickFixPuzzle, PredictPuzzle, SpotBugPuzzle } from "../src/engine/types";
import { checkFillGap, renderFillGap } from "../src/puzzles/fillGap";
import { renderPuzzle } from "../src/puzzles/index";
import { checkPickFix, renderPickFix } from "../src/puzzles/pickFix";
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

  it("fillGap submits on Enter and prevents the default so the keypress cannot reach a newly focused button", () => {
    const container = document.createElement("div");
    let submitted: string[] = [];
    renderFillGap(fillGap, container, (answer) => (submitted = answer));
    const inputs = container.querySelectorAll("input");
    inputs[0].value = "mut";
    inputs[1].value = "i32";
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    inputs[0].dispatchEvent(event);
    expect(submitted).toEqual(["mut", "i32"]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("pickFix choice buttons are named by their code, not a generic label", () => {
    const container = document.createElement("div");
    renderPickFix(pickFix, container, () => {});
    const buttons = container.querySelectorAll<HTMLButtonElement>("button.choice");
    expect(buttons).toHaveLength(2);
    buttons.forEach((button, i) => {
      expect(button.hasAttribute("aria-label")).toBe(false);
      expect(button.textContent).toContain(pickFix.options[i].code);
    });
  });

  it("fillGap inputs disable auto-capitalisation and autocorrect", () => {
    const container = document.createElement("div");
    renderFillGap(fillGap, container, () => {});
    const inputs = container.querySelectorAll("input");
    expect(inputs).toHaveLength(2);
    inputs.forEach((input) => {
      expect(input.getAttribute("autocapitalize")).toBe("off");
      expect(input.getAttribute("autocorrect")).toBe("off");
    });
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
