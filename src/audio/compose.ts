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
