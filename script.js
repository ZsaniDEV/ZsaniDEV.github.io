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
const EVENT_TRANSLATIONS = {
  'new moon': 'Újhold', 'full moon': 'Telihold', 'first quarter': 'Első negyed', 'last quarter': 'Utolsó negyed',
  'waxing crescent': 'Növekvő holdsarló', 'waxing gibbous': 'Növekvő hold', 'waning gibbous': 'Fogyó hold',
  'waning crescent': 'Fogyó holdsarló', 'solar eclipse': 'Napfogyatkozás', 'lunar eclipse': 'Holdfogyatkozás',
  'mercury retrograde': 'A Merkúr látszólagos hátráló mozgása', 'venus retrograde': 'A Vénusz látszólagos hátráló mozgása',
  'mars retrograde': 'A Mars látszólagos hátráló mozgása', 'jupiter retrograde': 'A Jupiter látszólagos hátráló mozgása',
  'saturn retrograde': 'A Szaturnusz látszólagos hátráló mozgása', 'uranus retrograde': 'Az Uránusz látszólagos hátráló mozgása',
  'neptune retrograde': 'A Neptunusz látszólagos hátráló mozgása', 'pluto retrograde': 'A Plútó látszólagos hátráló mozgása',
  'retrograde': 'Látszólagos hátráló mozgás', 'direct': 'Előrehaladó mozgás',
  'ingress': 'Belépés egy új csillagjegybe', 'conjunction': 'Együttállás', 'opposition': 'Szembenállás',
  'trine': 'Trigon fényszög', 'square': 'Kvadrát fényszög', 'sextile': 'Szextil fényszög',
  'station retrograde': 'Hátráló mozgás kezdete', 'station direct': 'A hátráló mozgás vége',
  'season start': 'Az időszak kezdete', 'retrograde start': 'A látszólagos hátráló mozgás kezdete',
  'retrograde end': 'A látszólagos hátráló mozgás vége', 'season end': 'Az időszak vége',
  'aries': 'Kos', 'taurus': 'Bika', 'gemini': 'Ikrek', 'cancer': 'Rák', 'leo': 'Oroszlán',
  'virgo': 'Szűz', 'libra': 'Mérleg', 'scorpio': 'Skorpió', 'sagittarius': 'Nyilas',
  'capricorn': 'Bak', 'aquarius': 'Vízöntő', 'pisces': 'Halak'
};
function formatEnglishDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}
function formatEnglishTime(value) {
  const match = String(value).match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return value;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'pm') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}
function translateEventText(value) {
  const original = String(value ?? '').trim();
  if (!original) return '';
  const normalized = original.toLowerCase().replaceAll('_', ' ').replace(/[-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (EVENT_TRANSLATIONS[normalized]) return EVENT_TRANSLATIONS[normalized];

  const signNames = {
    aries:'Kos', taurus:'Bika', gemini:'Ikrek', cancer:'Rák', leo:'Oroszlán',
    virgo:'Szűz', libra:'Mérleg', scorpio:'Skorpió', sagittarius:'Nyilas',
    capricorn:'Bak', aquarius:'Vízöntő', pisces:'Halak'
  };
  const sign = (name) => signNames[String(name || '').toLowerCase()] || name;
  let match = original.match(/^(.+?) season begins$/i);
  if (match) return `A ${sign(match[1])} időszaka kezdődik`;
  match = original.match(/^(New Moon|Full Moon) in (.+)$/i);
  if (match) return `${/^new/i.test(match[1]) ? 'Újhold' : 'Telihold'} a ${sign(match[2])} jegyében`;
  match = original.match(/^(Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) (?:goes|turns) retrograde$/i);
  if (match) return `A ${prettyPlanetName(match[1])} látszólagos hátráló mozgásba kezd`;
  match = original.match(/^(Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) turns direct$/i);
  if (match) return `A ${prettyPlanetName(match[1])} látszólagos hátráló mozgása véget ér`;
  match = original.match(/^(Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) enters (.+)$/i);
  if (match) return `A ${prettyPlanetName(match[1])} belép a ${sign(match[2])} jegyébe`;

  let result = original;
  const replacements = [
    [/^The sun enters (\w+) at ([\d:]+\s*[ap]m)(?:\s+[A-Z]{1,4})? on ([A-Za-z]+ \d{1,2},? \d{4}), running until ([A-Za-z]+ \d{1,2},? \d{4})\.?$/i,
      (_, s, time, date, until) => `A Nap ${formatEnglishDate(date)} napján ${formatEnglishTime(time)}-kor belép a ${sign(s)} jegyébe, és ${formatEnglishDate(until)} napjáig ott tartózkodik.`],
    [/The (new moon|full moon) reaches ([\d.]+)° (\w+) at ([\d:]+\s*[ap]m)(?:\s+[A-Z]{1,4})? on ([A-Za-z]+ \d{1,2},? \d{4})\.?/i,
      (_, phase, degree, s, time, date) => `${/^new/i.test(phase) ? 'Az újhold' : 'A telihold'} ${formatEnglishDate(date)} napján ${formatEnglishTime(time)}-kor a ${sign(s)} jegy ${degree}. fokánál következik be.`],
    [/^(Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) stations retrograde at ([\d.]+)° (\w+) on ([A-Za-z]+ \d{1,2},? \d{4}), and turns direct again on ([A-Za-z]+ \d{1,2},? \d{4})\.?$/i,
      (_, planet, degree, s, date, until) => `A ${prettyPlanetName(planet)} ${formatEnglishDate(date)} napján kezdi meg látszólagos hátráló mozgását a ${sign(s)} jegy ${degree}. fokánál. A mozgás ${formatEnglishDate(until)} napján ér véget.`],
    [/^(Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) stations direct at ([\d.]+)° (\w+) on ([A-Za-z]+ \d{1,2},? \d{4}), ending the retrograde motion that began ([A-Za-z]+ \d{1,2},? \d{4})\.?$/i,
      (_, planet, degree, s, date, began) => `A ${prettyPlanetName(planet)} ${formatEnglishDate(date)} napján befejezi látszólagos hátráló mozgását a ${sign(s)} jegy ${degree}. fokánál. A hátrálás ${formatEnglishDate(began)} napján kezdődött.`]
  ];
  for (const [pattern, formatter] of replacements) {
    const found = result.match(pattern);
    if (found) return result.replace(pattern, formatter);
  }
  if (/[A-Za-z]{3,}/.test(original) && /\b(the|and|on|at|enters|begins|reaches|stations|until|running|ending|again|into|in)\b/i.test(original)) {
    return 'Az esemény részletei egyelőre csak angolul érhetők el.';
  }
  return original.replaceAll('_', ' ');
}
function readableLabel(value) {
  return translateEventText(value);
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
function parseEventDate(value) {
  if (!value) return null;
  // Treat date-only API values as calendar dates, not UTC instants.
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function eventDate(value) {
  if (!value) return 'Dátum nélkül';
  const date = parseEventDate(value);
  if (!date) return String(value);
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}
function getEventGuidance(title, kind, rawDescription) {
  const text = `${title} ${kind || ''} ${rawDescription || ''}`.toLowerCase();
  if (/újhold|new moon/.test(text)) return {
    summary: 'Az újhold az újrakezdés és a szándékok kijelölésének ideje: most érdemes megfogalmaznod, merre szeretnél továbbhaladni.',
    experience: 'A következő napokban az új tervek, a friss ötletek és a változtatás igénye kerülhet előtérbe. Könnyebben felismerheted, mi az, aminek szeretnél helyet adni az életedben, és mely régi szokásokat nőtted ki.',
    watch: 'Jelölj ki egy fontos célt, és tedd meg az első konkrét lépést felé. A most megfogalmazott szándékokat támogasd átgondolt tervvel és következetes cselekvéssel.'
  };
  if (/telihold|full moon/.test(text)) return {
    summary: 'A telihold a felismerések, a kiteljesedés és a lezárás időszaka: a fontosabb érzelmi és gyakorlati kérdések most nagyobb hangsúlyt kaphatnak.',
    experience: 'A következő napokban világosabban kirajzolódhat, hová jutottál egy folyamatban, mi működik jól, és mi az, amin változtatnod kell. A kapcsolatokban is erősebben megmutatkozhatnak a kimondatlan igények és a valódi prioritások.',
    watch: 'Használd ki ezt az időszakot az összegzésre és az őszinte beszélgetésekre. Ha egy helyzet érzelmileg felfokozottá válik, hallgasd meg a másik felet is, és csak átgondoltan hozz végleges döntést.'
  };
  if (/merkúr|mercury/.test(text) && /hátráló|retrograde|retrográd/.test(text)) return {
    summary: 'A Merkúr hátráló időszaka az újraellenőrzés, a pontosítás és a régi ügyek rendezésének időszaka. A kommunikáció és a szervezés több figyelmet kérhet.',
    experience: 'Régi beszélgetések, félbehagyott feladatok és korábban elnapolt kérdések kerülhetnek ismét előtérbe. Könnyebben észreveheted a részleteket, amelyek felett korábban átsiklottál, és szükségét érezheted annak, hogy tisztázz egy félreértést.',
    watch: 'Olvasd át a fontos üzeneteket, ellenőrizd a dátumokat, címzetteket és foglalásokat. A megállapodásokat rögzítsd írásban, a fontos fájlokról készíts biztonsági mentést, és hagyj időt az ügyintézésre.'
  };
  if (/vénusz|venus/.test(text) && /hátráló|retrograde|retrográd/.test(text)) return {
    summary: 'A Vénusz hátráló időszaka a kapcsolatok, az önértékelés és az anyagi prioritások felülvizsgálatára irányítja a figyelmet.',
    experience: 'Világosabban láthatod, mely kapcsolatok adnak valódi kölcsönösséget, hol van szükség őszintébb kommunikációra, és mely kiadások tükrözik az értékeidet. Korábbi érzelmi témák vagy régi ismeretségek is újra fontossá válhatnak.',
    watch: 'Fogalmazd meg egyértelműen az igényeidet és a határaidat. Nagyobb vásárlás előtt nézd át a költségeket, és olyan döntést hozz, amely hosszabb távon is összhangban áll a prioritásaiddal.'
  };
  if (/hátráló mozgás vége|retrograde end|stations direct|előrehaladó mozgás/.test(text)) return {
    summary: 'A hátráló szakasz lezárulta a tanulságok összegzését és a fokozatos előrelépést jelzi: a korábban elakadt ügyek új lendületet kaphatnak.',
    experience: 'Az elmúlt időszak tapasztalatai most segíthetnek tisztábban látni, hogyan érdemes folytatnod egy tervet vagy lezárnod egy függőben maradt kérdést. Könnyebb lehet rendet tenni, dönteni a következő lépésről, és visszatérni a korábban félretett feladatokhoz.',
    watch: 'Vedd elő a korábbi terveidet, nézd át, mi változott, és határozd meg a következő lépéseket. A lendületet fokozatos, következetes haladással használd ki.'
  };
  if (/hátráló mozgásba kezd|retrograde start|stations retrograde/.test(text)) return {
    summary: 'A hátráló szakasz kezdetével az adott bolygó témái felülvizsgálatra kerülnek: most a részletek, a korábbi döntések és a félbehagyott ügyek kapnak nagyobb hangsúlyt.',
    experience: 'A következő időszakban visszatérhetsz egy korábbi kérdéshez, átdolgozhatsz egy tervet, vagy felismerheted, hogy egy folyamat pontosításra szorul. A gyorsaságnál többet érhet a körültekintő, alapos munka.',
    watch: 'Ellenőrizd a részleteket, kérdezz vissza, ha valami nem világos, és tervezz tartalékidőt. A felülvizsgálatot használd arra, hogy megerősítsd az alapokat és kijavítsd, ami nem működik.'
  };
  if (/időszaka kezdődik|season start|belép a .* jegyébe|enters/.test(text)) return {
    summary: 'A jegyváltás új hangsúlyt ad a következő időszaknak: az adott jegyhez társított témák és célok kerülnek előtérbe.',
    experience: 'Nagyobb figyelmet kaphat a kezdeményezés, a kapcsolódás, a rendszerezés vagy a hosszabb távú tervezés — attól függően, melyik bolygó és jegy érintett. Ez jó alkalom arra, hogy felismerd, melyik életterületen szeretnél tudatosabban haladni.',
    watch: 'Válassz egy területet, amelyre több figyelmet fordítasz, és fogalmazz meg hozzá konkrét célt. A szándékot váltsd apró, rendszeres lépésekre, és figyeld, milyen lehetőségek segítik a haladásodat.'
  };
  if (/mars|jupiter|szaturnusz|uránusz|neptunusz|plútó/.test(text)) return {
    summary: 'Ez a bolygóesemény az adott bolygóhoz kapcsolódó témákat helyezi előtérbe, például a cselekvést, a növekedést, a felelősséget vagy a változást.',
    experience: 'Az esemény jellegétől függően erősebb késztetést érezhetsz a kezdeményezésre, a terveid bővítésére, a rendrakásra vagy egy régóta halogatott változtatásra. Érdemes megfigyelni, melyik téma kapcsolódik leginkább a jelenlegi élethelyzetedhez.',
    watch: 'Használd tudatosan a lendületedet: jelölj ki prioritásokat, és a nagyobb célokat bontsd megvalósítható lépésekre. A lelkesedés mellé társíts reális ütemtervet és következetes utánkövetést.'
  };
  return {
    summary: 'Ez az égi esemény egy fontos téma tudatosítására és a következő lépések átgondolására hívja fel a figyelmet.',
    experience: 'Az esemény körüli napokban érdemes figyelni arra, mely kérdések, döntések vagy kapcsolatok kerülnek előtérbe. A visszatérő témák segíthetnek felismerni, hol van szükség több figyelemre, tisztázásra vagy új irány kijelölésére.',
    watch: 'Jegyezd fel a felismeréseidet, majd válaszd ki azt az egy lépést, amely a legtöbbet segít a továbblépésben. Maradj figyelmes a lehetőségekre, és igazítsd a döntéseidet a tényleges körülményeidhez.'
  };
}
function createEventCard(event, isToday = false) {
  const card = document.createElement('article');
  card.className = 'event-card';
  const dateValue = event.date || event.datetime || event.start;
  const date = document.createElement('div');
  date.className = 'event-date';
  date.textContent = isToday ? `Ma · ${eventDate(dateValue)}` : eventDate(dateValue);
  const title = document.createElement('h3');
  title.textContent = translateEventText(event.headline || event.title || event.name || event.kind || 'Égi esemény');
  const rawDescription = event.short || event.description || event.long || '';
  const translatedDescription = translateEventText(rawDescription);
  const guidance = getEventGuidance(title.textContent, event.kind || '', rawDescription);
  const description = document.createElement('p');
  description.textContent = translatedDescription === 'Az esemény részletei egyelőre csak angolul érhetők el.'
    ? guidance.summary
    : (translatedDescription || guidance.summary);
  card.append(date, title, description);
  const details = document.createElement('details');
  details.className = 'event-details';
  const summary = document.createElement('summary');
  summary.textContent = 'Mit jelent ez a gyakorlatban?';
  details.append(summary);
  for (const [headingText, bodyText] of [
    ['Hogyan tapasztalhatod meg?', guidance.experience],
    ['Mire érdemes figyelni?', guidance.watch]
  ]) {
    const section = document.createElement('section');
    const heading = document.createElement('h4');
    heading.textContent = headingText;
    const paragraph = document.createElement('p');
    paragraph.textContent = bodyText;
    section.append(heading, paragraph);
    details.append(section);
  }
  card.append(details);
  if (event.kind) {
    const kind = document.createElement('span');
    kind.className = 'event-kind';
    kind.textContent = translateEventText(event.kind);
    card.append(kind);
  }
  return card;
}
function appendEventSection(titleText, events, isToday = false) {
  if (!events.length) return;
  const section = document.createElement('section');
  section.className = 'event-list-section';
  const heading = document.createElement('h3');
  heading.className = 'event-list-heading';
  heading.textContent = titleText;
  section.append(heading);
  const grid = document.createElement('div');
  grid.className = 'event-grid';
  for (const event of events) grid.append(createEventCard(event, isToday));
  section.append(grid);
  skyEvents.append(section);
}
function renderEvents(data) {
  const events = Array.isArray(data) ? data : (data.events || []);
  skyEvents.replaceChildren();
  const todayKey = localDateKey(new Date());
  const datedEvents = events.map(event => {
    const value = event.date || event.datetime || event.start;
    const date = parseEventDate(value);
    return { event, date, key: date ? localDateKey(date) : null };
  }).sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  const todaysEvents = datedEvents.filter(item => item.key === todayKey).map(item => item.event);
  const upcomingEvents = datedEvents.filter(item => item.key && item.key > todayKey).map(item => item.event).slice(0, 9);
  appendEventSection('Mai égi események', todaysEvents, true);
  appendEventSection('Közelgő események', upcomingEvents);
  if (!todaysEvents.length) {
    const note = document.createElement('p');
    note.className = 'today-empty-note';
    note.textContent = 'Ma nincs kiemelt égi esemény. A következő napok eseményeit lent találod.';
    skyEvents.prepend(note);
  }
  if (!todaysEvents.length && !upcomingEvents.length) {
    const note = document.createElement('p');
    note.className = 'today-empty-note';
    note.textContent = 'Most nincs megjeleníthető esemény ebben az időszakban.';
    skyEvents.replaceChildren(note);
  }
  const updatedAt = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  setStatus(skyStatus, `Frissítve ma ${updatedAt}-kor · Forrás: CosmyDay. Az oldal megnyitásakor és visszatéréskor frissül.`);
}
let lastEventsFetch = 0;
let eventsRequestInProgress = false;
async function loadEvents() {
  if (eventsRequestInProgress) return;
  eventsRequestInProgress = true;
  try {
    const response = await fetch('/.netlify/functions/events?days=45&min_importance=35');
    if (!response.ok) throw new Error(`Az égi események nem érhetők el (HTTP ${response.status}).`);
    renderEvents(await response.json());
    lastEventsFetch = Date.now();
  } catch (error) {
    skyEvents.replaceChildren();
    setStatus(skyStatus, error.message || 'Az aktuális események most nem tölthetők be. Kérjük, próbáld újra később.', true);
  } finally {
    eventsRequestInProgress = false;
  }
}
function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0, 0);
  window.setTimeout(async () => {
    await loadEvents();
    scheduleMidnightRefresh();
  }, Math.max(1000, midnight.getTime() - now.getTime()));
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastEventsFetch > 15 * 60 * 1000) loadEvents();
});
window.addEventListener('focus', () => {
  if (Date.now() - lastEventsFetch > 15 * 60 * 1000) loadEvents();
});
loadEvents();
scheduleMidnightRefresh();
