'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

/** Register ScrollTrigger once, client side only. */
export function initGsap() {
  if (typeof window === 'undefined') return gsap;
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'expo.out' });
    registered = true;
  }
  return gsap;
}

export function reducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const WHATSAPP = 'https://wa.me/917075985970';
