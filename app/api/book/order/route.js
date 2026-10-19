import { startPayment } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { leadRef } from '@/lib/book/schema';
import { injectedFault, json, rateLimited, readJson } from '@/lib/book/http';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';

const MESSAGES = {
  hold_expired: 'Your slot hold has expired. Please choose a slot again.',
  slot_taken: 'Someone has just taken that slot. Please choose another.',
  lead_unknown: 'We could not find your details. Please start again.',
  payments_unavailable: 'Online payment is not available right now.',
};

/**
 * Creates or reuses the Razorpay order for this lead. The body carries only
 * the lead reference: the amount is set on the server.
 */
export async function POST(request) {
  if (rateLimited(request, 'order', { limit: 20, windowMs: 60 * 1000 })) return json({ error: 'Too many requests.' }, 429);
  const { body, error } = await readJson(request);
  if (error) return error;
  const parsed = leadRef.safeParse(body);
  if (!parsed.success || !checkToken(parsed.data.leadId, parsed.data.token)) {
    return json({ error: 'Please start again.' }, 401);
  }
  try {
    if (injectedFault(request, 'payment')) throw new Error('Injected payment failure');
    const res = await startPayment(parsed.data.leadId);
    if (res.error) {
      const status = res.error === 'payments_unavailable' ? 503 : 409;
      return json({ error: MESSAGES[res.error] ?? 'Please try again.', code: res.error, fallback: status === 503 }, status);
    }
    return json(res);
  } catch (err) {
    log.error('order.failed', { leadId: parsed.data.leadId, error: err?.error?.description ?? err.message });
    return json({ error: 'We could not start the payment.', code: 'payment_error', fallback: true }, 502);
  }
}
