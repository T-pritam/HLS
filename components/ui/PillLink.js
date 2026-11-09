'use client';

/*
 * The site's buttons: one pill family, always an <a>.
 *
 * Primary (the three main calls to action): a Platinum pill with a Navy label
 * and a Signal Blue arrow circle at its right end. On hover or keyboard focus
 * the circle grows until blue fills the pill and the label turns white; a
 * touch press shows that at once. `tone="light"` (the nav over a light panel)
 * swaps the pill to Navy with a Platinum label. Contrast: Navy on Platinum
 * 13.6:1, Platinum on Navy 13.6:1, white on Signal Blue 4.9:1.
 *
 * Outline (the secondary buttons): transparent with a Platinum border.
 */

/** Left padding of each pill, so a line under it can start where the label does. */
export const PAD = {
  lg: 'pl-[26px] md:pl-[clamp(26px,2vw,38px)]',
  outline: 'pl-[clamp(20px,1.4vw,26px)]',
};

// Sizes grow with the screen. --pill-h is the height; the arrow circle is
// 12px shorter (6px inset all round). `grow` scales the circle until it
// covers the whole pill: about 2x the pill's width over the circle's.
const SIZES = {
  md: {
    pill: 'gap-3 [--pill-h:44px] pl-[20px] text-[14px] min-[400px]:text-[15px] md:[--pill-h:clamp(46px,3vw,54px)] md:pl-[clamp(20px,1.4vw,26px)] md:text-[clamp(15px,1vw,18px)]',
    grow: 'group-hover:scale-[24] group-focus-visible:scale-[24] group-active:scale-[24]',
  },
  lg: {
    pill: `gap-3.5 [--pill-h:60px] text-[17px] md:[--pill-h:clamp(60px,4.4vw,76px)] md:text-[clamp(18px,1.3vw,23px)] ${PAD.lg}`,
    grow: 'group-hover:scale-[18] group-focus-visible:scale-[18] group-active:scale-[18]',
  },
};
const CIRCLE = 'size-[calc(var(--pill-h)-12px)]';

const TONES = {
  dark: { pill: 'bg-hls-platinum text-hls-navy focus-visible:outline-hls-signal', label: 'group-hover:text-white group-focus-visible:text-white group-active:text-white' },
  light: { pill: 'bg-hls-navy text-hls-platinum focus-visible:outline-hls-navy', label: 'group-hover:text-white group-focus-visible:text-white group-active:text-white' },
};

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid';

/** The secondary pill's classes, shared with MagnetLink's card buttons. */
export const OUTLINE = `pill-link inline-flex h-[clamp(48px,3.2vw,58px)] items-center rounded-full border border-hls-platinum/60 ${PAD.outline} pr-[clamp(20px,1.4vw,26px)] font-body text-[clamp(15px,1.05vw,18px)] font-medium text-hls-platinum transition-colors duration-300 hover:border-hls-platinum hover:bg-[rgba(228,233,236,0.08)] motion-reduce:transition-none ${FOCUS} focus-visible:outline-hls-signal`;

/** The secondary pill's small arrow. */
export function OutlineArrow() {
  return (
    <span aria-hidden="true" className="text-[1em] leading-none">
      →
    </span>
  );
}

export default function PillLink({ href, size = 'lg', tone = 'dark', variant = 'primary', className = '', children, onClick }) {
  if (variant === 'outline') {
    return (
      <a href={href} onClick={onClick} className={`${OUTLINE} gap-2 ${className}`}>
        <span>{children}</span>
        <OutlineArrow />
      </a>
    );
  }

  const s = SIZES[size] || SIZES.lg;
  const t = TONES[tone] || TONES.dark;
  // The fill switches instantly with reduced motion and on a touch press.
  const ease = 'transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-active:duration-0 motion-reduce:transition-none';

  return (
    <a
      href={href}
      onClick={onClick}
      data-tone={tone}
      className={`pill-link group relative isolate inline-flex h-[var(--pill-h)] max-w-full shrink-0 items-center overflow-hidden whitespace-nowrap rounded-full pr-1.5 font-body font-medium leading-none ${s.pill} ${t.pill} ${FOCUS} ${className}`}
    >
      {/* The fill: sits under the arrow circle and grows from it. */}
      <span aria-hidden="true" className={`absolute right-1.5 top-1/2 -z-10 -translate-y-1/2 rounded-full bg-hls-signal ${CIRCLE} ${s.grow} ${ease}`} />
      <span className={`transition-colors duration-300 group-active:duration-0 motion-reduce:transition-none ${t.label}`}>{children}</span>
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-hls-signal text-white ${CIRCLE}`}>
        {/* The arrow scales with the circle. */}
        <span className="text-[calc((var(--pill-h)-12px)*0.5)] leading-none transition-transform duration-300 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none">→</span>
      </span>
    </a>
  );
}
