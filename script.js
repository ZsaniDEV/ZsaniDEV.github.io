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
const SIGN_NAMES = ['Kos','Bika','Ikrek','Rák','Oroszlán','Szűz','Mérleg','Skorpió','Nyilas','Bak','Vízöntő','Halak'];
const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PLANET_NAMES = {
  sun: 'Nap', moon: 'Hold', mercury: 'Merkúr', venus: 'Vénusz', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Szaturnusz', uranus: 'Uránusz', neptune: 'Neptunusz',
  pluto: 'Plútó', northnode: 'Felszálló holdcsomópont', southnode: 'Leszálló holdcsomópont',
  chiron: 'Chiron', lilith: 'Lilith'
};
function longitudePosition(value) {
  const longitude = Number(value);
  if (!Number.isFinite(longitude)) return null;
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const withinSign = normalized - signIndex * 30;
  return { sign: SIGN_NAMES[signIndex], glyph: SIGN_GLYPHS[signIndex], degrees: Math.floor(withinSign), minutes: Math.round((withinSign % 1) * 60) % 60, decimal: withinSign };
}
function formatPosition(value) {
  const position = longitudePosition(value);
  return position ? `${position.glyph} ${position.sign} ${position.degrees}°${String(position.minutes).padStart(2, '0')}′` : 'Nincs adat';
}
function localizedSign(value) {
  if (!value) return '';
  const names = { aries:'Kos', taurus:'Bika', gemini:'Ikrek', cancer:'Rák', leo:'Oroszlán', virgo:'Szűz', libra:'Mérleg', scorpio:'Skorpió', sagittarius:'Nyilas', capricorn:'Bak', aquarius:'Vízöntő', pisces:'Halak' };
  return names[String(value).toLowerCase()] || value;
}
function prettyPlanetName(key) {
  const normalized = String(key).replace(/[_\s-]/g, '').toLowerCase();
  return PLANET_NAMES[normalized] || readableLabel(key);
}
function createResultCard(labelText, valueText, extraClass = '') {
  const card = document.createElement('article');
  card.className = `result-feature ${extraClass}`.trim();
  const label = document.createElement('span');
  label.className = 'result-feature-label';
  label.textContent = labelText;
  const value = document.createElement('strong');
  value.className = 'result-feature-value';
  value.textContent = valueText;
  card.append(label, value);
  return card;
}
function createDetailItem(labelText, valueText, hint = '') {
  const item = document.createElement('div');
  item.className = 'detail-item';
  const label = document.createElement('span');
  label.className = 'detail-item-label';
  label.textContent = labelText;
  const value = document.createElement('strong');
  value.textContent = valueText;
  item.append(label, value);
  if (hint) {
    const note = document.createElement('small');
    note.textContent = hint;
    item.append(note);
  }
  return item;
}
function createDisclosure(titleText, countText = '') {
  const details = document.createElement('details');
  details.className = 'result-disclosure';
  const summary = document.createElement('summary');
  summary.textContent = titleText;
  if (countText) {
    const count = document.createElement('span');
    count.className = 'disclosure-count';
    count.textContent = countText;
    summary.append(count);
  }
  const content = document.createElement('div');
  content.className = 'disclosure-content';
  details.append(summary, content);
  return { details, content };
}
function renderChartData(data) {
  chartResults.replaceChildren();
  chartResults.hidden = false;
  const heading = document.createElement('div');
  heading.className = 'results-intro';
  const title = document.createElement('h3');
  title.textContent = 'A születési képleted';
  const note = document.createElement('p');
  note.textContent = 'Az alábbi összefoglaló a megadott születési adatok alapján készült. A jegyek és fokok a számított égi pozíciókat mutatják.';
  heading.append(title, note);
  chartResults.append(heading);

  const planets = data.planets && typeof data.planets === 'object' ? data.planets : {};
  const getPlanet = (...names) => {
    for (const name of names) {
      const found = Object.entries(planets).find(([key]) => key.replace(/[_\s-]/g, '').toLowerCase() === name);
      if (found) return found[1];
    }
    return null;
  };
  const sun = getPlanet('sun');
  const moon = getPlanet('moon');
  const ascendant = longitudePosition(data.ascendant);
  const main = document.createElement('div');
  main.className = 'results-main';
  main.append(
    createResultCard('Nap-jegy', localizedSign(sun?.sign) || (sun?.longitude != null ? longitudePosition(sun.longitude)?.sign : '') || '—', 'sun-card'),
    createResultCard('Hold-jegy', localizedSign(moon?.sign) || (moon?.longitude != null ? longitudePosition(moon.longitude)?.sign : '') || '—', 'moon-card'),
    createResultCard('Aszcendens', ascendant ? `${ascendant.glyph} ${ascendant.sign}` : '—', 'asc-card')
  );
  chartResults.append(main);

  const positionStrip = document.createElement('div');
  positionStrip.className = 'position-strip';
  const ascValue = data.ascendant;
  const mcValue = data.midheaven;
  positionStrip.append(
    createDetailItem('Aszcendens foka', formatPosition(ascValue)),
    createDetailItem('MC – középégpont', formatPosition(mcValue)),
    createDetailItem('Házrendszer', data.houseSystem === 'Placidus' ? 'Placidus' : (data.houseSystem || '—'))
  );
  chartResults.append(positionStrip);

  const planetEntries = Object.entries(planets).filter(([, value]) => value && typeof value === 'object');
  const personalKeys = ['sun','moon','mercury','venus','mars'];
  const personal = planetEntries.filter(([key]) => personalKeys.includes(key.replace(/[_\s-]/g, '').toLowerCase()));
  const other = planetEntries.filter(([key]) => !personalKeys.includes(key.replace(/[_\s-]/g, '').toLowerCase()));
  const renderPlanets = (entries) => {
    const grid = document.createElement('div');
    grid.className = 'planet-grid';
    for (const [key, details] of entries) {
      const card = document.createElement('article');
      card.className = 'planet-card';
      const label = document.createElement('h4');
      label.textContent = prettyPlanetName(key);
      const sign = localizedSign(details.sign) || (details.longitude != null ? longitudePosition(details.longitude)?.sign : '');
      const degree = Number(details.degInSign);
      const position = sign && Number.isFinite(degree) ? `${sign} · ${Math.floor(degree)}°${String(Math.round((degree % 1) * 60) % 60).padStart(2, '0')}′` : (details.longitude != null ? formatPosition(details.longitude) : (sign || 'Pozíció elérhető'));
      const value = document.createElement('strong');
      value.textContent = position;
      const meta = document.createElement('p');
      const metaParts = [];
      if (details.house !== undefined && details.house !== null) metaParts.push(`${details.house}. ház`);
      if (details.retrograde === true) metaParts.push('Retrográd mozgás');
      meta.textContent = metaParts.join(' · ') || ' ';
      card.append(label, value, meta);
      grid.append(card);
    }
    return grid;
  };
  if (personal.length) {
    const section = document.createElement('section');
    section.className = 'result-section';
    const h = document.createElement('h4');
    h.textContent = 'Személyes bolygók';
    section.append(h, renderPlanets(personal));
    chartResults.append(section);
  }
  if (other.length) {
    const disclosure = createDisclosure('További égitestek', `${other.length} adat`);
    disclosure.content.append(renderPlanets(other));
    chartResults.append(disclosure.details);
  }
  if (Array.isArray(data.cusps) && data.cusps.length) {
    const disclosure = createDisclosure('Házak és házcsúcsok', `${data.cusps.length} ház`);
    const grid = document.createElement('div');
    grid.className = 'house-grid';
    data.cusps.forEach((value, index) => {
      grid.append(createDetailItem(`${index + 1}. ház`, formatPosition(value)));
    });
    disclosure.content.append(grid);
    chartResults.append(disclosure.details);
  }
  const footer = document.createElement('p');
  footer.className = 'results-footnote';
  footer.textContent = 'Az asztrológia szimbolikus értelmezési rendszer. A fokértékek az ekliptikai hosszúságból átszámítva, jegyen belüli fokként jelennek meg.';
  chartResults.append(footer);
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
