// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { startServer } from '../server/index.mjs';

describe('Playtest Studio Sidecar Server Integration Tests', () => {
  let srv;
  let baseUrl;
  let tempRootDir;
  let fakeAppDataDir;
  let fakeBrainDir;
  let testSessionId;
  let testSessionDir;
  let mockAgentApiPath;
  let agentApiCaptureFile;

  before(async () => {
    tempRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playtest-server-test-'));
    fakeAppDataDir = path.join(tempRootDir, 'antigravity');
    fakeBrainDir = path.join(fakeAppDataDir, 'brain');
    testSessionId = 'test-session-12345678';
    testSessionDir = path.join(fakeBrainDir, testSessionId);
    fs.mkdirSync(testSessionDir, { recursive: true });

    // Create a mock agentapi executable that records its CLI arguments to a JSON file
    agentApiCaptureFile = path.join(tempRootDir, 'agentapi-capture.json');
    mockAgentApiPath = path.join(tempRootDir, 'mock-agentapi.sh');
    const scriptContent = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.writeFileSync(${JSON.stringify(agentApiCaptureFile)}, JSON.stringify({ args }, null, 2));
process.stdout.write('ok\\n');
`;
    fs.writeFileSync(mockAgentApiPath, scriptContent, { mode: 0o755 });

    process.env.ANTIGRAVITY_APP_DATA_DIR = fakeAppDataDir;
    process.env.AGENTAPI_BIN = mockAgentApiPath;
    process.env.PLAYTEST_WORKSPACE = tempRootDir;

    srv = await startServer({ port: 0, host: '127.0.0.1' });
    baseUrl = `http://127.0.0.1:${srv.port}`;
  });

  after(async () => {
    if (srv) {
      await new Promise((resolve) => srv.close(resolve));
    }
    if (tempRootDir && fs.existsSync(tempRootDir)) {
      fs.rmSync(tempRootDir, { recursive: true, force: true });
    }
  });

  it('GET /api/health and GET /api/sessions return expected structure and CORS headers', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.headers.get('access-control-allow-origin'), '*');
    assert.equal(healthRes.headers.get('access-control-allow-private-network'), 'true');

    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.port, srv.port);
    assert.equal(health.host, '127.0.0.1');
    assert.equal(health.activeSessionId, testSessionId);
    assert.equal(health.defaultWorkspace, fs.realpathSync(tempRootDir).startsWith('/private') ? path.resolve(tempRootDir) : tempRootDir);

    const sessionsRes = await fetch(`${baseUrl}/api/sessions`);
    assert.equal(sessionsRes.status, 200);
    const sessionsData = await sessionsRes.json();
    assert.ok(Array.isArray(sessionsData.sessions));
    assert.equal(sessionsData.sessions.length, 1);
    assert.equal(sessionsData.sessions[0].id, testSessionId);

    const activeRes = await fetch(`${baseUrl}/api/session/active`);
    assert.equal(activeRes.status, 200);
    const activeData = await activeRes.json();
    assert.equal(activeData.sessionId, testSessionId);
  });

  it('resolves the host workspace URI for game reports', async () => {
    const response = await fetch(`${baseUrl}/api/workspace/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceUri: pathToFileURL(tempRootDir).href }),
    });
    assert.deepEqual(await response.json(), { workspace: tempRootDir });
  });

  it('POST /api/send-to-chat rejects path traversal and saves valid annotated screenshot + console logs via agentapi', async () => {
    // 1. Reject path traversal in filename
    const traversalRes = await fetch(`${baseUrl}/api/send-to-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: testSessionId,
        filename: '../evil.png',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      }),
    });
    assert.equal(traversalRes.status, 400);

    // 2. Valid annotated screenshot with note, metadata, and consoleLogs
    const samplePngBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const validRes = await fetch(`${baseUrl}/api/send-to-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: testSessionId,
        filename: 'hitbox-bug.png',
        image: samplePngBase64,
        note: 'Player clips through right platform corner',
        metadata: {
          workspace: '/path/to/game',
          pkg: './cmd/game',
          frameOffset: '-1.5s',
          resolution: '640x480',
        },
        consoleLogs: ['[Phaser] frame=120 collision=false', 'panic: nil bounds'],
      }),
    });

    assert.equal(validRes.status, 200);
    const validData = await validRes.json();
    assert.equal(validData.success, true);
    assert.equal(validData.mode, 'screenshot');
    assert.equal(validData.filename, 'hitbox-bug.png');
    assert.ok(fs.existsSync(validData.filePath), 'Saved PNG file must exist in session brain dir');

    const captured = JSON.parse(fs.readFileSync(agentApiCaptureFile, 'utf-8'));
    assert.equal(captured.args[0], 'send-message');
    assert.equal(captured.args[1], '--title=Playtest Bug: hitbox-bug.png');
    assert.equal(captured.args[2], testSessionId);
    assert.ok(captured.args[3].includes('![hitbox-bug.png]('));
    assert.ok(captured.args[3].includes('**Bug Note**: Player clips through right platform corner'));
    assert.ok(captured.args[3].includes('### Captured Game Console'));
    assert.ok(captured.args[3].includes('panic: nil bounds'));

    // 3. Valid buildError payload
    const buildErrRes = await fetch(`${baseUrl}/api/send-to-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: testSessionId,
        workspace: '/path/to/game',
        pkg: './cmd/game',
        note: 'Game scene failed',
        buildError: 'Uncaught TypeError in game scene',
      }),
    });

    assert.equal(buildErrRes.status, 200);
    const buildErrData = await buildErrRes.json();
    assert.equal(buildErrData.success, true);
    assert.equal(buildErrData.mode, 'build-error');

    const capturedErr = JSON.parse(fs.readFileSync(agentApiCaptureFile, 'utf-8'));
    assert.equal(capturedErr.args[0], 'send-message');
    assert.equal(capturedErr.args[1], '--title=Phaser Playtest Error');
    assert.equal(capturedErr.args[2], testSessionId);
    assert.ok(capturedErr.args[3].includes('### 🚨 Phaser Playtest Error'));
    assert.ok(capturedErr.args[3].includes('Uncaught TypeError in game scene'));

    // 4. Valid studioError payload (from "💬 Send to Agent" button on error toast)
    const studioErrRes = await fetch(`${baseUrl}/api/send-to-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: testSessionId,
        workspace: '/path/to/game',
        errorTitle: 'DSL Compile Error',
        studioError: 'open sprite sheet "minotaur_boss.png": no such file or directory',
        metadata: {
          workspace: '/path/to/game',
          tab: 'Sprites',
          filePath: '/path/to/game/minotaur_boss.sprite',
        },
      }),
    });

    assert.equal(studioErrRes.status, 200);
    const studioErrData = await studioErrRes.json();
    assert.equal(studioErrData.success, true);
    assert.equal(studioErrData.mode, 'studio-error');

    const capturedStudioErr = JSON.parse(fs.readFileSync(agentApiCaptureFile, 'utf-8'));
    assert.equal(capturedStudioErr.args[0], 'send-message');
    assert.equal(capturedStudioErr.args[1], '--title=Studio Error: DSL Compile Error');
    assert.equal(capturedStudioErr.args[2], testSessionId);
    assert.ok(capturedStudioErr.args[3].includes('### ⚠️ Game Dev Studio Error: DSL Compile Error'));
    assert.ok(capturedStudioErr.args[3].includes('**Tab**: `Sprites`'));
    assert.ok(capturedStudioErr.args[3].includes('minotaur_boss.sprite'));
    assert.ok(capturedStudioErr.args[3].includes('open sprite sheet "minotaur_boss.png"'));

    // 4. Valid 5s DVR Animated GIF (.gif) payload
    const sampleGifBase64 =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const gifRes = await fetch(`${baseUrl}/api/send-to-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: testSessionId,
        filename: 'playtest-dvr-replay.gif',
        image: sampleGifBase64,
        note: '5s DVR replay showing enemy teleporting through wall',
        metadata: {
          workspace: '/path/to/game',
          pkg: './cmd/game',
          frameOffset: '5.0s DVR GIF (75 frames, ending at live (0.0s))',
          resolution: '480x270 (from 640x360)',
        },
      }),
    });

    assert.equal(gifRes.status, 200);
    const gifData = await gifRes.json();
    assert.equal(gifData.success, true);
    assert.equal(gifData.mode, 'screenshot');
    assert.equal(gifData.filename, 'playtest-dvr-replay.gif');
    assert.ok(fs.existsSync(gifData.filePath), 'Saved GIF file must exist in session brain dir');
  });
});

