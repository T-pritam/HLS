import { handleWebhook } from '@/lib/book/booking';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook: the source of truth for paid state. The signature is
 * checked over the raw body, exactly as received.
 */
export async function POST(request) {
  const raw = await request.text();
  try {
    const res = await handleWebhook(
      raw,
      request.headers.get('x-razorpay-signature'),
      request.headers.get('x-razorpay-event-id'),
    );
    return Response.json(res.body, { status: res.status });
  } catch (err) {
    // 5xx makes Razorpay retry; the event was not marked as seen.
    log.error('webhook.failed', { error: err.message });
    return Response.json({ error: 'processing failed' }, { status: 500 });
  }
}
