import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const DATABASE_ID = '20ab404b-c4cd-4bd6-bd99-1c887113a06b';
const NOTION_API_KEY = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN || '';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

interface Place {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  distance: number;
  vibe: number;
  confidence: number;
  address: string;
  phone: string;
  website: string;
  googleMaps: string;
  booking: string;
  notes: string;
  lat?: number;
  lng?: number;
  isHomeBase?: boolean;
}

interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

function loadStaticPlaces(): Place[] {
  const path = join(process.cwd(), 'public', 'data', 'places.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildExistingPlaceMap(places: Place[]): Map<string, Place> {
  const byKey = new Map<string, Place>();

  places.forEach((place) => {
    if (place.id) byKey.set(place.id, place);
    if (place.name) byKey.set(place.name, place);
  });

  return byKey;
}

function textProp(prop: any): string {
  if (!prop) return '';
  if (prop.title) return prop.title[0]?.plain_text || '';
  if (prop.rich_text) return prop.rich_text[0]?.plain_text || '';
  return '';
}

function selectProp(prop: any): string {
  return prop?.select?.name || '';
}

function numberProp(prop: any): number {
  return prop?.number || 0;
}

function urlProp(prop: any): string {
  return prop?.url || '';
}

function parseCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;

  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }

  const queryMatch = url.match(/[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (queryMatch) {
    return { lat: Number(queryMatch[1]), lng: Number(queryMatch[2]) };
  }

  return null;
}

async function geocodePlace(place: Place): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_PLACES_API_KEY) return null;

  const textQuery = [place.name, place.address || 'Verona, Italy'].filter(Boolean).join(' ');
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.location',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'en',
      regionCode: 'IT',
      pageSize: 1,
    }),
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const data = await response.json();
  const location = data?.places?.[0]?.location;
  if (!location) return null;

  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}

async function fetchNotionPages(): Promise<NotionPage[]> {
  if (!NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY is not configured');
  }

  const results: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetch('https://api.notion.com/v1/databases/' + DATABASE_ID + '/query', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + NOTION_API_KEY,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ start_cursor: cursor }),
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok || data.object === 'error') {
      throw new Error(data.message || 'Notion query failed');
    }

    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function mapPageToPlace(page: NotionPage, existingPlaces: Map<string, Place>): Promise<Place> {
  const props = page.properties;
  const place: Place = {
    id: page.id,
    name: textProp(props.Name),
    category: selectProp(props.Category),
    rating: numberProp(props.Rating),
    reviews: numberProp(props.Reviews),
    price: selectProp(props.Price),
    distance: numberProp(props.Distance),
    vibe: numberProp(props.Vibe),
    confidence: numberProp(props.Confidence),
    address: textProp(props.Address),
    phone: props.Phone?.phone_number || '',
    website: urlProp(props.Website),
    googleMaps: urlProp(props['Google Maps']),
    booking: urlProp(props.Booking),
    notes: textProp(props['Vibe Notes']) || textProp(props.Notes),
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

  if (existing?.isHomeBase) {
    place.isHomeBase = true;
  }

  return place;
}

function placesResponse(places: Place[], source: string, error?: unknown) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, max-age=0',
    'X-Places-Source': source,
  };

  if (error instanceof Error) {
    headers['X-Places-Error'] = error.message.slice(0, 180);
  }

  return NextResponse.json(places, { headers });
}

export async function GET() {
  const staticPlaces = loadStaticPlaces();

  try {
    const existingPlaces = buildExistingPlaceMap(staticPlaces);
    const pages = await fetchNotionPages();
    const places = await Promise.all(pages.map((page) => mapPageToPlace(page, existingPlaces)));

    return placesResponse(places, 'notion-live');
  } catch (error) {
    return placesResponse(staticPlaces, 'static-fallback', error);
  }
}
