import {
  HIMAKANTH_LABEL,
  HIMAKANTH_QUESTION,
  HIMAKANTH_QUOTE,
  HIMAKANTH_SIGNATURE,
  HIMAKANTH_STAT_LINE,
  SHOW_STAT,
  STAT_VALUE,
} from '@/lib/story-facts';

// 100 minus the stat, rounded: 88 for "12%".
const N = 100 - Math.round(parseFloat(STAT_VALUE));
const fill = (t) => t.replace('{n}', String(N));

/**
 * What /story says under Himakanth's name, in the scene's body style. The vh
 * cap and the phone size keep five lines of text inside one screen.
 */
export default function HimakanthNote() {
  return (
    <div className="max-w-[40ch] font-body text-[14px] leading-[1.45] text-hls-navy/75 md:text-[clamp(15px,min(1.5vw,2.4vh),22px)] md:leading-[1.5]">
      <p className="kicker text-hls-deep">{HIMAKANTH_LABEL}</p>
      {SHOW_STAT ? <p className="mt-[clamp(8px,1.4vh,14px)]">{fill(HIMAKANTH_STAT_LINE)}</p> : null}
      <blockquote className="mt-[clamp(8px,1.6vh,18px)]">
        <p>“{fill(HIMAKANTH_QUOTE)}”</p>
        <footer className="mt-[clamp(6px,1vh,10px)] font-mono text-[12px] uppercase tracking-[0.14em] text-hls-navy/75">
          {HIMAKANTH_SIGNATURE}
        </footer>
      </blockquote>
      <p className="mt-[clamp(12px,2.2vh,24px)] font-display text-[clamp(20px,min(1.8vw,3.2vh),30px)] italic leading-[1.2] text-hls-navy">
        {HIMAKANTH_QUESTION}
      </p>
    </div>
  );
}
