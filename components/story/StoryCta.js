import PillLink, { PAD } from '@/components/ui/PillLink';
import { LANDING_URL } from '@/lib/motion';
import { CTA_LABEL, CTA_SUBLINE } from '@/lib/story-facts';

/*
 * A call to action and the line that says what happens next. `primary` (the
 * filter's pop-up and the close) is the filled pill; otherwise the outlined
 * one. The box is as wide as the button: the line under it has no width of
 * its own (contain: inline-size), so it wraps inside the button's width and
 * starts where the label does. Nothing the visitor typed goes into the link.
 */
export default function StoryCta({ label = CTA_LABEL, onClick, align = 'center', primary = false, className = '' }) {
  return (
    <div className={`flex flex-col ${align === 'center' ? 'items-center' : 'items-start'} ${className}`}>
      <div className="flex w-fit max-w-full flex-col">
        <PillLink href={LANDING_URL} size="lg" variant={primary ? 'primary' : 'outline'} onClick={onClick}>
          {label}
        </PillLink>
        <p
          className={`mt-3 w-full text-left font-mono text-[clamp(13px,0.85vw,15px)] leading-[1.55] tracking-[0.06em] text-hls-platinum/75 [contain:inline-size] [text-wrap:balance] ${primary ? PAD.lg : PAD.outline}`}
        >
          {CTA_SUBLINE}
        </p>
      </div>
    </div>
  );
}
