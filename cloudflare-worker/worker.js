/** Cloudflare Worker for Cashfree PG. Never expose CASHFREE_CLIENT_SECRET in browser code. */
const API_VERSION = '2023-08-01';
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const validText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
const isValidOrder = (s) => /^[A-Za-z0-9_-]{1,45}$/.test(s || '');
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = env.SITE_ORIGIN; // e.g. https://sreedev.in; exact origin, no trailing slash
    const origin = request.headers.get('Origin');
    const cors = { 'Access-Control-Allow-Origin': allowedOrigin || '', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (!allowedOrigin || !env.CASHFREE_CLIENT_ID || !env.CASHFREE_CLIENT_SECRET || !env.CASHFREE_ENV) return json({ error: 'Payment server is not configured.' }, 503);
    if (origin !== allowedOrigin) return json({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const apiRoot = env.CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const headers = { 'Content-Type': 'application/json', 'x-api-version': API_VERSION, 'x-client-id': env.CASHFREE_CLIENT_ID, 'x-client-secret': env.CASHFREE_CLIENT_SECRET };
    try {
      if (url.pathname === '/api/create-order' && request.method === 'POST') {
        if (Number(request.headers.get('Content-Length') || 0) > 12000) return json({ error: 'Request too large.' }, 413, cors);
        const p = await request.json();
        const amount = Number(p.amount);
        const phone = String(p.phone || '').trim();
        const email = String(p.email || '').trim();
        if (!Number.isFinite(amount) || amount < 1 || amount > 1000000 || Math.round(amount * 100) !== amount * 100 ||
          !/^[6-9]\d{9}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 ||
          !validText(p.organisation, 120) || !validText(p.full_address, 500) || !validText(p.city, 80) ||
          !validText(p.state, 80) || !/^\d{6}$/.test(String(p.pincode || '')) ||
          (p.reference && (typeof p.reference !== 'string' || p.reference.length > 80))) return json({ error: 'Please check your payment and billing details.' }, 400, cors);
        const orderId = 'SD_' + crypto.randomUUID().replaceAll('-', '').slice(0, 28);
        const payload = {
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: { customer_id: 'C_' + orderId.slice(3), customer_name: p.organisation.trim(), customer_email: email, customer_phone: phone },
          order_meta: { return_url: allowedOrigin + '/payment.html?order_id={order_id}' },
          order_note: String(p.reference || 'Website payment').slice(0, 80)
        };
        const res = await fetch(apiRoot + '/orders', { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.payment_session_id) {
          console.error('Cashfree order creation failed', res.status, data.type || data.code || '');
          return json({ error: 'Unable to create payment order. Please try again or contact support.' }, 502, cors);
        }
        return json({ order_id: orderId, payment_session_id: data.payment_session_id }, 200, cors);
      }
      if (url.pathname === '/api/order-status' && request.method === 'GET') {
        const id = url.searchParams.get('order_id');
        if (!isValidOrder(id)) return json({ error: 'Invalid order ID.' }, 400, cors);
        const res = await fetch(apiRoot + '/orders/' + encodeURIComponent(id), { method: 'GET', headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return json({ error: 'Unable to verify this payment.' }, res.status === 404 ? 404 : 502, cors);
        return json({ order_id: data.order_id, order_status: data.order_status }, 200, cors);
      }
      return json({ error: 'Not found.' }, 404, cors);
    } catch (e) { console.error('Payment API error', e?.message); return json({ error: 'Payment service temporarily unavailable.' }, 500, cors); }
  }
};
