import {
  isStageUnlocked, modeOf, recordPuzzleSolved, recordStageComplete, starsForMistakes, visiblePages, visibleStages,
} from "../../engine/progress";
import type { Island, Stage } from "../../engine/types";
import { renderPuzzle } from "../../puzzles/index";
import { routeToHash, type Route } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { renderTutorialPage } from "../components/tutorialPage";
import { h } from "../dom";
import { prose } from "../markdown";

export function renderStage(root: HTMLElement, ctx: AppContext, islandId: string, stageId: string): Cleanup {
  const save = ctx.getSave();
  const mode = modeOf(save);
  const foundIsland = ctx.islands.find((i) => i.id === islandId);
  if (!foundIsland) {
    ctx.go({ name: "map" });
    return noop;
  }
  const island: Island = foundIsland;
  const stages = visibleStages(island, mode);
  const foundStage = stages.find((s) => s.id === stageId);
  if (!foundStage || !isStageUnlocked(ctx.islands, islandId, stageId, save)) {
    ctx.go({ name: "island", islandId });
    return noop;
  }
  const stage: Stage = foundStage;
  const pages = visiblePages(stage, mode);

  let mistakes = 0;
  let cleanups: Cleanup[] = [];
  const main = h("main", { class: "stage" });
  root.append(renderHud(ctx), main);

  function clear(): void {
    cleanups.forEach((fn) => fn());
    cleanups = [];
    main.replaceChildren(h("a", { class: "back", href: routeToHash({ name: "island", islandId }) }, `← ${island.name}`));
  }

  function showPage(index: number): void {
    clear();
    const page = renderTutorialPage(pages[index]);
    cleanups.push(page.destroy);
    const last = index === pages.length - 1;
    main.append(
      h("p", { class: "step" }, `${stage.title}: lesson ${index + 1} of ${pages.length}`),
      page.el,
      h("div", { class: "row" },
        index > 0 ? h("button", { class: "btn", onclick: () => showPage(index - 1) }, "← Back") : null,
        h("button", { class: "btn primary", onclick: () => (last ? showPuzzle(0) : showPage(index + 1)) },
          last ? "Start the puzzles →" : "Next →")),
    );
  }

  function showPuzzle(index: number): void {
    clear();
    const puzzle = stage.puzzles[index];
    const area = h("div");
    const feedback = h("div", { class: "feedback", "aria-live": "polite" });
    main.append(
      h("p", { class: "step" }, `${stage.title}: puzzle ${index + 1} of ${stage.puzzles.length}`),
      h("section", { class: "puzzle" }, area, feedback),
    );

    let solved = false;
    renderPuzzle(puzzle, area, (correct) => {
      if (solved) return;
      if (!correct) {
        mistakes += 1;
        const tip = puzzle.type === "fillGap" ? puzzle.hint : puzzle.explanation;
        feedback.replaceChildren(h("p", { class: "bad" }, "✗ Not quite. Try again!"), prose(tip));
        return;
      }
      solved = true;
      ctx.update((s) => recordPuzzleSolved(s, island.id, stage.id, puzzle.id));
      area.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach((el) => (el.disabled = true));
      const isLast = index === stage.puzzles.length - 1;
      const next = h("button", { class: "btn primary", onclick: () => (isLast ? finish() : showPuzzle(index + 1)) },
        isLast ? "Finish the stage →" : "Continue →");
      feedback.replaceChildren(h("p", { class: "good" }, "✓ Correct!"), prose(puzzle.explanation), next);
      next.focus();
    });
  }

  function finish(): void {
    clear();
    ctx.update((s) => recordStageComplete(s, island.id, stage.id, mistakes));
    const nextStage = stages[stages.findIndex((s) => s.id === stage.id) + 1];
    const nextRoute: Route = nextStage
      ? { name: "stage", islandId: island.id, stageId: nextStage.id }
      : { name: "boss", islandId: island.id };
    main.append(
      h("section", { class: "stage-done" },
        h("h2", {}, `Stage complete: ${stage.title}`),
        h("p", { class: "stars big", "aria-label": `${starsForMistakes(mistakes)} of 3 stars` }, starsLabel(starsForMistakes(mistakes))),
        h("p", {}, mistakes === 0
          ? "Flawless: no mistakes!"
          : `${mistakes} mistake${mistakes === 1 ? "" : "s"}. Replay any time to earn more stars.`),
        h("div", { class: "row" },
          h("a", { class: "btn primary", href: routeToHash(nextRoute) },
            nextStage ? `Next: ${nextStage.title} →` : `Face the boss: ${island.boss.name} ⚔`),
          h("a", { class: "btn", href: routeToHash({ name: "island", islandId: island.id }) }, "Back to the island"))),
    );
  }

  if (pages.length > 0) showPage(0);
  else showPuzzle(0);
  return () => cleanups.forEach((fn) => fn());
}
