# SREE DEV Cashfree Payment Setup

1. Host on **PHP 8.1+ with cURL, mbstring and HTTPS** (e.g. cPanel PHP hosting). **GitHub Pages / Render static sites cannot execute PHP**.
2. Copy `api/config.example.php` to `api/config.php`. Fill in Cashfree **App ID** and **Secret Key** from your Cashfree merchant dashboard. Do not put keys in HTML/JavaScript, or commit `config.php` to Git.
3. Set `environment` to `sandbox` for testing, then `production` after Cashfree activates your live account. Update `site_url` to the actual HTTPS domain and whitelist it with Cashfree if required.
4. Test order creation, Cashfree hosted checkout, redirect and status checks in sandbox before production. The server checks Cashfree order status; **do not fulfill orders based only on client-side success or a redirect**.
5. For automated fulfillment and accounting, implement a verified Cashfree webhook (signature verification, idempotency, persistent order records, reconciliation). This starter does not store payment orders or send receipts.
6. Direct bank transfers and the static UPI QR are **outside Cashfree** and require manual reconciliation. Confirm the UPI handle and recipient name in a UPI app before publishing. The QR encodes `upi://pay?pa=sreedev01qr@fbl&pn=SREE%20DEV&cu=INR` with no fixed amount.
7. For security and compliance: configure rate limiting and bot protection on `api/create-order.php`, apply server-side transaction limits tied to real invoices, and review the published refund, privacy and cancellation policies. The entered amount is customer-controlled, so do not treat it as an invoice amount unless validated against your billing system.
8. If Cashfree requires a different API version or checkout options, check their latest official developer documentation before launch. Verify the integration with sandbox credentials.
9. The website's SEO canonical URLs and sitemap still contain `YOUR-DOMAIN.example`; replace with your actual domain.
