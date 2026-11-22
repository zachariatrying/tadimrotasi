import type { GoogleVisualReview, RankedVenue, TadimState, Venue, VenueCategory, VenueCity } from '../types';
import { CITY_CENTERS, VENUE_CITIES } from '../data/venues';

export interface ActiveRouteData {
  venueId: string;
  venueName: string;
  mode: 'driving' | 'walking';
  distanceKm: number;
  durationMin: number;
  originLabel: string;
  coordinates: [number, number][]; // [lng, lat]
  steps: string[];
}

/**
 * Calculates a real street-level turn-by-turn route (Mapbox Navigation style)
 * using the public OSRM routing engine with graceful great-circle fallback.
 */
export async function calculateInAppRoute(
  origin: { lat: number; lng: number; label: string },
  dest: Venue,
  mode: 'driving' | 'walking' = 'driving'
): Promise<ActiveRouteData> {
  const profile = mode === 'walking' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng.toFixed(5)},${origin.lat.toFixed(5)};${dest.lng.toFixed(5)},${dest.lat.toFixed(5)}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry?: { coordinates: [number, number][] };
          legs?: Array<{
            steps?: Array<{
              name?: string;
              distance?: number;
              maneuver?: { type?: string; modifier?: string };
            }>;
          }>;
        }>;
      };
      const route = data.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const rawSteps = route.legs?.[0]?.steps ?? [];
        const steps = rawSteps
          .filter((s) => (s.distance ?? 0) > 25 && s.name)
          .slice(0, 6)
          .map((s) => `${s.name} boyunca ${Math.round(s.distance ?? 0)} m ilerle`);

        const distKm = Math.max(0.1, Math.round((route.distance / 1000) * 10) / 10);
        // OSRM public demo foot profile sometimes returns driving speed; compute realistic walking time
        const durMin =
          mode === 'walking'
            ? Math.max(2, Math.round((distKm / 4.8) * 60))
            : Math.max(2, Math.round(route.duration / 60));

        return {
          venueId: dest.id,
          venueName: dest.name,
          mode,
          distanceKm: distKm,
          durationMin: durMin,
          originLabel: origin.label,
          coordinates: route.geometry.coordinates,
          steps: steps.length > 0 ? steps : [`${dest.district} yönünde ana arter üzerinden ilerle`],
        };
      }
    }
  } catch {
    // Fallback to direct line below
  }

  const R = 6371;
  const dLat = ((dest.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((dest.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((dest.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const straightKm = Math.max(0.2, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 13) / 10);
  const durMin = mode === 'walking' ? Math.round((straightKm / 4.8) * 60) : Math.max(3, Math.round((straightKm / 26) * 60));

  return {
    venueId: dest.id,
    venueName: dest.name,
    mode,
    distanceKm: straightKm,
    durationMin: durMin,
    originLabel: origin.label,
    coordinates: [
      [origin.lng, origin.lat],
      [(origin.lng + dest.lng) / 2, (origin.lat + dest.lat) / 2 + 0.002],
      [dest.lng, dest.lat],
    ],
    steps: [`${origin.label} noktasından ${dest.name} (${dest.district}) yönüne ilerle`],
  };
}

/**
 * Exports user venues & rankings as an Organic Maps / QGIS / Mapbox compatible GeoJSON file.
 */
export function downloadOrganicMapsGeoJson(venues: Venue[], ranked: RankedVenue[]): void {
  const rankMap = new Map(ranked.map((r) => [r.venueId, r]));
  const geojson = {
    type: 'FeatureCollection',
    features: venues.map((v) => {
      const r = rankMap.get(v.id);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [v.lng, v.lat],
        },
        properties: {
          name: v.name,
          city: v.city,
          district: v.district,
          category: v.category,
          priceTier: v.priceTier,
          eloScore: r?.score ?? null,
          personalNote: r?.personalNote ?? v.signatureDish,
          address: v.address ?? `${v.district}, ${v.city}`,
          openingHours: v.openingHours ?? null,
          phone: v.phone ?? null,
          website: v.website ?? null,
        },
      };
    }),
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tadimrotasi-organicmaps-${new Date().toISOString().slice(0, 10)}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports user venues & rankings as a KML file for Organic Maps, Google Earth, and Maps.me.
 */
export function downloadOrganicMapsKml(venues: Venue[], ranked: RankedVenue[]): void {
  const rankMap = new Map(ranked.map((r) => [r.venueId, r]));
  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const placemarks = venues
    .map((v) => {
      const r = rankMap.get(v.id);
      const title = r ? `${v.name} (${r.score.toFixed(1)})` : v.name;
      const desc = `${v.category} · ${v.priceTier} · ${v.signatureDish}${r?.personalNote ? ` — Not: ${r.personalNote}` : ''}`;
      return `    <Placemark>
      <name>${escapeXml(title)}</name>
      <description>${escapeXml(desc)}</description>
      <Point><coordinates>${v.lng},${v.lat},0</coordinates></Point>
    </Placemark>`;
    })
    .join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>TadımRotası Mekân Haritası</name>
${placemarks}
  </Document>
</kml>`;

  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tadimrotasi-organicmaps-${new Date().toISOString().slice(0, 10)}.kml`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports user venues & rankings as a GPX waypoints file for Organic Maps, Garmin, and hiking/cycling GPS apps.
 */
export function downloadOrganicMapsGpx(venues: Venue[], ranked: RankedVenue[]): void {
  const rankMap = new Map(ranked.map((r) => [r.venueId, r]));
  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const wpts = venues
    .map((v) => {
      const r = rankMap.get(v.id);
      const title = r ? `${v.name} (${r.score.toFixed(1)})` : v.name;
      const desc = `${v.category} · ${v.priceTier} · ${v.signatureDish}`;
      return `  <wpt lat="${v.lat}" lon="${v.lng}">
    <name>${escapeXml(title)}</name>
    <desc>${escapeXml(desc)}</desc>
    <type>${escapeXml(v.category)}</type>
  </wpt>`;
    })
    .join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TadımRotası (Organic Maps Compatible)" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>`;

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tadimrotasi-organicmaps-${new Date().toISOString().slice(0, 10)}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

function guessCity(lat: number, lng: number, address?: string): VenueCity {
  const lower = (address || '').toLocaleLowerCase('tr-TR');
  for (const c of VENUE_CITIES) {
    if (lower.includes(c.toLocaleLowerCase('tr-TR'))) return c;
  }
  let best: VenueCity = 'İstanbul';
  let minD = Infinity;
  for (const c of VENUE_CITIES) {
    const center = CITY_CENTERS[c];
    const d = (center.lat - lat) ** 2 + (center.lng - lng) ** 2;
    if (d < minD) {
      minD = d;
      best = c;
    }
  }
  return best;
}

function guessCategory(catRaw?: string, title?: string): VenueCategory {
  const t = `${catRaw || ''} ${title || ''}`.toLocaleLowerCase('tr-TR');
  if (t.includes('cafe') || t.includes('coffee') || t.includes('kahve')) return '3. Nesil Kahve';
  if (t.includes('baklava') || t.includes('pastane') || t.includes('tatlı') || t.includes('bakery') || t.includes('dessert'))
    return 'Tatlı & Pastane';
  if (t.includes('kebap') || t.includes('döner') || t.includes('ocakbaşı') || t.includes('steak') || t.includes('kebab'))
    return 'Döner & Ocakbaşı';
  if (t.includes('kahvaltı') || t.includes('börek') || t.includes('fırın') || t.includes('breakfast'))
    return 'Kahvaltı & Fırın';
  if (t.includes('meyhane') || t.includes('balık') || t.includes('bistro') || t.includes('bar') || t.includes('seafood'))
    return 'Meyhane & Bistro';
  if (t.includes('fast') || t.includes('burger') || t.includes('kokoreç') || t.includes('sokak'))
    return 'Sokak Lezzeti';
  return 'Esnaf Lokantası';
}

/**
 * Parses either a native TadımRotası JSON backup OR a `gosom/google-maps-scraper` JSON/JSONL export!
 */
export function parseBackupOrScraperJson(
  rawText: string,
  currentState: TadimState
): { state: TadimState; message: string } {
  const trimmed = rawText.trim();

  // Case 0: Organic Maps KML or GPX XML bookmark import
  if (trimmed.startsWith('<?xml') || trimmed.includes('<kml') || trimmed.includes('<gpx')) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(trimmed, 'text/xml');
    const imported: Venue[] = [];

    // KML <Placemark>
    xml.querySelectorAll('Placemark').forEach((pm, idx) => {
      const name = pm.querySelector('name')?.textContent?.trim();
      const desc = pm.querySelector('description')?.textContent?.trim() || 'Organic Maps KML yer imi';
      const coordText = pm.querySelector('coordinates')?.textContent?.trim();
      if (!name || !coordText) return;
      const [lngStr, latStr] = coordText.split(',');
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const city = guessCity(lat, lng, desc);
      imported.push({
        id: `om-kml-${Date.now()}-${idx}`,
        name,
        city,
        district: city,
        category: guessCategory(desc, name),
        priceTier: '₺₺',
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        gpsVerified: true,
        signatureDish: desc,
        sourcePlatform: 'OpenStreetMap',
      });
    });

    // GPX <wpt>
    xml.querySelectorAll('wpt').forEach((wpt, idx) => {
      const name = wpt.querySelector('name')?.textContent?.trim();
      const desc = wpt.querySelector('desc')?.textContent?.trim() || 'Organic Maps GPX yer imi';
      const lat = Number(wpt.getAttribute('lat'));
      const lng = Number(wpt.getAttribute('lon'));
      if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return;
      const city = guessCity(lat, lng, desc);
      imported.push({
        id: `om-gpx-${Date.now()}-${idx}`,
        name,
        city,
        district: city,
        category: guessCategory(desc, name),
        priceTier: '₺₺',
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        gpsVerified: true,
        signatureDish: desc,
        sourcePlatform: 'OpenStreetMap',
      });
    });

    if (imported.length === 0) {
      throw new Error('KML/GPX dosyasında geçerli yer imi bulunamadı.');
    }

    return {
      state: {
        ...currentState,
        venues: [...imported, ...currentState.venues],
        wantToGoIds: [...imported.map((v) => v.id), ...currentState.wantToGoIds],
      },
      message: `Organic Maps KML/GPX dosyasından ${imported.length} yer imi Gideceklerim listene eklendi!`,
    };
  }

  // Support JSONL (one JSON object per line from google-maps-scraper) or standard JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    parsed = lines.map((l) => JSON.parse(l) as unknown);
  }

  // Case 1: Native TadımRotası backup object
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'venues' in parsed &&
    Array.isArray((parsed as TadimState).venues)
  ) {
    const st = parsed as TadimState;
    return {
      state: st,
      message: `TadımRotası yedeği yüklendi (${st.venues.length} mekân).`,
    };
  }

  // Case 2: gosom/google-maps-scraper array of places
  if (Array.isArray(parsed)) {
    const imported: Venue[] = [];
    parsed.forEach((row: Record<string, unknown>, idx) => {
      const title = String(row.title || row.name || '').trim();
      const coordsObj =
        row.coordinates && typeof row.coordinates === 'object'
          ? (row.coordinates as Record<string, unknown>)
          : row.location && typeof row.location === 'object'
            ? (row.location as Record<string, unknown>)
            : null;
      const lat = Number(row.latitude ?? row.lat ?? coordsObj?.latitude ?? coordsObj?.lat);
      const lng = Number(row.longitude ?? row.lng ?? row.lon ?? coordsObj?.longitude ?? coordsObj?.lng);
      if (!title || Number.isNaN(lat) || Number.isNaN(lng)) return;

      const addr = String(row.address || row.complete_address || row.street || '');
      const city = guessCity(lat, lng, String(row.city || addr));
      const cat = guessCategory(
        String(row.category || row.main_category || row.categoryName || ''),
        title
      );
      const priceStr = String(row.price_range || row.price || '');
      const priceTier: '₺' | '₺₺' | '₺₺₺' =
        priceStr.length >= 3 ? '₺₺₺' : priceStr.length === 1 ? '₺' : '₺₺';

      const thumbRaw = row.thumbnail || row.featured_image || row.imageUrl;
      const thumb =
        typeof thumbRaw === 'string' && thumbRaw.startsWith('http')
          ? thumbRaw
          : undefined;

      // Extract `images` / `imageUrls` array from gosom (37-field), omkarcloud (50+ field), or Apify `compass/crawler-google-places`
      const gPhotos: string[] = [];
      if (thumb) gPhotos.push(thumb);
      const rawImageList = Array.isArray(row.images)
        ? row.images
        : Array.isArray(row.imageUrls)
          ? row.imageUrls
          : [];
      for (const imgEntry of rawImageList) {
        if (typeof imgEntry === 'string' && imgEntry.startsWith('http')) {
          if (!gPhotos.includes(imgEntry)) gPhotos.push(imgEntry);
        } else if (imgEntry && typeof imgEntry === 'object') {
          const u = String(
            (imgEntry as Record<string, unknown>).image ||
              (imgEntry as Record<string, unknown>).imageUrl ||
              (imgEntry as Record<string, unknown>).url ||
              (imgEntry as Record<string, unknown>).link ||
              ''
          );
          if (u.startsWith('http') && !gPhotos.includes(u)) gPhotos.push(u);
        }
      }

      // Extract `user_reviews` + `user_reviews_extended` (gosom) + `detailed_reviews` (omkarcloud) + `reviews` (Apify compass/crawler-google-places)
      const rawRevs = [
        ...(Array.isArray(row.user_reviews) ? row.user_reviews : []),
        ...(Array.isArray(row.user_reviews_extended) ? row.user_reviews_extended : []),
        ...(Array.isArray(row.detailed_reviews) ? row.detailed_reviews : []),
        ...(Array.isArray(row.reviews) ? row.reviews : []),
      ];
      const gReviews: GoogleVisualReview[] = [];
      for (const rv of rawRevs.slice(0, 8)) {
        if (!rv || typeof rv !== 'object') continue;
        const rObj = rv as Record<string, unknown>;
        const text = String(
          rObj.Description || rObj.description || rObj.review_text || rObj.text || ''
        ).trim();
        const revImgSource =
          rObj.Images || rObj.images || rObj.photos || rObj.review_photos || rObj.reviewImageUrls;
        const revImgs = Array.isArray(revImgSource)
          ? (revImgSource as unknown[])
              .map((x) => String(x))
              .filter((x) => x.startsWith('http'))
          : [];
        for (const ri of revImgs) {
          if (!gPhotos.includes(ri)) gPhotos.push(ri);
        }
        if (text || revImgs.length > 0) {
          gReviews.push({
            author: String(
              rObj.Name || rObj.name || rObj.reviewer_name || rObj.author || 'Google Haritalar Kullanıcısı'
            ),
            badge: rObj.isLocalGuide ? 'Yerel Rehber' : undefined,
            avatar:
              typeof (rObj.ProfilePicture || rObj.reviewerPhotoUrl || rObj.reviewer_avatar || rObj.avatar) === 'string'
                ? String(rObj.ProfilePicture || rObj.reviewerPhotoUrl || rObj.reviewer_avatar || rObj.avatar)
                : undefined,
            relativeTime:
              typeof (rObj.When || rObj.publishedAtDate || rObj.published_at || rObj.relativeTime) === 'string'
                ? String(rObj.When || rObj.publishedAtDate || rObj.published_at || rObj.relativeTime).slice(0, 16)
                : undefined,
            text,
            photos: revImgs.slice(0, 4),
          });
        }
      }

      const rawRating = row.review_rating ?? row.rating ?? row.totalScore;
      const rawRevCount =
        row.review_count ??
        row.reviewsCount ??
        (typeof row.reviews === 'number' ? row.reviews : undefined);
      const districtGuess =
        (typeof row.neighborhood === 'string' && row.neighborhood.trim()) ||
        addr.split(',')[0]?.trim() ||
        city;

      imported.push({
        id: `gmaps-${row.place_id || row.placeId || row.cid || `${Date.now()}-${idx}`}`,
        name: title,
        city,
        district: districtGuess,
        category: cat,
        priceTier,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        gpsVerified: true,
        address: addr || undefined,
        openingHours: typeof (row.open_hours || row.hours) === 'string' ? String(row.open_hours || row.hours) : undefined,
        phone: typeof row.phone === 'string' ? row.phone : undefined,
        website: typeof row.website === 'string' ? row.website : undefined,
        osmImage: gPhotos[0] || thumb,
        googlePhotos: gPhotos.length > 0 ? gPhotos.slice(0, 12) : undefined,
        googleReviews: gReviews.length > 0 ? gReviews : undefined,
        googleRating: rawRating ? Number(rawRating) : undefined,
        googleReviewCount: rawRevCount ? Number(rawRevCount) : undefined,
        signatureDish: String(row.descriptions || row.description || row.main_category || row.category || 'Google Maps Scraper kaydı'),
        sourceUrl: typeof row.link === 'string' ? row.link : undefined,
        sourcePlatform: 'Google',
      });
    });

    if (imported.length === 0) {
      throw new Error('JSON içinde geçerli mekân koordinatı bulunamadı.');
    }

    const existingNames = new Set(
      currentState.venues.map((v) => v.name.toLocaleLowerCase('tr-TR'))
    );
    const deduped = imported.filter((v) => !existingNames.has(v.name.toLocaleLowerCase('tr-TR')));

    return {
      state: {
        ...currentState,
        venues: [...deduped, ...currentState.venues],
      },
      message: `Google Maps Scraper dosyasından ${deduped.length} yeni gerçek mekân haritaya aktarıldı!`,
    };
  }

  throw new Error('Desteklenmeyen JSON formatı.');
}
