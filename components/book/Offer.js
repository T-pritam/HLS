/**
 * The introductory offer: the regular fee struck through, then
 * "Complimentary" for a limited period. Never a bare "Free".
 */

export const OFFER = 'Complimentary';
export const OFFER_NOTE = 'For a limited period';

/** "₹3,000", or null when no regular fee is set. */
export function fee(cfg) {
  return cfg.regularFeeInr ? `₹${cfg.regularFeeInr.toLocaleString('en-IN')}` : null;
}

/** The regular fee, struck through, read out as such. */
export function WasFee({ cfg, className = '' }) {
  const f = fee(cfg);
  if (!f) return null;
  return (
    <span className={className}>
      <span className="sr-only">Regular fee </span>
      <s>{f}</s>
    </span>
  );
}

/** The offer as a price block: "Complimentary", with the old fee and the time limit under it. */
export default function Offer({ cfg, note = OFFER_NOTE, align = 'start' }) {
  return (
    <div className={align === 'end' ? 'sm:text-right' : ''}>
      <p className="font-display text-[clamp(30px,calc(24.275px+1.527vw),36px)] leading-none">{OFFER}</p>
      <p className="mt-2 text-[15px] text-hls-muted">
        <WasFee cfg={cfg} className="mr-2" />
        {note}
      </p>
    </div>
  );
}
