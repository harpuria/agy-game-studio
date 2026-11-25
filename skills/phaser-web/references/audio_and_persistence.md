# Audio and save persistence (Phaser Web)

Never bypass the template's `AudioService` (`src/core/audio.ts`) or `Store<T>` (`src/core/store.ts`). Both handle browser restrictions, pause states, and CrazyGames platform requirements automatically.

## Audio (`this.app.audio` — `AudioService`)

| Method | Purpose |
| :--- | :--- |
| `app.audio.playMusic(key)` | Starts or switches looping BGM (destroys previous track if key changed; respects `suspended` and `settings.music`). |
| `app.audio.stopMusic()` | Stops and destroys the current BGM sound. |
| `app.audio.sfx(key)` | Plays a one-shot SFX at `settings.sfx` volume if cached and not suspended. |
| `app.audio.setExternalMute(reason, muted)` | Used by platform/ad adapters without mutating the user's saved mute preference. |
| `app.audio.suspend(boolean)` | Managed by `App` on pause/resume. |

**Best practices**:
- **Autoplay policy**: Browsers block WebAudio until the first user gesture. Start BGM inside a user-initiated transition (e.g., Start button click or first key/pointer input), not silently inside `BootScene`.
- **Gapless loops**: Bake looping BGM as **`.wav`** (`music_synthesize` or `lyria-3.5`) to avoid MP3 encoder priming gaps at loop boundaries.
- **SFX cooldown throttling**: For rapid pickups, footsteps, or multi-hit lasers, guard `app.audio.sfx(key)` with a per-key cooldown (`40–80 ms`) so overlapping voices do not clip.
- **Settings updates**: After modifying settings, call `this.app.applySettings()` so `AudioService`, `listenSettings` subscribers, and the Shell update immediately.

## Save persistence (`this.app.progress` — `Store<T>`)

Define your game's save contract in `src/game/save.ts`:

```ts
import { isRecord, type Schema } from '../core/store';

export interface Progress {
  best: number;
  rounds: number;
  unlockedStage: number;
}

export const progressSchema: Schema<Progress> = {
  version: 2,
  defaults: () => ({ best: 0, rounds: 0, unlockedStage: 1 }),
  migrations: {
    // Migrate version 1 -> 2
    1: (raw) => ({
      ...(isRecord(raw) ? raw : {}),
      unlockedStage: 1,
    }),
  },
  validate: (v): v is Progress =>
    isRecord(v) &&
    typeof v.best === 'number' && Number.isSafeInteger(v.best) && v.best >= 0 &&
    typeof v.rounds === 'number' && Number.isSafeInteger(v.rounds) && v.rounds >= 0 &&
    typeof v.unlockedStage === 'number' && Number.isSafeInteger(v.unlockedStage) && v.unlockedStage >= 1,
};
```

**Persistence rules**:
- **Update & flush**: Call `this.app.progress.update((p) => { ... })` to mutate and mark dirty. Call `await this.app.progress.flush()` immediately after important milestones (round end, stage unlock, high score)—do not rely solely on browser unload events (`pagehide` is best-effort).
- **Respect failure states**: `Store<T>` tracks `ready`, `corrupt`, `future-version`, and `unavailable`:
  - In `corrupt` or `future-version`, writes are blocked so the player's original data is preserved until an explicit user-confirmed `reset()`.
  - In `unavailable` (denied storage / quota / failed CrazyGames SDK Data init), gameplay continues in memory and the Shell surfaces the warning; the template deliberately does **not** silently fall back from failed CrazyGames Data to `localStorage`.
  - When a write fails after a healthy load (`canRetry === true`), autosave and the Shell retry button retry the latest in-memory value.
- **Unique `storagePrefix`**: Always set a unique `gameConfig.storagePrefix` per game so `localStorage` keys never collide on the same origin.
- **CrazyGames Data limit**: Total saved data under CrazyGames Data SDK is capped at **1 MB** across the game, and `Store.flush()` confirms SDK acceptance rather than server sync completion. Keep saves compact.
- **Test every schema bump**: Add a Vitest fixture test in `tests/unit/` proving `version N-1` payloads migrate cleanly to `version N` and pass `validate`.
