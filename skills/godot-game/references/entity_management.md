# Entity management and node pooling (Godot 4)

Keep scenes modular, communicate with typed signals, and pool high-frequency entities (projectiles, particles, swarm enemies) so gameplay stays smooth on mobile and desktop alike.

## Scene composition and signal flow

- **Call down, signal up**: A parent stage spawns and configures child entities by calling methods on them; children notify parents by emitting typed signals (`signal died(enemy: Node2D, world_pos: Vector2)`).
- Never couple entities with brittle paths like `get_node("../../HUD/ScoreLabel")`. Connect child signals in the spawner or route stage-wide events through a small scene-owned coordinator node.
- Use **Groups** (`add_to_group(&"enemies")`) sparingly for coarse queries (`get_tree().get_nodes_in_group(&"enemies")`), not every frame inside tight loops.

## Node pooling pattern (projectiles & swarm units)

Instantiating and freeing dozens of nodes per second causes frame spikes—especially on mobile. Pre-allocate a fixed pool under a dedicated container node:

```gdscript
## Fixed-capacity node pool to avoid frequent instantiate/queue_free spikes.
class_name NodePool
extends Node

@export var scene: PackedScene
@export var capacity: int = 64

var _inactive: Array[Node] = []

func _ready() -> void:
	assert(scene != null, "NodePool requires a PackedScene")
	for _i in range(capacity):
		var node := scene.instantiate()
		_deactivate(node)
		add_child(node)
		_inactive.append(node)

## Borrows an inactive node, or returns null when the pool is exhausted.
func acquire() -> Node:
	if _inactive.is_empty():
		return null
	var node: Node = _inactive.pop_back()
	node.process_mode = Node.PROCESS_MODE_INHERIT
	if node is CanvasItem:
		(node as CanvasItem).visible = true
	return node

## Returns a finished node back to the pool.
func release(node: Node) -> void:
	_deactivate(node)
	_inactive.append(node)

func _deactivate(node: Node) -> void:
	node.set_deferred(&"process_mode", Node.PROCESS_MODE_DISABLED)
	if node is CanvasItem:
		(node as CanvasItem).visible = false
```

Rules for pooled entities:
- Every pooled entity implements a `reset_state(...)` method that resets position, velocity, HP, modulate/tint, timers, and `CollisionShape2D.disabled` (`set_deferred`) when acquired.
- Disable `Area2D` `monitoring` and `monitorable` via `set_deferred` on release so inactive pooled objects cannot collide with live entities.

## Safe deletion and cleanup

- Always use `queue_free()` (never `free()`) for non-pooled nodes removed during physics or signal callbacks.
- Before calling methods on a cached node reference that might have been freed, check `is_instance_valid(target)`.
- Disconnect signals bound to long-lived autoloads (`App`, `SaveManager`, `Settings`, `InputManager`) in `_exit_tree()` to prevent calls on freed instances.
