# Physics and collision (Phaser Web)

Use Phaser **Arcade Physics** for 95% of 2D web games (platformers, top-down action, shmups, bullet-heavens, arcade puzzles). Reserve Matter.js only for games whose core mechanic is rigid-body stacking, joints, or polygon tumbling.

## Arcade Physics setup and hitbox discipline

- **Shrink hurtboxes, keep hitboxes fair**: Visual sprites include hair, capes, shadows, and transparent padding. Always call `body.setSize(w, h)` and `body.setOffset(ox, oy)` (or `body.setCircle(r, ox, oy)`) so collisions feel forgiving rather than frustrating.
- **Remember render scale `k`**: `setSize` / `setOffset` operate in **unscaled texture pixels** in Phaser Arcade Physics. If a sprite is loaded at `k`× resolution and displayed with `setScale(1 / k)`, compute hitbox dimensions relative to the texture frame size (or verify with `arcade.debug: true` during development).
- **Separate solid blocks from triggers**:
  - Use `this.physics.add.collider(a, b, onCollide)` for solid blocking (player vs. walls, platforms).
  - Use `this.physics.add.overlap(a, b, onOverlap)` for non-blocking triggers (pickups, projectiles, hurtboxes, checkpoints, hazard zones).

```ts
// Static wall group + dynamic actor
const walls = this.physics.add.staticGroup();
const player = this.physics.add.sprite(160, 200, assetKeys.hero);
const body = player.body as Phaser.Physics.Arcade.Body;
body.setSize(28, 36).setOffset(18, 22);
body.setCollideWorldBounds(true);

this.physics.add.collider(player, walls);
this.physics.add.overlap(player, pickups, (_p, item) => {
  this.collectPickup(item as Phaser.Physics.Arcade.Image);
});
```

## Genre-specific patterns

### Side-scrolling platformers
- Set `gravity.y` on actors (or physics config) and cap fall speed with `body.setMaxVelocity(maxRun, maxFall)`.
- Add **coyote time** (`0.08–0.12s` after leaving a ledge where jump still triggers) and **jump buffering** (`0.10–0.14s` before landing).
- Support variable jump height by multiplying upward velocity by `0.5` when the jump button is released while `body.velocity.y < 0`.
- For one-way platforms, set `tile.setCollision(false, false, true, false)` or check `playerBody.velocity.y >= 0` in the collider `processCallback`.

### Top-down 8-way movement
- Keep `gravity.y = 0`.
- Normalize diagonal input vectors (`MoveInput.move()` already returns length `0` or `1`) so diagonal movement is not `1.414×` faster.
- Use acceleration + drag (`setAcceleration`, `setDrag`, `setMaxVelocity`) for weighty ships/vehicles, or direct velocity for snappy arcade control.

### Bullet-heavens and dense shmups
- Do **not** attach Arcade Physics bodies to 500+ non-solid particles or decorative bullets if simple circle distance checks suffice.
- For dense enemy/bullet separation or hit checks, use a pure TypeScript **uniform spatial hash grid** (cell size ≈ `2 × maxEntityRadius`) inside `src/game/systems/`. It runs in $O(N)$ with zero GC pressure and is directly unit-testable in Vitest.

## Frame-rate independence and determinism

- Always clamp `delta`: `const dt = Math.min(delta, 50) / 1000`.
- For competitive or replay-sensitive physics, run a fixed-step accumulator (`const STEP = 1 / 60`) in `update()` and advance simulation in fixed `STEP` increments, capping steps per frame (e.g., max `4`) to prevent spiral-of-death lag spikes.
- Never call `destroy()` directly inside a physics callback on objects owned by a pool—disable the body (`disableBody(true, true)`) and return it to the pool instead.
