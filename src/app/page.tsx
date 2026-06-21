"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place, PlaceLink } from "@/lib/place-types";
import { parsePlacesPayload } from "@/lib/place-validation";

const CATEGORY_COLORS: Record<string, string> = {
  Sights: "#8B5CF6",
  Viewpoint: "#EC4899",
  "Fine Dining": "#F59E0B",
  Osteria: "#10B981",
  Trattoria: "#34D399",
  "Wine Bar": "#7C3AED",
  "Cocktail Bar": "#F472B6",
  Aperitivo: "#FB923C",
  Pub: "#60A5FA",
  Gelato: "#A78BFA",
  Accommodation: "#EF4444",
};

const CATEGORY_ICONS: Record<string, string> = {
  Sights: "🏛️",
  Viewpoint: "👁️",
  "Fine Dining": "⭐",
  Osteria: "🍝",
  Trattoria: "🍽️",
  "Wine Bar": "🍷",
  "Cocktail Bar": "🍸",
  Aperitivo: "🥂",
  Pub: "🍺",
  Gelato: "🍦",
  Accommodation: "🏠",
};

const VERONA_CENTER: [number, number] = [10.9916, 45.4384];
const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoidmVyb25hLWFwcCIsImEiOiJjbTVvZ2RxZHEwMDFqMmxxc2RyeWJ3ZHJjIn0.placeholder";

interface GeolocateEvent {
  coords?: {
    longitude?: number;
    latitude?: number;
  };
}

function normalizeCategory(category: string): string {
  return category === "Craft Beer" ? "Pub" : category;
}

function primaryLinks(place: Place): PlaceLink[] {
  const existing = new Set<string>();
  const links: PlaceLink[] = [];

  const add = (type: string, label: string, url: string) => {
    if (!url || existing.has(`${type}:${url}`)) return;
    existing.add(`${type}:${url}`);
    links.push({ type, label, url, source: "api", confidence: 1, retrievedAt: null });
  };

  add("google_maps", "Directions", place.googleMaps);
  add("booking", "Book", place.booking);
  add("website", "Website", place.website);

  for (const link of place.links) {
    if (["google_maps", "booking", "website", "menu", "airbnb"].includes(link.type)) {
      add(link.type, link.label || link.type.replaceAll("_", " "), link.url);
    }
  }

  return links.slice(0, 4);
}

function linkClass(type: string): string {
  if (type === "google_maps") return "bg-blue-600";
  if (type === "booking" || type === "airbnb") return "bg-green-600";
  if (type === "menu") return "bg-amber-600";
  return "bg-gray-700";
}

function vibeScore(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return `${Math.min(20, Math.max(0, Math.round(value)))}/20`;
}

function textList(value: string): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to delimiter parsing.
  }

  return value
    .split(/[;\n|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sourceLabel(source: Place["sources"][number]): string {
  const candidates = [source.sourceTitle, source.excerpt, source.fieldName];
  const noisy = /[{"]?url["]?\s*:|[{"]?note["]?\s*:/i;
  const label = candidates.find((candidate) => candidate && !noisy.test(candidate));
  if (label) return label.slice(0, 56);

  try {
    return new URL(source.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return source.fieldName;
  }
}

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-1 space-y-1 pl-4 list-disc marker:text-gray-300">
      {items.slice(0, 4).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-gray-200 pl-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-sm leading-6 text-gray-700">{children}</div>
    </div>
  );
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const placeMarkers = useRef<mapboxgl.Marker[]>([]);
  const homeBaseMarker = useRef<mapboxgl.Marker | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadPlaces = async () => {
      const response = await fetch("/api/places");
      if (!response.ok) {
        throw new Error(`Places API returned ${response.status}`);
      }

      const data = parsePlacesPayload(await response.json());
      const normalized = data.map((place) => ({
        ...place,
        category: normalizeCategory(place.category),
      }));

      setPlaces(normalized);
    };

    loadPlaces().catch((error: unknown) => {
      console.error("Failed to load places", error);
      setPlaces([]);
      setLoadError("Unable to load places from the database");
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: VERONA_CENTER,
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.current.addControl(geolocate, "bottom-right");

    geolocate.on("geolocate", (event: unknown) => {
      const coords = (event as GeolocateEvent).coords;
      if (typeof coords?.longitude === "number" && typeof coords.latitude === "number") {
        setUserLocation([coords.longitude, coords.latitude]);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const filteredPlaces = useMemo(() => {
    let filtered = places;

    if (activeCategory) {
      filtered = filtered.filter((place) => place.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (place) =>
          place.name.toLowerCase().includes(query) ||
          place.category.toLowerCase().includes(query) ||
          place.address.toLowerCase().includes(query) ||
          place.notes.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [places, activeCategory, searchQuery]);

  useEffect(() => {
    if (!map.current) return;

    placeMarkers.current.forEach((marker) => marker.remove());
    placeMarkers.current = [];

    filteredPlaces.forEach((place) => {
      if (!place.lat || !place.lng || place.isHomeBase) return;

      const element = document.createElement("div");
      element.className = "place-marker";
      element.style.cssText = `
        width: 32px;
        height: 32px;
        background: ${CATEGORY_COLORS[place.category] || "#6B7280"};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      element.innerHTML = CATEGORY_ICONS[place.category] || "📍";
      element.onclick = () => setSelectedPlace(place);

      const marker = new mapboxgl.Marker(element).setLngLat([place.lng, place.lat]).addTo(map.current!);
      placeMarkers.current.push(marker);
    });

    return () => {
      placeMarkers.current.forEach((marker) => marker.remove());
      placeMarkers.current = [];
    };
  }, [filteredPlaces]);

  useEffect(() => {
    if (!map.current) return;

    homeBaseMarker.current?.remove();
    homeBaseMarker.current = null;

    const homeBase = places.find((place) => place.isHomeBase);
    if (!homeBase?.lat || !homeBase.lng) return;

    const element = document.createElement("div");
    element.className = "place-marker home-base-marker";
    element.style.cssText = `
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
    `;
    element.innerHTML = "🏠";
    element.onclick = () => setSelectedPlace(homeBase);

    homeBaseMarker.current = new mapboxgl.Marker(element).setLngLat([homeBase.lng, homeBase.lat]).addTo(map.current);

    return () => {
      homeBaseMarker.current?.remove();
      homeBaseMarker.current = null;
    };
  }, [places]);

  const getDistanceFromUser = useCallback(
    (place: Place) => {
      if (!userLocation || !place.lat || !place.lng) return null;
      const radiusKm = 6371;
      const dLat = ((place.lat - userLocation[1]) * Math.PI) / 180;
      const dLon = ((place.lng - userLocation[0]) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation[1] * Math.PI) / 180) *
          Math.cos((place.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return radiusKm * c;
    },
    [userLocation],
  );

  const allCategories = useMemo(
    () => [...new Set(places.map((place) => place.category).filter(Boolean))].sort(),
    [places],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const place of places) {
      counts.set(place.category, (counts.get(place.category) ?? 0) + 1);
    }
    return counts;
  }, [places]);

  const selectedLinks = selectedPlace ? primaryLinks(selectedPlace) : [];
  const selectedVibeScore = selectedPlace ? vibeScore(selectedPlace.vibe) : "";
  const selectedMenuHighlights = selectedPlace ? textList(selectedPlace.details.menuHighlights) : [];
  const selectedVisitTips = selectedPlace ? textList(selectedPlace.details.visitTips) : [];

  return (
    <main className="h-screen w-screen relative overflow-hidden isolate">
      <div ref={mapContainer} className="absolute inset-0 z-0" />

      <div className="absolute top-4 left-4 right-4 z-40 flex gap-2">
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="flex-1 px-4 py-2 rounded-full bg-white shadow-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={() => setShowFilters((value) => !value)}
          className={`px-4 py-2 rounded-full shadow-lg ${showFilters ? "bg-purple-600 text-white" : "bg-white text-gray-800"}`}
          aria-label="Toggle filters"
        >
          ⚙️
        </button>
      </div>

      {loadError && (
        <div className="absolute top-16 left-4 right-4 z-40 bg-red-600 text-white px-4 py-2 rounded-lg text-center text-sm shadow-lg">
          {loadError}
        </div>
      )}

      {showFilters && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-white rounded-xl shadow-lg p-4 max-h-60 overflow-y-auto">
          <div className="text-sm font-semibold text-gray-600 mb-2">Categories</div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all ${
                  activeCategory === category ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                <span>{CATEGORY_ICONS[category] || "📍"}</span>
                <span>{category}</span>
                <span className="opacity-60">({categoryCounts.get(category) ?? 0})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-24 left-4 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm text-gray-600 shadow">
        {filteredPlaces.length} places
      </div>

      {selectedPlace && (
        <div className="absolute bottom-0 left-0 right-0 z-60 bg-white rounded-t-2xl shadow-2xl p-4 pb-8 max-h-[72vh] overflow-y-auto animate-slide-up">
          <button
            onClick={() => setSelectedPlace(null)}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
            aria-label="Close place"
          >
            ✕
          </button>

          <div className="flex items-start gap-3 pr-8 border-b border-gray-100 pb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: CATEGORY_COLORS[selectedPlace.category] || "#6B7280" }}
            >
              {CATEGORY_ICONS[selectedPlace.category] || "📍"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold leading-tight text-gray-950 break-words">{selectedPlace.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-700">
                <span className="rounded-md bg-gray-100 px-2 py-1">{selectedPlace.category}</span>
                {selectedPlace.price && <span className="rounded-md bg-gray-100 px-2 py-1">{selectedPlace.price}</span>}
                {selectedPlace.rating > 0 && (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">{selectedPlace.rating} rating</span>
                )}
                {selectedPlace.reviews > 0 && (
                  <span className="rounded-md bg-gray-100 px-2 py-1">{selectedPlace.reviews} reviews</span>
                )}
                {selectedVibeScore && (
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">Vibe {selectedVibeScore}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-3 text-sm text-gray-600">
            {selectedPlace.address && <p className="leading-6">📍 {selectedPlace.address}</p>}
            {userLocation && selectedPlace.lat && (
              <p>🚶 {(getDistanceFromUser(selectedPlace)! * 1000).toFixed(0)}m away</p>
            )}
            {(selectedPlace.description || selectedPlace.notes) && (
              <p className="border-l-2 border-gray-200 pl-3 text-[15px] leading-7 text-gray-800">
                {selectedPlace.description || selectedPlace.notes}
              </p>
            )}
            {selectedPlace.description && selectedPlace.notes && <p className="text-gray-500">{selectedPlace.notes}</p>}
          </div>

          {(selectedPlace.details.bestTimeToVisit ||
            selectedPlace.details.reservationGuidance ||
            selectedPlace.details.visitTips ||
            selectedPlace.details.menuHighlights ||
            selectedPlace.details.openingHours.length > 0) && (
            <div className="mt-4 grid gap-4">
              {selectedPlace.details.bestTimeToVisit && (
                <DetailLine label="Best time">{selectedPlace.details.bestTimeToVisit}</DetailLine>
              )}
              {selectedPlace.details.reservationGuidance && (
                <DetailLine label="Booking">{selectedPlace.details.reservationGuidance}</DetailLine>
              )}
              {selectedVisitTips.length > 0 && (
                <DetailLine label="Tips">
                  <DetailList items={selectedVisitTips} />
                </DetailLine>
              )}
              {selectedMenuHighlights.length > 0 && (
                <DetailLine label="Menu">
                  <DetailList items={selectedMenuHighlights} />
                </DetailLine>
              )}
              {selectedPlace.details.openingHours.length > 0 && (
                <DetailLine label="Hours">{selectedPlace.details.openingHours.slice(0, 3).join(" · ")}</DetailLine>
              )}
            </div>
          )}

          {(selectedPlace.details.dietaryTags.length > 0 ||
            selectedPlace.details.accessibilityNotes ||
            selectedPlace.details.paymentNotes) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-700">
              {selectedPlace.details.dietaryTags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full bg-gray-100">
                  {tag}
                </span>
              ))}
              {selectedPlace.details.accessibilityNotes && (
                <span className="px-2 py-1 rounded-full bg-gray-100">{selectedPlace.details.accessibilityNotes}</span>
              )}
              {selectedPlace.details.paymentNotes && (
                <span className="px-2 py-1 rounded-full bg-gray-100">{selectedPlace.details.paymentNotes}</span>
              )}
            </div>
          )}

          {selectedLinks.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {selectedLinks.map((link) => (
                <a
                  key={`${link.type}:${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-2 px-3 text-white rounded-lg text-center font-medium text-sm ${linkClass(link.type)}`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {selectedPlace.sources.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sources</div>
              <div className="flex flex-wrap gap-2 text-xs">
              {selectedPlace.sources.slice(0, 3).map((source) => (
                <a
                  key={`${source.fieldName}:${source.sourceUrl}`}
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-gray-100 px-2 py-1 text-gray-600"
                >
                  {sourceLabel(source)}
                </a>
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
