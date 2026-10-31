import { currentIslandId, isBossDefeated, isIslandUnlocked } from "../../engine/progress";
import type { Island } from "../../engine/types";
import { noop, type AppContext, type Cleanup } from "../app";
import { ferrisSvg } from "../components/ferris";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { mapSize, mapSlot } from "./mapLayout";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Where Ferris stood the last time the map was shown, so he can walk to his new island. */
let ferrisWasAt: string | null = null;

interface MapEntry {
  number: number;
  name: string;
  topic: string;
  island?: Island;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function svgText(className: string, y: number, text: string): SVGTextElement {
  const el = svg("text", { class: className, y });
  el.textContent = text;
  return el;
}

export function renderMap(root: HTMLElement, ctx: AppContext): Cleanup {
  const save = ctx.getSave();
  const entries: MapEntry[] = [
    ...ctx.islands.map((island) => ({ number: island.number, name: island.name, topic: island.topic, island })),
    ...ctx.comingSoon,
  ].sort((a, b) => a.number - b.number);

  const { width, height } = mapSize(entries.length);
  const map = svg("svg", { viewBox: `0 0 ${width} ${height}`, class: "map-svg", role: "group", "aria-label": "World map" });
  const points = entries.map((_, i) => {
    const p = mapSlot(i);
    return `${p.x},${p.y}`;
  });
  map.append(svg("polyline", { class: "route", points: points.join(" ") }));

  entries.forEach((entry, index) => {
    const { x, y } = mapSlot(index);
    const island = entry.island;
    const unlocked = island !== undefined && isIslandUnlocked(ctx.islands, island.id, save);
    const done = island !== undefined && isBossDefeated(save, island.id);
    const state = !island ? "soon" : done ? "done" : unlocked ? "open" : "locked";
    const node = svg("g", { class: `island-node ${state}`, transform: `translate(${x} ${y})` });
    const title = svg("title");
    title.textContent = `${entry.number}. ${entry.name}: ${entry.topic}`;
    const topicText = !island ? "coming soon" : unlocked ? entry.topic : `🔒 ${entry.topic}`;
    node.append(
      title,
      svg("circle", { r: 62, class: "land" }),
      svgText("num", -14, done ? "🏅" : String(entry.number)),
      svgText("name", 10, entry.name),
      svgText("topic", 30, topicText),
    );
    if (island) {
      const open = () => ctx.go({ name: "island", islandId: island.id });
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "link");
      node.setAttribute("aria-label",
        `Island ${entry.number}: ${entry.name}, ${entry.topic}${done ? ", completed" : ""}${unlocked ? "" : ", locked: jump challenge available"}`);
      node.addEventListener("click", open);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
    map.append(node);
  });

  const target = currentIslandId(ctx.islands, save);
  const targetIndex = entries.findIndex((entry) => entry.island?.id === target);
  if (targetIndex >= 0) {
    const ferris = svg("g", { class: "ferris" });
    const art = ferrisSvg(56);
    art.setAttribute("x", "-28");
    art.setAttribute("y", "-100");
    ferris.append(art);
    map.append(ferris);
    const place = (index: number) => {
      const p = mapSlot(index);
      ferris.style.transform = `translate(${p.x}px, ${p.y}px)`;
    };
    const fromIndex = entries.findIndex((entry) => entry.island?.id === ferrisWasAt);
    if (fromIndex >= 0 && fromIndex !== targetIndex) {
      place(fromIndex);
      requestAnimationFrame(() => requestAnimationFrame(() => place(targetIndex)));
    } else {
      place(targetIndex);
    }
    ferrisWasAt = target;
  }

  root.append(
    renderHud(ctx),
    h("main", { class: "map" },
      h("h1", { class: "visually-hidden" }, "World map"),
      map,
      h("p", { class: "muted center" },
        `Islands ${ctx.islands.length + 1} to ${entries.length} are still being built. PlayRusty is open source, and new islands are welcome!`)),
  );
  return noop;
}
