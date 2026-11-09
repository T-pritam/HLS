# Deploying on the VPS

One Next.js app serves the whole site:

| URL | What |
|---|---|
| `/` | Home page, the "At Your Own Desk" story |
| `/sip` | Blueprint Consultation booking page (`?v=b`, `?v=c` for variants B and C) |
| `/sip/confirmation`, `/sip/intake`, `/sip/privacy`, `/sip/terms`, `/sip/refund`, `/sip/contact` | Booking sub-pages |
| `/api/book/*` | Booking APIs (Razorpay webhook: `/api/book/webhook`) |
| `/book/*` | Temporary redirect to the matching `/sip` page |

## As deployed (2026-11-09)

| | |
|---|---|
| Address | `https://hls.tach21.com` for now; `himlifeschool.com` once the client hands over its DNS |
| Server | the shared VPS: app machine `pritam-dev`, front machine `srv1555908` (see the team's `WEB_DEPLOY_VPS.md` runbook) |
| App | PM2 `hls`, cluster ×2, port 3008, `next start -p 3008 -H 0.0.0.0` |
| Code | `/var/www/hls-current` → `/var/www/hls-releases/<stamp>` (last 3 kept), checkout in `/var/www/hls-repo` |
| Env | `/var/www/env/hls-prod.env` (mode 600), copied into each release as `.env.local` before the build |
| Leads | Redis on `127.0.0.1:6380` (`redis-hls` service, saved to disk on every write, data in `/var/lib/redis-hls`), reached through `deploy/redis-http.mjs` on `127.0.0.1:8079` (`hls-redis-http` service). Google Sheet gets a background copy. |
| Deploys | `.github/workflows/deploy.yml`: every push to `master`, or Actions → Run workflow |

## How a deploy works (zero downtime)

1. Pull `master`, copy it (without `.git`) into a new `hls-releases/<stamp>` folder.
2. Copy `/var/www/env/hls-prod.env` in as `.env.local`. `NEXT_PUBLIC_*` values are
   baked in by the build, so this comes first.
3. Reuse `node_modules` from the live release by hard links if `package-lock.json` is
   unchanged, otherwise `npm ci`.
4. `npm run build` in the new folder. The live site keeps serving. A failed build
   deletes the folder and stops; nothing live changes.
5. Swap the `hls-current` symlink in one step, then `pm2 reload hls`: the two instances
   are replaced one at a time, so one is always answering.
6. Health check: `/api/book/health` must report `"store":"redis"` and `/` must answer.
   If not, the symlink goes back to the previous release and PM2 reloads again.

Measured on the second deploy: 115 of 115 requests during the reload returned 200,
slowest 23 ms.

Two instances are only safe because leads live in Redis. Do not switch
`LEAD_STORE` back to `local-json` on the server: each release has its own `.data/`
folder, and the two instances would not see each other's writes.

## Changing a setting

Edit `/var/www/env/hls-prod.env` on the app machine, then GitHub → Actions → Deploy
HLS website → Run workflow. A plain `pm2 reload` is not enough for `NEXT_PUBLIC_*`
values.

Still to fill in that file: the 4 Razorpay values (then create the webhook,
`https://<domain>/api/book/webhook`, events listed in `.env`), legal entity name,
support contacts, consultant name, consultation length and mode, owner alert email.

## Redis without Docker

The booking code talks to Redis through the Upstash REST API. The original plan was
SRH in Docker, but Docker cannot start containers inside the LXD container
(`open sysctl net.ipv4.ip_unprivileged_port_start: permission denied`). So
`deploy/redis-http.mjs`, a small dependency-free Node server, offers the same API
(`/`, `/pipeline`, `/multi-exec`, bearer token) in front of a dedicated Redis.

Files in `deploy/` and where they live on the app machine:

| Repo file | Server path |
|---|---|
| `redis-http.mjs` | `/opt/hls-redis/redis-http.mjs` (token in `/opt/hls-redis/.env` as `SRH_TOKEN`, same value as `UPSTASH_REDIS_REST_TOKEN`) |
| `redis-hls.conf` | `/etc/redis/redis-hls.conf` |
| `redis-hls.service`, `hls-redis-http.service` | `/etc/systemd/system/` |
| `nginx-front-hls.tach21.com.conf` | appended to `/etc/nginx/sites-available/tach21-proxy` on the front machine |

Check: `systemctl status redis-hls hls-redis-http`, `redis-cli -p 6380 DBSIZE`.
Back up `/var/lib/redis-hls` (it holds every lead and booking).

## Switching to himlifeschool.com later

1. In `/var/www/env/hls-prod.env`: `NEXT_PUBLIC_SITE_URL=https://himlifeschool.com`.
   Intake links already sent keep pointing at `hls.tach21.com`, so keep that name
   working for a while.
2. Front machine: add `server` blocks for `himlifeschool.com` and `www` (runbook 5.8),
   before touching DNS.
3. DNS at the client's provider: `A @` and `A www` → `187.127.145.209`, then certbot
   (runbook 5.10).
4. Run the workflow. Update the Razorpay webhook URL and the site address registered
   in Razorpay.
5. `app/sitemap.js` already says `https://himlifeschool.com/`.
