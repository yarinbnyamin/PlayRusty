import { describe, expect, it } from "vitest";
import { createSaveStore } from "../src/engine/save";
import { createAppContext } from "../src/ui/app";
import { renderIsland } from "../src/ui/screens/island";
import { renderMap } from "../src/ui/screens/map";
import { emptySave, makeIsland } from "./fixtures";

function setup() {
  const islands = [makeIsland("a"), { ...makeIsland("b"), number: 2 }];
  const ctx = createAppContext(createSaveStore(null), islands, []);
  ctx.update(() => emptySave("beginner"));
  return { ctx, root: document.createElement("div") };
}

describe("skip-ahead screens", () => {
  it("links the boss from the start on an unlocked island", () => {
    const { ctx, root } = setup();
    renderIsland(root, ctx, "a");
    expect(root.querySelector("a.stage-card.boss")?.getAttribute("href")).toBe("#/boss/a");
    expect(root.textContent).toContain("Know this already? Beat the boss to skip the lessons.");
  });

  it("shows a jump challenge on a locked island instead of redirecting", () => {
    const { ctx, root } = setup();
    renderIsland(root, ctx, "b");
    expect(root.querySelector("a.stage-card.jump")?.textContent).toContain("⚡ Jump here: beat Boss");
    expect(root.querySelectorAll(".stage-card.locked")).toHaveLength(2);
    expect(root.textContent).toContain("Win to unlock every island up to here.");
  });

  it("lets the map open locked islands", () => {
    const { ctx, root } = setup();
    renderMap(root, ctx);
    const nodes = root.querySelectorAll('.island-node[role="link"]');
    expect(nodes).toHaveLength(2);
    expect(nodes[1].getAttribute("aria-label")).toContain(", locked: jump challenge available");
  });
});
