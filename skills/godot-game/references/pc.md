# Godot PC Template (`godot-pc-template`)

Procedures and contracts specific to Windows, macOS, Linux, and Steam Deck games built on `harpuria/godot-pc-template` (Godot **4.7.2 Standard**).

## Built-in PC managers and UI to reuse

Never rebuild standard desktop infrastructure that the template already provides:

| Capability | Template Module | How to Use |
| :--- | :--- | :--- |
| **Rebindable input** | `InputManager` (`autoload/input_manager.gd`) | Register game-specific rebindable actions in `game/game_init.gd` via `InputManager.register_action(&"action", defaults)` (or omit `defaults` if already defined in `project.godot` InputMap). `ui_*` actions are excluded from rebinding. |
| **Display & video** | `WindowManager` (`autoload/window_manager.gd`) | Change fullscreen/windowed/borderless, resolution, VSync, and max FPS through `WindowManager` (handles preview + confirmation rollback and saves via `Settings`). |
| **Pause menu** | `PauseMenu` (`ui/menus/pause_menu.gd`) | Reuse before writing custom pause menus. Coordinates with `App.set_paused("menu", ...)`. |
| **Quit & error dialogs** | `App.dialogs` (`ui/dialogs/quit_dialogs.gd`) | Reuse for quit confirmation and save-failure recovery dialogs (`App.request_quit()`, `App.quit_without_saving()`). |
| **Settings screen** | `SettingsPanel` (`ui/settings/settings_panel.gd`) | Reuse for audio, video, language, and keybinding UI (`operation_failed` handles failed video previews). |
| **Store / Achievements** | `App.store` (`StoreService`) | Game code calls `App.store` only; SDK integration lives in a `StoreAdapter` registered via `App.register_store_adapter(...)` inside `game/game_init.gd`. |
| **Theme & common i18n** | `ui/theme/default_theme.tres`, `ui/i18n/ui.csv` | Shared theme and `en`/`ko` UI translations (see `docs/HOWTO.md`). |

## Initialization hook (`game/game_init.gd`)

On the PC template, `scenes/bootstrap.gd` runs `app/init_script` (`res://game/game_init.gd`) and requires `before_app_initialize() -> Dictionary` to return `{"error": OK}`:

```gdscript
## Game initialization hook: register save migrations, custom actions, and store adapters.
extends RefCounted

func before_app_initialize() -> Dictionary:
	SaveManager.schema_version = 2
	SaveManager.register_migration(1, func(old: Dictionary) -> Dictionary:
		old["difficulty"] = "normal"
		return old
	)

	var err := InputManager.register_action(
		&"interact",
		[DefaultInput.key(KEY_E), DefaultInput.button(JOY_BUTTON_X)]
	)
	if err != OK:
		return {"error": err}

	return {"error": OK}
```

If `before_app_initialize()` returns a non-`OK` error (or throws), bootstrap blocks entry into the game and shows an explicit error message.

## Configuration, channels, and distribution

- Edit `config/game.cfg` for `name`, `version`, `data_directory` (keep fixed after release so save paths never move), `executable_name`, `macos_bundle`, `main_scene`, `init_script`, display defaults, `controller_deadzone`, `pause_on_focus_loss`, `mute_on_focus_loss`, `exclude_demo`, `steam_only_filter`, and store IDs.
- Apply changes to `project.godot` and all 9 export presets (Windows/macOS/Linux × standalone/itch/steam):
  ```bash
  godot --headless --path . --script res://tools/configure.gd
  ```
  Re-running must produce empty `git diff`.
- Distribution channel resolution: export preset feature tags (`standalone` / `itch` / `steam`) override `config/game.cfg`. Editor `auto` resolves to `standalone`.
- Once your game uses `game/main.tscn`, set `exclude_demo=true` under `[export]` so demo scenes and audio stay out of shipped builds.
- Read `docs/STEAM.md` before Steamworks / Cloud integration (never ship `steam_appid.txt` or unverified SDKs; isolate Steam addons with `steam_only_filter`). Read `docs/DISTRIBUTION.md` and `docs/distribution/README.md` before signing, notarizing, or uploading.

## Validation and reporting

Run from the game repository root (same script CI runs on Linux):

```bash
bash tools/validate.sh
# Or when godot is outside PATH:
GODOT=/Applications/Godot.app/Contents/MacOS/Godot bash tools/validate.sh
```

`tools/validate.sh` checks:
1. `--editor --import --quit` (clean import)
2. `tests/integration.tscn` (default, `--disabled`, `--native`) -> `INTEGRATION: N checks, 0 failures`
3. `tests/bootstrap_failure.tscn` (default and `--runtime-error`) -> `entry_blocked=true message_shown=true`

Always inspect the summary **and** logs under `build/validation_logs/` for `SCRIPT ERROR`, `Parse Error`, `ERROR:`, or object leaks (the only expected error logs are `Game init script failed` and `deliberate_init_failure` inside the failure-injection tests).

For GUI or window-settings changes, also run with a live window:
```bash
godot --path . --scene res://tests/integration.tscn -- --capture
```

**Reporting rule**: Headless or Linux CI tests do not verify Windows/macOS binaries, code signing, Steam Deck controls, or live Steam servers. Record each target OS and store verification explicitly.
