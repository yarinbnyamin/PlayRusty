import { attack, canHint, fightStars, nextRound, startFight, takeHint, type Attack, type FightState } from "../../engine/fight";
import { isIslandUnlocked, isJumpChallenge, recordBossDefeated } from "../../engine/progress";
import type { BossRound, Island } from "../../engine/types";
import { buildBossProgram, countTests } from "../../playground/bossProgram";
import { runCode } from "../../playground/client";
import { parseTestOutput } from "../../playground/testOutput";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { createCodeEditor, type CodeEditor } from "../components/codeEditor";
import { createConsole } from "../components/console";
import { createHearts } from "../components/hearts";
import { createHpBar } from "../components/hpBar";
import { renderHud } from "../components/hud";
import { h } from "../dom";
import { prose } from "../markdown";
import { noteBossWin } from "./celebrate";

/** Classifies one Run of a round: every test passed, a test failed, or the code didn't compile. */
export function judgeRun(round: BossRound, stdout: string, stderr: string): Attack {
  const report = parseTestOutput(stdout, stderr);
  if (!report.compiled) return "fizzle";
  const allPassed = report.failed.length === 0 && report.passed.length === countTests(round.tests);
  return allPassed ? "hit" : "miss";
}

export function renderBoss(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const foundIsland = ctx.islands.find((i) => i.id === islandId);
  if (!foundIsland) {
    ctx.go({ name: "map" });
    return noop;
  }
  const island: Island = foundIsland;
  const boss = island.boss;
  const jump = isJumpChallenge(ctx.islands, islandId, ctx.getSave());
  let fight: FightState = startFight(boss.rounds.length);
  let editor: CodeEditor | null = null;
  let alive = true;

  const main = h("main", { class: "boss" });
  root.append(renderHud(ctx), main);
  main.append(
    h("a", { class: "back", href: routeToHash({ name: "island", islandId }) }, `← ${island.name}`),
    h("h1", {}, `⚔ ${boss.name}`),
    prose(boss.story),
    ...(jump ? [h("p", { class: "jump-notice" }, `Jump challenge: beat this boss to unlock every island up to ${island.name}.`)] : []),
    h("p", { class: "muted" },
      "Solve one round at a time. Each solved round hits the boss. A failed test costs you a heart; code that doesn't compile costs half a heart."),
  );
  const hp = createHpBar(main, boss.name, fight.bossHp);
  const hearts = createHearts(main, fight.halves);
  const panel = h("section", { class: "round" });
  main.append(panel);

  function closeEditor(): void {
    editor?.destroy();
    editor = null;
  }

  function win(): void {
    const before = ctx.getSave();
    const wasOpen = new Set(ctx.islands.filter((i) => isIslandUnlocked(ctx.islands, i.id, before)).map((i) => i.id));
    ctx.update((s) => recordBossDefeated(s, island.id, fightStars(fight)));
    const after = ctx.getSave();
    const newlyOpened = ctx.islands
      .filter((i) => !wasOpen.has(i.id) && isIslandUnlocked(ctx.islands, i.id, after))
      .map((i) => i.id);
    noteBossWin(after.xp - before.xp, jump, newlyOpened);
    ctx.go({ name: "celebrate", islandId: island.id });
  }

  function restart(): void {
    fight = startFight(boss.rounds.length);
    hp.set(fight.bossHp);
    hearts.set(fight.halves);
    showRound(true);
  }

  function showRound(focusHeading = false): void {
    closeEditor();
    panel.replaceChildren();
    const round = boss.rounds[fight.round];
    const heading = h("h2", { tabindex: -1 }, `Round ${fight.round + 1} of ${fight.rounds}: ${round.title}`);
    const editorHost = h("div", { class: "editor" });
    const runButton = h("button", { class: "btn primary" }, "▶ Run");
    const hintButton = h("button", { class: "btn" });
    const resetButton = h("button", { class: "btn" }, "Reset code");
    const hintList = h("ol", { class: "hints" });
    const consoleHost = h("div");
    const nextRow = h("div", { class: "row" });
    panel.append(heading, prose(round.task), editorHost,
      h("div", { class: "row" }, runButton, hintButton, resetButton), hintList, consoleHost, nextRow);
    const roundEditor = createCodeEditor(editorHost, round.starter);
    editor = roundEditor;
    const output = createConsole(consoleHost);
    if (focusHeading) heading.focus();

    const syncHint = () => {
      hintButton.textContent = `💡 Hint (${fight.hintsLeft} left)`;
      hintButton.disabled = !canHint(fight);
      const why =
        fight.status === "roundWon" ? "Round won"
        : fight.roundHinted ? "You've used this round's hint"
        : fight.hintsLeft === 0 ? "No hints left"
        : null;
      if (why) hintButton.title = why;
      else hintButton.removeAttribute("title");
    };
    syncHint();

    hintButton.addEventListener("click", () => {
      if (!canHint(fight)) return;
      fight = takeHint(fight);
      hintList.append(h("li", {}, prose(round.hint)));
      syncHint();
    });

    resetButton.addEventListener("click", () => {
      if (window.confirm("Replace your code with this round's starter code?")) roundEditor.setCode(round.starter);
    });

    async function run(): Promise<void> {
      runButton.disabled = true;
      output.showRunning();
      const result = await runCode(buildBossProgram(roundEditor.getCode(), round.tests), { tests: true });
      if (!alive || editor !== roundEditor) return;
      if (!result.ok) {
        runButton.disabled = false;
        output.showError(result.message, () => void run());
        return;
      }
      const outcome = judgeRun(round, result.stdout, result.stderr);
      fight = attack(fight, outcome);
      hp.set(fight.bossHp);
      hearts.set(fight.halves);
      if (fight.status === "won") {
        win();
        return;
      }
      syncHint();
      if (outcome === "hit") {
        output.showOutput(result.stdout, "", { text: `💥 Hit! ${boss.name} loses 1 HP.`, kind: "success" });
        const next = h("button", { class: "btn primary" }, "Next round →");
        next.addEventListener("click", () => {
          fight = nextRound(fight);
          showRound(true);
        });
        nextRow.append(next);
        next.focus();
        return;
      }
      if (outcome === "miss") {
        output.showOutput(result.stdout, result.stderr, { text: `🛡 ${boss.name} blocked your attack and hit back. You lose a heart.`, kind: "error" });
      } else {
        output.showOutput("", result.stderr, {
          text: "💨 Your attack fizzled: the code doesn't compile, and you lose half a heart. Read the compiler's message below.",
          kind: "error",
        });
      }
      if (fight.status === "lost") {
        showDefeat(consoleHost);
        return;
      }
      runButton.disabled = false;
    }
    runButton.addEventListener("click", () => void run());
  }

  function showDefeat(consoleHost: HTMLElement): void {
    closeEditor();
    const title = h("h2", { tabindex: -1 }, `${boss.name} wins this time.`);
    const retry = h("button", { class: "btn primary" }, "Try again");
    retry.addEventListener("click", restart);
    const defeatBox = h("div", { class: "defeat" },
      title,
      h("p", {}, "You ran out of hearts. Every fight starts fresh, so try again whenever you're ready."),
      h("div", { class: "row" }, retry, h("a", { class: "btn", href: routeToHash({ name: "island", islandId }) }, `Back to ${island.name}`)),
    );
    panel.replaceChildren(defeatBox, consoleHost);
    title.focus();
  }

  showRound();

  return () => {
    alive = false;
    closeEditor();
  };
}
