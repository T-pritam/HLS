'use client';

import { useEffect, useRef, useState } from 'react';
import { initGsap, reducedMotion, refreshSoon } from '@/lib/motion';
import { BANDS, COPY, MARKS_CTA_LABEL, PAPERS, RULES, SAMPLE, fill, plural } from '@/lib/mentor-notes';
import StoryCta from './StoryCta';

/*
 * PRIVACY: the marks live only in this component's state. Nothing here
 * stores, sends, logs or puts them in a URL. Analytics, if wired, gets three
 * bare event names and nothing else.
 */

const EMPTY = ['', '', ''];

/** 'blank' (no result, no error), 'error' (inline error) or a whole number 0-100. */
function parse(raw) {
  const t = raw.trim();
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return 'blank';
  if (!/^\d+$/.test(t) || Number(t) > RULES.paperMax) return 'error';
  return Number(t);
}

/** Which first read the marks get, and the words for it. */
function read(marks) {
  const total = marks.reduce((a, b) => a + b, 0);
  const gap = RULES.groupMin - total;
  const below = PAPERS.filter((_, i) => marks[i] < RULES.paperMin).map((p) => p.name);
  let kind;
  if (below.length === 0) {
    if (gap <= 0) kind = 'pass';
    else if (gap <= BANDS.close) kind = 'close';
    else if (gap <= BANDS.moderate) kind = 'moderate';
    else kind = 'large';
  } else if (gap <= 0) {
    kind = below.length > 1 ? 'paperOnlyMany' : 'paperOnly';
  } else {
    kind = 'both';
  }
  const vars = {
    gap: plural(Math.max(gap, 0), 'mark'),
    perPaper: plural(Math.ceil(Math.max(gap, 0) / 3), 'mark'),
    total,
    papers: below.join(' and '),
  };
  const v = COPY.verdicts[kind];
  return { kind, total, gap, head: fill(v.head, vars), body: fill(v.body, vars) };
}

/** Bare event names only, and only if GA4 is on the page. */
function track(name) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') window.gtag('event', name);
}

/** A 0-to-max bar with a notch. Filled by scaleX from the parent. */
function Bar({ fillRef, notch, notchLabel, children }) {
  return (
    <span className="relative block h-[10px] w-full">
      <span className="absolute inset-0 rounded-full bg-hls-black/[0.08]" />
      <span ref={fillRef} className="absolute inset-0 origin-left rounded-full bg-hls-signal" style={{ transform: 'scaleX(0)' }} />
      {children}
      <span className="absolute -bottom-[5px] -top-[5px] w-px bg-hls-black/55" style={{ left: `${notch}%` }} />
      <span
        className="absolute top-full mt-[7px] -translate-x-1/2 font-mono text-[10px] leading-none tracking-[0.08em] text-hls-black/65"
        style={{ left: `${notch}%` }}
      >
        {notchLabel}
      </span>
    </span>
  );
}

/** Your marks, worked out in the page: a desk note and a mentor's first read. */
export default function StoryMarks() {
  const [vals, setVals] = useState(EMPTY);
  const [chip, setChip] = useState(null);

  const section = useRef(null);
  const line = useRef(null);
  const firstInput = useRef(null);
  const fills = useRef([]);
  const counts = useRef([]);
  const groupFill = useRef(null);
  const groupCount = useRef(null);
  const gapBlock = useRef(null);
  const verdictBox = useRef(null);
  const shown = useRef([0, 0, 0, 0]);
  const counting = useRef([]);
  const started = useRef(false);
  const resulted = useRef(false);

  const parsed = vals.map(parse);
  const marks = parsed.every((p) => typeof p === 'number') ? parsed : null;
  const verdict = marks ? read(marks) : null;
  const followReply = chip === null ? null : chip === COPY.followup.chips.length - 1 ? COPY.followup.replyNone : COPY.followup.replyPaper;

  // The line from the filter draws down into the card as the section enters.
  // The section grows when a result appears, so the stages below re-measure.
  useEffect(() => {
    const gsap = initGsap();
    let ctx;
    if (!reducedMotion()) {
      ctx = gsap.context(() => {
        gsap.fromTo(
          line.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: section.current, start: 'top 85%', end: 'top 20%', scrub: 0.5, refreshPriority: 3 },
          }
        );
      }, section);
    }
    let h = section.current.offsetHeight;
    const ro = new ResizeObserver(() => {
      const nh = section.current.offsetHeight;
      if (nh !== h) {
        h = nh;
        refreshSoon();
      }
    });
    ro.observe(section.current);
    return () => {
      ro.disconnect();
      ctx?.revert();
    };
  }, []);

  // Bars fill and numbers count to whatever is valid right now.
  const key = parsed.join('|');
  useEffect(() => {
    const gsap = initGsap();
    const still = reducedMotion();
    const targets = [...parsed.map((p) => (typeof p === 'number' ? p : null)), verdict ? verdict.total : null];
    const bars = [...fills.current, groupFill.current];
    const nums = [...counts.current, groupCount.current];
    const maxes = [RULES.paperMax, RULES.paperMax, RULES.paperMax, RULES.groupMax];

    targets.forEach((t, i) => {
      const scale = (t ?? 0) / maxes[i];
      if (still) gsap.set(bars[i], { scaleX: scale });
      else gsap.to(bars[i], { scaleX: scale, duration: 0.6, ease: 'power2.out', overwrite: true });

      counting.current[i]?.kill();
      const box = { n: shown.current[i] };
      if (t === null) {
        nums[i].textContent = '–';
        shown.current[i] = 0;
      } else if (still) {
        nums[i].textContent = String(t);
        shown.current[i] = t;
      } else {
        counting.current[i] = gsap.to(box, {
          n: t,
          duration: 0.6,
          ease: 'power2.out',
          onUpdate: () => {
            shown.current[i] = Math.round(box.n);
            nums[i].textContent = String(shown.current[i]);
          },
        });
      }
    });

    // The shortfall to 150, outlined, pulses once when it appears or moves.
    const gap = gapBlock.current;
    if (verdict && verdict.gap > 0) {
      gap.style.left = `${(verdict.total / RULES.groupMax) * 100}%`;
      gap.style.width = `${(verdict.gap / RULES.groupMax) * 100}%`;
      if (still) gsap.set(gap, { opacity: 1 });
      else gsap.fromTo(gap, { opacity: 0 }, { keyframes: { opacity: [0, 1, 0.35, 1] }, duration: 1.2, ease: 'none', overwrite: true });
    } else {
      gsap.set(gap, { opacity: 0, overwrite: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // The first read fades in whenever it changes.
  const readKey = verdict ? verdict.head + verdict.body : '';
  useEffect(() => {
    if (!verdict) {
      resulted.current = false;
      return;
    }
    if (!resulted.current) {
      resulted.current = true;
      track('marks_calc_result');
    }
    if (reducedMotion()) return;
    initGsap().fromTo(verdictBox.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readKey]);

  const begin = () => {
    if (started.current) return;
    started.current = true;
    track('marks_calc_started');
  };

  const change = (i, v) => {
    begin();
    setVals((prev) => prev.map((p, j) => (j === i ? v : p)));
  };

  const sample = () => {
    begin();
    setVals(SAMPLE.map(String));
  };

  // Enter (or the keyboard's Next) moves on to the next paper.
  const next = (i) => (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const fields = section.current.querySelectorAll('input');
    if (i < fields.length - 1) fields[i + 1].focus();
    else e.currentTarget.blur();
  };

  const entered = parsed.filter((p) => typeof p === 'number').length;

  const reset = () => {
    setVals(EMPTY);
    setChip(null);
    started.current = false;
    firstInput.current?.focus();
  };

  const button =
    'inline-flex min-h-[44px] items-center px-4 font-mono text-[11px] font-medium uppercase leading-none tracking-[0.16em] transition-opacity duration-200 hover:opacity-80';

  return (
    <section ref={section} id="story-marks" className="relative w-full bg-hls-black px-5 pb-[clamp(96px,14vh,160px)] md:px-10 lg:px-0">
      <div className="story-frame mx-auto w-full max-w-[1200px] lg:max-w-none">
        <div className="relative pb-8 pl-10 pt-[max(32px,calc(8svh_-_34px))] md:pl-12 lg:pl-7">
          {/* Lands on the card's first column of writing; from 1024px it runs down the frame's left edge. */}
          <span
            ref={line}
            aria-hidden="true"
            className="absolute bottom-0 left-[19px] top-0 w-[1.6px] origin-top bg-hls-signal lg:left-0"
          />
          <h2 className="max-w-[18em] font-display text-[clamp(26px,3.2vw,42px)] leading-[1.12] tracking-[-0.015em] text-hls-platinum [text-wrap:balance]">
            {COPY.intro.heading}
          </h2>
          <p className="mt-3 max-w-[46ch] font-body text-[clamp(16px,calc(15.046px+0.254vw),17px)] leading-[1.5] text-hls-platinum/85">
            {COPY.intro.lead}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-hls-mist">{COPY.intro.small}</p>
        </div>

        <div className="grid items-start gap-6 lg:ml-7 lg:grid-cols-[42%_minmax(0,1fr)] lg:gap-8">
          {/* The desk note. */}
          <div
            className="relative w-full max-w-[min(92vw,460px)] rounded-[4px] bg-hls-platinum px-5 py-6 text-hls-black lg:max-w-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(43,110,163,0.09) 31px, rgba(43,110,163,0.09) 32px)',
            }}
          >
            <div className="space-y-5">
              {PAPERS.map((p, i) => {
                const bad = parsed[i] === 'error';
                return (
                  <div key={p.key}>
                    <label htmlFor={`marks-${p.key}`} className="meta block text-hls-black/70">
                      {p.label}
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      {/* The field: a big numeral, a fixed "/ 100" inside it, and a
                          Signal Blue underline while it is the one being typed in. */}
                      <div className="relative w-[124px] shrink-0">
                        <input
                          ref={i === 0 ? firstInput : undefined}
                          id={`marks-${p.key}`}
                          type="text"
                          inputMode="numeric"
                          enterKeyHint={i < PAPERS.length - 1 ? 'next' : 'done'}
                          maxLength={3}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={COPY.placeholder}
                          value={vals[i]}
                          onChange={(e) => change(i, e.target.value)}
                          onKeyDown={next(i)}
                          aria-invalid={bad || undefined}
                          aria-describedby={`marks-suffix${bad ? ` marks-${p.key}-error` : ''}`}
                          className="h-[56px] w-full rounded-none border-0 border-b-2 border-hls-black/20 bg-transparent pl-1 pr-[46px] font-display text-[32px] leading-none text-hls-signal outline-none placeholder:font-body placeholder:text-[16px] placeholder:text-hls-black/35 focus:border-hls-signal"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-[14px] right-1 font-mono text-[12px] tracking-[0.04em] text-hls-black/60"
                        >
                          {COPY.suffix}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pb-3">
                        <Bar fillRef={(el) => (fills.current[i] = el)} notch={(RULES.paperMin / RULES.paperMax) * 100} notchLabel={RULES.paperMin} />
                      </div>
                      <span
                        ref={(el) => (counts.current[i] = el)}
                        aria-hidden="true"
                        className="w-9 shrink-0 text-right font-mono text-[14px] tabular-nums text-hls-deep"
                      >
                        –
                      </span>
                    </div>
                    {bad ? (
                      <p id={`marks-${p.key}-error`} className="mt-2 font-mono text-[11px] tracking-[0.06em] text-hls-black/75">
                        {COPY.error}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <p className="font-mono text-[12px] tracking-[0.06em] text-hls-black/60 tabular-nums">
                  {fill(COPY.entered, { n: entered })}
                </p>
                <button
                  type="button"
                  onClick={sample}
                  className="inline-flex min-h-[44px] items-center font-body text-[15px] font-medium text-hls-deep underline decoration-hls-signal/40 underline-offset-4 transition-opacity duration-200 hover:opacity-80"
                >
                  {COPY.sampleButton}
                </button>
              </div>

              <div className="border-t border-hls-black/15 pt-5">
                <p className="meta text-hls-black/65">{COPY.groupLabel}</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="min-w-0 flex-1 pb-3">
                    <Bar fillRef={groupFill} notch={(RULES.groupMin / RULES.groupMax) * 100} notchLabel={RULES.groupMin}>
                      <span
                        ref={gapBlock}
                        aria-hidden="true"
                        className="absolute -inset-y-[3px] rounded-[2px] border border-dashed border-hls-signal"
                        style={{ opacity: 0, left: 0, width: 0 }}
                      />
                    </Bar>
                  </div>
                  <span
                    ref={groupCount}
                    aria-hidden="true"
                    className="w-12 shrink-0 text-right font-mono text-[14px] tabular-nums text-hls-deep"
                  >
                    –
                  </span>
                </div>
              </div>
            </div>

            <span id="marks-suffix" className="sr-only">
              {COPY.suffix}
            </span>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={reset} className={`${button} border border-hls-black/30 text-hls-black`}>
                {COPY.resetButton}
              </button>
            </div>
            <p className="mt-4 font-mono text-[11px] leading-[1.6] tracking-[0.06em] text-hls-black/65">{COPY.note}</p>
          </div>

          {/* The first read. */}
          <div className="rounded-[4px] border border-hls-mist/20 bg-hls-platinum/[0.03] px-6 py-7 md:px-8 md:py-9">
            <p className="kicker text-signal-read">{COPY.panelLabel}</p>
            <div aria-live="polite" aria-atomic="true" className="mt-5">
              {verdict ? (
                <div ref={verdictBox} key={readKey}>
                  <p className="font-display text-[clamp(24px,2.6vw,34px)] leading-[1.15] tracking-[-0.01em] text-hls-platinum">
                    {verdict.head}
                  </p>
                  <p className="mt-4 font-body text-[clamp(15px,calc(14.046px+0.254vw),16px)] leading-[1.6] text-hls-platinum/80">{verdict.body}</p>
                </div>
              ) : (
                <p className="font-body text-[15px] leading-[1.6] text-hls-mist">{COPY.panelEmpty}</p>
              )}
            </div>

            {verdict ? (
              <div className="mt-8 border-t border-hls-mist/20 pt-6">
                <p className="font-body text-[clamp(15px,calc(14.046px+0.254vw),16px)] text-hls-platinum">{COPY.followup.prompt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {COPY.followup.chips.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={chip === i}
                      onClick={() => setChip(i)}
                      className={`inline-flex min-h-[44px] items-center rounded-full border px-4 font-body text-[14px] transition-colors duration-200 ${
                        chip === i
                          ? 'border-hls-signal bg-hls-signal text-hls-black'
                          : 'border-hls-mist/40 text-hls-platinum hover:border-hls-platinum'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p aria-live="polite" className="mt-4 min-h-[1px] font-body text-[15px] leading-[1.6] text-hls-platinum/80">
                  {followReply}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-[clamp(72px,10vh,120px)] max-w-[40em] lg:ml-7">
          <h3 className="font-display text-[clamp(28px,3.6vw,48px)] leading-[1.1] tracking-[-0.015em] text-hls-platinum">
            {COPY.bridge.head}
          </h3>
          <p className="mt-4 font-body text-[clamp(15px,calc(13.092px+0.509vw),17px)] leading-[1.6] text-hls-mist">{COPY.bridge.body}</p>
          {/* Only once a first read is on screen. The link never carries the marks. */}
          {verdict ? <StoryCta label={MARKS_CTA_LABEL} align="start" onClick={() => track('marks_cta_clicked')} className="mt-8" /> : null}
        </div>
      </div>
    </section>
  );
}
