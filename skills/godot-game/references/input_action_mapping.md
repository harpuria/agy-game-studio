# Input and action mapping (Godot 4)

Use Godot's `InputMap` logical actions everywhere in gameplay code—never hardcode raw keycodes (`KEY_SPACE`) inside entity scripts.

## Reading movement and actions cleanly

- **8-way / analog movement**: Use `Input.get_vector("move_left", "move_right", "move_up", "move_down")`. It applies radial deadzone handling and normalizes diagonal input to length `<= 1.0`.
- **1D horizontal axis (platformers)**: Use `Input.get_axis("move_left", "move_right")`.
- **Discrete gameplay actions**: Handle one-shot actions (jump, attack, interact, pause) in `_unhandled_input(event)` rather than `_input(event)` so focused `Control` UI buttons consume clicks and `Enter`/`Space` first.

```gdscript
## Player input handling example.
func _physics_process(delta: float) -> void:
	var dir := Input.get_vector(&"move_left", &"move_right", &"move_up", &"move_down")
	velocity = dir * move_speed
	move_and_slide()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"primary_action"):
		_trigger_attack()
		get_viewport().set_input_as_handled()
```

## PC template: rebindable actions (`InputManager`)

`godot-pc-template` ships with `InputManager` (`autoload/input_manager.gd`) and `COMMON_ACTIONS`:
`&"move_left"`, `&"move_right"`, `&"move_up"`, `&"move_down"`, `&"primary_action"`, `&"pause"`, `&"toggle_fullscreen"`.

- Register additional game actions inside `game/game_init.gd`'s `before_app_initialize()`:
  ```gdscript
  var err := InputManager.register_action(
  	&"dash",
  	[DefaultInput.key(KEY_SHIFT), DefaultInput.button(JOY_BUTTON_B)]
  )
  if err != OK:
  	return {"error": err}
  ```
- Each registered action supports 2 slots across `"keyboard_mouse"` and `"controller"` categories and persists to `user://input.cfg`.
- Never try to register `ui_*` actions for rebinding (`InputManager` intentionally excludes them so menu navigation stays safe).
- Update button prompts dynamically by connecting to `InputManager.device_changed(device: String)` (`"keyboard_mouse"` vs. `"controller"`) and reading `InputManager.binding_text(&"primary_action")`.

## Mobile template: touch, gestures, and Android back

- **Virtual buttons / stick**: Place touch controls inside a `CanvasLayer` wrapped by `SafeArea` (`ui/common/safe_area.gd`). Either use `TouchScreenButton` mapped to an `InputMap` action (`action = "primary_action"`) or a custom `Control` virtual thumbstick that writes a normalized `Vector2` into a shared input resource.
- **Direct tap / drag games (puzzles, tactics, tower defense)**: Handle `InputEventScreenTouch` and `InputEventScreenDrag` in `_unhandled_input(event)` and convert viewport coordinates to world coordinates with `get_global_mouse_position()` or `get_canvas_transform().affine_inverse() * event.position`.
- **Android back button / gesture**: Connect to `App.back_requested` in your active scene to close dialogs, toggle pause, or open an exit confirmation rather than quitting abruptly.

## Input buffering (action games)

Buffer jump or attack presses for `0.10–0.14s` using a countdown float (`_jump_buffer = maxf(0.0, _jump_buffer - delta)`) in `_physics_process` so pressing jump a few frames before landing still feels crisp.
