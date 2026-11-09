/**
 * The one statistic /story is allowed to show. Edit it here, or set
 * SHOW_STAT to false to drop the number and its label from the page.
 */
export const SHOW_STAT = true;

export const STAT_VALUE = '12%';

export const STAT_LABEL =
  'OF CA FINAL GROUP 1 CANDIDATES PASSED · MAY 2026 · SOURCE: ICAI RESULT';

/*
 * Every primary call to action on /story: Moment C's pop-up and the close.
 * Wording pending founder approval; CTA_SUBLINE must match what the landing
 * page says happens next.
 */
export const CTA_LABEL = 'Find out which one is yours';

export const CTA_SUBLINE =
  'A mentor calls you within 24 hours. The call is free and there’s no obligation. Your number is only used for this call.';

/*
 * Proof, shown in a slim strip after the founder scene. Fill only with
 * founder-approved text and written permission. Empty items render nothing
 * (or a dashed placeholder when NEXT_PUBLIC_SHOW_PLACEHOLDERS is "true").
 */
export const CREDENTIAL_LINE = null;

/** Up to two are shown. Each: { quote, name, attempt }. */
export const TESTIMONIALS = [];

/*
 * The Himakanth section on /story, pending founder approval.
 * {n} is filled with 100 minus the rounded STAT_VALUE (88 for 12%). With
 * SHOW_STAT false the stat line is left out. No em or en dashes.
 */
export const HIMAKANTH_LABEL = 'Why he does this';

export const HIMAKANTH_STAT_LINE = 'In May 2026, {n} out of every 100 students who sat Group 1 didn’t clear it.';

export const HIMAKANTH_QUOTE =
  'My aim is simple. I want more of the students I work with out of that {n}. I can’t write your paper for you, and nobody honest can promise you a result. What I can do is make sure you walk into that hall knowing what to study, how to write it, and how to use every minute.';

export const HIMAKANTH_SIGNATURE = 'CA Himakanth Andhavarapu';

export const HIMAKANTH_QUESTION = 'Do you want to be one of them?';
