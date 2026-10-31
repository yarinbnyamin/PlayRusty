import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveStore } from "../src/engine/save";
import { runCode } from "../src/playground/client";
import { createAppContext } from "../src/ui/app";
import { renderBoss } from "../src/ui/screens/boss";
import { emptySave, makeIsland } from "./fixtures";

vi.mock("../src/playground/client", () => ({ runCode: vi.fn() }));
const run = vi.mocked(runCode);
type Result = Awaited<ReturnType<typeof runCode>>;

const HIT: Result = { ok: true, success: true, stdout: "test boss_tests::t ... ok\n", stderr: "" };
const MISS: Result = { ok: true, success: false, stdout: "test boss_tests::t ... FAILED\n", stderr: "" };
const FIZZLE: Result = { ok: true, success: false, stdout: "", stderr: "error[E0308]: mismatched types\nerror: could not compile `x`" };
const DOWN: Result = { ok: false, reason: "network", message: "The compiler bridge is down." };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
let cleanups: (() => void)[] = [];

function setup() {
  const ctx = createAppContext(createSaveStore(null), [makeIsland("a")], []);
  ctx.update(() => emptySave("beginner"));
  const root = document.createElement("div");
  document.body.append(root);
  const cleanup = renderBoss(root, ctx, "a");
  cleanups.push(() => {
    cleanup();
    root.remove();
  });
  const button = (label: string) =>
    [...root.querySelectorAll("button")].find((b) => b.textContent?.startsWith(label)) as HTMLButtonElement;
  const heading = () => root.querySelector(".round h2")?.textContent;
  const hearts = () => root.querySelector(".hearts")?.getAttribute("aria-label");
  const hp = () => root.querySelector(".hp-label")?.textContent;
  const attack = async (result: Result) => {
    run.mockResolvedValueOnce(result);
    button("▶ Run").click();
    await flush();
  };
  const winRound = async () => {
    await attack(HIT);
    button("Next round →")?.click();
  };
  return { ctx, root, button, heading, hearts, hp, attack, winRound };
}

beforeEach(() => {
  run.mockReset();
  window.location.hash = "";
});

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
});

describe("rolling boss fight", () => {
  it("starts at round 1 with full HP, 3 hearts and 2 hints", () => {
    const fight = setup();
    expect(fight.heading()).toBe("Round 1 of 4: Round 1");
    expect(fight.hearts()).toBe("Your hearts: 3 of 3");
    expect(fight.hp()).toBe("Boss: 4/4 HP");
    expect(fight.button("💡 Hint").textContent).toBe("💡 Hint (2 left)");
    expect(fight.button("💡 Hint").disabled).toBe(false);
  });

  it("moves to the next round after a hit", async () => {
    const fight = setup();
    await fight.attack(HIT);
    expect(fight.root.textContent).toContain("💥 Hit! Boss loses 1 HP.");
    expect(fight.hp()).toBe("Boss: 3/4 HP");
    expect(fight.button("▶ Run").disabled).toBe(true);
    fight.button("Next round →").click();
    expect(fight.heading()).toBe("Round 2 of 4: Round 2");
    expect(fight.button("▶ Run").disabled).toBe(false);
    expect(run.mock.calls[0][0]).toContain("// round 1");
    expect(run.mock.calls[0][0]).toContain("mod boss_tests");
  });

  it("costs a whole heart for a failed test and half for a compile error", async () => {
    const fight = setup();
    await fight.attack(MISS);
    expect(fight.hearts()).toBe("Your hearts: 2 of 3");
    expect(fight.root.textContent).toContain("You lose a heart.");
    await fight.attack(FIZZLE);
    expect(fight.hearts()).toBe("Your hearts: 1.5 of 3");
    expect(fight.root.textContent).toContain("you lose half a heart");
    expect(fight.heading()).toBe("Round 1 of 4: Round 1");
  });

  it("does not cost a heart when the Playground can't be reached", async () => {
    const fight = setup();
    await fight.attack(DOWN);
    expect(fight.hearts()).toBe("Your hearts: 3 of 3");
    expect(fight.root.textContent).toContain("The compiler bridge is down.");
  });

  it("ends the fight when the hearts run out and lets you try again", async () => {
    const fight = setup();
    await fight.winRound();
    await fight.attack(MISS);
    await fight.attack(MISS);
    await fight.attack(MISS);
    expect(fight.root.textContent).toContain("Boss wins this time.");
    expect(fight.button("▶ Run").disabled).toBe(true);
    fight.button("Try again").click();
    expect(fight.heading()).toBe("Round 1 of 4: Round 1");
    expect(fight.hearts()).toBe("Your hearts: 3 of 3");
    expect(fight.hp()).toBe("Boss: 4/4 HP");
    expect(fight.root.textContent).not.toContain("wins this time");
  });

  it("gives one hint per round, about that round only", async () => {
    const fight = setup();
    fight.button("💡 Hint").click();
    expect(fight.root.querySelector(".hints")?.textContent).toBe("Hint 1.");
    expect(fight.button("💡 Hint").textContent).toBe("💡 Hint (1 left)");
    expect(fight.button("💡 Hint").disabled).toBe(true);
    expect(fight.button("💡 Hint").title).toBe("You've used this round's hint");
    await fight.winRound();
    expect(fight.root.querySelector(".hints")?.textContent).toBe("");
    fight.button("💡 Hint").click();
    expect(fight.root.querySelector(".hints")?.textContent).toBe("Hint 2.");
    await fight.winRound();
    expect(fight.button("💡 Hint").disabled).toBe(true);
    expect(fight.button("💡 Hint").title).toBe("No hints left");
  });

  it("records the win with stars from hearts and hints, then celebrates", async () => {
    const fight = setup();
    fight.button("💡 Hint").click();
    await fight.attack(MISS);
    for (let i = 0; i < 4; i += 1) await fight.winRound();
    expect(fight.ctx.getSave().bosses.a).toEqual({ stars: 1 });
    expect(window.location.hash).toBe("#/celebrate/a");
  });

  it("gives 3 stars for a clean fight", async () => {
    const fight = setup();
    await fight.attack(FIZZLE);
    for (let i = 0; i < 4; i += 1) await fight.winRound();
    expect(fight.ctx.getSave().bosses.a).toEqual({ stars: 3 });
  });
});
