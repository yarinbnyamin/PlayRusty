import type { SpotBugPuzzle } from "../engine/types";
import { h } from "../ui/dom";

export function checkSpotBug(puzzle: SpotBugPuzzle, line: number): boolean {
  return line === puzzle.bugLine;
}

export function renderSpotBug(puzzle: SpotBugPuzzle, container: HTMLElement, onSubmit: (line: number) => void): void {
  const lines = h("div", { class: "lines", role: "group", "aria-label": "Code lines: click the broken one" });
  puzzle.code.split("\n").forEach((text, i) => {
    lines.append(
      h("button", { class: "line", "aria-label": `Line ${i + 1}: ${text.trim()}`, onclick: () => onSubmit(i + 1) },
        h("span", { class: "ln" }, String(i + 1)),
        h("code", {}, text || " ")),
    );
  });
  container.append(h("p", { class: "prompt" }, puzzle.prompt), lines);
}
