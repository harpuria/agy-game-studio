# Input and action mapping (Phaser Web)

Support keyboard, mouse/pointer, touch, and gamepad cleanly without stealing focus from HTML Shell controls.

## Reusing `MoveInput` from `src/core/input.ts`

The template includes `MoveInput`, which unifies `WASD`/Arrows, gamepad D-pad + left stick (with radial deadzone), and pointer/touch drag direction toward an origin:

```ts
import { MoveInput, isTypingInControl } from '../core/input';

export class GameScene extends Phaser.Scene {
  private moveInput!: MoveInput;
  private actionKey?: Phaser.Input.Keyboard.Key;

  create() {
    this.moveInput = new MoveInput(this);
    this.actionKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    // Pass player position so pointer/touch drag steers toward the pointer.
    const dir = this.moveInput.move(this.player);
    this.player.setVelocity(dir.x * SPEED, dir.y * SPEED);

    // Always guard discrete keyboard actions with isTypingInControl().
    if (!isTypingInControl() && this.actionKey && Phaser.Input.Keyboard.JustDown(this.actionKey)) {
      this.triggerPrimaryAction();
    }
  }
}
```

Important details:
- `moveInput.move()` returns a **reused** `Phaser.Math.Vector2` (length `0` or `1`). Copy `.x` / `.y` instead of storing the vector reference.
- Keyboard events are scoped to `#game`, and `#game` sets `touch-action: none` so touch dragging never scrolls the page.
- Always check `isTypingInControl()` before acting on custom keyboard listeners so typing in or pressing `Space`/`Enter` on HTML buttons/sliders does not double-trigger gameplay actions.

## Discrete action helper (multi-input)

For games with jump, dash, attack, or interact actions, map logical actions rather than hardcoding key checks across entities:

```ts
export class ActionMap {
  private keys = new Map<string, Phaser.Input.Keyboard.Key[]>();
  private buffers = new Map<string, number>();

  constructor(private scene: Phaser.Scene) {}

  bind(action: string, codes: (string | number)[]) {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keys.set(action, codes.map((c) => kb.addKey(c)));
  }

  /** Call once per update(dt) to record recent presses for responsive input buffering. */
  poll(dt: number, bufferSeconds = 0.12) {
    const blocked = isTypingInControl();
    for (const [action, list] of this.keys) {
      const remaining = Math.max(0, (this.buffers.get(action) ?? 0) - dt);
      const pressed = !blocked && list.some((k) => Phaser.Input.Keyboard.JustDown(k));
      this.buffers.set(action, pressed ? bufferSeconds : remaining);
    }
  }

  consume(action: string): boolean {
    if ((this.buffers.get(action) ?? 0) > 0) {
      this.buffers.set(action, 0);
      return true;
    }
    return false;
  }

  isHeld(action: string): boolean {
    if (isTypingInControl()) return false;
    return (this.keys.get(action) ?? []).some((k) => k.isDown);
  }
}
```

## Pointer, touch, and multi-touch rules

- **World coordinates**: Read `pointer.worldX` and `pointer.worldY` (not raw screen `x`/`y`) so `Scale.EXPAND` + camera zoom (`k`) + camera scroll stay accurate.
- **Multi-touch**: Call `this.input.addPointer(2)` in `create()` when supporting simultaneous virtual stick + action buttons on mobile browsers.
- **Hit targets**: Keep touch buttons at least `48×48` logical pixels inside the safe area with generous hit areas (`setInteractive(rect, Phaser.Geom.Rectangle.Contains)`).
- **Gamepad polling**: Enable `input: { gamepad: true }` in the Phaser game config if your game requires controller input; read `this.input.gamepad?.pad1` safely (it is `undefined` until the user presses a button).
- **Playtest panel keys**: Remember `F8` and `` ` `` (backquote) are reserved by the Game Dev Studio Playtest panel for pause/annotate. Do not bind critical gameplay actions solely to those keys.
