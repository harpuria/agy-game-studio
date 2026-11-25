// Run from the Phaser template checkout with the game and Studio servers running.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [studioUrl, gameUrl] = process.argv.slice(2);
if (!studioUrl || !gameUrl) {
  throw new Error('Usage: node phaser-playtest-smoke.mjs <studio URL> <Phaser playtest URL>');
}
const { chromium } = createRequire(resolve('package.json'))('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // Inspect the actual report payload while keeping smoke tests out of the user's conversation.
  await page.route('**/api/send-to-chat', route => route.fulfill({ json: { success: true } }));
  await page.goto(studioUrl);
  await page.locator('#playtest-url').fill(gameUrl);
  await page.locator('#btn-ready-build').click();
  await page.waitForSelector('#btn-pause-toggle:enabled');

  const game = page.frameLocator('iframe.game-runner-iframe');
  await game.locator('#play').click();
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
} finally {
  await browser.close();
}
