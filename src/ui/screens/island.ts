import { isBossUnlocked, isIslandUnlocked, isStageUnlocked, modeOf, stageKey, visibleStages } from "../../engine/progress";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { h } from "../dom";

export function renderIsland(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const island = ctx.islands.find((i) => i.id === islandId);
  if (!island || !isIslandUnlocked(ctx.islands, islandId, save)) {
    ctx.go({ name: "map" });
    return noop;
  }

  const list = h("ol", { class: "stage-list" });
  for (const stage of visibleStages(island, modeOf(save))) {
    const unlocked = isStageUnlocked(ctx.islands, island.id, stage.id, save);
    const stars = save.stages[stageKey(island.id, stage.id)]?.stars;
    list.append(
      h("li", {},
        unlocked
          ? h("a", { class: "stage-card", href: routeToHash({ name: "stage", islandId: island.id, stageId: stage.id }) },
              h("span", {}, stage.title),
              h("span", { class: "stars", role: "img", "aria-label": stars ? `${stars} of 3 stars` : "not completed" }, starsLabel(stars)))
          : h("div", { class: "stage-card locked", "aria-disabled": "true" }, h("span", {}, `🔒 ${stage.title}`))),
    );
  }

  const bossStars = save.bosses[island.id]?.stars;
  const bossCard = isBossUnlocked(ctx.islands, island.id, save)
    ? h("a", { class: "stage-card boss", href: routeToHash({ name: "boss", islandId: island.id }) },
        h("span", {}, `⚔ Boss: ${island.boss.name}`),
        h("span", { class: "stars", role: "img", "aria-label": bossStars ? `${bossStars} of 3 stars` : "not completed" }, starsLabel(bossStars)))
    : h("div", { class: "stage-card boss locked", "aria-disabled": "true" },
        h("span", {}, `🔒 Boss: ${island.boss.name}`),
        h("span", { class: "muted" }, "Finish every stage to face the boss"));

  root.append(
    renderHud(ctx),
    h("main", { class: "island-screen" },
      h("a", { class: "back", href: routeToHash({ name: "map" }) }, "← World map"),
      h("h1", {}, `${island.number}. ${island.name}`),
      h("p", { class: "muted" }, `Topic: ${island.topic} · `,
        h("a", { href: island.rustBook, target: "_blank", rel: "noopener" }, "Read the Rust Book chapter")),
      list,
      bossCard),
  );
  return noop;
}
