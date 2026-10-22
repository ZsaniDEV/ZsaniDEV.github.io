export default async (request) => {
  const incoming = new URL(request.url);
  const days = incoming.searchParams.get('days') || '45';
  const minImportance = incoming.searchParams.get('min_importance') || '35';
  const upstream = new URL('https://api.cosmyday.com/events/upcoming');
  upstream.searchParams.set('days', days);
  upstream.searchParams.set('min_importance', minImportance);

  try {
    const response = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Az égi események szolgáltatása jelenleg nem érhető el.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
