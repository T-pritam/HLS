import { getLead, publicStatus, reconcile } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { json, rateLimited } from '@/lib/book/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Booking state for the confirmation page, read from the server's records. */
export async function GET(request) {
  if (rateLimited(request, 'status', { limit: 120, windowMs: 60 * 1000 })) return json({ error: 'Too many requests.' }, 429);
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId') ?? '';
  const token = url.searchParams.get('token') ?? '';
  if (!leadId || !checkToken(leadId, token)) return json({ error: 'Not found.' }, 404);
  await reconcile(leadId);
  const lead = await getLead(leadId);
  if (!lead) return json({ error: 'Not found.' }, 404);
  return json({ status: publicStatus(lead) });
}
