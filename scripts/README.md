# Development commands

Run `scripts/check_env.sh studio` for the panel runtime. Use `mcp` for the asset server, `phaser` for the web template, or `godot` for the native templates. Set `GODOT` to select an engine outside PATH.

Antigravity starts `node scripts/run-mcp.mjs` from the plugin installation. It builds the Go module with its declared dependencies once per source version into the user cache (`~/Library/Caches/agy-game-studio/mcp/` on macOS, or `GAME_STUDIO_CACHE_DIR`), removes builds of older sources, and runs the cached binary over stdio. If the cache folder cannot be written, it builds to a temporary folder instead. Asset paths supplied to the tools can be absolute.

The panel's **Run game** button starts `scripts/playtest-phaser.mjs` through `server/services/phaser-launcher.mjs` and connects to the `PLAYTEST_URL=` line it prints. The game folder needs `npm ci` first. The launcher exits when the panel stops it or the sidecar closes its stdin. You can still run `node /path/to/agy-game-studio/scripts/playtest-phaser.mjs` from a game root by hand and paste the printed URL into the panel.

`node tests/phaser-playtest-smoke.mjs` checks Run, frames, pause, annotation, PNG and GIF against `examples/phaser-demo` (run `npm ci` there first). Pass `--game <folder or URL>` for another game and `--studio <url>` for a running Studio. Reports are intercepted locally. It needs Playwright; set `CHROMIUM_PATH` to use another Chromium.
