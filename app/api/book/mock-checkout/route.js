import { z } from 'zod';
import { mockCheckout } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { leadRef } from '@/lib/book/schema';
import { json, readJson } from '@/lib/book/http';
import { getPaymentMode } from '@/lib/book/config';

export const runtime = 'nodejs';

const schema = leadRef.extend({ outcome: z.enum(['success', 'fail']) });

/** Simulated checkout. Exists only when RAZORPAY_MODE=mock. */
export async function POST(request) {
  const payment = getPaymentMode();
  if (payment.mode !== 'mock' || !payment.ready) return json({ error: 'Not found.' }, 404);
  const { body, error } = await readJson(request);
  if (error) return error;
  const parsed = schema.safeParse(body);
  if (!parsed.success || !checkToken(parsed.data.leadId, parsed.data.token)) {
    return json({ error: 'Please start again.' }, 401);
  }
  const res = await mockCheckout(parsed.data.leadId, parsed.data.outcome);
  if (res.error) return json({ error: res.error }, 409);
  return json(res);
}
