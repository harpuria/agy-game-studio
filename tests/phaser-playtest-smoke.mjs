// End-to-end check of the Playtest panel: Run -> game frames -> pause -> annotate -> PNG and GIF reports.
//
//   node tests/phaser-playtest-smoke.mjs                    # Studio started here, bundled examples/phaser-demo
//   node tests/phaser-playtest-smoke.mjs --game <folder>    # another Phaser game folder (after npm ci)
//   node tests/phaser-playtest-smoke.mjs --game <url>       # a server started with scripts/playtest-phaser.mjs
//   node tests/phaser-playtest-smoke.mjs --studio <url>     # a Studio that is already running
//
// Uses Playwright from the plugin or the game (`npm ci`), or set CHROMIUM_PATH to a local Chromium.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));
const { values: args } = parseArgs({
  options: { studio: { type: 'string' }, game: { type: 'string' } },
});
const game = args.game ?? resolve(pluginRoot, 'examples/phaser-demo');
const gameIsUrl = /^https?:\/\//.test(game);

async function loadPlaywright() {
  const candidates = [resolve(pluginRoot, 'package.json'), gameIsUrl ? null : resolve(game, 'package.json')];
  for (const manifest of candidates.filter(Boolean)) {
    try {
      return createRequire(manifest)('playwright');
    } catch {
      // Try the next location.
    }
  }
  return import('playwright');
}

let studio;
let studioUrl = args.studio;
if (!studioUrl) {
  // A throwaway app data folder keeps the Studio's session lookup off the real Antigravity data.
  if (!process.env.ANTIGRAVITY_APP_DATA_DIR) {
    const appData = mkdtempSync(resolve(tmpdir(), 'playtest-smoke-'));
    mkdirSync(resolve(appData, 'brain'));
    process.env.ANTIGRAVITY_APP_DATA_DIR = appData;
  }
  const { startServer } = await import('../server/index.mjs');
  studio = await startServer({ port: 0, host: '127.0.0.1' });
  studioUrl = `http://127.0.0.1:${studio.port}/`;
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // Inspect the actual report payload while keeping smoke tests out of the user's conversation.
  await page.route('**/api/send-to-chat', route => route.fulfill({ json: { success: true } }));
  await page.goto(studioUrl);
  if (gameIsUrl) {
    await page.locator('#playtest-url-details summary').click();
    await page.locator('#playtest-url').fill(game);
  } else {
    await page.locator('#playtest-folder').fill(game);
  }
  await page.locator('#btn-ready-build').click();
  await page.waitForSelector('#btn-pause-toggle:enabled', { timeout: 90_000 });

  // Template games start from a #play button; the bundled demo starts at once.
  const frame = page.frameLocator('iframe.game-runner-iframe');
  await frame.locator('#play').click({ timeout: 2_000 }).catch(() => frame.locator('canvas').click());
  await page.waitForFunction(() => Number(document.querySelector('#dvr-scrubber-slider')?.max) >= 3);
  await page.locator('#btn-pause-toggle').click();
  await page.locator('[data-tool="box"]').click();
  const overlay = page.locator('#annotation-overlay-canvas');
  const bounds = await overlay.boundingBox();
  assert.ok(bounds?.width && bounds?.height);
  await page.mouse.move(bounds.x + bounds.width / 4, bounds.y + bounds.height / 4);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.up();
  assert.ok(await overlay.evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  }), 'annotation must draw onto the overlay');

  for (const [button, signature] of [['btn-send-bug-chat', '89504e470d0a1a0a'], ['btn-send-gif-chat', '474946383961']]) {
    const [request] = await Promise.all([
      page.waitForRequest(req => new URL(req.url()).pathname === '/api/send-to-chat'),
      page.locator('#' + button).click(),
    ]);
    const { image, filename } = request.postDataJSON();
    const bytes = Buffer.from(image.split(',')[1], 'base64');
    assert.ok(bytes.toString('hex', 0, signature.length / 2) === signature, filename);
    console.log(filename, bytes.length, 'bytes');
  }

  // The header's home button returns to the Run card and stops the game server it started.
  if (!gameIsUrl) {
    await page.locator('#btn-home-ready').click();
    await page.waitForFunction(async () => !(await (await fetch('/api/playtest/status')).json()).running);
  }
  console.log('Playtest smoke test passed');
} finally {
  await browser.close();
  if (studio) {
    const { stopPhaserPlaytest } = await import('../server/services/phaser-launcher.mjs');
    await stopPhaserPlaytest();
    await new Promise(done => studio.close(done));
  }
}
