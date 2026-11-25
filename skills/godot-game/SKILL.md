---
name: godot-game
description: >
  Godot 4.7.2 Standard GDScript game engineering guide for games built on
  harpuria/godot-mobile-template (Android/iOS) and harpuria/godot-pc-template
  (Windows/macOS/Linux/Steam Deck). Covers template boundaries, config/game.cfg
  and tools/configure.gd, app/init_script hooks, SceneManager, SaveManager,
  Settings, AudioManager, InputManager, WindowManager, mobile ads/billing/privacy
  and SafeArea, PC pause menus/store/distribution, 2D physics, TileMapLayer,
  AStarGrid2D, camera/juice, MCP asset import, and headless validation. Activate
  when implementing, debugging, or shipping a Godot 2D game.
license: Apache-2.0
metadata:
  category: game-dev
  tags: "godot, gdscript, godot4, mobile, pc, steam, 2d, gamedev"
  version: "0.4.0"
---

# Godot 2D Game Architecture (`godot-mobile-template` & `godot-pc-template`)

Build maintainable 2D games in **Godot 4.7.2 Standard** (GDScript) on `harpuria/godot-mobile-template` and `harpuria/godot-pc-template`.

---

## Start here (read before editing)

1. Identify which template the repository uses:
   - **Godot Mobile**: has `services/ads/`, `services/billing/`, `ui/common/safe_area.gd`, and `docs/STORE_RELEASE.md`. Read [`references/mobile.md`](references/mobile.md).
   - **Godot PC**: has `autoload/window_manager.gd`, `autoload/input_manager.gd`, `tools/validate.sh`, and `docs/DISTRIBUTION.md`. Read [`references/pc.md`](references/pc.md).
2. Read `AGENTS.md`, `docs/CODEBASE_MAP.md`, and `docs/GDD.md` (if present).
3. Read `docs/ARCHITECTURE.md` before changing initialization, persistence, service contracts, lifecycle, or adapters.
4. Respect the locked engine version: **Godot 4.7.2 Standard**. Never silently upgrade Godot or plugins. If `godot` is not on `PATH`, set `GODOT=/path/to/Godot` (macOS default: `/Applications/Godot.app/Contents/MacOS/Godot`).

---

## Template boundaries and ownership

| Path | Owner | Rules |
| :--- | :--- | :--- |
| `game/` | Game | Keep game scenes, rules, scripts, assets, and save migrations here. Connect initialization via `app/init_script` in `config/game.cfg` instead of editing `scenes/bootstrap.gd`. |
| `config/game.cfg` | Game | App name, version, `main_scene`, `init_script`, feature flags, and store IDs. After editing project/export fields, run `godot --headless --path . --script res://tools/configure.gd` and inspect `git diff`. |
| `docs/` | Game | Keep generated game design (`docs/GDD.md`), plans, and game validation logs here. Never write game docs inside `docs/template/`. |
| `autoload/`, `core/`, `services/` | Template | Use `SaveManager`, `Settings`, `AudioManager`, `SceneManager`, `App.ads`/`App.billing` (mobile), `InputManager`/`WindowManager`/`App.store`/`App.dialogs` (PC). Do not add duplicate singletons or bypass adapters. |
| `scenes/`, `assets/demo/` | Template | Common demo scenes used by regression tests (`tests/integration.tscn`). Keep them intact; exclude them from production exports via `config/game.cfg` (`exclude_demo=true` on PC or preset filters on mobile). |
| `examples/` (mobile) | Template | Reference code (such as `purchase_ledger.gd`). Copy into `game/` and adapt; never load files directly from `examples/`. |

**Non-negotiable template contracts**:
- **Typed GDScript + Korean doc comments**: Both templates require explicit typed public APIs and a short Korean `##` class description at the top of each `.gd` file plus Korean `##` doc comments on major methods.
- **Never call native SDKs directly from game code**: Always go through `App.ads`, `App.billing`, `App.privacy`, `App.game_services` (mobile) or `App.store` (PC).
- **No mock success in release builds**: Mock ads/billing/store adapters are debug-only; never grant real purchases or production rewards from mocks.
- **Keep secrets out of Git**: Signing keys, release credentials, production store secrets, and `steam_appid.txt` stay outside version control.
- **Update `docs/CODEBASE_MAP.md`** in the same change if you move files, change entry flows, alter public APIs, or update validation commands.

---

## Asset integration (`game-studio` MCP outputs)

Bake sprites and audio with `game-studio` MCP tools into `game/assets/` (pass absolute paths such as `<GAME_ROOT>/game/assets/sprites/hero.png` to the tools; take keys, file names and frame sizes from the asset manifest in `docs/GDD.md`), then import them with `godot --headless --path . --editor --import --quit`:

1. **Spritesheets (`sprite_compile` / `sprite_normalize` -> `.png` + `.json`)**:
   - Place the `.png` under `game/assets/sprites/`.
   - For pixel art, set texture filter to **Nearest** (`CanvasItem.TEXTURE_FILTER_NEAREST` on the node or default project texture filter). For 2D HD (`256×256+`), use **Linear**.
   - Place the `.json` manifest next to the `.png`. Copy [`scripts/aseprite_sprite_frames.gd`](scripts/aseprite_sprite_frames.gd) and [`scripts/bake_sprite_frames.gd`](scripts/bake_sprite_frames.gd) to `game/tools/` once per game, then bake a `SpriteFrames` resource for `AnimatedSprite2D` after importing:

     ```bash
     godot --headless --path . --editor --import --quit
     godot --headless --path . --script res://game/tools/bake_sprite_frames.gd -- \
         res://game/assets/sprites/hero.json res://game/assets/sprites/hero_frames.tres
     ```

     Each manifest tag becomes one animation with its frame order (`forward`, `reverse`, `pingpong`), speed and loop flag. Assign `hero_frames.tres` to `AnimatedSprite2D.sprite_frames` and `play("idle")`. Re-run the bake whenever the sheet is regenerated. Commit the `.tres`; the exported game does not need the `.json`.
2. **Audio (`sfx_synthesize`, `music_synthesize`, `music_generate` -> `.wav` / `.mp3`)**:
   - Place `.wav` files under `game/assets/audio/`. Prefer **`.wav`** for gapless looping BGM.
   - For looping BGM `.wav` files, enable `edit/loop_mode=1` (Forward) in the `.wav.import` file (or via the Godot Import dock) and re-import.
   - Play all audio through `AudioManager.play_bgm(stream)`, `AudioManager.stop_bgm()`, `AudioManager.play_sfx(stream)`, or `AudioManager.play_ui(stream)` so user volume sliders, buses (`default_bus_layout.tres`), and focus/pause suspension work automatically.

---

## Core 2D runtime discipline

1. **Physics vs. render**: Put movement, collision, and fixed-step gameplay logic in `_physics_process(delta)` (default 60 Hz); keep purely visual interpolation, UI updates, and camera polish in `_process(delta)`.
2. **Pause safety**: Controls that must work while `get_tree().paused = true` (pause menus, quit dialogs, settings) must set `process_mode = Node.PROCESS_MODE_ALWAYS`.
3. **Node ownership & signals**: Call down to children (`child.do_thing()`), signal up to parents (`signal died(pos: Vector2)`). Never reach up with fragile `get_parent().get_parent()` paths.
4. **Pool high-frequency nodes**: Reuse pre-instantiated bullets, particles, and enemies instead of calling `instantiate()`/`queue_free()` dozens of times per second.
5. **Save safety**: Register `SaveManager.schema_version` and `SaveManager.register_migration(...)` inside `app/init_script`'s `before_app_initialize()` before `App.initialize()` runs. Use `SaveManager.set_value(k, v)` (or call `SaveManager.mark_dirty()` after mutating `SaveManager.data` directly) and `SaveManager.flush()` at milestones. Handle `SaveManager.load_failed` / `write_blocked` in game UI instead of assuming saves always succeed.

---

## Run and verification commands

Run all commands from the **game repository root** (replace `godot` with `GODOT=/path/to/Godot` if not on `PATH`):

| Template | Run Scene | Headless Validation |
| :--- | :--- | :--- |
| **Godot Mobile** | Editor **F5** or `godot --path .` | `godot --headless --path . --editor --import --quit`, then `tests/integration.tscn` (default, `--disabled`, `--native`), plus `python3 tools/check_docs.py` for doc changes |
| **Godot PC** | Editor **F5** or `godot --path .` | `bash tools/validate.sh` (runs import, integration default/`--disabled`/`--native`, bootstrap failure checks); `--capture` for GUI verification |
| **Both (after `config/game.cfg` change)** | — | `godot --headless --path . --script res://tools/configure.gd` (re-running must produce empty `git diff`) |

Always inspect the **summary line (`INTEGRATION: N checks, 0 failures`) and full logs** for `SCRIPT ERROR`, `Parse Error`, `ERROR:`, or object leaks—Godot can exit `0` after script parse errors.

**Reporting rule**: Record visual/input verification and headless test output separately. Desktop/Linux headless tests do **not** prove Android/iOS device behavior, Windows/macOS executables, code signing, or live store/Steam SDK behavior.

---

## Reference guides

| Topic | Reference | Key Coverage |
| :--- | :--- | :--- |
| **Mobile platform & stores** | [`references/mobile.md`](references/mobile.md) | `App.ads`/`App.billing`/privacy, `SafeArea`, ONE store vs Google Play, integration tests |
| **PC platform & Steam** | [`references/pc.md`](references/pc.md) | `InputManager`, `WindowManager`, `PauseMenu`/`App.dialogs`, `App.store`, `tools/validate.sh`, Steam/export |
| **Project structure & config** | [`references/project_structure.md`](references/project_structure.md) | Mobile vs PC tree, autoload boot order, `app/init_script`, `config/game.cfg` + `configure.gd` |
| **Scenes & pause flow** | [`references/scenes_and_flow.md`](references/scenes_and_flow.md) | `SceneManager`, `SceneTree.paused`, `PROCESS_MODE_ALWAYS`, pause reasons, clean transitions |
| **Input & action mapping** | [`references/input_action_mapping.md`](references/input_action_mapping.md) | `InputMap`, `Input.get_vector`, PC rebinding (`InputManager`), mobile touch & `back_requested` |
| **Physics & collision** | [`references/physics_and_collision.md`](references/physics_and_collision.md) | `CharacterBody2D`, `Area2D`, layers/masks, coyote time, hitboxes & hurtboxes |
| **Entity management & pooling** | [`references/entity_management.md`](references/entity_management.md) | `PackedScene` instancing, node pooling, groups, typed signals, `queue_free` hygiene |
| **Camera, tweens & juice** | [`references/camera_and_juice.md`](references/camera_and_juice.md) | `Camera2D` follow/shake, `create_tween()`, hit-stop, particles, `CanvasItem` hit-flash shader |
| **Tilemaps & levels** | [`references/tilemaps_and_levels.md`](references/tilemaps_and_levels.md) | `TileMapLayer`, `TileSet` physics/navigation, terrains, `2:1` isometric layout |
| **Pathfinding & AI** | [`references/pathfinding_and_ai.md`](references/pathfinding_and_ai.md) | `AStarGrid2D`, `NavigationAgent2D`, steering, readable enemy FSMs |
| **UI, HUD & safe areas** | [`references/ui_and_hud.md`](references/ui_and_hud.md) | `CanvasLayer` HUD, `Control` anchors, `SafeArea` (mobile), PC menus/theme/i18n |
| **Audio & save persistence** | [`references/audio_and_persistence.md`](references/audio_and_persistence.md) | `AudioManager`, `.wav.import` looping, `SaveManager` migrations & error handling, `Settings` |
