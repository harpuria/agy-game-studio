# Audio and save persistence (Godot 4 templates)

Always route audio through `AudioManager` (`autoload/audio_manager.gd`), preferences through `Settings` (`autoload/settings.gd`), and game progress through `SaveManager` (`autoload/save_manager.gd`).

## Audio (`AudioManager`)

| Method | Bus / Behavior |
| :--- | :--- |
| `AudioManager.play_bgm(stream)` | Plays looping music on the BGM player (switches cleanly if stream changes). |
| `AudioManager.stop_bgm()` | Stops current BGM playback. |
| `AudioManager.play_sfx(stream)` | Plays a one-shot gameplay sound through the pooled effect players (`MAX_EFFECTS = 16`). |
| `AudioManager.play_ui(stream)` | Plays a UI sound on the UI audio bus. |
| `AudioManager.set_suspended(bool)` | Managed by `App` on pause/focus-loss/background. |

**Audio best practices**:
- **Gapless BGM loops**: Bake BGM as **`.wav`** (`music_synthesize` or `lyria-3.5`) and set `edit/loop_mode=1` (Forward) in the `.wav.import` settings so tracks loop seamlessly without MP3 priming gaps.
- **SFX cooldown throttling**: Guard rapid-fire gameplay sounds (coins, footsteps, machine-gun hits) with a small per-cue cooldown (`40–80 ms`) so you do not saturate the 16 effect players or clip the master bus.
- **Bus volumes**: Let `Settings` drive Master/BGM/SFX/UI bus levels (`default_bus_layout.tres`); never overwrite `AudioServer` bus volumes directly from gameplay code.

## Save persistence (`SaveManager` + `Settings`)

### Registering schema and migrations (`app/init_script`)
Always set `SaveManager.schema_version` and register migrations inside `before_app_initialize()` **before** `App.initialize()` calls `SaveManager.load_slot()`:

```gdscript
## Register save schema version and migrations before App.initialize().
SaveManager.schema_version = 2
SaveManager.register_migration(1, func(old: Dictionary) -> Dictionary:
	old["unlocked_stage"] = old.get("unlocked_stage", 1)
	return old
)
```

### Reading, writing, and flushing
- Read saved fields with defaults: `var best: int = int(SaveManager.data.get("best_score", 0))`.
- Write with `SaveManager.set_value("best_score", score)` (marks `dirty = true` for autosave). If you mutate nested dictionaries/arrays inside `SaveManager.data` directly, you **must** call `SaveManager.mark_dirty()`.
- Call `SaveManager.flush()` immediately after important milestones (stage clear, purchase grant, high score, before quitting).
- Keep user preferences (audio volume, display mode, language) in `Settings`, not in `SaveManager.data`.

### Handling save failures safely (never silently overwrite)
`SaveManager` emits `load_failed(error)` and `save_failed(error)`, and sets `SaveManager.write_blocked = true` if the existing save file is corrupt or from a newer schema version:
- Preserve failed save files on disk—never auto-reset without user confirmation (`SaveManager.reset_slot(...)`).
- Connect to `SaveManager.load_failed` / `save_failed` (and check `SaveManager.write_blocked` on startup) to show a clear recovery prompt in game UI (`App.dialogs` on PC or an in-game modal on mobile).
- **Mobile note**: `App.ready_for_game` fires even if `SaveManager.load_slot()` failed; check `SaveManager.write_blocked` explicitly.
- **PC note**: Keep `config/game.cfg`'s `app/data_directory` constant after shipping so players never lose saves across updates or distribution channels.
