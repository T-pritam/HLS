import { z } from 'zod';
import { refundLead } from '@/lib/book/booking';
import { isAdmin, json } from '@/lib/book/http';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';

const schema = z.object({ leadId: z.string().min(6).max(40), reason: z.string().max(200).optional() });

/** Admin: full refund of a lead's payment (test mode). Needs BOOK_ADMIN_TOKEN. */
export async function POST(request) {
  if (!isAdmin(request)) return json({ error: 'Not found.' }, 404);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid request.' }, 422);
  try {
    const res = await refundLead(parsed.data.leadId, parsed.data.reason);
    if (res.error) return json({ error: res.error }, 409);
    return json(res);
  } catch (err) {
    log.error('refund.failed', { leadId: parsed.data.leadId, error: err?.error?.description ?? err.message });
    return json({ error: 'Refund failed.' }, 502);
  }
}
