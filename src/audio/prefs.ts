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
