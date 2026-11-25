---
name: phaser-web
description: >
  Phaser 4 + TypeScript + Vite web game engineering guide for games built on
  harpuria/phaser-web-template. Covers template ownership boundaries, safe-area
  scaling, scene flow, PauseState, MoveInput, Arcade Physics, object pooling,
  camera/juice, tilemaps, AI/pathfinding, AudioService, Store<T> save schemas
  and migrations, localized strings, standalone and CrazyGames builds, and
  Playwright/Vitest verification. Activate when implementing, debugging,
  optimizing, or shipping a Phaser Web game.
license: Apache-2.0
metadata:
  category: game-dev
  tags: "phaser, typescript, vite, web-game, crazygames, arcade-physics, gamedev"
  version: "0.4.0"
---

# Phaser Web Game Architecture (`phaser-web-template`)

Build maintainable, 60 FPS browser games on `harpuria/phaser-web-template` (**Phaser 4**, **TypeScript**, **Vite**, **Vitest**, **Playwright**).

---

## Start here (read before editing)

1. Read the game repository's `AGENTS.md` and `docs/game/README.md` (and `docs/game/GDD.md` if present).
2. Read `docs/ARCHITECTURE.md` before changing initialization, pause handling, storage, layout, or platform service adapters.
3. Read `docs/CRAZYGAMES.md` before changing CrazyGames SDK calls, `launch` stage, ads, or Data storage.
4. Confirm the pinned Node version in `.nvmrc` (Node `22.12+`) and dependencies in `package.json` (do not silently upgrade Phaser or template dependencies).

---

## Template boundaries and ownership

| Path | Owner | Rules |
| :--- | :--- | :--- |
| `src/config/game.ts` | Game | Configure `title`, `storagePrefix` (unique per game), `width`/`height`, `pixelArt`, `orientation`, `maxRenderScale`, `startScene`, `pausableScenes`, `layout`, `locale`, and `services`. |
| `src/game/` | Game | Keep game rules, scenes (`scenes.ts` or submodules), session state (`session.ts`), asset manifest (`assets.ts`), save schema (`save.ts`), and all user-facing strings (`strings.ts`) here. |
| `public/assets/` | Game | Store baked `.png`, `.json`, `.svg`, `.wav`, and `.mp3` assets served relative to `import.meta.env.BASE_URL`. |
| `src/core/`, `src/services/`, `src/ui/` | Template | Reuse `AudioService`, `MoveInput`, `Store<T>`, `PauseState`, `centerSafeArea`, `transition`, `PlatformServices`, and `SystemUi`. Only edit for shared framework changes after reading `docs/ARCHITECTURE.md`. |
| `docs/game/` | Game | Store `GDD.md`, systems tables, and design notes. Never write game plans in `docs/template/`. |

**Non-negotiable template contracts**:
- **Localization**: Add every user-facing string to `src/game/strings.ts` in all supported locales (`ko`, `en`, etc.). Never put UI prose inside `src/core/` or `src/services/`.
- **E2E selectors**: Find elements in Playwright tests by stable IDs (`tests/e2e/ui.ts`), never by localized copy.
- **No mock rewards in production**: Wrap real ad/billing SDKs behind `PlatformAdapter`. Never treat `mock: true` completions as real purchases or production ad revenue.
- **Safe-area coordinates**: Call `centerSafeArea(this, W, H)` at the start of `create()` (or `preload()` in `PreloadScene`). Lay out gameplay inside `0..W` × `0..H`, and extend backgrounds beyond the safe area so `Scale.EXPAND` margins never show empty edges.
- **Render scale (`k`)**: `App.renderScale` is chosen once at startup (`maxRenderScale`). Rasterize SVGs or load `@2x` PNGs at `k`× and apply `.setScale(1 / k)` in scenes; `centerSafeArea` automatically sharpens `Phaser.GameObjects.Text` at `zoom`. For pixel art, set `gameConfig.pixelArt = true`.
- **Reduced motion**: Subscribe via `const stop = this.app.listenSettings(...)` for ambient tweens/shake/flashes, and call `stop()` in the scene's `SHUTDOWN` handler.

---

## Asset integration (`game-studio` MCP outputs)

Bake sprite sheets and audio with `game-studio` MCP tools into `public/assets/` (pass absolute paths such as `<GAME_ROOT>/public/assets/sprites/hero.png` to the tools), register keys in `src/game/assets.ts`, and queue them in `queueAssets(load, k)`. Take keys, file names and frame sizes from the asset manifest in `docs/game/GDD.md`:

```ts
// src/game/assets.ts
export const assetKeys = {
  hero: 'hero',
  tiles: 'tiles',
  bgmStage: 'bgm-stage',
  sfxJump: 'sfx-jump',
} as const;

export function queueAssets(load: Phaser.Loader.LoaderPlugin, _k = 1) {
  load.setPath(`${import.meta.env.BASE_URL}assets/`);
  // Sheets from sprite_compile / sprite_normalize: PNG + JSON manifest with frameTags.
  load.aseprite(assetKeys.hero, 'sprites/hero.png', 'sprites/hero.json');
  load.image(assetKeys.tiles, 'tiles.png');
  load.audio(assetKeys.bgmStage, 'audio/stage.wav');
  load.audio(assetKeys.sfxJump, 'audio/jump.wav');
}
```

- **Animations**: Copy [`scripts/sheetAnims.ts`](scripts/sheetAnims.ts) to `src/game/sheetAnims.ts` and call `createSheetAnims(this, assetKeys.hero)` once after preload (for example in `PreloadScene.create`). It registers one animation per manifest tag as `hero-idle`, `hero-walk`, … with the tag's speed, `pingpong` as yoyo, and looping unless the tag plays once. Then `sprite.play('hero-walk')`.
  - Do not use `this.anims.createFromAseprite(key)` directly: it names animations by tag alone (a second character's `idle` is skipped) and creates every animation with `repeat: 0`, so loops play only once.
  - For a sheet without a JSON manifest, use `load.spritesheet(key, png, { frameWidth, frameHeight })` and `this.anims.generateFrameNumbers(key, { start, end })`.
- **Manifest status**: After a key loads and plays correctly in its target scene, set its row in the GDD *Asset manifest* to `in game`.
- **Gapless BGM**: Prefer `.wav` (from `music_synthesize` or `lyria-3.5`) for looping stage music so MP3 priming padding does not click at loop seams.
- **Audio playback**: Always go through `this.app.audio.playMusic(key)` and `this.app.audio.sfx(key)`—never call `this.sound.play` directly, so user mute, pause suspension, and platform/ad `setExternalMute` all work automatically.

---

## Core runtime discipline

1. **Clean shutdowns**: Unsubscribe `app.listenSettings`, `scale`, `input`, and scene event listeners on `Phaser.Scenes.Events.SHUTDOWN` so restarting a scene never leaks listeners or duplicate timers.
2. **Pool high-frequency objects**: Use `Phaser.GameObjects.Group` with `maxSize` and `killAndHide` for bullets, particles, enemies, and floating damage text. Never allocate new graphics or arrays every `update()` frame.
3. **Clamp `delta`**: In `update(_time, delta)`, clamp `const dt = Math.min(delta, 50) / 1000` so tab switches or frame hiccups do not tunnel entities through walls.
4. **Pause & gameplay signals**: Put only gameplay scenes in `gameConfig.pausableScenes`. Call `this.app.setGameplay(true)` when the player has active control and `this.app.setGameplay(false)` on menus, overlays, and round end.
5. **Save safety**: Mutate saves through `app.progress.update(...)` and `flush()` at round end and milestones. When changing `Progress`, bump `progressSchema.version` in `src/game/save.ts`, add a migration, and add a unit test with a previous-version fixture.

---

## Verification, playtesting, and builds

Run all commands from the **game repository root**:

| Task | Command | Notes |
| :--- | :--- | :--- |
| First-time install | `npm ci` | Match `.nvmrc` (Node `22.12+`) |
| Local standalone dev | `npm run dev:standalone` | Fast iteration without CrazyGames SDK |
| CrazyGames dev mode | `npm run dev:crazygames` | Tests SDK integration and local demo ads |
| Full static + unit + build check | `npm run check` | Runs `lint`, `format:check`, `test` (Vitest), `typecheck`, `build:verify` |
| End-to-end UI / input tests | `npm run test:e2e` | Required for UI, layout, or input changes (`embed.spec.ts` checks iframes) |
| Preview-build E2E | `E2E_PREVIEW=1 npm run test:e2e` | Required when changing build/platform services |
| CrazyGames live CDN smoke | `npm run test:sdk` | Requires external network + Chromium; writes `test-results/sdk/report.json` |
| Self-hosted production build | `npm run build:standalone` | Always specify platform target (`vite build` without target aborts) |
| CrazyGames submission build | `npm run build:crazygames` | Follow `docs/CRAZYGAMES.md` checklist before upload |

**Interactive playtest & bug capture**: Hand off to `game-dev-studio` (`[Game Dev Studio](sidecar://agy-game-studio/studio/playtest)`, whose **Run game** button starts and connects the game after `npm ci`) when the user wants to play inside Antigravity, annotate a frame, or send a 10-second DVR GIF.

**Reporting rule**: Separate checks that actually ran from unverified browsers/devices. If Playwright ran only a subset of projects (e.g., Chromium without Firefox/WebKit), state the exact projects executed.

---

## Reference guides

| Topic | Reference | Key Coverage |
| :--- | :--- | :--- |
| **Project structure & config** | [`references/project_structure.md`](references/project_structure.md) | Directory ownership, `gameConfig`, localization (`strings.ts`), E2E IDs |
| **Scenes, viewport & pause** | [`references/scenes_and_flow.md`](references/scenes_and_flow.md) | Scene lifecycle, `transition`, `centerSafeArea`, `PauseState`, shutdown hygiene |
| **Input & action mapping** | [`references/input_action_mapping.md`](references/input_action_mapping.md) | `MoveInput`, `isTypingInControl`, discrete actions, gamepad & touch |
| **Physics & collision** | [`references/physics_and_collision.md`](references/physics_and_collision.md) | Arcade Physics, hitboxes, `collider` vs `overlap`, fixed step & spatial grid |
| **Entity pooling & lifecycle** | [`references/entity_management.md`](references/entity_management.md) | `Group` pooling, `killAndHide`, state decoupling, zero-churn `update()` |
| **Camera, tweens & juice** | [`references/camera_and_juice.md`](references/camera_and_juice.md) | Camera follow/shake/flash, hit-stop, squash-and-stretch, particles, `reducedMotion` |
| **Tilemaps & levels** | [`references/tilemaps_and_levels.md`](references/tilemaps_and_levels.md) | Tiled JSON tilemaps, collision layers, object spawning, isometric/grid helpers |
| **Pathfinding & AI** | [`references/pathfinding_and_ai.md`](references/pathfinding_and_ai.md) | Grid A*, steering (seek/arrive/separation), enemy FSMs, wave pacing |
| **Audio & save persistence** | [`references/audio_and_persistence.md`](references/audio_and_persistence.md) | `AudioService`, autoplay unlock, `Store<T>` schemas, migrations, failure states |
| **UI, HUD & deployment** | [`references/ui_and_deployment.md`](references/ui_and_deployment.md) | HUD scene overlay, `SystemUi` contract, standalone vs CrazyGames builds |
