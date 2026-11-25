// Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
// Runs the procedural examples in the skills through the real game-studio MCP tools, so an
// agent that copies an example gets a passing asset instead of a validation error.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const launcher = path.join(root, 'scripts', 'run-mcp.mjs');
const hasGo = spawnSync('go', ['version']).status === 0;

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const blocks = (text, lang) => [...text.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);
const PATH_KEY = /^(filePath|filePaths|baseDir|jsonPath|inputImages|out\w*(Path|Dir))$/;

describe('skill examples', () => {
  it('pass only absolute (<GAME_ROOT>) paths to the tools', () => {
    const skillsDir = path.join(root, 'skills');
    const files = fs.readdirSync(skillsDir).flatMap((skill) => {
      const dir = path.join(skillsDir, skill);
      const refs = fs.existsSync(path.join(dir, 'references')) ? fs.readdirSync(path.join(dir, 'references')).map((f) => path.join('references', f)) : [];
      return ['SKILL.md', ...refs].map((f) => path.join('skills', skill, f)).filter((f) => f.endsWith('.md') && fs.existsSync(path.join(root, f)));
    });
    const relative = [];
    for (const file of files) {
      for (const block of blocks(read(file), 'json')) {
        let call;
        try {
          call = JSON.parse(block);
        } catch {
          continue;
        }
        for (const [key, value] of Object.entries(call.arguments ?? {})) {
          if (!PATH_KEY.test(key)) continue;
          for (const p of [value].flat()) {
            if (typeof p === 'string' && !p.startsWith('<GAME_ROOT>/') && !path.isAbsolute(p)) relative.push(`${file}: ${key}=${p}`);
          }
        }
      }
    }
    assert.deepEqual(relative, []);
  });
});

describe('procedural skill examples through MCP', { skip: !hasGo && 'Go toolchain not installed' }, () => {
  let gameRoot;
  let child;
  let call;

  before(async () => {
    gameRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-examples-'));
    child = spawn(process.execPath, [launcher], { stdio: ['pipe', 'pipe', 'inherit'] });
    const pending = new Map();
    let buffered = '';
    let nextId = 0;
    child.stdout.on('data', (chunk) => {
      buffered += chunk;
      const lines = buffered.split('\n');
      buffered = lines.pop();
      for (const line of lines) {
        const message = JSON.parse(line);
        pending.get(message.id)?.(message);
      }
    });
    const rpc = (method, params) =>
      new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    call = async (name, args) => {
      const json = JSON.stringify(args).replaceAll('<GAME_ROOT>', gameRoot);
      const message = await rpc('tools/call', { name, arguments: JSON.parse(json) });
      assert.ok(!message.result?.isError, `${name} failed: ${JSON.stringify(message.result ?? message.error)}`);
      return message.result.structuredContent;
    };
  });

  after(() => {
    child?.stdin.end();
    fs.rmSync(gameRoot, { recursive: true, force: true });
  });

  it('procedural-music quick-start validates and synthesizes', async () => {
    const skill = read('skills/procedural-music/SKILL.md');
    const score = path.join(gameRoot, 'art', 'music', 'stage1.music');
    fs.mkdirSync(path.dirname(score), { recursive: true });
    fs.writeFileSync(score, blocks(skill, 'text')[0]);
    const calls = blocks(skill, 'json').map((b) => JSON.parse(b)).filter((c) => c.tool?.startsWith('music_'));
    assert.deepEqual(calls.map((c) => c.tool), ['music_validate', 'music_synthesize']);
    for (const { tool, arguments: args } of calls) {
      const report = await call(tool, args);
      assert.equal(report.passed, true, `${tool}: ${JSON.stringify(report.issues)}`);
    }
    assert.ok(fs.statSync(path.join(gameRoot, 'public', 'assets', 'audio', 'stage1.wav')).size > 0);
  });

  it('procedural-sfx example synthesizes', async () => {
    const [example] = blocks(read('skills/procedural-sfx/SKILL.md'), 'json').map((b) => JSON.parse(b));
    const report = await call(example.tool, example.arguments);
    assert.equal(report.passed, true, JSON.stringify(report.issues));
    assert.ok(fs.existsSync(path.join(gameRoot, 'public', 'assets', 'audio', 'explosion.wav')));
  });

  it('sprite-design procedural example compiles with standard animation tags', async () => {
    const dsl = blocks(read('skills/sprite-design/SKILL.md'), 'text').find((b) => b.includes('\npart '));
    const out = path.join(gameRoot, 'public', 'assets', 'sprites');
    const report = await call('sprite_compile', { dsl, outPngPath: path.join(out, 'slime.png'), outJsonPath: path.join(out, 'slime.json') });
    assert.equal(report.passed, true, JSON.stringify(report.issues));
    const [tag] = JSON.parse(fs.readFileSync(path.join(out, 'slime.json'), 'utf8')).meta.frameTags;
    assert.deepEqual({ from: tag.from, to: tag.to, direction: tag.direction }, { from: 0, to: 3, direction: 'forward' });
  });
});
