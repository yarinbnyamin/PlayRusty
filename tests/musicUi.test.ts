import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMusic, silentMusic } from "../src/audio/music";
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
  static resumeCalls = 0;
  static gains: ReturnType<typeof fakeNode>[] = [];
  static failToConstruct = false;
  state = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = fakeNode();
  constructor() {
    if (FakeAudioContext.failToConstruct) throw new Error("no audio");
    FakeAudioContext.instances += 1;
  }
  createGain() {
    const node = fakeNode();
    FakeAudioContext.gains.push(node);
    return node;
  }
  createOscillator = fakeNode;
  createBiquadFilter = fakeNode;
  createDelay = fakeNode;
  createBufferSource = fakeNode;
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume() {
    FakeAudioContext.resumeCalls += 1;
    return Promise.resolve();
  }
  suspend() { return Promise.resolve(); }
}

describe("music controller", () => {
  beforeEach(() => {
    FakeAudioContext.instances = 0;
    FakeAudioContext.resumeCalls = 0;
    FakeAudioContext.gains = [];
    FakeAudioContext.failToConstruct = false;
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

describe("music engine details", () => {
  beforeEach(() => {
    FakeAudioContext.instances = 0;
    FakeAudioContext.resumeCalls = 0;
    FakeAudioContext.gains = [];
    FakeAudioContext.failToConstruct = false;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps asking a suspended context to resume on later gestures", () => {
    class SuspendedAudioContext extends FakeAudioContext {
      override state = "suspended";
    }
    vi.stubGlobal("AudioContext", SuspendedAudioContext);
    vi.useFakeTimers();
    const music = createMusic(memoryStorage());
    window.dispatchEvent(new Event("pointerdown"));
    expect(FakeAudioContext.instances).toBe(1);
    expect(FakeAudioContext.resumeCalls).toBe(1);
    window.dispatchEvent(new Event("click"));
    expect(FakeAudioContext.resumeCalls).toBe(2);
    expect(FakeAudioContext.instances).toBe(1);
    music.setEnabled(false); // stops listening, so this controller does not leak into other tests
  });

  it("stops asking once the context is running", async () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.useFakeTimers();
    createMusic(memoryStorage());
    window.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    await Promise.resolve();
    window.dispatchEvent(new Event("click"));
    expect(FakeAudioContext.resumeCalls).toBe(1);
  });

  it("stays silent when the AudioContext cannot be built", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.useFakeTimers();
    FakeAudioContext.failToConstruct = true;
    const music = createMusic(memoryStorage());
    expect(() => {
      window.dispatchEvent(new Event("pointerdown"));
      music.setEnabled(false);
      music.setEnabled(true);
    }).not.toThrow();
    expect(FakeAudioContext.instances).toBe(0);
  });

  it("cross-fades the echo sends together with the theme buses", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.useFakeTimers();
    const music = createMusic(memoryStorage());
    window.dispatchEvent(new Event("pointerdown"));
    const ramps: number[] = [];
    for (const gain of FakeAudioContext.gains) {
      (gain.gain as { linearRampToValueAtTime(value: number): void }).linearRampToValueAtTime = (value) => void ramps.push(value);
    }
    music.setTheme("boss");
    expect(ramps.sort()).toEqual([0, 0, 1, 1]);
  });
});

describe("silent music", () => {
  it("keeps settings in memory and notifies listeners", () => {
    const music = silentMusic();
    const heard: boolean[] = [];
    const stop = music.onChange(() => heard.push(music.enabled));
    expect(music.enabled).toBe(true);
    expect(music.volume).toBe(0.5);
    music.setEnabled(false);
    music.setVolume(2);
    music.setTheme("boss");
    stop();
    music.setEnabled(true);
    expect(heard).toEqual([false, false]);
    expect(music.volume).toBe(1);
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

  it("keeps the HUD toggle and the Settings controls in step", () => {
    const { ctx } = setup();
    const root = document.createElement("div");
    document.body.append(root);
    const cleanup = renderSettings(root, ctx);
    const button = root.querySelector<HTMLButtonElement>('button[aria-label="Music"]')!;
    const box = root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(slider.getAttribute("aria-valuetext")).toBe("50%");
    button.click();
    expect(box.checked).toBe(false);
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    expect(button.getAttribute("aria-pressed")).toBe("true");
    box.checked = false;
    box.dispatchEvent(new Event("change"));
    expect(button.getAttribute("aria-pressed")).toBe("false");
    slider.value = "30";
    slider.dispatchEvent(new Event("input"));
    expect(slider.getAttribute("aria-valuetext")).toBe("30%");
    cleanup();
    ctx.music.setEnabled(true);
    expect(box.checked).toBe(false);
    root.remove();
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
