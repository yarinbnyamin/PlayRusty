import type { Island, Mode, SaveData, Stage, Stars, TutorialPage } from "./types";

export const XP_PER_PUZZLE = 10;
export const XP_PER_BOSS = 50;

export const stageKey = (islandId: string, stageId: string): string => `${islandId}/${stageId}`;
export const puzzleKey = (islandId: string, stageId: string, puzzleId: string): string =>
  `${islandId}/${stageId}/${puzzleId}`;

export function modeOf(save: SaveData): Mode {
  return save.mode ?? "beginner";
}

export function visibleStages(island: Island, mode: Mode): Stage[] {
  return mode === "experienced" ? island.stages.filter((stage) => !stage.beginnerOnly) : island.stages;
}

export function visiblePages(stage: Stage, mode: Mode): TutorialPage[] {
  return stage.tutorial.filter((page) => page.audience === "all" || page.audience === mode);
}

export function isStageComplete(save: SaveData, islandId: string, stageId: string): boolean {
  return stageKey(islandId, stageId) in save.stages;
}

export function isBossDefeated(save: SaveData, islandId: string): boolean {
  return islandId in save.bosses;
}

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

export function starsForMistakes(mistakes: number): Stars {
  if (mistakes === 0) return 3;
  return mistakes <= 2 ? 2 : 1;
}

export function starsForHints(hints: number): Stars {
  if (hints === 0) return 3;
  return hints === 1 ? 2 : 1;
}

function bestStars(previous: Stars | undefined, next: Stars): Stars {
  return previous !== undefined && previous > next ? previous : next;
}

export function recordPuzzleSolved(save: SaveData, islandId: string, stageId: string, puzzleId: string): SaveData {
  const key = puzzleKey(islandId, stageId, puzzleId);
  if (save.solvedPuzzles.includes(key)) return save;
  return { ...save, xp: save.xp + XP_PER_PUZZLE, solvedPuzzles: [...save.solvedPuzzles, key] };
}

export function recordStageComplete(save: SaveData, islandId: string, stageId: string, mistakes: number): SaveData {
  const key = stageKey(islandId, stageId);
  const stars = bestStars(save.stages[key]?.stars, starsForMistakes(mistakes));
  return { ...save, stages: { ...save.stages, [key]: { stars } } };
}

export function recordBossDefeated(save: SaveData, islandId: string, hintsUsed: number): SaveData {
  const previous = save.bosses[islandId]?.stars;
  const stars = bestStars(previous, starsForHints(hintsUsed));
  return {
    ...save,
    xp: previous === undefined ? save.xp + XP_PER_BOSS : save.xp,
    bosses: { ...save.bosses, [islandId]: { stars } },
  };
}

export function totalStars(save: SaveData): number {
  const sum = (records: Record<string, { stars: Stars }>) =>
    Object.values(records).reduce((total, record) => total + record.stars, 0);
  return sum(save.stages) + sum(save.bosses);
}
