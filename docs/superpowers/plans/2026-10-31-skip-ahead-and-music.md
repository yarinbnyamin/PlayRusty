# Skip-ahead and Soundtrack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players skip lessons or whole islands by beating bosses early, and add a copyright-free soundtrack synthesised live with Web Audio.

**Architecture:** Unlock rules stay pure functions in `src/engine/progress.ts`; screens read them. Music is split into pure note generation (`src/audio/compose.ts`), preferences (`src/audio/prefs.ts`) and a Web Audio engine (`src/audio/music.ts`) exposed to screens through `AppContext.music`.

**Tech Stack:** Vite 8, TypeScript 7 strict, Vitest 4 + jsdom, plain DOM via `h()`, Web Audio API.

Spec: `docs/superpowers/specs/2026-10-31-skip-ahead-and-music-design.md` (addendum to `2026-10-30-playrusty-design.md`).

## Global Constraints

- Every real island's boss is fightable at any time; `isBossUnlocked` is removed.
- Island unlocked = first island, or previous island's boss defeated, or this island's or any later island's boss defeated.
- Audio preferences: localStorage key `playrusty.audio`, shape `{ "enabled": boolean, "volume": number }`, volume 0..1, defaults enabled `true`, volume `0.5`; separate from the save; all storage access in try/catch.
- No audio files, samples or third-party music: all sound is synthesised by `src/audio/music.ts`.
- `AudioContext` is created only on a user gesture (first `pointerdown`/`keydown`, or turning music on) and only when music is enabled; where `AudioContext` does not exist, everything is a silent no-op.
- Exact UI strings (verbatim): "Know this already? Beat the boss to skip the lessons." · "⚡ Jump here: beat {boss name}" · "Win to unlock every island up to here. You can still play the lessons you skip." · ", locked: jump challenge available" · "Jump challenge: beat this boss to unlock every island up to {island name}." · "You jumped ahead! Every island up to {island name} is open now, and the lessons you skipped are waiting for XP and stars." · HUD button text "♪", `aria-label="Music"`, title "Music on" / "Music off" · Settings "Sound", "Play music", "Music volume" · credits sentence "The music is generated live in your browser by PlayRusty's own code, so it is free of copyright."
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `npm test`, `npm run typecheck` and `npm run build` pass after every task. No new dependencies.

## File Map

- Modify `src/engine/progress.ts`: unlock rules, `isJumpChallenge`, `currentIslandId`.
- Modify `src/ui/screens/island.ts`, `map.ts`, `boss.ts`, `celebrate.ts`: skip-ahead UI.
- Create `src/audio/prefs.ts`, `src/audio/compose.ts`, `src/audio/music.ts`.
- Modify `src/ui/app.ts` (music member), `src/main.ts` (create music, theme per route), `src/ui/components/hud.ts` (toggle), `src/ui/screens/settings.ts` (Sound section, credits), `src/styles/main.css`.
- Tests: modify `tests/progress.test.ts`, `tests/fixtures.ts`; create `tests/skipAhead.test.ts`, `tests/audio.test.ts`, `tests/musicUi.test.ts`.

---

### Task 1: Skip ahead

**Files:**
- Modify: `src/engine/progress.ts`, `src/ui/screens/island.ts`, `src/ui/screens/map.ts`, `src/ui/screens/boss.ts`, `src/ui/screens/celebrate.ts`, `src/styles/main.css`
- Test: `tests/progress.test.ts`, `tests/skipAhead.test.ts`

**Interfaces:**
- Produces: `isJumpChallenge(islands: Island[], islandId: string, save: SaveData): boolean`; `noteBossWin(xp: number, jumped: boolean): void` (replaces `noteBossXp`). Removes `isBossUnlocked`.

- [ ] **Step 1: Update the progress tests**

In `tests/progress.test.ts`, change the import list: remove `isBossUnlocked`, add `isJumpChallenge`. Replace the whole `it("unlocks the boss when every visible stage is complete", ...)` block with:

```ts
  it("unlocks every island up to and after a boss beaten by jumping ahead", () => {
    const four = [islandA, islandB, makeIsland("c"), makeIsland("d")];
    const save = recordBossDefeated(emptySave(), "c", 0);
    expect(isIslandUnlocked(four, "a", save)).toBe(true);
    expect(isIslandUnlocked(four, "b", save)).toBe(true);
    expect(isIslandUnlocked(four, "c", save)).toBe(true);
    expect(isIslandUnlocked(four, "d", save)).toBe(true);
  });

  it("marks the bosses of locked islands as jump challenges", () => {
    const save = emptySave();
    expect(isJumpChallenge(islands, "a", save)).toBe(false);
    expect(isJumpChallenge(islands, "b", save)).toBe(true);
    expect(isJumpChallenge(islands, "b", recordBossDefeated(save, "a", 0))).toBe(false);
    expect(isJumpChallenge(islands, "nope", save)).toBe(false);
  });

  it("opens every stage once the island's boss is beaten", () => {
    const save = recordBossDefeated(emptySave("beginner"), "a", 0);
    expect(isStageUnlocked(islands, "a", "s2", save)).toBe(true);
    expect(isStageUnlocked(islands, "a", "nope", save)).toBe(false);
  });
```

In `it("finds the island Ferris should stand on", ...)`, add before the `currentIslandId([], save)` line:

```ts
    const three = [islandA, islandB, makeIsland("c")];
    expect(currentIslandId(three, recordBossDefeated(save, "b", 0))).toBe("c");
```

- [ ] **Step 2: Write the screen tests**

Create `tests/skipAhead.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run tests/progress.test.ts tests/skipAhead.test.ts`
Expected: FAIL (`isJumpChallenge` is not exported; locked island redirects; map nodes not links).

- [ ] **Step 4: Change the rules in `src/engine/progress.ts`**

Replace `isIslandUnlocked`, `isStageUnlocked`, `isBossUnlocked` and `currentIslandId` with:

```ts
export function isIslandUnlocked(islands: Island[], islandId: string, save: SaveData): boolean {
  const index = islands.findIndex((island) => island.id === islandId);
  if (index < 0) return false;
  if (index === 0) return true;
  // The previous boss, this island's boss, or any later boss (beaten by jumping ahead) opens it.
  return islands.slice(index - 1).some((island) => isBossDefeated(save, island.id));
}

/** True when the island exists but is locked: beating its boss is a jump ahead. */
export function isJumpChallenge(islands: Island[], islandId: string, save: SaveData): boolean {
  return islands.some((island) => island.id === islandId) && !isIslandUnlocked(islands, islandId, save);
}

export function isStageUnlocked(islands: Island[], islandId: string, stageId: string, save: SaveData): boolean {
  const island = islands.find((i) => i.id === islandId);
  if (!island || !isIslandUnlocked(islands, islandId, save)) return false;
  if (isStageComplete(save, islandId, stageId)) return true;
  const stages = visibleStages(island, modeOf(save));
  const index = stages.findIndex((stage) => stage.id === stageId);
  if (index < 0) return false;
  if (isBossDefeated(save, islandId)) return true;
  return stages.slice(0, index).every((stage) => isStageComplete(save, islandId, stage.id));
}

/** The island Ferris stands on: the one after the furthest defeated boss, else the first. */
export function currentIslandId(islands: Island[], save: SaveData): string | null {
  if (islands.length === 0) return null;
  let furthest = -1;
  islands.forEach((island, index) => {
    if (isBossDefeated(save, island.id)) furthest = index;
  });
  return islands[Math.min(furthest + 1, islands.length - 1)].id;
}
```

- [ ] **Step 5: Island screen (`src/ui/screens/island.ts`)**

Replace the whole file with:

```ts
import {
  isBossDefeated, isIslandUnlocked, isStageComplete, isStageUnlocked, modeOf, stageKey, visibleStages,
} from "../../engine/progress";
import { routeToHash } from "../../router";
import { noop, type AppContext, type Cleanup } from "../app";
import { renderHud } from "../components/hud";
import { starsLabel } from "../components/stars";
import { h } from "../dom";

export function renderIsland(root: HTMLElement, ctx: AppContext, islandId: string): Cleanup {
  const save = ctx.getSave();
  const island = ctx.islands.find((i) => i.id === islandId);
  if (!island) {
    ctx.go({ name: "map" });
    return noop;
  }
  const unlocked = isIslandUnlocked(ctx.islands, island.id, save);
  const stages = visibleStages(island, modeOf(save));

  const list = h("ol", { class: "stage-list" });
  for (const stage of stages) {
    const open = isStageUnlocked(ctx.islands, island.id, stage.id, save);
    const stars = save.stages[stageKey(island.id, stage.id)]?.stars;
    list.append(
      h("li", {},
        open
          ? h("a", { class: "stage-card", href: routeToHash({ name: "stage", islandId: island.id, stageId: stage.id }) },
              h("span", {}, stage.title),
              h("span", { class: "stars", role: "img", "aria-label": stars ? `${stars} of 3 stars` : "not completed" }, starsLabel(stars)))
          : h("div", { class: "stage-card locked", "aria-disabled": "true" }, h("span", {}, `🔒 ${stage.title}`))),
    );
  }

  const bossHref = routeToHash({ name: "boss", islandId: island.id });
  const bossStars = save.bosses[island.id]?.stars;
  const bossCard = unlocked
    ? h("a", { class: "stage-card boss", href: bossHref },
        h("span", {}, `⚔ Boss: ${island.boss.name}`),
        h("span", { class: "stars", role: "img", "aria-label": bossStars ? `${bossStars} of 3 stars` : "not completed" }, starsLabel(bossStars)))
    : h("a", { class: "stage-card boss jump", href: bossHref }, h("span", {}, `⚡ Jump here: beat ${island.boss.name}`));

  const lessonsLeft = !stages.every((stage) => isStageComplete(save, island.id, stage.id));
  const bossNote = !unlocked
    ? h("p", { class: "muted skip-note" }, "Win to unlock every island up to here. You can still play the lessons you skip.")
    : !isBossDefeated(save, island.id) && lessonsLeft
      ? h("p", { class: "muted skip-note" }, "Know this already? Beat the boss to skip the lessons.")
      : null;

  root.append(
    renderHud(ctx),
    h("main", { class: "island-screen" },
      h("a", { class: "back", href: routeToHash({ name: "map" }) }, "← World map"),
      h("h1", {}, `${island.number}. ${island.name}`),
      h("p", { class: "muted" }, `Topic: ${island.topic} · `,
        h("a", { href: island.rustBook, target: "_blank", rel: "noopener" }, "Read the Rust Book chapter")),
      list,
      bossCard,
      bossNote),
  );
  return noop;
}
```

- [ ] **Step 6: Map (`src/ui/screens/map.ts`)**

Replace the block starting `if (island && unlocked) {` up to (not including) `map.append(node);` with:

```ts
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
```

- [ ] **Step 7: Boss screen (`src/ui/screens/boss.ts`)**

1. Import line 1 becomes `import { isJumpChallenge, recordBossDefeated } from "../../engine/progress";` and `import { noteBossXp } from "./celebrate";` becomes `import { noteBossWin } from "./celebrate";`.
2. Delete the `if (!isBossUnlocked(...)) { ... }` block. After `const island: Island = foundIsland;` add `const jump = isJumpChallenge(ctx.islands, islandId, save);`.
3. In `main.append(...)`, right after `prose(boss.story),` add:
   ```ts
    jump ? h("p", { class: "jump-notice" }, `Jump challenge: beat this boss to unlock every island up to ${island.name}.`) : null,
   ```
4. Replace `noteBossXp(ctx.getSave().xp - xpBefore);` with `noteBossWin(ctx.getSave().xp - xpBefore, jump);`.

- [ ] **Step 8: Celebrate screen (`src/ui/screens/celebrate.ts`)**

Replace the `xpFromLastWin` variable and `noteBossXp` with:

```ts
let lastWin = { xp: 0, jumped: false };

/** Called by the boss screen right before navigating here. */
export function noteBossWin(xp: number, jumped: boolean): void {
  lastWin = { xp, jumped };
}
```

Replace `const xp = xpFromLastWin;` and `xpFromLastWin = 0;` with:

```ts
  const { xp, jumped } = lastWin;
  lastWin = { xp: 0, jumped: false };
```

and right after the `` h("p", {}, `You earned the ${island.name} badge...`) `` line add:

```ts
      jumped
        ? h("p", {}, `You jumped ahead! Every island up to ${island.name} is open now, and the lessons you skipped are waiting for XP and stars.`)
        : null,
```

- [ ] **Step 9: CSS (`src/styles/main.css`)**

Change `.island-node.open, .island-node.done { cursor: pointer; }` to `.island-node.open, .island-node.done, .island-node.locked { cursor: pointer; }`, and after the `.island-node.locked .land` rule add:

```css
.island-node.locked:hover .land { fill: #5b6670; }
```

After the `.stage-card.boss` rule add:

```css
.stage-card.jump { border-style: dashed; border-color: var(--gold); }
.skip-note { margin-top: 8px; }
.jump-notice { color: var(--gold); font-weight: 600; }
```

- [ ] **Step 10: Run tests, typecheck, build**

Run: `npx vitest run tests/progress.test.ts tests/skipAhead.test.ts`, then `npm test`, `npm run typecheck`, `npm run build`. Expected: all PASS (`grep -rn "isBossUnlocked\|noteBossXp" src tests` prints nothing).

- [ ] **Step 11: Commit**

```bash
git add src tests
git commit -m "feat: skip ahead by beating bosses early" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Audio preferences and composition

**Files:**
- Create: `src/audio/prefs.ts`, `src/audio/compose.ts`
- Modify: `tests/fixtures.ts`
- Test: `tests/audio.test.ts`

**Interfaces:**
- Produces: `AUDIO_KEY`, `AudioPrefs`, `DEFAULT_AUDIO_PREFS`, `clampVolume(v: unknown): number`, `loadAudioPrefs(storage: Storage | null): AudioPrefs`, `saveAudioPrefs(storage: Storage | null, prefs: AudioPrefs): void`; `ThemeName`, `Voice`, `NoteEvent`, `Theme`, `THEMES`, `LOOP_BARS`, `midiToHz`, `seededRandom`, `eventsForBar(theme: Theme, bar: number): NoteEvent[]`; test helper `memoryStorage(initial?: Record<string, string>): Storage` in `tests/fixtures.ts`.

- [ ] **Step 1: Add the storage fixture**

Append to `tests/fixtures.ts`:

```ts
/** A minimal in-memory Storage for tests. */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/audio.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LOOP_BARS, THEMES, eventsForBar, midiToHz } from "../src/audio/compose";
import { AUDIO_KEY, DEFAULT_AUDIO_PREFS, loadAudioPrefs, saveAudioPrefs } from "../src/audio/prefs";
import { memoryStorage } from "./fixtures";

const bars = Array.from({ length: LOOP_BARS }, (_, i) => i);

describe("audio preferences", () => {
  it("defaults to music on at half volume", () => {
    expect(DEFAULT_AUDIO_PREFS).toEqual({ enabled: true, volume: 0.5 });
    expect(loadAudioPrefs(null)).toEqual({ enabled: true, volume: 0.5 });
    expect(loadAudioPrefs(memoryStorage())).toEqual({ enabled: true, volume: 0.5 });
  });

  it("round-trips and clamps", () => {
    const storage = memoryStorage();
    saveAudioPrefs(storage, { enabled: false, volume: 3 });
    expect(JSON.parse(storage.getItem(AUDIO_KEY)!)).toEqual({ enabled: false, volume: 1 });
    expect(loadAudioPrefs(storage)).toEqual({ enabled: false, volume: 1 });
  });

  it("falls back to defaults for corrupt data", () => {
    expect(loadAudioPrefs(memoryStorage({ [AUDIO_KEY]: "{not json" }))).toEqual(DEFAULT_AUDIO_PREFS);
    expect(loadAudioPrefs(memoryStorage({ [AUDIO_KEY]: '{"enabled":"yes","volume":-2}' })))
      .toEqual({ enabled: true, volume: 0 });
  });

  it("survives storage that throws", () => {
    const broken = memoryStorage();
    broken.setItem = () => { throw new Error("full"); };
    broken.getItem = () => { throw new Error("blocked"); };
    expect(() => saveAudioPrefs(broken, DEFAULT_AUDIO_PREFS)).not.toThrow();
    expect(loadAudioPrefs(broken)).toEqual(DEFAULT_AUDIO_PREFS);
  });
});

describe("composition", () => {
  it("converts MIDI notes to hertz", () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBe(880);
  });

  it("is deterministic and loops every LOOP_BARS bars", () => {
    for (const theme of Object.values(THEMES)) {
      expect(eventsForBar(theme, 3)).toEqual(eventsForBar(theme, 3));
      expect(eventsForBar(theme, 3 + LOOP_BARS)).toEqual(eventsForBar(theme, 3));
    }
  });

  it("keeps every event inside its bar", () => {
    for (const theme of Object.values(THEMES)) {
      for (const bar of bars) {
        for (const event of eventsForBar(theme, bar)) {
          expect(event.beat).toBeGreaterThanOrEqual(0);
          expect(event.beat).toBeLessThan(theme.beatsPerBar);
          expect(event.length).toBeGreaterThan(0);
          expect(event.velocity).toBeGreaterThan(0);
          expect(event.velocity).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("plays melody notes from the theme's scale", () => {
    for (const theme of Object.values(THEMES)) {
      for (const bar of bars) {
        for (const event of eventsForBar(theme, bar)) {
          if (event.voice === "pluck" || event.voice === "arp") {
            expect(theme.scale).toContain(event.midi % 12);
          }
        }
      }
    }
  });

  it("keeps every boss-theme pitch in A minor", () => {
    for (const bar of bars) {
      for (const event of eventsForBar(THEMES.boss, bar)) {
        if (event.voice !== "kick" && event.voice !== "hat") expect(THEMES.boss.scale).toContain(event.midi % 12);
      }
    }
  });

  it("makes the boss theme busier than the calm one", () => {
    for (const bar of bars) {
      expect(eventsForBar(THEMES.boss, bar).length).toBeGreaterThan(eventsForBar(THEMES.calm, bar).length);
    }
  });
});
```

- [ ] **Step 3: Run to see it fail**

Run: `npx vitest run tests/audio.test.ts`
Expected: FAIL (cannot resolve `../src/audio/compose`).

- [ ] **Step 4: Create `src/audio/prefs.ts`**

```ts
export const AUDIO_KEY = "playrusty.audio";

export interface AudioPrefs {
  enabled: boolean;
  /** 0..1 */
  volume: number;
}

export const DEFAULT_AUDIO_PREFS: AudioPrefs = { enabled: true, volume: 0.5 };

export function clampVolume(volume: unknown): number {
  if (typeof volume !== "number" || !Number.isFinite(volume)) return DEFAULT_AUDIO_PREFS.volume;
  return Math.min(1, Math.max(0, volume));
}

export function loadAudioPrefs(storage: Storage | null): AudioPrefs {
  try {
    const raw = storage?.getItem(AUDIO_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_PREFS };
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return { ...DEFAULT_AUDIO_PREFS };
    const record = data as Record<string, unknown>;
    return {
      enabled: typeof record.enabled === "boolean" ? record.enabled : DEFAULT_AUDIO_PREFS.enabled,
      volume: clampVolume(record.volume),
    };
  } catch {
    return { ...DEFAULT_AUDIO_PREFS };
  }
}

export function saveAudioPrefs(storage: Storage | null, prefs: AudioPrefs): void {
  try {
    storage?.setItem(AUDIO_KEY, JSON.stringify({ enabled: prefs.enabled, volume: clampVolume(prefs.volume) }));
  } catch {
    // Storage is blocked or full: the preference lasts for this visit only.
  }
}
```

- [ ] **Step 5: Create `src/audio/compose.ts`**

```ts
export type ThemeName = "calm" | "boss";
export type Voice = "pad" | "pluck" | "bass" | "arp" | "kick" | "hat";

export interface NoteEvent {
  /** Start, in beats from the beginning of the bar. */
  beat: number;
  /** Length in beats. */
  length: number;
  voice: Voice;
  /** MIDI note number; 0 for drums. */
  midi: number;
  /** 0..1 */
  velocity: number;
}

export interface Theme {
  name: ThemeName;
  bpm: number;
  beatsPerBar: number;
  /** One chord per bar (MIDI notes, low to high); the progression loops. */
  chords: number[][];
  /** Pitch classes (0 = C) that melody notes use. */
  scale: number[];
}

export const THEMES: Record<ThemeName, Theme> = {
  calm: {
    name: "calm",
    bpm: 70,
    beatsPerBar: 4,
    // Cmaj7, Am7, Fmaj7, G6
    chords: [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 52, 59]],
    // C major pentatonic
    scale: [0, 2, 4, 7, 9],
  },
  boss: {
    name: "boss",
    bpm: 116,
    beatsPerBar: 4,
    // Am, F, G, Em
    chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]],
    // A natural minor
    scale: [9, 11, 0, 2, 4, 5, 7],
  },
};

/** Each bar has its own seed, so the music repeats exactly every LOOP_BARS bars. */
export const LOOP_BARS = 16;

export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** mulberry32: a tiny seeded random number generator returning 0..1. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (n: number, size: number): number => ((n % size) + size) % size;

export function eventsForBar(theme: Theme, bar: number): NoteEvent[] {
  const chord = theme.chords[wrap(bar, theme.chords.length)];
  const loopBar = wrap(bar, LOOP_BARS);
  return theme.name === "calm"
    ? calmBar(theme, chord, seededRandom(1000 + loopBar))
    : bossBar(theme, chord, seededRandom(2000 + loopBar));
}

function calmBar(theme: Theme, chord: number[], random: () => number): NoteEvent[] {
  const events: NoteEvent[] = chord.map((midi) => ({ beat: 0, length: theme.beatsPerBar, voice: "pad", midi, velocity: 0.5 }));
  events.push({ beat: 0, length: 2, voice: "bass", midi: chord[0] - 12, velocity: 0.45 });
  // Sparse plucked notes: each eighth note has a 30% chance of one, an octave above middle C.
  for (let eighth = 0; eighth < theme.beatsPerBar * 2; eighth++) {
    if (random() < 0.3) {
      const pitchClass = theme.scale[Math.floor(random() * theme.scale.length)];
      events.push({ beat: eighth / 2, length: 1.5, voice: "pluck", midi: 72 + pitchClass, velocity: 0.35 + random() * 0.25 });
    }
  }
  return events;
}

function bossBar(theme: Theme, chord: number[], random: () => number): NoteEvent[] {
  const events: NoteEvent[] = chord.slice(1).map((midi) => ({ beat: 0, length: theme.beatsPerBar, voice: "pad", midi, velocity: 0.25 }));
  for (let eighth = 0; eighth < theme.beatsPerBar * 2; eighth++) {
    const beat = eighth / 2;
    events.push({ beat, length: 0.45, voice: "bass", midi: chord[0], velocity: eighth % 2 === 0 ? 0.6 : 0.4 });
    if (eighth % 2 === 1) events.push({ beat, length: 0.1, voice: "hat", midi: 0, velocity: 0.25 });
  }
  for (const beat of [0, 2]) events.push({ beat, length: 0.5, voice: "kick", midi: 0, velocity: 0.7 });
  // Sixteenth-note arpeggio over the chord's upper notes, an octave up, with a few rests.
  const upper = chord.slice(1).map((midi) => midi + 12);
  const pattern = [0, 1, 2, 1];
  for (let step = 0; step < theme.beatsPerBar * 4; step++) {
    if (random() < 0.15) continue;
    events.push({ beat: step / 4, length: 0.22, voice: "arp", midi: upper[pattern[step % pattern.length]], velocity: 0.3 });
  }
  return events;
}
```

- [ ] **Step 6: Run tests, full suite, typecheck**

Run: `npx vitest run tests/audio.test.ts`, then `npm test` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/audio tests/audio.test.ts tests/fixtures.ts
git commit -m "feat: audio preferences and generative music themes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Music engine and controls

**Files:**
- Create: `src/audio/music.ts`
- Modify: `src/ui/app.ts`, `src/main.ts`, `src/ui/components/hud.ts`, `src/ui/screens/settings.ts`, `src/styles/main.css`
- Test: `tests/musicUi.test.ts`

**Interfaces:**
- Consumes (Task 2): `loadAudioPrefs`, `saveAudioPrefs`, `clampVolume`, `AudioPrefs`, `THEMES`, `eventsForBar`, `midiToHz`, `NoteEvent`, `ThemeName`, `memoryStorage`.
- Produces: `MusicController { readonly enabled: boolean; readonly volume: number; setEnabled(on: boolean): void; setVolume(volume: number): void; setTheme(theme: ThemeName): void }`, `createMusic(storage: Storage | null): MusicController`; `AppContext.music`; `createAppContext(store, islands, comingSoon, music?)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/musicUi.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMusic } from "../src/audio/music";
import { AUDIO_KEY } from "../src/audio/prefs";
import { createSaveStore } from "../src/engine/save";
import { createAppContext } from "../src/ui/app";
import { renderHud } from "../src/ui/components/hud";
import { renderSettings } from "../src/ui/screens/settings";
import { emptySave, makeIsland, memoryStorage } from "./fixtures";

function fakeParam() {
  return {
    value: 0,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime() {}, cancelScheduledValues() {},
  };
}

function fakeNode() {
  return {
    connect: (next: unknown) => next,
    start() {}, stop() {},
    gain: fakeParam(), frequency: fakeParam(), detune: fakeParam(), delayTime: fakeParam(), Q: fakeParam(),
    type: "", buffer: null, loop: false,
  };
}

class FakeAudioContext {
  static instances = 0;
  state = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = fakeNode();
  constructor() {
    FakeAudioContext.instances += 1;
  }
  createGain = fakeNode;
  createOscillator = fakeNode;
  createBiquadFilter = fakeNode;
  createDelay = fakeNode;
  createBufferSource = fakeNode;
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
}

describe("music controller", () => {
  beforeEach(() => {
    FakeAudioContext.instances = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is a silent no-op without Web Audio", () => {
    const storage = memoryStorage();
    const music = createMusic(storage);
    expect(() => {
      music.setTheme("boss");
      music.setVolume(0.2);
      music.setEnabled(false);
    }).not.toThrow();
    expect(music.enabled).toBe(false);
    expect(music.volume).toBe(0.2);
    expect(JSON.parse(storage.getItem(AUDIO_KEY)!)).toEqual({ enabled: false, volume: 0.2 });
  });

  it("starts audio on the first gesture, once, only when enabled", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.useFakeTimers();
    createMusic(memoryStorage());
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("keydown"));
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("waits for the player to turn music on when it is off", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.useFakeTimers();
    const music = createMusic(memoryStorage({ [AUDIO_KEY]: '{"enabled":false,"volume":0.5}' }));
    window.dispatchEvent(new Event("pointerdown"));
    expect(FakeAudioContext.instances).toBe(0);
    music.setEnabled(true);
    expect(FakeAudioContext.instances).toBe(1);
    music.setTheme("boss");
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});

describe("music controls", () => {
  function setup() {
    const storage = memoryStorage();
    const ctx = createAppContext(createSaveStore(null), [makeIsland("a")], [], createMusic(storage));
    ctx.update(() => emptySave("beginner"));
    return { ctx, storage };
  }

  it("toggles music from the HUD", () => {
    const { ctx, storage } = setup();
    const hud = renderHud(ctx);
    const button = hud.querySelector<HTMLButtonElement>('button[aria-label="Music"]')!;
    expect(button.textContent).toBe("♪");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.title).toBe("Music on");
    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.title).toBe("Music off");
    expect(JSON.parse(storage.getItem(AUDIO_KEY)!).enabled).toBe(false);
  });

  it("offers music on/off and volume in Settings", () => {
    const { ctx } = setup();
    const root = document.createElement("div");
    renderSettings(root, ctx);
    expect(root.textContent).toContain("Sound");
    expect(root.textContent).toContain("free of copyright");
    const box = root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(box.checked).toBe(true);
    expect(slider.value).toBe("50");
    box.checked = false;
    box.dispatchEvent(new Event("change"));
    slider.value = "20";
    slider.dispatchEvent(new Event("input"));
    expect(ctx.music.enabled).toBe(false);
    expect(ctx.music.volume).toBe(0.2);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/musicUi.test.ts`
Expected: FAIL (cannot resolve `../src/audio/music`).

- [ ] **Step 3: Create `src/audio/music.ts`**

```ts
import { THEMES, eventsForBar, midiToHz, type NoteEvent, type ThemeName } from "./compose";
import { clampVolume, loadAudioPrefs, saveAudioPrefs, type AudioPrefs } from "./prefs";

export interface MusicController {
  readonly enabled: boolean;
  readonly volume: number;
  setEnabled(on: boolean): void;
  setVolume(volume: number): void;
  setTheme(theme: ThemeName): void;
}

/** Schedule notes this many seconds ahead of the audio clock. */
const LOOKAHEAD_S = 0.4;
const TICK_MS = 100;
const FADE_S = 1.5;
/** Keeps the music quiet under the reading. */
const MASTER_LEVEL = 0.35;

type AudioContextCtor = new () => AudioContext;

function findAudioContext(): AudioContextCtor | null {
  const scope = globalThis as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/** Music settings plus, where the browser has Web Audio, a synthesiser started on the first gesture. */
export function createMusic(storage: Storage | null): MusicController {
  let prefs: AudioPrefs = loadAudioPrefs(storage);
  let theme: ThemeName = "calm";
  let engine: Engine | null = null;
  const Ctor = findAudioContext();

  const start = () => {
    if (!Ctor || !prefs.enabled) return;
    engine ??= createEngine(new Ctor(), theme, prefs.volume);
    engine.resume();
  };

  if (Ctor) {
    const firstGesture = () => {
      window.removeEventListener("pointerdown", firstGesture);
      window.removeEventListener("keydown", firstGesture);
      start();
    };
    window.addEventListener("pointerdown", firstGesture);
    window.addEventListener("keydown", firstGesture);
    document.addEventListener("visibilitychange", () => {
      if (!engine) return;
      if (document.hidden) engine.pause();
      else if (prefs.enabled) engine.resume();
    });
  }

  return {
    get enabled() { return prefs.enabled; },
    get volume() { return prefs.volume; },
    setEnabled(on) {
      prefs = { ...prefs, enabled: on };
      saveAudioPrefs(storage, prefs);
      if (on) start();
      else engine?.pause();
    },
    setVolume(volume) {
      prefs = { ...prefs, volume: clampVolume(volume) };
      saveAudioPrefs(storage, prefs);
      engine?.setVolume(prefs.volume);
    },
    setTheme(next) {
      theme = next;
      engine?.setTheme(next);
    },
  };
}

interface Engine {
  resume(): void;
  pause(): void;
  setVolume(volume: number): void;
  setTheme(theme: ThemeName): void;
}

function createEngine(ctx: AudioContext, initial: ThemeName, volume: number): Engine {
  const master = ctx.createGain();
  master.gain.value = volume * MASTER_LEVEL;
  master.connect(ctx.destination);

  // A shared echo for plucks and arpeggios.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.36;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = 0.35;
  echo.connect(feedback).connect(echo);
  echo.connect(echoLevel).connect(master);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const buses: Record<ThemeName, GainNode> = { calm: ctx.createGain(), boss: ctx.createGain() };
  for (const name of ["calm", "boss"] as const) {
    buses[name].gain.value = name === initial ? 1 : 0;
    buses[name].connect(master);
  }

  // The calm theme's ocean: looped noise, low-passed, slowly swelling.
  const ocean = ctx.createBufferSource();
  ocean.buffer = noise;
  ocean.loop = true;
  const oceanFilter = ctx.createBiquadFilter();
  oceanFilter.type = "lowpass";
  oceanFilter.frequency.value = 420;
  const oceanGain = ctx.createGain();
  oceanGain.gain.value = 0.05;
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.08;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.035;
  swell.connect(swellDepth).connect(oceanGain.gain);
  ocean.connect(oceanFilter).connect(oceanGain).connect(buses.calm);
  ocean.start();
  swell.start();

  function envelope(when: number, attack: number, peak: number, hold: number, release: number): GainNode {
    const gain = ctx.createGain();
    const holdEnd = when + Math.max(attack, hold);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.setValueAtTime(peak, holdEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, holdEnd + release);
    return gain;
  }

  function filter(type: BiquadFilterType, frequency: number): BiquadFilterNode {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    return node;
  }

  function tone(type: OscillatorType, hz: number, when: number, until: number, into: AudioNode, detune = 0): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    osc.detune.value = detune;
    osc.connect(into);
    osc.start(when);
    osc.stop(until);
  }

  function play(event: NoteEvent, when: number, seconds: number, out: AudioNode): void {
    const hz = midiToHz(event.midi);
    const v = event.velocity;
    switch (event.voice) {
      case "pad": {
        const gain = envelope(when, Math.min(1.2, seconds / 2), v * 0.12, seconds, 1.2);
        const soft = filter("lowpass", 1100);
        soft.connect(gain).connect(out);
        for (const cents of [-6, 6]) tone("triangle", hz, when, when + seconds + 1.3, soft, cents);
        break;
      }
      case "pluck": {
        const gain = envelope(when, 0.005, v * 0.2, 0.01, Math.max(0.2, seconds));
        gain.connect(out);
        gain.connect(echo);
        tone("triangle", hz, when, when + seconds + 0.1, gain);
        break;
      }
      case "bass": {
        const gain = envelope(when, 0.01, v * 0.22, seconds * 0.6, seconds * 0.4 + 0.05);
        const soft = filter("lowpass", 600);
        soft.connect(gain).connect(out);
        tone("triangle", hz, when, when + seconds + 0.1, soft);
        break;
      }
      case "arp": {
        const gain = envelope(when, 0.005, v * 0.08, 0.01, 0.18);
        const soft = filter("lowpass", 1800);
        soft.connect(gain);
        gain.connect(out);
        gain.connect(echo);
        tone("sawtooth", hz, when, when + 0.25, soft);
        break;
      }
      case "kick": {
        const gain = envelope(when, 0.002, v * 0.6, 0.002, 0.3);
        gain.connect(out);
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(120, when);
        osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
        osc.connect(gain);
        osc.start(when);
        osc.stop(when + 0.35);
        break;
      }
      case "hat": {
        const gain = envelope(when, 0.001, v * 0.12, 0.001, 0.05);
        const bright = filter("highpass", 7000);
        bright.connect(gain).connect(out);
        const hiss = ctx.createBufferSource();
        hiss.buffer = noise;
        hiss.connect(bright);
        hiss.start(when);
        hiss.stop(when + 0.08);
        break;
      }
    }
  }

  let current: ThemeName = initial;
  let fadingOut: { theme: ThemeName; until: number } | null = null;
  const heads: Record<ThemeName, { bar: number; time: number }> = {
    calm: { bar: 0, time: 0 },
    boss: { bar: 0, time: 0 },
  };
  heads[initial] = { bar: 0, time: ctx.currentTime + 0.1 };

  function schedule(name: ThemeName, horizon: number): void {
    const theme = THEMES[name];
    const beat = 60 / theme.bpm;
    const head = heads[name];
    // After a pause the clock may have run past the playhead: restart from now.
    if (head.time < ctx.currentTime) head.time = ctx.currentTime + 0.05;
    while (head.time < horizon) {
      for (const event of eventsForBar(theme, head.bar)) {
        play(event, head.time + event.beat * beat, event.length * beat, buses[name]);
      }
      head.time += theme.beatsPerBar * beat;
      head.bar += 1;
    }
  }

  function tick(): void {
    if (ctx.state !== "running") return;
    if (fadingOut && ctx.currentTime > fadingOut.until) fadingOut = null;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    schedule(current, horizon);
    if (fadingOut) schedule(fadingOut.theme, horizon);
  }
  window.setInterval(tick, TICK_MS);

  return {
    resume: () => void ctx.resume(),
    pause: () => void ctx.suspend(),
    setVolume(next) {
      master.gain.setTargetAtTime(next * MASTER_LEVEL, ctx.currentTime, 0.05);
    },
    setTheme(next) {
      if (next === current) return;
      const now = ctx.currentTime;
      for (const name of ["calm", "boss"] as const) {
        const gain = buses[name].gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(name === next ? 1 : 0, now + FADE_S);
      }
      fadingOut = { theme: current, until: now + FADE_S };
      current = next;
      // Start the new theme from its first bar unless it is still scheduled ahead from a quick switch back.
      if (heads[next].time < now) heads[next] = { bar: 0, time: now + 0.05 };
    },
  };
}
```

- [ ] **Step 4: Wire it into `AppContext` (`src/ui/app.ts`)**

Add `import { createMusic, type MusicController } from "../audio/music";`. Add to the `AppContext` interface, after `persistent`:

```ts
  /** Background music settings and playback. */
  readonly music: MusicController;
```

Change the signature to `createAppContext(store: SaveStore, islands: Island[], comingSoon: ComingSoonIsland[], music: MusicController = createMusic(null)): AppContext` and add `music,` to the returned object after `persistent: store.persistent,`.

- [ ] **Step 5: `src/main.ts`**

Add `import { createMusic } from "./audio/music";`. Replace the `const ctx = ...` line with:

```ts
const storage = getBrowserStorage();
const music = createMusic(storage);
const ctx = createAppContext(createSaveStore(storage), islands, comingSoon, music);
```

In `show(route)`, right after `window.scrollTo(0, 0);` add:

```ts
  music.setTheme(route.name === "boss" ? "boss" : "calm");
```

- [ ] **Step 6: HUD toggle (`src/ui/components/hud.ts`)**

Add before `renderHud`:

```ts
function musicToggle(ctx: AppContext): HTMLButtonElement {
  const button = h("button", { class: "btn small music-toggle", type: "button", "aria-label": "Music" }, "♪");
  const sync = () => {
    button.setAttribute("aria-pressed", String(ctx.music.enabled));
    button.title = ctx.music.enabled ? "Music on" : "Music off";
  };
  button.addEventListener("click", () => {
    ctx.music.setEnabled(!ctx.music.enabled);
    sync();
  });
  sync();
  return button;
}
```

and insert `musicToggle(ctx),` in `renderHud` right before the Settings link.

- [ ] **Step 7: Settings (`src/ui/screens/settings.ts`)**

Append to `CREDITS`, inside the string concatenation after the Ferris sentence (keep a leading space): `" The music is generated live in your browser by PlayRusty's own code, so it is free of copyright."`

Inside `renderSettings`, before `root.append(`, add:

```ts
  const musicBox = h("input", {
    type: "checkbox",
    checked: ctx.music.enabled,
    onchange: (event: Event) => ctx.music.setEnabled((event.target as HTMLInputElement).checked),
  });
  const volume = h("input", {
    type: "range", min: 0, max: 100, step: 5,
    value: Math.round(ctx.music.volume * 100),
    oninput: (event: Event) => ctx.music.setVolume(Number((event.target as HTMLInputElement).value) / 100),
  });
```

and insert this section between the learner-mode `fieldset` and the Progress section:

```ts
      h("section", {},
        h("h2", {}, "Sound"),
        h("label", { class: "radio" }, musicBox, "Play music"),
        h("label", { class: "volume" }, "Music volume", volume)),
```

- [ ] **Step 8: CSS (`src/styles/main.css`)**

Append:

```css
.music-toggle[aria-pressed="false"] { opacity: 0.55; text-decoration: line-through; }
.volume { display: flex; gap: 12px; align-items: center; padding: 6px 0; }
.volume input { flex: 1; max-width: 240px; accent-color: var(--rust); }
```

- [ ] **Step 9: Run tests, typecheck, build**

Run: `npx vitest run tests/musicUi.test.ts`, then `npm test`, `npm run typecheck`, `npm run build`. Expected: PASS.

- [ ] **Step 10: Manual check in the browser**

Start `npm run dev` in the background, open http://localhost:5173/PlayRusty/, click anywhere: calm music starts. Open a boss: it cross-fades to the boss theme. Toggle ♪ off and on; change volume in Settings; hide the tab and come back. Report what you could and couldn't verify; stop the server.

- [ ] **Step 11: Commit**

```bash
git add src tests
git commit -m "feat: live-synthesised soundtrack with mute and volume controls" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
