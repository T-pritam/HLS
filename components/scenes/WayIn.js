'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import WordReveal, { toWords } from '@/components/WordReveal';
import { chamfer } from '@/lib/circuit';
import {
  afterFirstInput,
  initGsap,
  LANDING_URL,
  onResize,
  reducedMotion,
  refreshSoon,
} from '@/lib/motion';

const CONSULTATION = 'THE BLUEPRINT CONSULTATION';
const PROGRAMME = 'THE SCORE IMPROVEMENT PROGRAMME';

const STEPS = [
  { n: '01', line: 'We read your attempt.' },
  { n: '02', line: 'You get a blueprint.' },
  { n: '03', line: 'We work on it, one to one.' },
];

// Between the teacher (2) and the close (1).
const PRIORITY = 1.5;

/** The jog the trace makes where the consultation hands over to the programme. */
const JOG = 18;

function Label({ text, className = '' }) {
  return (
    <div data-group className={`pl-12 md:pl-0 ${className}`}>
      <p className="kicker text-hls-signal">{text}</p>
      <span data-bracket className="mt-3 block h-px w-full origin-left bg-hls-signal/30" />
    </div>
  );
}

function Step({ n, line, className = '' }) {
  return (
    <div data-step className={`relative pl-12 md:pl-0 ${className}`}>
      <span
        data-node
        className="absolute left-[10px] top-[2px] block h-[14px] w-[14px] rounded-full border border-hls-signal/60 bg-hls-black md:relative md:left-0 md:top-0"
      >
        <i className="absolute inset-[3px] rounded-full bg-[#cfe5f8] shadow-[0_0_6px_1px_rgba(150,200,240,0.9),0_0_16px_4px_rgba(18,115,194,0.8)]" />
      </span>
      <p data-num className="meta text-hls-mist md:mt-6">
        {n}
      </p>
      <WordReveal
        as="p"
        mode="manual"
        lines={[toWords(line)]}
        className="mt-2 font-display text-[clamp(28px,min(3vw,5.4vh),46px)] font-normal leading-[1.1] tracking-[-0.02em] text-hls-platinum [text-wrap:balance] md:mt-3"
      />
    </div>
  );
}

const BUTTON =
  'group relative inline-flex items-center gap-3 px-6 py-4 font-mono text-[12px] font-medium uppercase leading-none tracking-[0.18em] transition-opacity duration-300 hover:opacity-90 md:px-7 md:text-[13px]';

export default function WayIn() {
  const stage = useRef(null);
  const svg = useRef(null);
  const cards = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    let ctx;
    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const st = stage.current;
        const s = svg.current;
        const box = st.getBoundingClientRect();
        s.setAttribute('viewBox', `0 0 ${st.clientWidth} ${st.clientHeight}`);

        // The trace runs through the nodes where the layout actually put
        // them: across on wide screens, down the gutter on narrow ones.
        const nodes = [...st.querySelectorAll('[data-node]')];
        const c = nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
        });
        const across = Math.abs(c[1][0] - c[0][0]) > Math.abs(c[1][1] - c[0][1]);
        // The jog sits in the gap between step 02 and step 03, where one
        // offer ends and the other begins.
        const [r2, r3] = [...st.querySelectorAll('[data-step]')]
          .slice(1)
          .map((el) => el.getBoundingClientRect());
        let handover;
        if (across) {
          const m = (r2.right + r3.left) / 2 - box.left;
          const y = c[1][1];
          handover = [c[1], [m - JOG, y], [m - JOG, y + JOG], [m + JOG, y + JOG], [m + JOG, y], c[2]];
        } else {
          const m = (r2.bottom + r3.top) / 2 - box.top;
          const x = c[1][0];
          handover = [c[1], [x, m - JOG], [x + JOG * 0.8, m - JOG], [x + JOG * 0.8, m + JOG], [x, m + JOG], c[2]];
        }
        const dA = chamfer([c[0], c[1]]);
        const dB = chamfer(handover, 7);
        s.querySelectorAll('[data-seg="a"]').forEach((p) => p.setAttribute('d', dA));
        s.querySelectorAll('[data-seg="b"]').forEach((p) => p.setAttribute('d', dB));

        const pathA = s.querySelector('[data-seg="a"]');
        const pathB = s.querySelector('[data-seg="b"]');
        const lenA = pathA.getTotalLength();
        const lenB = pathB.getTotalLength();
        const litA = s.querySelectorAll('[data-lit="a"]');
        const litB = s.querySelectorAll('[data-lit="b"]');
        gsap.set(litA, { strokeDasharray: `${lenA} ${lenA}`, strokeDashoffset: lenA });
        gsap.set(litB, { strokeDasharray: `${lenB} ${lenB}`, strokeDashoffset: lenB });

        const head = s.querySelector('[data-head]');
        const flow = { a: 0, b: 0 };
        const render = () => {
          litA.forEach((p) => {
            p.style.strokeDashoffset = `${lenA * (1 - flow.a)}`;
          });
          litB.forEach((p) => {
            p.style.strokeDashoffset = `${lenB * (1 - flow.b)}`;
          });
          const pt =
            flow.b > 0 ? pathB.getPointAtLength(lenB * flow.b) : pathA.getPointAtLength(lenA * flow.a);
          head.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        };

        const lit = nodes.map((n) => n.querySelector('i'));
        const nums = [...st.querySelectorAll('[data-num]')];
        const words = [...st.querySelectorAll('[data-step]')].map((el) =>
          el.querySelectorAll('.js-word-inner')
        );
        const groups = [...st.querySelectorAll('[data-group]')];
        const labels = groups.map((g) => g.querySelector('p'));
        const brackets = groups.map((g) => g.querySelector('[data-bracket]'));

        gsap.set(lit, { opacity: 0 });
        gsap.set(nums, { opacity: 0 });
        gsap.set(labels, { opacity: 0, y: 10 });
        gsap.set(brackets, { scaleX: 0 });
        gsap.set(head, { opacity: 0 });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          onUpdate: render,
          scrollTrigger: {
            trigger: st,
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            refreshPriority: PRIORITY,
          },
        });

        const group = (i, at) => {
          tl.to(labels[i], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at);
          tl.to(brackets[i], { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, at + 0.1);
        };
        const arrive = (i, at) => {
          tl.to(lit[i], { keyframes: { opacity: [0, 1, 0.3, 1] }, duration: 0.4 }, at);
          tl.to(nums[i], { opacity: 1, duration: 0.3 }, at);
          tl.fromTo(
            words[i],
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 },
            at + 0.1
          );
        };

        // The consultation: we read it, then the current carries it to the
        // blueprint.
        group(0, 0);
        arrive(0, 0.4);
        tl.to(head, { opacity: 1, duration: 0.1 }, 1.2);
        tl.to(flow, { a: 1, duration: 1, ease: 'power1.inOut' }, 1.2);
        tl.to(head, { opacity: 0, duration: 0.15 }, 2.2);
        arrive(1, 2.2);

        // It jogs across into the programme and lands on the work itself.
        group(1, 2.9);
        tl.to(head, { opacity: 1, duration: 0.1 }, 3.2);
        tl.to(flow, { b: 1, duration: 1.1, ease: 'power1.inOut' }, 3.2);
        tl.to(head, { opacity: 0, duration: 0.15 }, 4.3);
        arrive(2, 4.3);
        tl.to({}, { duration: 1 });

        render();

        // The cards rise in once, unless a rebuild finds them already passed.
        const cardEls = cards.current.querySelectorAll('[data-card]');
        const traces = cards.current.querySelectorAll('[data-card-trace]');
        if (cards.current.getBoundingClientRect().top > window.innerHeight * 0.82) {
          gsap.set(cardEls, { opacity: 0, y: 32 });
          gsap.set(traces, { scaleX: 0 });
          ScrollTrigger.create({
            trigger: cards.current,
            start: 'top 82%',
            once: true,
            refreshPriority: PRIORITY,
            onEnter: () => {
              gsap.to(cardEls, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12 });
              gsap.to(traces, { scaleX: 1, duration: 1.1, ease: 'expo.inOut', stagger: 0.12, delay: 0.1 });
            },
          });
        }
      }, stage.current.closest('section'));
    };

    let off = () => {};
    const cancel = afterFirstInput(PRIORITY, () => {
      build();
      off = onResize(() => {
        build();
        refreshSoon();
      });
    });

    return () => {
      cancel();
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <section id="the-way-in" aria-label="The Way In" className="relative w-full bg-hls-black">
      <div
        ref={stage}
        className="cv-auto rm-flow rm-pad relative flex h-[100svh] w-full items-center overflow-hidden"
      >
        <svg
          ref={svg}
          className="rm-hide pointer-events-none absolute inset-0 h-full w-full"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <radialGradient id="way-head">
              <stop offset="0" stopColor="#F4FAFF" stopOpacity="1" />
              <stop offset="0.25" stopColor="#6AAEE6" stopOpacity="0.7" />
              <stop offset="1" stopColor="#1273C2" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* The route, dim, then the current that draws along it. */}
          <path data-seg="a" stroke="#1273C2" strokeOpacity="0.22" strokeWidth="1.5" />
          <path data-seg="b" stroke="#1273C2" strokeOpacity="0.22" strokeWidth="1.5" />
          {['a', 'b'].map((seg) => (
            <g key={seg}>
              <path data-seg={seg} data-lit={seg} stroke="#1273C2" strokeOpacity="0.3" strokeWidth="6" />
              <path data-seg={seg} data-lit={seg} stroke="#6AAEE6" strokeWidth="1.6" />
            </g>
          ))}
          <g data-head>
            <circle r="20" fill="url(#way-head)" />
            <circle r="2.4" fill="#F4FAFF" />
          </g>
        </svg>

        <div className="relative mx-auto w-full max-w-[1200px] px-5 md:px-10">
          {/* Stacked on narrow screens in reading order. On wide screens the
              labels share a row above the three steps. */}
          <div className="flex flex-col gap-y-8 md:grid md:grid-cols-3 md:gap-x-12 md:gap-y-10">
            <Label text={CONSULTATION} className="md:col-span-2 md:col-start-1 md:row-start-1 md:self-end" />
            <Step {...STEPS[0]} className="md:col-start-1 md:row-start-2" />
            <Step {...STEPS[1]} className="md:col-start-2 md:row-start-2" />
            <Label text={PROGRAMME} className="mt-4 md:col-start-3 md:row-start-1 md:mt-0 md:self-end" />
            <Step {...STEPS[2]} className="md:col-start-3 md:row-start-2" />
          </div>
        </div>
      </div>

      <div
        ref={cards}
        className="cv-auto mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-5 pb-[clamp(96px,16vh,160px)] md:grid-cols-2 md:gap-8 md:px-10"
      >
        {/* The consultation is the first step, so it carries the solid button
            and the brighter edge. */}
        <article data-card className="relative flex flex-col border border-hls-signal/45 p-7 md:p-10">
          <span
            data-card-trace
            aria-hidden="true"
            className="absolute -top-px left-0 block h-px w-full origin-left bg-hls-signal shadow-[0_0_10px_1px_rgba(18,115,194,0.8)]"
          />
          <h3
            id="way-in-consultation"
            className="font-display text-[clamp(28px,2.6vw,40px)] font-normal leading-[1.08] tracking-[-0.02em] text-hls-platinum"
          >
            The Blueprint Consultation
          </h3>
          <p className="mt-5 max-w-[46ch] font-body text-[16px] leading-[1.6] text-hls-platinum/75 md:text-[17px]">
            A one-to-one conversation about your attempt, and a personal score-improvement blueprint
            to take away.
          </p>
          <div className="mt-auto pt-10">
            <a
              href={LANDING_URL}
              aria-describedby="way-in-consultation"
              className={`${BUTTON} bg-hls-signal text-hls-black`}
            >
              <span>See the details</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </article>

        <article data-card className="relative flex flex-col border border-hls-mist/20 p-7 md:p-10">
          <span
            data-card-trace
            aria-hidden="true"
            className="absolute -top-px left-0 block h-px w-full origin-left bg-hls-signal/50"
          />
          <h3
            id="way-in-programme"
            className="font-display text-[clamp(28px,2.6vw,40px)] font-normal leading-[1.08] tracking-[-0.02em] text-hls-platinum"
          >
            The Score Improvement Programme
          </h3>
          <p className="mt-5 max-w-[46ch] font-body text-[16px] leading-[1.6] text-hls-platinum/75 md:text-[17px]">
            Online. For CA Final Group 1 repeaters preparing for May 2027. Financial Reporting,
            Advanced Financial Management and Audit, with one-to-one attention to how you prepare
            and perform.
          </p>
          <p className="mt-6 max-w-[46ch] border-t border-hls-mist/15 pt-5 font-body text-[15px] leading-[1.6] text-hls-mist">
            Discussed with a counsellor after your consultation, if it fits.
          </p>
          <div className="mt-auto pt-10">
            <a
              href={LANDING_URL}
              aria-describedby="way-in-programme"
              className={`${BUTTON} border border-hls-signal text-hls-platinum`}
            >
              <span>See the details</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
