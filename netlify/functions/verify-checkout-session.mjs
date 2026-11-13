export default async (request) => {
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
  if (request.method !== 'GET') return json({ error: 'GET metódus szükséges.' }, 405);

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json({ error: 'A Stripe titkos kulcs nincs beállítva.' }, 503);

  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return json({ error: 'Érvénytelen fizetési azonosító.' }, 400);
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId), {
      headers: { Authorization: 'Bearer ' + secret }
    });
    const session = await response.json();
    if (!response.ok) return json({ error: 'A fizetés ellenőrzése nem sikerült.' }, 502);

    const valid = session.payment_status === 'paid'
      && session.mode === 'payment'
      && session.metadata?.service === 'premium_chart_report'
      && [5000, 10000, 15000, 20000, 25000].includes(Number(session.metadata?.amount_huf))
      && Number(session.amount_total) === Number(session.metadata?.amount_huf)
      && session.currency === 'huf';

    if (!valid) return json({ paid: false, status: session.payment_status || 'unpaid' }, 200);
    return json({ paid: true, amount_huf: Number(session.amount_total), currency: 'huf' });
  } catch {
    return json({ error: 'A Stripe szolgáltatás nem érhető el.' }, 502);
  }
};