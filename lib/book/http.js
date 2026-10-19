import 'server-only';
import { NextResponse } from 'next/server';
import { getServerConfig } from './config';
import { safeEqual } from './tokens';

export function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : request.headers.get('x-real-ip'))?.trim() || 'local';
}

/**
 * Basic in-memory rate limit, per IP and bucket. Good enough for one server
 * process; a multi-instance host needs a shared store.
 */
const buckets = new Map();

export function rateLimited(request, bucket, { limit, windowMs }) {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return hits.length > limit;
}

/**
 * Public POSTs must be JSON and, when the browser sends an Origin, come from
 * this site. Cross-site forms cannot send JSON without a preflight.
 */
export async function readJson(request) {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) return { error: json({ error: 'Unsupported request.' }, 415) };
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return { error: json({ error: 'Unsupported request.' }, 403) };
    } catch {
      return { error: json({ error: 'Unsupported request.' }, 403) };
    }
  }
  try {
    return { body: await request.json() };
  } catch {
    return { error: json({ error: 'Unsupported request.' }, 400) };
  }
}

/** Test hook: lets the QA script inject failures. Off unless BOOK_TEST_HOOKS=true. */
export function injectedFault(request, kind) {
  if (!getServerConfig().testHooks) return false;
  return request.headers.get('x-book-fault') === kind;
}

export function isAdmin(request) {
  const expected = getServerConfig().adminToken;
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  return safeEqual(given, expected);
}
