# Cashfree payments without PHP — Cloudflare Worker

## 1. Prerequisites
- Live HTTPS website and active Cashfree merchant account.
- Confirm the exact website origin (e.g. `https://sreedev.in`, not `https://www.sreedev.in`).
- Cloudflare account and Wrangler (`npx wrangler`).
- In Cashfree, whitelist the website domain for checkout if required by your merchant configuration.

## 2. Deploy Worker
From `cloudflare-worker/`:

```sh
npx wrangler login
npx wrangler secret put CASHFREE_CLIENT_ID
npx wrangler secret put CASHFREE_CLIENT_SECRET
npx wrangler deploy
```

If Wrangler requires the Worker to exist before adding secrets, deploy first, then set both secrets and redeploy. Use **sandbox credentials** with `CASHFREE_ENV = "sandbox"` initially. `SITE_ORIGIN` must match the origin hosting `payment.html` exactly. Do not commit credentials.

## 3. Connect HTML/jQuery
Edit `assets/js/payment.js`:
- `API_BASE`: replace `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev` with the actual deployed Worker URL.
- Keep `CASHFREE_MODE = 'sandbox'` while testing.
- Upload the static website to your HTTPS host; **no PHP hosting is required**.

## 4. Test safely
- Submit a small test order using Cashfree sandbox test methods.
- Verify the checkout redirects to `payment.html?order_id=...`.
- The page calls the Worker to query Cashfree order status; show success **only** for `PAID`.
- Test failed/cancelled checkout and mobile UI.
- For production, switch Worker `CASHFREE_ENV` to `production`, replace both secrets with production credentials, and switch `CASHFREE_MODE` to `production` in frontend. Redeploy.

## Security / operations
- Do not trust browser callbacks as payment proof; verify `PAID` server-side before fulfilling orders.
- For **automatic fulfillment**, add authenticated Cashfree webhooks with signature verification and durable order storage (D1/KV) plus idempotency; this starter does not automatically fulfill orders or store leads.
- Add Cloudflare rate limiting/bot protection to `/api/create-order` before going live to mitigate abuse.
- Browser origin checks are **not authentication**; do not use this open, customer-entered-amount flow for privileged invoices or inventory fulfillment without independent server-side pricing validation.
- Direct UPI/bank transfers remain manual verification.
- Cashfree may require further KYC, merchant activation and domain whitelisting. Do not claim a payment succeeded solely because checkout returned.
