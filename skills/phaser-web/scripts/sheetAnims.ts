// Copy to src/game/sheetAnims.ts in a Phaser template game.
import Phaser from 'phaser';

interface SheetTag {
  name: string;
  from: number;
  to: number;
  direction?: 'forward' | 'reverse' | 'pingpong' | string;
  repeat?: string;
  durationMs?: number;
}

/**
 * Registers one animation per frameTag of a sheet loaded with load.aseprite(key, png, json).
 * Keys are `${key}-${tag}` (e.g. hero-idle), so characters with the same tag names never collide.
 * Tags loop unless the manifest marks them as playing once (repeat "1").
 */
export function createSheetAnims(scene: Phaser.Scene, key: string): string[] {
  const sheet = scene.cache.json.get(key);
  if (!sheet?.meta?.frameTags) throw new Error(`No sprite sheet JSON loaded for "${key}"`);
  const frames: { filename: string; duration?: number }[] = Array.isArray(sheet.frames)
    ? sheet.frames
    : Object.entries(sheet.frames).map(([filename, f]) => ({ filename, ...(f as { duration?: number }) }));
  const created: string[] = [];
  for (const tag of sheet.meta.frameTags as SheetTag[]) {
    const animKey = `${key}-${tag.name}`;
    if (scene.anims.exists(animKey)) continue;
    const tagFrames = frames.slice(tag.from, tag.to + 1).map(f => ({ key, frame: f.filename }));
    if (tag.direction === 'reverse') tagFrames.reverse();
    const msPerFrame = tag.durationMs ?? frames[tag.from]?.duration ?? 100;
    scene.anims.create({
      key: animKey,
      frames: tagFrames,
      frameRate: 1000 / msPerFrame,
      yoyo: tag.direction === 'pingpong',
      repeat: tag.repeat === '1' ? 0 : -1,
    });
    created.push(animKey);
  }
  return created;
}
