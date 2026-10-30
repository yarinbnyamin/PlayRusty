import { beforeEach, describe, expect, it } from "vitest";
import { SAVE_KEY, createSaveStore, migrate, newSave } from "../src/engine/save";

beforeEach(() => localStorage.clear());

describe("migrate", () => {
  it("accepts a valid version 1 save", () => {
    const save = { ...newSave(), mode: "beginner", xp: 30 };
    expect(migrate(save)).toEqual(save);
  });

  it("rejects unknown versions and broken shapes", () => {
    expect(migrate({ ...newSave(), version: 99 })).toBeNull();
    expect(migrate({ ...newSave(), xp: "lots" })).toBeNull();
    expect(migrate({ ...newSave(), mode: "wizard" })).toBeNull();
    expect(migrate(null)).toBeNull();
    expect(migrate([])).toBeNull();
  });
});

describe("createSaveStore with localStorage", () => {
  it("starts with a fresh save", () => {
    expect(createSaveStore(localStorage).load()).toEqual(newSave());
  });

  it("round-trips a save", () => {
    const store = createSaveStore(localStorage);
    const save = { ...newSave(), mode: "experienced" as const, xp: 120 };
    store.write(save);
    expect(createSaveStore(localStorage).load()).toEqual(save);
  });

  it("backs up a corrupt save and starts fresh", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    const save = createSaveStore(localStorage, () => 123).load();
    expect(save).toEqual(newSave());
    expect(localStorage.getItem(`${SAVE_KEY}.backup-123`)).toBe("{not json");
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("backs up a save from an unknown version", () => {
    const raw = JSON.stringify({ version: 7 });
    localStorage.setItem(SAVE_KEY, raw);
    createSaveStore(localStorage, () => 5).load();
    expect(localStorage.getItem(`${SAVE_KEY}.backup-5`)).toBe(raw);
  });

  it("reset clears the stored save", () => {
    const store = createSaveStore(localStorage);
    store.write({ ...newSave(), xp: 10 });
    expect(store.reset()).toEqual(newSave());
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});

describe("createSaveStore without storage", () => {
  it("keeps the save in memory and reports it is not persistent", () => {
    const store = createSaveStore(null);
    expect(store.persistent).toBe(false);
    store.write({ ...newSave(), xp: 40 });
    expect(store.load().xp).toBe(40);
    expect(store.reset()).toEqual(newSave());
  });
});
