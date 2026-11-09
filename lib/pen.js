/**
 * The student's own pen. Deterministic, so the server and the browser draw
 * the same strokes and nothing shifts on hydration.
 */

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * One line of illegible handwriting along a rule at `y`, from x0 to x1: runs
 * of loops for words, a flat glide between them, the pen never lifting so
 * the whole line draws as one stroke. `h` is the x-height.
 */
export function scribble(x0, x1, y, seed, h = 9) {
  const rand = lcg(seed);
  const f = (n) => n.toFixed(1);
  let d = `M${f(x0)} ${f(y)}`;
  let x = x0;
  while (x < x1 - 14) {
    const end = Math.min(x1, x + 22 + rand() * 64);
    while (x < end) {
      const half = 2.6 + rand() * 3.6;
      // Most letters sit on the x-height, a few reach up like an l or a d.
      const up = h * (0.45 + rand() * 0.55) * (rand() < 0.16 ? 1.8 : 1);
      const mid = x + half;
      d += ` Q${f(x + half * 0.15)} ${f(y - up)} ${f(mid)} ${f(y - up * 0.55)}`;
      d += ` Q${f(mid + half * 0.7)} ${f(y + 1.4)} ${f(mid + half)} ${f(y)}`;
      x = mid + half;
    }
    const gap = 6 + rand() * 10;
    d += ` L${f(Math.min(x1, x + gap))} ${f(y + 0.6)}`;
    x += gap;
  }
  return d;
}

/** A quick pen underline, w wide, slightly bowed. */
export function underline(w, seed = 1) {
  const rand = lcg(seed);
  const a = 2 + rand() * 2;
  const b = 4 + rand() * 2;
  return `M1 ${b.toFixed(1)} C ${(w * 0.3).toFixed(1)} ${a.toFixed(1)}, ${(w * 0.6).toFixed(1)} ${(b + 1).toFixed(1)}, ${w - 1} ${a.toFixed(1)}`;
}
