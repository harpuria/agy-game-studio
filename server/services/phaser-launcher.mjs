// Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
// Starts scripts/playtest-phaser.mjs for a game folder so the panel can run a game in one click.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const LAUNCH_SCRIPT = fileURLToPath(new URL('../../scripts/playtest-phaser.mjs', import.meta.url));
const START_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 3_000;
const LOG_TAIL_LINES = 40;
const URL_LINE = /^PLAYTEST_URL=(http:\/\/127\.0\.0\.1:\d+\/?)\s*$/;

let current = null;

function launcherError(message, statusCode, detail = '') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.detail = detail;
  return err;
}

function hasPhaserDependency(dir) {
  const manifest = path.join(dir, 'package.json');
  if (!fs.existsSync(manifest)) return false;
  try {
    const { dependencies, devDependencies } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    return Boolean(dependencies?.phaser || devDependencies?.phaser);
  } catch {
    return false;
  }
}

/**
 * Returns the Phaser game folder for a workspace: the workspace itself, or its only
 * direct subfolder with a `phaser` dependency.
 */
export function findPhaserGameRoot(workspace) {
  const root = path.resolve(workspace);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw launcherError(`Game folder not found: ${root}`, 404);
  }
  if (hasPhaserDependency(root)) return root;

  const candidates = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .map((entry) => path.join(root, entry.name))
    .filter(hasPhaserDependency);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    throw launcherError(
      `Several Phaser games found in ${root}. Enter one of these folders: ${candidates.join(', ')}`,
      409
    );
  }
  throw launcherError(
    `No Phaser game found in ${root}. Choose the folder whose package.json depends on phaser.`,
    404
  );
}

function assertDependenciesInstalled(gameRoot) {
  try {
    createRequire(path.join(gameRoot, 'package.json')).resolve('vite');
  } catch {
    throw launcherError(
      `Dependencies are not installed in ${gameRoot}. Run "npm ci" in that folder, then press Run again.`,
      409
    );
  }
}

/**
 * Starts (or reuses) the Vite playtest server for a game folder and resolves with its URL.
 */
export async function startPhaserPlaytest(workspace, { timeoutMs = START_TIMEOUT_MS } = {}) {
  const gameRoot = findPhaserGameRoot(workspace);
  if (current && current.gameRoot === gameRoot && current.child.exitCode === null) {
    return { url: await current.ready, gameRoot, reused: true };
  }
  await stopPhaserPlaytest();
  assertDependenciesInstalled(gameRoot);

  const child = spawn(process.execPath, [LAUNCH_SCRIPT], {
    cwd: gameRoot,
    // The launcher exits when stdin closes, so the game server never outlives the sidecar.
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, GAME_STUDIO_EXIT_ON_STDIN_CLOSE: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const logs = [];
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(launcherError(`The game server did not start within ${timeoutMs / 1000}s.`, 504, logs.join('\n')));
    }, timeoutMs);
    const onLine = (line) => {
      const match = URL_LINE.exec(line);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
        return;
      }
      if (line.trim()) {
        logs.push(line);
        if (logs.length > LOG_TAIL_LINES) logs.shift();
      }
    };
    for (const stream of [child.stdout, child.stderr]) {
      let buffered = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        buffered += chunk;
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop();
        lines.forEach(onLine);
      });
    }
    child.once('error', (err) => {
      clearTimeout(timer);
      reject(launcherError(`Could not start the game server: ${err.message}`, 500));
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      reject(
        launcherError(
          `The game server exited before it was ready (${signal || `exit code ${code}`}).`,
          500,
          logs.join('\n')
        )
      );
    });
  });
  // Later exits are reported through status; avoid unhandled rejections once settled.
  ready.catch(() => {});
  child.once('exit', () => {
    if (current?.child === child) current = null;
  });
  current = { gameRoot, child, ready, logs, url: null };

  try {
    const url = await ready;
    if (current?.child === child) current.url = url;
    return { url, gameRoot, reused: false };
  } catch (err) {
    if (current?.child === child) await stopPhaserPlaytest();
    throw err;
  }
}

/** Stops the game server started by the panel, if any. */
export async function stopPhaserPlaytest() {
  const running = current;
  current = null;
  if (!running || running.child.exitCode !== null || running.child.signalCode !== null) {
    return { stopped: false };
  }
  const { child } = running;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, STOP_TIMEOUT_MS);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.stdin?.end();
    child.kill('SIGTERM');
  });
  return { stopped: true, gameRoot: running.gameRoot };
}

export function getPhaserPlaytestStatus() {
  if (!current || current.child.exitCode !== null) return { running: false };
  return { running: Boolean(current.url), gameRoot: current.gameRoot, url: current.url };
}

process.once('exit', () => {
  current?.child.kill('SIGTERM');
});
