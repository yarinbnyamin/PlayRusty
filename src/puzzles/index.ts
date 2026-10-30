import type { Puzzle } from "../engine/types";
import { checkFillGap, renderFillGap } from "./fillGap";
import { checkPickFix, renderPickFix } from "./pickFix";
import { checkPredict, renderPredict } from "./predict";
import { checkSpotBug, renderSpotBug } from "./spotBug";

/** Renders any puzzle and reports whether each submitted answer was correct. */
export function renderPuzzle(puzzle: Puzzle, container: HTMLElement, onResult: (correct: boolean) => void): void {
  switch (puzzle.type) {
    case "fillGap":
      return renderFillGap(puzzle, container, (answer) => onResult(checkFillGap(puzzle, answer)));
    case "pickFix":
      return renderPickFix(puzzle, container, (index) => onResult(checkPickFix(puzzle, index)));
    case "predict":
      return renderPredict(puzzle, container, (index) => onResult(checkPredict(puzzle, index)));
    case "spotBug":
      return renderSpotBug(puzzle, container, (line) => onResult(checkSpotBug(puzzle, line)));
  }
}
