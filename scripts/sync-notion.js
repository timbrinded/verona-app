const fs = require('fs');
const https = require('https');
const os = require('os');

const NOTION_API_KEY = process.env.NOTION_API_KEY || fs.readFileSync(
  os.homedir() + '/.config/notion/api_key',
  'utf8'
).trim();
const DATABASE_ID = '20ab404b-c4cd-4bd6-bd99-1c887113a06b';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const PLACES_JSON = 'public/data/places.json';

async function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function fetchNotion(url, options = {}) {
  return requestJson(url, {
    method: options.method || 'POST',
    headers: {
      'Authorization': 'Bearer ' + NOTION_API_KEY,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: options.body,
  });
}

function fetchGooglePlaces(path, options = {}) {
  if (!GOOGLE_PLACES_API_KEY) return null;

  return requestJson('https://places.googleapis.com/v1' + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': options.fieldMask || 'places.location',
    },
    body: options.body,
  });
}

function loadExistingPlaces() {
  if (!fs.existsSync(PLACES_JSON)) return new Map();

  const existing = JSON.parse(fs.readFileSync(PLACES_JSON, 'utf8'));
  return new Map(existing.flatMap((place) => {
    const keys = [];
    if (place.id) keys.push([place.id, place]);
    if (place.name) keys.push([place.name, place]);
    return keys;
  }));
}

function getText(prop) {
  if (!prop) return '';
  if (prop.title) return prop.title[0]?.plain_text || '';
  if (prop.rich_text) return prop.rich_text[0]?.plain_text || '';
  return '';
}

function getSelect(prop) {
  return prop?.select?.name || '';
}

function getNumber(prop) {
  return prop?.number || 0;
}

function getUrl(prop) {
  return prop?.url || '';
}

function parseCoordsFromUrl(url) {
  if (!url) return null;

  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }

  const coordMatch = url.match(/[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (coordMatch) {
    return { lat: Number(coordMatch[1]), lng: Number(coordMatch[2]) };
  }

  return null;
}

async function geocodePlace(place) {
  const textQuery = [place.name, place.address || 'Verona, Italy'].filter(Boolean).join(' ');
  const response = await fetchGooglePlaces('/places:searchText', {
    method: 'POST',
    fieldMask: 'places.location',
    body: JSON.stringify({
      textQuery,
      languageCode: 'en',
      regionCode: 'IT',
      pageSize: 1,
    }),
  });

  const location = response?.places?.[0]?.location;
  if (!location) return null;

  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}

async function fetchAllPages() {
  const results = [];
  let cursor = undefined;

  do {
    const response = await fetchNotion(
      'https://api.notion.com/v1/databases/' + DATABASE_ID + '/query',
      { body: JSON.stringify({ start_cursor: cursor }) }
    );

    if (response.object === 'error') {
      throw new Error(response.message || 'Notion query failed');
    }

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function syncPlaces() {
  console.log('Fetching places from Notion...');

  const existingPlaces = loadExistingPlaces();
  const pages = await fetchAllPages();
  const places = [];

  for (const page of pages) {
    const props = page.properties;

    const place = {
      id: page.id,
      name: getText(props.Name),
      category: getSelect(props.Category),
      rating: getNumber(props.Rating),
      reviews: getNumber(props.Reviews),
      price: getSelect(props.Price),
      distance: getNumber(props.Distance),
      vibe: getNumber(props.Vibe),
      confidence: getNumber(props.Confidence),
      address: getText(props.Address),
      phone: props.Phone?.phone_number || '',
      website: getUrl(props.Website),
      googleMaps: getUrl(props['Google Maps']),
      booking: getUrl(props.Booking),
      notes: getText(props.Notes),
    };

    const existing = existingPlaces.get(place.id) || existingPlaces.get(place.name);
    const urlCoords = parseCoordsFromUrl(place.googleMaps);
    const existingCoords = existing?.lat && existing?.lng
      ? { lat: existing.lat, lng: existing.lng }
      : null;
    const coords = urlCoords || existingCoords || await geocodePlace(place);

    if (coords) {
      place.lat = coords.lat;
      place.lng = coords.lng;
    }

    if (existing?.isHomeBase) place.isHomeBase = true;

    places.push(place);
  }

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync(PLACES_JSON, JSON.stringify(places, null, 2));

  console.log('Synced ' + places.length + ' places to ' + PLACES_JSON);

  const categories = {};
  let mapped = 0;
  places.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
    if (p.lat && p.lng) mapped += 1;
  });
  console.log('Mapped places:', mapped);
  console.log('Categories:', categories);
}

syncPlaces().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
