// Run from a Phaser template checkout. Resolve Vite and its config from that game.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

const manifest = resolve('package.json');
const { dependencies, devDependencies } = JSON.parse(await readFile(manifest, 'utf8'));
if (!(dependencies?.phaser || devDependencies?.phaser)) {
  throw new Error('Run from the Phaser game directory after npm ci.');
}
const require = createRequire(manifest);
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const bridge = await readFile(new URL('../server/services/phaser-bridge.js', import.meta.url), 'utf8');
const server = await createServer({
  mode: 'standalone',
  server: { host: '127.0.0.1' },
  plugins: [{
    name: 'game-studio-capture',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [{ tag: 'script', children: bridge, injectTo: 'head-prepend' }],
    },
  }],
});
await server.listen();
server.printUrls();
