# Scenes, transitions, and pause lifecycle (Godot 4)

## Scene transitions (`SceneManager`)

Always switch top-level scenes through `SceneManager.change_scene(path, show_loading)`:

```gdscript
var err := SceneManager.change_scene("res://game/levels/stage_01.tscn", true)
if err != OK:
	push_error("Failed to transition to stage_01: %s" % error_string(err))
```

- Connect to `SceneManager.transition_started`, `transition_completed`, or `transition_failed` when coordinating fades or BGM handoffs.
- `SceneManager` loads on the main thread and advances in `_process`. If you need to change scenes while `get_tree().paused = true`, clear your pause reason (or ensure the caller and `SceneManager` process mode handle pause cleanly) and test the transition explicitly.

## Scene tree structure for a gameplay stage

Separate world simulation from screen-space HUD and pause overlays:

```text
GameStage (Node2D)
├── World (Node2D, process_mode = INHERIT)
│   ├── TileMapLayer (Ground, Solids)
│   ├── Entities (Node2D, y_sort_enabled = true for top-down/isometric)
│   │   ├── Player (CharacterBody2D)
│   │   └── Enemies (Node2D)
│   ├── Projectiles (Node2D)
│   └── Camera2D
├── HudLayer (CanvasLayer, layer = 10)
│   └── SafeArea (mobile) / MarginContainer (pc)
└── PauseLayer (CanvasLayer, layer = 20, process_mode = PROCESS_MODE_ALWAYS)
    └── PauseMenu (PC: ui/menus/pause_menu.gd) or mobile pause overlay
```

## Pause discipline

### PC template (`App.set_paused(reason, enabled)`)
`App` tracks independent pause reasons (`"menu"`, `"focus"`, `"dialog"`, etc.) and manages `get_tree().paused` and audio suspension:

- Pass a dedicated reason string when opening an in-game pause menu, inventory, or modal dialog:
  ```gdscript
  App.set_paused("menu", true)   # pauses tree + suspends audio
  App.set_paused("menu", false)  # resumes only if no other pause reasons remain
  ```
- Never toggle `get_tree().paused` directly on PC; doing so fights `App`'s focus-loss and menu pause tracking.
- Put `process_mode = Node.PROCESS_MODE_ALWAYS` on `PauseMenu`, quit dialogs, and any UI that must accept input while paused.

### Mobile template (`App.paused` / `App.resumed`)
- `App` flushes `SaveManager` and suspends `AudioManager` when the OS backgrounds the app, then emits `App.paused` and `App.resumed`.
- Your gameplay scene decides whether backgrounding should leave the game paused behind a resume overlay (recommended for real-time action games) or resume immediately (often preferred for turn-based puzzles).

## Clean scene teardown

Before calling `SceneManager.change_scene(...)`:
- Release any pause reasons your scene acquired (`App.set_paused("menu", false)` on PC).
- Stop or crossfade scene-specific BGM (`AudioManager.stop_bgm()` or `AudioManager.play_bgm(next_stream)`).
- Flush critical save state (`SaveManager.flush()`) at round completion or stage clear.
- Disconnect any signals connected to long-lived autoloads (`App`, `SaveManager`, `Settings`, `InputManager`) inside `_exit_tree()` so freed scene methods are never called later.
