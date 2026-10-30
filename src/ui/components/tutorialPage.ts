import type { TutorialPage } from "../../engine/types";
import { h } from "../dom";
import { prose } from "../markdown";
import { codeBlock } from "./codeBlock";
import { createRunner } from "./runner";

const TAGS = { beginner: "Programming basics", experienced: "Coming from another language" } as const;

export function renderTutorialPage(page: TutorialPage): { el: HTMLElement; destroy(): void } {
  const el = h("article", { class: "tutorial-page" },
    page.audience === "all" ? null : h("span", { class: `tag ${page.audience}` }, TAGS[page.audience]),
    h("h2", {}, page.title),
    prose(page.text),
    page.code ? codeBlock(page.code) : null);

  let runner: { destroy(): void } | null = null;
  const code = page.code;
  if (code && page.runnable) {
    const button = h("button", { class: "btn" }, "▶ Run it yourself");
    button.addEventListener("click", () => {
      button.remove();
      runner = createRunner(el, code);
      el.querySelector<HTMLButtonElement>(".runner button")?.focus();
    });
    el.append(button);
  }
  return { el, destroy: () => runner?.destroy() };
}
