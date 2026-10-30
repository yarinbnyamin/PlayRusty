import type { FillGapPuzzle } from "../engine/types";
import { h } from "../ui/dom";

export function checkFillGap(puzzle: FillGapPuzzle, answer: string[]): boolean {
  return puzzle.answers.every((accepted, i) => accepted.includes((answer[i] ?? "").trim()));
}

export function renderFillGap(puzzle: FillGapPuzzle, container: HTMLElement, onSubmit: (answer: string[]) => void): void {
  const code = h("code");
  const inputs: HTMLInputElement[] = [];
  const parts = puzzle.code.split("___");
  parts.forEach((part, i) => {
    code.append(part);
    if (i < parts.length - 1) {
      const input = h("input", { class: "gap", type: "text", "aria-label": `Gap ${i + 1}`, autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false" });
      inputs.push(input);
      code.append(input);
    }
  });
  const submit = () => onSubmit(inputs.map((input) => input.value));
  for (const input of inputs) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
  }
  container.append(
    h("p", { class: "prompt" }, puzzle.prompt),
    h("pre", { class: "code" }, code),
    h("button", { class: "btn primary", onclick: submit }, "Check"),
  );
}
