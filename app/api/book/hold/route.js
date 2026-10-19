import { z } from 'zod';
import { holdSlot, releaseHold } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { holdSchema, leadRef } from '@/lib/book/schema';
import { json, rateLimited, readJson } from '@/lib/book/http';

export const runtime = 'nodejs';

const holdReason = z.enum(['cancelled', 'released', 'failed']).default('released');

const MESSAGES = {
  slot_taken: 'Someone has just taken that slot. Please choose another.',
  day_full: 'That day is now full. Please choose another day.',
  slot_unknown: 'That slot is no longer available. Please choose another.',
  already_booked: 'You already have a booking.',
  lead_unknown: 'We could not find your details. Please start again.',
};

/** Holds a slot for this lead for a few minutes (replacing any earlier hold). */
export async function POST(request) {
  if (rateLimited(request, 'hold', { limit: 40, windowMs: 60 * 1000 })) return json({ error: 'Too many requests.' }, 429);
  const { body, error } = await readJson(request);
  if (error) return error;
  const parsed = holdSchema.safeParse(body);
  if (!parsed.success || !checkToken(parsed.data.leadId, parsed.data.token)) {
    return json({ error: 'Please start again.' }, 401);
  }
  const res = await holdSlot(parsed.data.leadId, parsed.data.slotId);
  if (res.error) return json({ error: MESSAGES[res.error] ?? 'Please try again.', code: res.error, status: res.status ?? null }, 409);
  return json(res);
}

/** Releases the lead's hold (checkout cancelled or slot changed). */
export async function DELETE(request) {
  const { body, error } = await readJson(request);
  if (error) return error;
  const parsed = leadRef.extend({ reason: holdReason }).safeParse(body);
  if (!parsed.success || !checkToken(parsed.data.leadId, parsed.data.token)) {
    return json({ error: 'Please start again.' }, 401);
  }
  const status = await releaseHold(parsed.data.leadId, parsed.data.reason);
  return json({ status });
}
