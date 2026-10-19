import { verifyCheckout } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { verifySchema } from '@/lib/book/schema';
import { json, rateLimited, readJson } from '@/lib/book/http';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';

/** Checks the checkout signature server-side. Paid state still comes from Razorpay. */
export async function POST(request) {
  if (rateLimited(request, 'verify', { limit: 20, windowMs: 60 * 1000 })) return json({ error: 'Too many requests.' }, 429);
  const { body, error } = await readJson(request);
  if (error) return error;
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success || !checkToken(parsed.data.leadId, parsed.data.token)) {
    return json({ error: 'Please start again.' }, 401);
  }
  const d = parsed.data;
  try {
    const res = await verifyCheckout({
      leadId: d.leadId,
      orderId: d.razorpay_order_id,
      paymentId: d.razorpay_payment_id,
      signature: d.razorpay_signature,
    });
    if (res.error) return json({ error: 'We could not verify this payment.', code: res.error }, 400);
    return json(res);
  } catch (err) {
    log.error('verify.failed', { leadId: d.leadId, error: err.message });
    return json({ error: 'We could not verify this payment yet.', fallback: true }, 502);
  }
}
