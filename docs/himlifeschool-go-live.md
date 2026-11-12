# himlifeschool.com: go-live checklist

How the HLS website moved from `hls.tach21.com` to **`https://himlifeschool.com`**, and
what is left to do. Work through Part B top to bottom, ticking each box.

- Server: the shared VPS, `187.127.145.209`. App `hls` (PM2, port 3008) on the app
  machine, nginx and certificates on the front machine. Details: `docs/vps-deploy.md`
  and the team runbook `WEB_DEPLOY_VPS.md` (section 15).
- Deploys: `.github/workflows/deploy.yml`, on every push to `master` or
  Actions → Deploy HLS website → Run workflow. **The workflow has nothing domain-specific
  in it and needs no change for this move.**

---

## Part A: already done (2026-11-12)

| | Status |
|---|---|
| nginx blocks for `himlifeschool.com` and `www` on the front machine | ✅ Done. Copy in `deploy/nginx-front-himlifeschool.com.conf`. Backups: `tach21-proxy.bak-20261112062328`, `tach21-proxy.bak-20261112063210` |
| GoDaddy DNS: `A @ 187.127.145.209`, `CNAME www → @`, parking `A` removed | ✅ Done |
| HTTPS certificate (Let's Encrypt, both names) | ✅ Issued, expires 2027-02-10, renews automatically (`certbot.timer`) |
| Redirects | ✅ `http://`, `http://www`, `https://www` → `https://himlifeschool.com` in one hop |
| Old address `https://hls.tach21.com` | ✅ Still works, same app |
| Step 2: `NEXT_PUBLIC_SITE_URL=https://himlifeschool.com` (env backup `hls-prod.env.bak-20261112`) | ✅ Done |
| Step 4: rebuilt live commit `c4d57cb` with the new env, release `20261112162253`, health check passed | ✅ Done (by hand, see note below) |
| Step 5: all pages, `/book` → `/sip` redirect, health, robots, sitemap, link-preview URLs on the new domain | ✅ Checked. Test booking still to do by a person. |

| CI/CD: `vps-deploy` (with `fix/responsive-polish`) merged into `master` (PR #2); pushes to `master` deploy automatically. First run `43205144912` passed | ✅ Done |
| Step 3: `NEXT_PUBLIC_NOINDEX=false`; SEO (canonicals, sitemap with 5 pages, robots.txt, JSON-LD, Open Graph) live | ✅ Done |
| Step 9: docs and nginx config committed | ✅ Done |

**Still to do:** Step 5 test booking by a person, Step 6 outside services, Step 7 Search
Console (needs your Google account), Step 8 in 3–4 weeks.

### Final DNS zone at GoDaddy (nothing else needed)

| Type | Name | Value | Notes |
|---|---|---|---|
| A | `@` | `187.127.145.209` | The only A record. No "Parked" record. |
| CNAME | `www` | `@` | Follows the A record. |
| NS | `@` | `ns75` / `ns76.domaincontrol.com` | GoDaddy, leave as is. |
| CNAME | `_domainconnect` | `_domainconnect.gd.domaincontrol.com` | GoDaddy, harmless. |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; …` | Email security default. Leave it. |

- Do **not** add an `AAAA` record.
- Keep **Domain → Forwarding** off in GoDaddy. Turning it on brings the parking address back.
- Email on this domain is not set up (no MX). When it is (Google Workspace, Zoho, or
  sending booking emails from `@himlifeschool.com`), add the MX, SPF (`TXT @`) and DKIM
  records that provider gives you. Do not touch the A or CNAME records for that.

### "The site doesn't open on my computer or phone"

Right after a DNS change, some networks keep the old parking address for a while (the
record's TTL is 600 seconds, and some ISPs keep it longer). The server itself is fine.
To check and clear it:

```bash
# What the public resolvers see (should be 187.127.145.209 only)
dig +short himlifeschool.com @8.8.8.8
dig +short himlifeschool.com @1.1.1.1
# Test the server directly, bypassing your DNS
curl -I --resolve himlifeschool.com:443:187.127.145.209 https://himlifeschool.com/
```

- Windows: `ipconfig /flushdns`. macOS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`.
- Chrome: `chrome://net-internals/#dns` → Clear host cache. Then close and reopen the tab.
- Phone: turn airplane mode on and off, or try mobile data instead of Wi-Fi.
- Or set the device DNS to `8.8.8.8` / `1.1.1.1`.
- If it still fails after an hour, check in GoDaddy that only one A record (`187.127.145.209`) exists.

---

## Part B: to do after the site is live

### Step 1: Check the live site in a browser

- [ ] `https://himlifeschool.com` opens with a padlock, on phone and desktop.
- [ ] `http://himlifeschool.com`, `www.himlifeschool.com` and `https://www.himlifeschool.com`
      all end up on `https://himlifeschool.com`.
- [ ] `https://himlifeschool.com/sip` (booking) opens. `/book` redirects to `/sip`.

### Step 2: Point the app at the new address

`NEXT_PUBLIC_SITE_URL` is still `https://hls.tach21.com`. It controls the intake links
sent to leads and the link previews of the booking pages.

```bash
ssh -i ~/.ssh/id_ed25519 -p 2222 root@187.127.145.209      # app machine
cp -p /var/www/env/hls-prod.env /var/www/env/hls-prod.env.bak-$(date +%Y%m%d)
nano /var/www/env/hls-prod.env
#   NEXT_PUBLIC_SITE_URL=https://hls.tach21.com   →   NEXT_PUBLIC_SITE_URL=https://himlifeschool.com
grep NEXT_PUBLIC_SITE_URL /var/www/env/hls-prod.env      # check
```

No trailing slash.

### Step 3: Decide whether search engines may index the site

The same file has `NEXT_PUBLIC_NOINDEX=true`, so `robots.txt` says `Disallow: /` and
Google will not list the site.

- Still making website changes? Leave it `true`.
- Ready to launch publicly? Change it to `NEXT_PUBLIC_NOINDEX=false` (can be done in this
  step or later; each change needs Step 4).

### Step 4: Redeploy

`NEXT_PUBLIC_*` values are baked in at build time, so `pm2 reload` alone does not pick them
up. Rebuild:

1. GitHub → `T-pritam/HLS` → **Actions** → **Deploy HLS website** → **Run workflow** → branch `master`.
2. Wait for the green tick (a few minutes). The deploy has no downtime. If the new release
   fails its health check, the workflow switches back to the previous one by itself.
3. Any push to `master` does the same thing.

### Step 5: Test on the new domain

- [ ] Home `/` and booking `/sip` load. Variants `/sip?v=b` and `/sip?v=c` load.
- [ ] Legal pages: `/sip/privacy`, `/sip/terms`, `/sip/contact`.
- [ ] Submit one test booking. Check:
  - [ ] the Calendly calendar shows and a time can be booked;
  - [ ] the lead appears in the Google Sheet;
  - [ ] the intake link in it starts with `https://himlifeschool.com/`.
- [ ] Paste `https://himlifeschool.com/sip` into WhatsApp: the preview shows.
- [ ] `https://himlifeschool.com/robots.txt` matches the choice in Step 3.
- [ ] `https://himlifeschool.com/api/book/health` answers with `"store":"redis"`.
- [ ] Delete the test lead afterwards.

### Step 6: Update the outside services

These are set in each service's own dashboard, not on our server.

- [ ] **Calendly**: if embedding is limited to certain websites, add `himlifeschool.com`.
      Update the website link on the Calendly profile.
- [ ] **Google Sheet / Apps Script**: if it only accepts calls from a list of sites, add the new domain.
- [ ] **Razorpay** (only if payments come back): register `https://himlifeschool.com` as the
      website, and the legal pages' new URLs.
- [ ] **Instagram bio, Google Business profile, ads, WhatsApp templates, email signatures,
      printed material**: change the link to `himlifeschool.com`.

### Step 7: Search setup (once `NEXT_PUBLIC_NOINDEX=false`)

1. https://search.google.com/search-console → Add property → **Domain** → `himlifeschool.com`
   (signed in with the Google account that should own it).
2. It gives a `TXT` record. Add it in GoDaddy DNS as `TXT @ google-site-verification=…`
   (alongside the existing records; delete nothing). Click Verify.
3. Sitemaps → submit `https://himlifeschool.com/sitemap.xml`.
4. Optional: the same in Bing Webmaster Tools (it can import from Search Console).

### Step 8: Retire the old address (a few weeks later)

Intake links already sent to leads point to `hls.tach21.com`, so keep it working for now.
After 3–4 weeks, turn it into a redirect on the front machine:

```nginx
# in the hls.tach21.com 443 block, replace `location / { proxy_pass … }` with:
location / { return 301 https://himlifeschool.com$request_uri; }
```

Then `sudo -n nginx -t && sudo -n systemctl reload nginx` (backup first, as in runbook 5.8).
Keep the `hls.tach21.com` DNS record and certificate so the redirect keeps working.

### Step 9: Update the docs and commit

- [ ] `docs/vps-deploy.md`: "Address" row → `https://himlifeschool.com`. Mark the
      "Switching to himlifeschool.com later" section as done.
- [ ] `WEB_DEPLOY_VPS.md`: section 4.3 (domains) and section 15.
- [ ] Commit `deploy/nginx-front-himlifeschool.com.conf`, this file and the doc edits.
      The push to `master` starts a deploy, which is safe.

---

## Checks and maintenance

```bash
EDGE="ssh devuser@187.127.145.209"                                    # front machine
$EDGE 'sudo -n certbot certificates' | grep -A4 himlifeschool         # expiry
$EDGE 'sudo -n certbot renew --cert-name himlifeschool.com --dry-run' # renewal test (may wait up to 8 min before starting)
echo | openssl s_client -connect himlifeschool.com:443 -servername himlifeschool.com 2>/dev/null | openssl x509 -noout -enddate
```

- Certificates last 90 days and renew by themselves about 30 days before expiry.
- Renewal needs `himlifeschool.com` and `www` to keep pointing at `187.127.145.209`.
  If DNS moves elsewhere (Cloudflare proxy, another host), renewal will fail.

## Rolling back

- Website broken after a deploy: the workflow already rolls back on a failed health check.
  By hand: Actions → re-run the last good deploy, or on the app machine point
  `/var/www/hls-current` at the previous folder in `/var/www/hls-releases/` and `pm2 reload hls`.
- Domain problem: `https://hls.tach21.com` keeps serving the same app throughout.
- Wrong env value: restore `/var/www/env/hls-prod.env.bak-<date>` and re-run the workflow.
