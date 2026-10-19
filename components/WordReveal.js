'use client';

import { Fragment, useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initGsap, reducedMotion } from '@/lib/motion';

/** Splits a sentence into the token shape `lines` expects. */
export const toWords = (text, accent = false) =>
  text.split(' ').map((word) => ({ text: word, accent }));

/**
 * Headline reveal. Each word sits inside its own mask and rises into place.
 * `lines` is an array of arrays of tokens: { text, accent }.
 * mode "manual" renders the masks only, a parent timeline drives the
 * .js-word-inner children.
 * `prerender` ships the words already risen, so the first paint contains
 * them, and the effect drops them back before it plays. Only for copy that
 * something covers until then, like the hero under the preloader.
 */
export default function WordReveal({
  lines,
  as: Tag = 'h2',
  className = '',
  lineClassName = '',
  accentClassName = 'text-hls-signal',
  stagger = 0.08,
  duration = 0.9,
  delay = 0,
  mode = 'scroll',
  start = 'top 78%',
  prerender = false,
}) {
  const root = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    const el = root.current;
    if (!el || mode === 'manual' || reducedMotion()) return;

    const words = el.querySelectorAll('.js-word-inner');
    // Stated explicitly, GSAP resolves the CSS percentage transform to pixels
    // and a bare yPercent target would leave the words parked below the mask.
    const play = () =>
      gsap.fromTo(
        words,
        { y: 0, yPercent: 115 },
        {
          yPercent: 0,
          duration,
          ease: 'expo.out',
          stagger,
          delay,
          overwrite: true,
        }
      );

    if (mode === 'load') {
      const tw = play();
      return () => tw.kill();
    }

    const st = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: play });
    return () => st.kill();
  }, [lines, stagger, duration, delay, mode, start]);

  return (
    <Tag ref={root} className={className}>
      {lines.map((tokens, li) => (
        <span key={li} className={`block ${lineClassName}`}>
          {tokens.map((t, ti) => (
            <Fragment key={ti}>
              <span className="inline-block overflow-hidden pb-[0.18em] mb-[-0.18em] align-bottom">
                <span
                  className={`js-word-inner ${t.accent ? accentClassName : ''}`}
                  style={prerender ? { transform: 'none' } : undefined}
                >
                  {t.text}
                </span>
              </span>
              {ti < tokens.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </span>
      ))}
    </Tag>
  );
}
