# PlayRusty: skip-ahead and soundtrack (addendum to the v1 design)

Date: 2026-10-31. Extends `2026-10-30-playrusty-design.md`. Where the two disagree, this addendum wins.

## 1. Skip ahead (Duolingo-style)

Each boss tests almost everything its island teaches, so beating a boss is accepted as proof the player knows the island.

### 1.1 Rules (pure functions in `src/engine/progress.ts`)

- **Island unlocked:** the first island, or the previous island's boss is defeated, **or any later island's boss is defeated** (the player jumped past it).
- **Boss fightable:** every real island's boss can be fought at any time. There is no "finish every stage first" gate any more. `isBossUnlocked` is removed.
- **Jump challenge:** `isJumpChallenge(islands, islandId, save)` is true when the island exists and is not unlocked. Fighting that boss is a "jump".
- **Stage unlocked:** the island is unlocked and either the stage is complete, all earlier visible stages are complete (unchanged), **or the island's boss is defeated** (then every stage is open, in any order).
- **Ferris's island (`currentIslandId`):** the island after the furthest-along defeated boss; the last island if that boss is the last one; the first island if no boss is defeated. For players who never skip this matches v1.
- Badges, stars and XP are unchanged: a jump earns the badge, stars and boss XP of the island whose boss was beaten. Islands jumped past get no badge; their bosses stay fightable for it. Skipped stages stay playable for their XP and stars.

### 1.2 Screens

- **Island screen, unlocked island:** stages as before. The boss card is always a link. While the boss is undefeated and some visible stage is incomplete, it carries the line "Know this already? Beat the boss to skip the lessons."
- **Island screen, locked island:** no longer redirects to the map. It shows the stage list, all locked, and a boss card "⚡ Jump here: beat {boss name}" with the line "Win to unlock every island up to here. You can still play the lessons you skip."
- **Map:** locked real islands are clickable and keyboard-focusable like open ones and lead to their island screen. Their accessible name ends with ", locked: jump challenge available". "Coming soon" islands stay inert.
- **Boss screen:** no unlock guard beyond "the island exists". On a jump challenge it shows a notice under the story: "Jump challenge: beat this boss to unlock every island up to {island name}."
- **Celebrate screen:** after a jump win it adds "You jumped ahead! Every island up to {island name} is open now, and the lessons you skipped are waiting for XP and stars." The boss screen tells the celebrate screen this the same way it passes the XP earned (a module-level note).

## 2. Soundtrack

### 2.1 What the player hears

- Music is synthesised live with the Web Audio API by PlayRusty's own code. There are no audio files, samples or third-party tracks, so there is nothing to license and nothing to download.
- **Calm theme** (title, map, island, stage, settings, celebrate): about 70 BPM, a looping four-chord major-7th progression on a soft pad, sparse plucked notes from the major pentatonic scale with a gentle echo, and a faint "ocean" wash of filtered noise that slowly swells.
- **Boss theme** (boss screen): about 116 BPM, a four-chord minor progression, an eighth-note bass pulse, a soft kick on beats 1 and 3, a quiet hi-hat on off-beats, and an arpeggio over the chord.
- Switching theme cross-fades over about 1.5 seconds. Both themes are deterministic loops (seeded random), so they sound the same every visit.
- Overall level is quiet by design: background music under reading.

### 2.2 Controls and preferences

- Preferences live in localStorage key `playrusty.audio` as `{ "enabled": boolean, "volume": number }` with volume in 0..1. Defaults: enabled `true`, volume `0.5`. They are separate from the save, so "Reset progress" does not touch them. Reads and writes are wrapped in try/catch; bad or missing data falls back to the defaults.
- **HUD:** a "♪" toggle button next to Settings, `aria-label="Music"`, `aria-pressed` reflecting the state, title "Music on" / "Music off".
- **Settings:** a "Sound" section with a "Play music" checkbox and a "Music volume" range input (0–100).
- **Credits** add: "The music is generated live in your browser by PlayRusty's own code, so it is free of copyright."

### 2.3 Behaviour

- Browsers block audio until the user interacts. The `AudioContext` is created on the first `pointerdown` or `keydown` anywhere in the page, and only if music is enabled; turning music on via the HUD or Settings is itself such a gesture.
- The music pauses (`AudioContext.suspend`) while the tab is hidden and resumes when it is visible again and music is enabled.
- Where `AudioContext` does not exist (old browsers, jsdom), the controller is a silent no-op and the rest of the game is unaffected.
- `main.ts` sets the theme on every route change: `boss` → boss theme, everything else → calm theme.

### 2.4 Code layout

- `src/audio/prefs.ts`: `AUDIO_KEY`, `AudioPrefs`, `loadAudioPrefs(storage)`, `saveAudioPrefs(storage, prefs)`.
- `src/audio/compose.ts`: pure music data and note generation (themes, `midiToHz`, a seeded RNG, `eventsForBar(theme, bar)` returning the note events of one bar). Unit-tested without audio.
- `src/audio/music.ts`: `createMusic(...)` returning a `MusicController` (`setTheme`, `setEnabled`, `setVolume`, `enabled`, `volume`), the look-ahead scheduler, voices and cross-fade. A `silentMusic()` no-op controller for tests.
- `AppContext` gains a `music: MusicController` member; `createAppContext` takes it as an optional fourth argument defaulting to the silent controller.

## 3. Testing

- `tests/progress.test.ts`: the new unlock, jump-challenge, stage-unlock-after-boss and `currentIslandId` rules, replacing the old boss-gate test.
- Screen tests (jsdom): a locked island renders its jump card instead of redirecting; the boss card on an unlocked island is a link from the start; the HUD toggle flips `aria-pressed` and the stored preference; the Settings controls update preferences.
- `tests/audio.test.ts`: preference defaults, clamping and corrupt data; `eventsForBar` is deterministic, every pitched note is in its theme's scale, and the boss theme is busier than the calm one; `createMusic` without `AudioContext` does not throw.
- Manual: listen to both themes and the cross-fade in a real browser; check mute, volume, tab-hide pause, and a jump from island 1 to island 3.
