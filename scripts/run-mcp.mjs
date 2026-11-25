#!/usr/bin/env node
// Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
//
// Starts the game-studio MCP server over stdio. The Go module is built once per source
// version into a user cache folder, so later starts skip the build (and need no Go toolchain).
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const mcpDir = fileURLToPath(new URL('../mcp/', import.meta.url));
const exeSuffix = process.platform === 'win32' ? '.exe' : '';
const STALE_TEMP_MS = 60 * 60 * 1000;

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

export function cacheRoot() {
  if (process.env.GAME_STUDIO_CACHE_DIR) return process.env.GAME_STUDIO_CACHE_DIR;
  const home = homedir();
  if (process.platform === 'darwin') return join(home, 'Library', 'Caches', 'agy-game-studio');
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'agy-game-studio', 'Cache');
  }
  return join(process.env.XDG_CACHE_HOME || join(home, '.cache'), 'agy-game-studio');
}

async function sourceFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'testdata' && !entry.name.startsWith('.')) files.push(...(await sourceFiles(path)));
    } else if (entry.isFile() && !entry.name.endsWith('_test.go')) {
      files.push(path);
    }
  }
  return files;
}

/** Hash of everything that goes into the binary: module sources, go.mod/go.sum and target platform. */
export async function sourceKey() {
  const hash = createHash('sha256').update(`${process.platform}-${process.arch}\0`);
  const files = (await sourceFiles(mcpDir))
    .map((file) => [relative(mcpDir, file).split(sep).join('/'), file])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [name, file] of files) {
    hash.update(name).update('\0').update(await readFile(file)).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function goBuild(output) {
  return run('go', ['build', '-mod=readonly', '-o', output, '.'], {
    cwd: mcpDir,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

// Remove binaries from older sources and builds abandoned by crashed launchers.
async function pruneCache(dir, keep) {
  for (const name of await readdir(dir).catch(() => [])) {
    if (!name.startsWith('studio-') || name === keep) continue;
    const path = join(dir, name);
    const isTemp = name.endsWith('.tmp');
    if (isTemp && Date.now() - (await stat(path).catch(() => ({ mtimeMs: Date.now() }))).mtimeMs < STALE_TEMP_MS) {
      continue;
    }
    await rm(path, { force: true }).catch(() => {});
  }
}

/** Returns the cached binary for the current sources, building it first if needed. */
export async function ensureCachedBinary() {
  const dir = join(cacheRoot(), 'mcp');
  const name = `studio-${await sourceKey()}${exeSuffix}`;
  const binary = join(dir, name);
  if (await exists(binary)) return { binary, built: false };

  await mkdir(dir, { recursive: true });
  // Build beside the final path and rename, so a concurrent start never runs a partial file.
  const temp = join(dir, `${name}.${process.pid}.tmp`);
  try {
    const code = await goBuild(temp);
    if (code !== 0) throw Object.assign(new Error(`go build exited with code ${code}`), { exitCode: code });
    await rename(temp, binary);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  await pruneCache(dir, name);
  return { binary, built: true };
}

async function runWithoutCache() {
  const dir = await mkdtemp(join(tmpdir(), 'game-studio-mcp-'));
  try {
    const binary = join(dir, `studio${exeSuffix}`);
    const code = await goBuild(binary);
    return code || (stopping ? 1 : await run(binary, process.argv.slice(2), { stdio: 'inherit' }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  let binary;
  try {
    ({ binary } = await ensureCachedBinary());
  } catch (error) {
    if (error.exitCode !== undefined) return error.exitCode;
    if (stopping) return 1;
    if (error.code === 'ENOENT' && error.path === 'go') throw error;
    // An unwritable cache folder should not stop the server: fall back to a throwaway build.
    console.error(`Game Studio MCP launcher: cache unavailable (${error.message}); building to a temporary folder.`);
    return runWithoutCache();
  }
  if (stopping) return 1;
  return run(binary, process.argv.slice(2), { stdio: 'inherit' });
}

// Run only when started as a script (also through a symlinked plugin folder), not when imported by tests.
function startedAsScript() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (startedAsScript()) {
  try {
    process.exitCode = await main();
  } catch (error) {
    const message =
      error.code === 'ENOENT' && error.path === 'go'
        ? 'Go toolchain not found. Install Go 1.26+ once to build the MCP server (see scripts/check_env.sh mcp).'
        : error.message;
    console.error('Game Studio MCP launcher:', message);
    process.exitCode = 1;
  }
}
