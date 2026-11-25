# Camera, tweens, shaders, and game feel ("Juice") (Godot 4)

## `Camera2D` setup and trauma screen shake

Attach `Camera2D` to the player (or a smooth follow target node) with `limit_left/top/right/bottom` matched to level bounds and `position_smoothing_enabled = true`.

```gdscript
## Camera2D with quadratic trauma-based screen shake.
class_name GameCamera
extends Camera2D

@export var max_offset: Vector2 = Vector2(10.0, 10.0)
@export var decay_rate: float = 2.8

var _trauma: float = 0.0
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.randomize()

## Adds trauma clamped to [0.0, 1.0].
func add_trauma(amount: float) -> void:
	_trauma = minf(1.0, _trauma + amount)

func _process(delta: float) -> void:
	if _trauma <= 0.0:
		offset = Vector2.ZERO
		return
	var shake := _trauma * _trauma # Quadratic falloff feels snappier than linear
	offset = Vector2(
		_rng.randf_range(-1.0, 1.0) * max_offset.x * shake,
		_rng.randf_range(-1.0, 1.0) * max_offset.y * shake
	)
	_trauma = maxf(0.0, _trauma - decay_rate * delta)
```

- For pixel art, enable `Rendering -> 2D -> Snap -> Snap 2D Transforms to Pixel` (and `Snap 2D Vertices to Pixel`) in Project Settings so camera movement does not cause subpixel shimmer.

## Tweens (squash-and-stretch & UI pops)

Use scene-tree `create_tween()` so tweens automatically pause when `get_tree().paused = true` and stop if the node leaves the tree:

```gdscript
## Brief squash-and-stretch feedback on jump or landing.
func play_squash(sprite: Node2D, scale_x: float, scale_y: float) -> void:
	var tween := create_tween()
	tween.tween_property(sprite, "scale", Vector2(scale_x, scale_y), 0.06).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2.ONE, 0.09).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
```

## Hit-stop (impact freeze)

Brief `40–70 ms` hit-stops add punch to melee and boss hits. Prefer freezing the gameplay `World` subtree (or scaling a local `world_time_scale`) rather than mutating global `Engine.time_scale`, which can interfere with UI animations, timers, and audio:

```gdscript
## Freezes only the World subtree briefly for impact weight.
func trigger_hit_stop(world: Node, duration_sec: float = 0.05) -> void:
	world.process_mode = Node.PROCESS_MODE_DISABLED
	await get_tree().create_timer(duration_sec, true, false, true).timeout
	if is_instance_valid(world):
		world.process_mode = Node.PROCESS_MODE_INHERIT
```

## Particles and hit-flash `CanvasItem` shader

- **Particles**: Use `GPUParticles2D` on PC (or `CPUParticles2D` on low-end mobile / Compatibility renderer where GPU particle shader compilation can stutter). Pre-warm one-shot particle scenes at stage load and reuse them with `restart()`.
- **Hit-flash shader** (`ShaderMaterial` on sprite—set `resource_local_to_scene = true` so flashing one enemy does not flash every instance):

```glsl
shader_type canvas_item;
uniform float flash_amount : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	COLOR = vec4(mix(tex.rgb, flash_color.rgb, flash_amount), tex.a);
}
```
