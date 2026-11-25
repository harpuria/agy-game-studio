// This classic script runs before the game's modules, only in a Studio iframe.
(() => {
  const params = new URLSearchParams(location.search);
  const runnerId = Number(params.get('studioRunner'));
  const parentOrigin = params.get('studioOrigin');
  if (!runnerId || window.parent === window || !URL.canParse(parentOrigin)) return;
  const studio = new URL(parentOrigin);
  const localStudio = ['http:', 'https:'].includes(studio.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(studio.hostname);
  if (!localStudio && !['sidecar:', 'vscode-webview:'].includes(studio.protocol)) return;
  const send = (type, fields = {}) => parent.postMessage({
    source: 'playtest-runner-child', runnerId, type, ...fields,
  }, parentOrigin);

  let paused = false;
  let muted = params.get('muted') === '1';
  let lastFrame = -Infinity;
  let ready = false;
  const pending = [];
  const requestFrame = window.requestAnimationFrame.bind(window);
  const snapshot = document.createElement('canvas');
  const context = snapshot.getContext('2d');
  const contexts = new Set();
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (Audio) {
    window.AudioContext = class extends Audio {
      constructor(...args) {
        super(...args);
        contexts.add(this);
        if (muted) this.suspend().catch(() => {});
      }
    };
  }
  function capture(time) {
    const canvas = document.querySelector('canvas');
    if (!context || !canvas?.width || !canvas.height || time - lastFrame < 40) return;
    const scale = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
    const width = Math.max(1, Math.round(canvas.width * scale));
    const height = Math.max(1, Math.round(canvas.height * scale));
    if (snapshot.width !== width || snapshot.height !== height) {
      snapshot.width = width;
      snapshot.height = height;
    }
    context.drawImage(canvas, 0, 0, width, height);
    lastFrame = time;
    send('FRAME', { width, height, timestampMs: time, dataUrl: snapshot.toDataURL('image/png') });
    if (!ready) {
      ready = true;
      send('READY');
    }
  }
  window.requestAnimationFrame = callback => requestFrame(time => {
    if (paused) { pending.push(callback); return; }
    callback(time);
    capture(time);
  });
  for (const level of ['log', 'warn', 'error']) {
    const original = console[level];
    console[level] = (...args) => {
      original.apply(console, args);
      send('LOG', { level, text: args.map(String).join(' ') });
    };
  }
  window.addEventListener('error', e => send('PANIC', { message: e.message }));
  window.addEventListener('unhandledrejection', e => send('PANIC', { message: String(e.reason) }));
  window.addEventListener('focus', () => send('FOCUS_CHANGE', { focused: true }));
  window.addEventListener('blur', () => send('FOCUS_CHANGE', { focused: false }));
  window.addEventListener('keydown', e => {
    if (['F8', 'Backquote'].includes(e.code)) {
      e.preventDefault();
      send('TOGGLE_PAUSE');
    }
  });
  window.addEventListener('message', event => {
    const msg = event.data;
    if (event.source !== parent || event.origin !== parentOrigin ||
        msg?.source !== 'playtest-runner-parent' || msg.runnerId !== runnerId) return;
    if (msg.type === 'SET_PAUSED') {
      paused = msg.paused;
      if (!paused) pending.splice(0).forEach(callback => window.requestAnimationFrame(callback));
    }
    if (msg.type === 'SET_MUTED') muted = msg.muted;
    if (msg.type === 'SET_PAUSED' || msg.type === 'SET_MUTED') {
      for (const ctx of contexts) {
        if (ctx.state !== 'closed') (paused || muted ? ctx.suspend() : ctx.resume()).catch(() => {});
      }
    }
    if (msg.type === 'FOCUS_GAME') window.focus();
    if (msg.type === 'DISPATCH_KEY') {
      (document.querySelector('canvas') || window).dispatchEvent(new KeyboardEvent(msg.keyEventType, {
        code: msg.code, key: msg.key, bubbles: true, cancelable: true,
        keyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Space: 32 }[msg.code] || msg.key.toUpperCase().charCodeAt(0),
      }));
    }
  });
})();
