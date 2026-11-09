'use client';

import { useEffect, useRef } from 'react';

/*
 * Five strands, one per guess, drawn on one canvas and driven by Moment C's
 * own progress. Nothing here listens to the scroll: the parent calls
 * `api.progress(p)` from its timeline and `api.active(on)` from its pin.
 *
 * Flow runs chip to slit (left to right wide, top to bottom narrow); "across"
 * is the other axis. A strand's across-offset at flow position u is
 *   lerp(chip, centre, easeInOut(u)) + noise(u) * (1 - calm(u))
 * and the phases follow the captions: a grow (0-30%), b drift (30-55%),
 * c iron front to back, converge and the line (55-78%), d pulse (78-84%).
 * The parent fades the whole canvas out after that.
 */

const BLUE = '18,115,194';
const CORE = '160,205,240';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const out = (t) => 1 - (1 - t) ** 3;

/** Fixed per-strand waves, so every load draws the same tangle. */
const WAVES = (() => {
  let s = 1729;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: 5 }, (_, i) => ({
    a1: 48 + r() * 14,
    f1: 0.9 + r() * 0.5,
    p1: r() * Math.PI * 2,
    a2: 20 + r() * 10,
    f2: 1.9 + r() * 0.7,
    p2: r() * Math.PI * 2,
    drift: (i % 2 ? 1 : -1) * (0.18 + r() * 0.12),
  }));
})();

/** Grows each strand as its chip arrives, all done by 30%. */
const reach = (i, p) => out(clamp((p - (0.03 + 0.045 * i)) / 0.09));

export default function SignalStrands({ api, className = '' }) {
  const canvas = useRef(null);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    let geo = null;
    let p = 0;
    let clock = 0; // seconds of drift, frozen once the calm starts
    let on = false;
    let raf = 0;
    let last = 0;
    let queued = 0;

    // Noise for strand i at u, tapering to nothing at the chip and the slit.
    const noise = (i, u, scale) => {
      const w = WAVES[i];
      const t = clock * w.drift;
      const breathe = 1 + 0.07 * Math.sin(clock * 0.9 + i);
      const taper = smooth(0, 0.14, u) * (1 - smooth(0.5, 1, u));
      return (
        scale *
        breathe *
        taper *
        (w.a1 * Math.sin(Math.PI * 2 * w.f1 * u + w.p1 + t) + w.a2 * Math.sin(Math.PI * 2 * w.f2 * u + w.p2 - t * 1.4))
      );
    };

    // Flow/across to canvas x/y.
    const pt = (flow, across) => (geo.wide ? [flow, across] : [across, flow]);

    const strokeLine = (pts, width, color) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length - 1; k++) {
        const mx = (pts[k][0] + pts[k + 1][0]) / 2;
        const my = (pts[k][1] + pts[k + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[k][0], pts[k][1], mx, my);
      }
      const z = pts[pts.length - 1];
      ctx.lineTo(z[0], z[1]);
      ctx.stroke();
    };

    // A gradient along the flow axis: transparent at `from`, full by `from + 40`.
    const ramp = (from, dir, alpha) => {
      const [x0, y0] = pt(from, 0);
      const [x1, y1] = pt(from + 40 * dir, 0);
      const g = geo.wide ? ctx.createLinearGradient(x0, 0, x1, 0) : ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, `rgba(${BLUE},0)`);
      g.addColorStop(1, `rgba(${BLUE},${alpha})`);
      return g;
    };

    const draw = () => {
      queued = 0;
      if (!geo) return;
      ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
      ctx.clearRect(0, 0, geo.cw, geo.ch);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const { strands, end, exit, centre, brainEdge, brainCentre, scale } = geo;
      // Front to back: the wobble irons out from the chips towards the slit.
      const front = 1.15 * inOut(clamp((p - 0.55) / 0.2));
      const calm = (u) => (p < 0.55 ? 0 : 1 - smooth(front - 0.15, front, u));
      const spread = 1 - inOut(clamp((p - 0.7) / 0.08));

      // The five strands.
      strands.forEach((s, i) => {
        const uMax = reach(i, p);
        if (uMax <= 0.001) return;
        const n = Math.max(2, Math.ceil(64 * uMax));
        const pts = [];
        for (let k = 0; k <= n; k++) {
          const u = (k / n) * uMax;
          const flow = lerp(s.flow, end, u);
          const across = centre + spread * (lerp(s.across, centre, inOut(u)) - centre) + noise(i, u, scale) * (1 - calm(u));
          pts.push(pt(flow, across));
        }
        strokeLine(pts, 6, ramp(s.flow, 1, 0.08));
        strokeLine(pts, 1.25, ramp(s.flow, 1, 1));
      });

      // b: a faint, noisy continuation that dies out before the head.
      const ghost = smooth(0.31, 0.4, p) * (1 - smooth(0.5, 0.58, p));
      if (ghost > 0.01) {
        const len = (brainEdge - exit) * 0.6;
        const pts = [];
        for (let k = 0; k <= 40; k++) {
          const u = k / 40;
          const a = 14 * scale * Math.sin(u * 9 + clock * 0.7) * Math.sin(Math.PI * u) + 8 * scale * Math.sin(u * 17 - clock);
          pts.push(pt(exit + len * u, centre + a));
        }
        const [x0, y0] = pt(exit, centre);
        const [x1, y1] = pt(exit + len, centre);
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, `rgba(${BLUE},${0.45 * ghost})`);
        g.addColorStop(1, `rgba(${BLUE},0)`);
        strokeLine(pts, 1, g);
      }

      // c: one straight line out of the slit, reaching the brain's edge by 78%.
      const reachLine = inOut(clamp((p - 0.58) / 0.2));
      if (reachLine > 0) {
        const tip = lerp(exit, brainEdge, reachLine);
        const a = pt(exit, centre);
        const b = pt(tip, centre);
        strokeLine([a, b], 10, `rgba(${BLUE},0.12)`);
        strokeLine([a, b], 2.5, `rgba(${BLUE},1)`);
        strokeLine([a, b], 1, `rgba(${CORE},0.9)`);
      }

      // d: a small bright pulse travels the whole line into the brain.
      const pulse = clamp((p - 0.78) / 0.06);
      if (pulse > 0 && pulse < 1) {
        const [x, y] = pt(lerp(Math.min(...strands.map((s) => s.flow)), brainCentre, inOut(pulse)), centre);
        const fade = 1 - smooth(0.8, 1, pulse);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, `rgba(235,245,255,${fade})`);
        g.addColorStop(0.35, `rgba(${CORE},${0.8 * fade})`);
        g.addColorStop(1, `rgba(${BLUE},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const request = () => {
      if (!queued) queued = requestAnimationFrame(draw);
    };

    // The drift runs only while the stage is pinned and the calm has not begun.
    const tick = (t) => {
      raf = 0;
      if (!on || p >= 0.55) return;
      clock += Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      draw();
      raf = requestAnimationFrame(tick);
    };
    const loop = () => {
      if (raf || !on || p >= 0.55) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    api.current = {
      geometry(g) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.style.width = `${g.cw}px`;
        cv.style.height = `${g.ch}px`;
        cv.width = Math.round(g.cw * dpr);
        cv.height = Math.round(g.ch * dpr);
        geo = { ...g, dpr };
        request();
      },
      progress(v) {
        if (v === p) return;
        p = v;
        if (raf) return; // the drift loop draws this frame anyway
        request();
        loop();
      },
      active(v) {
        on = v;
        if (on) loop();
        else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(queued);
      api.current = null;
    };
  }, [api]);

  return <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none absolute left-0 top-0 ${className}`} />;
}
