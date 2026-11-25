# Physics and collision (Godot 4 2D)

Pick the lightest 2D physics node that matches the behavior, and keep all movement and collision resolution inside `_physics_process(delta)`.

## Choosing the right node

| Node | Use For |
| :--- | :--- |
| `CharacterBody2D` | Players, walking/flying enemies, sliding actors controlled directly by code (`move_and_slide()`). |
| `Area2D` | Hitboxes, hurtboxes, pickups, projectiles, aggro sensors, checkpoints, trigger zones. |
| `StaticBody2D` / `TileMapLayer` | Walls, floors, one-way platforms, immovable level geometry. |
| `AnimatableBody2D` | Moving platforms (sync to physics enabled) that carry `CharacterBody2D` actors cleanly. |
| `RigidBody2D` | Physics-driven crates, boulders, pinballs, or ragdoll/tumbling puzzles. |

## Collision layers and masks (discipline)

Name your 2D physics layers in **Project Settings -> Layer Names -> 2D Physics** early so masks stay readable:

| Layer | Purpose |
| :--- | :--- |
| `1: world` | Solid walls, floors, platforms |
| `2: player` | Player body |
| `3: enemy` | Enemy body |
| `4: player_hitbox` | Player attacks & player projectiles (`Area2D`) |
| `5: enemy_hitbox` | Enemy attacks & enemy projectiles (`Area2D`) |
| `6: pickup` | Coins, items, triggers (`Area2D`) |

Rule of thumb:
- **Layer** = "what I am". **Mask** = "what I detect/collide with".
- Disable `monitoring = false` on passive hurtboxes or pickups that only need to be detected (`monitorable = true`), cutting broad-phase overhead dramatically in dense arenas.

## Platformer feel (`CharacterBody2D`, `MOTION_MODE_GROUNDED`)

```gdscript
## Platformer player controller with coyote time, jump buffer, and variable jump height.
extends CharacterBody2D

@export var move_speed: float = 220.0
@export var jump_velocity: float = -420.0
@export var gravity: float = 1100.0
@export var max_fall_speed: float = 650.0
@export var coyote_time: float = 0.10
@export var jump_buffer_time: float = 0.12

var _coyote_timer: float = 0.0
var _jump_buffer: float = 0.0

func _physics_process(delta: float) -> void:
	if is_on_floor():
		_coyote_timer = coyote_time
	else:
		_coyote_timer = maxf(0.0, _coyote_timer - delta)
		velocity.y = minf(velocity.y + gravity * delta, max_fall_speed)

	if Input.is_action_just_pressed(&"primary_action"):
		_jump_buffer = jump_buffer_time
	else:
		_jump_buffer = maxf(0.0, _jump_buffer - delta)

	if _jump_buffer > 0.0 and _coyote_timer > 0.0:
		velocity.y = jump_velocity
		_jump_buffer = 0.0
		_coyote_timer = 0.0

	if Input.is_action_just_released(&"primary_action") and velocity.y < 0.0:
		velocity.y *= 0.5

	var axis := Input.get_axis(&"move_left", &"move_right")
	velocity.x = axis * move_speed
	move_and_slide()
```

## Top-down movement (`CharacterBody2D`, `MOTION_MODE_FLOATING`)

Set `motion_mode = CharacterBody2D.MOTION_MODE_FLOATING` on top-down characters so Godot does not classify walls as floors or ceilings. Keep `floor_stop_on_slope` irrelevant and drive `velocity = Input.get_vector(...) * move_speed`.

## Hitboxes, hurtboxes, and deferred toggling

- Never scale a `CollisionShape2D` non-uniformly; resize its `Shape2D` resource (`RectangleShape2D.size`, `CircleShape2D.radius`) instead.
- Inside `area_entered` / `body_entered` signal handlers, never directly toggle `collision_shape.disabled = true`—use `collision_shape.set_deferred(&"disabled", true)` (or `set_deferred(&"monitoring", false)`) to avoid physics-flush errors.
