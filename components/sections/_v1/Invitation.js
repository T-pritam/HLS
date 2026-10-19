'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import WordReveal from '@/components/WordReveal';
import { initGsap, reducedMotion } from '@/lib/motion';

// Archived with v1. lib/motion.js now exports LANDING_URL instead.
const WHATSAPP = 'https://wa.me/917075985970';

const HEADLINE = [
  [{ text: 'One' }, { text: 'Last' }, { text: 'Attempt.' }],
  [
    { text: 'One', accent: true },
    { text: 'Real', accent: true },
    { text: 'Method.', accent: true },
  ],
];

const PROGRAMS = [
  { name: 'Navadeepa', body: 'Residential mentorship. Hyderabad. Gurukul format.' },
  { name: 'SIP', body: 'Online score improvement program. Cohort based.' },
  { name: 'The Five-Day', body: 'In-person audit bootcamp. Refundable deposit.' },
];

function InstagramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1.5" y="1.5" width="13" height="13" rx="4" stroke="#1273C2" strokeWidth="1" />
      <circle cx="8" cy="8" r="3.25" stroke="#1273C2" strokeWidth="1" />
      <circle cx="11.9" cy="4.1" r="0.85" fill="#1273C2" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="3.5" width="14" height="9" rx="2.5" stroke="#1273C2" strokeWidth="1" />
      <path d="M6.9 6.2 L10.1 8 L6.9 9.8 Z" stroke="#1273C2" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

const CONTACT = [
  { text: 'PHONE / WHATSAPP · +91 7075985970' },
  { text: 'EMAIL · mentorshipbyhim@gmail.com' },
  { text: 'INSTAGRAM · @ca.himakanthandhavarapu', Icon: InstagramIcon },
  { text: 'YOUTUBE · @HIMLIFESCHOOL', Icon: YouTubeIcon },
  { text: 'HYDERABAD, INDIA' },
];

export default function Invitation() {
  const section = useRef(null);
  const body = useRef(null);
  const cta = useRef(null);
  const programs = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        body.current,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'expo.out',
          delay: 0.5,
          scrollTrigger: { trigger: body.current, start: 'top 85%', once: true },
        }
      );

      gsap.fromTo(
        cta.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: 'expo.out',
          delay: 0.75,
          scrollTrigger: { trigger: cta.current, start: 'top 90%', once: true },
          onComplete: () => {
            gsap.to(cta.current, {
              opacity: 0.9,
              duration: 1.2,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
              repeatDelay: 1.6,
            });
          },
        }
      );

      gsap.fromTo(
        programs.current.querySelectorAll('.js-program'),
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.15,
          scrollTrigger: { trigger: programs.current, start: 'top 85%', once: true },
        }
      );
    }, section);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="invitation"
      className="relative w-full bg-hls-black px-5 pb-20 pt-28 text-hls-platinum md:px-10 md:pb-24 md:pt-32"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Invitation */}
        <div className="flex min-h-[calc(100svh-200px)] flex-col items-center justify-center text-center">
          <div className="flex items-center gap-5">
            <span className="kicker text-hls-signal">06 · The Invitation</span>
            <span className="block h-px w-[60px] bg-hls-signal" />
          </div>

          <WordReveal
            as="h2"
            lines={HEADLINE}
            stagger={0.1}
            duration={1}
            start="top 82%"
            className="display mt-12 text-[clamp(48px,min(10vw,22vh),160px)] md:mt-16"
          />

          <p
            ref={body}
            className="js-fade mt-10 max-w-[640px] font-body text-[17px] font-medium leading-[1.6] text-hls-platinum/75 md:mt-14 md:text-[20px]"
          >
            This is not for everyone. Fifteen residential seats per cohort. Small numbers, on
            purpose. If you are in your last real attempt, this is the conversation to have.
          </p>

          <a
            ref={cta}
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="js-fade group relative mt-14 inline-flex items-center gap-3 bg-hls-signal px-6 py-5 font-mono text-[12px] font-medium uppercase leading-none tracking-[0.2em] text-hls-black sm:gap-4 sm:px-9 sm:py-6 sm:text-[13px] md:mt-16 md:px-12 md:py-7 md:text-[14px] md:tracking-[0.22em]"
          >
            <span>Start the conversation</span>
            <span aria-hidden="true">&rarr;</span>

            {/* Circuit trace runs the perimeter on hover */}
            <svg
              className="pointer-events-none absolute -inset-[12px] overflow-visible"
              width="100%"
              height="100%"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                pathLength="100"
                stroke="#1273C2"
                strokeWidth="1"
                className="cta-trace"
              />
            </svg>
          </a>
        </div>

        {/* Programs */}
        <div className="mt-28 flex flex-col items-center md:mt-36">
          <span className="block h-px w-[60px] bg-hls-signal" />
          <span className="kicker mt-10 text-hls-mist">Three ways to work with us</span>
        </div>

        <div
          ref={programs}
          className="mt-16 grid grid-cols-1 gap-14 border-t border-hls-mist/15 pt-16 md:mt-20 md:grid-cols-3 md:gap-12 md:pt-20"
        >
          {PROGRAMS.map((p) => (
            <div key={p.name} className="js-program js-fade">
              <h3 className="kicker text-hls-signal">{p.name}</h3>
              <p className="mt-6 max-w-[320px] font-body text-[17px] leading-[1.6] text-hls-platinum/75">
                {p.body}
              </p>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-8 inline-flex items-center gap-3 font-body text-[16px] font-medium text-hls-platinum transition-colors duration-500 hover:text-hls-signal"
              >
                <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
                  &rarr;
                </span>
                <span className="border-b border-hls-mist/40 pb-1 transition-colors duration-500 group-hover:border-hls-signal">
                  Details on WhatsApp
                </span>
              </a>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-28 border-t border-hls-mist/15 pt-16 md:mt-36 md:pt-20">
          {/* Handles and the address keep their own casing, so no transform. */}
          <div className="space-y-3 font-mono text-[11px] font-normal leading-[1.8] tracking-[0.18em] text-hls-mist">
            {CONTACT.map(({ text, Icon }) => (
              <p key={text} className="flex items-center gap-3">
                {Icon ? <Icon /> : null}
                <span>{text}</span>
              </p>
            ))}
          </div>
        </div>

        <p className="mt-24 text-center font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-hls-slate md:mt-32">
          HIM LIFE SCHOOL · LEARN TO LIVE · 2026
        </p>
      </div>
    </section>
  );
}
