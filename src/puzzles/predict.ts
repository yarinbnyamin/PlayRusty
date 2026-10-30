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
