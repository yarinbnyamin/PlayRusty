import type { Mode } from "../../engine/types";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";

const CREDITS =
  "The curriculum follows [rustlings](https://github.com/rust-lang/rustlings) (MIT licence). " +
  "Your code is compiled by the official [Rust Playground](https://play.rust-lang.org). " +
  "Ferris the crab is the unofficial Rust mascot, released into the public domain by Karen Rustad Tölva.";

export function renderSettings(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const modeOption = (mode: Mode, label: string) =>
    h("label", { class: "radio" },
      h("input", { type: "radio", name: "mode", value: mode, checked: save.mode === mode, onchange: () => ctx.update((s) => ({ ...s, mode })) }),
      label);

  const reset = () => {
    if (window.confirm("Reset all progress? Your XP, stars, badges and boss code will be erased.")) {
      ctx.resetProgress();
      ctx.go({ name: "title" });
    }
  };

  root.append(
    renderHud(ctx),
    h("main", { class: "settings" },
      h("h1", {}, "Settings"),
      h("fieldset", {},
        h("legend", {}, "Learner mode"),
        modeOption("beginner", "I'm new to programming"),
        modeOption("experienced", "I already know another language")),
      h("section", {}, h("h2", {}, "Progress"), h("button", { class: "btn danger", onclick: reset }, "Reset progress")),
      h("section", {}, h("h2", {}, "Credits"), prose(CREDITS)),
      h("a", { class: "btn", href: routeToHash({ name: "map" }) }, "Back to the map")),
  );
  return noop;
}
