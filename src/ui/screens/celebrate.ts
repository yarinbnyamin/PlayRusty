import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { badgeSvg } from "../components/badge";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { h } from "../dom";

let lastWin: { xp: number; jumped: boolean; newlyOpened: string[] } = { xp: 0, jumped: false, newlyOpened: [] };

/** Called by the boss screen right before navigating here. */
export function noteBossWin(xp: number, jumped: boolean, newlyOpened: string[]): void {
  lastWin = { xp, jumped, newlyOpened };
}

export function renderCelebrate(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const island = ctx.islands.find((i) => i.id === islandId);
  const result = save.bosses[islandId];
  if (!island || !result) {
    ctx.go({ name: "map" });
    return noop;
  }
  const next = ctx.islands[ctx.islands.indexOf(island) + 1];
  const { xp, jumped, newlyOpened } = lastWin;
  lastWin = { xp: 0, jumped: false, newlyOpened: [] };
  const waiting = ctx.islands.find((i) => !save.bosses[i.id]);
  const announcesNext = next !== undefined && newlyOpened.includes(next.id);
  const nextLine = announcesNext
    ? `A new island has appeared on the map: ${next.name}.`
    : waiting
      ? `There's still a boss waiting on ${waiting.name}.`
      : "You've beaten every island built so far. More are on the way. Thanks for playing!";

  root.append(
    renderHud(ctx),
    h("main", { class: "celebrate" },
      badgeSvg(island.number),
      h("h1", {}, `${island.boss.name} is defeated!`),
      h("p", { class: "stars big", role: "img", "aria-label": `${result.stars} of 3 stars` }, starsLabel(result.stars)),
      h("p", {}, `You earned the ${island.name} badge${xp > 0 ? ` and ${xp} XP` : ""}.`),
      jumped
        ? h("p", {}, `You jumped ahead! Every island up to ${island.name} is open now, and the lessons you skipped are waiting for XP and stars.`)
        : null,
      h("p", { class: "muted" }, nextLine),
      h("div", { class: "row" },
        announcesNext
          ? h("a", { class: "btn primary", href: routeToHash({ name: "map" }) }, `Sail on to ${next.name} ⛵`)
          : waiting
            ? h("a", { class: "btn primary", href: routeToHash({ name: "island", islandId: waiting.id }) }, `Sail on to ${waiting.name} ⛵`)
            : h("a", { class: "btn primary", href: routeToHash({ name: "map" }) }, "Back to the map"),
        h("a", { class: "btn", href: routeToHash({ name: "island", islandId: island.id }) }, `Revisit ${island.name}`))),
  );
  return noop;
}
