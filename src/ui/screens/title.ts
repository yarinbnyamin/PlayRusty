import type { Mode } from "../../engine/types";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { ferrisSvg } from "../components/ferris";
import { musicToggle } from "../components/hud";
import { h } from "../dom";

export function renderTitle(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const pickMode = (mode: Mode) => {
    ctx.update((s) => ({ ...s, mode }));
    ctx.go({ name: "map" });
  };

  const actions =
    save.mode === null
      ? h("div", { class: "mode-pick" },
          h("h2", {}, "Before we set sail: how much programming do you know?"),
          h("button", { class: "card-btn", onclick: () => pickMode("beginner") },
            h("strong", {}, "I'm new to programming"),
            h("span", {}, "Explain the basics too: what variables, functions and decisions are.")),
          h("button", { class: "card-btn", onclick: () => pickMode("experienced") },
            h("strong", {}, "I already know another language"),
            h("span", {}, "Skip the general basics and show me how Rust does it.")),
          h("p", { class: "muted" }, "You can change this any time in Settings."))
      : h("div", { class: "title-actions" },
          h("button", { class: "btn primary big", onclick: () => ctx.go({ name: "map" }) }, "Continue your journey"),
          h("a", { class: "btn", href: routeToHash({ name: "settings" }) }, "Settings"));

  root.append(
    h("main", { class: "title-screen" },
      h("div", { class: "title-corner" }, musicToggle(ctx)),
      ferrisSvg(160),
      h("h1", {}, "PlayRusty"),
      h("p", { class: "tagline" }, "Learn Rust by sailing an archipelago of puzzles with Ferris the crab."),
      actions),
  );
  return noop;
}
