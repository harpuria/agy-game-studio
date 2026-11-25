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
2. **Run it from the panel**: Surface the pill and ask the user to press **▶ Run game**. The **Game folder** field starts with the workspace; if the game is not the workspace root or its only direct subfolder with a `phaser` dependency, tell the user which folder to enter. The sidecar starts `scripts/playtest-phaser.mjs` (the game's own Vite config in `standalone` mode on `127.0.0.1`, with the capture bridge `server/services/phaser-bridge.js` injected) and connects once the first frame arrives. Do not start a separate Vite server yourself for this.
3. **Launch failures** arrive through **🚨 Send Game Error to Chat** with the server output. Fix the cause (usually `npm ci`, a wrong folder, or a Vite config error) and ask the user to press **Try again**.
4. **Stopping**: The 🕹️ button in the panel header returns to the Run card and stops the game server. It also stops when the plugin is disabled or Antigravity quits.

**Manual fallback**: If the user prefers a terminal, run `node /path/to/agy-game-studio/scripts/playtest-phaser.mjs` from the game root as a background process, then have them expand **Connect to a server you started yourself** and paste the printed URL. Stop that process when playtesting ends.

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

From the plugin root, verify Run, frames, pause, annotation, PNG and GIF delivery, and stopping against the bundled demo:

```bash
(cd examples/phaser-demo && npm ci)
node tests/phaser-playtest-smoke.mjs
```

Pass `--game <folder or URL>` for another game or `--studio <url>` for a running Studio. Reports are intercepted locally. It needs Playwright; set `CHROMIUM_PATH` to use another Chromium.

---

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `Dependencies are not installed in …` | Run `npm ci` in that game folder, then **Try again**. |
| `No Phaser game found` / `Several Phaser games found` | Enter the folder whose `package.json` depends on `phaser` in **Game folder**. |
| `The game server exited before it was ready` | Read the server output in the error card (often a Vite config or syntax error), fix it, then **Try again**. |
| Panel stays black after **Run game** | Confirm the game draws to a `<canvas>` and reload the panel. For a manual server, check the printed URL and that the process is still running. |
| Panel does not open | Confirm **Game Dev Studio** is enabled in **Customizations → Installed**, then check `~/.gemini/antigravity/sidecar_data/agy-game-studio/studio/logs/sidecar.log`. |
| Keys do not reach the game | Click inside the game view so it has focus. While paused, `F8` and `` ` `` are captured by the panel. |
