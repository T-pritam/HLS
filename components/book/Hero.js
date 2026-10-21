import AttemptPicker from './AttemptPicker';
import BookPhoto from './BookPhoto';
import { Check } from './Sections';
import { Inr } from './format';

const POINTS = ['One-to-one consultation', 'A written blueprint you keep', 'For CA Final Group 1 repeaters'];

function PriceLine({ cfg }) {
  return (
    <div className="mt-8">
      <p className="font-display text-[30px] leading-none md:text-[36px]">
        <Inr amount={cfg.priceInr} />
      </p>
      <p className="mt-2 text-[15px] text-hls-muted">
        {cfg.taxLabel.charAt(0).toUpperCase() + cfg.taxLabel.slice(1)} · One-time payment
      </p>
    </div>
  );
}

function Cta() {
  return (
    <>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <a href="#book" className="btn-primary w-full sm:w-auto">
          Book your blueprint consultation
        </a>
        <a href="#what-you-get" className="inline-flex min-h-11 items-center justify-center gap-1.5 text-[16px] font-medium sm:justify-start">
          See what you get <span aria-hidden="true">→</span>
        </a>
      </div>
      <div className="callout mt-6 max-w-xl">
        <Check />
        <p>No obligation to join anything afterwards. The consultation is complete on its own.</p>
      </div>
    </>
  );
}

function Points() {
  return (
    <ul className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
      {POINTS.map((p) => (
        <li key={p} className="flex items-center gap-2 text-[16px]">
          <Check />
          {p}
        </li>
      ))}
    </ul>
  );
}

function HeroPhoto() {
  return (
    <BookPhoto
      name="hands-writing"
      alt="A marked answer sheet and a pen under a desk lamp."
      priority
      className="shadow-[0_24px_48px_-24px_rgba(16,32,48,0.45)]"
    />
  );
}

function Eyebrow() {
  return <p className="label text-hls-signal-dark">Blueprint Consultation · CA Final Group 1 repeaters</p>;
}

/** Variant A: diagnosis-led. Leads with the paid consultation and the blueprint. */
export function HeroDiagnosis({ cfg }) {
  return (
    <section aria-labelledby="hero-title" className="border-b border-hls-line pb-14 pt-8 md:pb-20 md:pt-12 xl:pb-24">
      <div className="wrap grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 xl:gap-20">
        <div>
          <Eyebrow />
          <h1 id="hero-title" className="h-hero mt-5">
            Find where your marks are breaking.
          </h1>
          <p className="lede mt-6">
            The Blueprint Consultation is a one-to-one conversation about your attempt. It finds out where the marks
            went, and ends in a written blueprint: where you stand, the specific gaps, your priorities and a realistic
            plan for what to do next.
          </p>
          <Points />
          <PriceLine cfg={cfg} />
          <Cta />
        </div>
        <HeroPhoto />
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
    <section aria-labelledby="hero-title" className="border-b border-hls-line pb-14 pt-8 md:pb-20 md:pt-12 xl:pb-24">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14">
        <div>
          <Eyebrow />
          <h1 id="hero-title" className="h-hero mt-5">
            See what a blueprint looks like.
          </h1>
          <p className="lede mt-6">
            Every consultation ends in a written blueprint like this one: where you stand, the specific gaps, your
            priorities and a realistic plan for what to do next.
          </p>
          <Points />
          <PriceLine cfg={cfg} />
          <Cta />
        </div>
        <figure className="card p-6 md:p-8">
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
    <section aria-labelledby="hero-title" className="border-b border-hls-line pb-14 pt-8 md:pb-20 md:pt-12 xl:pb-24">
      <div className="wrap grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 xl:gap-20">
        <div>
          <Eyebrow />
          <h1 id="hero-title" className="h-hero mt-5">
            Which attempt are you preparing for?
          </h1>
          <AttemptPicker priceLine={<PriceLine cfg={cfg} />} />
        </div>
        <HeroPhoto />
      </div>
    </section>
  );
}
