import { totalStars } from "../../engine/progress";
import { routeToHash } from "../../router";
import type { AppContext } from "../app";
import { h } from "../dom";
import { ferrisSvg } from "./ferris";

export function renderHud(ctx: AppContext): HTMLElement {
  const save = ctx.getSave();
  return h("header", { class: "hud" },
    h("a", { class: "brand", href: routeToHash({ name: "map" }) }, ferrisSvg(32), "PlayRusty"),
    h("div", { class: "stats" },
      h("span", { title: "Experience points" }, `⚡ ${save.xp} XP`),
      h("span", { title: "Stars earned" }, `★ ${totalStars(save)}`),
      h("span", { title: "Island badges" }, `🏅 ${Object.keys(save.bosses).length}`)),
    h("a", { class: "btn small", href: routeToHash({ name: "settings" }) }, "Settings"),
    ctx.persistent ? null : h("p", { class: "notice" }, "Your browser is blocking storage, so progress won't be saved after you close this tab."));
}
