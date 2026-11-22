import type { Venue, VenueCategory, VenuePhoto } from '../types';

const GOOGLE_PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;

export const isGooglePlacesConfigured = Boolean(
  GOOGLE_PLACES_KEY && !GOOGLE_PLACES_KEY.includes('YOUR-GOOGLE-API-KEY')
);

// Verified, openly licensed real Turkish gastronomy photography from Wikimedia Commons (960px CDN)
const VERIFIED_DISH_PHOTOS = {
  baklava1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Baklava_-_Turkish_special%2C_80-ply.JPEG/960px-Baklava_-_Turkish_special%2C_80-ply.JPEG',
    caption: 'Fıstıklı Türk baklavası',
  },
  baklava2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/2018-04-28_Turkish_baklava_in_Australian_turkish_cafe.jpg/960px-2018-04-28_Turkish_baklava_in_Australian_turkish_cafe.jpg',
    caption: 'Tepsi baklava sunumu',
  },
  baklava3: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Baklava_and_ice_cream.jpg/960px-Baklava_and_ice_cream.jpg',
    caption: 'Dondurmalı baklava',
  },
  kunefe1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Knafeh_From_Yaffa_Knafeh.jpg/960px-Knafeh_From_Yaffa_Knafeh.jpg',
    caption: 'Sıcak tepsi künefe',
  },
  adana1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Adana_Kebap.jpg/960px-Adana_Kebap.jpg',
    caption: 'Közde zırh Adana kebap',
  },
  adana2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Adana_kebab_in_Ankara.jpg/960px-Adana_kebab_in_Ankara.jpg',
    caption: 'Ocakbaşı kebap tabağı',
  },
  iskender1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/%C4%B0skender_Kebap.jpg/960px-%C4%B0skender_Kebap.jpg',
    caption: 'Tereyağlı İskender kebap',
  },
  iskender2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Iskender_kebab_on_plate.jpg/960px-Iskender_kebab_on_plate.jpg',
    caption: 'Yoğurtlu döner kebap',
  },
  doner1: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Doner_kebab%2C_Istanbul%2C_Turkey.JPG',
    caption: 'İstanbul yaprak döner',
  },
  doner2: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/D%C3%B6ner_kebab_slicing.jpg',
    caption: 'Odun ateşinde ince kesim döner',
  },
  lahmacun1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Lahmacun.jpg/960px-Lahmacun.jpg',
    caption: 'Taş fırın çıtır lahmacun',
  },
  lahmacun2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Wrapped_Lahmacun.jpg/960px-Wrapped_Lahmacun.jpg',
    caption: 'Limon ve maydanozlu lahmacun',
  },
  manti1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Turkish_Mant%C4%B1_in_Ankara.jpg/960px-Turkish_Mant%C4%B1_in_Ankara.jpg',
    caption: 'Yoğurtlu tereyağlı mantı',
  },
  kurufasulye1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Etli_kuru_fasulye.jpg/960px-Etli_kuru_fasulye.jpg',
    caption: 'Esnaf lokantası etli kuru fasulye',
  },
  kurufasulye2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Kuru_Fasulye_pilav.jpg/960px-Kuru_Fasulye_pilav.jpg',
    caption: 'Kuru fasulye ve pilav',
  },
  kofte1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Turkish_kofte%2C_bulgur_and_fries.jpg/960px-Turkish_kofte%2C_bulgur_and_fries.jpg',
    caption: 'Izgara köfte ve bulgur',
  },
  kofte2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Turkish_kofte_menu.jpg/960px-Turkish_kofte_menu.jpg',
    caption: 'Geleneksel köfte tabağı',
  },
  coffee1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Latte_and_dark_coffee.jpg/960px-Latte_and_dark_coffee.jpg',
    caption: 'Nitelikli latte & filtre kahve',
  },
  coffee2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Turkish_coffee_in_Istanbul.jpg/960px-Turkish_coffee_in_Istanbul.jpg',
    caption: 'İstanbul kahve kültürü',
  },
  coffee3: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Maple_latte_in_coffee_shop.jpg/960px-Maple_latte_in_coffee_shop.jpg',
    caption: '3. nesil kahve barı',
  },
  coffee4: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Roasted_coffee_beans.jpg/960px-Roasted_coffee_beans.jpg',
    caption: 'Taze kavrulmuş kahve çekirdekleri',
  },
  breakfast1: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/64/TurkishBreakfastAtCesme.jpg',
    caption: 'Serpme Türk kahvaltısı',
  },
  menemen1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Menemen%2C_%C4%B0zmir%2C_Turkey.jpg/960px-Menemen%2C_%C4%B0zmir%2C_Turkey.jpg',
    caption: 'Sıcak sahanda menemen',
  },
  borek1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Various_b%C3%B6reks_in_Turkey.jpg/960px-Various_b%C3%B6reks_in_Turkey.jpg',
    caption: 'Fırından taze börek çeşitleri',
  },
  simit1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Simit%2C_Istanbul%2C_Turkey_%2849579014147%29.jpg/960px-Simit%2C_Istanbul%2C_Turkey_%2849579014147%29.jpg',
    caption: 'Susamlı çıtır İstanbul simidi',
  },
  meze1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Karisik_Meze_Tabagi_-_Vorspeisen.JPG/960px-Karisik_Meze_Tabagi_-_Vorspeisen.JPG',
    caption: 'Soğuk meze seçkisi',
  },
  meze2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Meze_Lido_Restaurant_Adalar.JPG/960px-Meze_Lido_Restaurant_Adalar.JPG',
    caption: 'Deniz kenarı meyhane sofrası',
  },
  meze3: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Meze_plate.jpg/960px-Meze_plate.jpg',
    caption: 'Mevsimsel bistro mezeleri',
  },
  kokorec1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Kokore%C3%A7.jpg/960px-Kokore%C3%A7.jpg',
    caption: 'Közde kuzu kokoreç',
  },
  midye1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Midye_Dolma_%28Stuffed_Mussels%29.jpg/960px-Midye_Dolma_%28Stuffed_Mussels%29.jpg',
    caption: 'Limonlu taze midye dolma',
  },
  interior1: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Istanbul_%2810777814314%29.jpg/960px-Istanbul_%2810777814314%29.jpg',
    caption: 'Restoran atmosferi',
  },
};

const CATEGORY_POOLS: Record<VenueCategory, Array<{ url: string; caption: string }>> = {
  'Esnaf Lokantası': [
    VERIFIED_DISH_PHOTOS.kurufasulye1,
    VERIFIED_DISH_PHOTOS.manti1,
    VERIFIED_DISH_PHOTOS.kofte1,
    VERIFIED_DISH_PHOTOS.kurufasulye2,
  ],
  '3. Nesil Kahve': [
    VERIFIED_DISH_PHOTOS.coffee1,
    VERIFIED_DISH_PHOTOS.coffee3,
    VERIFIED_DISH_PHOTOS.coffee2,
    VERIFIED_DISH_PHOTOS.coffee4,
  ],
  'Döner & Ocakbaşı': [
    VERIFIED_DISH_PHOTOS.adana1,
    VERIFIED_DISH_PHOTOS.doner1,
    VERIFIED_DISH_PHOTOS.iskender1,
    VERIFIED_DISH_PHOTOS.lahmacun1,
  ],
  'Meyhane & Bistro': [
    VERIFIED_DISH_PHOTOS.meze1,
    VERIFIED_DISH_PHOTOS.meze2,
    VERIFIED_DISH_PHOTOS.meze3,
    VERIFIED_DISH_PHOTOS.interior1,
  ],
  'Kahvaltı & Fırın': [
    VERIFIED_DISH_PHOTOS.breakfast1,
    VERIFIED_DISH_PHOTOS.menemen1,
    VERIFIED_DISH_PHOTOS.borek1,
    VERIFIED_DISH_PHOTOS.simit1,
  ],
  'Tatlı & Pastane': [
    VERIFIED_DISH_PHOTOS.baklava1,
    VERIFIED_DISH_PHOTOS.kunefe1,
    VERIFIED_DISH_PHOTOS.baklava2,
    VERIFIED_DISH_PHOTOS.baklava3,
  ],
  'Sokak Lezzeti': [
    VERIFIED_DISH_PHOTOS.kokorec1,
    VERIFIED_DISH_PHOTOS.simit1,
    VERIFIED_DISH_PHOTOS.lahmacun2,
    VERIFIED_DISH_PHOTOS.midye1,
  ],
};

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns immediate, keyword-tailored high-res Turkish food photos with zero latency.
 */
export function getInstantVenuePhotos(venue: Venue): VenuePhoto[] {
  const text = `${venue.name} ${venue.signatureDish} ${(venue.cuisineTags || []).join(' ')}`.toLocaleLowerCase('tr-TR');
  const prioritized: Array<{ url: string; caption: string }> = [];

  if (text.includes('baklava') || text.includes('şöbiyet') || text.includes('katmer')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.baklava1, VERIFIED_DISH_PHOTOS.baklava2);
  }
  if (text.includes('künefe')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.kunefe1);
  }
  if (text.includes('iskender')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.iskender1, VERIFIED_DISH_PHOTOS.iskender2);
  }
  if (text.includes('döner')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.doner1, VERIFIED_DISH_PHOTOS.doner2);
  }
  if (text.includes('lahmacun') || text.includes('etliekmek') || text.includes('pide')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.lahmacun1, VERIFIED_DISH_PHOTOS.lahmacun2);
  }
  if (text.includes('adana') || text.includes('kebap') || text.includes('küşleme') || text.includes('ocakbaşı') || text.includes('ciğer')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.adana1, VERIFIED_DISH_PHOTOS.adana2);
  }
  if (text.includes('fasulye') || text.includes('pilav')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.kurufasulye1, VERIFIED_DISH_PHOTOS.kurufasulye2);
  }
  if (text.includes('köfte') || text.includes('piyaz')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.kofte1, VERIFIED_DISH_PHOTOS.kofte2);
  }
  if (text.includes('mantı')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.manti1);
  }
  if (text.includes('kahvaltı') || text.includes('menemen') || text.includes('boyoz')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.breakfast1, VERIFIED_DISH_PHOTOS.menemen1);
  }
  if (text.includes('börek') || text.includes('çibörek')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.borek1);
  }
  if (text.includes('simit')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.simit1);
  }
  if (text.includes('kokoreç')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.kokorec1);
  }
  if (text.includes('midye')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.midye1);
  }
  if (text.includes('kahve') || text.includes('coffee') || text.includes('espresso') || text.includes('latte')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.coffee1, VERIFIED_DISH_PHOTOS.coffee2);
  }
  if (text.includes('meze') || text.includes('meyhane') || text.includes('balık') || text.includes('deniz')) {
    prioritized.push(VERIFIED_DISH_PHOTOS.meze1, VERIFIED_DISH_PHOTOS.meze2);
  }

  // Rotate category pool deterministically by venue id so neighboring venues look distinct
  const pool = CATEGORY_POOLS[venue.category];
  const offset = hashString(venue.id) % pool.length;
  const rotatedPool = [...pool.slice(offset), ...pool.slice(0, offset)];

  const combined = [...prioritized, ...rotatedPool];
  const uniqueUrls = new Set<string>();
  const photos: VenuePhoto[] = [];

  // 1. Real Google Maps Venue Photos & Visual Review Photos (pre-harvested or live-attached)
  if (venue.googlePhotos && venue.googlePhotos.length > 0) {
    venue.googlePhotos.forEach((url, idx) => {
      if (uniqueUrls.has(url)) return;
      uniqueUrls.add(url);
      photos.push({
        url,
        caption: `${venue.name} · Google Haritalar Fotoğrafı #${idx + 1}`,
        source: idx === 0 ? 'Google Fotoğrafı' : 'Görselli Yorum',
        attribution: 'Google Haritalar',
      });
    });
  }

  // 2. Photos embedded inside Google Visual Reviews
  if (venue.googleReviews && venue.googleReviews.length > 0) {
    for (const rev of venue.googleReviews) {
      for (const pUrl of rev.photos || []) {
        if (uniqueUrls.has(pUrl)) continue;
        uniqueUrls.add(pUrl);
        photos.push({
          url: pUrl,
          caption: `${rev.author}: "${rev.text.slice(0, 70)}..."`,
          source: 'Görselli Yorum',
          attribution: `Google Yorumu · ${rev.author}`,
        });
      }
    }
  }

  // 3. Direct OSM / Wikimedia image if present
  if (venue.osmImage && !uniqueUrls.has(venue.osmImage)) {
    uniqueUrls.add(venue.osmImage);
    photos.push({
      url: venue.osmImage,
      caption: venue.name,
      source: venue.osmImage.includes('googleusercontent.com') ? 'Google Fotoğrafı' : 'Wikimedia Mekân',
    });
  }

  // 4. Only use fallback dish photos if venue has fewer than 3 real Google Maps photos
  if (photos.length < 3) {
    for (const item of combined) {
      if (uniqueUrls.has(item.url)) continue;
      uniqueUrls.add(item.url);
      photos.push({
        url: item.url,
        caption: item.caption,
        source: 'Mutfak Fotoğrafı',
        attribution: 'Wikimedia Commons',
      });
      if (photos.length >= 4) break;
    }
  }

  return photos.slice(0, 14);
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

    const photos: VenuePhoto[] = (place.photos ?? []).slice(0, 6).map((p, idx) => ({
      url: `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=960&key=${GOOGLE_PLACES_KEY}`,
      caption: `${venue.name} · Fotoğraf ${idx + 1}`,
      source: 'Google Fotoğrafı',
      attribution: 'Google Places',
    }));

    return {
      photos,
      googleRating: place.rating,
      googleReviewCount: place.userRatingCount,
      googleOpeningHours: place.currentOpeningHours?.weekdayDescriptions?.[0],
    };
  } catch {
    return null;
  }
}

async function fetchWikimediaVenuePhotos(venue: Venue): Promise<VenuePhoto[]> {
  const collected: VenuePhoto[] = [];
  const seen = new Set<string>();

  const parsePages = (
    pages: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }> | undefined,
    source: VenuePhoto['source'],
    defaultCaption: string
  ) => {
    if (!pages) return;
    for (const page of Object.values(pages)) {
      const thumb = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;
      if (!thumb) continue;
      const cleanUrl = thumb.replace(/\?.*$/, '');
      if (!/\.(jpe?g|png|webp)$/i.test(cleanUrl) || seen.has(cleanUrl)) continue;
      // Skip maps, icons, coats of arms, logos
      if (/(map|locator|coat_of_arms|flag_of|logo|emblem|diagram)/i.test(cleanUrl)) continue;
      seen.add(cleanUrl);
      collected.push({
        url: cleanUrl,
        caption: defaultCaption,
        source,
        attribution: 'Wikimedia Commons',
      });
    }
  };

  try {
    // 1. Direct venue name search on Wikimedia Commons
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      `"${venue.name}"`
    )}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`;
    const [nameRes, geoRes] = await Promise.all([
      fetch(searchUrl),
      fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${venue.lat}|${venue.lng}&ggsradius=300&ggsnamespace=6&ggslimit=4&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`
      ),
    ]);

    if (nameRes.ok) {
      const data = (await nameRes.json()) as { query?: { pages?: Record<string, never> } };
      parsePages(data.query?.pages, 'Wikimedia Mekân', `${venue.name} · Gerçek Mekân Fotoğrafı`);
    }

    if (geoRes.ok) {
      const data = (await geoRes.json()) as { query?: { pages?: Record<string, never> } };
      parsePages(data.query?.pages, 'Semt Görünümü', `${venue.district}, ${venue.city} · Çevre Görünümü`);
    }
  } catch {
    // Offline or blocked — keep instant curated dish photography
  }

  return collected.slice(0, 4);
}

/**
 * Fetches live real photography (Google Places if configured + Wikimedia venue & neighborhood geo-photos)
 * merged seamlessly with instant verified Turkish gastronomy photos.
 */
export async function resolveLiveVenueEnrichment(venue: Venue): Promise<LiveVenueEnrichment> {
  const cached = enrichmentCache.get(venue.id);
  if (cached) return cached;

  const instant = getInstantVenuePhotos(venue);
  const [googleData, wikiPhotos] = await Promise.all([
    fetchGooglePlacesEnrichment(venue),
    fetchWikimediaVenuePhotos(venue),
  ]);

  const merged: VenuePhoto[] = [];
  const seen = new Set<string>();
  const pushUnique = (list: VenuePhoto[]) => {
    for (const p of list) {
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      merged.push(p);
    }
  };

  if (googleData?.photos.length) pushUnique(googleData.photos);
  // Put real exact-venue Wikimedia photos first, then culinary photos, then nearby street view
  const exactVenueWiki = wikiPhotos.filter((p) => p.source === 'Wikimedia Mekân');
  const nearbyWiki = wikiPhotos.filter((p) => p.source === 'Semt Görünümü');

  pushUnique(exactVenueWiki);
  pushUnique(instant);
  pushUnique(nearbyWiki);

  const result: LiveVenueEnrichment = {
    photos: merged.slice(0, 8),
    googleRating: googleData?.googleRating,
    googleReviewCount: googleData?.googleReviewCount,
    googleOpeningHours: googleData?.googleOpeningHours,
  };

  enrichmentCache.set(venue.id, result);
  return result;
}
