'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types
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

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  'Sights': '#8B5CF6',
  'Viewpoint': '#EC4899',
  'Fine Dining': '#F59E0B',
  'Osteria': '#10B981',
  'Trattoria': '#34D399',
  'Wine Bar': '#7C3AED',
  'Cocktail Bar': '#F472B6',
  'Aperitivo': '#FB923C',
  'Pub': '#60A5FA',
  'Craft Beer': '#FBBF24',
  'Gelato': '#A78BFA',
  'Accommodation': '#EF4444',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Sights': '🏛️',
  'Viewpoint': '👁️',
  'Fine Dining': '⭐',
  'Osteria': '🍝',
  'Trattoria': '🍽️',
  'Wine Bar': '🍷',
  'Cocktail Bar': '🍸',
  'Aperitivo': '🥂',
  'Pub': '🍺',
  'Craft Beer': '🍻',
  'Gelato': '🍦',
  'Accommodation': '🏠',
};

// Verona center coordinates
const VERONA_CENTER: [number, number] = [10.9916, 45.4384];

// Mapbox token (public, restricted to domains)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidmVyb25hLWFwcCIsImEiOiJjbTVvZ2RxZHEwMDFqMmxxc2RyeWJ3ZHJjIn0.placeholder';

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // Load places data
  useEffect(() => {
    fetch('/data/places.json')
      .then(res => res.json())
      .then(data => {
        // Parse coordinates from Google Maps URLs
        const placesWithCoords = data.map((p: Place) => {
          if (p.googleMaps) {
            const match = p.googleMaps.match(/@([\d.-]+),([\d.-]+)/);
            if (match) {
              return { ...p, lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
            }
          }
          return p;
        });
        setPlaces(placesWithCoords);
        setFilteredPlaces(placesWithCoords);
        
        // Initialize all categories as active
        const cats = new Set<string>(placesWithCoords.map((p: Place) => p.category).filter(Boolean));
        setActiveCategories(cats);
      })
      .catch(() => {
        // Try loading from cache/IndexedDB for offline
        setIsOffline(true);
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: VERONA_CENTER,
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add geolocation control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.current.addControl(geolocate, 'top-right');
    
    geolocate.on('geolocate', (e: any) => {
      setUserLocation([e.coords.longitude, e.coords.latitude]);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when filtered places change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers (except home base)
    document.querySelectorAll('.place-marker:not(.home-base-marker)').forEach(el => el.remove());

    // Add markers for filtered places
    filteredPlaces.forEach(place => {
      if (!place.lat || !place.lng) return;
      if (place.isHomeBase) return; // Home base is added separately

      const el = document.createElement('div');
      el.className = 'place-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: ${CATEGORY_COLORS[place.category] || '#6B7280'};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      el.innerHTML = CATEGORY_ICONS[place.category] || '📍';
      el.onclick = () => setSelectedPlace(place);

      new mapboxgl.Marker(el)
        .setLngLat([place.lng, place.lat])
        .addTo(map.current!);
    });
  }, [filteredPlaces]);

  // Always show home base marker (regardless of filters)
  useEffect(() => {
    if (!map.current) return;

    // Remove any existing home base marker
    document.querySelectorAll('.home-base-marker').forEach(el => el.remove());

    // Find the home base
    const homeBase = places.find(p => p.isHomeBase);
    if (!homeBase || !homeBase.lat || !homeBase.lng) return;

    const el = document.createElement('div');
    el.className = 'place-marker home-base-marker';
    el.style.cssText = `
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #EF4444, #DC2626);
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(239,68,68,0.5);
      z-index: 1000;
    `;
    el.innerHTML = '🏠';
    el.onclick = () => setSelectedPlace(homeBase);

    new mapboxgl.Marker(el)
      .setLngLat([homeBase.lng, homeBase.lat])
      .addTo(map.current!);
  }, [places]);

  // Filter places
  useEffect(() => {
    let filtered = places;

    // Filter by active categories
    if (activeCategories.size > 0 && activeCategories.size < places.length) {
      filtered = filtered.filter(p => activeCategories.has(p.category));
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }

    setFilteredPlaces(filtered);
  }, [places, activeCategories, searchQuery]);

  // Calculate distance from user
  const getDistanceFromUser = useCallback((place: Place) => {
    if (!userLocation || !place.lat || !place.lng) return null;
    const R = 6371;
    const dLat = (place.lat - userLocation[1]) * Math.PI / 180;
    const dLon = (place.lng - userLocation[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation[1] * Math.PI / 180) * Math.cos(place.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, [userLocation]);

  // Toggle category filter
  const toggleCategory = (cat: string) => {
    const newCats = new Set(activeCategories);
    if (newCats.has(cat)) {
      newCats.delete(cat);
    } else {
      newCats.add(cat);
    }
    setActiveCategories(newCats);
  };

  // Get all unique categories
  const allCategories = [...new Set(places.map(p => p.category).filter(Boolean))].sort();

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      {/* Map */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Search bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-full bg-white shadow-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-full shadow-lg ${showFilters ? 'bg-purple-600 text-white' : 'bg-white text-gray-800'}`}
        >
          ⚙️
        </button>
      </div>

      {/* Offline indicator */}
      {isOffline && (
        <div className="absolute top-16 left-4 right-4 z-10 bg-yellow-500 text-white px-4 py-2 rounded-lg text-center text-sm">
          📴 Offline mode - showing cached data
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="absolute top-20 left-4 right-4 z-10 bg-white rounded-xl shadow-lg p-4 max-h-60 overflow-y-auto">
          <div className="text-sm font-semibold text-gray-600 mb-2">Categories</div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all ${
                  activeCategories.has(cat)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <span>{CATEGORY_ICONS[cat] || '📍'}</span>
                <span>{cat}</span>
                <span className="opacity-60">({places.filter(p => p.category === cat).length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Place count */}
      <div className="absolute bottom-24 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm text-gray-600 shadow">
        {filteredPlaces.length} places
      </div>

      {/* Selected place card */}
      {selectedPlace && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl p-4 pb-8 animate-slide-up">
          <button
            onClick={() => setSelectedPlace(null)}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: CATEGORY_COLORS[selectedPlace.category] || '#6B7280' }}
            >
              {CATEGORY_ICONS[selectedPlace.category] || '📍'}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{selectedPlace.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{selectedPlace.category}</span>
                {selectedPlace.price && <span>• {selectedPlace.price}</span>}
                {selectedPlace.rating > 0 && <span>• {selectedPlace.rating}⭐</span>}
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            {selectedPlace.address && <p className="mb-1">📍 {selectedPlace.address}</p>}
            {userLocation && selectedPlace.lat && (
              <p className="mb-1">🚶 {(getDistanceFromUser(selectedPlace)! * 1000).toFixed(0)}m away</p>
            )}
            {selectedPlace.notes && <p className="text-gray-500">{selectedPlace.notes}</p>}
          </div>

          <div className="mt-4 flex gap-2">
            {selectedPlace.googleMaps && (
              <a
                href={selectedPlace.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-center font-medium"
              >
                🗺️ Directions
              </a>
            )}
            {selectedPlace.booking && (
              <a
                href={selectedPlace.booking}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-center font-medium"
              >
                📅 Book
              </a>
            )}
            {selectedPlace.website && !selectedPlace.booking && (
              <a
                href={selectedPlace.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg text-center font-medium"
              >
                🌐 Website
              </a>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
