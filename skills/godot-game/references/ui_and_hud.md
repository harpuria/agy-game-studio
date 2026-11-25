# UI, HUD, and safe areas (Godot 4)

## HUD architecture (`CanvasLayer` + `Control` containers)

- Mount gameplay HUD inside a `CanvasLayer` (`layer = 10`) so it stays decoupled from `Camera2D` movement, zoom, and screen shake.
- Use `Control` containers (`MarginContainer`, `VBoxContainer`, `HBoxContainer`, `GridContainer`) with explicit anchors (`PRESET_FULL_RECT`, `PRESET_TOP_LEFT`, `PRESET_BOTTOM_RIGHT`) rather than hardcoded pixel coordinates so layouts adapt cleanly across 16:9, 16:10 (Steam Deck), ultrawide, and mobile aspect ratios.
- Set `mouse_filter = Control.MOUSE_FILTER_IGNORE` on non-interactive HUD overlays (labels, bars, spacers) so pointer and touch input passes through to gameplay.
- Avoid updating label `.text` every frame when values have not changed—emit a signal (`score_changed(new_score)`) from gameplay state to update HUD widgets only on change.

## Mobile template UI rules

- Wrap root HUD and menu containers inside `SafeArea` (`ui/common/safe_area.gd`, `class_name SafeArea extends MarginContainer`). It listens to `get_viewport().size_changed` and converts `DisplayServer.get_display_safe_area()` into Control margins so notches, punch-holes, and home indicators never cover buttons.
- Size touch buttons to at least `48×48` logical pixels (`custom_minimum_size`) with clear press feedback.
- Reuse `ui/settings/settings_panel.gd` and `ui/loading/loading.tscn` where appropriate.

## PC template UI rules

Reuse the template's built-in desktop UI before building custom replacements:
- **Pause menu**: `ui/menus/pause_menu.gd` (wired to `App.set_paused("menu", ...)`).
- **Quit & error recovery dialogs**: `App.dialogs` (`ui/dialogs/quit_dialogs.gd`).
- **Settings panel**: `ui/settings/settings_panel.gd` (handles audio sliders, window mode/VSync/FPS with confirmation rollback, language switch, and `InputManager` keybinding capture).
- **Theme**: `ui/theme/default_theme.tres` (configured as `gui/theme/custom`).
- **Localization**: Common UI keys live in `ui/i18n/ui.csv` (`en` and `ko`). Add game-specific CSV translation files under `game/` and register them in Project Settings (see `docs/HOWTO.md`).
- **Keyboard & gamepad navigation**: Ensure every interactive menu `Button` / `Slider` has valid focus neighbors and calls `grab_focus()` when a menu opens so keyboard and Steam Deck players never lose focus.
- **Pause processing**: Set `process_mode = Node.PROCESS_MODE_ALWAYS` on pause menus, settings panels, and quit dialogs.

## Viewport stretch settings

- **2D HD (`1280×720`)**: `stretch/mode = "canvas_items"`, `stretch/aspect = "expand"` (or `"keep"` for fixed framing).
- **Retro pixel art (`320×180` / `640×360`)**: `stretch/mode = "viewport"`, `stretch/aspect = "keep"` (or integer scaling) with `TEXTURE_FILTER_NEAREST`.
