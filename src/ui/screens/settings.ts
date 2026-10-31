import type { Mode } from "../../engine/types";
import { routeToHash } from "../../router";
import type { AppContext, Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";

const CREDITS =
  "The curriculum follows [rustlings](https://github.com/rust-lang/rustlings) (MIT licence). " +
  "Your code is compiled by the official [Rust Playground](https://play.rust-lang.org). " +
  "Ferris the crab is the unofficial Rust mascot, released into the public domain by Karen Rustad Tölva." +
  " The music is generated live in your browser by PlayRusty's own code, so it is free of copyright.";

export function renderSettings(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const modeOption = (mode: Mode, label: string) =>
    h("label", { class: "radio" },
      h("input", { type: "radio", name: "mode", value: mode, checked: save.mode === mode, onchange: () => ctx.update((s) => ({ ...s, mode })) }),
      label);

  const reset = () => {
    if (window.confirm("Reset all progress? Your XP, stars and badges will be erased.")) {
      ctx.resetProgress();
      ctx.go({ name: "title" });
    }
  };

  const musicBox = h("input", {
    type: "checkbox",
    checked: ctx.music.enabled,
    onchange: (event: Event) => ctx.music.setEnabled((event.target as HTMLInputElement).checked),
  });
  const volume = h("input", {
    type: "range", min: 0, max: 100, step: 5,
    value: Math.round(ctx.music.volume * 100),
    oninput: (event: Event) => ctx.music.setVolume(Number((event.target as HTMLInputElement).value) / 100),
  });

  const syncMusic = () => {
    const percent = Math.round(ctx.music.volume * 100);
    musicBox.checked = ctx.music.enabled;
    if (Number(volume.value) !== percent) volume.value = String(percent);
    volume.setAttribute("aria-valuetext", `${percent}%`);
  };
  syncMusic();
  const unsubscribe = ctx.music.onChange(syncMusic);

  root.append(
    renderHud(ctx),
    h("main", { class: "settings" },
      h("h1", {}, "Settings"),
      h("fieldset", {},
        h("legend", {}, "Learner mode"),
        modeOption("beginner", "I'm new to programming"),
        modeOption("experienced", "I already know another language")),
      h("section", {},
        h("h2", {}, "Sound"),
        h("label", { class: "check" }, musicBox, "Play music"),
        h("label", { class: "volume" }, "Music volume", volume)),
      h("section", {}, h("h2", {}, "Progress"), h("button", { class: "btn danger", onclick: reset }, "Reset progress")),
      h("section", {}, h("h2", {}, "Credits"), prose(CREDITS)),
      h("a", { class: "btn", href: routeToHash({ name: "map" }) }, "Back to the map")),
  );
  return unsubscribe;
}
