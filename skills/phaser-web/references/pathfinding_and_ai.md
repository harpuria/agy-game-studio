# Pathfinding and AI (Phaser Web)

Put pathfinding, steering, and enemy state logic in pure TypeScript modules under `src/game/systems/` so behavior is deterministic, fast, and unit-testable with Vitest.

## Grid A* pathfinding

For top-down, tactics, and tower-defense maps, keep a flat `Uint8Array` walkability grid (`0 = open`, `1 = blocked`) and cap node expansions so unreachable targets never stall a frame:

```ts
export interface GridPos { x: number; y: number; }

export function findPath(
  cols: number,
  rows: number,
  blocked: Uint8Array,
  start: GridPos,
  goal: GridPos,
  maxExpansions = 1024,
): GridPos[] {
  const idx = (x: number, y: number) => y * cols + x;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) return [];
  if (blocked[idx(goal.x, goal.y)]) return [];

  const gScore = new Int32Array(cols * rows).fill(0x3fffffff);
  const cameFrom = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const open: number[] = [];

  const s = idx(start.x, start.y);
  const g = idx(goal.x, goal.y);
  gScore[s] = 0;
  open.push(s);

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  let expanded = 0;

  while (open.length > 0 && expanded++ < maxExpansions) {
    // Pick lowest f = g + manhattan heuristic (swap to binary heap if grid > 64x64)
    let bestI = 0;
    let bestF = Infinity;
    for (let i = 0; i < open.length; i++) {
      const n = open[i];
      const f = gScore[n] + Math.abs((n % cols) - goal.x) + Math.abs(((n / cols) | 0) - goal.y);
      if (f < bestF) { bestF = f; bestI = i; }
    }
    const cur = open.splice(bestI, 1)[0];
    if (cur === g) {
      const path: GridPos[] = [];
      for (let p = cur; p !== -1; p = cameFrom[p]) {
        path.push({ x: p % cols, y: (p / cols) | 0 });
      }
      return path.reverse();
    }
    closed[cur] = 1;
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (closed[ni] || blocked[ni]) continue;
      const tentative = gScore[cur] + 1;
      if (tentative < gScore[ni]) {
        cameFrom[ni] = cur;
        gScore[ni] = tentative;
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }
  return [];
}
```

- **Stagger repaths**: Recompute paths every `250–500 ms` with per-enemy jitter (not every frame) so crowds stay smooth at 60 FPS.

## Steering behaviors (open arenas & bullet-heavens)

- **Seek / Arrive**: Compute `dx = target.x - e.x`, `dy = target.y - e.y`, normalize, and ramp speed down inside a `slowRadius` so enemies stop smoothly without oscillating.
- **Separation**: Push nearby enemies apart inversely proportional to distance within `minSeparation` so swarms read clearly instead of stacking onto one pixel.

## Readable enemy state machines

Model enemy behavior with explicit states and visible **telegraphs** before damage triggers:

```text
Patrol / Idle -> Chase -> Telegraph (wind-up flash/SFX, 0.3–0.6s) -> Attack -> Recover -> Chase
```

- Always separate **telegraph** from **active hitbox frames** so the player can read and dodge attacks fairly.
- Keep enemy state transitions driven by elapsed timers (`stateTimer -= dt`), never wall-clock `Date.now()`, so `PauseState` freezes AI cleanly.
