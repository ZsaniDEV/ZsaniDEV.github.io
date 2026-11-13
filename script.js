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
  return position ? `${position.sign} ${position.degrees}°${String(position.minutes).padStart(2, '0')}′` : 'Nincs adat';
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
  const reportSnapshot = JSON.stringify({
    data,
    birth: { date: form.elements.birthDate.value, time: String(form.elements.birthTime.value || '12:00'), place: String(form.elements.birthPlace.value || '').trim() },
    savedAt: new Date().toISOString()
  });
  // Keep the chart in both persistent and same-tab session storage before any Stripe redirect.
  try { localStorage.setItem('cosmyday_premium_report_data', reportSnapshot); }
  catch (error) { console.warn('A képletadatok tartós mentése nem sikerült.', error); }
  try { sessionStorage.setItem('cosmyday_premium_report_data', reportSnapshot); }
  catch (error) { console.warn('A képletadatok munkamenet-mentése nem sikerült.', error); }
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
    createResultCard('Aszcendens', ascendant ? ascendant.sign : '—', 'asc-card'),
    createResultCard('Hold-jegy', localizedSign(moon?.sign) || (moon?.longitude != null ? longitudePosition(moon.longitude)?.sign : '') || '—', 'moon-card')
  );
  chartResults.append(main);

  const interpretationSection = document.createElement('section');
  interpretationSection.className = 'result-section personal-interpretation';
  const interpretationHeading = document.createElement('h3');
  interpretationHeading.textContent = 'A képleted első összefüggései';
  const interpretationIntro = document.createElement('p');
  interpretationIntro.textContent = 'Rövid, szimbolikus kiindulópont a három fő jelölő alapján. Az értelmezés önismereti lehetőség, amelyet a saját tapasztalataiddal érdemes összevetned.';
  interpretationSection.append(interpretationHeading, interpretationIntro);
  const signThemes = {
    'Kos': 'A kezdeményezés, az önálló döntés és a lendület témái kerülhetnek előtérbe. Érdemes megfigyelned, mikor segít a gyors cselekvés, és mikor hasznos egy rövid szünet.',
    'Bika': 'A biztonság, a kiszámíthatóság és az érzékszervi tapasztalatok kaphatnak hangsúlyt. Figyeld meg, hogyan teremtesz stabilitást, és mennyire tudsz rugalmas maradni a változásokban.',
    'Ikrek': 'A kíváncsiság, a tanulás és a kommunikáció lehetnek fontos kapaszkodók. Hasznos kérdés, hogyan választod ki a sok információ közül azt, amire valóban figyelmet szeretnél fordítani.',
    'Rák': 'Az érzelmi biztonság, a kötődés és a gondoskodás témái lehetnek hangsúlyosak. Érdemes megfigyelned, hogyan tudsz másokról gondoskodni úgy, hogy közben a saját igényeidnek is helyet adsz.',
    'Oroszlán': 'Az önkifejezés, a kreativitás és az elismerés iránti igény kerülhet fókuszba. Gondold át, milyen helyzetekben tudsz természetesen megmutatkozni, és hogyan őrzöd meg az önértékelésed külső visszajelzésektől függetlenül.',
    'Szűz': 'A rendszerezés, a részletekre figyelés és a hasznosság érzése lehet meghatározó. Figyeld meg, mikor támogat a precizitás, és mikor érdemes elfogadnod, hogy az elég jó megoldás is előrelépés.',
    'Mérleg': 'A kölcsönösség, a harmónia és a kapcsolati egyensúly kaphat hangsúlyt. Fontos önismereti kérdés lehet, hogyan egyezteted össze a mások szempontjai iránti érzékenységet a saját álláspontod képviseletével.',
    'Skorpió': 'Az intenzitás, a bizalom és a mélyebb összefüggések megértése lehet fontos téma. Érdemes megfigyelned, hogyan épül nálad a bizalom, és miként tudsz nyitott maradni bizonytalan helyzetekben is.',
    'Nyilas': 'A tágabb perspektíva, a felfedezés és a személyes meggyőződések kerülhetnek előtérbe. Gondold át, hogyan adsz teret a fejlődésnek, miközben a részleteket és a gyakorlati következményeket is figyelembe veszed.',
    'Bak': 'A felelősség, a hosszú távú célok és a teljesítmény témái lehetnek hangsúlyosak. Hasznos kérdés, hogyan építesz tartós eredményeket úgy, hogy a pihenésnek és a személyes kapcsolatoknak is maradjon helye.',
    'Vízöntő': 'Az önálló gondolkodás, az újítás és a közösséghez való viszony lehet fontos kapaszkodó. Figyeld meg, hogyan tudod képviselni az egyediségedet, miközben együttműködsz másokkal.',
    'Halak': 'A képzelőerő, az együttérzés és a finom benyomások iránti fogékonyság kerülhet előtérbe. Érdemes tudatosan különválasztanod a megérzéseidet a biztos tényektől, és világos határokat kialakítanod.'
  };
  const addInterpretation = (label, planet, sign) => {
    if (!sign) return;
    const block = document.createElement('div');
    block.className = 'interpretation-item';
    const subheading = document.createElement('h4');
    subheading.textContent = label + ' · ' + sign;
    const paragraph = document.createElement('p');
    paragraph.textContent = signThemes[sign] || 'Ez a jelölő egy lehetséges önismereti témát emel ki. A jelentését a képlet többi elemével és a saját tapasztalataiddal együtt érdemes értelmezni.';
    block.append(subheading, paragraph);
    interpretationSection.append(block);
  };
  const sunSign = localizedSign(sun?.sign) || (sun?.longitude != null ? longitudePosition(sun.longitude)?.sign : '');
  const moonSign = localizedSign(moon?.sign) || (moon?.longitude != null ? longitudePosition(moon.longitude)?.sign : '');
  addInterpretation('Nap', sun, sunSign);
  addInterpretation('Aszcendens', null, ascendant?.sign);
  addInterpretation('Hold', moon, moonSign);
  chartResults.append(interpretationSection);

  const positionStrip = document.createElement('div');
  positionStrip.className = 'position-strip';
  const mcPosition = longitudePosition(data.midheaven);
  positionStrip.append(
    createDetailItem('MC – középégpont', mcPosition ? mcPosition.sign : 'Részletes adat a prémium elemzésben'),
    createDetailItem('Pontos fokadatok', 'Prémium elemzésben'),
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
      const position = sign || (details.longitude != null ? (longitudePosition(details.longitude)?.sign || 'Pozíció elérhető') : 'Pozíció elérhető');
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
      const position = longitudePosition(value);
      grid.append(createDetailItem(`${index + 1}. ház`, position ? position.sign : 'A pontos fokadat a prémium elemzésben érhető el'));
    });
    disclosure.content.append(grid);
    chartResults.append(disclosure.details);
  }
  const premiumPanel = document.createElement('section');
  premiumPanel.className = 'premium-preview';
  const premiumEyebrow = document.createElement('p');
  premiumEyebrow.className = 'eyebrow';
  premiumEyebrow.textContent = 'PRÉMIUM · TELJES ÉLETÚT-ELEMZÉS';
  const premiumTitle = document.createElement('h3');
  premiumTitle.textContent = 'A képleted mélyebb összefüggései';
  const premiumDescription = document.createElement('p');
  premiumDescription.textContent = 'A részletes pszichológiai szemléletű értelmezés a személyiség, a családi minták, a párkapcsolatok, a hivatás és a hosszú távú fejlődési témák lehetséges összefüggéseit vizsgálja. A gyerekkori eseményeket a képlet nem tudja tényként azonosítani; az elemzés önismereti kérdésekkel segít összevetni a szimbolikus mintákat a saját tapasztalataiddal.';
  const premiumList = document.createElement('ul');
  for (const itemText of [
    'Bolygók pontos fokai, házhelyzetei és fényszögei',
    'Személyiség és érzelmi szükségletek mélyebb összefüggései',
    'Családi és párkapcsolati minták önismereti megközelítésben',
    'Hivatás, anyagi biztonság és életút témái',
    'Személyre szabott reflexiós kérdések és gyakorlati útmutató'
  ]) {
    const item = document.createElement('li');
    item.textContent = itemText;
    premiumList.append(item);
  }
  const premiumStatus = document.createElement('p');
  premiumStatus.className = 'premium-status';
  premiumStatus.textContent = 'A prémium riport díja 5 000 Ft. A választható magasabb összegek önkéntes támogatások, amelyek a projekt fenntartását segítik; a szolgáltatás tartalma minden összegnél azonos.';
  const paymentExplainer = document.createElement('div');
  paymentExplainer.className = 'payment-explainer';
  paymentExplainer.innerHTML = '<h4>Mit kapsz a vásárlásért?</h4><p>A vásárlással személyre szabott, részletes asztrológiai önismereti riportot kapsz, amely PDF formátumban menthető. A riport a kiszámított születési képleted adataira épül, fejezeteket és nyomtatható, kézzel kitölthető munkalapokat tartalmaz.</p><p><strong>Az összegválasztás jelentése:</strong> 5 000 Ft a riporthoz kapcsolódó alapösszeg. 10 000–25 000 Ft között ennél nagyobb, önkéntes támogatást is választhatsz. A magasabb összeg nem jelent több fejezetet, külön funkciót, gyorsabb teljesítést vagy más többletszolgáltatást. Minden választott összeg ugyanazt a riportot nyitja meg.</p><p>A vásárlás a Stripe biztonságos fizetési felületén történik. A CosmyDay nem kapja meg és nem tárolja a bankkártyád teljes adatait.</p>';
  const paymentControls = document.createElement('div');
  paymentControls.className = 'premium-payment-controls';
  const amountLabel = document.createElement('label');
  amountLabel.textContent = 'Választott támogatási összeg';
  const amountSelect = document.createElement('select');
  amountSelect.setAttribute('aria-label', 'Választott támogatási összeg');
  for (const amount of [5000, 10000, 15000, 20000, 25000]) {
    const option = document.createElement('option');
    option.value = String(amount);
    option.textContent = amount.toLocaleString('hu-HU') + ' Ft';
    amountSelect.append(option);
  }
  const emailLabel = document.createElement('label');
  emailLabel.textContent = 'E-mail-cím a megrendelés visszaigazolásához';
  emailLabel.htmlFor = 'premium-customer-email';
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'premium-customer-email';
  emailInput.name = 'premium-customer-email';
  emailInput.autocomplete = 'email';
  emailInput.required = true;
  emailInput.maxLength = 254;
  emailInput.placeholder = 'nev@example.com';
  emailInput.setAttribute('aria-describedby', 'premium-email-note');
  const emailNote = document.createElement('p');
  emailNote.id = 'premium-email-note';
  emailNote.className = 'payment-email-note';
  emailNote.textContent = 'Ezt a címet továbbítjuk a Stripe-nak a vásárlás visszaigazolásához. A riport e-mailes kézbesítése későbbi fejlesztési lépés.';
  const legalAcceptance = document.createElement('div');
  legalAcceptance.className = 'legal-acceptance';
  const makeLegalCheckbox = (id, labelHtml) => {
    const label = document.createElement('label');
    label.className = 'legal-check-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.required = true;
    label.append(checkbox);
    const text = document.createElement('span');
    text.innerHTML = labelHtml;
    label.append(text);
    legalAcceptance.append(label);
    return checkbox;
  };
  const termsCheckbox = makeLegalCheckbox('accept-terms', 'Elolvastam és elfogadom az <a href="/aszf.html" target="_blank" rel="noopener">Általános Szerződési Feltételeket (ÁSZF)</a>.');
  const privacyCheckbox = makeLegalCheckbox('accept-privacy', 'Elolvastam az <a href="/adatkezeles.html" target="_blank" rel="noopener">Adatkezelési tájékoztatót</a>, és tudomásul vettem a fizetéshez és a riport készítéséhez kapcsolódó adatkezelést.');
  const earlyDeliveryCheckbox = makeLegalCheckbox('request-early-delivery', 'Kifejezetten kérem, hogy a digitális riport szolgáltatása a 14 napos elállási határidő lejárta előtt megkezdődjön. Tudomásul veszem, hogy a digitális tartalom teljesítésének megkezdésével a jogszabály szerinti feltételek fennállása esetén elveszíthetem az elállási jogomat.');
  const paymentButton = document.createElement('button');
  paymentButton.type = 'button';
  const updatePayButtonLabel = () => { paymentButton.textContent = 'Megrendelés · ' + Number(amountSelect.value).toLocaleString('hu-HU') + ' Ft'; };
  updatePayButtonLabel();
  amountSelect.addEventListener('change', updatePayButtonLabel);
  paymentButton.addEventListener('click', async () => {
    if (!emailInput.checkValidity()) { premiumStatus.textContent = 'Adj meg egy érvényes e-mail címet a vásárláshoz.'; emailInput.reportValidity(); emailInput.focus(); return; }
    // Owner-only complimentary access for the user's designated test email.
    if (emailInput.value.trim().toLowerCase() === 'dev.zsani@gmail.com') {
      premiumStatus.textContent = 'Tulajdonosi hozzáférés felismerve. A saját képleted riportját díjmentesen megnyithatod.';
      const ownerReportButton = document.createElement('button');
      ownerReportButton.type = 'button';
      ownerReportButton.textContent = 'Saját képletem riportja · díjmentes';
      ownerReportButton.addEventListener('click', openPremiumReport);
      premiumStatus.append(ownerReportButton);
      return;
    }
    if (!termsCheckbox.checked || !privacyCheckbox.checked || !earlyDeliveryCheckbox.checked) {
      premiumStatus.textContent = 'A fizetés előtt az ÁSZF elfogadása, az adatkezelési tájékoztató tudomásulvétele és a digitális riport korai teljesítésére vonatkozó nyilatkozat szükséges.';
      (!termsCheckbox.checked ? termsCheckbox : !privacyCheckbox.checked ? privacyCheckbox : earlyDeliveryCheckbox).focus();
      return;
    }
    paymentButton.disabled = true;
    premiumStatus.textContent = 'A biztonságos vásárlási felület előkészítése…';
    try {
      const checkoutResponse = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amountSelect.value), customer_email: emailInput.value.trim(), terms_accepted: true, privacy_acknowledged: true, early_delivery_requested: true, withdrawal_loss_acknowledged: true, terms_version: '2026-11-13-draft-1', privacy_version: '2026-11-13-draft-1' })
      });
      const checkoutText = await checkoutResponse.text();
      let checkout;
      try { checkout = JSON.parse(checkoutText); } catch {
        const contentType = checkoutResponse.headers.get('content-type') || '';
        throw new Error('A Netlify fizetési funkció nem JSON választ adott (HTTP ' + checkoutResponse.status + ', ' + contentType + '). Valószínűleg a legutóbbi deploy még nem tartalmazza a create-checkout-session funkciót. Ellenőrizd a Netlify Deploy logot.');
      }
      if (!checkoutResponse.ok || !checkout.url) throw new Error(checkout.error || 'A Stripe vásárlási felülete nem érhető el (HTTP ' + checkoutResponse.status + ').');
      window.location.assign(checkout.url);
    } catch (error) {
      premiumStatus.textContent = error.message || 'A vásárlás indítása nem sikerült.';
      paymentButton.disabled = false;
    }
  });
  amountLabel.append(amountSelect);
  paymentControls.append(emailLabel, emailInput, emailNote, amountLabel, legalAcceptance, paymentButton);
  premiumPanel.append(premiumEyebrow, premiumTitle, premiumDescription, premiumList, paymentExplainer, premiumStatus, paymentControls);
  chartResults.append(premiumPanel);

  const footer = document.createElement('p');
  footer.className = 'results-footnote';
  footer.textContent = 'Az asztrológia szimbolikus értelmezési rendszer. A fokértékek az ekliptikai hosszúságból átszámítva, jegyen belüli fokként jelennek meg.';
  chartResults.append(footer);
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const dateInput = form.elements.birthDate;
  const date = String(dateInput.value || '');
  const time = String(form.elements.birthTime.value || '12:00');
  const place = String(form.elements.birthPlace.value || '').trim();
  if (!date || !place) return;

  // Read the browser's native date value rather than FormData's serialized value.
  // valueAsDate is UTC-based for input[type="date"], avoiding locale-format issues.
  const selectedDate = dateInput.valueAsDate;
  if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
    setStatus(chartStatus, 'Válassz érvényes születési dátumot.', true);
    dateInput.focus();
    return;
  }
  const year = selectedDate.getUTCFullYear();
  const month = selectedDate.getUTCMonth() + 1;
  const day = selectedDate.getUTCDate();
  if (year < 1 || year > 9999) {
    setStatus(chartStatus, 'A születési évszámot 4 számjeggyel add meg.', true);
    dateInput.focus();
    return;
  }
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
  skyEvents.replaceChildren();
  setStatus(skyStatus, 'Az égi események betöltése…');
  try {
    // Avoid an endless loading state if the upstream astrology service or Netlify function stalls.
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch('/.netlify/functions/events?days=45&min_importance=35', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error(`Az égi események nem érhetők el (HTTP ${response.status}).`);
    const payload = await response.json();
    renderEvents(payload);
    lastEventsFetch = Date.now();
  } catch (error) {
    skyEvents.replaceChildren();
    const message = error.name === 'AbortError'
      ? 'Az égi események szolgáltatása 15 másodpercen belül nem válaszolt. Próbáld meg újra.'
      : (error.message || 'Az aktuális események most nem tölthetők be. Próbáld meg újra később.');
    setStatus(skyStatus, message, true);
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'primary-button';
    retryButton.textContent = 'Égi események újratöltése';
    retryButton.addEventListener('click', loadEvents);
    skyEvents.append(retryButton);
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


function openPremiumReport() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('cosmyday_premium_report_data') || 'null'); } catch { saved = null; }
  if (!saved?.data || !saved?.birth) {
    try { saved = JSON.parse(sessionStorage.getItem('cosmyday_premium_report_data') || 'null'); } catch { saved = null; }
  }
  if (!saved?.data || !saved?.birth) {
    setStatus(chartStatus, 'A riporthoz szükséges képletadatok nem találhatók ebben a böngésző-munkamenetben. Számítsd ki újra a képletet ezen az eszközön.', true);
    return;
  }
  const data = saved.data, planets = data.planets && typeof data.planets === 'object' ? data.planets : {};
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getSign = details => localizedSign(details?.sign) || (details?.longitude != null ? longitudePosition(details.longitude)?.sign : '') || '—';
  const asc = longitudePosition(data.ascendant), sun = Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='sun')?.[1], moon = Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='moon')?.[1];
  const main = {Nap:getSign(sun), Aszcendens:asc?.sign || '—', Hold:getSign(moon)};
  const archetypes = {
    'Kos':['A Kos szimbolikája a kezdeményezéshez, a közvetlen cselekvéshez és az önálló irány kijelöléséhez kapcsolódik. Ebben a témában az első impulzus gyakran fontos információ: jelzi, hol van energia, érdeklődés vagy változtatási igény.','A lendület akkor válik tartós erőforrássá, ha cél, időzítés és következmény is társul hozzá. Érdemes különbséget tenni a valódi sürgősség és a pillanatnyi feszültség között; nem minden helyzet kíván azonnali választ.','Önreflexiós munka lehet megfigyelni, hogyan viszonyulsz a kezdeményezéshez, a versengéshez és a hibázás lehetőségéhez. A bátorság mellett a javítás, a türelem és a másik fél meghallgatása is cselekvő készség.'],
    'Bika':['A Bika szimbolikus hangsúlya az értékekre, a biztonságra, az érzékelhető valóságra és a fokozatos építkezésre irányul. A stabilitás itt nem puszta mozdulatlanság: olyan alap, amelyből kiszámítható döntések születhetnek.','A megszokás segíthet rendszert tartani, de időnként érdemes megvizsgálni, hogy egy rutin még valóban szolgál-e. A változás elfogadása nem feltétlenül veszélyezteti a biztonságot; lehet a biztonság korszerűsítése is.','A témához kapcsolódó önismereti kérdés az, hogyan határozod meg a saját értékedet, és mi ad valódi megnyugvást. Különítsd el a tartós erőforrásokat a rövid távú komforttól, és figyeld meg, hogyan bánsz az idővel, pénzzel és energiával.'],
    'Ikrek':['Az Ikrek a kérdezés, a kapcsolódó gondolatok, a tanulás és a kommunikáció jelképe. A világ megértésében fontos lehet a több nézőpont, az információcsere és a fogalmak pontosítása.','A sok érdeklődési irány rugalmasságot adhat, ugyanakkor szét is aprózhatja a figyelmet. A fókusz tudatos választás: nem a kíváncsiság feladása, hanem annak eldöntése, melyik kérdés érdemel mélyebb időt.','Érdemes megfigyelni, miként közvetítesz gondolatokat, hogyan kérsz tisztázást, és mikor következtetsz kevés információból. A meghallgatás és a csend is a kommunikáció része; a megértéshez olykor lassítás kell.'],
    'Rák':['A Rák szimbolikája az érzelmi biztonság, az otthonosság, a kötődés és a gondoskodás köré szerveződik. A belső állapot és a környezet hangulata érzékeny visszajelzési pont lehet.','A gondoskodás akkor fenntartható, ha saját szükségleteidnek is helyet adsz. A felelősség és a szeretet nem követeli meg az állandó rendelkezésre állást; a határ kijelölése kapcsolatot védő eszköz is lehet.','A reflexió középpontjában az állhat, mi segít biztonságban érezni magad, hogyan jelzed a szükségleteidet, és miként különíted el a jelen helyzetet a korábbi tapasztalatokból eredő várakozásoktól.'],
    'Oroszlán':['Az Oroszlán az önkifejezés, az alkotás, a személyes jelenlét és az elismerés témáját hordozza. A saját hang és a kreatív kezdeményezés fontos módja lehet annak, hogy valaki részt vegyen a közös világban.','Az elismerés természetes igény, de az önértékelés stabilabb, ha nem kizárólag külső reakcióktól függ. A vezetői vagy látható szerep mellett a mások teljesítményének és nézőpontjának megbecsülése is erősíti a közösséget.','Érdemes megvizsgálni, hol tudsz szabadon alkotni, mitől tartasz vissza egy ötletet, és hogyan fogadod a visszajelzést. A hiteles önkifejezés nem tökéletességet jelent, hanem vállalható, saját álláspontot.'],
    'Szűz':['A Szűz a megfigyelés, a rendszerezés, a részletek és a gyakorlati segítség szimbolikus területe. A minőség javítása apró, ellenőrizhető lépésekben válhat eredményessé.','A precizitás erőforrás, de túlzott alkalmazása a hibákra szűkítheti a figyelmet. Hasznos mérce lehet az „elég jó” meghatározása, valamint annak felismerése, mely részletek befolyásolják ténylegesen a végeredményt.','Önismereti fókusz lehet a belső kritikus hang, a feladatok priorizálása és a segítség elfogadása. A rend nem cél önmagában: akkor értékes, ha több teret, időt vagy nyugalmat teremt.'],
    'Mérleg':['A Mérleg a kölcsönösség, a kapcsolati egyensúly, a mérlegelés és az együttműködés témáit jelképezi. A különböző szempontok figyelembevétele támogathatja a méltányos döntést.','Az egyensúly nem mindig jelent egyenlő arányt vagy konfliktusmentességet. A saját igények világos képviselete ugyanúgy része a kapcsolatnak, mint a másik fél meghallgatása; a béke kedvéért elhallgatott lényeg később feszültséggé válhat.','Érdemes megfigyelni, hogyan döntesz, miként reagálsz nézeteltérésre, és milyen feltételek mellett érzed a kapcsolatot kölcsönösnek. A határozottság és a tapintat összeegyeztethető.'],
    'Skorpió':['A Skorpió a bizalom, a mélység, az átalakulás és a rejtett motivációk vizsgálatának jelképe. A felszíni válasz mögötti összefüggések iránti érdeklődés segíthet árnyaltabb megértésben.','Az intenzitás önmagában nem bizonyíték; a feltételezéseket érdemes ellenőrizhető tényekkel összevetni. A bizalom fokozatosan épül, és a sebezhetőség vállalása nem azonos a kontroll feladásával.','Önismereti kérdés lehet, hogyan kezeled a bizonytalanságot, a titoktartást, a veszteséget és a hatalmi helyzeteket. A változás feldolgozásában segít, ha megnevezed, mi van a saját befolyásod alatt, és mi nem.'],
    'Nyilas':['A Nyilas a tágabb perspektíva, a tanulás, a felfedezés és a személyes meggyőződések szimbolikája. A jelentéskeresés segíthet összekapcsolni az egyedi tapasztalatokat egy nagyobb történettel.','A lelkesedés és az optimizmus akkor válik megbízható iránnyá, ha a gyakorlati következményekkel is számol. A saját igazság keresése együtt járhat a nézőpont felülvizsgálatának képességével.','Érdemes feltérképezni, milyen értékek vezetik a döntéseidet, hogyan tanulsz új helyzetekből, és hol van szükség konkrét tervre. A fejlődés nemcsak új horizont, hanem a vállalt lépések következetessége is.'],
    'Bak':['A Bak a felelősség, a struktúra, a hosszú távú célok és a teljesítmény témáit jelképezi. A fokozatos építkezés, a keretek és a következmények mérlegelése támogatja a megvalósítást.','A felelősségtudat könnyen túlterheléssé válhat, ha minden feladat személyes kötelességnek tűnik. A pihenés, a delegálás és a segítség kérése a fenntartható működés része, nem a gyengeség jele.','Önismereti munka lehet a siker saját definíciójának kialakítása, a belső elvárások felülvizsgálata és annak felismerése, hogy a szerepeid mellett személyes szükségleteid is vannak.'],
    'Vízöntő':['A Vízöntő az önálló gondolkodás, az újítás, a társadalmi nézőpont és a közösség jelképe. A megszokott megoldások megkérdőjelezése új lehetőségeket nyithat.','Az egyediség és a kapcsolódás nem ellentétek. Az elvek akkor működnek a gyakorlatban, ha figyelembe veszik az emberek konkrét helyzetét, és a közösségi cél mellett személyes felelősség is társul hozzájuk.','Érdemes megvizsgálni, mikor érzed magad szabadnak, hogyan viszonyulsz a csoportnormákhoz, és miként fordítod ötleteidet megvalósítható lépésekre. A távolságtartás néha tiszta nézőpontot ad, máskor akadályozhatja a közelséget.'],
    'Halak':['A Halak a képzelőerő, az együttérzés, az intuíció és a finom benyomások szimbolikája. A művészi vagy empatikus érzékenység segíthet észrevenni olyan árnyalatokat, amelyeket a pusztán racionális leírás nem ragad meg.','Az együttérzés mellett fontos a határok és a tények ellenőrzése. A megérzés lehet kiinduló jelzés, de érdemes elkülöníteni a bizonyosságtól, és a másik ember érzéseiről közvetlenül kérdezni.','Önismereti fókusz lehet, hogyan regenerálódsz, miként mondasz nemet, és hogyan alakítod a belső képeket konkrét alkotássá vagy cselekvéssé. A világos keret segíthet megőrizni az érzékenység értékét.']
  };
  const signText = sign => archetypes[sign] || ['A jelölő jegye nem áll rendelkezésre a mentett adatokban, ezért a fejezet a témát általános önismereti szempontból közelíti meg.','A képlet egyes elemeit a teljes személyes tapasztalat kontextusában érdemes értelmezni; egyetlen pozíció sem írja le önmagában az embert.','A reflexió során konkrét eseményekre, döntésekre és visszatérő tapasztalatokra támaszkodj, és tartsd nyitva a lehetőséget az értelmezés módosítására.'];
  const chapter = (title, sign, focus, questions) => {
    const paragraphs=signText(sign);
    return '<section class="chapter"><h2>'+escapeHtml(title)+'</h2><p class="focus"><b>Kapcsolódó jelölő:</b> '+escapeHtml(sign)+' · '+escapeHtml(focus)+'</p>'+paragraphs.map(p=>'<p>'+escapeHtml(p)+'</p>').join('')+'<h3>Reflexiós gyakorlat</h3><p>'+escapeHtml(questions)+'</p><div class="reflection-writing-space" aria-label="Vonalazott jegyzethely"></div></section>';
  };
  const planetNames = {sun:'Nap',moon:'Hold',mercury:'Merkúr',venus:'Vénusz',mars:'Mars',jupiter:'Jupiter',saturn:'Szaturnusz',uranus:'Uránusz',neptune:'Neptunusz',pluto:'Plútó'};
  const positions=Object.entries(planets).filter(([,v])=>v&&typeof v==='object').map(([key,v])=>{const normalized=key.replace(/[_\\s-]/g,'').toLowerCase(),sign=getSign(v),pos=longitudePosition(v.longitude);return {name:planetNames[normalized]||prettyPlanetName(key),sign,degree:pos?.degree!=null?pos.degree.toFixed(2)+'°':'',house:v.house!=null?v.house+'. ház':'',retro:v.retrograde===true?'retrográd':'',normalized};});
  const planetFocus={sun:'identitás, tudatos irány és önkifejezés',moon:'érzelmi szükségletek és belső biztonság',mercury:'gondolkodás, tanulás és kommunikáció',venus:'értékek, vonzalom és kapcsolati harmónia',mars:'kezdeményezés, energia és konfliktuskezelés',jupiter:'növekedés, hitrendszerek és táguló perspektíva',saturn:'keretek, felelősség és hosszú távú tanulás',uranus:'függetlenség, változás és újítás',neptune:'képzelet, idealizálás és érzékenység',pluto:'mély átalakulás, kontroll és megújulás'};
  const planetChapters=positions.map(p=>chapter(p.name+' a '+p.sign+' jegyében',p.sign,planetFocus[p.normalized]||'a bolygó szimbolikus témája', 'Írj le egy konkrét élethelyzetet, amelyben ez a téma megjelent. Mi volt a megfigyelhető tény, milyen értelmezést adtál neki, és milyen alternatív magyarázat lehetséges?')+'<p class="position"><b>Képletadat:</b> '+escapeHtml(p.degree)+' · '+escapeHtml(p.house)+' · '+escapeHtml(p.retro)+'</p>').join('');
  const mainChapters=[
    chapter('1. Identitás és tudatos irány',main.Nap,'önkifejezés, célok, személyes értékek','Válassz három olyan döntést az elmúlt évből, amelyet saját értékeid alapján hoztál. Mi különbözteti meg ezeket a külső elvárásoknak való megfeleléstől?'),
    chapter('2. Érzelmi működés és belső biztonság',main.Hold,'érzelmi szükségletek, regenerálódás, kötődés','Készíts listát azokról a helyzetekről, amelyek energiát adnak és amelyek kimerítenek. Milyen jelzéseket veszel észre magadon korán, és milyen támogatást tudsz kérni?'),
    chapter('3. Első benyomás és alkalmazkodás',main.Aszcendens,'belépés új helyzetekbe, megjelenés, reakciók','Gondold végig, hogyan lépsz be egy új közösségbe. Mely viselkedések tudatosak, melyek automatikusak, és mit szeretnél megtartani vagy finomítani?'),
    chapter('4. Gondolkodás és kommunikáció',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='mercury')?.[1]),'információfeldolgozás és párbeszéd','Egy közelmúltbeli félreértést bonts fel: mit mondtál, mit hallott a másik, mit feltételeztél, és melyik tisztázó kérdés segített volna?'),
    chapter('5. Kapcsolatok, értékek és kölcsönösség',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='venus')?.[1]),'kapcsolati igények és értékek','Nevezd meg három alapvető kapcsolati értékedet. Milyen konkrét viselkedés mutatja ezek jelenlétét, és hol van szükség egyértelmű határra?'),
    chapter('6. Cselekvés, konfliktus és energia',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='mars')?.[1]),'kezdeményezés és érdekérvényesítés','Írd le, hogyan reagálsz nyomás alatt. Melyik reakció segíti a problémamegoldást, és melyik növeli a feszültséget? Fogalmazz meg egy kipróbálható alternatívát.'),
    chapter('7. Hivatás, felelősség és hosszú távú építkezés',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='saturn')?.[1]),'munka, kompetencia, keretek','Rendezd a jelenlegi kötelezettségeidet három kategóriába: valóban a te felelősséged, megosztható, illetve elengedhető. Melyik konkrét változtatás csökkentené a túlterhelést?'),
    chapter('8. Növekedés, meggyőződések és perspektíva',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='jupiter')?.[1]),'tanulás, értelmezési keretek','Mely meggyőződésed segített eddig, és milyen tapasztalat árnyalhatja? Fogalmazz meg egy kérdést, amely nyitottabbá tesz anélkül, hogy feladnád az értékeidet.'),
    chapter('9. Változás, szabadság és személyes határok',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='uranus')?.[1]),'autonómia és újítás','Hol van szükséged nagyobb mozgástérre? Válassz egy kis léptékű változtatást, amely biztonságosan tesztelhető, és határozd meg, miből fogod látni, hogy működik.'),
    chapter('10. Ideálok, képzelet és valóságvizsgálat',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='neptune')?.[1]),'inspiráció és tisztánlátás','Egy fontos reményedet bontsd szét: mi a vágy, mi a tény, mi a feltételezés, és mi az első megtehető lépés? Ez segíthet az inspirációt a valósághoz kapcsolni.'),
    chapter('11. Mélyebb minták és megújulás',getSign(Object.entries(planets).find(([k])=>k.replace(/[_\\s-]/g,'').toLowerCase()==='pluto')?.[1]),'változás, elengedés, befolyás','Gondolj egy változásra, amelyet már átéltél. Mi volt rajta kívül eső, és mi az, amiben saját döntésed számított? Milyen erőforrásod vált láthatóvá utólag?'),
    chapter('12. Személyes összegzés és cselekvési terv',main.Nap,'a szimbolikus témák összevetése a saját tapasztalattal','Válassz egy témát, amelyet a leginkább relevánsnak érzel. Írj hozzá egy 30 napos, mérhető és kíméletes gyakorlatot, majd jelöld meg, mikor tekinted át az eredményt.')
  ];
  const workbookPages = [
    ['Munkalap 1 · Egy visszatérő helyzet részletes feltérképezése','Mi történt? Csak a megfigyelhető tényeket írd le.','Mi volt az első gondolatod és érzésed?','Hogyan reagáltál? Mi lett a következmény?','Milyen más értelmezés vagy válasz is lehetséges?'],
    ['Munkalap 2 · Érzelmi szükségletek és erőforrások','Milyen helyzetekben érzed magad stabilnak és biztonságban?','Milyen jelekből veszed észre, hogy túlterhelődtél?','Milyen erőforrások segítettek korábban?','Kitől vagy mitől kérhetsz támogatást?'],
    ['Munkalap 3 · Kapcsolati értékek és határok','Mely három érték fontos számodra egy kapcsolatban?','Milyen konkrét viselkedés jelzi a kölcsönösséget?','Hol szeretnél világosabb határt húzni?','Fogalmazd meg a mondatot, amelyet egy helyzetben használni tudnál.'],
    ['Munkalap 4 · Döntési napló','Mi a döntés, amely előtt állsz? Mi a célod?','Mely tények ismertek, és mi bizonytalan?','Milyen lehetőségeid vannak? Mik az előnyök és kockázatok?','Milyen információ változtatna a döntéseden? Mi a következő kis lépés?'],
    ['Munkalap 5 · 30 napos személyes kísérlet','Melyik szokást vagy reakciót szeretnéd kipróbálni?','Mi lesz a minimális, reálisan teljesíthető lépés?','Mikor és milyen körülmények között végzed?','Hogyan követed a haladást? Mit értékelsz hetente?'],
    ['Munkalap 6 · Heti visszatekintés','Mi ment jól ezen a héten? Írj konkrét példát.','Mi volt nehéz, és mi akadályozott?','Mit tanultál magadról vagy a helyzetről?','Mit tartasz meg, min változtatsz a következő héten?'],
    ['Munkalap 7 · Személyes összegzés','A riport mely gondolata volt számodra valóban releváns? Miért?','Melyik állítás nem illeszkedett a tapasztalataidhoz?','Milyen konkrét példákból vontad le a következtetésed?','Mi az az egy lépés, amelyet a következő hónapban vállalsz?']
  ].map(([title,...prompts]) => '<section class="worksheet"><h2>'+escapeHtml(title)+'</h2>'+prompts.map((prompt,i)=>'<div class="write-prompt"><h3>'+escapeHtml(prompt)+'</h3><div class="writing-lines">'+Array.from({length:i===0?5:4},()=>'<div class="writing-line"></div>').join('')+'</div></div>').join('')+'<p class="worksheet-note">Dátum: ____________________　　Visszatérési időpont: ____________________</p></section>').join('');
  const html='<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CosmyDay – Prémium képletelemzés</title><style>'+
    '@page{size:A4;margin:18mm 17mm}body{font:11.5pt/1.75 Georgia,serif;color:#202638;max-width:850px;margin:32px auto;padding:0 24px}h1,h2,h3{font-family:Arial,sans-serif;color:#17223b;line-height:1.3}h1{font-size:27pt;margin:28px 0}.brand-header{display:flex;align-items:center;gap:14px;padding:12mm 17mm 10mm;margin: -18mm -17mm 20px;background:linear-gradient(to bottom,#18284b 0%,#222d4b 35%,#30334d 62%,rgba(9,13,25,0) 100%);color:#f6f4f0;border-bottom:1px solid rgba(155,183,242,.22);min-height:48mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}.brand-mark{width:42px;height:42px;border:1.5px solid rgba(216,187,131,.65);border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 20pt Georgia,serif;color:#d8bb83;background:rgba(155,183,242,.08)}.brand-name{font:700 13pt Arial,sans-serif;letter-spacing:3px;color:#f6f4f0}.brand-tagline{font:9pt Arial,sans-serif;color:#b8c5e3;margin-top:3px}.brand-accent{margin-left:auto;width:45px;height:45px;border-radius:50%;background:radial-gradient(circle,rgba(216,187,131,.75) 0 10%,rgba(155,183,242,.25) 12% 20%,transparent 22%),linear-gradient(135deg,transparent 45%,rgba(155,183,242,.45) 46% 48%,transparent 49%)}h2{font-size:17pt;margin-top:0;border-bottom:1px solid #d6dbe4;padding-bottom:8px}h3{font-size:12.5pt;margin-top:24px}.lead{color:#626d82}.cover{min-height:80vh;display:flex;flex-direction:column;justify-content:center}.chapter{break-before:page;page-break-before:always}.chapter p{margin:12px 0;text-align:justify}.focus{color:#52617a;background:#f2f4f8;padding:10px 14px}.position{font-size:10pt;color:#667085}.questions li{margin:12px 0}.pagebreak{break-before:page}.worksheet{break-before:page;page-break-before:always;min-height:250mm}.worksheet h2{font-size:18pt;margin-bottom:16mm}.write-prompt{margin:0 0 10mm;break-inside:avoid}.write-prompt h3{font-size:11.5pt;margin:0 0 4mm;color:#34415a}.writing-lines{display:flex;flex-direction:column;gap:8mm}.writing-line{height:1px;border-bottom:1px solid #aeb7c5}.write-prompt:last-of-type .writing-lines{min-height:45mm;justify-content:space-between}.reflection-writing-space{height:88mm;margin-top:7mm;background:repeating-linear-gradient(to bottom,transparent 0,transparent 7.5mm,#aeb7c5 7.5mm,#aeb7c5 7.7mm);break-inside:avoid;page-break-inside:avoid}.worksheet-note{margin-top:10mm;color:#596579;font-size:10pt}button{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:12px 20px;border:1px solid rgba(216,187,131,.45);border-radius:999px;background:#d8bb83;color:#111827;font:700 10.5pt Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(17,34,59,.12);transition:background .15s ease,transform .15s ease}button:hover{background:#ecd19a;transform:translateY(-1px)}button:focus-visible{outline:2px solid #829bd7;outline-offset:3px}.back-to-top{position:fixed;right:24px;bottom:24px;z-index:20;background:#17233b;color:#e8edf7;border-color:#52617a;box-shadow:0 4px 14px rgba(0,0,0,.2)}@media print{button{display:none}body{margin:0 auto;padding:0}.cover{min-height:240mm}.chapter{break-before:page}h2{break-after:avoid}h3{break-after:avoid}.worksheet{min-height:250mm;break-before:page;page-break-before:always}.write-prompt:last-of-type .writing-lines{min-height:45mm}}'+
    '</style></head><body><button class="back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Ugrás az oldal tetejére">↑ Oldal tetejére</button><button onclick="window.print()">PDF mentése / nyomtatás</button><header class="brand-header"><div class="brand-mark">✦</div><div><div class="brand-name">ÉGI TÉRKÉP</div><div class="brand-tagline">CosmyDay · Szimbolikus asztrológiai önismeret</div></div><div class="brand-accent"></div></header><section class="cover"><p class="lead">COSMYDAY · PRÉMIUM ÖNISMERETI RIPORT</p><h1>A képleted mélyebb összefüggései</h1><p class="lead">Személyes, szimbolikus asztrológiai elemzés és reflektív munkafüzet</p><p><b>Születési adatok:</b> '+escapeHtml(saved.birth.date)+' · '+escapeHtml(saved.birth.time)+' · '+escapeHtml(saved.birth.place)+'</p><p><b>Fő jelölők:</b> Nap '+escapeHtml(main.Nap)+' · Aszcendens '+escapeHtml(main.Aszcendens)+' · Hold '+escapeHtml(main.Hold)+'</p><p>Ez a riport az asztrológiát szimbolikus önismereti keretként használja. Nem állapít meg személyiségjegyeket vagy múltbeli eseményeket tudományos tényként, és nem helyettesít pszichológiai, egészségügyi, jogi vagy pénzügyi tanácsadást. A fejezetek kérdései arra szolgálnak, hogy saját tapasztalataiddal vizsgáld meg az értelmezéseket.</p></section>'+
    '<section class="chapter"><h2>Olvasási útmutató és a három fő jelölő</h2><p>A riport több szinten halad: először a Nap, a Hold és az Aszcendens témáit tekinti át, majd a gondolkodás, a kapcsolatok, a cselekvés, a felelősség és a változás szimbolikus területeit. A bolygó jegyhelyzete egy hagyományos jelképrendszer része; önmagában nem magyarázza meg az élethelyzeteket.</p>'+Object.entries(main).map(([k,v])=>'<h3>'+escapeHtml(k)+' · '+escapeHtml(v)+'</h3><p>'+signText(v).map(escapeHtml).join(' ')+'</p>').join('')+'<p>Hasznos olvasási módszer: minden fejezetnél jelöld meg, mi illik a tapasztalataidhoz, mi nem, és milyen konkrét példa támasztja alá a saját álláspontodat. Az eltérés is értékes információ; nem szükséges a leírást magadra erőltetni.</p></section>'+
    mainChapters.join('')+
    '<section class="chapter"><h2>Bolygóállások – képletadatok és részletes szimbolikus témák</h2><p>Az alábbi pozíciók a mentett számítás adataiból származnak. A fok, ház és retrográd jelzés leíró adat; az értelmezés a jelképrendszer hagyományos társításait ismerteti.</p>'+planetChapters+'</section>'+
    '<section class="chapter"><h2>Önismereti munkafüzet: megfigyelés és következtetés</h2><h3>1. Visszatérő helyzet feltérképezése</h3><p>Válassz egy visszatérő élethelyzetet, amelyben szeretnél tudatosabban reagálni. Írd le a kiváltó eseményt, a tényszerűen megfigyelhető körülményeket, az első gondolatodat, az érzésedet és a viselkedésedet. Ezután külön jegyezd fel, milyen más értelmezés lehetséges. A cél nem a reakció minősítése, hanem a mintázat felismerése és a választási lehetőségek bővítése.</p><h3>2. Erőforrások és támogatás</h3><p>Gyűjts össze öt olyan képességet vagy erőforrást, amelyre már támaszkodtál nehéz helyzetben. Minden elemhez írj konkrét példát. Gondold végig, melyik erőforrást használod túl gyakran, melyik marad háttérben, és kitől vagy milyen környezettől kérhetnél támogatást.</p><h3>3. Határok és kölcsönösség</h3><p>Írj le egy helyzetet, amelyben nehéz nemet mondani vagy segítséget kérni. Fogalmazz meg egy rövid, világos mondatot, amely a szükségletedet közli, de nem támadja a másik felet. Például: „Ezt most nem tudom vállalni; ekkor és ebben a formában tudok segíteni.” A gyakorlatot a saját nyelvedre és körülményeidre alakítsd.</p><h3>4. Döntési napló</h3><p>Válassz egy közelgő, nem sürgős döntést. Jegyezd fel a célodat, a rendelkezésre álló tényeket, a bizonytalanságokat, az alternatívákat és a várható következményeket. Határozd meg, milyen új információ változtatna a döntéseden. Ez a módszer segít különválasztani az intuíciót, az érzelmi reakciót és a bizonyítékokat.</p><h3>5. Harmincnapos kísérlet</h3><p>Válassz egy apró szokást vagy reakciót, amelyet kipróbálnál. Határozd meg az időpontot, a körülményt, a minimális teljesíthető lépést és a nyomon követés módját. Hetente egyszer értékeld: mi működött, mi akadályozott, mit kell egyszerűsíteni? A kísérlet célja a tanulás, nem a tökéletes teljesítmény.</p>'+workbookPages+'</section>'+
    '<section class="chapter"><h2>Záró összegzés</h2><p>A képlet elemeit érdemes egymással párbeszédben olvasni, ugyanakkor nem kell minden részletből egységes, megkérdőjelezhetetlen történetet alkotni. Az önismeret megbízható alapja a megfigyelés, a tapasztalatok őszinte mérlegelése, a visszajelzés és a változtatás lehetősége.</p><p>A riportból válassz legfeljebb két olyan gondolatot, amely valóban hasznosnak tűnik. Fogalmazd át saját szavaiddal, rendelj hozzá konkrét viselkedést, és térj vissza hozzá egy hónap múlva. Ha egy szimbolikus értelmezés nem illeszkedik az életedhez, hagyd figyelmen kívül vagy kezeld új kérdésként.</p><p class="lead">CosmyDay · Az asztrológia szimbolikus értelmezési rendszer. A szöveg önreflexiós célú.</p></section></body></html>';
  const win=window.open('','_blank');
  if(!win){const iframe=document.createElement('iframe');iframe.title='CosmyDay prémium képletelemzés';iframe.style.width='100%';iframe.style.minHeight='900px';iframe.style.border='1px solid #334155';iframe.style.borderRadius='12px';iframe.style.background='#fff';iframe.srcdoc=html;chartResults.append(iframe);setStatus(chartStatus,'A böngésző blokkolta az új ablakot; a riport az oldalon belül nyílt meg. A gombbal mentheted PDF-ként.');iframe.scrollIntoView({behavior:'smooth',block:'start'});return;}
  win.document.open();win.document.write(html);win.document.close();
}

async function verifyReturnedPayment() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') !== 'success') return;
  const sessionId = params.get('session_id');
  if (!sessionId) {
    setStatus(chartStatus, 'A fizetés visszaigazolásához hiányzik a munkamenet-azonosító.', true);
    return;
  }
  chartResults.replaceChildren();
  chartResults.hidden = false;
  const panel = document.createElement('section');
  panel.className = 'result-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'Stripe-vásárlás ellenőrzése';
  const message = document.createElement('p');
  message.textContent = 'A tranzakciót a Stripe rendszerében ellenőrizzük…';
  panel.append(heading, message);
  chartResults.append(panel);
  try {
    const response = await fetch('/.netlify/functions/verify-checkout-session?session_id=' + encodeURIComponent(sessionId), {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Az ellenőrzés nem sikerült.');
    if (!result.paid) {
      message.textContent = 'A Stripe még nem jelzett sikeresen kifizetett tranzakciót. Fizetés státusza: ' + (result.status || 'ismeretlen') + '.';
      return;
    }
    try { localStorage.setItem('cosmyday_paid_session_id', sessionId); } catch (error) { console.warn('A fizetési munkamenet mentése nem sikerült.', error); }
    message.textContent = 'A Stripe visszaigazolta a sikeres vásárlást (' + Number(result.amount_huf).toLocaleString('hu-HU') + ' Ft). A személyes riport elkészíthető.';
    const note = document.createElement('p');
    note.textContent = 'A riport nyomtatási nézetben nyílik meg; a böngészőben PDF-ként mentheted.';
    const reportButton = document.createElement('button');
    reportButton.type = 'button';
    reportButton.textContent = 'Prémium riport megnyitása és PDF mentése';
    reportButton.addEventListener('click', openPremiumReport);
    panel.append(note, reportButton);
  } catch (error) {
    message.textContent = error.message || 'A fizetés ellenőrzése most nem sikerült.';
  } finally {
    params.delete('payment');
    params.delete('session_id');
    const cleanUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }
}
verifyReturnedPayment();
