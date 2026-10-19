import Header from './Header';
import Footer from './Footer';
import Booking from './Booking';
import StickyCta from './StickyCta';
import { HeroAttempt, HeroDiagnosis, HeroSample } from './Hero';
import { Consultation, Faq, Mentor, NextSteps, Problem, Programme, Proof } from './Sections';
import { Inr } from './format';
import { getPublicConfig } from '@/lib/book/config';
import { approvedSample } from '@/lib/book/content';
import { VARIANTS } from '@/lib/book/attempts';

/**
 * One template, three openings (?v=a|b|c, default a). The form and payment
 * are identical behind all of them, and the variant is saved with each lead.
 * B (proof-led) needs an approved sample blueprint; without one it falls back
 * to A, and the lead records the variant actually shown.
 *
 * Each variant is a static page: /book is A, and next.config.mjs rewrites
 * /book?v=b and /book?v=c to /book/v/b and /book/v/c.
 */
const ORDER = {
  a: ['problem', 'consultation', 'next', 'programme', 'mentor', 'proof', 'faq'],
  b: ['consultation', 'problem', 'next', 'programme', 'mentor', 'proof', 'faq'],
  c: ['problem', 'consultation', 'next', 'programme', 'mentor', 'proof', 'faq'],
};

export default function BookTemplate({ requested = 'a' }) {
  const sample = approvedSample();
  const variant = VARIANTS.includes(requested) && !(requested === 'b' && !sample) ? requested : 'a';
  const cfg = getPublicConfig();

  const sections = {
    problem: <Problem key="problem" />,
    consultation: <Consultation key="consultation" cfg={cfg} />,
    next: <NextSteps key="next" />,
    programme: <Programme key="programme" />,
    mentor: <Mentor key="mentor" cfg={cfg} />,
    proof: <Proof key="proof" />,
    faq: <Faq key="faq" cfg={cfg} />,
  };

  return (
    <>
      <a href="#book" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">
        Skip to booking
      </a>
      <Header />
      <main id="main">
        <div id="hero">
          {variant === 'a' && <HeroDiagnosis cfg={cfg} />}
          {variant === 'b' && <HeroSample cfg={cfg} sample={sample} />}
          {variant === 'c' && <HeroAttempt cfg={cfg} />}
        </div>

        {ORDER[variant].map((key) => sections[key])}

        <section id="book" aria-labelledby="book-title" className="section bg-hls-wash">
          <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div>
              <p className="label text-hls-signal-dark">Book</p>
              <h2 id="book-title" className="h-section mt-4">
                Book your blueprint consultation
              </h2>
              <p className="lede mt-5">
                <Inr amount={cfg.priceInr} />, {cfg.taxLabel}. For CA Final Group 1 repeaters only.
              </p>
              <p className="mt-4 text-hls-muted">
                Three short steps: confirm you are eligible, give your details, then choose a time and pay.
              </p>
            </div>
            <Booking
              variant={variant}
              priceInr={cfg.priceInr}
              taxLabel={cfg.taxLabel}
              paymentMode={cfg.paymentMode}
              slotsSynthetic={cfg.slotsSynthetic}
              holdMinutes={cfg.holdMinutes}
              contact={{ phone: cfg.supportPhone, whatsapp: cfg.supportWhatsApp, email: cfg.supportEmail }}
            />
          </div>
        </section>
      </main>
      <Footer cfg={cfg} />
      <StickyCta
        label={
          <>
            Book your consultation · <Inr amount={cfg.priceInr} />
          </>
        }
      />
    </>
  );
}
