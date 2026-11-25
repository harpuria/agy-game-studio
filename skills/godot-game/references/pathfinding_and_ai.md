# Pathfinding and AI (Godot 4 2D)

Godot 4 provides two built-in 2D pathfinding engines—pick the one that fits your level topology rather than hand-rolling A* unless you need custom tactical rules.

## 1. Grid-based pathfinding (`AStarGrid2D`)

Ideal for tile-based RPGs, roguelikes, tactics, and tower defense. Very fast, deterministic, and easy to unit-test headlessly:

```gdscript
## Computes AStarGrid2D paths using solid cells from a TileMapLayer.
class_name GridNavigator
extends RefCounted

var grid := AStarGrid2D.new()

func setup(bounds: Rect2i, cell_size: Vector2, walls: TileMapLayer) -> void:
	grid.region = bounds
	grid.cell_size = cell_size
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	grid.update()
	for cell in walls.get_used_cells():
		if bounds.has_point(cell):
			grid.set_point_solid(cell, true)

## Returns the world-space path between two grid cells.
func find_world_path(from_cell: Vector2i, to_cell: Vector2i) -> PackedVector2Array:
	if not grid.is_in_boundsv(from_cell) or not grid.is_in_boundsv(to_cell):
		return PackedVector2Array()
	return grid.get_point_path(from_cell, to_cell)
```

- Set per-cell weights with `grid.set_point_weight_scale(cell, 3.0)` for swamps, hazards, or enemy-occupied tiles.

## 2. Free-space navigation (`NavigationAgent2D`)

Ideal for open arenas, smooth diagonal rooms, and organic obstacles:

1. Paint navigation polygons on your `TileSet` navigation layer (or wrap the level in a `NavigationRegion2D`).
2. Add a `NavigationAgent2D` child to each enemy `CharacterBody2D`.
3. Update `agent.target_position` on a staggered timer (`0.25–0.5s` with random jitter), **not every physics frame**.
4. In `_physics_process`, read `var next_pos := agent.get_next_path_position()` and steer `velocity = global_position.direction_to(next_pos) * speed`.
5. Enable `avoidance_enabled = true` on `NavigationAgent2D` and connect `velocity_computed` for RVO crowd separation when many enemies chase the player at once.

## Readable enemy state machines

Use a typed `enum State` (for simple enemies) or child state nodes (for multi-phase bosses). Always include a visible **telegraph** state before active damage frames:

```gdscript
enum State { IDLE, CHASE, TELEGRAPH, ATTACK, RECOVER }
```

- Drive state durations with a `var _state_timer: float` decremented by `delta` inside `_physics_process(delta)`, never wall-clock `Time.get_ticks_msec()`, so `get_tree().paused` freezes enemy timers automatically.
- Show clear visual + audio cues during `TELEGRAPH` (`0.3–0.6s`) before enabling the enemy's attack hitbox `Area2D`.
