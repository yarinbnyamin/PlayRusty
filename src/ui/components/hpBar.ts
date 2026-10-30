import { h } from "../dom";

export interface HpBar {
  set(remaining: number): void;
}

export function createHpBar(parent: HTMLElement, name: string, total: number): HpBar {
  const fill = h("div", { class: "hp-fill" });
  const label = h("span", { class: "hp-label" });
  const bar = h("div", { class: "hp", role: "meter", "aria-label": `${name} health`, "aria-valuemin": 0, "aria-valuemax": total }, fill);
  parent.append(h("div", { class: "hp-wrap" }, label, bar));
  const set = (remaining: number) => {
    fill.style.width = `${total === 0 ? 0 : (remaining / total) * 100}%`;
    bar.setAttribute("aria-valuenow", String(remaining));
    label.textContent = `${name}: ${remaining}/${total} HP`;
  };
  set(total);
  return { set };
}
