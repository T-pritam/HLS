import 'server-only';
import { getServerConfig } from './config';

// A stuck Apps Script call gives up after this; background copies retry later.
const TIMEOUT_MS = 12000;

/** True when the Google Sheets web app is configured. */
export function sheetsConfigured() {
  const { sheetsUrl, sheetsSecret } = getServerConfig();
  return Boolean(sheetsUrl && sheetsSecret);
}

/**
 * Calls the Apps Script web app (scripts/google-sheets/Code.gs). Apps Script
 * answers a POST with a redirect to the result; fetch follows it.
 */
export async function callSheets(action, payload = {}) {
  const { sheetsUrl, sheetsSecret } = getServerConfig();
  if (!sheetsUrl || !sheetsSecret) throw new Error('Google Sheets is not configured');
  const res = await fetch(sheetsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: sheetsSecret, action, ...payload }),
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheets: unexpected response (HTTP ${res.status})`);
  }
  if (!data.ok && !data.conflict) throw new Error(`Google Sheets: ${data.error ?? 'error'}`);
  return data;
}
