import type { Venue, VenuePhoto } from '../types';

const GOOGLE_PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;

export const isGooglePlacesConfigured = Boolean(
  GOOGLE_PLACES_KEY && !GOOGLE_PLACES_KEY.includes('YOUR-GOOGLE-API-KEY')
);

/**
 * Returns ONLY real photos of this exact venue (Google Maps photos, visual review photos).
 * No stock / draft / generic dish photography is ever returned.
 */
export function getInstantVenuePhotos(venue: Venue): VenuePhoto[] {
  const seen = new Set<string>();
  const photos: VenuePhoto[] = [];

  (venue.googlePhotos ?? []).forEach((url, idx) => {
    if (seen.has(url)) return;
    seen.add(url);
    photos.push({
      url,
      caption: `${venue.name} · Google Haritalar Fotoğrafı #${idx + 1}`,
      source: idx === 0 ? 'Google Fotoğrafı' : 'Görselli Yorum',
      attribution: 'Google Haritalar',
    });
  });

  for (const rev of venue.googleReviews ?? []) {
    for (const pUrl of rev.photos || []) {
      if (seen.has(pUrl)) continue;
      seen.add(pUrl);
      photos.push({
        url: pUrl,
        caption: `${rev.author}: "${rev.text.slice(0, 70)}..."`,
        source: 'Görselli Yorum',
        attribution: `Google Yorumu · ${rev.author}`,
      });
    }
  }

  if (venue.osmImage && venue.osmImage.includes('googleusercontent.com') && !seen.has(venue.osmImage)) {
    photos.push({ url: venue.osmImage, caption: venue.name, source: 'Google Fotoğrafı' });
  }

  return photos.slice(0, 16);
}

export interface LiveVenueEnrichment {
  photos: VenuePhoto[];
  googleRating?: number;
  googleReviewCount?: number;
  googleOpeningHours?: string;
}

const enrichmentCache = new Map<string, LiveVenueEnrichment>();

async function fetchGooglePlacesEnrichment(venue: Venue): Promise<LiveVenueEnrichment | null> {
  if (!isGooglePlacesConfigured || !GOOGLE_PLACES_KEY) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask':
          'places.displayName,places.rating,places.userRatingCount,places.photos,places.currentOpeningHours',
      },
      body: JSON.stringify({
        textQuery: `${venue.name} ${venue.district} ${venue.city}`,
        languageCode: 'tr',
        maxResultCount: 1,
        locationBias: { circle: { center: { latitude: venue.lat, longitude: venue.lng }, radius: 600 } },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{
        rating?: number;
        userRatingCount?: number;
        currentOpeningHours?: { weekdayDescriptions?: string[] };
        photos?: Array<{ name: string }>;
      }>;
    };
    const place = data.places?.[0];
    if (!place) return null;
    return {
      photos: (place.photos ?? []).slice(0, 10).map((p, idx) => ({
        url: `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=960&key=${GOOGLE_PLACES_KEY}`,
        caption: `${venue.name} · Fotoğraf ${idx + 1}`,
        source: 'Google Fotoğrafı',
        attribution: 'Google Places',
      })),
      googleRating: place.rating,
      googleReviewCount: place.userRatingCount,
      googleOpeningHours: place.currentOpeningHours?.weekdayDescriptions?.[0],
    };
  } catch {
    return null;
  }
}

/** Real-only enrichment: existing Google photos + Google Places (if key configured). */
export async function resolveLiveVenueEnrichment(venue: Venue): Promise<LiveVenueEnrichment> {
  const cached = enrichmentCache.get(venue.id);
  if (cached) return cached;
  const googleData = await fetchGooglePlacesEnrichment(venue);
  const seen = new Set<string>();
  const merged: VenuePhoto[] = [];
  for (const p of [...(googleData?.photos ?? []), ...getInstantVenuePhotos(venue)]) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    merged.push(p);
  }
  const result: LiveVenueEnrichment = {
    photos: merged,
    googleRating: googleData?.googleRating,
    googleReviewCount: googleData?.googleReviewCount,
    googleOpeningHours: googleData?.googleOpeningHours,
  };
  enrichmentCache.set(venue.id, result);
  return result;
}
