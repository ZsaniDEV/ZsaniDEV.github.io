const API = 'https://api.cosmyday.com';
const form = document.querySelector('#natal-form');
const submitButton = document.querySelector('#chart-submit');
const chartStatus = document.querySelector('#chart-status');
const chartResults = document.querySelector('#chart-results');
const skyStatus = document.querySelector('#sky-status');
const skyEvents = document.querySelector('#sky-events');

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#fca5a5' : '';
}
function readableLabel(value) {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
function formatValue(value) {
  if (value === null || value === undefined || typeof value === 'object') return null;
  return String(value);
}
function renderObjectGrid(title, object) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
  const items = Object.entries(object).filter(([, value]) => formatValue(value) !== null);
  if (!items.length) return null;
  const section = document.createElement('section');
  section.className = 'result-panel';
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.append(heading);
  const grid = document.createElement('div');
  grid.className = 'data-list';
  for (const [key, value] of items) {
    const item = document.createElement('div');
    item.className = 'data-item';
    const label = document.createElement('strong');
    label.textContent = readableLabel(key);
    const text = document.createElement('span');
    text.textContent = formatValue(value);
    item.append(label, text);
    grid.append(item);
  }
  section.append(grid);
  return section;
}
function renderChartData(data) {
  chartResults.replaceChildren();
  chartResults.hidden = false;

  const intro = document.createElement('div');
  intro.className = 'result-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'A számítás eredménye';
  const note = document.createElement('p');
  note.className = 'field-help';
  note.textContent = 'A bolygóállások és a házcsúcsok a CosmyDay számításából származnak. Az értékek fokban szerepelnek, ahol ezt az API megadja.';
  intro.append(heading, note);
  chartResults.append(intro);

  const summary = {};
  for (const key of ['houseSystem', 'ascendant', 'midheaven']) {
    if (data[key] !== undefined && data[key] !== null) summary[key] = data[key];
  }
  const summaryPanel = renderObjectGrid('A képlet fő tengelyei', summary);
  if (summaryPanel) chartResults.append(summaryPanel);

  if (Array.isArray(data.cusps) && data.cusps.length) {
    const panel = document.createElement('section');
    panel.className = 'result-panel';
    const title = document.createElement('h3');
    title.textContent = 'Házcsúcsok';
    panel.append(title);
    const grid = document.createElement('div');
    grid.className = 'data-list';
    data.cusps.forEach((value, index) => {
      const item = document.createElement('div');
      item.className = 'data-item';
      const label = document.createElement('strong');
      label.textContent = `Ház ${index + 1}`;
      const text = document.createElement('span');
      text.textContent = `${Number(value).toFixed(4)}°`;
      item.append(label, text);
      grid.append(item);
    });
    panel.append(grid);
    chartResults.append(panel);
  }

  if (data.planets && typeof data.planets === 'object') {
    const panel = document.createElement('section');
    panel.className = 'result-panel';
    const title = document.createElement('h3');
    title.textContent = 'Bolygóállások';
    panel.append(title);
    const grid = document.createElement('div');
    grid.className = 'data-list';
    for (const [planet, details] of Object.entries(data.planets)) {
      if (!details || typeof details !== 'object') continue;
      const item = document.createElement('div');
      item.className = 'data-item';
      const label = document.createElement('strong');
      label.textContent = readableLabel(planet);
      const parts = [];
      if (details.sign) parts.push(String(details.sign));
      if (Number.isFinite(Number(details.degInSign))) parts.push(`${Number(details.degInSign).toFixed(2)}° a jegyben`);
      if (Number.isFinite(Number(details.house))) parts.push(`${details.house}. ház`);
      if (details.retrograde === true) parts.push('retrográd');
      const text = document.createElement('span');
      text.textContent = parts.length ? parts.join(' · ') : Object.entries(details)
        .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
        .map(([key, value]) => `${readableLabel(key)}: ${value}`).join(' · ');
      item.append(label, text);
      grid.append(item);
    }
    panel.append(grid);
    chartResults.append(panel);
  }

  if (!summaryPanel && !data.cusps?.length && !data.planets) {
    const panel = renderObjectGrid('Képletadatok', data);
    if (panel) chartResults.append(panel);
    else {
      const pre = document.createElement('pre');
      pre.className = 'result-panel';
      pre.textContent = JSON.stringify(data, null, 2);
      chartResults.append(pre);
    }
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(form);
  const date = String(values.get('birthDate') || '');
  const time = String(values.get('birthTime') || '12:00');
  const place = String(values.get('birthPlace') || '').trim();
  if (!date || !place) return;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  submitButton.disabled = true;
  chartResults.hidden = true;
  setStatus(chartStatus, 'A születési hely koordinátáinak keresése…');
  try {
    // CosmyDay /search-location endpoint is not CORS-open. Use Nominatim directly
    // from the browser; do not send a custom User-Agent header (browsers forbid it).
    const locationUrl = new URL('https://nominatim.openstreetmap.org/search');
    locationUrl.searchParams.set('q', place);
    locationUrl.searchParams.set('format', 'jsonv2');
    locationUrl.searchParams.set('limit', '1');
    locationUrl.searchParams.set('accept-language', 'hu');
    const locationResponse = await fetch(locationUrl, { headers: { 'Accept': 'application/json' } });
    if (!locationResponse.ok) throw new Error('A születési hely keresése nem sikerült. Próbáld a város nevét országgal együtt megadni.');
    const locations = await locationResponse.json();
    if (!Array.isArray(locations) || !locations.length) throw new Error('Nem találtuk a várost. Add meg pontosabban, például: Szeged, Magyarország.');
    const location = locations[0];
    const lat = Number(location.lat);
    const lon = Number(location.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('A városhoz nem kaptunk érvényes koordinátákat.');
    setStatus(chartStatus, 'A születési képlet számítása…');
    const response = await fetch(`${API}/natal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, day, hour, minute, lat, lon })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.message || 'A képletszámítás nem sikerült. Ellenőrizd az adatokat, és próbáld újra.');
    renderChartData(data);
    setStatus(chartStatus, `A képlet elkészült a következő helyhez: ${(location.display_name || location.name || place)}. A születési idő pontossága az aszcendens és a házak számításánál különösen fontos.`);
  } catch (error) {
    setStatus(chartStatus, error.message || 'Nem sikerült kapcsolódni a szolgáltatáshoz. Próbáld újra később.', true);
  } finally {
    submitButton.disabled = false;
  }
});
function eventDate(value) {
  if (!value) return 'Dátum nélkül';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
function renderEvents(data) {
  const events = Array.isArray(data) ? data : (data.events || []);
  skyEvents.replaceChildren();
  if (!events.length) {
    setStatus(skyStatus, 'Jelenleg nincs megjeleníthető esemény ebben az időszakban.');
    return;
  }
  for (const event of events.slice(0, 9)) {
    const card = document.createElement('article');
    card.className = 'event-card';
    const date = document.createElement('div');
    date.className = 'event-date';
    date.textContent = eventDate(event.date || event.datetime || event.start);
    const title = document.createElement('h3');
    title.textContent = event.headline || event.title || event.name || readableLabel(event.kind || 'Égi esemény');
    const description = document.createElement('p');
    description.textContent = event.short || event.description || event.long || 'Részletek az esemény adatlapján.';
    card.append(date, title, description);
    if (event.kind) {
      const kind = document.createElement('span');
      kind.className = 'event-kind';
      kind.textContent = readableLabel(event.kind);
      card.append(kind);
    }
    skyEvents.append(card);
  }
  setStatus(skyStatus, 'Az eseményadatok forrása a CosmyDay. Az időpontok helyi megjelenítését a következő körben tovább pontosítjuk.');
}
async function loadEvents() {
  try {
    const response = await fetch(`${API}/events/upcoming?days=45&min_importance=35`);
    if (!response.ok) throw new Error('Az égi események most nem érhetők el.');
    renderEvents(await response.json());
  } catch {
    setStatus(skyStatus, 'Az aktuális események most nem tölthetők be. Kérjük, próbáld újra később.', true);
  }
}
loadEvents();
