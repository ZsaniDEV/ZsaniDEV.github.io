export default async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST metódus szükséges.' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  const secret = Netlify.env.get('STRIPE_SECRET_KEY');
  if (!secret) return new Response(JSON.stringify({ error: 'A Stripe tesztkulcs nincs beállítva a Netlify környezeti változói között.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  let payload;
  try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Hibás kérés.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const amount = Number(payload.amount);
  const customerEmail = String(payload.customer_email || '').trim().toLowerCase();
  if (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return new Response(JSON.stringify({ error: 'Adj meg egy érvényes e-mail címet.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (![5000, 10000, 15000, 20000, 25000].includes(amount)) return new Response(JSON.stringify({ error: 'Érvénytelen támogatási összeg.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (payload.terms_accepted !== true || payload.privacy_acknowledged !== true || payload.early_delivery_requested !== true || payload.withdrawal_loss_acknowledged !== true || payload.terms_version !== '2026-11-13-draft-1' || payload.privacy_version !== '2026-11-13-draft-1') return new Response(JSON.stringify({ error: 'A fizetéshez szükséges jogi nyilatkozatok elfogadása hiányzik.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const origin = new URL(request.url).origin;
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('customer_email', customerEmail);
  form.set('metadata[customer_email]', customerEmail);
  form.set('success_url', origin + '/?payment=success&session_id={CHECKOUT_SESSION_ID}');
  form.set('cancel_url', origin + '/?payment=cancelled');
  form.set('line_items[0][price_data][currency]', 'huf');
  form.set('line_items[0][price_data][unit_amount]', String(amount * 100));
  form.set('line_items[0][price_data][product_data][name]', 'Égi Térkép – prémium képletelemzés támogatása');
  form.set('line_items[0][quantity]', '1');
  form.set('metadata[service]', 'premium_chart_report');
  form.set('metadata[amount_huf]', String(amount));
  form.set('metadata[terms_accepted]', 'true');
  form.set('metadata[privacy_acknowledged]', 'true');
  form.set('metadata[terms_version]', payload.terms_version);
  form.set('metadata[privacy_version]', payload.privacy_version);
  form.set('metadata[early_delivery_requested]', 'true');
  form.set('metadata[withdrawal_loss_acknowledged]', 'true');
  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data.error?.message || 'A Stripe munkamenet létrehozása nem sikerült.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ url: data.url }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(JSON.stringify({ error: 'A Stripe szolgáltatás nem érhető el.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
};