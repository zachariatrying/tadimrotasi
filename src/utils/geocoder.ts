import type { Venue, VenueCategory, VenueCity } from '../types';
import { VENUE_CITIES } from '../data/venues';

export interface GeocodeResult {
  placeId: string;
  displayName: string;
  shortName: string;
  city: VenueCity;
  district: string;
  lat: number;
  lng: number;
  category: VenueCategory;
  address: string;
}

function detectCity(text: string): VenueCity {
  const lower = text.toLocaleLowerCase('tr-TR');
  for (const city of VENUE_CITIES) {
    if (lower.includes(city.toLocaleLowerCase('tr-TR'))) return city;
  }
  if (lower.includes('istanbul')) return 'İstanbul';
  if (lower.includes('izmir')) return 'İzmir';
  if (lower.includes('eskisehir')) return 'Eskişehir';
  if (lower.includes('mugla') || lower.includes('bodrum') || lower.includes('fethiye') || lower.includes('marmaris')) {
    return 'Muğla';
  }
  if (lower.includes('antakya') || lower.includes('iskenderun')) return 'Hatay';
  return 'İstanbul';
}

function guessCategoryFromText(text: string, osmType?: string): VenueCategory {
  const t = `${text} ${osmType || ''}`.toLocaleLowerCase('tr-TR');
  if (t.includes('cafe') || t.includes('coffee') || t.includes('kahve') || t.includes('espresso') || t.includes('roast')) {
    return '3. Nesil Kahve';
  }
  if (t.includes('baklava') || t.includes('pastane') || t.includes('tatlı') || t.includes('künefe') || t.includes('dondurma') || t.includes('bakery')) {
    return 'Tatlı & Pastane';
  }
  if (t.includes('kebap') || t.includes('döner') || t.includes('ocakbaşı') || t.includes('ciğer') || t.includes('steak') || t.includes('iskender')) {
    return 'Döner & Ocakbaşı';
  }
  if (t.includes('kahvaltı') || t.includes('börek') || t.includes('fırın') || t.includes('simit')) {
    return 'Kahvaltı & Fırın';
  }
  if (t.includes('meyhane') || t.includes('balık') || t.includes('bistro') || t.includes('pub') || t.includes('bar')) {
    return 'Meyhane & Bistro';
  }
  if (t.includes('fast_food') || t.includes('burger') || t.includes('kokoreç') || t.includes('tantuni') || t.includes('dürüm') || t.includes('büfe')) {
    return 'Sokak Lezzeti';
  }
  return 'Esnaf Lokantası';
}

export async function searchTurkeyPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Primary: Photon Komoot (ultra-fast fuzzy search bounded strictly to Turkey)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=25.6,35.8,44.9,42.2&limit=12`;
    const pRes = await fetch(photonUrl);
    if (pRes.ok) {
      const pJson = (await pRes.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] };
          properties?: {
            osm_id?: number;
            name?: string;
            street?: string;
            district?: string;
            city?: string;
            state?: string;
            osm_value?: string;
          };
        }>;
      };
      const mapped = (pJson.features ?? [])
        .filter((f) => f.properties?.name && f.geometry?.coordinates)
        .map((f, idx) => {
          const [lng, lat] = f.geometry!.coordinates!;
          const p = f.properties!;
          const cityRaw = p.city || p.state || p.district || '';
          const city = detectCity(cityRaw);
          const district = p.district || p.street || city;
          const address = [p.street, district, city].filter(Boolean).join(', ');
          return {
            placeId: `ph-${p.osm_id ?? idx}`,
            displayName: `${p.name}, ${address}`,
            shortName: p.name!,
            city,
            district,
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            category: guessCategoryFromText(`${p.name} ${address}`, p.osm_value),
            address,
          };
        });
      if (mapped.length > 0) return mapped;
    }
  } catch {
    // Fall through to Nominatim
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=tr&limit=10&accept-language=tr&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{
    place_id: number;
    display_name: string;
    name?: string;
    type?: string;
    lat: string;
    lon: string;
    address?: {
      road?: string;
      suburb?: string;
      town?: string;
      city_district?: string;
      county?: string;
      province?: string;
      city?: string;
      state?: string;
    };
  }>;

  return rows.map((row) => {
    const addr = row.address ?? {};
    const cityCandidate = addr.province || addr.city || addr.state || row.display_name;
    const city = detectCity(cityCandidate);
    const district = addr.suburb || addr.city_district || addr.town || addr.county || city;
    const shortName = row.name?.trim() || row.display_name.split(',')[0]?.trim() || q;
    const addressParts = [addr.road, district, city].filter(Boolean);

    return {
      placeId: String(row.place_id),
      displayName: row.display_name,
      shortName,
      city,
      district,
      lat: Number(Number(row.lat).toFixed(5)),
      lng: Number(Number(row.lon).toFixed(5)),
      category: guessCategoryFromText(`${shortName} ${row.display_name}`, row.type),
      address: addressParts.join(', '),
    };
  });
}

/**
 * Searches real restaurants/cafés/venues anywhere in Turkey (all 81 provinces) and converts them into Venue records.
 */
export async function searchLiveTurkeyRestaurants(query: string): Promise<Venue[]> {
  const hits = await searchTurkeyPlaces(query);
  return hits.map((hit) => ({
    id: `osm-search-${hit.placeId}`,
    name: hit.shortName,
    city: hit.city,
    district: hit.district,
    category: hit.category,
    priceTier: '₺₺',
    lat: hit.lat,
    lng: hit.lng,
    gpsVerified: true,
    isLiveOsm: true,
    address: hit.address,
    signatureDish: `${hit.district}, ${hit.city} · Canlı harita araması`,
    sourcePlatform: 'OpenStreetMap',
  }));
}
