import type { CityName, Venue, VenueCategory, VenueCity } from '../types';
import { CITY_CENTERS, VENUE_CITIES } from '../data/venues';

export interface MapBoundsBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
];

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
  const cLat = ((bounds.south + bounds.north) / 2).toFixed(2);
  const cLng = ((bounds.west + bounds.east) / 2).toFixed(2);
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
  const queries = [
    `https://photon.komoot.io/api/?q=restoran&lat=${cLat.toFixed(4)}&lon=${cLng.toFixed(4)}&limit=30&osm_tag=amenity:restaurant`,
    `https://photon.komoot.io/api/?q=cafe&lat=${cLat.toFixed(4)}&lon=${cLng.toFixed(4)}&limit=25&osm_tag=amenity:cafe`,
  ];

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
        osm_value?: string;
      };
    }>;
  }

  const results: Venue[] = [];
  const seen = new Set<string>();

  await Promise.all(
    queries.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as PhotonResp;
        for (const f of data.features ?? []) {
          const name = f.properties?.name?.trim();
          const coords = f.geometry?.coordinates;
          if (!name || !coords) continue;
          const [lng, lat] = coords;
          if (Math.abs(lat - cLat) > 0.12 || Math.abs(lng - cLng) > 0.16) continue;
          const dedupe = name.toLocaleLowerCase('tr-TR');
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);

          const city = guessNearestCity(lat, lng, fallbackCity);
          const district = f.properties?.district || f.properties?.street || city;
          const addr = [f.properties?.street, district, city].filter(Boolean).join(', ');

          results.push({
            id: `osm-ph-${f.properties?.osm_id ?? `${lat.toFixed(4)}-${lng.toFixed(4)}`}`,
            name,
            city,
            district,
            category: mapOsmToCategory(f.properties?.osm_value, undefined, undefined, name),
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

/**
 * Fetches REAL street-level restaurants, cafés, bakeries, patisseries, and eateries
 * (both nodes AND building polygons via `out center`) from OpenStreetMap Overpass mirrors
 * with automatic Photon Komoot geo-POI failover.
 */
export async function fetchLiveOsmVenuesInBounds(
  bounds: MapBoundsBox,
  fallbackCity: CityName,
  options?: { force?: boolean; limit?: number }
): Promise<Venue[]> {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  const maxSpan = 0.065;
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
  const bbox = `${qBounds.south.toFixed(5)},${qBounds.west.toFixed(5)},${qBounds.north.toFixed(5)},${qBounds.east.toFixed(5)}`;
  const query = `[out:json][timeout:12];(nwr["amenity"~"^(restaurant|cafe|fast_food|bakery|ice_cream|pub|bar|food_court|teahouse|biergarten)$"]["name"](${bbox});nwr["shop"~"^(pastry|bakery|confectionery|coffee|deli|chocolate|tea|ice_cream|nuts|spices)$"]["name"](${bbox}););out center ${limit};`;

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
      const timeout = window.setTimeout(() => controller.abort(), 9000);
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

  if (!json) {
    // Seamless Photon Komoot geo-POI fallback so real restaurants always load
    const fallbackVenues = await fetchPhotonFallback(cLat, cLng, fallbackCity);
    if (fallbackVenues.length > 0) {
      fetchedCells.add(key);
      return fallbackVenues;
    }
    throw new Error('Canlı mekân servisi şu an yoğun, birkaç saniye sonra tekrar dene.');
  }

  fetchedCells.add(key);

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
