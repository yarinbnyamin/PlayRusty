import {
  isBossDefeated, isIslandUnlocked, isStageComplete, isStageUnlocked, modeOf, stageKey, visibleStages,
} from "../../engine/progress";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { h } from "../dom";

export function renderIsland(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const island = ctx.islands.find((i) => i.id === islandId);
  if (!island) {
    ctx.go({ name: "map" });
    return noop;
  }
  const unlocked = isIslandUnlocked(ctx.islands, island.id, save);
  const stages = visibleStages(island, modeOf(save));

  const list = h("ol", { class: "stage-list" });
  for (const stage of stages) {
    const open = isStageUnlocked(ctx.islands, island.id, stage.id, save);
    const stars = save.stages[stageKey(island.id, stage.id)]?.stars;
    list.append(
      h("li", {},
        open
          ? h("a", { class: "stage-card", href: routeToHash({ name: "stage", islandId: island.id, stageId: stage.id }) },
              h("span", {}, stage.title),
              h("span", { class: "stars", role: "img", "aria-label": stars ? `${stars} of 3 stars` : "not completed" }, starsLabel(stars)))
          : h("div", { class: "stage-card locked", "aria-disabled": "true" }, h("span", {}, `🔒 ${stage.title}`))),
    );
  }

  const bossHref = routeToHash({ name: "boss", islandId: island.id });
  const bossStars = save.bosses[island.id]?.stars;
  const bossCard = unlocked
    ? h("a", { class: "stage-card boss", href: bossHref },
        h("span", {}, `⚔ Boss: ${island.boss.name}`),
        h("span", { class: "stars", role: "img", "aria-label": bossStars ? `${bossStars} of 3 stars` : "not completed" }, starsLabel(bossStars)))
    : h("a", { class: "stage-card boss jump", href: bossHref }, h("span", {}, `⚡ Jump here: beat ${island.boss.name}`));

  const lessonsLeft = !stages.every((stage) => isStageComplete(save, island.id, stage.id));
  const bossNote = !unlocked
    ? h("p", { class: "muted skip-note" }, "Win to unlock every island up to here. You can still play the lessons you skip.")
    : !isBossDefeated(save, island.id) && lessonsLeft
      ? h("p", { class: "muted skip-note" }, "Know this already? Beat the boss to skip the lessons.")
      : null;

  root.append(
    renderHud(ctx),
    h("main", { class: "island-screen" },
      h("a", { class: "back", href: routeToHash({ name: "map" }) }, "← World map"),
      h("h1", {}, `${island.number}. ${island.name}`),
      h("p", { class: "muted" }, `Topic: ${island.topic} · `,
        h("a", { href: island.rustBook, target: "_blank", rel: "noopener" }, "Read the Rust Book chapter")),
      list,
      bossCard,
      bossNote),
  );
  return noop;
}
