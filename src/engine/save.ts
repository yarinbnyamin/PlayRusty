import type { SaveData } from "./types";

export const SAVE_KEY = "playrusty.save";

export function newSave(): SaveData {
  return { version: 1, mode: null, xp: 0, stages: {}, bosses: {}, solvedPuzzles: [], bossCode: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns a valid current-version save, or null when the data can't be understood. */
export function migrate(data: unknown): SaveData | null {
  if (!isRecord(data) || data.version !== 1) return null;
  const modeOk = data.mode === null || data.mode === "beginner" || data.mode === "experienced";
  const shapeOk =
    typeof data.xp === "number" &&
    isRecord(data.stages) &&
    isRecord(data.bosses) &&
    Array.isArray(data.solvedPuzzles) &&
    isRecord(data.bossCode);
  return modeOk && shapeOk ? (data as unknown as SaveData) : null;
}

export interface SaveStore {
  readonly persistent: boolean;
  load(): SaveData;
  write(data: SaveData): void;
  reset(): SaveData;
}

export function createSaveStore(storage: Storage | null, now: () => number = Date.now): SaveStore {
  if (!storage) {
    let memory = newSave();
    return {
      persistent: false,
      load: () => memory,
      write: (data) => {
        memory = data;
      },
      reset: () => (memory = newSave()),
    };
  }

  return {
    persistent: true,
    load() {
      const raw = storage.getItem(SAVE_KEY);
      if (raw === null) return newSave();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      const save = migrate(parsed);
      if (save) return save;
      storage.setItem(`${SAVE_KEY}.backup-${now()}`, raw);
      storage.removeItem(SAVE_KEY);
      return newSave();
    },
    write(data) {
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        // Storage full or blocked mid-session: keep playing; the next write may succeed.
      }
    },
    reset() {
      storage.removeItem(SAVE_KEY);
      return newSave();
    },
  };
}

/** localStorage if it works (it throws in some private modes), otherwise null. */
export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = "playrusty.probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
