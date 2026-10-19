import Todo from './Todo';
import { hasContact } from './Contact';
import { Inr } from './format';
import { approvedTestimonials, mentor, mentorReady } from '@/lib/book/content';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Kicker({ children, className = 'text-hls-signal-dark' }) {
  return <p className={`label ${className}`}>{children}</p>;
}

/** The consultation's confirmed facts, plus any optional ones that are set. */
export function AtAGlance({ cfg }) {
  const rows = [
    ['Format', 'One-to-one conversation'],
    ['You leave with', 'A written score-improvement blueprint'],
    [
      'Price',
      <>
        <Inr amount={cfg.priceInr} />, {cfg.taxLabel}
      </>,
    ],
    cfg.durationMin && ['Length', `About ${cfg.durationMin} minutes`],
    cfg.consultationMode && ['Held', cfg.consultationMode],
    cfg.consultantName && ['With', cfg.consultantName],
    ['For', 'CA Final Group 1 repeaters'],
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-hls-line bg-white p-6 shadow-[0_1px_0_rgba(16,32,48,0.04)] md:p-8">
      <p className="label text-hls-muted">The consultation at a glance</p>
      <dl className="mt-4 divide-y divide-hls-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-4 py-3 text-[16px]">
            <dt className="text-hls-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {cfg.showTodoMarkers && (
        <p className="mt-3 flex flex-wrap gap-2">
          {!cfg.durationMin && <Todo show>duration</Todo>}
          {!cfg.consultationMode && <Todo show>consultation mode</Todo>}
          {!cfg.consultantName && <Todo show>consultant name</Todo>}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The problem                                                      */
/* ------------------------------------------------------------------ */

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="section bg-hls-wash">
      <div className="wrap">
        <Kicker>The problem</Kicker>
        <h2 id="problem-title" className="h-section mt-4 max-w-3xl">
          Marks are lost in two places.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-10">
          <div className="border-t-2 border-hls-navy pt-5">
            <h3 className="text-[26px] leading-tight">What you didn&rsquo;t know.</h3>
            <p className="mt-3 text-hls-muted">
              The gaps in what you studied: a concept half-learned, a standard misread, a topic left for later.
            </p>
          </div>
          <div className="border-t-2 border-hls-signal pt-5">
            <h3 className="text-[26px] leading-tight">What you didn&rsquo;t do.</h3>
            <p className="mt-3 text-hls-muted">
              What you knew but did not get onto the paper: the answer you could not recall in time, the
              presentation that lost marks, the paper you ran out of time on.
            </p>
          </div>
        </div>
        <p className="lede mt-10">
          Studying harder in the same way does not show you which of the two it was for you. Finding that out is
          the first step.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The consultation                                                 */
/* ------------------------------------------------------------------ */

const BRING = ['Your previous marksheets', 'Your current or intended attempt', 'Recent mock papers'];
const GET = ['Where you stand', 'The specific gaps', 'Your priorities', 'A realistic plan for your next steps'];
const NOT = ['A guaranteed pass or a promised mark gain', 'Any obligation to enrol in a programme'];

function List({ items, mark }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span aria-hidden="true" className="label mt-[5px] w-4 flex-none text-hls-signal-dark">
            {mark}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Consultation({ cfg }) {
  const details = [
    cfg.durationMin && ['Length', `About ${cfg.durationMin} minutes`],
    cfg.blueprintFormat && ['Blueprint format', cfg.blueprintFormat],
    cfg.blueprintTurnaround && ['Blueprint delivered', cfg.blueprintTurnaround],
  ].filter(Boolean);

  return (
    <section id="consultation" aria-labelledby="consultation-title" className="section">
      <div className="wrap">
        <Kicker>The Blueprint Consultation</Kicker>
        <h2 id="consultation-title" className="h-section mt-4 max-w-3xl">
          One conversation about your attempt. A blueprint you keep.
        </h2>
        <p className="lede mt-5">
          A one-to-one conversation that ends in a written score-improvement blueprint. It is meant to be useful
          whether or not you ever join a programme.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <div>
            <h3 className="text-[24px]">Bring</h3>
            <List items={BRING} mark="→" />
            <p className="mt-4 text-[15px] text-hls-muted">
              You share these through a private link after booking, never on this page.
            </p>
          </div>
          <div>
            <h3 className="text-[24px]">Get</h3>
            <List items={GET} mark="✓" />
          </div>
          <div>
            <h3 className="text-[24px]">Not</h3>
            <List items={NOT} mark="✕" />
          </div>
        </div>

        <p className="mt-12 max-w-3xl border-l-2 border-hls-signal pl-5 text-[18px]">
          The blueprint looks at five places: what to study, how to study, how to recall, how to present, and how
          to perform under pressure.
        </p>

        {details.length > 0 && (
          <dl className="mt-10 grid gap-4 sm:grid-cols-3">
            {details.map(([k, v]) => (
              <div key={k} className="rounded-md bg-hls-wash p-4">
                <dt className="label text-hls-muted">{k}</dt>
                <dd className="mt-2 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {cfg.showTodoMarkers && (
          <p className="mt-6 flex flex-wrap gap-2">
            {!cfg.blueprintFormat && <Todo show>blueprint format</Todo>}
            {!cfg.blueprintTurnaround && <Todo show>blueprint turnaround</Todo>}
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. What happens next                                                */
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
    <section aria-labelledby="next-title" className="section bg-hls-wash">
      <div className="wrap">
        <Kicker>What happens next</Kicker>
        <h2 id="next-title" className="h-section mt-4">
          From booking to blueprint.
        </h2>
        <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="border-t border-hls-line pt-5">
              <span className="label text-hls-signal-dark">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 text-[22px] leading-snug">{title}</h3>
              <p className="mt-2 text-hls-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-2xl font-medium">
          The consultation is bought on its own. Booking it does not enrol you in anything.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The programme                                                    */
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
      <div className="wrap">
        <Kicker className="text-[#8ec3ef]">The Score Improvement Programme</Kicker>
        <h2 id="programme-title" className="h-section mt-4 max-w-3xl text-white">
          If it fits, there is a programme.
        </h2>
        <p className="mt-5 max-w-2xl text-[18px]">Online. For CA Final Group 1 repeaters. Four components:</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {COMPONENTS.map(([name, note]) => (
            <li key={name} className="rounded-md border border-white/15 p-5">
              <p className="font-display text-[22px] leading-snug text-white">{name}</p>
              {note && <p className="mt-2 text-[16px] text-hls-platinum/85">{note}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl">
          The programme is discussed with a counsellor after your consultation, if it fits. Its cost is shared on
          that call.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. The mentor (approved content only)                               */
/* ------------------------------------------------------------------ */

export function Mentor({ cfg }) {
  if (!mentorReady()) {
    // A labelled placeholder in development; omitted in production until approved.
    if (!cfg.showTodoMarkers) return null;
    return (
      <section aria-labelledby="mentor-title" className="section">
        <div className="wrap">
          <Kicker>The mentor</Kicker>
          <h2 id="mentor-title" className="h-section mt-4">
            The mentor
          </h2>
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
          <Kicker>The mentor</Kicker>
          <h2 id="mentor-title" className="h-section mt-4">
            {mentor.name}
          </h2>
          {mentor.credentials && <p className="mt-2 text-hls-muted">{mentor.credentials}</p>}
          <p className="lede mt-5">{mentor.bio}</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Proof (only genuine, permission-cleared testimonials)            */
/* ------------------------------------------------------------------ */

export function Proof() {
  const items = approvedTestimonials();
  if (!items.length) return null;
  return (
    <section aria-labelledby="proof-title" className="section bg-hls-wash">
      <div className="wrap">
        <Kicker>In their words</Kicker>
        <h2 id="proof-title" className="h-section mt-4">
          From students who took the consultation
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {items.map((t) => (
            <li key={t.quote} className="rounded-md bg-white p-6">
              <blockquote className="font-display text-[22px] leading-snug">&ldquo;{t.quote}&rdquo;</blockquote>
              <p className="mt-4 text-[15px] text-hls-muted">
                {t.name}
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
/* 8. FAQ                                                              */
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
    <section aria-labelledby="faq-title" className="section">
      <div className="wrap grid gap-10 md:grid-cols-[1fr_2fr]">
        <div>
          <Kicker>Questions</Kicker>
          <h2 id="faq-title" className="h-section mt-4">
            Before you book
          </h2>
        </div>
        <div className="border-t border-hls-line">
          {faqItems(cfg).map(([q, a]) => (
            <details key={q} className="group border-b border-hls-line">
              <summary className="flex min-h-[56px] cursor-pointer items-center justify-between gap-6 py-4 text-[18px] font-medium">
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

