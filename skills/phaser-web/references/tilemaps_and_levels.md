# Tilemaps and levels (Phaser Web)

Use Tiled JSON tilemaps (`Phaser.Tilemaps`) for authored levels, or lightweight typed 2D arrays in `src/game/` for procedural dungeons and grid puzzles.

## Loading and building a Tiled JSON map

1. Bake your tileset PNG with `sprite-design` (`sprite_compile`) into `public/assets/` and export the level from Tiled as JSON (`public/assets/levels/level1.json`).
2. Queue both in `src/game/assets.ts`:
   ```ts
   load.image(assetKeys.tiles, 'tiles.png');
   load.tilemapTiledJSON(assetKeys.level1, 'levels/level1.json');
   ```
3. Build layers and collision in `GameScene.create()`:
   ```ts
   const map = this.make.tilemap({ key: assetKeys.level1 });
   const tileset = map.addTilesetImage('tiles', assetKeys.tiles);
   if (!tileset) throw new Error('Missing tileset "tiles" in level1');

   const ground = map.createLayer('Ground', tileset, 0, 0);
   const solids = map.createLayer('Solids', tileset, 0, 0);
   if (!solids) throw new Error('Missing layer "Solids" in level1');

   // Either mark tiles in Tiled with custom boolean property `collides: true`
   solids.setCollisionByProperty({ collides: true });
   // Or collide by tile index range: solids.setCollisionBetween(1, 32);

   this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
   this.physics.add.collider(this.player, solids);
   ```

## Spawning entities from Tiled Object Layers

Keep enemy, pickup, and checkpoint placements data-driven instead of hardcoding coordinates:

```ts
const spawns = map.getObjectLayer('Spawns')?.objects ?? [];
for (const obj of spawns) {
  const x = obj.x ?? 0;
  const y = obj.y ?? 0;
  if (obj.type === 'player') this.player.setPosition(x, y);
  if (obj.type === 'enemy') this.spawnEnemy(x, y, obj.name);
}
```

## Avoiding tile bleeding (seams)

When scrolling or zooming with non-integer scaling, adjacent tiles can bleed 1 px edges:
- For pixel art, enable `gameConfig.pixelArt = true` and `cam.roundPixels = true`.
- Extrude tileset margins/spacing by 1–2 px (e.g., `margin: 1, spacing: 2`) when using smooth 2D HD filtering.

## Grid and 2:1 isometric helpers

For pure grid puzzles, tactical boards, or `2:1` dimetric isometric maps (`tileW = 64, tileH = 32`), keep coordinate conversion pure in `src/game/systems/grid.ts` so Vitest can test it:

```ts
export function isoToWorld(gx: number, gy: number, tileW: number, tileH: number) {
  return {
    x: (gx - gy) * (tileW / 2),
    y: (gx + gy) * (tileH / 2),
  };
}

export function worldToIso(wx: number, wy: number, tileW: number, tileH: number) {
  const gx = Math.floor((wx / (tileW / 2) + wy / (tileH / 2)) / 2);
  const gy = Math.floor((wy / (tileH / 2) - wx / (tileW / 2)) / 2);
  return { gx, gy };
}
```

Sort isometric sprites by depth using `sprite.setDepth(sprite.y)` (or `gx + gy`) whenever an entity moves.
