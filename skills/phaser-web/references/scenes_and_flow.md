# Scenes, viewport safe area, and pause lifecycle

## Standard scene flow

```text
BootScene -> PreloadScene (queueAssets) -> MenuScene -> GameScene (+ optional HudScene) -> ResultScene -> MenuScene / GameScene
```

Use the template's `transition(scene, targetKey, durationMs)` helper from `src/core/navigation.ts` for scene changes so fade timing stays consistent with `gameConfig.transitionMs` and reduced-motion preferences.

## Safe-area scaling (`Scale.EXPAND` + `centerSafeArea`)

The template configures Phaser with `Phaser.Scale.EXPAND` so the canvas fills any aspect ratio without letterboxing or scrollbars.

1. Call `centerSafeArea(this, gameConfig.width, gameConfig.height)` at the very top of `create()` (and `preload()` in `PreloadScene`).
2. Place all interactive elements, HUD margins, and playfield bounds inside `[0, W] × [0, H]`.
3. Extend background imagery (parallax strips, tiled patterns, grid lines, vignette) past the safe area (e.g., `-W` to `2 * W`, `-H` to `2 * H`) so ultrawide or tall mobile screens never reveal raw canvas edges.
4. `centerSafeArea` automatically zooms the main camera by `k` (`App.renderScale`) and sets `Text.setResolution(k)` on added `Phaser.GameObjects.Text` instances so typography stays crisp on HiDPI screens.
5. For images rasterized or prepared at `k`× resolution, apply `.setScale(1 / this.app.renderScale)`.

## Multi-reason `PauseState` and gameplay signals

Never pause scenes manually with ad-hoc booleans. The template tracks independent pause reasons (`manual`, `hidden`, `ad`, `settings`, `fatal`, etc.):

- Only scenes listed in `gameConfig.pausableScenes` are paused/resumed when pause reasons change.
- Call `this.app.setGameplay(true)` when active gameplay begins and `this.app.setGameplay(false)` when entering menus, victory/game-over screens, or non-interactive cutscenes. The template combines `setGameplay` with manual pause and ad interruptions to emit accurate CrazyGames `gameplayStart` / `gameplayStop` events (tab hide alone does not send `gameplayStop`).
- Manual toggle (`Escape` / pause button) toggles only the `'manual'` reason, so closing settings or returning from a hidden tab never accidentally clears a manual pause or a `'fatal'` state.

## Clean scene shutdown (no listener leaks)

Phaser reuses Scene instances across restarts (`scene.start` / `scene.restart`). Every scene **must** clean up external subscriptions on `Phaser.Scenes.Events.SHUTDOWN`:

```ts
export class GameScene extends Phaser.Scene {
  private stopSettings?: () => void;

  constructor(private app: App) {
    super('Game');
  }

  create() {
    centerSafeArea(this, gameConfig.width, gameConfig.height);
    this.app.setGameplay(true);

    this.stopSettings = this.app.listenSettings((settings) => {
      this.applyReducedMotion(settings.reducedMotion);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.app.setGameplay(false);
      this.stopSettings?.();
      this.stopSettings = undefined;
      this.time.removeAllEvents();
      this.tweens.killAll();
    });
  }

  private applyReducedMotion(_reduced: boolean) {
    // Pause decorative loops or disable screen shake when reduced is true.
  }
}
```

Checklist before leaving a scene:
- Stop or hand off scene-specific timers, tweens, and particle emitters.
- Unsubscribe `app.listenSettings`, `this.scale`, and `window`/`document` listeners.
- Stop or switch scene-specific music cleanly (`this.app.audio.stopMusic()` or `playMusic(nextKey)`).
- Reset transient input buffers (jump buffer, attack queue, drag state) so held inputs do not trigger immediately in the next scene.
