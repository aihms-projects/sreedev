(function ($) {
  'use strict';
  $(function () {
    // Replace with your deployed Worker URL (no trailing slash).
    const API_BASE = 'https://sreedev-cashfree.sreedevgroups.workers.dev';
    const CASHFREE_MODE = 'sandbox'; // Change to 'production' only when your Worker uses production credentials.
    const $form = $('#cashfreePaymentForm');
    const $button = $('#payBtn');
    const $feedback = $('#paymentFeedback');
    const show = (message) => $feedback.text(message);
    $('.copy-btn').on('click', async function () {
      const $copy = $(this);
      try {
        await navigator.clipboard.writeText(String($copy.data('copy')));
        $copy.text('Copied');
        setTimeout(() => $copy.text('Copy'), 1500);
      } catch (_) { window.prompt('Copy value:', String($copy.data('copy'))); }
    });
    const configured = () => !API_BASE.includes('YOUR-WORKER');
    async function api(path, options) {
      const response = await fetch(API_BASE + path, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Payment service unavailable. Please contact support.');
      return data;
    }
    $form.on('submit', async function (event) {
      event.preventDefault();
      if (!this.reportValidity()) return;
      if (!configured()) return show('Payment setup pending: configure the Cloudflare Worker URL.');
      const amount = Number($('#amount').val());
      if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) return show('Enter an amount between ₹1 and ₹10,00,000.');
      if (!/^[6-9][0-9]{9}$/.test($('#phone').val())) return show('Enter a valid 10-digit Indian mobile number.');
      if (!/^[0-9]{6}$/.test($('#pincode').val())) return show('Enter a valid six-digit pincode.');
      if (typeof window.Cashfree !== 'function') return show('Cashfree checkout failed to load. Please try again.');
      $button.prop('disabled', true).text('Preparing secure checkout…');
      show('Creating your payment order…');
      try {
        const payload = Object.fromEntries(new FormData(this).entries());
        const result = await api('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        show('Opening Cashfree secure checkout…');
        const cashfree = window.Cashfree({ mode: CASHFREE_MODE });
        const checkout = await cashfree.checkout({ paymentSessionId: result.payment_session_id, redirectTarget: '_self' });
        if (checkout && checkout.error) throw new Error(checkout.error.message || 'Checkout could not start.');
      } catch (error) { show(error.message || 'Could not start payment.'); }
      finally { $button.prop('disabled', false).html('Pay Securely <span aria-hidden="true">↗</span>'); }
    });
    const orderId = new URLSearchParams(location.search).get('order_id');
    if (orderId) {
      if (!configured()) return show('Configure the Worker URL to verify payments.');
      if (!/^[a-zA-Z0-9_-]{1,45}$/.test(orderId)) return show('Invalid order reference.');
      show('Checking payment status securely…');
      api('/api/order-status?order_id=' + encodeURIComponent(orderId))
        .then((data) => show(data.order_status === 'PAID'
          ? 'Payment confirmed by Cashfree. Order ID: ' + orderId
          : 'Payment not confirmed yet (' + (data.order_status || 'unknown') + '). If money was debited, contact support@sreedev.in with order ID: ' + orderId))
        .catch(() => show('Could not verify payment. Contact support@sreedev.in with order ID: ' + orderId));
    }
  });
})(jQuery);
