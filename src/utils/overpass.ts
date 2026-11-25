import type { CityName, Venue, VenueCategory, VenueCity } from '../types';
import { CITY_CENTERS, VENUE_CITIES } from '../data/venues';
import { fetchNearbyViaPythonGmaps } from './pythonGmapsClient';

export interface MapBoundsBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const FOOD_OSM_VALUES = new Set([
  'restaurant',
  'cafe',
  'fast_food',
  'bakery',
  'pastry',
  'confectionery',
  'ice_cream',
  'coffee',
  'bar',
  'pub',
  'teahouse',
  'biergarten',
  'food_court',
  'deli',
  'chocolate',
  'tea',
  'nuts',
  'spices',
]);

const fetchedCells = new Set<string>();

function mapOsmToCategory(amenity?: string, shop?: string, cuisine?: string, name?: string): VenueCategory {
  const c = (cuisine || '').toLowerCase();
  const a = (amenity || '').toLowerCase();
  const s = (shop || '').toLowerCase();
  const n = (name || '').toLocaleLowerCase('tr-TR');

  if (a === 'cafe' || s === 'coffee' || c.includes('coffee') || n.includes('coffee') || n.includes('kahve') || n.includes('roast')) {
    return '3. Nesil Kahve';
  }
  if (
    a === 'bakery' ||
    a === 'ice_cream' ||
    s === 'pastry' ||
    s === 'bakery' ||
    s === 'confectionery' ||
    c.includes('pastry') ||
    c.includes('dessert') ||
    c.includes('ice_cream') ||
    n.includes('pastane') ||
    n.includes('baklava') ||
    n.includes('künefe') ||
    n.includes('dondurma') ||
    n.includes('tatlı')
  ) {
    return 'Tatlı & Pastane';
  }
  if (
    c.includes('kebab') ||
    c.includes('doner') ||
    c.includes('döner') ||
    c.includes('grill') ||
    c.includes('steak') ||
    n.includes('kebap') ||
    n.includes('döner') ||
    n.includes('ocakbaşı') ||
    n.includes('ciğer') ||
    n.includes('iskender')
  ) {
    return 'Döner & Ocakbaşı';
  }
  if (
    c.includes('breakfast') ||
    n.includes('kahvaltı') ||
    n.includes('börek') ||
    n.includes('fırın') ||
    n.includes('simit')
  ) {
    return 'Kahvaltı & Fırın';
  }
  if (
    a === 'bar' ||
    a === 'pub' ||
    c.includes('seafood') ||
    c.includes('fish') ||
    c.includes('mediterranean') ||
    c.includes('italian') ||
    c.includes('sushi') ||
    n.includes('meyhane') ||
    n.includes('balık') ||
    n.includes('bistro')
  ) {
    return 'Meyhane & Bistro';
  }
  if (
    a === 'fast_food' ||
    c.includes('burger') ||
    c.includes('pizza') ||
    c.includes('street') ||
    n.includes('kokoreç') ||
    n.includes('tantuni') ||
    n.includes('midye') ||
    n.includes('büfe') ||
    n.includes('dürüm')
  ) {
    return 'Sokak Lezzeti';
  }
  return 'Esnaf Lokantası';
}

function guessNearestCity(lat: number, lng: number, fallback: CityName): VenueCity {
  if (fallback !== 'Tüm Türkiye') return fallback;
  let best: VenueCity = 'İstanbul';
  let minDist = Infinity;
  for (const c of VENUE_CITIES) {
    const center = CITY_CENTERS[c];
    const d = (center.lat - lat) ** 2 + (center.lng - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      best = c;
    }
  }
  return best;
}

function buildAddress(tags: Record<string, string>, fallbackDistrict: string, city: VenueCity): string {
  const street = tags['addr:street'];
  const num = tags['addr:housenumber'];
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:district'];
  const parts = [
    street ? (num ? `${street} No:${num}` : street) : undefined,
    suburb || fallbackDistrict,
    city,
  ].filter(Boolean);
  return parts.join(', ');
}

function cellKey(bounds: MapBoundsBox): string {
  const cLat = ((bounds.south + bounds.north) / 2).toFixed(3);
  const cLng = ((bounds.west + bounds.east) / 2).toFixed(3);
  return `${cLat}:${cLng}`;
}

export function isBoundsCached(bounds: MapBoundsBox): boolean {
  return fetchedCells.has(cellKey(bounds));
}

async function fetchPhotonFallback(
  cLat: number,
  cLng: number,
  fallbackCity: CityName
): Promise<Venue[]> {
  const terms = ['restoran', 'kafe', 'kebap'];

  interface PhotonResp {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        osm_id?: number;
        name?: string;
        street?: string;
        housenumber?: string;
        district?: string;
        city?: string;
        osm_key?: string;
        osm_value?: string;
      };
    }>;
  }

  const results: Venue[] = [];
  const seen = new Set<string>();

  await Promise.all(
    terms.map(async (term) => {
      try {
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 4500);
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${cLat.toFixed(4)}&lon=${cLng.toFixed(4)}&limit=25`;
        const res = await fetch(url, { signal: controller.signal });
        window.clearTimeout(t);
        if (!res.ok) return;
        const data = (await res.json()) as PhotonResp;
        for (const f of data.features ?? []) {
          const p = f.properties;
          const name = p?.name?.trim();
          const coords = f.geometry?.coordinates;
          if (!name || !coords) continue;
          if (p?.osm_key !== 'amenity' && p?.osm_key !== 'shop') continue;
          if (!p?.osm_value || !FOOD_OSM_VALUES.has(p.osm_value)) continue;
          const [lng, lat] = coords;
          if (Math.abs(lat - cLat) > 0.08 || Math.abs(lng - cLng) > 0.1) continue;
          const dedupe = name.toLocaleLowerCase('tr-TR');
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);

          const city = guessNearestCity(lat, lng, fallbackCity);
          const district = p.district || p.street || city;
          const addr = [p.street, district, city].filter(Boolean).join(', ');

          results.push({
            id: `osm-ph-${p.osm_id ?? `${lat.toFixed(4)}-${lng.toFixed(4)}`}`,
            name,
            city,
            district,
            category: mapOsmToCategory(p.osm_value, p.osm_value, undefined, name),
            priceTier: '₺₺',
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            gpsVerified: true,
            isLiveOsm: true,
            address: addr,
            signatureDish: `${district} · Canlı harita kaydı`,
            sourcePlatform: 'OpenStreetMap',
          });
        }
      } catch {
        // Ignore single query failure
      }
    })
  );

  return results;
}

async function fetchNominatimViewboxFallback(
  qBounds: MapBoundsBox,
  fallbackCity: CityName
): Promise<Venue[]> {
  const viewbox = `${qBounds.west.toFixed(4)},${qBounds.north.toFixed(4)},${qBounds.east.toFixed(4)},${qBounds.south.toFixed(4)}`;
  const tags = ['restaurant', 'cafe', 'fast_food'];
  const results: Venue[] = [];
  const seen = new Set<string>();

  await Promise.all(
    tags.map(async (tag) => {
      try {
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 3500);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          `[amenity=${tag}]`
        )}&viewbox=${viewbox}&bounded=1&limit=35&addressdetails=1`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        window.clearTimeout(t);
        if (!res.ok) return;
        const rows = (await res.json()) as Array<{
          place_id: number;
          name?: string;
          display_name: string;
          type?: string;
          lat: string;
          lon: string;
          address?: { road?: string; suburb?: string; town?: string; city_district?: string; county?: string };
        }>;
        for (const row of rows) {
          const name = row.name?.trim() || row.display_name.split(',')[0]?.trim();
          const lat = Number(row.lat);
          const lng = Number(row.lon);
          if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const dedupe = name.toLocaleLowerCase('tr-TR');
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          const city = guessNearestCity(lat, lng, fallbackCity);
          const addr = row.address ?? {};
          const district = addr.suburb || addr.city_district || addr.town || addr.county || city;
          results.push({
            id: `osm-nom-${row.place_id}`,
            name,
            city,
            district,
            category: mapOsmToCategory(tag, undefined, undefined, name),
            priceTier: '₺₺',
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            gpsVerified: true,
            isLiveOsm: true,
            address: [addr.road, district, city].filter(Boolean).join(', '),
            signatureDish: `${district} · Canlı harita kaydı`,
            sourcePlatform: 'OpenStreetMap',
          });
        }
      } catch {
        // Ignore single tag failure
      }
    })
  );

  return results;
}

async function fetchOverpassFast(
  qBounds: MapBoundsBox,
  fallbackCity: CityName,
  limit: number
): Promise<Venue[] | null> {
  const bbox = `${qBounds.south.toFixed(5)},${qBounds.west.toFixed(5)},${qBounds.north.toFixed(5)},${qBounds.east.toFixed(5)}`;
  const query = `[out:json][timeout:6];(nwr["amenity"="restaurant"](${bbox});nwr["amenity"="cafe"](${bbox});nwr["amenity"="fast_food"](${bbox});nwr["amenity"="bakery"](${bbox});nwr["amenity"="ice_cream"](${bbox});nwr["amenity"="bar"](${bbox});nwr["amenity"="pub"](${bbox});nwr["shop"="bakery"](${bbox});nwr["shop"="pastry"](${bbox});nwr["shop"="confectionery"](${bbox});nwr["shop"="coffee"](${bbox}););out center ${limit};`;

  interface OverpassElement {
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }
  interface OverpassResponse {
    elements?: OverpassElement[];
  }

  let json: OverpassResponse | null = null;
  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (res.ok) {
        json = (await res.json()) as OverpassResponse;
        break;
      }
    } catch {
      // Try next mirror
    }
  }
  if (!json) return null;

  const elements = json.elements ?? [];
  const seen = new Set<string>();
  const results: Venue[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    if (
      tags['disused:amenity'] ||
      tags['abandoned:amenity'] ||
      tags['was:amenity'] ||
      tags.closed === 'yes' ||
      tags.opening_hours === 'off'
    ) {
      continue;
    }
    const name = tags.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;

    const dedupeKey = `${name.toLocaleLowerCase('tr-TR')}_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const city = guessNearestCity(lat, lon, fallbackCity);
    const cuisineList = tags.cuisine
      ? tags.cuisine
          .split(/[;,]/)
          .map((c: string) => c.trim().replace(/_/g, ' '))
          .filter(Boolean)
          .slice(0, 4)
      : [];

    const district =
      tags['addr:suburb'] ||
      tags['addr:district'] ||
      tags['addr:neighbourhood'] ||
      tags['addr:quarter'] ||
      tags['addr:street'] ||
      city;

    const category = mapOsmToCategory(tags.amenity, tags.shop, tags.cuisine, name);
    const website = tags.website || tags['contact:website'];
    const phone = tags.phone || tags['contact:phone'];

    results.push({
      id: `osm-${el.type[0]}-${el.id}`,
      name,
      city,
      district,
      category,
      priceTier: category === 'Meyhane & Bistro' ? '₺₺₺' : category === 'Sokak Lezzeti' ? '₺' : '₺₺',
      lat: Number(lat.toFixed(5)),
      lng: Number(lon.toFixed(5)),
      gpsVerified: true,
      isLiveOsm: true,
      address: buildAddress(tags, district, city),
      openingHours: tags.opening_hours,
      phone,
      website: website && !website.startsWith('http') ? `https://${website}` : website,
      cuisineTags: cuisineList.length > 0 ? cuisineList : undefined,
      outdoorSeating: tags.outdoor_seating === 'yes',
      osmImage: tags.image?.startsWith('http') ? tags.image : undefined,
      wikimediaCommons: tags.wikimedia_commons,
      wikidataId: tags.wikidata,
      signatureDish:
        cuisineList.length > 0
          ? `Mutfak: ${cuisineList.join(', ')}`
          : tags.description || `${district} · Canlı harita kaydı`,
      sourcePlatform: 'OpenStreetMap',
    });
  }
  return results;
}

/**
 * Fetches REAL street-level restaurants, cafés, bakeries, patisseries, and eateries
 * in parallel from Google Maps (backend), OpenStreetMap Overpass, Photon Komoot, and Nominatim.
 */
export async function fetchLiveOsmVenuesInBounds(
  bounds: MapBoundsBox,
  fallbackCity: CityName,
  options?: { force?: boolean; limit?: number }
): Promise<Venue[]> {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  const maxSpan = 0.09;
  const cLat = (bounds.south + bounds.north) / 2;
  const cLng = (bounds.west + bounds.east) / 2;

  const qBounds: MapBoundsBox =
    latSpan > maxSpan || lngSpan > maxSpan
      ? {
          south: cLat - maxSpan / 2,
          north: cLat + maxSpan / 2,
          west: cLng - maxSpan / 2,
          east: cLng + maxSpan / 2,
        }
      : bounds;

  const key = cellKey(qBounds);
  if (!options?.force && fetchedCells.has(key)) {
    return [];
  }

  const limit = options?.limit ?? 400;
  const cityHint = guessNearestCity(cLat, cLng, fallbackCity);

  const [gmapsRes, overpassRes, photonRes, nomRes] = await Promise.allSettled([
    fetchNearbyViaPythonGmaps(cLat, cLng, cityHint),
    fetchOverpassFast(qBounds, fallbackCity, limit),
    fetchPhotonFallback(cLat, cLng, fallbackCity),
    fetchNominatimViewboxFallback(qBounds, fallbackCity),
  ]);

  const combined: Venue[] = [];
  const seen = new Set<string>();
  let anyResponded = false;

  const pushAll = (list: Venue[] | null | undefined) => {
    if (!list) return;
    anyResponded = true;
    for (const v of list) {
      const k = `${v.name.toLocaleLowerCase('tr-TR')}_${v.lat.toFixed(3)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      combined.push(v);
    }
  };

  if (gmapsRes.status === 'fulfilled' && gmapsRes.value.length > 0) pushAll(gmapsRes.value);
  if (overpassRes.status === 'fulfilled' && overpassRes.value !== null) pushAll(overpassRes.value);
  if (photonRes.status === 'fulfilled') pushAll(photonRes.value);
  if (nomRes.status === 'fulfilled') pushAll(nomRes.value);

  if (anyResponded || combined.length > 0) {
    fetchedCells.add(key);
  }

  return combined;
}
