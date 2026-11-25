# Development commands

Run `scripts/check_env.sh studio` for the panel runtime. Use `mcp` for the asset server, `phaser` for the web template, or `godot` for the native templates. Set `GODOT` to select an engine outside PATH.

Antigravity starts `node scripts/run-mcp.mjs` from the plugin installation. It builds the Go module with its declared dependencies and runs it over stdio. Asset paths supplied to the tools can be absolute.

To connect a Phaser game to the panel, switch to its root, install dependencies with `npm ci` and run `node /path/to/agy-game-studio/scripts/playtest-phaser.mjs`. Use the printed local URL in the panel. Stop the Vite process after playtesting.

With the Phaser template demo and Studio running, test the actual game, pause control, annotation, PNG and GIF from the game root with `node /path/to/agy-game-studio/tests/phaser-playtest-smoke.mjs <studio-url> <game-url>`. The script uses the game's Playwright and intercepts outgoing reports locally. Install its Chromium browser or set `CHROMIUM_PATH` to a local executable.
