# Project structure and configuration (Godot 4.7.2 templates)

Both `godot-mobile-template` and `godot-pc-template` share the same architectural split: template-owned `autoload/`, `core/`, `services/`, `scenes/`, `ui/`, `tools/`, and game-owned `game/` + `config/game.cfg` + `docs/`.

## Autoload boot order

### Godot PC
```text
project.godot
  ├─ Autoloads: GameConfig -> Settings -> SaveManager -> AudioManager
  │             -> WindowManager -> InputManager -> SceneManager -> App
  └─ scenes/bootstrap.tscn
       ├─ app/init_script (default: game/game_init.gd)
       │    .before_app_initialize() -> Dictionary (must return {"error": OK})
       ├─ App.initialize() (selects StoreService adapter + SaveManager.load_slot())
       └─ SceneManager.change_scene(app/main_scene)
```

### Godot Mobile
```text
project.godot
  ├─ Autoloads: GameConfig -> Settings -> SaveManager -> AudioManager
  │             -> SceneManager -> App
  └─ scenes/bootstrap.tscn
       ├─ app/init_script (optional RefCounted script with before_app_initialize())
       ├─ App.initialize() (selects Ads/Billing/Privacy/Analytics/Review/GameServices + SaveManager.load_slot())
       └─ SceneManager.change_scene(app/main_scene)
```

Note the hook difference:
- **PC**: `before_app_initialize() -> Dictionary` is mandatory when `init_script` is set; non-`OK` blocks entry and displays an error screen.
- **Mobile**: `init_script` is optional (empty string skips it); bootstrap logs hook errors and continues initialization, and `App.ready_for_game` does **not** guarantee `SaveManager.load_slot()` succeeded—check `SaveManager.write_blocked` / `load_failed` explicitly.

## Organizing `game/` cleanly

Keep all game scenes, scripts, resources, and baked assets inside `game/`:

```text
game/
├── README.md                    # Game entry overview
├── game_init.gd                 # RefCounted hook for app/init_script
├── main.tscn / main.gd          # Root gameplay or title entry scene
├── assets/
│   ├── sprites/                 # Baked PNG sheets + JSON manifests from sprite-design
│   ├── audio/                   # Baked WAV SFX & looping WAV BGM
│   └── fonts/                   # Optional custom fonts
├── data/                        # Custom Resource (.tres) definitions (weapons, enemies, stages)
├── entities/                    # Player, enemies, projectiles (.tscn + .gd)
├── levels/                      # Stage scenes with TileMapLayer + spawn markers
├── systems/                     # Pure gameplay logic (wave director, damage math, grid rules)
└── ui/                          # Game-specific HUD, inventory, dialogue overlays
```

## Configuration propagation (`config/game.cfg` -> `tools/configure.gd`)

- **Runtime values** (feature flags, autosave interval, store IDs, timeouts) are read from `config/game.cfg` by `GameConfig` on startup.
- **Project & export values** (app name, version, bundle/package ID, `main_scene`, orientation/viewport, `data_directory`, `exclude_demo`) must be propagated to `project.godot` and `export_presets.cfg` by running:
  ```bash
  godot --headless --path . --script res://tools/configure.gd
  ```
- Existing custom `InputMap` entries and local signing/SDK options are preserved by `configure.gd`. Always run `git diff` after running `configure.gd`, and verify running it a second time makes zero further changes.

## Code conventions in derived games

- Use strict typed GDScript (`var hp: int = 100`, `func take_damage(amount: int) -> void:`).
- Per both templates' `AGENTS.md`, place a short Korean `##` class doc comment at the top of every `.gd` file and Korean `##` doc comments on major methods.
- Prefer custom `Resource` classes (`class_name EnemyStats extends Resource`) for data-driven balance tables instead of sprawling hardcoded dictionaries.
