import type { ComingSoonIsland, Island, SaveData } from "../engine/types";
import type { SaveStore } from "../engine/save";
import { createMusic, type MusicController } from "../audio/music";
import { routeToHash, type Route } from "../router";

export type Cleanup = () => void;
export const noop: Cleanup = () => {};

export interface AppContext {
  readonly islands: Island[];
  readonly comingSoon: ComingSoonIsland[];
  /** False when the browser blocks storage and progress lives only in memory. */
  readonly persistent: boolean;
  /** Background music settings and playback. */
  readonly music: MusicController;
  getSave(): SaveData;
  update(change: (save: SaveData) => SaveData): void;
  resetProgress(): void;
  go(route: Route): void;
}

export function createAppContext(store: SaveStore, islands: Island[], comingSoon: ComingSoonIsland[], music: MusicController = createMusic(null)): AppContext {
  let save = store.load();
  return {
    islands,
    comingSoon,
    persistent: store.persistent,
    music,
    getSave: () => save,
    update(change) {
      save = change(save);
      store.write(save);
    },
    resetProgress() {
      save = store.reset();
    },
    go(route) {
      window.location.hash = routeToHash(route);
    },
  };
}
