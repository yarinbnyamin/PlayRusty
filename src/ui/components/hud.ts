import { totalStars } from "../../engine/progress";
import { routeToHash } from "../../router";
import type { AppContext } from "../app";
import { h } from "../dom";
import { ferrisSvg } from "./ferris";

function musicToggle(ctx: AppContext): HTMLButtonElement {
  const button = h("button", { class: "btn small music-toggle", type: "button", "aria-label": "Music" }, "♪");
  const sync = () => {
    button.setAttribute("aria-pressed", String(ctx.music.enabled));
    button.title = ctx.music.enabled ? "Music on" : "Music off";
  };
  // Follows changes made elsewhere (the Settings checkbox); lets go once its screen has been replaced.
  const unsubscribe = ctx.music.onChange(() => {
    if (!button.isConnected) unsubscribe();
    else sync();
  });
  button.addEventListener("click", () => {
    ctx.music.setEnabled(!ctx.music.enabled);
    sync();
  });
  sync();
  return button;
}

export function renderHud(ctx: AppContext): HTMLElement {
  const save = ctx.getSave();
  return h("header", { class: "hud" },
    h("a", { class: "brand", href: routeToHash({ name: "map" }) }, ferrisSvg(32), "PlayRusty"),
    h("div", { class: "stats" },
      h("span", { title: "Experience points" }, `⚡ ${save.xp} XP`),
      h("span", { title: "Stars earned" }, `★ ${totalStars(save)}`),
      h("span", { title: "Island badges" }, `🏅 ${Object.keys(save.bosses).length}`)),
    musicToggle(ctx),
    h("a", { class: "btn small", href: routeToHash({ name: "settings" }) }, "Settings"),
    ctx.persistent ? null : h("p", { class: "notice" }, "Your browser is blocking storage, so progress won't be saved after you close this tab."));
}
