"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExternalLink, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place, PlaceLink } from "@/lib/place-types";
import { parsePlacesPayload } from "@/lib/place-validation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CATEGORY_COLORS: Record<string, string> = {
  Sights: "#e6ff00",
  Viewpoint: "#ff3df2",
  "Fine Dining": "#ff7a00",
  Osteria: "#28ff8a",
  Trattoria: "#00e5ff",
  "Wine Bar": "#9b5cff",
  "Cocktail Bar": "#ff3df2",
  Aperitivo: "#ffb000",
  Pub: "#00e5ff",
  Gelato: "#e6ff00",
  Accommodation: "#ff3d00",
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

interface PhotoRef {
  url: string;
  host: string;
  isImage: boolean;
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
  if (type === "google_maps") return "brutal-action bg-[var(--vb-cyan)]";
  if (type === "booking" || type === "airbnb") return "brutal-action bg-[var(--vb-lime)]";
  if (type === "menu") return "brutal-action bg-[var(--vb-orange)]";
  return "brutal-action brutal-action-dark";
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

function urlFromPhotoRef(value: string): string {
  return value.match(/https?:\/\/[^\s)]+/i)?.[0]?.replace(/[),.]+$/, "") ?? "";
}

function photoHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "photo source";
  }
}

function isDirectImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function photoRefs(place: Place): PhotoRef[] {
  const seen = new Set<string>();
  return place.details.photoUrls
    .map(urlFromPhotoRef)
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 8)
    .map((url) => ({
      url,
      host: photoHost(url),
      isImage: isDirectImageUrl(url),
    }));
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

interface VibeFactor {
  label: string;
  detail: string;
  value: number;
}

interface VibeBreakdown {
  total: number;
  factors: VibeFactor[];
  penalties: VibeFactor[];
}

function scoreComponent(place: Place, key: string): boolean {
  const components = place.dataQuality.scoreComponents;
  if (!components || typeof components !== "object" || Array.isArray(components)) return false;
  return (components as Record<string, unknown>)[key] === true;
}

function allocateFactors(rawFactors: VibeFactor[], target: number): VibeFactor[] {
  if (target <= 0) return [];

  const rawTotal = rawFactors.reduce((sum, factor) => sum + factor.value, 0);
  if (rawTotal <= 0) {
    return [{ label: "Curated score", detail: "Stored vibe score from the enrichment review", value: target }];
  }

  const projected = rawFactors.map((factor) => {
    const exact = (factor.value / rawTotal) * target;
    return { ...factor, exact, value: Math.floor(exact) };
  });
  let remainder = target - projected.reduce((sum, factor) => sum + factor.value, 0);

  const byFraction = [...projected].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    byFraction[index % byFraction.length].value += 1;
  }

  return projected
    .filter((factor) => factor.value > 0)
    .map((factor) => ({ label: factor.label, detail: factor.detail, value: factor.value }));
}

function vibeBreakdown(place: Place): VibeBreakdown {
  const total = Math.min(20, Math.max(0, Math.round(Number.isFinite(place.vibe) ? place.vibe : 0)));
  const details = place.details;
  const sourceCount = place.sources.length;
  const detailSignals = [
    details.openingHours.length > 0 ? "hours" : "",
    details.bestTimeToVisit ? "best time" : "",
    details.reservationGuidance || details.bookingNotes ? "booking guidance" : "",
    details.visitTips ? "visit tips" : "",
    details.menuHighlights ? "menu notes" : "",
  ].filter(Boolean);

  const rawFactors: VibeFactor[] = [
    {
      label: "Public rating",
      detail: place.rating > 0 ? `${place.rating.toFixed(1)} rating captured` : "No public rating captured",
      value: place.rating >= 4.8 ? 5 : place.rating >= 4.6 ? 4 : place.rating >= 4.4 ? 3 : place.rating > 0 ? 2 : 0,
    },
    {
      label: "Review signal",
      detail: place.reviews > 0 ? `${place.reviews.toLocaleString()} public reviews` : "No review count captured",
      value: place.reviews >= 700 ? 4 : place.reviews >= 200 ? 3 : place.reviews > 0 ? 2 : 0,
    },
    {
      label: "Source support",
      detail: `${sourceCount} cited ${sourceCount === 1 ? "source" : "sources"}`,
      value: sourceCount >= 5 ? 4 : sourceCount >= 3 ? 3 : sourceCount > 0 ? 2 : 0,
    },
    {
      label: "Visit detail",
      detail: detailSignals.length > 0 ? detailSignals.join(", ") : "No structured visit details yet",
      value: Math.min(4, detailSignals.length),
    },
    {
      label: "Local character",
      detail: scoreComponent(place, "authenticSentiment")
        ? "Authentic/local sentiment flag is present"
        : selectedTextSignal(place),
      value: scoreComponent(place, "authenticSentiment") ? 4 : place.notes || place.description ? 2 : 0,
    },
    {
      label: "Curated fit",
      detail: [
        place.category,
        place.price || "",
        place.confidence > 0 ? `${Math.round(place.confidence * 100)}% data confidence` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      value:
        (scoreComponent(place, "michelinListed") ? 3 : 0) +
        (scoreComponent(place, "priceQuality") ? 2 : 0) +
        (scoreComponent(place, "undiscoveredGem") ? 2 : 0) +
        (place.confidence >= 0.75 ? 2 : 1),
    },
  ].filter((factor) => factor.value > 0);

  const penalties: VibeFactor[] = [
    scoreComponent(place, "touristTrapLanguage")
      ? { label: "Tourist-trap language", detail: "Warning flag was present in enrichment", value: -4 }
      : null,
    scoreComponent(place, "decliningRatings")
      ? { label: "Declining ratings", detail: "Recent rating decline flag was present", value: -3 }
      : null,
    scoreComponent(place, "menuPhotosOutside")
      ? { label: "Menu/photo mismatch", detail: "Outside-source menu/photo warning was present", value: -2 }
      : null,
  ].filter((factor): factor is VibeFactor => factor !== null);

  const penaltyTotal = penalties.reduce((sum, factor) => sum + factor.value, 0);
  const positiveTarget = total - penaltyTotal;
  const factors = allocateFactors(rawFactors, positiveTarget);

  return { total, factors, penalties };
}

function selectedTextSignal(place: Place): string {
  if (place.description && place.notes) return "Description and notes are present";
  if (place.description) return "Description is present";
  if (place.notes) return "Notes are present";
  return "No local character text captured yet";
}

function VibePopover({ place, label }: { place: Place; label: string }) {
  const breakdown = vibeBreakdown(place);
  const positiveSubtotal = breakdown.factors.reduce((sum, factor) => sum + factor.value, 0);
  const penaltySubtotal = breakdown.penalties.reduce((sum, factor) => sum + factor.value, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="brutal-vibe px-2 py-1 text-[11px] font-black uppercase transition hover:-translate-y-0.5">
          Vibe {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-h-[18rem] w-[calc(100vw-3rem)] max-w-[20rem] overflow-y-auto bg-[var(--vb-paper)] p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wide text-fuchsia-700">Vibe score</div>
            <div className="mt-0.5 text-3xl font-black leading-none text-black">{breakdown.total}/20</div>
          </div>
          <PopoverClose
            className="brutal-action bg-white p-1 text-black"
            aria-label="Close vibe score"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </PopoverClose>
        </div>

        <div className="mt-2 space-y-1.5">
          {breakdown.factors.map((factor) => (
            <div key={factor.label} className="border-[3px] border-black bg-white px-2.5 py-1.5 shadow-[3px_3px_0_#00e5ff]">
              <div className="flex items-start justify-between gap-3 text-[13px] font-black text-black">
                <span>{factor.label}</span>
                <span className="text-fuchsia-700">+{factor.value}</span>
              </div>
              <div className="text-[11px] font-semibold leading-4 text-gray-700">{factor.detail}</div>
            </div>
          ))}

          {breakdown.penalties.map((factor) => (
            <div key={factor.label} className="border-[3px] border-black bg-[#ffe0f7] px-2.5 py-1.5 shadow-[3px_3px_0_#08080a]">
              <div className="flex items-start justify-between gap-3 text-[13px] font-black text-black">
                <span>{factor.label}</span>
                <span className="text-fuchsia-800">{factor.value}</span>
              </div>
              <div className="text-[11px] font-semibold leading-4 text-gray-700">{factor.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t-[3px] border-black pt-2 text-[11px] font-black uppercase text-black">
          <div className="flex justify-between">
            <span>Signal subtotal</span>
            <span>+{positiveSubtotal}</span>
          </div>
          {penaltySubtotal < 0 && (
            <div className="mt-1 flex justify-between text-fuchsia-700">
              <span>Warning subtotal</span>
              <span>{penaltySubtotal}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between bg-[var(--vb-acid)] px-2 py-1 text-black">
            <span>Final vibe</span>
            <span>{breakdown.total}/20</span>
          </div>
        </div>
        <PopoverArrow className="fill-[var(--vb-paper)] stroke-black stroke-2" />
      </PopoverContent>
    </Popover>
  );
}

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5 pl-4 list-disc marker:text-fuchsia-600">
      {items.slice(0, 4).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-l-[4px] border-fuchsia-500 bg-white px-2.5 py-1.5 shadow-[2px_2px_0_#08080a]">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-700">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold leading-5 text-gray-800">{children}</div>
    </div>
  );
}

function PhotoCarousel({ place, isOnline }: { place: Place; isOnline: boolean }) {
  const refs = useMemo(() => photoRefs(place), [place]);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(() => new Set());

  if (!isOnline || refs.length === 0) return null;

  const visibleRefs = refs.filter((ref) => !ref.isImage || !failedUrls.has(ref.url));
  if (visibleRefs.length === 0) return null;

  return (
    <section className="mt-3" aria-label={`${place.name} photos`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="bg-black px-2 py-0.5 text-[10px] font-black uppercase text-white">
          Photos
        </div>
        <div className="text-[10px] font-black uppercase text-gray-600">
          Online only
        </div>
      </div>
      <div className="flex snap-x gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
        {visibleRefs.map((ref, index) => (
          <a
            key={ref.url}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block h-32 min-w-[72%] snap-start overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0_#08080a] sm:min-w-[16rem]"
          >
            {ref.isImage ? (
              <>
                {!loadedUrls.has(ref.url) && (
                  <div className="absolute inset-0 flex flex-col justify-end bg-[var(--vb-paper)] p-3 text-black">
                    <div className="text-[10px] font-black uppercase">Loading photo</div>
                    <div className="mt-0.5 break-words text-lg font-black leading-none">{ref.host}</div>
                  </div>
                )}
                {/* External URLs are intentionally not optimized or stored by this app. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ref.url}
                  alt={`${place.name} photo ${index + 1}`}
                  className={`h-full w-full object-cover transition duration-200 group-hover:scale-[1.03] ${
                    loadedUrls.has(ref.url) ? "opacity-100" : "opacity-0"
                  }`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onLoad={() => {
                    setLoadedUrls((current) => new Set(current).add(ref.url));
                  }}
                  onError={() => {
                    setFailedUrls((current) => new Set(current).add(ref.url));
                  }}
                />
              </>
            ) : (
              <div className="flex h-full flex-col justify-between bg-[var(--vb-cyan)] p-3 text-black">
                <div className="text-3xl leading-none">↗</div>
                <div>
                  <div className="text-[10px] font-black uppercase">Photo source</div>
                  <div className="mt-0.5 break-words text-lg font-black leading-none">{ref.host}</div>
                </div>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-2 bg-[rgba(255,248,230,0.92)] px-2 py-1 text-[10px] font-black uppercase text-black backdrop-blur-sm">
              <span className="truncate">{ref.host}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
            </div>
          </a>
        ))}
      </div>
    </section>
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
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
        width: 20px;
        height: 20px;
        background: ${CATEGORY_COLORS[place.category] || "#6B7280"};
        border: 1.5px solid rgba(255,255,255,0.92);
        border-radius: 999px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        opacity: 0.72;
        box-shadow: 0 1px 4px rgba(8,8,10,0.18);
        filter: saturate(0.85);
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
      width: 30px;
      height: 30px;
      background: rgba(239,68,68,0.78);
      border: 2px solid rgba(255,255,255,0.96);
      border-radius: 999px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      box-shadow: 0 2px 8px rgba(239,68,68,0.24);
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
    <main className="verona-brutal h-screen w-screen relative overflow-hidden isolate bg-[var(--vb-paper)]">
      <div ref={mapContainer} className="absolute inset-0 z-0" />

      <div className="absolute top-4 left-4 right-4 z-40 flex gap-2">
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="brutal-control min-w-0 flex-1 px-3 py-2 text-sm font-black uppercase placeholder:text-gray-500 focus:outline-none"
        />
        <button
          onClick={() => setShowFilters((value) => !value)}
          className={`brutal-action px-3 py-1.5 text-lg ${showFilters ? "bg-[var(--vb-acid)]" : "bg-white"}`}
          aria-label="Toggle filters"
        >
          ⚙️
        </button>
      </div>

      {loadError && (
        <div className="brutal-panel absolute top-20 left-4 right-4 z-40 bg-[#ff3d00] px-4 py-2 text-center text-sm font-black uppercase text-white">
          {loadError}
        </div>
      )}

      {showFilters && (
        <div className="brutal-panel absolute top-20 left-4 right-4 z-50 max-h-56 overflow-y-auto bg-[var(--vb-paper)] p-3">
          <div className="mb-2 inline-block bg-[var(--vb-acid)] px-2 py-0.5 text-[11px] font-black uppercase text-black">Categories</div>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                className={`brutal-chip flex items-center gap-1 px-2 py-0.5 text-xs font-black transition-all ${
                  activeCategory === category ? "bg-[var(--vb-pink)]" : "bg-white"
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

      <div className="brutal-control absolute bottom-20 left-4 z-40 bg-[var(--vb-acid)] px-2.5 py-0.5 text-xs font-black uppercase text-black">
        {filteredPlaces.length} places
      </div>

      {selectedPlace && (
        <div className="brutal-panel absolute bottom-0 left-0 right-0 z-[60] max-h-[68vh] overflow-y-auto border-x-0 border-b-0 bg-[var(--vb-paper)] p-3 pb-5 animate-slide-up">
          <button
            onClick={() => setSelectedPlace(null)}
            className="brutal-action absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center bg-white text-lg font-black text-black"
            aria-label="Close place"
          >
            ✕
          </button>

          <div className="flex items-start gap-2.5 border-b-[3px] border-black pb-3 pr-9">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-black text-xl shadow-[3px_3px_0_#08080a]"
              style={{ background: CATEGORY_COLORS[selectedPlace.category] || "#6B7280" }}
            >
              {CATEGORY_ICONS[selectedPlace.category] || "📍"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="editorial-place-title text-black break-words">{selectedPlace.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase text-black">
                <span className="brutal-chip px-1.5 py-0.5">{selectedPlace.category}</span>
                {selectedPlace.price && <span className="brutal-chip bg-[var(--vb-cyan)] px-1.5 py-0.5">{selectedPlace.price}</span>}
                {selectedPlace.rating > 0 && (
                  <span className="brutal-chip bg-[var(--vb-orange)] px-1.5 py-0.5">{selectedPlace.rating} rating</span>
                )}
                {selectedPlace.reviews > 0 && (
                  <span className="brutal-chip bg-white px-1.5 py-0.5">{selectedPlace.reviews} reviews</span>
                )}
                {selectedVibeScore && <VibePopover place={selectedPlace} label={selectedVibeScore} />}
              </div>
            </div>
          </div>

          {selectedLinks.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {selectedLinks.map((link) => (
                <a
                  key={`${link.type}:${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-2 py-2 text-center text-xs font-black uppercase ${linkClass(link.type)}`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <PhotoCarousel key={selectedPlace.id} place={selectedPlace} isOnline={isOnline} />

          <Accordion type="multiple" className="mt-3 overflow-hidden border-[3px] border-black bg-white shadow-[5px_5px_0_#08080a]">
            {(selectedPlace.address || selectedPlace.description || selectedPlace.notes || userLocation) && (
              <AccordionItem value="overview" className="px-2.5">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    Overview
                    {selectedPlace.address && (
                      <span className="border-2 border-black bg-[var(--vb-acid)] px-1.5 py-0 text-[10px] font-black text-black">
                        Address
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    {selectedPlace.address && <DetailLine label="Address">{selectedPlace.address}</DetailLine>}
                    {userLocation && selectedPlace.lat && (
                      <DetailLine label="Distance">{(getDistanceFromUser(selectedPlace)! * 1000).toFixed(0)}m away</DetailLine>
                    )}
                    {(selectedPlace.description || selectedPlace.notes) && (
                      <DetailLine label="Why it is here">{selectedPlace.description || selectedPlace.notes}</DetailLine>
                    )}
                    {selectedPlace.description && selectedPlace.notes && <DetailLine label="Notes">{selectedPlace.notes}</DetailLine>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {(selectedPlace.details.bestTimeToVisit ||
              selectedPlace.details.reservationGuidance ||
              selectedPlace.details.bookingNotes ||
              selectedPlace.details.openingHours.length > 0) && (
              <AccordionItem value="visit" className="px-2.5">
                <AccordionTrigger>Visit plan</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2">
                    {selectedPlace.details.bestTimeToVisit && (
                      <DetailLine label="Best time">{selectedPlace.details.bestTimeToVisit}</DetailLine>
                    )}
                    {(selectedPlace.details.reservationGuidance || selectedPlace.details.bookingNotes) && (
                      <DetailLine label="Booking">
                        {selectedPlace.details.reservationGuidance && <p>{selectedPlace.details.reservationGuidance}</p>}
                        {selectedPlace.details.bookingNotes && <p>{selectedPlace.details.bookingNotes}</p>}
                      </DetailLine>
                    )}
                    {selectedPlace.details.openingHours.length > 0 && (
                      <DetailLine label="Hours">{selectedPlace.details.openingHours.slice(0, 5).join(" · ")}</DetailLine>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {(selectedVisitTips.length > 0 || selectedMenuHighlights.length > 0) && (
              <AccordionItem value="highlights" className="px-2.5">
                <AccordionTrigger>Tips and menu</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2">
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
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {(selectedPlace.details.dietaryTags.length > 0 ||
              selectedPlace.details.accessibilityNotes ||
              selectedPlace.details.paymentNotes) && (
              <AccordionItem value="practical" className="px-2.5">
                <AccordionTrigger>Practical details</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2">
                    {selectedPlace.details.dietaryTags.length > 0 && (
                      <DetailLine label="Dietary">
                        <div className="flex flex-wrap gap-1.5 text-xs text-gray-700">
                          {selectedPlace.details.dietaryTags.map((tag) => (
                            <span key={tag} className="brutal-chip bg-[var(--vb-acid)] px-1.5 py-0.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </DetailLine>
                    )}
                    {selectedPlace.details.accessibilityNotes && (
                      <DetailLine label="Accessibility">{selectedPlace.details.accessibilityNotes}</DetailLine>
                    )}
                    {selectedPlace.details.paymentNotes && (
                      <DetailLine label="Payment">{selectedPlace.details.paymentNotes}</DetailLine>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {selectedPlace.sources.length > 0 && (
              <AccordionItem value="sources" className="px-2.5">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    Sources
                    <span className="border-2 border-black bg-[var(--vb-cyan)] px-1.5 py-0 text-[10px] font-black text-black">
                      {selectedPlace.sources.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {selectedPlace.sources.slice(0, 5).map((source) => (
                      <a
                        key={`${source.fieldName}:${source.sourceUrl}`}
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="brutal-chip bg-white px-1.5 py-0.5 font-black uppercase text-black transition hover:bg-[var(--vb-acid)]"
                      >
                        {sourceLabel(source)}
                      </a>
                    ))}
                  </div>
                  {selectedPlace.lastEnrichedAt && (
                    <div className="mt-2 inline-block bg-black px-2 py-0.5 text-[11px] font-black uppercase text-white">
                      Last enriched {selectedPlace.lastEnrichedAt.slice(0, 10)}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
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
