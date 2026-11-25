/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FrameDvrBuffer } from './FrameDvrBuffer.ts';

export interface PhaserRunnerCallbacks {
  onFrameRecorded?: () => void;
  onPauseChange?: (paused: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
  onLog?: (level: 'log' | 'warn' | 'error', line: string, allLogs: string[]) => void;
  onPanic?: (message: string, allLogs: string[]) => void;
  onStateChange?: (state: 'idle' | 'loading' | 'running' | 'paused' | 'error') => void;
}

interface ChildMessage {
  source: 'playtest-runner-child';
  runnerId: number;
  type:
    | 'READY'
    | 'FRAME'
    | 'LOG'
    | 'PANIC'
    | 'TOGGLE_PAUSE'
    | 'FOCUS_CHANGE';
  dataUrl?: string;
  width?: number;
  height?: number;
  timestampMs?: number;
  level?: 'log' | 'warn' | 'error';
  text?: string;
  message?: string;
  focused?: boolean;
}

const MAX_LOG_LINES = 200;
const BOOT_TIMEOUT_MS = 15_000;

export class PhaserRunner {
  private container: HTMLElement;
  private dvrBuffer: FrameDvrBuffer;
  private callbacks: PhaserRunnerCallbacks;

  private iframe: HTMLIFrameElement | null = null;
  private currentRunnerId = 0;
  private activeMessageHandler: ((e: MessageEvent) => void) | null = null;

  private paused = false;
  private muted = false;
  private focused = false;
  private running = false;
  private consoleLogs: string[] = [];

  constructor(
    container: HTMLElement,
    dvrBuffer: FrameDvrBuffer,
    callbacks: PhaserRunnerCallbacks = {}
  ) {
    this.container = container;
    this.dvrBuffer = dvrBuffer;
    this.callbacks = callbacks;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isFocused(): boolean {
    return this.focused;
  }

  public getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  public clearConsoleLogs(): void {
    this.consoleLogs = [];
  }

  private origin = '';
  private cancelLaunch?: () => void;

  public async connect(address: string): Promise<void> {
    const url = new URL(address);
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (!localHttp || url.username || url.password || url.origin === location.origin) {
      throw new Error('Enter the loopback HTTP address printed by playtest-phaser.mjs.');
    }
    this.destroy();
    this.dvrBuffer.clear();
    this.clearConsoleLogs();
    this.paused = false;
    this.callbacks.onStateChange?.('loading');

    this.origin = url.origin;
    await this.mountGame(url);
  }

  private postToChild(payload: Record<string, unknown>): void {
    if (!this.iframe?.contentWindow) {
      return;
    }
    this.iframe.contentWindow.postMessage(
      {
        source: 'playtest-runner-parent',
        runnerId: this.currentRunnerId,
        ...payload,
      },
      this.origin
    );
  }

  private mountGame(url: URL): Promise<void> {
    return new Promise((resolve, reject) => {
      const runnerId = ++this.currentRunnerId;
      let settled = false;

      const bootTimer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          this.callbacks.onStateChange?.('error');
          reject(
            new Error(
              `[PhaserRunner] Timed out after ${BOOT_TIMEOUT_MS}ms waiting for a Phaser frame. Start the game using scripts/playtest-phaser.mjs.`
            )
          );
        }
      }, BOOT_TIMEOUT_MS);

      this.cancelLaunch = () => {
        window.clearTimeout(bootTimer);
        if (!settled) reject(new Error('Playtest disconnected'));
        settled = true;
      };

      const onMessage = (event: MessageEvent) => {
        const data = event.data as ChildMessage | null;
        if (event.source !== this.iframe?.contentWindow || event.origin !== this.origin) return;
        if (data?.source !== 'playtest-runner-child' || data.runnerId !== runnerId) {
          return;
        }

        switch (data.type) {
          case 'READY': {
            this.running = true;
            this.callbacks.onStateChange?.('running');
            if (!settled) {
              settled = true;
              window.clearTimeout(bootTimer);
              resolve();
            }
            break;
          }

          case 'FRAME': {
            if (
              typeof data.dataUrl === 'string' &&
              typeof data.width === 'number' &&
              typeof data.height === 'number' &&
              data.width > 0 &&
              data.height > 0
            ) {
              try {
                this.dvrBuffer.recordFrameDataUrl(
                  data.dataUrl,
                  data.width,
                  data.height,
                  data.timestampMs ?? performance.now()
                );
                this.callbacks.onFrameRecorded?.();
              } catch (err) {
                console.error('[PhaserRunner] Frame DVR capture error:', err);
              }
            }
            break;
          }

          case 'LOG': {
            const level = data.level || 'log';
            this.appendLog(level, data.text || '');
            break;
          }

          case 'PANIC': {
            const msg = data.message || 'Unknown game error';
            this.appendLog('error', msg);
            if (!settled) {
              settled = true;
              window.clearTimeout(bootTimer);
              reject(new Error(msg));
            } else {
              this.callbacks.onPanic?.(msg, this.getConsoleLogs());
            }
            break;
          }

          case 'TOGGLE_PAUSE': {
            this.togglePause();
            break;
          }

          case 'FOCUS_CHANGE': {
            const isFocused = Boolean(data.focused);
            this.focused = isFocused;
            this.callbacks.onFocusChange?.(isFocused);
            break;
          }
        }
      };

      this.activeMessageHandler = onMessage;
      window.addEventListener('message', onMessage);

      url.searchParams.set('studioRunner', String(runnerId));
      url.searchParams.set('studioOrigin', location.origin);
      url.searchParams.set('muted', this.muted ? '1' : '0');
      const iframe = document.createElement('iframe');
      iframe.className = 'game-runner-iframe';
      iframe.setAttribute('title', 'Phaser Playtest Viewport');
      iframe.src = url.href;

      this.container.innerHTML = '';
      this.container.appendChild(iframe);
      this.iframe = iframe;
    });
  }

  public setPaused(paused: boolean): void {
    if (!this.running || this.paused === paused) {
      return;
    }
    this.paused = paused;
    this.postToChild({ type: 'SET_PAUSED', paused });
    this.callbacks.onPauseChange?.(paused);
    this.callbacks.onStateChange?.(paused ? 'paused' : 'running');
  }

  public togglePause(): boolean {
    if (!this.running) {
      return false;
    }
    this.setPaused(!this.paused);
    return this.paused;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.postToChild({ type: 'SET_MUTED', muted });
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public focus(): void {
    try {
      this.iframe?.contentWindow?.focus();
    } catch {
      // Ignore cross-origin focus restrictions
    }
    this.postToChild({ type: 'FOCUS_GAME' });
  }

  public dispatchVirtualKey(
    code: string,
    key: string,
    type: 'keydown' | 'keyup'
  ): void {
    this.postToChild({
      type: 'DISPATCH_KEY',
      code,
      key,
      keyEventType: type,
    });
  }

  public destroy(): void {
    this.cancelLaunch?.();
    this.cancelLaunch = undefined;
    if (this.activeMessageHandler) {
      window.removeEventListener('message', this.activeMessageHandler);
      this.activeMessageHandler = null;
    }
    this.running = false;
    this.paused = false;
    this.focused = false;
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.remove();
      this.iframe = null;
    }
    this.container.innerHTML = '';
    this.callbacks.onFocusChange?.(false);
  }

  private appendLog(level: 'log' | 'warn' | 'error', rawLine: string): void {
    const timestamp = new Date().toISOString().slice(11, 23);
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${rawLine}`;
    this.consoleLogs.push(formatted);
    if (this.consoleLogs.length > MAX_LOG_LINES) {
      this.consoleLogs.splice(0, this.consoleLogs.length - MAX_LOG_LINES);
    }
    this.callbacks.onLog?.(level, formatted, this.getConsoleLogs());
  }
}
