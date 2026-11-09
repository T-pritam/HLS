# Deploying on the VPS

One Next.js app serves the whole site:

| URL | What |
|---|---|
| `/` | Home page, the "At Your Own Desk" story |
| `/sip` | Blueprint Consultation booking page (`?v=b`, `?v=c` for variants B and C) |
| `/sip/confirmation`, `/sip/intake`, `/sip/privacy`, `/sip/terms`, `/sip/refund`, `/sip/contact` | Booking sub-pages |
| `/api/book/*` | Booking APIs (Razorpay webhook: `/api/book/webhook`) |
| `/book/*` | Temporary redirect to the matching `/sip` page |

## TODO before the first deploy

- [ ] **1. Server basics:** Node.js 20 or newer, git, Nginx, PM2 (`npm i -g pm2`), Docker.
- [ ] **2. Redis on the VPS** (replaces the hosted Redis; see below).
- [ ] **3. Razorpay:** put the 4 Razorpay values in `.env` and create the webhook
      (`https://himlifeschool.com/api/book/webhook`; events listed in `.env`).
- [ ] **4. Business details still empty in `.env`:** legal entity name, consultant name,
      consultation length, consultation mode, blueprint turnaround, refund processing time.
- [ ] **5. Copy `.env`** to the project folder on the VPS (it is not in git).
- [ ] **6. Build and start** (below), then point Nginx + HTTPS at port 3000.
- [ ] **7. Check:** open `https://himlifeschool.com/api/book/health`. It should show
      `"store":"redis"` and no `warning`.

## 2. Redis on the VPS

The booking code talks to Redis through the Upstash REST API, not the normal Redis
protocol. SRH (serverless-redis-http) is a small open-source adapter that offers that same
API in front of any Redis, so no code change is needed.

Create `/opt/hls-redis/docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7
    command: ["redis-server", "--appendonly", "yes"]   # saves data to disk
    volumes:
      - ./data:/data
    restart: unless-stopped

  srh:
    image: hiett/serverless-redis-http:latest
    environment:
      SRH_MODE: env
      SRH_TOKEN: <same value as UPSTASH_REDIS_REST_TOKEN in .env>
      SRH_CONNECTION_STRING: redis://redis:6379
    ports:
      - "127.0.0.1:8079:80"   # only reachable from the VPS itself
    depends_on: [redis]
    restart: unless-stopped
```

```bash
cd /opt/hls-redis && docker compose up -d
# quick test: should print {"result":"PONG"}
curl -s -H "Authorization: Bearer <token>" -d '["PING"]' http://127.0.0.1:8079
```

Redis is not exposed to the internet: only SRH listens, and only on 127.0.0.1.
Back up `/opt/hls-redis/data` regularly; it holds every lead and booking.

**Moving existing leads** from the current hosted Redis (only if it has real data):
keys start with `hls:book:`. Copy them with `redis-cli --rdb` / `MIGRATE`, or ask for a
small one-off copy script.

## 6. Build and start

```bash
git clone -b merge-website https://github.com/T-pritam/HLS.git hls && cd hls
# put .env here
npm ci
npm run build
pm2 start npm --name hls -- start      # port 3000; one process
pm2 save && pm2 startup
```

After any `.env` change: `npm run build && pm2 restart hls`
(`NEXT_PUBLIC_*` values are baked in at build time).

To update: `git pull && npm ci && npm run build && pm2 restart hls`.

## Nginx (outline)

```nginx
server {
  server_name himlifeschool.com www.himlifeschool.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then `sudo certbot --nginx -d himlifeschool.com -d www.himlifeschool.com` for HTTPS.
Razorpay webhooks need HTTPS.
