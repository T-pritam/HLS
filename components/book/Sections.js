import Todo from './Todo';
import BookPhoto from './BookPhoto';
import { hasContact } from './Contact';
import { Inr } from './format';
import { approvedTestimonials, mentor, mentorReady } from '@/lib/book/content';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Kicker({ children, className = 'text-hls-signal-dark' }) {
  return <p className={`label ${className}`}>{children}</p>;
}

/** A tick in a small circle, for checklists. */
export function Check({ className = 'text-hls-signal' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className={`mt-[3px] flex-none ${className}`}>
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10.2l2.6 2.6L14 7.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="mt-[3px] flex-none text-hls-mist">
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function CheckList({ items, icon = <Check />, className = 'mt-5 space-y-3' }) {
  return (
    <ul className={className}>
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          {icon}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Development-only flag on copy written for the redesign and not yet approved. */
function Draft({ cfg }) {
  return cfg.showTodoMarkers ? (
    <p className="mb-4">
      <Todo show>draft copy, needs approval</Todo>
    </p>
  ) : null;
}

function SectionHead({ kicker, id, title, children }) {
  return (
    <>
      {kicker && <Kicker className="mb-4 text-hls-signal-dark">{kicker}</Kicker>}
      <h2 id={id} className="h-section max-w-3xl">
        {title}
      </h2>
      {children}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Who it is for                                                    */
/* ------------------------------------------------------------------ */

const SIGNS = [
  'You covered the syllabus, but the marks did not reflect the work you put in.',
  'You are not sure whether it was concepts, recall, presentation or time that cost you.',
  'You are about to start again, and do not want to prepare the same way twice.',
];

export function WhoFor({ cfg }) {
  return (
    <section aria-labelledby="who-title" className="section">
      <div className="wrap">
        <Draft cfg={cfg} />
        <SectionHead id="who-title" title="You have attempted Group 1. You need to know what went wrong." />
        <p className="lede mt-6">
          The Blueprint Consultation is for CA Final Group 1 repeaters: students who have attempted Group 1 before and
          are preparing to attempt it again.
        </p>
        <ul className="mt-10 max-w-3xl divide-y divide-hls-line border-y border-hls-line">
          {SIGNS.map((s) => (
            <li key={s} className="flex items-start gap-4 py-5">
              <Check />
              <span className="text-[17px] md:text-[18px]">{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-[15px] text-hls-muted">
          It is not for CA Inter, first-time CA Final candidates or Group 2.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The problem                                                      */
/* ------------------------------------------------------------------ */

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="section bg-hls-wash">
      <div className="wrap">
        <SectionHead kicker="The problem" id="problem-title" title="Marks are lost in two places." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
          <div className="card border-t-4 !border-t-hls-navy p-6 md:p-8">
            <h3 className="h-card">What you didn&rsquo;t know.</h3>
            <p className="mt-3 text-hls-muted">
              The gaps in what you studied: a concept half-learned, a standard misread, a topic left for later.
            </p>
          </div>
          <div className="card border-t-4 !border-t-hls-signal p-6 md:p-8">
            <h3 className="h-card">What you didn&rsquo;t do.</h3>
            <p className="mt-3 text-hls-muted">
              What you knew but did not get onto the paper: the answer you could not recall in time, the
              presentation that lost marks, the paper you ran out of time on.
            </p>
          </div>
        </div>
        <p className="mt-10 max-w-2xl border-l-2 border-hls-signal pl-5 text-[18px]">
          Studying harder in the same way does not show you which of the two it was for you. Finding that out is
          the first step.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. What you get                                                     */
/* ------------------------------------------------------------------ */

const QUESTIONS = [
  {
    icon: 'M4 16V9m5 7V5m5 11v-4',
    q: 'Where do you stand?',
    text: 'We go through your marksheets and recent mock papers to see where your marks came from, paper by paper, and where they were lost.',
    out: 'Where you stand, in writing.',
  },
  {
    icon: 'M10 3a7 7 0 100 14 7 7 0 000-14zm0 4v3l2 2',
    q: 'What is breaking your marks?',
    text: 'Whether the gaps are in what you know or in what you get onto the paper, across what you study, how you study, recall, presentation and performing under pressure.',
    out: 'The specific gaps, named.',
  },
  {
    icon: 'M4 10h10m-4-4l4 4-4 4',
    q: 'What should you do next?',
    text: 'Priorities for the time you have, and a realistic plan for what to change before your next attempt.',
    out: 'Your priorities and a realistic next-step plan.',
  },
];

export function WhatYouGet({ cfg }) {
  return (
    <section id="what-you-get" aria-labelledby="get-title" className="section">
      <div className="wrap">
        <Draft cfg={cfg} />
        <SectionHead kicker="What you get" id="get-title" title="Three questions your blueprint answers." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {QUESTIONS.map((c) => (
            <div key={c.q} className="card flex flex-col p-6 md:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-hls-wash text-hls-signal-dark">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </div>
              <h3 className="h-card mt-5">{c.q}</h3>
              <p className="mt-3 text-hls-muted">{c.text}</p>
              <p className="mt-6 border-t border-hls-line pt-4 text-[15px] font-medium md:mt-auto">{c.out}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-2xl">
          The blueprint looks at five places: what to study, how to study, how to recall, how to present, and how to
          perform under pressure.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The consultation                                                 */
/* ------------------------------------------------------------------ */

const BRING = ['Your previous marksheets', 'Your current or intended attempt', 'Recent mock papers'];
const NOT = ['A guaranteed pass or a promised mark gain', 'Any obligation to enrol in a programme'];

export function Consultation({ cfg }) {
  const details = [
    cfg.durationMin && ['Length', `About ${cfg.durationMin} minutes`],
    cfg.blueprintFormat && ['Blueprint format', cfg.blueprintFormat],
    cfg.blueprintTurnaround && ['Blueprint delivered', cfg.blueprintTurnaround],
  ].filter(Boolean);

  return (
    <section id="consultation" aria-labelledby="consultation-title" className="section bg-hls-wash">
      <div className="wrap">
        <SectionHead
          kicker="The Blueprint Consultation"
          id="consultation-title"
          title="One conversation about your attempt. A blueprint you keep."
        />
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <BookPhoto
            name="two-chairs"
            alt="Two chairs at a table, a lamp and an answer sheet between them."
            className="lg:sticky lg:top-24"
          />
          <div className="space-y-8">
            <div>
              <h3 className="h-card">The one-to-one consultation</h3>
              <p className="mt-3 text-hls-muted">
                A conversation about your attempt: what you studied, how you prepared, and what happened in the paper.
              </p>
            </div>
            <div>
              <h3 className="h-card">Your written blueprint</h3>
              <p className="mt-3 text-hls-muted">
                Where you stand, the specific gaps, your priorities and a realistic plan for your next steps, in
                writing.
              </p>
            </div>
            <p className="border-l-2 border-hls-signal pl-4 font-medium">
              It is meant to be useful whether or not you ever join a programme.
            </p>
            <div className="card p-5">
              <p className="font-medium">Bring</p>
              <CheckList items={BRING} className="mt-3 space-y-2" />
              <p className="mt-4 text-[15px] text-hls-muted">
                You share these through a private link after booking, never on this page.
              </p>
            </div>
            <div className="card p-5">
              <p className="font-medium">What it is not</p>
              <CheckList items={NOT} icon={<Cross />} className="mt-3 space-y-2" />
            </div>

            {details.length > 0 && (
              <dl className="grid gap-3 sm:grid-cols-3">
                {details.map(([k, v]) => (
                  <div key={k} className="rounded-md bg-white p-4">
                    <dt className="label text-hls-muted">{k}</dt>
                    <dd className="mt-2 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {cfg.showTodoMarkers && (
              <p className="flex flex-wrap gap-2">
                {!cfg.blueprintFormat && <Todo show>blueprint format</Todo>}
                {!cfg.blueprintTurnaround && <Todo show>blueprint turnaround</Todo>}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Illustrative example                                             */
/* ------------------------------------------------------------------ */

const EXAMPLE = [
  ['Starting point', '“I covered everything, revised twice, and still did not clear Group 1.”'],
  ['What the papers show', 'Marks held up in Audit but fell in Financial Reporting, and the last questions in two mock papers were left unanswered.'],
  ['Where the marks went', 'Mostly not a gap in knowledge. Early answers ran long and time ran out: marks lost in what was not done.'],
  ['Possible priorities', 'Timed answer-writing for Financial Reporting, a time budget per question, and targeted revision of two weak standards.'],
  ['The decision it helps', 'Spend the coming months on how to perform in the paper, not on reading the whole syllabus again.'],
];

export function Example({ cfg }) {
  return (
    <section aria-labelledby="example-title" className="section">
      <div className="wrap">
        <Draft cfg={cfg} />
        <SectionHead id="example-title" title="What a clearer plan could look like." />
        <p className="mt-5 inline-block rounded-md border border-hls-line bg-hls-wash px-3 py-1.5 text-[15px] font-medium text-hls-signal-dark">
          Illustrative example · A Group 1 repeater
        </p>
        <ol className="steps mt-10 max-w-3xl">
          {EXAMPLE.map(([k, v], i) => (
            <li key={k}>
              <p className="label text-hls-signal-dark">
                {String(i + 1).padStart(2, '0')} · {k}
              </p>
              <p className="mt-2 text-[17px] md:text-[18px]">{v}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-2xl text-[15px] text-hls-muted">
          This shows the kind of reasoning a blueprint works through. It is not a real student&rsquo;s result and not a
          promise of any outcome.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. How it works                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  ['Book and pay', 'Confirm you are a Group 1 repeater, choose a slot and pay for the consultation.'],
  ['Share your papers privately', 'You receive a private link for your marksheets and mock papers.'],
  ['The consultation', 'A one-to-one conversation about your attempt.'],
  ['Your blueprint', 'Where you stand, the gaps, your priorities and a realistic next-step plan, in writing.'],
  ['A counsellor call, if it fits', 'If the Score Improvement Programme might suit you, a counsellor talks it through.'],
  ['Onboarding, if you join', 'Only if you decide the programme is right for you.'],
];

export function NextSteps() {
  return (
    <section id="how-it-works" aria-labelledby="next-title" className="section bg-hls-wash">
      <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <SectionHead kicker="How it works" id="next-title" title="From booking to blueprint." />
          <p className="mt-6 max-w-md font-medium">
            The consultation is bought on its own. Booking it does not enrol you in anything.
          </p>
        </div>
        <ol className="steps">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <p className="label text-hls-signal-dark">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="h-card mt-2">{title}</h3>
              <p className="mt-2 text-hls-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. The programme                                                    */
/* ------------------------------------------------------------------ */

const COMPONENTS = [
  ['Financial Reporting', null],
  ['Advanced Financial Management', null],
  ['Audit', null],
  ['Individual preparation and execution', 'One-to-one attention to how you prepare and how you perform.'],
];

export function Programme() {
  return (
    <section aria-labelledby="programme-title" className="section bg-hls-navy text-hls-platinum">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <Kicker className="mb-4 text-[#8ec3ef]">The Score Improvement Programme</Kicker>
          <h2 id="programme-title" className="h-section max-w-3xl text-white">
            The blueprint sets the direction. If it fits, there is a programme.
          </h2>
          <p className="mt-6 max-w-xl text-[18px]">
            The programme is discussed with a counsellor after your consultation, if it fits. Its cost is shared on
            that call.
          </p>
        </div>
        <div className="rounded-lg border border-white/15 bg-white/[0.04] p-6 md:p-8">
          <p className="label text-[#8ec3ef]">Online · four components</p>
          <ul className="mt-5 space-y-4">
            {COMPONENTS.map(([name, note]) => (
              <li key={name} className="flex items-start gap-3">
                <Check className="text-[#8ec3ef]" />
                <span>
                  <span className="font-display text-[20px] leading-snug text-white">{name}</span>
                  {note && <span className="mt-1 block text-[16px] text-hls-platinum/85">{note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. The mentor (approved content only)                               */
/* ------------------------------------------------------------------ */

export function Mentor({ cfg }) {
  if (!mentorReady()) {
    // A labelled placeholder in development; omitted in production until approved.
    if (!cfg.showTodoMarkers) return null;
    return (
      <section aria-labelledby="mentor-title" className="section">
        <div className="wrap">
          <SectionHead kicker="The mentor" id="mentor-title" title="The mentor" />
          <div className="mt-8 flex flex-col gap-6 rounded-md border-2 border-dashed border-hls-line p-6 sm:flex-row">
            <div className="flex h-40 w-32 flex-none items-center justify-center bg-hls-wash text-center text-[13px] text-hls-muted">
              Photo placeholder
            </div>
            <div>
              <Todo show>approved mentor bio and photo (lib/book/content.js)</Todo>
              <p className="mt-3 text-hls-muted">
                Placeholder. This section is hidden in production until an approved bio and photo are added.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="mentor-title" className="section">
      <div className="wrap grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
        {mentor.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- approved static asset
          <img
            src={mentor.photo.src}
            width={mentor.photo.width}
            height={mentor.photo.height}
            alt={mentor.name}
            loading="lazy"
            className="h-auto w-40 rounded-md"
          />
        )}
        <div>
          <SectionHead kicker="The mentor" id="mentor-title" title={mentor.name} />
          {mentor.credentials && <p className="mt-2 text-hls-muted">{mentor.credentials}</p>}
          <p className="lede mt-5">{mentor.bio}</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Proof (only genuine, permission-cleared testimonials)           */
/* ------------------------------------------------------------------ */

export function Proof() {
  const items = approvedTestimonials();
  if (!items.length) return null;
  return (
    <section aria-labelledby="proof-title" className="section bg-hls-wash">
      <div className="wrap">
        <SectionHead kicker="In their words" id="proof-title" title="From students who took the consultation" />
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {items.map((t) => (
            <li key={t.quote} className="card flex flex-col p-6 md:p-8">
              <blockquote className="font-display text-[20px] leading-snug md:text-[22px]">&ldquo;{t.quote}&rdquo;</blockquote>
              <p className="mt-5 border-t border-hls-line pt-4 text-[15px] text-hls-muted md:mt-auto">
                <span className="font-medium text-hls-ink">{t.name}</span>
                {t.detail ? `, ${t.detail}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 11. Pricing                                                         */
/* ------------------------------------------------------------------ */

const INCLUDED = [
  'A one-to-one consultation about your attempt',
  'Where you stand',
  'The specific gaps',
  'Your priorities',
  'A realistic plan for your next steps, in writing',
];

export function Pricing({ cfg }) {
  const facts = [
    cfg.durationMin && ['Length', `About ${cfg.durationMin} minutes`],
    cfg.consultationMode && ['Held', cfg.consultationMode],
    cfg.consultantName && ['With', cfg.consultantName],
  ].filter(Boolean);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="section bg-hls-wash">
      <div className="wrap">
        <SectionHead kicker="Price" id="pricing-title" title="Start with a clear diagnosis." />
        <div className="card mt-12 max-w-2xl p-6 sm:p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h3 className="text-[24px] leading-tight md:text-[28px]">The Blueprint Consultation</h3>
              <p className="mt-1 text-[15px] text-hls-muted">For CA Final Group 1 repeaters</p>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-[30px] leading-none md:text-[36px]">
                <Inr amount={cfg.priceInr} />
              </p>
              <p className="mt-2 text-[15px] text-hls-muted">{cfg.taxLabel}</p>
              <p className="text-[15px] text-hls-muted">One-time payment</p>
            </div>
          </div>
          <CheckList items={INCLUDED} className="mt-8 space-y-3 border-t border-hls-line pt-8" />
          {facts.length > 0 && (
            <dl className="mt-6 divide-y divide-hls-line border-y border-hls-line">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-4 py-3 text-[16px]">
                  <dt className="text-hls-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {cfg.showTodoMarkers && (
            <p className="mt-4 flex flex-wrap gap-2">
              {!cfg.durationMin && <Todo show>duration</Todo>}
              {!cfg.consultationMode && <Todo show>consultation mode</Todo>}
              {!cfg.consultantName && <Todo show>consultant name</Todo>}
            </p>
          )}
          <div className="callout mt-8 bg-hls-wash">
            <Check />
            <p>No obligation to join anything afterwards.</p>
          </div>
          <a href="#book" className="btn-primary mt-8 w-full">
            Book your blueprint consultation
          </a>
          <p className="mt-4 text-center text-[15px] text-hls-muted">
            The Score Improvement Programme is separate. Its cost is shared on a counsellor call, if it fits.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 12. FAQ                                                             */
/* ------------------------------------------------------------------ */

function refundAnswer(cfg) {
  if (!cfg.policyPublished) {
    return (
      <>
        <p>Cancellation, reschedule and refund terms are to be confirmed.</p>
        {hasContact(cfg) && <p className="mt-2">If you have a question before booking, please contact support.</p>}
      </>
    );
  }
  return (
    <>
      <p>
        If you cancel at least 24 hours before your slot, you get a full refund. Inside 24 hours there is no
        automatic refund. You can reschedule once, free, with at least 24 hours&rsquo; notice. If we have to cancel,
        you can choose a new slot or a full refund. A missed consultation is not refunded automatically, but
        support reviews exceptions.
      </p>
      <p className="mt-2">
        {cfg.refundProcessingTime
          ? `Refunds are processed within ${cfg.refundProcessingTime}.`
          : 'Refund processing time is to be confirmed.'}{' '}
        <a href="/book/refund">Read the refund and cancellation policy</a>.
      </p>
    </>
  );
}

export function faqItems(cfg) {
  const length = cfg.durationMin
    ? `The consultation takes about ${cfg.durationMin} minutes.`
    : 'The length of the consultation is to be confirmed.';
  const blueprint = cfg.blueprintTurnaround
    ? `You receive your blueprint ${cfg.blueprintTurnaround}.`
    : 'When you receive your blueprint is to be confirmed.';

  return [
    [
      'Who is this for?',
      <p key="a">
        CA Final Group 1 repeaters: students who have attempted Group 1 before and are preparing to attempt it
        again. It is not for CA Inter, first-time CA Final candidates or Group 2.
      </p>,
    ],
    [
      'Is it online?',
      <p key="a">
        The Score Improvement Programme is online.{' '}
        {cfg.consultationMode
          ? `The consultation is held as follows: ${cfg.consultationMode}.`
          : 'How the consultation is held is to be confirmed.'}
      </p>,
    ],
    [
      'Do I have to join the programme afterwards?',
      <p key="a">
        No. The consultation is complete on its own. If the programme might fit you, a counsellor can talk it
        through, and the choice is yours.
      </p>,
    ],
    [
      'Is a pass guaranteed?',
      <p key="a">
        No. Nobody can promise a pass or a mark gain. You get a diagnosis of where your marks are going and a plan
        for what to change.
      </p>,
    ],
    [
      'What do I need to bring?',
      <p key="a">
        Your previous marksheets, your current or intended attempt, and recent mock papers. After booking you get
        a private link to share them. Please do not send them through this page.
      </p>,
    ],
    [
      'How long is the consultation, and when do I get the blueprint?',
      <p key="a">
        {length} {blueprint}
      </p>,
    ],
    ['What if I can’t attend or want a refund?', <div key="a">{refundAnswer(cfg)}</div>],
    [
      'What does the programme cost?',
      <p key="a">A counsellor shares the cost on a call, if the programme fits you after your consultation.</p>,
    ],
    [
      'Which attempt is this for?',
      <p key="a">
        Either. When you book, choose this attempt, the next attempt, or not sure. The consultation is the same.
      </p>,
    ],
  ];
}

export function Faq({ cfg }) {
  return (
    <section id="faqs" aria-labelledby="faq-title" className="section">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <SectionHead kicker="FAQs" id="faq-title" title="Questions before you book" />
        </div>
        <div className="border-t border-hls-line">
          {faqItems(cfg).map(([q, a]) => (
            <details key={q} className="group border-b border-hls-line">
              <summary className="flex min-h-[56px] cursor-pointer items-center justify-between gap-6 py-5 text-[17px] font-medium md:text-[18px]">
                {q}
                <span aria-hidden="true" className="faq-sign flex-none text-[24px] leading-none text-hls-signal-dark transition-transform">
                  +
                </span>
              </summary>
              <div className="pb-6 text-hls-muted">{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
