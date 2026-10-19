import 'server-only';
import { getServerConfig } from './config';
import { background } from './background';
import { callSheets, sheetsConfigured } from './sheets-client';
import { log } from './log';

/**
 * Copies changed leads to the Google Sheet in the background, after the
 * response has gone to the student. The sheet is a view for the team; the
 * booking itself never waits for it or depends on it. A failed copy is logged
 * and repaired by the next change to that lead, or by
 * POST /api/book/admin/sync-sheet.
 */
export function mirrorLeads(leads) {
  if (!leads.length || !sheetsConfigured() || getServerConfig().leadStore === 'google-sheets') return;
  const payload = JSON.parse(JSON.stringify(leads));
  background(async () => {
    try {
      await callSheets('mirror', { leads: payload });
    } catch (err) {
      log.warn('sheets.mirror_failed', { count: payload.length, error: err.message });
    }
  });
}

/** Pushes every lead to the sheet now (repair after an outage). */
export async function syncAllToSheet(leads) {
  let sent = 0;
  for (let i = 0; i < leads.length; i += 40) {
    const chunk = leads.slice(i, i + 40);
    await callSheets('mirror', { leads: chunk });
    sent += chunk.length;
  }
  return sent;
}
