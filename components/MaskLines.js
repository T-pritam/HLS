'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initGsap, reducedMotion } from '@/lib/motion';

/**
 * Line by line reveal, each line uncovered by a clip-path mask travelling up.
 * `lines` is an array of strings, or of arrays of tokens { text, accent }.
 * Set auto={false} when a parent timeline drives the .js-mask children.
 */
export default function MaskLines({
  lines,
  as: Tag = 'p',
  className = '',
  lineClassName = '',
  accentClassName = 'text-hls-signal',
  stagger = 0.15,
  duration = 1,
  delay = 0,
  start = 'top 80%',
  auto = true,
}) {
  const root = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    const el = root.current;
    if (!el || !auto || reducedMotion()) return;

    const targets = el.querySelectorAll('.js-mask');
    const st = ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () =>
        gsap.to(targets, {
          clipPath: 'inset(0 0 -10% 0)',
          duration,
          ease: 'expo.out',
          stagger,
          delay,
        }),
    });

    return () => st.kill();
  }, [lines, stagger, duration, delay, start, auto]);

  return (
    <Tag ref={root} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`js-mask block ${lineClassName}`}>
          {typeof line === 'string'
            ? line
            : line.map((t, ti) => (
                <span key={ti} className={t.accent ? accentClassName : undefined}>
                  {t.text}
                </span>
              ))}
        </span>
      ))}
    </Tag>
  );
}
