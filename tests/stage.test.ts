import { describe, expect, it } from "vitest";
import { createSaveStore } from "../src/engine/save";
import { createAppContext } from "../src/ui/app";
import { renderStage } from "../src/ui/screens/stage";
import { emptySave, makeIsland, makeStage } from "./fixtures";

describe("stage keyboard focus", () => {
  it("keeps focus inside the page after clicking Next", () => {
    const store = createSaveStore(null);
    const pages = [
      { audience: "all" as const, title: "One", text: "First" },
      { audience: "all" as const, title: "Two", text: "Second" },
    ];
    const island = makeIsland("i1", [makeStage("s1", { tutorial: pages })]);
    const ctx = createAppContext(store, [island], []);
    ctx.update(() => emptySave("beginner"));
    const root = document.createElement("div");
    document.body.append(root);
    renderStage(root, ctx, "i1", "s1");

    const next = [...root.querySelectorAll("button")].find((b) => b.textContent === "Next →");
    expect(next).toBeTruthy();
    next!.focus();
    next!.click();

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.textContent).toContain("lesson 2 of 2");
    root.remove();
  });
});
