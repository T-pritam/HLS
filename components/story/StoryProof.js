import { CREDENTIAL_LINE, TESTIMONIALS } from '@/lib/story-facts';

const PLACEHOLDERS = process.env.NEXT_PUBLIC_SHOW_PLACEHOLDERS === 'true';

const BOX = 'rounded-[4px] border border-dashed border-hls-mist/50 px-5 py-4 font-mono text-[12px] tracking-[0.06em] text-hls-mist';

/*
 * A slim strip of proof after the founder scene: the credential line and up
 * to two student quotes, only when lib/story-facts.js has real ones. For the
 * approval preview, empty ones show as dashed placeholders instead.
 */
export default function StoryProof() {
  const quotes = TESTIMONIALS.filter((t) => t && t.quote && t.name).slice(0, 2);
  const credential = CREDENTIAL_LINE || null;
  const showCredential = credential || PLACEHOLDERS;
  const slots = quotes.length ? quotes : PLACEHOLDERS ? [null] : [];
  if (!showCredential && !slots.length) return null;

  return (
    <section id="story-proof" aria-label="In their words" className="relative w-full bg-hls-black px-5 py-[clamp(56px,9vh,96px)] md:px-10 lg:px-0">
      <div className="story-frame mx-auto w-full max-w-[1200px] lg:max-w-none">
        {showCredential ? (
          credential ? (
            <p className="max-w-[60ch] font-body text-[16px] leading-[1.6] text-hls-platinum/85 md:text-[17px]">{credential}</p>
          ) : (
            <p className={`${BOX} max-w-[60ch]`}>[Credential line: awaiting Himakanth]</p>
          )
        ) : null}

        {slots.length ? (
          <div className={`grid gap-5 md:grid-cols-2 md:gap-8 ${showCredential ? 'mt-8' : ''}`}>
            {slots.map((t, i) =>
              t ? (
                <figure key={i} className="border-l border-hls-signal/60 pl-5">
                  <blockquote className="font-display text-[clamp(19px,1.6vw,23px)] italic leading-[1.4] text-hls-platinum">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-hls-mist">
                    {t.name}
                    {t.attempt ? ` · ${t.attempt}` : ''}
                  </figcaption>
                </figure>
              ) : (
                <p key={i} className={BOX}>
                  [Student quote: awaiting written permission]
                </p>
              )
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
