import { z } from 'zod';
import { ATTEMPT_VALUES, VARIANTS } from './attempts';

const shortText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Indian mobile numbers: 10 digits starting 6-9, with an optional +91 or 0. */
export function normaliseMobile(raw) {
  const digits = String(raw ?? '').replace(/[\s()-]/g, '');
  const match = digits.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  return match ? `+91${match[1]}` : null;
}

export const leadSchema = z.object({
  clientRequestId: z.string().uuid({ message: 'Please reload the page and try again.' }),
  name: z
    .string({ message: 'Please enter your name.' })
    .trim()
    .min(2, 'Please enter your name.')
    .max(80, 'Please keep your name under 80 characters.'),
  mobile: z
    .string({ message: 'Please enter your mobile number.' })
    .transform((v, ctx) => {
      const n = normaliseMobile(v);
      if (!n) {
        ctx.addIssue({ code: 'custom', message: 'Please enter a 10-digit Indian mobile number.' });
        return z.NEVER;
      }
      return n;
    }),
  email: z
    .string({ message: 'Please enter your email.' })
    .trim()
    .toLowerCase()
    .max(120)
    .email('Please enter a valid email address.'),
  attempt: z.enum(ATTEMPT_VALUES, { message: 'Please choose which attempt you are preparing for.' }),
  eligible: z.literal(true, { message: 'This consultation is for CA Final Group 1 repeaters.' }),
  privacyAccepted: z.literal(true, { message: 'Please confirm you have read the privacy notice.' }),
  marketing: z
    .object({
      email: z.boolean().default(false),
      whatsapp: z.boolean().default(false),
      sms: z.boolean().default(false),
    })
    .default({ email: false, whatsapp: false, sms: false }),
  variant: z.enum(VARIANTS).default('a'),
  source: z
    .object({
      src: shortText(60),
      utmSource: shortText(120),
      utmMedium: shortText(120),
      utmCampaign: shortText(160),
      utmContent: shortText(160),
      referrer: shortText(300),
    })
    .default({}),
  // Honeypot. People never see it; bots fill it.
  website: z.string().max(200).optional(),
});

export const leadRef = z.object({
  leadId: z.string().min(6).max(40),
  token: z.string().min(16).max(64),
});

export const holdSchema = leadRef.extend({ slotId: z.string().min(4).max(40) });

export const verifySchema = leadRef.extend({
  razorpay_order_id: z.string().min(4).max(60),
  razorpay_payment_id: z.string().min(4).max(60),
  razorpay_signature: z.string().min(16).max(200),
});

/** First message per field, for inline errors. */
export function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ?? 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
