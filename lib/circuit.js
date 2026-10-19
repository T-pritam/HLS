/**
 * Deterministic circuit-trace generator. Same seed gives the same geometry on
 * the server and in the browser, so nothing shifts during hydration.
 */

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ortho(a, b, t) {
  if (t < 0.5) {
    const mx = Math.round(a.x + (b.x - a.x) * (0.32 + t * 0.55));
    return `M${a.x} ${a.y} H${mx} V${b.y} H${b.x}`;
  }
  const my = Math.round(a.y + (b.y - a.y) * (0.32 + (t - 0.5) * 0.55));
  return `M${a.x} ${a.y} V${my} H${b.x} V${b.y}`;
}

export function buildCircuit({
  width = 1600,
  height = 900,
  cols = 6,
  rows = 5,
  seed = 20260804,
  right = 0.78,
  down = 0.5,
  diag = 0.14,
} = {}) {
  const rand = lcg(seed);
  const cw = width / cols;
  const ch = height / rows;

  const nodes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      nodes.push({
        x: Math.round(cw * (c + 0.16 + rand() * 0.68)),
        y: Math.round(ch * (r + 0.16 + rand() * 0.68)),
      });
    }
  }

  const at = (r, c) => nodes[r * cols + c];
  const paths = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = at(r, c);
      if (c < cols - 1 && rand() < right) paths.push(ortho(n, at(r, c + 1), rand()));
      if (r < rows - 1 && rand() < down) paths.push(ortho(n, at(r + 1, c), rand()));
      if (r < rows - 1 && c < cols - 1 && rand() < diag)
        paths.push(ortho(n, at(r + 1, c + 1), rand()));
    }
  }

  return { nodes, paths, width, height };
}

/**
 * One continuous trace through orthogonal waypoints, every corner cut at 45
 * degrees the way a PCB router draws it. `r` is the chamfer length, clamped
 * to half of the shorter neighbouring segment.
 */
export function chamfer(points, r = 24) {
  const f = (n) => Math.round(n * 10) / 10;
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(x - px, y - py) || 1;
    const outLen = Math.hypot(nx - x, ny - y) || 1;
    const c = Math.min(r, inLen / 2, outLen / 2);
    d += ` L${f(x - ((x - px) / inLen) * c)} ${f(y - ((y - py) / inLen) * c)}`;
    d += ` L${f(x + ((nx - x) / outLen) * c)} ${f(y + ((ny - y) / outLen) * c)}`;
  }
  const last = points[points.length - 1];
  return `${d} L${f(last[0])} ${f(last[1])}`;
}

/**
 * Where the current scene's trace leaves the bottom of the screen, and the
 * five breaks scene picks it up again. Both scenes read it from here.
 */
export function handoffX(width, wide) {
  return wide ? Math.round(width * 0.84) : 32;
}
