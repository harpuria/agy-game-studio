# Camera, tweens, and game feel ("Juice") (Phaser Web)

Small feedback cues—brief hit-stop, subtle camera kick, squash-and-stretch, hit flashes, and crisp particles—turn working mechanics into satisfying gameplay. Always respect the user's `reducedMotion` setting from `app.listenSettings()`.

## Camera follow, bounds, and safe-area zoom

`centerSafeArea` sets `cameras.main.setZoom(k)` for fixed-screen scenes. For scrolling worlds (platformers, top-down exploration):

1. Set world bounds on both physics and camera:
   ```ts
   this.physics.world.setBounds(0, 0, worldW, worldH);
   const cam = this.cameras.main;
   cam.setBounds(0, 0, worldW, worldH);
   cam.setZoom(this.app.renderScale);
   cam.startFollow(this.player, gameConfig.pixelArt, 0.12, 0.12);
   cam.setDeadzone(80, 50);
   ```
2. Keep `roundPixels` aligned with `gameConfig.pixelArt` (`true` for crisp pixel art so sprites do not shimmer across subpixels).
3. Put HUD elements in a separate parallel `HudScene` (or set `.setScrollFactor(0)` on screen-pinned objects) so world scrolling and camera shake do not displace score/HP readouts.

## Respecting `reducedMotion`

Subscribe once in `create()` and unsubscribe on `SHUTDOWN`:

```ts
private reducedMotion = false;

// In create():
this.stopSettings = this.app.listenSettings((s) => {
  this.reducedMotion = s.reducedMotion;
});
```

When `reducedMotion` is `true`:
- Skip camera shake (`cam.shake`) and full-screen flashes (`cam.flash`).
- Pause decorative idle/hover tweens on menus.
- Keep functional feedback (hit tint, sound effects, score popups without aggressive bounce).

## Impact feedback patterns

### 1. Camera shake & flash
```ts
if (!this.reducedMotion) {
  this.cameras.main.shake(120, 0.008); // durationMs, intensity
  this.cameras.main.flash(90, 255, 255, 255, false);
}
```
Keep shake intensity subtle (`0.004–0.015`) and short (`80–180 ms`) so playability stays clear.

### 2. Hit-stop (impact freeze frames)
Freeze simulation for `40–80 ms` on heavy hits so attacks feel weighty:

```ts
private hitStopMs = 0;

triggerHitStop(ms = 55) {
  if (!this.reducedMotion) this.hitStopMs = Math.max(this.hitStopMs, ms);
}

update(_time: number, delta: number) {
  if (this.hitStopMs > 0) {
    this.hitStopMs -= delta;
    return; // Skip simulation step while visuals/HUD stay rendered
  }
  // Normal gameplay update...
}
```

### 3. Squash-and-stretch and hit flash
```ts
// Jump or landing squash (respect baseScale = 1 / k)
this.tweens.add({
  targets: this.player,
  scaleX: baseScale * 1.18,
  scaleY: baseScale * 0.84,
  duration: 70,
  yoyo: true,
  ease: 'Quad.out',
});

// Crisp white hit flash
enemy.setTintFill(0xffffff);
this.time.delayedCall(70, () => {
  if (enemy.active) enemy.clearTint();
});
```

### 4. Pooled burst particles
Create one reusable `ParticleEmitter` per effect type (sparks, dust, coin burst) in `create()` with `emitting: false`, then call `emitter.explode(10, x, y)` on impact—zero per-hit emitter allocation.
