// Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const launcher = fileURLToPath(new URL('../scripts/run-mcp.mjs', import.meta.url));
const hasGo = spawnSync('go', ['version']).status === 0;

// Starts the launcher, completes the MCP handshake and returns the tool names.
function listTools(cacheDir, script = launcher) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, GAME_STUDIO_CACHE_DIR: cacheDir },
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    const timer = setTimeout(() => child.kill(), 120_000);
    let buffered = '';
    const send = (message) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
    child.stdout.on('data', (chunk) => {
      buffered += chunk;
      const lines = buffered.split('\n');
      buffered = lines.pop();
      for (const line of lines) {
        const message = JSON.parse(line);
        if (message.id === 1) {
          send({ method: 'notifications/initialized' });
          send({ id: 2, method: 'tools/list' });
        } else if (message.id === 2) {
          clearTimeout(timer);
          child.stdin.end();
          resolve(message.result.tools.map((tool) => tool.name));
        }
      }
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`MCP launcher exited with ${code} before listing tools`));
    });
    send({
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    });
  });
}

describe('MCP launcher build cache', { skip: !hasGo && 'Go toolchain not installed' }, () => {
  let root;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-mcp-test-'));
  });
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it('builds once, reuses the binary and removes builds of older sources', async () => {
    const cacheDir = path.join(root, 'cache');
    fs.mkdirSync(path.join(cacheDir, 'mcp'), { recursive: true });
    const stale = path.join(cacheDir, 'mcp', 'studio-0000000000000000');
    fs.writeFileSync(stale, '');

    const tools = await listTools(cacheDir);
    assert.equal(tools.length, 10);
    assert.ok(tools.includes('sprite_compile'));
    const cached = fs.readdirSync(path.join(cacheDir, 'mcp'));
    assert.equal(cached.length, 1, `one cached binary, found ${cached.join(', ')}`);
    assert.match(cached[0], /^studio-[0-9a-f]{16}(\.exe)?$/);
    const binary = path.join(cacheDir, 'mcp', cached[0]);
    const builtAt = fs.statSync(binary).mtimeMs;

    assert.equal((await listTools(cacheDir)).length, 10);
    assert.equal(fs.statSync(binary).mtimeMs, builtAt, 'second start reuses the cached binary');
  });

  it('starts through a symlinked plugin folder', async () => {
    const link = path.join(root, 'linked-plugin');
    fs.symlinkSync(fileURLToPath(new URL('..', import.meta.url)), link);
    const tools = await listTools(path.join(root, 'cache'), path.join(link, 'scripts', 'run-mcp.mjs'));
    assert.equal(tools.length, 10);
  });

  it('falls back to a temporary build when the cache folder cannot be created', async () => {
    const file = path.join(root, 'not-a-folder');
    fs.writeFileSync(file, '');
    assert.equal((await listTools(path.join(file, 'cache'))).length, 10);
  });
});
