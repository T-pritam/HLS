import { getServerConfig } from '@/lib/book/config';
import { isAdmin, json } from '@/lib/book/http';
import { callSheets, sheetsConfigured } from '@/lib/book/sheets-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function timed(fn) {
  const t = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t };
  } catch (err) {
    return { ok: false, ms: Date.now() - t, error: err.message };
  }
}

/**
 * Which store and region are live (no secrets). With the admin token and
 * ?probe=1 it also times one call to Redis and to the Google Sheet.
 */
export async function GET(request) {
  const cfg = getServerConfig();
  const body = {
    store: cfg.leadStore,
    redisConfigured: Boolean(cfg.redisUrl && cfg.redisToken),
    sheetsConfigured: sheetsConfigured(),
    sheetsRole: !sheetsConfigured() ? 'off' : cfg.leadStore === 'google-sheets' ? 'store (slow)' : 'background copy',
    functionRegion: process.env.VERCEL_REGION ?? 'local',
    paymentMode: cfg.payment.mode,
    paymentsReady: cfg.payment.ready,
    testHooks: cfg.testHooks,
  };
  if (cfg.testHooks && process.env.VERCEL) body.warning = 'BOOK_TEST_HOOKS is on; set it to false on the live site.';
  if (cfg.leadStore === 'redis' && !body.redisConfigured) body.warning = 'LEAD_STORE=redis but no Upstash URL/token is set.';
  if (cfg.leadStore === 'local-json' && process.env.VERCEL) body.warning = 'local-json cannot save on Vercel; set LEAD_STORE=redis.';
  if (cfg.leadStore === 'google-sheets') body.warning = 'Google Sheets as the store is slow; set LEAD_STORE=redis.';

  if (new URL(request.url).searchParams.get('probe') && isAdmin(request)) {
    body.probe = {};
    if (body.redisConfigured) {
      body.probe.redis = await timed(async () => {
        const res = await fetch(cfg.redisUrl.replace(/\/$/, ''), {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.redisToken}` },
          body: JSON.stringify(['PING']),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      });
    }
    if (body.sheetsConfigured) body.probe.sheets = await timed(() => callSheets('ping'));
  }
  return json(body);
}
