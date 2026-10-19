import { listSlots } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { json, rateLimited } from '@/lib/book/http';
import { getPublicConfig } from '@/lib/book/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (rateLimited(request, 'slots', { limit: 60, windowMs: 60 * 1000 })) {
    return json({ error: 'Too many requests.' }, 429);
  }
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const token = url.searchParams.get('token');
  const own = leadId && checkToken(leadId, token) ? leadId : null;
  const slots = await listSlots(own);
  return json({ synthetic: getPublicConfig().slotsSynthetic, slots });
}
