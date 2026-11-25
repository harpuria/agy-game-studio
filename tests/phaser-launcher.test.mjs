// Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findPhaserGameRoot,
  startPhaserPlaytest,
  stopPhaserPlaytest,
  getPhaserPlaytestStatus,
} from '../server/services/phaser-launcher.mjs';
import { startServer } from '../server/index.mjs';

const demo = fileURLToPath(new URL('../examples/phaser-demo/', import.meta.url));
const demoInstalled = fs.existsSync(path.join(demo, 'node_modules', 'vite'));

function writeGame(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { phaser: '4.2.1' } }));
}

describe('Phaser playtest launcher', () => {
  let root;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'phaser-launcher-test-'));
  });
  after(async () => {
    await stopPhaserPlaytest();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('uses the folder itself when it depends on phaser', () => {
    const game = path.join(root, 'direct');
    writeGame(game);
    assert.equal(findPhaserGameRoot(game), game);
  });

  it('finds a single Phaser game one folder down', () => {
    const workspace = path.join(root, 'single');
    writeGame(path.join(workspace, 'game'));
    fs.mkdirSync(path.join(workspace, 'node_modules', 'phaser'), { recursive: true });
    assert.equal(findPhaserGameRoot(workspace), path.join(workspace, 'game'));
  });

  it('asks for a folder when several games are found', () => {
    const workspace = path.join(root, 'several');
    writeGame(path.join(workspace, 'a'));
    writeGame(path.join(workspace, 'b'));
    assert.throws(() => findPhaserGameRoot(workspace), { statusCode: 409, message: /Several Phaser games/ });
  });

  it('reports folders without a Phaser game', () => {
    const workspace = path.join(root, 'none');
    fs.mkdirSync(workspace);
    assert.throws(() => findPhaserGameRoot(workspace), { statusCode: 404, message: /No Phaser game/ });
    assert.throws(() => findPhaserGameRoot(path.join(root, 'missing')), { statusCode: 404 });
  });

  it('asks for npm ci before starting a game without dependencies', async () => {
    const game = path.join(root, 'no-deps');
    writeGame(game);
    await assert.rejects(startPhaserPlaytest(game), { statusCode: 409, message: /npm ci/ });
    assert.equal(getPhaserPlaytestStatus().running, false);
  });

  it('starts, reuses and stops the bundled demo', { skip: !demoInstalled && 'run npm ci in examples/phaser-demo' }, async () => {
    const first = await startPhaserPlaytest(demo);
    assert.match(first.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal(first.reused, false);
    const html = await (await fetch(first.url)).text();
    assert.match(html, /playtest-runner-child/, 'the capture bridge is injected into index.html');

    const again = await startPhaserPlaytest(demo);
    assert.deepEqual(again, { ...first, reused: true });
    assert.equal(getPhaserPlaytestStatus().url, first.url);

    assert.equal((await stopPhaserPlaytest()).stopped, true);
    assert.equal(getPhaserPlaytestStatus().running, false);
    await assert.rejects(fetch(first.url));
  });
});

describe('Playtest launch routes', () => {
  let srv;
  let baseUrl;
  before(async () => {
    srv = await startServer({ port: 0, host: '127.0.0.1' });
    baseUrl = `http://127.0.0.1:${srv.port}`;
  });
  after(() => new Promise((done) => srv.close(done)));

  it('refuses requests that are not JSON', async () => {
    const res = await fetch(`${baseUrl}/api/playtest/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ gameDir: demo }),
    });
    assert.equal(res.status, 415);
  });

  it('returns the launcher error and status', async () => {
    const res = await fetch(`${baseUrl}/api/playtest/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameDir: path.join(os.tmpdir(), 'no-such-game-folder') }),
    });
    assert.equal(res.status, 404);
    assert.match((await res.json()).error, /Game folder not found/);
    assert.deepEqual(await (await fetch(`${baseUrl}/api/playtest/status`)).json(), { running: false });
  });
});
