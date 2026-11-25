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

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '..');
const distPath = path.join(pluginRoot, 'dist');
const STARTED_AT = Date.now();

const SESSION_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const SEND_TO_CHAT_FILENAME_REGEX = /^[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|webp|gif)$/i;
const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024; // 2MB default
const MAX_CHAT_BODY_BYTES = 25 * 1024 * 1024; // 25MB for annotated screenshots
const AGENTAPI_TIMEOUT_MS = 15_000; // 15 seconds

let activeServerPort = null;

function createHttpError(message, statusCode, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

export function getDefaultWorkspace() {
  if (process.env.PLAYTEST_WORKSPACE && process.env.PLAYTEST_WORKSPACE.trim()) {
    return path.resolve(expandTildeAndUri(process.env.PLAYTEST_WORKSPACE));
  }
  const cwd = path.resolve(process.cwd());
  const sidecarDir = path.join(pluginRoot, 'sidecars', 'studio');
  if (cwd === sidecarDir) {
    return pluginRoot;
  }
  return cwd;
}

export function resolveWorkspaceInfo(input) {
  return { workspace: input ? path.resolve(expandTildeAndUri(input)) : getDefaultWorkspace() };
}

// Determine Antigravity app data directory portably with fail-fast validation
export function getAppDataDir() {
  if (process.env.ANTIGRAVITY_APP_DATA_DIR) {
    const envDir = process.env.ANTIGRAVITY_APP_DATA_DIR.trim();
    if (!fs.existsSync(envDir)) {
      throw createHttpError(
        `Configured ANTIGRAVITY_APP_DATA_DIR does not exist: "${envDir}"`,
        500
      );
    }
    return path.resolve(envDir);
  }

  // If ANTIGRAVITY_EXECUTABLE_DATA_DIR is set by Antigravity (<app data dir>/sidecar_data/<plugin>/<sidecar>/data),
  // walk up 4 levels to <app data dir> if it contains brain/.
  if (process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR) {
    const candidateFromExec = path.resolve(
      process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR,
      '..',
      '..',
      '..',
      '..'
    );
    if (fs.existsSync(path.join(candidateFromExec, 'brain'))) {
      return candidateFromExec;
    }
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, '.gemini', 'antigravity'),
    path.join(home, 'Library', 'Application Support', 'Antigravity'),
    path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Antigravity'),
    path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'Antigravity'),
    path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Antigravity'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const geminiRoot = path.join(home, '.gemini');
  if (fs.existsSync(geminiRoot)) {
    const entries = fs.readdirSync(geminiRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const candidateDir = path.join(geminiRoot, entry.name);
        if (fs.existsSync(path.join(candidateDir, 'brain'))) {
          return candidateDir;
        }
      }
    }
  }

  throw createHttpError(
    `Antigravity app data directory not found. Set ANTIGRAVITY_APP_DATA_DIR to a valid directory.`,
    500
  );
}

export function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !SESSION_ID_REGEX.test(sessionId)) {
    throw createHttpError(
      `Invalid or missing session_id: "${sessionId}". Must match ${SESSION_ID_REGEX}.`,
      400
    );
  }
  return sessionId;
}

// Resolve session brain directory with strict existence check (fail-fast 404 for unknown sessions)
export function resolveSessionBrainDir(sessionId) {
  validateSessionId(sessionId);
  const appDataDir = getAppDataDir();
  const brainDir = path.join(appDataDir, 'brain');
  const sessionDir = path.join(brainDir, sessionId);

  if (sessionId === 'standalone') {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
  }

  if (!fs.existsSync(sessionDir) || !fs.statSync(sessionDir).isDirectory()) {
    throw createHttpError(
      `Session brain directory not found for session_id "${sessionId}" at "${sessionDir}".`,
      404
    );
  }

  return sessionDir;
}

// Discover recent Antigravity session IDs from brain directories
export function getRecentSessions() {
  const appData = getAppDataDir();
  const brainDir = path.join(appData, 'brain');
  if (!fs.existsSync(brainDir)) {
    return [];
  }

  const entries = fs.readdirSync(brainDir, { withFileTypes: true });
  const list = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'tempmediaStorage') {
      continue;
    }
    const id = entry.name;
    if (!SESSION_ID_REGEX.test(id)) {
      continue;
    }
    const sessionPath = path.join(brainDir, id);
    const transcriptPath = path.join(sessionPath, '.system_generated', 'logs', 'transcript.jsonl');
    const targetPath = fs.existsSync(transcriptPath) ? transcriptPath : sessionPath;
    const stat = fs.statSync(targetPath);
    list.push({
      id,
      title: `Session ${id.slice(0, 8)}`,
      updatedAt: new Date(stat.mtimeMs).toISOString(),
      mtimeMs: stat.mtimeMs,
    });
  }

  list.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return list.slice(0, 20).map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
}

export function getActiveSessionId() {
  const recent = getRecentSessions();
  if (process.env.ANTIGRAVITY_CONVERSATION_ID) {
    const envConv = process.env.ANTIGRAVITY_CONVERSATION_ID.trim();
    if (recent.some((s) => s.id === envConv)) {
      return envConv;
    }
  }
  return recent.length > 0 ? recent[0].id : null;
}

export function getConfig() {
  const rawPort =
    process.env.ANTIGRAVITY_SIDECAR_WEB_PORT !== undefined
      ? String(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT).trim()
      : process.env.PORT !== undefined
      ? String(process.env.PORT).trim()
      : '7789';
  const port = Number.parseInt(rawPort, 10);
  if (
    Number.isNaN(port) ||
    (port !== 0 && (port < 1024 || port > 65535)) ||
    String(port) !== rawPort
  ) {
    throw new Error(
      `Invalid port environment variable: "${rawPort}". Must be 0 (ephemeral) or an integer between 1024 and 65535.`
    );
  }

  return {
    port,
    host: process.env.HOST || '127.0.0.1',
  };
}

export const readConfig = getConfig;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.psd': 'image/vnd.adobe.photoshop',
  '.music': 'text/plain; charset=utf-8',
  '.sfx': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.sprite': 'text/plain; charset=utf-8',
  '.aseprite': 'application/octet-stream',
  '.ase': 'application/octet-stream',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

function expandTildeAndUri(rawPath) {
  const homeDir = os.homedir();
  const trimmed = String(rawPath || '').trim();
  if (trimmed === '~') return homeDir;
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(homeDir, trimmed.slice(2));
  }
  if (trimmed.startsWith('file://')) {
    return fileURLToPath(trimmed);
  }
  return trimmed;
}

// Parse JSON request body with strict byte-limit enforcement before buffering
export function parseJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytesRead = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      const chunkBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      bytesRead += chunkBuf.length;
      if (bytesRead > maxBytes) {
        aborted = true;
        req.destroy();
        reject(
          createHttpError(
            `Payload Too Large: request body exceeds limit of ${maxBytes} bytes.`,
            413
          )
        );
        return;
      }
      chunks.push(chunkBuf);
    });

    req.on('end', () => {
      if (aborted) return;
      if (bytesRead === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks, bytesRead).toString('utf-8');
        if (!raw.trim()) {
          resolve({});
        } else {
          resolve(JSON.parse(raw));
        }
      } catch (err) {
        reject(createHttpError(`Malformed JSON request body: ${err.message}`, 400));
      }
    });

    req.on('error', (err) => {
      if (aborted) return;
      reject(err);
    });
  });
}

function getAgentApiExecutable() {
  if (process.env.AGENTAPI_BIN) {
    const customBin = process.env.AGENTAPI_BIN.trim();
    if (!fs.existsSync(customBin)) {
      throw createHttpError(
        `Configured AGENTAPI_BIN executable not found at "${customBin}".`,
        500
      );
    }
    return { file: customBin, prefixArgs: [] };
  }

  if (process.env.ANTIGRAVITY_AGENTAPI_EXE) {
    const exe = process.env.ANTIGRAVITY_AGENTAPI_EXE.trim();
    if (fs.existsSync(exe)) {
      return { file: exe, prefixArgs: ['agentapi'] };
    }
  }

  const appDataDir = getAppDataDir();
  const binaryName = process.platform === 'win32' ? 'agentapi.exe' : 'agentapi';
  const binPath = path.join(appDataDir, 'bin', binaryName);
  if (fs.existsSync(binPath)) {
    return { file: binPath, prefixArgs: [] };
  }

  return { file: binaryName, prefixArgs: [] };
}

function spawnAgentApiSendMessage(title, sessionId, messageContent) {
  const { file, prefixArgs } = getAgentApiExecutable();
  return new Promise((resolve, reject) => {
    const proc = spawn(
      file,
      [...prefixArgs, 'send-message', `--title=${title}`, sessionId, messageContent],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
      reject(
        createHttpError(
          `agentapi send-message timed out after ${AGENTAPI_TIMEOUT_MS}ms.`,
          504
        )
      );
    }, AGENTAPI_TIMEOUT_MS);

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          createHttpError(
            `agentapi send-message failed with exit code ${code}: ${stderr || stdout}`,
            502
          )
        );
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (timedOut) return;
      reject(
        createHttpError(
          `Failed to execute agentapi binary "${file}": ${err.message}`,
          500
        )
      );
    });
  });
}

async function deliverMessageToChat(sidecarApp, sessionId, title, messageContent) {
  if (process.env.AGENTAPI_BIN || !sidecarApp) {
    await spawnAgentApiSendMessage(title, sessionId, messageContent);
    return;
  }

  let projectId = '';
  try {
    const metaData = sidecarApp.getConversationMetadata(sessionId);
    const metaEvent =
      metaData?.response?.conversationMetadata || metaData?.response?.conversation_metadata;
    projectId = metaEvent?.metadata?.projectId || metaEvent?.metadata?.project_id || '';
  } catch {
    // Proceed with default projectId if metadata lookup is unavailable
  }

  sidecarApp.sendMessage(sessionId, messageContent, {
    title,
    ...(projectId ? { projectId } : {}),
  });
}

export async function processSendToChat(body, sidecarApp = null) {
  const sessionId = body.session_id || body.sessionId || getActiveSessionId() || 'standalone';
  const { filename, note, consoleLogs, metadata, buildError, workspace, pkg } = body;
  const image = body.image ?? body.data;

  const sessionDir = resolveSessionBrainDir(sessionId);
  const realSessionDir = fs.realpathSync(sessionDir);

  if (filename !== undefined && filename !== null) {
    if (typeof filename !== 'string' || !SEND_TO_CHAT_FILENAME_REGEX.test(filename)) {
      throw createHttpError(
        `Invalid filename "${filename}" in send-to-chat request. Must match ${SEND_TO_CHAT_FILENAME_REGEX}.`,
        400
      );
    }
  }

  // Payload (B): Playtest error
  if (typeof buildError === 'string' && buildError.trim().length > 0) {
    const metaObj = metadata && typeof metadata === 'object' ? metadata : {};
    const effectiveWorkspace = workspace || metaObj.workspace || getDefaultWorkspace();
    const effectivePkg = pkg || metaObj.pkg || metaObj.package;

    const lines = [
      '### 🚨 Phaser Playtest Error',
      '',
      `**Workspace**: \`${effectiveWorkspace}\`${effectivePkg ? ` | **Package**: \`${effectivePkg}\`` : ''}`,
    ];

    if (typeof note === 'string' && note.trim()) {
      lines.push('', `**Note**: ${note.trim()}`);
    }

    lines.push('', '```text', buildError.trim(), '```');
    const messageContent = lines.join('\n');

    await deliverMessageToChat(
      sidecarApp,
      sessionId,
      'Phaser Playtest Error',
      messageContent
    );

    return {
      success: true,
      mode: 'build-error',
    };
  }

  // Payload (C): Studio UI / DSL / Synthesis Error
  if (typeof body.studioError === 'string' && body.studioError.trim().length > 0) {
    const metaObj = metadata && typeof metadata === 'object' ? metadata : {};
    const effectiveWorkspace = workspace || metaObj.workspace || getDefaultWorkspace();
    const errorTitle =
      typeof body.errorTitle === 'string' && body.errorTitle.trim()
        ? body.errorTitle.trim()
        : 'Game Dev Studio Error';
    const activeTab = typeof metaObj.tab === 'string' && metaObj.tab.trim() ? metaObj.tab.trim() : '';
    const activeFile =
      typeof metaObj.filePath === 'string' && metaObj.filePath.trim()
        ? metaObj.filePath.trim()
        : '';

    const contextParts = [`**Workspace**: \`${effectiveWorkspace}\``];
    if (activeTab) contextParts.push(`**Tab**: \`${activeTab}\``);
    if (activeFile) contextParts.push(`**File**: \`${activeFile}\``);

    const lines = [
      `### ⚠️ Game Dev Studio Error: ${errorTitle}`,
      '',
      contextParts.join(' | '),
    ];

    if (typeof note === 'string' && note.trim()) {
      lines.push('', `**Note**: ${note.trim()}`);
    }

    lines.push('', '```text', body.studioError.trim(), '```');
    const messageContent = lines.join('\n');

    await deliverMessageToChat(
      sidecarApp,
      sessionId,
      `Studio Error: ${errorTitle}`,
      messageContent
    );

    return {
      success: true,
      mode: 'studio-error',
    };
  }

  // Payload (A): Annotated / clean screenshot
  if (image !== undefined && image !== null && image !== '') {
    if (typeof image !== 'string' || !image.trim()) {
      throw createHttpError('Invalid "image" data in send-to-chat request.', 400);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = filename || `playtest-bug-${timestamp}.png`;
    if (!SEND_TO_CHAT_FILENAME_REGEX.test(finalFilename)) {
      throw createHttpError(
        `Invalid filename "${finalFilename}" in send-to-chat request.`,
        400
      );
    }

    const resolvedPath = path.resolve(sessionDir, finalFilename);
    if (!resolvedPath.startsWith(sessionDir + path.sep)) {
      throw createHttpError(
        'Access denied: path traversal attempt in send-to-chat filename.',
        400
      );
    }

    const existingLstat = fs.lstatSync(resolvedPath, { throwIfNoEntry: false });
    if (existingLstat) {
      let realExisting;
      try {
        realExisting = fs.realpathSync(resolvedPath);
      } catch (err) {
        throw createHttpError(
          `Access denied: invalid existing symlink "${finalFilename}": ${err.message}`,
          400
        );
      }
      if (!realExisting.startsWith(realSessionDir + path.sep)) {
        throw createHttpError(
          'Access denied: target file symlink points outside session directory.',
          400
        );
      }
    }

    const rawBase64 = image.includes(',') ? image.split(',')[1] : image;
    const buffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(resolvedPath, buffer);

    const realWrittenPath = fs.realpathSync(resolvedPath);
    if (!realWrittenPath.startsWith(realSessionDir + path.sep)) {
      throw createHttpError(
        'Access denied: resolved file path escapes session directory.',
        400
      );
    }

    const metaObj = metadata && typeof metadata === 'object' ? metadata : {};
    const effectiveWorkspace = metaObj.workspace || workspace || getDefaultWorkspace();
    const effectivePkg = metaObj.pkg || metaObj.package || pkg;
    const effectiveFrameOffset =
      metaObj.frameOffset ?? metaObj.timestamp ?? metaObj.frame ?? 'live';
    const effectiveResolution =
      metaObj.resolution ||
      (metaObj.width && metaObj.height ? `${metaObj.width}x${metaObj.height}` : 'canvas');

    const lines = [`![${finalFilename}](${resolvedPath})`];

    if (typeof note === 'string' && note.trim()) {
      lines.push('', `**Bug Note**: ${note.trim()}`);
    }

    lines.push(
      '',
      `**Workspace**: \`${effectiveWorkspace}\`${effectivePkg ? ` | **Package**: \`${effectivePkg}\`` : ''} | **Frame Offset**: \`${effectiveFrameOffset}\` | **Resolution**: \`${effectiveResolution}\``
    );

    let formattedLogs = '';
    if (Array.isArray(consoleLogs)) {
      formattedLogs = consoleLogs
        .map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
        .join('\n')
        .trim();
    } else if (typeof consoleLogs === 'string') {
      formattedLogs = consoleLogs.trim();
    }

    if (formattedLogs.length > 0) {
      lines.push('', '### Captured Game Console', '```text', formattedLogs, '```');
    }

    const messageContent = lines.join('\n');
    await deliverMessageToChat(
      sidecarApp,
      sessionId,
      `Playtest Bug: ${finalFilename}`,
      messageContent
    );

    return {
      success: true,
      mode: 'screenshot',
      filePath: resolvedPath,
      filename: finalFilename,
    };
  }

  throw createHttpError(
    'Missing "image" (screenshot) or "buildError" (playtest error details) in send-to-chat request.',
    400
  );
}

/**
 * Registers all Playtest Studio pages and API routes onto an Antigravity `SidecarApp` instance
 * per the official `/ui-extension` specification.
 */
export function configureSidecarApp(app, ResponseClass) {
  const readDistText = (name) => {
    const filePath = path.join(distPath, name);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw createHttpError(
        `Built frontend asset "${name}" not found at "${filePath}". Run "npm run build" first.`,
        500
      );
    }
    return fs.readFileSync(filePath, 'utf-8');
  };

  const wrapApi = (handler) => async (data = {}) => {
    try {
      return await handler(data);
    } catch (err) {
      const status = err.statusCode || 500;
      return new ResponseClass(
        JSON.stringify({
          error: err.message,
          statusCode: status,
        }),
        {
          contentType: 'application/json; charset=utf-8',
          status,
        }
      );
    }
  };

  // Static Frontend Routes (re-read on every request per /ui-extension)
  const serveIndexPage = () =>
    new ResponseClass(readDistText('index.html'), {
      contentType: 'text/html; charset=utf-8',
      headers: { 'Cache-Control': 'no-store' },
    });

  app.page('/', serveIndexPage);
  app.page('/index.html', serveIndexPage);
  app.page('/playtest', serveIndexPage);
  app.page(
    '/app.js',
    () =>
      new ResponseClass(readDistText('app.js'), {
        contentType: 'application/javascript; charset=utf-8',
        headers: { 'Cache-Control': 'no-store' },
      })
  );
  app.api(
    '/styles.css',
    wrapApi(
      () =>
        new ResponseClass(readDistText('styles.css'), {
          contentType: 'text/css; charset=utf-8',
          headers: { 'Cache-Control': 'no-store' },
        })
    ),
    'GET'
  );

  // Status & Health APIs
  app.api(
    '/api/status',
    wrapApi(() => ({
      status: 'ok',
      node: process.version,
      platform: `${os.platform()} ${os.release()}`,
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      activeSessionId: getActiveSessionId(),
      defaultWorkspace: getDefaultWorkspace(),
    })),
    'GET'
  );

  app.api(
    '/api/health',
    wrapApi(() => {
      const cfg = getConfig();
      return {
        status: 'ok',
        port: activeServerPort || cfg.port,
        host: cfg.host,
        activeSessionId: getActiveSessionId(),
        defaultWorkspace: getDefaultWorkspace(),
      };
    }),
    'GET'
  );

  app.api(
    '/api/session/active',
    wrapApi(() => ({ sessionId: getActiveSessionId() })),
    'GET'
  );

  app.api(
    '/api/sessions',
    wrapApi(() => ({ sessions: getRecentSessions() })),
    'GET'
  );

  // Convert file:// workspace URIs with fileURLToPath from node:url per /ui-extension
  app.api(
    '/api/workspace/resolve',
    wrapApi((data) => resolveWorkspaceInfo(data.workspaceUri || data.workspace)),
    'POST'
  );

  // Send Bug / Build Error to active Antigravity conversation
  app.api(
    '/api/send-to-chat',
    wrapApi((data) => processSendToChat(data, app)),
    'POST'
  );

  return app;
}

// Apply CORS and security headers on standalone HTTP responses (used in Vite dev & unit tests)
function applySecurityAndCorsHeaders(req, res) {
  const origin = req.headers?.origin;
  const isAllowedOrigin =
    !origin ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ||
    origin.startsWith('vscode-webview://') ||
    origin.startsWith('sidecar://');

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (origin) res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src 'self' http://localhost:* http://127.0.0.1:*; frame-ancestors 'self' vscode-webview: sidecar:;"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

// Standalone HTTP Request Handler (used by `vite dev` middleware and `tests/playtest-server.test.mjs`)
export async function handleRequest(req, res) {
  const startTime = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - startTime;
    console.log(
      `[playtest-studio HTTP] ${new Date().toISOString()} ${req.method} ${req.url} -> ${res.statusCode} (${elapsed}ms)`
    );
  });

  if (typeof req.destroy === 'function' && res && typeof res.once === 'function') {
    const origDestroy = req.destroy.bind(req);
    req.destroy = (err) => {
      if (typeof req.pause === 'function') {
        req.pause();
      }
      if (!res.writableEnded) {
        res.setHeader('Connection', 'close');
        res.once('finish', () => origDestroy(err));
        return req;
      }
      return origDestroy(err);
    };
  }

  applySecurityAndCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = parsedUrl.pathname;

  try {
    if ((pathname === '/api/health' || pathname === '/api/status') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          port: activeServerPort || config.port,
          host: config.host,
          node: process.version,
          platform: `${os.platform()} ${os.release()}`,
          uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
          activeSessionId: getActiveSessionId(),
          defaultWorkspace: getDefaultWorkspace(),
        })
      );
      return;
    }

    if (pathname === '/api/session/active' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ sessionId: getActiveSessionId() }));
      return;
    }

    if (pathname === '/api/sessions' && req.method === 'GET') {
      const sessions = getRecentSessions();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ sessions }));
      return;
    }

    if (pathname === '/api/workspace/resolve' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const info = resolveWorkspaceInfo(body.workspaceUri || body.workspace);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(info));
      return;
    }

    if (pathname === '/api/send-to-chat' && req.method === 'POST') {
      const body = await parseJsonBody(req, MAX_CHAT_BODY_BYTES);
      const result = await processSendToChat(body, null);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (pathname === '/' || pathname === '/index.html' || pathname === '/playtest') {
        const indexPath = path.join(distPath, 'index.html');
        if (!fs.existsSync(indexPath) || !fs.statSync(indexPath).isFile()) {
          throw createHttpError(
            `Built frontend index.html not found at "${indexPath}". Run "npm run build" first.`,
            500
          );
        }
        const content = fs.readFileSync(indexPath);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': content.length,
          'Cache-Control': 'no-cache',
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        res.end(content);
        return;
      }

      if (!pathname.startsWith('/api/') && !pathname.includes('\0') && !pathname.includes('..')) {
        const staticFilePath = path.resolve(distPath, '.' + pathname);
        if (
          staticFilePath.startsWith(distPath + path.sep) &&
          fs.existsSync(staticFilePath) &&
          fs.statSync(staticFilePath).isFile()
        ) {
          const realDist = fs.realpathSync(distPath);
          const realStatic = fs.realpathSync(staticFilePath);
          if (realStatic.startsWith(realDist + path.sep)) {
            const ext = path.extname(realStatic).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            const content = fs.readFileSync(realStatic);
            const headers = {
              'Content-Type': contentType,
              'Content-Length': content.length,
              'X-Content-Type-Options': 'nosniff',
            };
            if (ext === '.svg') {
              headers['Content-Security-Policy'] = "default-src 'none'; sandbox";
            }
            res.writeHead(200, headers);
            if (req.method === 'HEAD') {
              res.end();
              return;
            }
            res.end(content);
            return;
          }
        }
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: `Resource not found: ${req.method} ${pathname}`,
        pathname,
        statusCode: 404,
      })
    );
  } catch (err) {
    console.error(`[playtest-studio] Error processing ${req.method} ${pathname}:`, err);
    const statusCode = err.statusCode || 500;
    if (!res.headersSent) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: err.message, statusCode }));
    }
  }
}

export function createStudioServer() {
  const srv = http.createServer(handleRequest);
  srv.on('listening', () => {
    const addr = srv.address();
    if (addr && typeof addr === 'object' && addr.port) {
      activeServerPort = addr.port;
    }
  });
  srv.on('close', () => {
    activeServerPort = null;
  });
  return srv;
}

export function startServer(options = {}) {
  const config = getConfig();
  const requestedPort =
    typeof options === 'number'
      ? options
      : options.port !== undefined
      ? options.port
      : config.port;
  const requestedHost =
    (typeof options === 'object' && options !== null && options.host) || config.host || '127.0.0.1';

  const srv = createStudioServer();
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      console.error(`[playtest-studio] Server error on port ${requestedPort}:`, err);
      reject(err);
    };
    srv.once('error', onError);
    srv.listen(requestedPort, requestedHost, () => {
      srv.removeListener('error', onError);
      const addr = srv.address();
      const boundPort = addr && typeof addr === 'object' ? addr.port : requestedPort;
      activeServerPort = boundPort;
      srv.port = boundPort;
      srv.host = requestedHost;
      srv.server = srv;
      console.log(`[playtest-studio sidecar] Listening on http://${requestedHost}:${boundPort}`);
      resolve(srv);
    });
  });
}
