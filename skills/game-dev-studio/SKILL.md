---
name: game-dev-studio
description: >
  Opens the Game Dev Studio Playtest side panel in the Antigravity auxiliary
  pane (sidecar://agy-game-studio/studio/playtest) and connects it to a running
  Phaser Web template game. Use when the user wants to playtest a Phaser game
  inside Antigravity, pause and scrub the last 10 seconds of gameplay, annotate
  a visual bug on a frame, or attach a PNG frame or 10-second GIF replay with
  console logs to the conversation.
license: Apache-2.0
metadata:
  category: game-dev
  tags: "ui-extension, sidecar, playtest, phaser, bug-report, gamedev"
  version: "0.4.0"
---

# Game Dev Studio: Phaser Playtest panel

The **Game Dev Studio** sidecar shows a running Phaser game in the auxiliary pane, records the last **10 seconds (250 frames at 25 FPS)** in a DVR ring buffer, and sends annotated frames or GIF replays to the current conversation.

> [!IMPORTANT]
> The panel supports **Phaser Web** games only. For Godot Mobile or Godot PC games, run the scene in the Godot editor (**F5**) or with `godot --path .` and follow the validation steps in `godot-game`.

---

## When to surface the panel

- The user asks to playtest, reproduce, or show a visual bug in a Phaser game.
- You finished a gameplay or UI change and the user should check feel, timing, animation, or layout.
- Emit at most one pill per reply:

  ```markdown
  [Game Dev Studio](sidecar://agy-game-studio/studio/playtest)
  ```

The user can also open the panel with `/game-dev-studio` or **⋮ → Extensions → Game Dev Studio**.

---

## Connect a Phaser game

1. **Prepare the game**: In the Phaser game root, activate the Node version from `.nvmrc` (Node `22.12+`) and run `npm ci` if `node_modules/` is missing or stale.
2. **Start the capture server**: Keep the game root as the working directory and run the plugin's launcher with its absolute install path:

   ```bash
   node /path/to/agy-game-studio/scripts/playtest-phaser.mjs
   ```

   The script loads the game's own Vite config in `standalone` mode, binds to `127.0.0.1`, and injects the capture bridge (`server/services/phaser-bridge.js`) into `index.html`. It fails fast if `package.json` has no `phaser` dependency. Run it as a long-running background process and read the printed local URL and port.
3. **Connect the panel**: Surface the pill, ask the user to paste the printed URL into the panel, and click **▶ Connect to game**. Gameplay is live once the first frame arrives.
4. **Stop the server** when playtesting ends. Do not leave the Vite process running across tasks.

---

## Capture and report a bug

| Action | How | Result in chat |
| :--- | :--- | :--- |
| Pause and annotate | `F8` or `` ` `` | Freezes the game and opens drawing tools (boxes, arrows, notes) |
| Scrub | DVR slider while paused | Selects any frame from the last 10 seconds |
| **📸 Frame** | Button while paused | Annotated PNG of the selected frame plus game console logs |
| **🎞️ 10s GIF** | Button while paused | Animated GIF of the last 10 seconds at game resolution plus console logs |

When a report arrives:

1. Read the image or GIF, the user's note, and the console logs together.
2. Map the symptom to the responsible code (scene, entity, asset key, tween, physics body) before editing.
3. Fix it, run the game's checks (`npm run check`, plus `npm run test:e2e` for UI or input changes), and ask the user to replay the same scenario in the panel.

---

## Automated smoke test (plugin contributors)

With the Phaser template demo and Studio both running, verify connection, pause, annotation, PNG, and GIF delivery from the game root:

```bash
node /path/to/agy-game-studio/tests/phaser-playtest-smoke.mjs <studio-url> <game-url>
```

The script uses the game's Playwright installation and intercepts outgoing reports locally. Install its Chromium browser or set `CHROMIUM_PATH` to a local executable.

---

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `Run from the Phaser game directory after npm ci.` | Change to the game root (the folder with the `phaser` dependency) and run `npm ci`. |
| Panel stays black after **Connect to game** | Check the URL and port printed by the launcher, confirm the Vite process is still running, and reload the panel. |
| Panel does not open | Confirm **Game Dev Studio** is enabled in **Customizations → Installed**, then check `~/.gemini/antigravity/sidecar_data/agy-game-studio/studio/logs/sidecar.log`. |
| Keys do not reach the game | Click inside the game view so it has focus. While paused, `F8` and `` ` `` are captured by the panel. |
