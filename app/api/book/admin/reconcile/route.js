import { reconcileOpenOrders } from '@/lib/book/booking';
import { isAdmin, json } from '@/lib/book/http';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin: ask Razorpay about every open unpaid order (missed-webhook backstop). */
export async function POST(request) {
  if (!isAdmin(request)) return json({ error: 'Not found.' }, 404);
  try {
    return json(await reconcileOpenOrders());
  } catch (err) {
    log.error('reconcile.batch_failed', { error: err.message });
    return json({ error: 'Reconcile failed.' }, 502);
  }
}
