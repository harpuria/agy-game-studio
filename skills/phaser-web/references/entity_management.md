# Entity management and object pooling (Phaser Web)

Creating and destroying sprites, physics bodies, and particles every frame triggers browser garbage-collection pauses (visible 16–50 ms stutters). Pool every recurring entity.

## Pooled `Physics.Arcade.Group` pattern

```ts
export class Bullet extends Phaser.Physics.Arcade.Image {
  private lifeMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, assetKeys.bullet);
  }

  fire(x: number, y: number, vx: number, vy: number, ttlMs = 1500) {
    this.enableBody(true, x, y, true, true);
    this.setVelocity(vx, vy);
    this.lifeMs = ttlMs;
  }

  preUpdate(_time: number, delta: number) {
    this.lifeMs -= delta;
    if (this.lifeMs <= 0) {
      this.recycle();
    }
  }

  recycle() {
    this.disableBody(true, true);
  }
}

// In GameScene.create():
this.bullets = this.physics.add.group({
  classType: Bullet,
  maxSize: 120,
  runChildUpdate: true,
});

// Spawning without allocation after warmup:
const bullet = this.bullets.get(x, y) as Bullet | null;
if (bullet) {
  bullet.fire(x, y, vx, vy);
}
```

Guidelines:
- Always set `maxSize` on pools so runaway spawners fail safely instead of exhausting memory.
- Handle `group.get(...)` returning `null` gracefully (drop lowest-priority spawns or recycle oldest).
- Use `disableBody(true, true)` (for physics objects) or `group.killAndHide(obj)` (for plain display objects) to return an item to the pool.
- Reset **all** mutable state in `fire()` / `spawn()` (alpha, tint, scale, rotation, HP, status timers, velocity, body enabled) so recycled objects never inherit stale state from their previous life.

## Deferred state changes during iteration

Never remove items from an active array while iterating over it inside `update()` or physics overlap callbacks:

- Mark entities dead (`entity.alive = false`) or push them to a pre-allocated cleanup list, and recycle them at the end of the step.
- Guard overlap callbacks with `if (!a.active || !b.active) return;` because Phaser can invoke multiple overlaps in the same tick before a recycled body is ignored.

## Keeping gameplay state testable

Separate pure domain rules from Phaser display objects whenever logic gets complex (inventory, deckbuilding, turn resolution, wave scheduling, status effects):

- Put pure state transitions in `src/game/systems/` (plain TypeScript, no `Phaser` imports).
- Have `GameScene` read domain state to sync sprites, animations, and SFX.
- Test domain rules directly with `npm test` (Vitest) without launching a browser.
