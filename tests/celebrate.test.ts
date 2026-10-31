import { describe, expect, it } from "vitest";
import { createSaveStore } from "../src/engine/save";
import type { SaveData } from "../src/engine/types";
import { createAppContext } from "../src/ui/app";
import { renderBoss } from "../src/ui/screens/boss";
import { noteBossWin, renderCelebrate } from "../src/ui/screens/celebrate";
import { renderTitle } from "../src/ui/screens/title";
import { emptySave, makeIsland } from "./fixtures";

const islands = ["a", "b", "c"].map((id, i) => ({ ...makeIsland(id), number: i + 1 }));

function setup(defeated: string[]) {
  const ctx = createAppContext(createSaveStore(null), islands, []);
  const bosses: SaveData["bosses"] = {};
  for (const id of defeated) bosses[id] = { stars: 3 };
  ctx.update(() => ({ ...emptySave("beginner"), bosses }));
  return ctx;
}

function celebrate(ctx: ReturnType<typeof setup>, islandId: string): HTMLElement {
  const root = document.createElement("div");
  renderCelebrate(root, ctx, islandId);
  return root;
}

describe("celebrate screen", () => {
  it("does not claim the game is finished after jumping to the last island", () => {
    const ctx = setup(["c"]);
    noteBossWin(50, true, ["b", "c"]);
    const root = celebrate(ctx, "c");
    expect(root.textContent).toContain("You jumped ahead!");
    expect(root.textContent).toContain("There's still a boss waiting on Island a");
    expect(root.textContent).not.toContain("beaten every island");
    expect(root.querySelector("a.btn.primary")?.getAttribute("href")).toBe("#/island/a");
  });

  it("does not announce an already-open island after a fill-in win", () => {
    const ctx = setup(["c", "a"]);
    noteBossWin(50, false, []);
    const root = celebrate(ctx, "a");
    expect(root.textContent).not.toContain("A new island has appeared");
    expect(root.textContent).toContain("still a boss waiting on Island b");
  });

  it("announces the island a normal win opens", () => {
    const ctx = setup(["a"]);
    noteBossWin(50, false, ["b"]);
    const root = celebrate(ctx, "a");
    expect(root.textContent).toContain("A new island has appeared on the map: Island b.");
    expect(root.querySelector("a.btn.primary")?.getAttribute("href")).toBe("#/map");
  });

  it("shows the finale once every boss is defeated", () => {
    const ctx = setup(["a", "b", "c"]);
    noteBossWin(50, false, []);
    const root = celebrate(ctx, "c");
    expect(root.textContent).toContain("You've beaten every island built so far");
    expect(root.querySelector("a.btn.primary")?.textContent).toBe("Back to the map");
  });

  it("consumes the win note so a later render does not repeat it", () => {
    const ctx = setup(["c"]);
    noteBossWin(50, true, ["b", "c"]);
    expect(celebrate(ctx, "c").textContent).toContain("You jumped ahead!");
    expect(celebrate(ctx, "c").textContent).not.toContain("You jumped ahead!");
  });
});

describe("boss screen", () => {
  it("shows the jump notice on a locked island", () => {
    const ctx = setup([]);
    const root = document.createElement("div");
    const cleanup = renderBoss(root, ctx, "c");
    expect(root.querySelector(".jump-notice")?.textContent)
      .toBe("Jump challenge: beat this boss to unlock every island up to Island c.");
    cleanup();
  });

  it("shows no jump notice on an unlocked island", () => {
    const ctx = setup([]);
    const root = document.createElement("div");
    const cleanup = renderBoss(root, ctx, "a");
    expect(root.querySelector(".jump-notice")).toBeNull();
    cleanup();
  });
});

describe("title screen", () => {
  it("offers the music toggle", () => {
    const ctx = setup([]);
    const root = document.createElement("div");
    renderTitle(root, ctx);
    expect(root.querySelector('.title-corner button[aria-label="Music"]')).not.toBeNull();
  });
});
