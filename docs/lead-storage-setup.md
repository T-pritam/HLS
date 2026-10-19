# Fast lead storage: Redis for bookings, Google Sheets as the team's copy

## Why

With Google Sheets as the store, every step waited on Google Apps Script,
which takes about a second per call. Some steps need several calls, so
students waited 5 to 20 seconds.

Bookings now live in Redis (Upstash), which answers in milliseconds. Every
lead is still copied to the Google Sheet, but in the background, after the
student already has their answer. The sheet can be slow or briefly down
without ever slowing or breaking a booking.

Measured locally, with Google's delay simulated at 1.2 seconds per call:

| Step the student waits for | Sheets as store | Redis + Sheets copy |
| --- | --- | --- |
| Submit details → times shown | 3.6 s | 0.03 s |
| Pick a time | 2.4 s | 0.01 s |
| Pay → checkout starts opening | 3.6 s | 0.01 s (the order is made in the background when a time is held; Razorpay's window then takes about 1 s) |
| Paid → booking confirmed | 8.5 s | 0.03 s |

On Vercel, add roughly 0.2 to 0.6 s per step for the network and cold starts,
less with the region settings below.

What Razorpay does is unchanged. After a payment its own screens ("Confirming
Payment", then "Payment Successful, redirecting in 5 seconds") take about 10
seconds in test mode. Meanwhile `/book` now says "Finish paying in the Razorpay
window", then "Payment received. Confirming your booking…", instead of showing
the Pay button again.

## 1. Create the Redis database (about 5 minutes, free)

1. In Vercel, open the project and go to **Storage → Create Database →
   Upstash → Upstash for Redis**.
2. Choose the free plan and the region **Mumbai (ap-south-1)**. Connect it to
   this project for Production and Preview.
3. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) automatically. The
   site reads either pair.

The free plan allows 500,000 commands a month. A full booking uses about 40.

## 2. Set the Vercel environment variables

```
LEAD_STORE=redis
BOOK_SHEETS_URL=<your Apps Script /exec URL, as now>
BOOK_SHEETS_SECRET=<your secret, as now>
```

Keep everything else as it is (Razorpay keys, `BOOK_TOKEN_SECRET`,
`BOOK_ADMIN_TOKEN`, support contacts).

## 3. Run the site's functions in India

**Project → Settings → Functions → Function Region → Mumbai, India (bom1)**.

Vercel's default region is in the USA, so every click from India crossed the
world and back, more than once per step. Mumbai also puts the site next to
Razorpay and the Redis database.

## 4. Update the Apps Script

`Code.gs` has a new action for the background copy, and is faster overall.

1. Paste the new [`scripts/google-sheets/Code.gs`](../scripts/google-sheets/Code.gs)
   over the old one in the sheet's Apps Script, and save.
2. **Deploy → Manage deployments → Edit (pencil) → Version: New version →
   Deploy**. The URL stays the same.

## 5. Redeploy and check

Redeploy on Vercel, then make one test booking:

- each step should respond in well under a second;
- a row appears in **Leads** a few seconds later;
- Payment status and Status update in the sheet after paying.

## Working with the sheet now

- The sheet is the team's view. Staff may fill in **Owner** and **Staff notes**;
  the site never overwrites them.
- A **Status** you set after booking (Attended, Blueprint delivered, In
  counselling, Enrolled, Closed) is kept, unless the lead is later refunded.
- If Google was down for a while, `POST /api/book/admin/sync-sheet` (with
  `Authorization: Bearer <BOOK_ADMIN_TOKEN>`) copies every lead to the sheet again.

The old mode, `LEAD_STORE=google-sheets` with no Redis, still works, but it is
slow. Use it only if Redis is not an option.
