# Tilemaps and levels (Godot 4)

Always use **`TileMapLayer`** nodes (the Godot 4.3+ replacement for the deprecated multi-layer `TileMap` node). Stack one `TileMapLayer` per visual/collision plane (`Ground`, `Walls`, `Decor`, `Foreground`) under a level root node, sharing a single `TileSet` resource.

## Setting up a `TileSet` from baked `sprite-design` sheets

1. Bake your seamless tileset PNG with `sprite-design` (`sprite_compile`) into `game/assets/sprites/`.
2. Create a `TileSet` resource (`game/data/tileset.tres`), set `tile_size` (e.g. `Vector2i(16, 16)` or `Vector2i(32, 32)` for ortho; `Vector2i(64, 32)` with `tile_shape = TILE_SHAPE_ISOMETRIC` and `tile_layout = TILE_LAYOUT_DIAMOND_DOWN` for `2:1` isometric).
3. Add the PNG as a `TileSetAtlasSource` with matching `texture_region_size`.
4. Add a **Physics Layer** on the `TileSet` (assigned to your `world` collision layer) and paint collision polygons only on solid tiles.
5. Add **Terrain Sets** (Match Corners and Sides) for automatic wall/ground bitmask autotiling in the editor or via `set_cells_terrain_connect(...)` in procedural level generators.
6. Optionally add a **Navigation Layer** on walkable tiles so `NavigationAgent2D` can pathfind directly over the `TileMapLayer`.

## Reading tile coordinates and custom data in GDScript

Attach custom data layers (e.g., `hazard: bool`, `move_cost: int`, `surface: String`) to tiles in the `TileSet` instead of hardcoding tile IDs:

```gdscript
## Queries custom tile metadata at a world position.
func get_tile_move_cost(ground: TileMapLayer, world_pos: Vector2) -> int:
	var cell: Vector2i = ground.local_to_map(ground.to_local(world_pos))
	var tile_data: TileData = ground.get_cell_tile_data(cell)
	if tile_data == null:
		return 1
	return int(tile_data.get_custom_data("move_cost"))
```

## Data-driven spawns and transitions

- Place `Marker2D` nodes under a `Spawns` node (or use a `TileSetScenesCollectionSource` layer) for player start, enemy waves, and doors instead of hardcoding coordinates in GDScript.
- For top-down or `2:1` isometric levels where entities walk behind walls or props, enable `y_sort_enabled = true` on both the `Entities` parent node and the prop `TileMapLayer`, and set each tile's `y_sort_origin` to its ground contact line.
- For pixel-art tilemaps, set texture filter to **Nearest** (`TEXTURE_FILTER_NEAREST`) and enable pixel snapping in Project Settings to eliminate 1-pixel seams during camera scroll.
