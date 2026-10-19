import { AtAGlance } from './Sections';
import AttemptPicker from './AttemptPicker';
import { Inr } from './format';

function PriceLine({ cfg }) {
  return (
    <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-display text-[34px] leading-none"><Inr amount={cfg.priceInr} />
      </span>
      <span className="label text-hls-muted">{cfg.taxLabel}</span>
    </p>
  );
}

function Cta() {
  return (
    <>
      <a href="#book" className="btn-primary mt-6 w-full sm:w-auto">
        Book your blueprint consultation
      </a>
      <p className="mt-4 text-[15px] text-hls-muted">No obligation to join anything afterwards.</p>
    </>
  );
}

/** Variant A: diagnosis-led. Leads with the paid consultation and the blueprint. */
export function HeroDiagnosis({ cfg }) {
  return (
    <section aria-labelledby="hero-title" className="pb-16 pt-10 md:pb-24 md:pt-20">
      <div className="wrap grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="label text-hls-signal-dark">CA Final · Group 1 repeaters</p>
          <h1 id="hero-title" className="mt-5 text-[42px] leading-[1.04] md:text-[64px]">
            Find where your marks are breaking.
          </h1>
          <p className="lede mt-6">
            The Blueprint Consultation is a one-to-one conversation about your attempt. You leave with a written
            blueprint: where you stand, the specific gaps, your priorities and a realistic plan for what to do next.
          </p>
          <PriceLine cfg={cfg} />
          <Cta />
        </div>
        <AtAGlance cfg={cfg} />
      </div>
    </section>
  );
}

/**
 * Variant B: proof-led. Leads with an approved sample blueprint, always
 * labelled illustrative. Only rendered when lib/book/content.js has one.
 */
export function HeroSample({ cfg, sample }) {
  return (
    <section aria-labelledby="hero-title" className="pb-16 pt-10 md:pb-24 md:pt-20">
      <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">
        <div>
          <p className="label text-hls-signal-dark">CA Final · Group 1 repeaters</p>
          <h1 id="hero-title" className="mt-5 text-[42px] leading-[1.04] md:text-[60px]">
            See what a blueprint looks like.
          </h1>
          <p className="lede mt-6">
            Every consultation ends in a written blueprint like this one: where you stand, the specific gaps, your
            priorities and a realistic plan for what to do next.
          </p>
          <PriceLine cfg={cfg} />
          <Cta />
        </div>
        <figure className="rounded-md border border-hls-line bg-white p-6 md:p-8">
          <p className="label text-hls-error">Illustrative sample · not a real student&rsquo;s result</p>
          <h2 className="mt-4 text-[26px] leading-tight">{sample.title}</h2>
          {sample.intro && <p className="mt-3 text-hls-muted">{sample.intro}</p>}
          {sample.sections?.map((s) => (
            <div key={s.heading} className="mt-6">
              <h3 className="label text-hls-muted">{s.heading}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </figure>
      </div>
    </section>
  );
}

/** Variant C: attempt-led. Asks which attempt first, then shows matching copy. */
export function HeroAttempt({ cfg }) {
  return (
    <section aria-labelledby="hero-title" className="pb-16 pt-10 md:pb-24 md:pt-20">
      <div className="wrap grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-16">
        <div>
          <p className="label text-hls-signal-dark">CA Final · Group 1 repeaters</p>
          <h1 id="hero-title" className="mt-5 text-[42px] leading-[1.04] md:text-[64px]">
            Which attempt are you preparing for?
          </h1>
          <AttemptPicker priceLine={<PriceLine cfg={cfg} />} />
        </div>
        <AtAGlance cfg={cfg} />
      </div>
    </section>
  );
}
