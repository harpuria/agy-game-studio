# Project structure and configuration (`phaser-web-template`)

`harpuria/phaser-web-template` separates game-owned modules from reusable template runtime modules so template upgrades do not overwrite gameplay code.

## Directory map

```text
├── docs/
│   ├── ARCHITECTURE.md          # Framework contracts (pause, store, audio, layout, services)
│   ├── CRAZYGAMES.md            # CrazyGames SDK setup, Data limits, Basic vs Full launch
│   ├── DEVELOPMENT.md           # Local dev, scripts, testing workflow
│   ├── DEPENDENCIES.md          # Pinned dependency BOM and justification
│   ├── game/                    # GAME-OWNED: README.md, GDD.md, balance sheets
│   └── template/                # TEMPLATE-OWNED: APPLYING.md, CHANGELOG.md, VALIDATION.md
├── public/assets/               # Baked PNG, JSON, SVG, WAV, MP3 assets
├── src/
│   ├── main.ts                  # Entry point wiring App + Shell + Phaser.Game
│   ├── app.ts                   # App container (audio, progress, settings, platform, pause)
│   ├── config/
│   │   ├── game.ts              # Game-specific configuration (edit per game)
│   │   └── platform.ts          # VITE_PLATFORM validation ('standalone' | 'crazygames')
│   ├── core/                    # Reusable runtime primitives (do not fork lightly)
│   │   ├── audio.ts             # AudioService
│   │   ├── input.ts             # MoveInput + isTypingInControl
│   │   ├── layout.ts            # resolveLayout ('page' | 'embed')
│   │   ├── locale.ts            # Locale resolution against strings.ts
│   │   ├── navigation.ts        # Scene transition helper
│   │   ├── pause.ts             # Multi-reason PauseState
│   │   ├── renderScale.ts       # High-DPI render scale k
│   │   ├── settings.ts          # User settings schema (master/music/sfx/muted/reducedMotion)
│   │   ├── store.ts             # Store<T> envelope + migrations + failure states
│   │   └── viewport.ts          # centerSafeArea + Text sharpening
│   ├── game/                    # GAME-OWNED gameplay code
│   │   ├── assets.ts            # assetKeys + queueAssets(load, k)
│   │   ├── save.ts              # Progress interface + progressSchema (version, defaults, validate)
│   │   ├── scenes.ts            # MenuScene, GameScene, ResultScene (split into files as game grows)
│   │   ├── session.ts           # Transient round state (score, timer, mode)
│   │   └── strings.ts           # All user-facing localized copy (ko, en, ...)
│   ├── scenes/
│   │   ├── BootScene.ts         # Engine setup -> PreloadScene
│   │   └── PreloadScene.ts      # Calls queueAssets(this.load, app.renderScale)
│   ├── services/                # PlatformAdapter, CrazyGamesAdapter, MockAdapter, UnavailableAdapter
│   └── ui/
│       ├── Shell.ts             # Replaceable HTML shell around #stage
│       └── system.ts            # SystemUi contract ([data-game-control], [data-recovery])
└── tests/
    ├── unit/                    # Vitest tests (save migrations, gameplay logic)
    └── e2e/                     # Playwright specs + ui.ts element IDs + embed.spec.ts
```

## Key knobs in `src/config/game.ts`

- **`storagePrefix`**: Change to a unique slug per game so `localStorage` keys never collide with other games on the same origin.
- **`width` / `height`**: Logical safe-area resolution (e.g., `960x540` or `1280x720` for 16:9 2D HD, `320x180` or `640x360` for retro pixel art).
- **`pixelArt`**: Set `true` for pixel art (disables linear texture filtering and rounds pixels); keep `false` for 2D HD art or vector assets.
- **`orientation`**: `'landscape'` or `'portrait'`. Applied on fullscreen when the browser supports Screen Orientation Lock; otherwise the rotate overlay advises the player.
- **`maxRenderScale`**: Caps the startup render multiplier `k` (`{ desktop: 2, mobile: 1.5 }`). Lower `mobile` toward `1` if low-end phones drop frames.
- **`pausableScenes`**: List only active gameplay scenes (`['Game']`). Omit menus/transitions that should stay responsive.
- **`layout`**: `'auto'` picks `'embed'` inside an iframe (CrazyGames, itch.io) and `'page'` standalone. Override locally with `?layout=embed` or `?layout=page`.

## Growing `src/game/` cleanly

Once gameplay grows past a single scene file, organize `src/game/` by concern rather than adding folders to `src/core/`:

```text
src/game/
├── assets.ts
├── save.ts
├── session.ts
├── strings.ts
├── scenes/
│   ├── MenuScene.ts
│   ├── GameScene.ts
│   ├── HudScene.ts
│   └── ResultScene.ts
├── entities/
│   ├── Player.ts
│   └── EnemyPool.ts
└── systems/
    ├── WaveDirector.ts
    └── CombatRules.ts
```

Keep pure gameplay rules (scoring, wave math, damage formulas, grid logic) in plain TypeScript modules with no Phaser imports so Vitest can test them headlessly in milliseconds.
