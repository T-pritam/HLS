import Header from './Header';
import Footer from './Footer';
import Booking from './Booking';
import StickyCta from './StickyCta';
import { HeroAttempt, HeroDiagnosis, HeroSample } from './Hero';
import {
  Check,
  Consultation,
  Example,
  Faq,
  Mentor,
  NextSteps,
  Pricing,
  Problem,
  Programme,
  Proof,
  WhatYouGet,
  WhoFor,
} from './Sections';
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
const REST = ['next', 'programme', 'mentor', 'proof', 'pricing', 'faq'];
const ORDER = {
  a: ['who', 'problem', 'get', 'consultation', 'example', ...REST],
  b: ['get', 'consultation', 'example', 'who', 'problem', ...REST],
  c: ['who', 'problem', 'get', 'consultation', 'example', ...REST],
};

const NAV = [
  { href: '#what-you-get', label: 'What you get' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faqs', label: 'FAQs' },
];

const BOOK_STEPS = ['Confirm you are eligible', 'Give your details', 'Choose a time and pay'];

export default function BookTemplate({ requested = 'a' }) {
  const sample = approvedSample();
  const variant = VARIANTS.includes(requested) && !(requested === 'b' && !sample) ? requested : 'a';
  const cfg = getPublicConfig();

  const sections = {
    who: <WhoFor key="who" cfg={cfg} />,
    problem: <Problem key="problem" />,
    get: <WhatYouGet key="get" cfg={cfg} />,
    consultation: <Consultation key="consultation" cfg={cfg} />,
    example: <Example key="example" cfg={cfg} />,
    next: <NextSteps key="next" />,
    programme: <Programme key="programme" />,
    mentor: <Mentor key="mentor" cfg={cfg} />,
    proof: <Proof key="proof" />,
    pricing: <Pricing key="pricing" cfg={cfg} />,
    faq: <Faq key="faq" cfg={cfg} />,
  };

  return (
    <>
      <a href="#book" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">
        Skip to booking
      </a>
      <Header links={NAV} />
      <main id="main">
        <div id="hero">
          {variant === 'a' && <HeroDiagnosis cfg={cfg} />}
          {variant === 'b' && <HeroSample cfg={cfg} sample={sample} />}
          {variant === 'c' && <HeroAttempt cfg={cfg} />}
        </div>

        {ORDER[variant].map((key) => sections[key])}

        <section id="book" aria-labelledby="book-title" className="section bg-hls-wash">
          <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="label text-hls-signal-dark">Book</p>
              <h2 id="book-title" className="h-section mt-4">
                Make your next attempt with a clearer plan.
              </h2>
              <p className="lede mt-5">
                <Inr amount={cfg.priceInr} />, {cfg.taxLabel}. For CA Final Group 1 repeaters only.
              </p>
              <ol className="mt-8 space-y-3">
                {BOOK_STEPS.map((t, i) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="label flex h-8 w-8 flex-none items-center justify-center rounded-full border border-hls-line bg-white text-hls-signal-dark">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <p className="mt-8 flex items-start gap-3 text-[15px] text-hls-muted">
                <Check />
                No obligation to join anything afterwards.
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
      <StickyCta price={<Inr amount={cfg.priceInr} />} note={cfg.taxLabel} />
    </>
  );
}
