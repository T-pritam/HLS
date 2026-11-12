# /sip (was /book): Blueprint Consultation landing page (v1)

The booking page for CA Final Group 1 repeaters. It offers one thing, the
Blueprint Consultation, **free**, and describes the Score Improvement Programme
without a price. It is `noindex` until launch is approved.

Flow: eligible? → details (saved as a lead, copied to the Google Sheet) → a time
in the Calendly calendar embedded on the page. Calendly holds the calendar,
emails the confirmation and handles reschedules and cancellations. There is no
payment (Razorpay was removed in Nov 2026).

## Layout

The app now has two root layouts, so `/sip` inherits nothing from the teaser
(no preloader, cursor, smooth scroll, GSAP or black body):

| Path | What |
| --- | --- |
| `app/(site)/` | The teaser, moved unchanged (`layout.js`, `page.js`, `globals.css`) |
| `app/(book)/` | `/sip` root layout (light theme, same fonts and tokens), pages and legal drafts |
| `app/(book)/sip/v/[variant]` | Static pages for `?v=b` and `?v=c` (rewritten in `next.config.mjs`) |
| `app/api/book/*` | Lead, scheduled (Calendly booking), status, health, admin |
| `components/book/` | Page sections, booking widget |
| `lib/book/` | Config, booking service, store and adapters |
| `public/book/` | Optimised logos, crest and share image (`npm run assets:book`) |

## Configuration

Every business value is an environment variable read through `lib/book/config.js`.
`.env.example` lists the names. `NEXT_PUBLIC_*` values are rendered on the page
and are fixed at build time, so rebuild after changing them (the pages are static).
Unset display values are hidden or shown as "to be confirmed". In `next dev`
they show an orange TODO marker instead.

Approval-gated content (mentor bio and photo, testimonials, sample blueprint,
owners) lives in `lib/book/content.js` and is empty by default. Variant B needs
an approved sample blueprint; without one it shows variant A and the lead
records `variant: "a"` and `variantRequested: "b"`.

## Calendly

- `NEXT_PUBLIC_CALENDLY_URL`: the event's booking link (`https://calendly.com/…`).
  Unset, step 3 says "booking opens soon" and shows the support contacts; the
  lead is still saved.
- The calendar opens with the student's name and email filled in, and passes the
  page's UTM values to Calendly.
- When Calendly reports a booking (`calendly.event_scheduled` message), the page
  calls `POST /api/book/scheduled` with the lead's private token. The lead becomes
  **Booked**, with Calendly's event and invitee addresses, and the private intake
  link email is sent once. A reschedule replaces the event; a status set by staff
  (Attended and later) is never moved back.
- `CALENDLY_API_TOKEN` (optional, a personal access token): the server then looks
  up the booked time, so it shows on the lead, on the page and in the sheet's
  "Slot (IST)" column. Without it the sheet says "Booked on Calendly".
- Cancellations made in Calendly are not reported back to the site.

## Storage

`LEAD_STORE=redis` keeps leads in Redis: each call takes milliseconds, and it
is safe across several server processes. Use it on the server (`docs/vps-deploy.md`). With
`BOOK_SHEETS_URL` set, every lead is also copied to the Google Sheet in the
background. Setup: `docs/lead-storage-setup.md`.

`LEAD_STORE=google-sheets` uses the sheet alone as the store (Apps Script web
app). It works but is slow, about a second per call. Setup:
`docs/google-sheets-setup.md`, script: `scripts/google-sheets/Code.gs`.

`LEAD_STORE=local-json` writes `.data/book-store.json` (gitignored), with one
lock per process. It is for local development only and fails on Vercel, where
the file system is read-only. Swap
it for the chosen CRM or database by adding an adapter with the same methods
(listed in `lib/book/store/index.js`). If a save fails, the lead goes to
`.data/lead-fallback.ndjson` and is moved into the store on the next good save.

## Admin

With `BOOK_ADMIN_TOKEN` set (send it as `Authorization: Bearer …`):

- `GET /api/book/admin/leads` (all) or `?id=lead_…` (one)
- `PATCH /api/book/admin/leads` `{ leadId, status, owner, nextAction, note }`.
  Statuses: New, Booked, Attended, Blueprint delivered, In counselling, Enrolled, Closed.
- `POST /api/book/admin/sync-sheet`: copies every lead to the Google Sheet again
  (repair after a Sheets outage).

## Checks

```
npm run lint                          # /sip code
npm run build                         # must finish with no warnings
npx next start -p 3300
BASE_URL=http://localhost:3300 npm run test:book   # lead and booking cases
```

`test:book` needs `BOOK_ADMIN_TOKEN`. It does not call Calendly: it sends the same
booking message the Calendly calendar sends. Run it against a copy whose
`BOOK_SHEETS_URL` is empty, or its "QA Test Student" leads land in the real sheet.

## Still needed before launch

- The Calendly link (`NEXT_PUBLIC_CALENDLY_URL`), and optionally `CALENDLY_API_TOKEN`.
- Real phone checks in the Instagram and WhatsApp in-app browsers.
- Values for every unset env var, approved legal text, and the PM decisions in the build report.
