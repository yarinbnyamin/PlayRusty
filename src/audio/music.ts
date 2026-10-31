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
