import { listLeads } from '@/lib/book/booking';
import { isAdmin, json } from '@/lib/book/http';
import { log } from '@/lib/book/log';
import { sheetsConfigured } from '@/lib/book/sheets-client';
import { syncAllToSheet } from '@/lib/book/sheets-mirror';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Admin: copy every lead to the Google Sheet (repair after a Sheets outage). */
export async function POST(request) {
  if (!isAdmin(request)) return json({ error: 'Not found.' }, 404);
  if (!sheetsConfigured()) return json({ error: 'Google Sheets is not configured.' }, 409);
  try {
    return json({ sent: await syncAllToSheet(await listLeads()) });
  } catch (err) {
    log.error('sheets.sync_failed', { error: err.message });
    return json({ error: 'Sync failed.' }, 502);
  }
}
