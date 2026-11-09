/**
 * The things on your desk, drawn in code. Each one takes `settled` to show
 * its final state, for reduced motion; otherwise StoryMoments animates it.
 */

import { scribble, underline } from '@/lib/pen';

const CARD = 'w-[min(78vw,340px)]';

/** Platinum paper with faint ruled lines. */
const RULED = {
  backgroundColor: '#e4e9ec',
  backgroundImage:
    'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(18,115,194,0.16) 27px, rgba(18,115,194,0.16) 28px)',
};

const MARKS = [
  ['FINANCIAL REPORTING', '47'],
  ['AFM', '41'],
  ['AUDIT', '44'],
];

export function Marksheet({ settled = false }) {
  return (
    <div className={`${CARD} relative rounded-[3px] px-6 py-7 font-mono text-hls-navy shadow-[0_24px_60px_rgba(0,0,0,0.55)]`} style={RULED}>
      <div className="relative">
        {MARKS.map(([paper, mark]) => (
          <p key={paper} className="flex items-baseline justify-between py-2 text-[13px] tracking-[0.06em]">
            <span>{paper}</span>
            <span className="pr-8 tabular-nums">{mark}</span>
          </p>
        ))}
        {/* The pen goes down the column, a tick beside each paper. */}
        <svg viewBox="0 0 22 108" className="absolute right-0 top-1 h-[108px] w-[22px] overflow-visible" fill="none" aria-hidden="true">
          <path
            data-ticks
            d="M3 13 L8 19 L18 6 M3 49 L8 55 L18 42 M3 85 L8 91 L18 78"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={settled ? 0 : 1}
            stroke="#1273C2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-3 flex items-baseline justify-between border-t border-hls-navy/40 pt-3 text-[14px] font-medium tracking-[0.06em]">
        <span>TOTAL</span>
        <span className="pr-8 tabular-nums">
          <span className="relative inline-block">
            <span data-total>132</span>
            <svg viewBox="0 0 34 8" className="absolute -bottom-2 left-1/2 h-[8px] w-[34px] -translate-x-1/2 overflow-visible" fill="none" aria-hidden="true">
              <path
                data-total-line
                d={underline(34, 7)}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={settled ? 0 : 1}
                stroke="#1273C2"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>{' '}
          / 300
        </span>
      </p>
      {/* The total on a scale to 150: 132 filled, the 18 missing as a dashed
          block, a tick at 150. */}
      <div className="relative mt-4 mr-8 pb-4" aria-hidden="true">
        <div className="flex h-[8px]">
          <div className="relative h-full" style={{ width: `${(132 / 150) * 100}%` }}>
            <span
              data-bar-fill
              className="absolute inset-0 origin-left bg-hls-signal"
              style={settled ? undefined : { transform: 'scaleX(0)' }}
            />
          </div>
          <div data-bar-gap className="h-full flex-1 origin-left border border-dashed border-hls-signal/80" />
        </div>
        <span className="absolute -top-[3px] right-0 block h-[14px] w-px bg-hls-navy/60" />
        <span className="absolute right-0 top-[12px] translate-x-1/2 text-[9px] tracking-[0.06em] text-hls-navy/70">150</span>
      </div>
      <p data-need className="mt-2 pr-8 text-right text-[11px] tracking-[0.08em] text-hls-signal" style={settled ? undefined : { opacity: 0 }}>
        need 150
      </p>
      <p className="mt-6 text-[10px] tracking-[0.18em] text-hls-slate">ILLUSTRATIVE MARKS</p>
    </div>
  );
}

const SHEET_RULES = Array.from({ length: 9 }, (_, i) => 34 + i * 28);
const HALF_LINE = scribble(18, 150, SHEET_RULES[3] - 2, 20261102, 8);

/** The hall: the clock running out over a sheet of blank lines. */
export function HallSheet({ settled = false }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p data-clock className="font-mono text-[clamp(44px,13vw,88px)] font-medium tabular-nums tracking-[0.04em] text-hls-platinum">
        {settled ? '00:00:00' : '00:04:00'}
      </p>
      <div className={`${CARD} rounded-[3px] shadow-[0_24px_60px_rgba(0,0,0,0.55)]`} style={{ backgroundColor: '#e4e9ec' }}>
        <svg viewBox="0 0 300 280" className="block h-auto w-full" fill="none" aria-hidden="true">
          <line x1="12" x2="12" y1="0" y2="280" stroke="#1273C2" strokeOpacity="0.3" />
          {SHEET_RULES.map((y) => (
            <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#1273C2" strokeOpacity="0.2" />
          ))}
          <path
            data-pen
            d={HALF_LINE}
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={settled ? 0 : 1}
            stroke="#1273C2"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
