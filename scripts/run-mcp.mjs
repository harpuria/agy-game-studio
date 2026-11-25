#!/usr/bin/env node
// Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = await mkdtemp(join(tmpdir(), 'game-studio-mcp-'));
const executable = join(dir, process.platform === 'win32' ? 'studio.exe' : 'studio');
let child;
let stopping;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = signal;
    child?.kill(signal);
  });
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, options);
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 143)));
  });
}

try {
  const code = await run('go', ['build', '-mod=readonly', '-o', executable, '.'], {
    cwd: fileURLToPath(new URL('../mcp/', import.meta.url)),
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  process.exitCode = code || (stopping ? 1 : await run(executable, process.argv.slice(2), { stdio: 'inherit' }));
} catch (error) {
  console.error('Game Studio MCP launcher:', error.message);
  process.exitCode = 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}
