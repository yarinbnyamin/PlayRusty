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
