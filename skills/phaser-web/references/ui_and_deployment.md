# UI, HUD, and deployment (Phaser Web)

## In-canvas HUD vs. HTML Shell (`SystemUi`)

- **Gameplay HUD (score, HP, timer, wave, combo)**: Render inside Phaser—either pinned with `.setScrollFactor(0)` inside the safe area `[0..W, 0..H]`, or in a parallel `HudScene` launched alongside `GameScene` (`this.scene.launch('Hud')` / `this.scene.stop('Hud')` on shutdown). A parallel `HudScene` is immune to gameplay camera zoom and shake.
- **HTML chrome (`src/ui/Shell.ts` & `src/ui/system.ts`)**: `SystemUi` is the template's shared contract for pause, rotate-device, fatal error (reload), and exit-fullscreen overlays. Even if you replace `Shell.ts`:
  - Keep creating `SystemUi` and calling `systemUi.render()` after your own UI updates.
  - Mark interactive game controls with `[data-game-control]` so `SystemUi` disables them during boot, active ad requests, and `fatal` errors.
  - Mark error recovery controls with `[data-recovery]` so reload/fullscreen-exit stay usable during `fatal` state.
  - Add any additional disable logic **after** `render()` using `el.disabled ||= ...`.
- **Fullscreen & iframe embed**: Fullscreen targets `#stage` (canvas + overlay + controls), and fullscreen exit automatically releases orientation lock. Keep `layout: 'auto'` so iframe deployments (`embed`) fill the viewport with zero page scrollbars.

## Localization (`src/game/strings.ts`) and E2E selectors

- Put every user-visible label, button, prompt, and result message in `src/game/strings.ts` across all supported locales (`ko`, `en`, etc.). Read via `this.app.text.game`.
- Never place human-readable copy in `src/core/` or `src/services/`; those modules return status codes that the game/UI translates.
- Give HTML UI elements stable `id` / `data-testid` attributes referenced from `tests/e2e/ui.ts` so Playwright tests never break when copy changes.

## Standalone vs. CrazyGames deployment

`gameConfig.platform` is resolved from `VITE_PLATFORM` / Vite `--mode`. Running bare `vite build` without a platform target intentionally aborts so you never ship the wrong build.

| Target | Dev Command | Production Build | Storage Backend | Platform SDK |
| :--- | :--- | :--- | :--- | :--- |
| **Standalone** (self-host, itch.io) | `npm run dev:standalone` | `npm run build:standalone` | Browser `localStorage` | Disabled (no CrazyGames requests) |
| **CrazyGames** | `npm run dev:crazygames` | `npm run build:crazygames` | CrazyGames Data SDK (or `localStorage` if SDK disabled) | `CrazyGamesAdapter` |

### CrazyGames submission checklist (see `docs/CRAZYGAMES.md` for full rules)

1. Verify `gameConfig.services.crazyGames.launch`: keep `'basic'` until CrazyGames approves Full Launch, then switch to `'full'`.
2. Call `this.app.setGameplay(true)` / `false` strictly around playable segments, pause, and round end.
3. Request midgame ads only at natural breaks (round end, stage transition); label rewarded ad buttons with the exact reward and grant the reward only on `{ status: 'completed' }` (never treat `mock: true` as production fulfillment).
4. Verify iframe layout and scroll absence with `npm run test:e2e` (`embed.spec.ts`) and `E2E_PREVIEW=1 npm run test:e2e`.
5. Run `npm run test:sdk` (requires external network + Playwright Chromium) to verify live CDN SDK initialization, mute override, rewarded/midgame callbacks, gameplay events, and Data persistence across reload.
6. Always verify live ads, account sync, and iframe behavior in CrazyGames Preview before publishing—local/mock tests do not prove live ad fill or store approval.
