// Upstash-compatible REST adapter for the HLS booking site.
// The site's Redis store (lib/book/store/redis.js) speaks the Upstash REST API.
// This serves that API on 127.0.0.1 in front of the local Redis, like SRH does,
// without Docker (Docker cannot run containers inside this LXD container).
//
//   POST /            body ["CMD", ...args]        -> {"result": ...}
//   POST /pipeline    body [["CMD", ...], ...]     -> [{"result"|"error"}, ...]
//   POST /multi-exec  body [["CMD", ...], ...]     -> same, run as one MULTI/EXEC
//   Header: Authorization: Bearer <SRH_TOKEN>
//
// No dependencies. One Redis connection; each request's commands are written in a
// single socket write, so a MULTI block is never interleaved with another request.

import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';

const TOKEN = process.env.SRH_TOKEN || '';
const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1';
const LISTEN_PORT = Number(process.env.LISTEN_PORT || 8079);
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6380);
const MAX_BODY = 5 * 1024 * 1024;

if (TOKEN.length < 32) {
  console.error('SRH_TOKEN missing or too short');
  process.exit(1);
}

// ---------- Redis connection (RESP2) ----------

class RedisError {
  constructor(message) { this.message = message; }
}

let sock = null;
let buf = Buffer.alloc(0);
let pending = []; // { resolve, reject } per expected reply, in order

function connect() {
  sock = net.createConnection({ host: REDIS_HOST, port: REDIS_PORT });
  sock.setNoDelay(true);
  sock.setKeepAlive(true, 30000);
  sock.on('data', (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    for (;;) {
      const r = parse(buf, 0);
      if (!r) break;
      buf = buf.subarray(r.end);
      const p = pending.shift();
      if (p) p.resolve(r.value);
    }
  });
  const fail = (err) => {
    const list = pending;
    pending = [];
    buf = Buffer.alloc(0);
    sock = null;
    for (const p of list) p.reject(err);
  };
  sock.on('error', (err) => { console.error('redis socket error:', err.message); });
  sock.on('close', () => fail(new Error('Redis connection closed')));
}

// Returns { value, end } or null if the buffer does not hold a whole reply yet.
function parse(b, i) {
  if (i >= b.length) return null;
  const nl = b.indexOf('\r\n', i);
  if (nl < 0) return null;
  const type = String.fromCharCode(b[i]);
  const line = b.toString('utf8', i + 1, nl);
  const next = nl + 2;
  switch (type) {
    case '+': return { value: line, end: next };
    case '-': return { value: new RedisError(line), end: next };
    case ':': return { value: Number(line), end: next };
    case '$': {
      const len = Number(line);
      if (len < 0) return { value: null, end: next };
      if (b.length < next + len + 2) return null;
      return { value: b.toString('utf8', next, next + len), end: next + len + 2 };
    }
    case '*': {
      const n = Number(line);
      if (n < 0) return { value: null, end: next };
      const out = [];
      let pos = next;
      for (let k = 0; k < n; k++) {
        const r = parse(b, pos);
        if (!r) return null;
        out.push(r.value);
        pos = r.end;
      }
      return { value: out, end: pos };
    }
    default:
      throw new Error(`Unexpected RESP type ${JSON.stringify(type)}`);
  }
}

function encode(cmds) {
  const parts = [];
  for (const cmd of cmds) {
    parts.push(`*${cmd.length}\r\n`);
    for (const arg of cmd) {
      const s = typeof arg === 'string' ? arg : arg === null || arg === undefined ? '' : String(arg);
      parts.push(`$${Buffer.byteLength(s)}\r\n${s}\r\n`);
    }
  }
  return parts.join('');
}

// Sends several commands in one write; resolves with their replies in order.
function send(cmds) {
  if (!sock || sock.destroyed) connect();
  const promises = cmds.map(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
  sock.write(encode(cmds));
  return Promise.all(promises);
}

// Upstash shape: errors (also nested in arrays) become {error} at the top level only.
function toResult(v) {
  if (v instanceof RedisError) return { error: v.message };
  return { result: clean(v) };
}
function clean(v) {
  if (v instanceof RedisError) return v.message;
  if (Array.isArray(v)) return v.map(clean);
  return v;
}

// ---------- HTTP ----------

function reply(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}

function authorized(req) {
  const h = req.headers.authorization || '';
  const given = Buffer.from(h.startsWith('Bearer ') ? h.slice(7) : '');
  const want = Buffer.from(TOKEN);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

const isCmd = (c) => Array.isArray(c) && c.length > 0 && typeof c[0] === 'string';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    send([['PING']]).then(([r]) => reply(res, 200, { ok: r === 'PONG' }), (e) => reply(res, 503, { error: e.message }));
    return;
  }
  if (req.method !== 'POST') return reply(res, 405, { error: 'POST only' });
  if (!authorized(req)) return reply(res, 401, { error: 'Unauthorized' });

  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) { reply(res, 413, { error: 'Body too large' }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', async () => {
    if (res.writableEnded) return;
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(res, 400, { error: 'Invalid JSON' }); }
    const path = (req.url || '/').split('?')[0].replace(/\/+$/, '');
    try {
      if (path === '') {
        if (!isCmd(body)) return reply(res, 400, { error: 'Body must be a command array' });
        const [v] = await send([body]);
        const out = toResult(v);
        return reply(res, out.error ? 400 : 200, out);
      }
      if (path === '/pipeline' || path === '/multi-exec') {
        if (!Array.isArray(body) || !body.length || !body.every(isCmd)) {
          return reply(res, 400, { error: 'Body must be an array of command arrays' });
        }
        if (path === '/pipeline') return reply(res, 200, (await send(body)).map(toResult));
        const replies = await send([['MULTI'], ...body, ['EXEC']]);
        const exec = replies[replies.length - 1];
        if (exec instanceof RedisError) return reply(res, 400, { error: exec.message });
        if (exec === null) return reply(res, 400, { error: 'Transaction aborted' });
        return reply(res, 200, exec.map(toResult));
      }
      return reply(res, 404, { error: 'Not found' });
    } catch (e) {
      return reply(res, 503, { error: e.message });
    }
  });
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`redis-http listening on ${LISTEN_HOST}:${LISTEN_PORT} -> redis ${REDIS_HOST}:${REDIS_PORT}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => { if (sock) sock.end(); process.exit(0); }));
}
