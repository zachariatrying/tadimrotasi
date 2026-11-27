import type { GoogleVisualReview, Venue } from '../types';

export interface PythonGmapsInspection {
  engine: string;
  elevation_m: number | null;
  timezone_id: string;
  formatted_address: string | null;
  address_descriptor: Record<string, unknown> | null;
  google_place: {
    place_id?: string;
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    formatted_address?: string;
    open_now?: boolean;
  } | null;
  live_lat?: number | null;
  live_lng?: number | null;
  live_photos?: string[];
  live_reviews?: GoogleVisualReview[];
  ai_mode?: {
    prompt: string;
    response_text: string;
    citations: Array<{ text: string; urls: string[] }>;
    links: Array<{ url: string; text: string }>;
    url: string;
  } | null;
  embed_place_url: string;
  embed_coord_url: string;
  embed_streetview_url: string;
}

const PY_BACKEND: string = ((import.meta.env.VITE_PY_BACKEND as string | undefined) || '').trim();
const KEY_STORAGE = 'tr_google_maps_api_key';

export function getSavedGoogleMapsKey(): string {
  return (
    localStorage.getItem(KEY_STORAGE) ||
    (import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined) ||
    ''
  ).trim();
}

export async function saveGoogleMapsKeyToPython(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim();
  if (clean) {
    localStorage.setItem(KEY_STORAGE, clean);
  } else {
    localStorage.removeItem(KEY_STORAGE);
  }
  if (!PY_BACKEND) return false;
  try {
    const res = await fetch(`${PY_BACKEND}/api/gmaps/configure-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: clean }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function inspectVenueViaPythonGmaps(venue: Venue): Promise<PythonGmapsInspection> {
  const queryStr = encodeURIComponent(`${venue.name} ${venue.district} ${venue.city}`.trim());
  const defaultEmbedPlace = `https://maps.google.com/maps?q=${queryStr}&hl=tr&z=17&output=embed`;
  const defaultEmbedCoord = `https://maps.google.com/maps?q=${venue.lat.toFixed(5)},${venue.lng.toFixed(5)}&t=k&hl=tr&z=19&output=embed`;
  const defaultStreetView = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${venue.lat.toFixed(5)},${venue.lng.toFixed(5)}`;

  if (PY_BACKEND) try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 45000);
    const key = getSavedGoogleMapsKey();
    const params = new URLSearchParams({
      name: venue.name,
      city: venue.city,
      district: venue.district,
      lat: String(venue.lat),
      lng: String(venue.lng),
    });

    const res = await fetch(`${PY_BACKEND}/api/gmaps/inspect-venue?${params.toString()}`, {
      headers: key ? { 'X-Google-Maps-Key': key } : undefined,
      signal: controller.signal,
    });
    window.clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as PythonGmapsInspection;
      return {
        ...data,
        embed_place_url: defaultEmbedPlace,
        embed_coord_url: defaultEmbedCoord,
        embed_streetview_url: defaultStreetView,
      };
    }
  } catch {
    // Fallback if Python service is unreachable
  }

  return {
    engine: 'client-hybrid',
    elevation_m: null,
    timezone_id: 'Europe/Istanbul',
    formatted_address: null,
    address_descriptor: null,
    google_place: null,
    embed_place_url: defaultEmbedPlace,
    embed_coord_url: defaultEmbedCoord,
    embed_streetview_url: defaultStreetView,
  };
}

/** Wake the Render free-tier backend as soon as the app opens (cold start ~50s). */
export function wakePythonBackend(): void {
  if (!PY_BACKEND) return;
  void fetch(`${PY_BACKEND}/api/gmaps/status`).catch(() => {});
}

const thumbMemoryCache = new Map<string, string>();
const THUMB_STORAGE_KEY = 'tr_gmaps_live_thumbs_v1';

function loadThumbCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(THUMB_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveThumbToCache(venueId: string, url: string) {
  thumbMemoryCache.set(venueId, url);
  if (!PY_BACKEND) return false;
  try {
    const existing = loadThumbCache();
    existing[venueId] = url;
    localStorage.setItem(THUMB_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage quota
  }
}

export function getCachedVenueThumb(venue: Venue): string | null {
  if (venue.googlePhotos && venue.googlePhotos.length > 0) return venue.googlePhotos[0];
  if (venue.osmImage && venue.osmImage.includes('googleusercontent.com')) return venue.osmImage;
  const mem = thumbMemoryCache.get(venue.id);
  if (mem) return mem;
  const persisted = loadThumbCache()[venue.id];
  if (persisted) {
    thumbMemoryCache.set(venue.id, persisted);
    return persisted;
  }
  return null;
}

export interface ScrapeGraphVenueResult {
  engine: string;
  nodes_executed: string[];
  name: string;
  city: string;
  district: string;
  category: string;
  priceTier: 'â‚º' | 'â‚ºâ‚º' | 'â‚ºâ‚ºâ‚º';
  signatureDish: string;
  lat: number;
  lng: number;
  gpsVerified: boolean;
  googleRating: number;
  googleReviewCount: number;
  photos: string[];
  reviews: GoogleVisualReview[];
}

export async function extractVenueViaScrapeGraph(
  source: string,
  defaultCity: string,
  prompt?: string
): Promise<ScrapeGraphVenueResult | null> {
  if (!PY_BACKEND) return null;
  try {
    const res = await fetch(`${PY_BACKEND}/api/scrapegraph/extract-venue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        default_city: defaultCity,
        prompt:
          prompt ||
          'MekÃ¢n adÄ±, ÅŸehir, semt, kategori, imza yemek, fiyat bandÄ±, koordinat ve fotoÄŸraflarÄ± Ã§Ä±kar',
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ScrapeGraphVenueResult;
  } catch {
    return null;
  }
}

let activeThumbRequests = 0;
const MAX_CONCURRENT_THUMBS = 2;

export async function fetchQuickGoogleMapsThumb(venue: Venue): Promise<string | null> {
  const existing = getCachedVenueThumb(venue);
  if (existing) return existing;
  if (!PY_BACKEND || activeThumbRequests >= MAX_CONCURRENT_THUMBS) return null;

  activeThumbRequests += 1;
  try {
    const params = new URLSearchParams({
      name: venue.name,
      city: venue.city,
      district: venue.district,
      lat: String(venue.lat),
      lng: String(venue.lng),
    });
    const res = await fetch(`${PY_BACKEND}/api/gmaps/quick-thumb?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumb_url?: string | null };
    if (data.thumb_url) {
      saveThumbToCache(venue.id, data.thumb_url);
      return data.thumb_url;
    }
  } catch {
    // Ignore when offline
  } finally {
    activeThumbRequests = Math.max(0, activeThumbRequests - 1);
  }
  return null;
}

export async function fetchNearbyViaPythonGmaps(
  lat: number,
  lng: number,
  city: string
): Promise<Venue[]> {
  if (!PY_BACKEND) return [];
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 14000);
    const params = new URLSearchParams({
      lat: lat.toFixed(5),
      lng: lng.toFixed(5),
      city,
      zoom: '15',
    });
    const res = await fetch(`${PY_BACKEND}/api/gmaps/nearby-venues?${params.toString()}`, {
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return [];
    const data = (await res.json()) as { venues?: Array<Partial<Venue>> };
    return (data.venues ?? [])
      .filter((v): v is Venue => Boolean(v.id && v.name && typeof v.lat === 'number' && typeof v.lng === 'number'))
      .map((v) => ({
        ...v,
        isLiveOsm: true,
        gpsVerified: true,
        sourcePlatform: 'Google',
      }));
  } catch {
    return [];
  }
}
