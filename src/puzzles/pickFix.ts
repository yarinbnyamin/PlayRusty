import type { PickFixPuzzle } from "../engine/types";
import { codeBlock } from "../ui/components/codeBlock";
import { h } from "../ui/dom";

export function checkPickFix(puzzle: PickFixPuzzle, index: number): boolean {
  return puzzle.options[index]?.correct === true;
}

export function renderPickFix(puzzle: PickFixPuzzle, container: HTMLElement, onSubmit: (index: number) => void): void {
  const choices = h("div", { class: "choices" });
  puzzle.options.forEach((option, i) => {
    choices.append(h("button", { class: "choice", onclick: () => onSubmit(i) }, codeBlock(option.code)));
  });
  container.append(h("p", { class: "prompt" }, puzzle.prompt), choices);
}
