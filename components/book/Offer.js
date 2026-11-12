/**
 * The introductory offer: "Complimentary" for a limited period. Never a bare
 * "Free", and no price.
 */

export const OFFER = 'Complimentary';
export const OFFER_NOTE = 'For a limited period';

/** The offer as a price block: "Complimentary", with the time limit under it. */
export default function Offer({ note = OFFER_NOTE, align = 'start' }) {
  return (
    <div className={align === 'end' ? 'sm:text-right' : ''}>
      <p className="font-display text-[clamp(30px,calc(24.275px+1.527vw),36px)] leading-none">{OFFER}</p>
      <p className="mt-2 text-[15px] text-hls-muted">{note}</p>
    </div>
  );
}
