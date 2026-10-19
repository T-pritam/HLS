import 'server-only';
import { after } from 'next/server';

/**
 * Runs `fn` after the response has been sent, so the student never waits for
 * it. On Vercel the function stays alive until it finishes. Outside a request
 * (for example a mock webhook timer) it simply runs without awaiting.
 */
export function background(fn) {
  const run = () => Promise.resolve().then(fn).catch(() => {});
  try {
    after(run);
  } catch {
    run();
  }
}
