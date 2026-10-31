import { isIslandUnlocked, isJumpChallenge, recordBossDefeated } from "../../engine/progress";
import type { Island } from "../../engine/types";
import { buildBossProgram, countTests } from "../../playground/bossProgram";
import { runCode } from "../../playground/client";
import { parseTestOutput } from "../../playground/testOutput";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { createCodeEditor } from "../components/codeEditor";
import { createConsole } from "../components/console";
import { createHpBar } from "../components/hpBar";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";
import { noteBossWin } from "./celebrate";

export function renderBoss(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const foundIsland = ctx.islands.find((i) => i.id === islandId);
  if (!foundIsland) {
    ctx.go({ name: "map" });
    return noop;
  }
  const island: Island = foundIsland;
  const jump = isJumpChallenge(ctx.islands, islandId, save);
  const boss = island.boss;
  const total = countTests(boss.tests);
  let hintsUsed = 0;
  let alive = true;

  const main = h("main", { class: "boss" });
  root.append(renderHud(ctx), main);
  main.append(
    h("a", { class: "back", href: routeToHash({ name: "island", islandId }) }, `← ${island.name}`),
    h("h1", {}, `⚔ ${boss.name}`),
    prose(boss.story),
    ...(jump ? [h("p", { class: "jump-notice" }, `Jump challenge: beat this boss to unlock every island up to ${island.name}.`)] : []),
    h("p", { class: "muted" }, "Fix the code below. When you press Run, hidden tests attack the boss: every passing test is a hit."),
  );
  const hp = createHpBar(main, boss.name, total);

  const editorHost = h("div", { class: "editor" });
  const runButton = h("button", { class: "btn primary" }, "▶ Run");
  const hintButton = h("button", { class: "btn", disabled: true, title: "Run your code once to unlock hints" },
    `Hint (0/${boss.hints.length})`);
  const resetButton = h("button", { class: "btn" }, "Reset code");
  const hintList = h("ol", { class: "hints" });
  const consoleHost = h("div");
  main.append(editorHost, h("div", { class: "row" }, runButton, hintButton, resetButton), hintList, consoleHost);

  const editor = createCodeEditor(editorHost, save.bossCode[island.id] ?? boss.starter);
  const output = createConsole(consoleHost);
  const persistCode = () =>
    ctx.update((s) => ({ ...s, bossCode: { ...s.bossCode, [island.id]: editor.getCode() } }));

  hintButton.addEventListener("click", () => {
    if (hintsUsed >= boss.hints.length) return;
    hintList.append(h("li", {}, prose(boss.hints[hintsUsed])));
    hintsUsed += 1;
    hintButton.textContent = `Hint (${hintsUsed}/${boss.hints.length})`;
    hintButton.disabled = hintsUsed >= boss.hints.length;
  });

  resetButton.addEventListener("click", () => {
    if (window.confirm("Replace your code with the original starter code?")) {
      editor.setCode(boss.starter);
      persistCode();
    }
  });

  async function run(): Promise<void> {
    persistCode();
    runButton.disabled = true;
    output.showRunning();
    const result = await runCode(buildBossProgram(editor.getCode(), boss.tests), { tests: true });
    if (!alive) return;
    runButton.disabled = false;
    if (!result.ok) {
      output.showError(result.message, () => void run());
      return;
    }
    hintButton.disabled = hintsUsed >= boss.hints.length;
    hintButton.removeAttribute("title");

    const report = parseTestOutput(result.stdout, result.stderr);
    if (!report.compiled) {
      hp.set(total);
      output.showOutput("", result.stderr, {
        text: "💥 Your attack fizzled: the code doesn't compile yet. Read the compiler's message below.",
        kind: "error",
      });
      return;
    }
    hp.set(total - report.passed.length);
    if (report.failed.length === 0 && report.passed.length === total) {
      const before = ctx.getSave();
      const wasOpen = new Set(ctx.islands.filter((i) => isIslandUnlocked(ctx.islands, i.id, before)).map((i) => i.id));
      ctx.update((s) => recordBossDefeated(s, island.id, hintsUsed));
      const after = ctx.getSave();
      const newlyOpened = ctx.islands
        .filter((i) => !wasOpen.has(i.id) && isIslandUnlocked(ctx.islands, i.id, after))
        .map((i) => i.id);
      noteBossWin(after.xp - before.xp, jump, newlyOpened);
      ctx.go({ name: "celebrate", islandId: island.id });
      return;
    }
    output.showOutput(result.stdout, "", {
      text: `${report.passed.length} of ${total} hits landed. ${boss.name} is still standing!`,
      kind: "info",
    });
  }
  runButton.addEventListener("click", () => void run());

  window.addEventListener("pagehide", persistCode);

  return () => {
    alive = false;
    window.removeEventListener("pagehide", persistCode);
    persistCode();
    editor.destroy();
  };
}
