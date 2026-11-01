import { h } from "../dom";

export interface Hearts {
  set(halves: number): void;
}

/** The player's lives as full, half and empty hearts under a "Your lives" label. Both counts are in halves. */
export function createHearts(parent: HTMLElement, totalHalves: number): Hearts {
  // The visible label repeats the hearts' aria-label, so screen readers skip it.
  const label = h("span", { class: "lives-label", "aria-hidden": "true" });
  const el = h("p", { class: "hearts", role: "img" });
  parent.append(h("div", { class: "lives-wrap" }, label, el));
  const set = (halves: number) => {
    const full = Math.floor(halves / 2);
    const half = halves % 2;
    const empty = Math.max(0, Math.floor(totalHalves / 2) - full - half);
    el.textContent = "❤️".repeat(full) + "💔".repeat(half) + "🤍".repeat(empty);
    el.setAttribute("aria-label", `Your lives: ${halves / 2} of ${totalHalves / 2}`);
    label.textContent = `Your lives: ${halves / 2}/${totalHalves / 2}`;
  };
  set(totalHalves);
  return { set };
}
