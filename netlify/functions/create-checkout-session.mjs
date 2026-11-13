export default async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST metódus szükséges.' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return new Response(JSON.stringify({ error: 'A Stripe tesztkulcs nincs beállítva a Netlify környezeti változói között.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  let payload;
  try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Hibás kérés.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const amount = Number(payload.amount);
  if (![5000, 10000, 15000, 20000, 25000].includes(amount)) return new Response(JSON.stringify({ error: 'Érvénytelen támogatási összeg.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const origin = new URL(request.url).origin;
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', origin + '/?payment=success&session_id={CHECKOUT_SESSION_ID}');
  form.set('cancel_url', origin + '/?payment=cancelled');
  form.set('line_items[0][price_data][currency]', 'huf');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', 'Égi Térkép – prémium képletelemzés támogatása');
  form.set('line_items[0][quantity]', '1');
  form.set('metadata[service]', 'premium_chart_report');
  form.set('metadata[amount_huf]', String(amount));
  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data.error?.message || 'A Stripe munkamenet létrehozása nem sikerült.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ url: data.url }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(JSON.stringify({ error: 'A Stripe szolgáltatás nem érhető el.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
};