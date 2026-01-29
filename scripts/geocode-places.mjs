#!/usr/bin/env node
/**
 * Geocode places using Nominatim (OpenStreetMap) to get lat/lng coordinates
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES_PATH = join(__dirname, '../public/data/places.json');

// Rate limit: Nominatim requires 1 request per second
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address) {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VeronaApp/1.0 (geocoding for personal trip planning)'
      }
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error(`Error geocoding ${address}:`, error.message);
  }
  return null;
}

async function main() {
  console.log('Loading places.json...');
  const places = JSON.parse(readFileSync(PLACES_PATH, 'utf-8'));
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const place of places) {
    // Skip if already has coordinates
    if (place.lat && place.lng) {
      console.log(`✓ ${place.name} - already has coordinates`);
      skipped++;
      continue;
    }
    
    if (!place.address) {
      console.log(`⚠ ${place.name} - no address`);
      failed++;
      continue;
    }
    
    console.log(`Geocoding: ${place.name}...`);
    const coords = await geocodeAddress(place.address);
    
    if (coords) {
      place.lat = coords.lat;
      place.lng = coords.lng;
      console.log(`  → ${coords.lat}, ${coords.lng}`);
      updated++;
    } else {
      console.log(`  ✗ Failed to geocode`);
      failed++;
    }
    
    // Rate limit
    await delay(1100);
  }
  
  console.log(`\nWriting updated places.json...`);
  writeFileSync(PLACES_PATH, JSON.stringify(places, null, 2));
  
  console.log(`\nDone!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
