import { h } from "../dom";

export interface Hearts {
  set(halves: number): void;
}

/** The player's hearts as full, half and empty hearts. Both counts are in halves. */
export function createHearts(parent: HTMLElement, totalHalves: number): Hearts {
  const el = h("p", { class: "hearts", role: "img" });
  parent.append(el);
  const set = (halves: number) => {
    const full = Math.floor(halves / 2);
    const half = halves % 2;
    const empty = Math.max(0, Math.floor(totalHalves / 2) - full - half);
    el.textContent = "❤️".repeat(full) + "💔".repeat(half) + "🤍".repeat(empty);
    el.setAttribute("aria-label", `Your hearts: ${halves / 2} of ${totalHalves / 2}`);
  };
  set(totalHalves);
  return { set };
}
