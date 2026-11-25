import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Bookmark,
  BookmarkPlus,
  Trophy,
  Compass,
  Users,
  ArrowLeftRight,
  Share2,
  Check,
  ImageDown,
  Cloud,
  ShieldCheck,
  Search,
  Trash2,
  Map as MapIcon,
  List,
  Globe2,
  Star,
  LocateFixed,
  Sparkles,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type {
  CityName,
  FriendProfile,
  VenueCity,
  SentimentTier,
  SharedListPayload,
  TadimState,
  Venue,
  VenueCategory,
} from './types';
import {
  CITY_CENTERS,
  CITY_TABS,
  FEATURED_CITY_COUNT,
  INITIAL_VENUES,
  VENUE_CATEGORIES,
  VENUE_CITIES,
} from './data/venues';
import { insertRankedVenue, recalculateScores, scoreColor } from './utils/elo';
import { buildShareableListUrl, parseSharedListInput, readSharedListFromHash } from './utils/shareLink';
import { downloadTopTenStoryPng } from './utils/storyCard';
import { fetchLiveOsmVenuesInBounds, type MapBoundsBox } from './utils/overpass';
import { searchLiveTurkeyRestaurants } from './utils/geocoder';
import { fetchQuickGoogleMapsThumb, getCachedVenueThumb, wakePythonBackend } from './utils/pythonGmapsClient';
import { calculateInAppRoute, type ActiveRouteData } from './utils/routingAndGeo';
import {
  adminDeleteVenueInCloud,
  adminUpdateVenueInCloud,
  deleteAllCloudUserData,
  fetchFollowingFeed,
  fetchFollowingProfiles,
  getCurrentUser,
  getIsAdmin,
  isSupabaseConfigured,
  type FeedActivityItem,
} from './lib/supabase';
import { TurkeyMap3D } from './components/TurkeyMap3D';
import { VenueDetailDrawer } from './components/VenueDetailDrawer';
import { CompareModal } from './components/CompareModal';
import { ReelsCatcherModal } from './components/ReelsCatcherModal';
import { FriendsTab } from './components/FriendsTab';
import { AuthSyncModal } from './components/AuthSyncModal';
import { LegalPrivacyModal } from './components/LegalPrivacyModal';
import { QuickTasteDeckModal } from './components/QuickTasteDeckModal';

const STORAGE_KEY = 'tadimrotasi_state_v5';
const SEED_IDS = new Set(INITIAL_VENUES.map((v) => v.id));

function createDefaultState(): TadimState {
  return {
    venues: INITIAL_VENUES,
    ranked: [],
    wantToGoIds: [],
  };
}

function loadState(): TadimState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as TadimState;
    const customVenues = (parsed.venues ?? []).filter((v) => !SEED_IDS.has(v.id));
    return {
      ranked: parsed.ranked ?? [],
      wantToGoIds: parsed.wantToGoIds ?? [],
      venues: [...customVenues, ...INITIAL_VENUES],
    };
  } catch {
    return createDefaultState();
  }
}

type RailTab = 'discover' | 'ranked' | 'want' | 'friends';

function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function VenueThumb({ venue, size = 'md', liveThumb }: { venue: Venue; size?: 'md' | 'sm'; liveThumb?: string }) {
  const realUrl = venue.googlePhotos?.[0] || liveThumb || getCachedVenueThumb(venue) || '';
  const sizeCls = size === 'sm' ? 'w-11 h-11' : 'w-14 h-14';

  if (!realUrl) {
    return (
      <div
        className={`${sizeCls} rounded-xl shrink-0 bg-gradient-to-br from-[#EAF4F4] to-[#D9ECEB] border border-[#DCE5E7] flex flex-col items-center justify-center text-[#0B4A4F] select-none`}
        title={venue.category}
      >
        <span className="text-xs font-extrabold leading-none">
          {venue.category.slice(0, 2).toLocaleUpperCase('tr-TR')}
        </span>
      </div>
    );
  }
  return (
    <img
      src={realUrl}
      alt={venue.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${sizeCls} rounded-xl object-cover shrink-0 bg-[#E5ECEC] ring-1 ring-black/5`}
    />
  );
}

export default function App() {
  const [state, setState] = useState<TadimState>(() => loadState());
  const [activeCity, setActiveCity] = useState<CityName>(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('sehir')?.trim();
      if (param) {
        const match = CITY_TABS.find(
          (c) => c.toLocaleLowerCase('tr-TR') === param.toLocaleLowerCase('tr-TR')
        );
        if (match) return match;
      }
    } catch {
      // Ignore URL parsing errors
    }
    return 'İstanbul';
  });
  const [activeCategory, setActiveCategory] = useState<VenueCategory | 'Tümü'>('Tümü');
  const [quickPick, setQuickPick] = useState<'all' | 'topRated' | 'established' | 'visualReviews'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [liveSearching, setLiveSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<RailTab>('discover');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('map');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [rankingVenue, setRankingVenue] = useState<Venue | null>(null);
  const [catcherOpen, setCatcherOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenVenueIds, setHiddenVenueIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('tadim_hidden_venues_v1');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const utm_source = sp.get('utm_source');
      const utm_campaign = sp.get('utm_campaign');
      const utm_medium = sp.get('utm_medium');
      if (utm_source || utm_campaign || utm_medium) {
        localStorage.setItem(
          'tadim_utm_attribution_v1',
          JSON.stringify({
            utm_source,
            utm_campaign,
            utm_medium,
            landedAt: new Date().toISOString(),
          })
        );
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tadim_hidden_venues_v1', JSON.stringify(hiddenVenueIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [hiddenVenueIds]);
  const [copiedShare, setCopiedShare] = useState(false);
  const [loadingLiveOsm, setLoadingLiveOsm] = useState(false);
  const [liveOsmMsg, setLiveOsmMsg] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRouteData | null>(null);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [liveThumbs, setLiveThumbs] = useState<Record<string, string>>({});
  const [sharedImport, setSharedImport] = useState<SharedListPayload | null>(() =>
    readSharedListFromHash()
  );
  const [customFriends, setCustomFriends] = useState<FriendProfile[]>(() => {
    try {
      const raw = localStorage.getItem('tadim_custom_friends_v1');
      return raw ? (JSON.parse(raw) as FriendProfile[]) : [];
    } catch {
      return [];
    }
  });
  const [cloudFriends, setCloudFriends] = useState<FriendProfile[]>([]);
  const [cloudFeed, setCloudFeed] = useState<FeedActivityItem[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('tadim_custom_friends_v1', JSON.stringify(customFriends));
    } catch {
      // Ignore storage quota errors
    }
  }, [customFriends]);

  const refreshCloudFriends = useCallback(async () => {
    if (!cloudUser || !isSupabaseConfigured) {
      setCloudFriends([]);
      setCloudFeed([]);
      return;
    }
    try {
      const [list, feed] = await Promise.all([
        fetchFollowingProfiles(cloudUser.id),
        fetchFollowingFeed(cloudUser.id),
      ]);
      setCloudFriends(list);
      setCloudFeed(feed);
    } catch {
      // Ignore offline
    }
  }, [cloudUser]);

  useEffect(() => {
    void refreshCloudFriends();
    if (cloudUser && isSupabaseConfigured) {
      void getIsAdmin(cloudUser.id).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [refreshCloudFriends, cloudUser]);

  const allFriends = useMemo(() => {
    const seen = new Set<string>();
    const merged: FriendProfile[] = [];
    for (const f of [...cloudFriends, ...customFriends]) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      merged.push(f);
    }
    return merged;
  }, [cloudFriends, customFriends]);

  // Persist only user rankings, wantToGoIds, and custom user-added venues so 3,545 seed venues don't bloat localStorage
  useEffect(() => {
    try {
      const customVenues = state.venues.filter((v) => !SEED_IDS.has(v.id)).slice(0, 150);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ranked: state.ranked,
          wantToGoIds: state.wantToGoIds,
          venues: customVenues,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    wakePythonBackend();
  }, []);

  const [listLimit, setListLimit] = useState(200);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyKm, setNearbyKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      void getCurrentUser().then((u) => setCloudUser(u));
    }
  }, []);

  const venueMap = useMemo(() => new Map(state.venues.map((v) => [v.id, v])), [state.venues]);
  const rankMap = useMemo(() => new Map(state.ranked.map((r) => [r.venueId, r])), [state.ranked]);
  const wantSet = useMemo(() => new Set(state.wantToGoIds), [state.wantToGoIds]);
  const hiddenSet = useMemo(() => new Set(hiddenVenueIds), [hiddenVenueIds]);

  const matchesFilters = useCallback(
    (v: Venue) => {
      if (hiddenSet.has(v.id)) return false;
      const cityOk = activeCity === 'Tüm Türkiye' || v.city === activeCity;
      const catOk = activeCategory === 'Tümü' || v.category === activeCategory;
      const quickOk =
        quickPick === 'all' ||
        (quickPick === 'topRated' && (v.googleRating ?? 0) >= 4.5) ||
        (quickPick === 'established' && ((v.googleReviewCount ?? 0) >= 75 || Boolean(v.googlePhotos?.length))) ||
        (quickPick === 'visualReviews' && Boolean(v.googleReviews?.length || v.googlePhotos?.length));
      const q = searchTerm.trim().toLocaleLowerCase('tr-TR');
      const searchOk =
        !q ||
        v.name.toLocaleLowerCase('tr-TR').includes(q) ||
        v.district.toLocaleLowerCase('tr-TR').includes(q) ||
        v.city.toLocaleLowerCase('tr-TR').includes(q) ||
        v.signatureDish.toLocaleLowerCase('tr-TR').includes(q);
      const nearOk = !userLoc || !nearbyKm || distKm(userLoc.lat, userLoc.lng, v.lat, v.lng) <= nearbyKm;
      return (nearbyKm ? true : cityOk) && catOk && quickOk && searchOk && nearOk;
    },
    [activeCity, activeCategory, quickPick, searchTerm, userLoc, nearbyKm]
  );

  const visibleVenues = useMemo(() => {
    const list = state.venues.filter(matchesFilters);
    if (userLoc && nearbyKm) {
      list.sort(
        (a, b) => distKm(userLoc.lat, userLoc.lng, a.lat, a.lng) - distKm(userLoc.lat, userLoc.lng, b.lat, b.lng)
      );
    }
    return list;
  }, [state.venues, matchesFilters, userLoc, nearbyKm]);

  // Staggered background thumbnail prefetcher (2 concurrent, 350ms pause)
  useEffect(() => {
    const queue = visibleVenues
      .slice(0, 20)
      .filter((v) => !v.googlePhotos?.[0] && !liveThumbs[v.id] && !getCachedVenueThumb(v));
    if (queue.length === 0) return;

    let cancelled = false;
    let idx = 0;

    const runWorker = async () => {
      while (!cancelled) {
        const nextIdx = idx++;
        if (nextIdx >= queue.length) break;
        const v = queue[nextIdx];
        const thumbUrl = await fetchQuickGoogleMapsThumb(v);
        if (!cancelled && thumbUrl) {
          setLiveThumbs((prev) => (prev[v.id] === thumbUrl ? prev : { ...prev, [v.id]: thumbUrl }));
        }
        await new Promise((r) => setTimeout(r, 350));
      }
    };

    void runWorker();
    void runWorker();

    return () => {
      cancelled = true;
    };
  }, [visibleVenues, liveThumbs]);

  const filteredRanked = useMemo(() => {
    return [...state.ranked]
      .sort((a, b) => a.rankIndex - b.rankIndex)
      .filter((r) => {
        const v = venueMap.get(r.venueId);
        return v ? matchesFilters(v) : false;
      });
  }, [state.ranked, venueMap, matchesFilters]);

  const filteredWant = useMemo(() => {
    return state.wantToGoIds
      .map((id) => venueMap.get(id))
      .filter((v): v is Venue => Boolean(v))
      .filter(matchesFilters);
  }, [state.wantToGoIds, venueMap, matchesFilters]);

  const selectedVenue = selectedVenueId ? venueMap.get(selectedVenueId) ?? null : null;

  // Personal recommendations: taste profile (your rankings) + matched friends + craving (search) + distance
  const recommendations = useMemo(() => {
    if (!userLoc) return [];
    const catScore = new Map<string, { sum: number; n: number }>();
    for (const r of state.ranked) {
      const v = venueMap.get(r.venueId);
      if (!v) continue;
      const c = catScore.get(v.category) ?? { sum: 0, n: 0 };
      c.sum += r.score;
      c.n += 1;
      catScore.set(v.category, c);
    }
    const friendScores = new Map<string, { name: string; score: number }>();
    for (const f of allFriends) {
      for (const r of f.ratings) {
        const prev = friendScores.get(r.venueId);
        if (!prev || r.score > prev.score) friendScores.set(r.venueId, { name: f.name.split(' ')[0], score: r.score });
      }
    }
    const craving = searchTerm.trim().toLocaleLowerCase('tr-TR');
    const radius = nearbyKm ?? 3;
    return state.venues
      .filter((v) => !rankMap.has(v.id) && !hiddenSet.has(v.id))
      .map((v) => {
        const d = distKm(userLoc.lat, userLoc.lng, v.lat, v.lng);
        if (d > radius) return null;
        const reasons: string[] = [fmtDist(d)];
        let score = 3 - d; // closer is better
        const cs = catScore.get(v.category);
        if (cs) {
          score += (cs.sum / cs.n - 5) * 0.6;
          if (cs.sum / cs.n >= 7) reasons.push(`Sevdiğin tür: ${v.category}`);
        }
        const fr = friendScores.get(v.id);
        if (fr) {
          score += (fr.score - 6) * 0.8;
          reasons.push(`${fr.name} ${fr.score.toFixed(1)} verdi`);
        }
        if (v.googleRating) score += (v.googleRating - 4) * 1.5;
        if (craving.length >= 2) {
          const hay = `${v.name} ${v.signatureDish} ${v.category} ${(v.cuisineTags ?? []).join(' ')}`.toLocaleLowerCase('tr-TR');
          if (hay.includes(craving)) {
            score += 4;
            reasons.push(`“${searchTerm.trim()}” arıyorsun`);
          } else {
            score -= 2;
          }
        }
        if (wantSet.has(v.id)) {
          score += 1.5;
          reasons.push('Gideceklerinde');
        }
        return { venue: v, score, reasons };
      })
      .filter((x): x is { venue: Venue; score: number; reasons: string[] } => Boolean(x))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [userLoc, nearbyKm, state.ranked, state.venues, venueMap, rankMap, hiddenSet, allFriends, searchTerm, wantSet]);

  const handleSelectVenue = useCallback((id: string | null) => {
    setSelectedVenueId(id);
    if (id) {
      // On mobile, show the rich photo detail sheet right away
      setMobileView('list');
    }
  }, []);

  const handleFinishRank = (
    venueId: string,
    tier: SentimentTier,
    insertIndexInTier: number,
    personalNote: string
  ) => {
    setState((prev) => ({
      ...prev,
      ranked: insertRankedVenue(
        prev.ranked,
        {
          venueId,
          tier,
          visitedAt: new Date().toISOString().slice(0, 10),
          personalNote,
        },
        insertIndexInTier
      ),
      wantToGoIds: prev.wantToGoIds.filter((id) => id !== venueId),
    }));
    setRankingVenue(null);
    setSelectedVenueId(venueId);
  };

  const handleToggleWant = (venueId: string) => {
    setState((prev) => {
      const exists = prev.wantToGoIds.includes(venueId);
      return {
        ...prev,
        wantToGoIds: exists
          ? prev.wantToGoIds.filter((id) => id !== venueId)
          : [venueId, ...prev.wantToGoIds],
      };
    });
  };

  const handleRemoveFromLists = (venueId: string) => {
    setState((prev) => ({
      ...prev,
      ranked: recalculateScores(prev.ranked.filter((r) => r.venueId !== venueId)),
      wantToGoIds: prev.wantToGoIds.filter((id) => id !== venueId),
    }));
    if (selectedVenueId === venueId) setSelectedVenueId(null);
  };

  const handleSaveNewVenue = (venue: Venue, startRankingImmediately: boolean) => {
    setState((prev) => ({
      ...prev,
      venues: [venue, ...prev.venues],
      wantToGoIds: startRankingImmediately ? prev.wantToGoIds : [venue.id, ...prev.wantToGoIds],
    }));
    setActiveCity(venue.city);
    setSelectedVenueId(venue.id);
    if (startRankingImmediately) {
      setRankingVenue(venue);
    } else {
      setActiveTab('want');
    }
  };

  const handleFetchLiveArea = useCallback(
    async (bounds: MapBoundsBox, force = false) => {
      setLoadingLiveOsm(true);
      if (force) setLiveOsmMsg(null);
      try {
        const fresh = await fetchLiveOsmVenuesInBounds(bounds, activeCity, { force, limit: 220 });
        if (fresh.length > 0) {
          let addedCount = 0;
          setState((prev) => {
            const existingKeys = new Set(
              prev.venues.map((v) => `${v.name.toLocaleLowerCase('tr-TR')}_${v.lat.toFixed(3)}`)
            );
            const toAdd = fresh.filter(
              (v) => !existingKeys.has(`${v.name.toLocaleLowerCase('tr-TR')}_${v.lat.toFixed(3)}`)
            );
            addedCount = toAdd.length;
            if (toAdd.length === 0) return prev;
            return { ...prev, venues: [...prev.venues, ...toAdd] };
          });
          if (addedCount > 0) {
            setLiveOsmMsg(`+${addedCount} gerçek sokak restoranı haritaya eklendi`);
          } else if (force) {
            setLiveOsmMsg(`Bu bölgedeki ${fresh.length} gerçek mekân zaten haritada`);
          }
        } else if (force) {
          setLiveOsmMsg('Bu karede yeni harita kaydı bulunamadı');
        }
      } catch (err) {
        if (force) {
          setLiveOsmMsg(err instanceof Error ? err.message : 'Canlı mekânlar yüklenemedi.');
        }
      } finally {
        setLoadingLiveOsm(false);
      }
    },
    [activeCity]
  );

  const handleLocateNearby = () => {
    if (!navigator.geolocation) {
      setLiveOsmMsg('Tarayıcın konum özelliğini desteklemiyor');
      return;
    }
    if (nearbyKm) {
      setNearbyKm(null);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setNearbyKm(2);
        setActiveTab('discover');
        setSelectedVenueId(null);
        let best: VenueCity = 'İstanbul';
        let bestD = Infinity;
        for (const c of VENUE_CITIES) {
          const ctr = CITY_CENTERS[c];
          const d = distKm(loc.lat, loc.lng, ctr.lat, ctr.lng);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        setActiveCity(best);
        void handleFetchLiveArea(
          { south: loc.lat - 0.018, north: loc.lat + 0.018, west: loc.lng - 0.024, east: loc.lng + 0.024 },
          true
        );
        setLiveOsmMsg('Etrafındaki restoranlar yükleniyor...');
      },
      () => {
        setLocating(false);
        setLiveOsmMsg('Konum izni verilmedi — tarayıcı ayarlarından izin verebilirsin');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Click any point on the map -> reverse geocode that exact POI and open it
  const handlePickPoint = useCallback(
    async (lat: number, lng: number) => {
      setLiveOsmMsg('Tıklanan mekân aranıyor...');
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&namedetails=1&accept-language=tr&lat=${lat}&lon=${lng}`
        );
        const j = (await res.json()) as {
          name?: string;
          type?: string;
          category?: string;
          address?: Record<string, string>;
          lat?: string;
          lon?: string;
        };
        const addr = j.address ?? {};
        const name = (j.name || addr.amenity || addr.shop || '').trim();
        if (!name) {
          setLiveOsmMsg('Burada isimli bir mekân bulunamadı — bir etikete daha yakın tıkla');
          return;
        }
        const city = (activeCity === 'Tüm Türkiye' ? 'İstanbul' : activeCity) as Venue['city'];
        const district = addr.suburb || addr.city_district || addr.town || addr.county || city;
        const vLat = Number(j.lat ?? lat);
        const vLng = Number(j.lon ?? lng);
        const existing = state.venues.find(
          (v) => v.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR') && Math.abs(v.lat - vLat) < 0.003
        );
        if (existing) {
          handleSelectVenue(existing.id);
          setLiveOsmMsg(null);
          return;
        }
        const t = `${name} ${j.type ?? ''}`.toLocaleLowerCase('tr-TR');
        const category: VenueCategory = /cafe|kahve|coffee/.test(t)
          ? '3. Nesil Kahve'
          : /pastane|bakery|tatlı|baklava|ice_cream/.test(t)
            ? 'Tatlı & Pastane'
            : /kebap|döner|ocakbaşı/.test(t)
              ? 'Döner & Ocakbaşı'
              : /fast_food|büfe|dürüm/.test(t)
                ? 'Sokak Lezzeti'
                : /bar|pub|meyhane|balık/.test(t)
                  ? 'Meyhane & Bistro'
                  : 'Esnaf Lokantası';
        const v: Venue = {
          id: `v-pick-${vLat.toFixed(5)}-${vLng.toFixed(5)}`,
          name,
          city,
          district,
          category,
          priceTier: '₺₺',
          lat: Number(vLat.toFixed(5)),
          lng: Number(vLng.toFixed(5)),
          gpsVerified: true,
          isLiveOsm: true,
          address: [addr.road, addr.house_number, district].filter(Boolean).join(' '),
          signatureDish: `${district} · Haritadan seçildi`,
          sourcePlatform: 'OpenStreetMap',
        };
        setState((prev) => ({ ...prev, venues: [v, ...prev.venues] }));
        handleSelectVenue(v.id);
        setLiveOsmMsg(`“${name}” açıldı`);
      } catch {
        setLiveOsmMsg('Mekân bilgisi alınamadı');
      }
    },
    [activeCity, state.venues, handleSelectVenue]
  );

  // Live all-Turkey restaurant search (Nominatim) when typing any real restaurant in Turkey
  const handleLiveTurkeySearch = async () => {
    const q = searchTerm.trim();
    if (q.length < 2) return;
    setLiveSearching(true);
    try {
      const hits = await searchLiveTurkeyRestaurants(q);
      if (hits.length > 0) {
        setState((prev) => {
          const existingIds = new Set(prev.venues.map((v) => v.id));
          const toAdd = hits.filter((h) => !existingIds.has(h.id));
          return { ...prev, venues: [...toAdd, ...prev.venues] };
        });
        setActiveCity('Tüm Türkiye');
        setActiveCategory('Tümü');
        setSelectedVenueId(hits[0].id);
        setLiveOsmMsg(`"${q}" için Türkiye genelinde ${hits.length} gerçek sonuç bulundu`);
      } else {
        setLiveOsmMsg(`"${q}" için canlı harita sonucu bulunamadı`);
      }
    } finally {
      setLiveSearching(false);
    }
  };

  const handleStartRoute = async (dest: Venue, mode: 'driving' | 'walking') => {
    setRoutingBusy(true);
    try {
      const center = CITY_CENTERS[dest.city];
      // Offset default city center slightly if destination is right at center
      const fallbackOrigin = {
        lat: Math.abs(center.lat - dest.lat) < 0.002 ? center.lat - 0.014 : center.lat,
        lng: Math.abs(center.lng - dest.lng) < 0.002 ? center.lng - 0.018 : center.lng,
        label: `${dest.city} Merkez`,
      };

      const route = await calculateInAppRoute(fallbackOrigin, dest, mode);
      setActiveRoute(route);
      setMobileView('map');
    } finally {
      setRoutingBusy(false);
    }
  };

  const handleCopyShareUrl = () => {
    const shareUrl = buildShareableListUrl(
      cloudUser?.email?.split('@')[0] || 'TadımRotası',
      state.ranked,
      state.venues
    );
    void navigator.clipboard?.writeText(shareUrl);
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 2400);
  };

  const handleImportSharedList = () => {
    if (!sharedImport) return;
    setState((prev) => {
      const existingByName = new Set(prev.venues.map((v) => v.name.toLocaleLowerCase('tr-TR')));
      const addedVenues: Venue[] = [];
      const addedWantIds: string[] = [];

      sharedImport.items.forEach((item, idx) => {
        if (existingByName.has(item.name.toLocaleLowerCase('tr-TR'))) return;
        const id = `v-shared-${Date.now()}-${idx}`;
        addedVenues.push({
          id,
          name: item.name,
          city: item.city,
          district: item.district,
          category: item.category,
          priceTier: item.priceTier,
          lat: item.lat,
          lng: item.lng,
          gpsVerified: true,
          signatureDish: item.signatureDish,
          sourcePlatform: 'Arkadaş',
        });
        addedWantIds.push(id);
      });

      return {
        ...prev,
        venues: [...addedVenues, ...prev.venues],
        wantToGoIds: [...addedWantIds, ...prev.wantToGoIds],
      };
    });
    setSharedImport(null);
    window.history.replaceState(null, '', window.location.pathname);
    setActiveTab('want');
  };

  const handleAddFriendFromShare = (rawInput: string): { ok: boolean; message: string } => {
    const parsed = parseSharedListInput(rawInput);
    if (!parsed) {
      return {
        ok: false,
        message: 'Geçerli bir TadımRotası paylaşım linki veya kodu bulunamadı.',
      };
    }

    const byNameCity = new Map(
      state.venues.map((v) => [`${v.name.toLocaleLowerCase('tr-TR')}|${v.city}`, v.id])
    );
    const newVenues: Venue[] = [];
    const ratings: FriendProfile['ratings'] = [];

    parsed.items.forEach((item, idx) => {
      const key = `${item.name.toLocaleLowerCase('tr-TR')}|${item.city}`;
      let vid = byNameCity.get(key);
      if (!vid) {
        vid = `v-friend-${Date.now()}-${idx}`;
        byNameCity.set(key, vid);
        newVenues.push({
          id: vid,
          name: item.name,
          city: item.city,
          district: item.district,
          category: item.category,
          priceTier: item.priceTier,
          lat: item.lat,
          lng: item.lng,
          gpsVerified: true,
          signatureDish: item.signatureDish,
          sourcePlatform: 'Arkadaş',
        });
      }
      ratings.push({
        venueId: vid,
        score: item.score,
        note: item.signatureDish ? `İmza lezzet: ${item.signatureDish}` : 'Paylaşılan liste',
      });
    });

    if (newVenues.length > 0) {
      setState((prev) => ({
        ...prev,
        venues: [...newVenues, ...prev.venues],
      }));
    }

    const ownerName = parsed.owner || 'Arkadaş';
    const cleanHandle = ownerName.toLowerCase().replace(/[^a-z0-9_]+/g, '') || 'arkadas';
    const newFriend: FriendProfile = {
      id: `custom-${Date.now()}`,
      name: ownerName,
      handle: `@${cleanHandle}`,
      city: parsed.items[0]?.city ?? 'İstanbul',
      bio: `${parsed.createdAt} tarihli paylaşılan liste (${ratings.length} mekân)`,
      avatarBg: '#0B4A4F',
      ratings,
    };

    setCustomFriends((prev) => [newFriend, ...prev]);
    return {
      ok: true,
      message: `${ownerName} çevrene eklendi (${ratings.length} mekân). Uyum puanı otomatik hesaplandı.`,
    };
  };

  const handleRemoveCustomFriend = (friendId: string) => {
    setCustomFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

  const handleUpdateVenueDetails = useCallback(
    (venueId: string, patch: Partial<Venue>) => {
      setState((prev) => {
        let updatedVenue: Venue | null = null;
        const nextVenues = prev.venues.map((v) => {
          if (v.id !== venueId) return v;
          updatedVenue = { ...v, ...patch };
          return updatedVenue;
        });
        if (isAdmin && updatedVenue) {
          void adminUpdateVenueInCloud(updatedVenue).catch(() => { });
        }
        return { ...prev, venues: nextVenues };
      });
    },
    [isAdmin]
  );

  const handleAdminDeleteVenue = useCallback(
    (venueId: string) => {
      if (!isAdmin) return;
      setState((prev) => ({
        ...prev,
        venues: prev.venues.filter((v) => v.id !== venueId),
        ranked: prev.ranked.filter((r) => r.venueId !== venueId),
        wantToGoIds: prev.wantToGoIds.filter((id) => id !== venueId),
      }));
      setSelectedVenueId(null);
      void adminDeleteVenueInCloud(venueId).catch(() => { });
    },
    [isAdmin]
  );

  const handleHideClosedVenue = useCallback(
    (venueId: string) => {
      setHiddenVenueIds((prev) => (prev.includes(venueId) ? prev : [...prev, venueId]));
      setSelectedVenueId(null);
      if (isAdmin) {
        void adminDeleteVenueInCloud(venueId).catch(() => { });
      }
    },
    [isAdmin]
  );

  const handleQuickRate = useCallback((venue: Venue, tier: SentimentTier) => {
    setState((prev) => {
      const nextRanked = insertRankedVenue(
        prev.ranked,
        {
          venueId: venue.id,
          tier,
          visitedAt: new Date().toISOString().slice(0, 10),
          personalNote: '',
        },
        0
      );
      return {
        ...prev,
        ranked: recalculateScores(nextRanked),
        wantToGoIds: prev.wantToGoIds.filter((id) => id !== venue.id),
      };
    });
  }, []);

  const handleQuickCreateAndRate = useCallback(
    (rawName: string) => {
      const name = rawName.trim();
      if (name.length < 2) return;
      const city = activeCity === 'Tüm Türkiye' ? 'İstanbul' : activeCity;
      const center = CITY_CENTERS[city] ?? { lat: 41.0082, lng: 28.9784 };
      const newVenue: Venue = {
        id: `v-user-${Date.now()}`,
        name,
        city,
        district: city,
        category: activeCategory === 'Tümü' ? 'Esnaf Lokantası' : activeCategory,
        priceTier: '₺₺',
        lat: center.lat,
        lng: center.lng,
        gpsVerified: false,
        signatureDish: `${city} · Kullanıcı kaydı`,
        sourcePlatform: 'Manuel',
      };
      setState((prev) => ({
        ...prev,
        venues: [newVenue, ...prev.venues],
      }));
      setSelectedVenueId(newVenue.id);
      setRankingVenue(newVenue);
    },
    [activeCity, activeCategory]
  );

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tadimrotasi-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllData = async () => {
    try {
      await deleteAllCloudUserData();
    } catch {
      // Ignore offline
    }
    localStorage.removeItem(STORAGE_KEY);
    setCloudUser(null);
    setState({ venues: INITIAL_VENUES, ranked: [], wantToGoIds: [] });
    setSelectedVenueId(null);
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white">
      {/* Committed Deep Bosphorus Teal Top Bar */}
      <header className="h-14 shrink-0 bg-gradient-to-r from-[#0B4A4F] via-[#0E5A60] to-[#0B4A4F] shadow-md relative z-10 text-white px-3 sm:px-4 flex items-center justify-between gap-3 border-b border-[#08393D]">
        <div className="flex items-center gap-2.5 shrink-0">
          <img src={`${import.meta.env.BASE_URL}store-assets/tadimrotasi_icon.png`} alt="TadımRotası" className="w-7 h-7 rounded-md object-cover" />
          <span className="text-base font-extrabold tracking-tight">TadımRotası</span>
          <span className="hidden xl:inline-block rounded bg-white/12 px-2 py-0.5 text-[11px] font-bold text-[#D1ECEA] tabular-nums">
            {state.venues.length.toLocaleString('tr-TR')} mekân
          </span>
        </div>

        {/* Inline Global + All-Turkey Live Restaurant Search */}
        <div className="relative flex-1 max-w-lg hidden md:flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/65 absolute left-3 top-2.5" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim().length >= 2) {
                  e.preventDefault();
                  void handleLiveTurkeySearch();
                }
              }}
              placeholder="Herhangi bir restoran, semt veya yemek ara (Enter: Tüm Türkiye)..."
              className="w-full rounded-lg bg-white/12 border border-white/15 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/65 focus:bg-white focus:text-[#111827] focus:placeholder:text-[#6B7280] focus:outline-none transition-colors"
            />
          </div>
          {searchTerm.trim().length >= 2 && (
            <button
              type="button"
              disabled={liveSearching}
              onClick={() => void handleLiveTurkeySearch()}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#059669] hover:bg-[#047857] px-2.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5" />
              {liveSearching ? 'Aranıyor...' : 'Canlı Ara'}
            </button>
          )}
        </div>

        {/* Utility Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => downloadTopTenStoryPng(state.ranked, state.venues)}
            className="hidden lg:inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/18 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            title="1080x1350 Instagram Story kartı indir"
          >
            <ImageDown className="w-3.5 h-3.5" />
            Story
          </button>

          <button
            type="button"
            onClick={handleCopyShareUrl}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/18 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-[#6EE7B7]" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedShare ? 'Kopyalandı' : 'Paylaş'}
          </button>

          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/18 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            title="Supabase bulut senkronizasyonu"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{cloudUser ? 'Bağlı' : 'Bulut'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCatcherOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-white text-[#0B4A4F] hover:bg-[#EAF4F4] px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Mekân Ekle
          </button>
        </div>
      </header>

      {/* Shared List Import Strip */}
      {sharedImport && (
        <div className="shrink-0 bg-[#111827] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            <strong>{sharedImport.owner}</strong> seninle {sharedImport.items.length} mekânlık liste paylaştı.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImportSharedList}
              className="rounded-md bg-[#059669] px-2.5 py-1 font-bold text-white cursor-pointer"
            >
              Gideceklerime Aktar
            </button>
            <button
              type="button"
              onClick={() => {
                setSharedImport(null);
                window.history.replaceState(null, '', window.location.pathname);
              }}
              className="text-white/75 hover:text-white cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Compact Filter Bar (12 Cities + Categories) */}
      <div className="shrink-0 bg-white/95 backdrop-blur border-b border-[#E4E8EB] px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full" role="group" aria-label="Şehir seç">
          <button
            type="button"
            onClick={handleLocateNearby}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${nearbyKm
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]'
              }`}
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-pulse' : ''}`} />
            {locating ? 'Konum alınıyor…' : nearbyKm ? 'Yakınımda ✓' : 'Yakınımda'}
          </button>
          {nearbyKm && (
            <select
              value={nearbyKm}
              onChange={(e) => setNearbyKm(Number(e.target.value))}
              className="shrink-0 rounded-full border border-[#BFDBFE] bg-white px-2 py-1 text-xs font-semibold text-[#1D4ED8]"
            >
              {[0.5, 1, 2, 5, 10].map((km) => (
                <option key={km} value={km}>{km < 1 ? '500 m' : `${km} km`}</option>
              ))}
            </select>
          )}
          {CITY_TABS.slice(0, FEATURED_CITY_COUNT).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setActiveCity(city);
                setSelectedVenueId(null);
                setNearbyKm(null);
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${activeCity === city
                ? 'bg-[#0B4A4F] text-white shadow-sm'
                : 'text-[#374151] hover:bg-[#EEF4F4]'
                }`}
            >
              {city}
            </button>
          ))}
          <select
            value={CITY_TABS.indexOf(activeCity) >= FEATURED_CITY_COUNT ? activeCity : ''}
            onChange={(e) => {
              if (!e.target.value) return;
              setActiveCity(e.target.value as CityName);
              setSelectedVenueId(null);
              setNearbyKm(null);
            }}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${CITY_TABS.indexOf(activeCity) >= FEATURED_CITY_COUNT
              ? 'border-[#0B4A4F] bg-[#0B4A4F] text-white'
              : 'border-[#D1D5DB] bg-white text-[#374151]'
              }`}
          >
            <option value="">+ Diğer {CITY_TABS.length - FEATURED_CITY_COUNT} il</option>
            {CITY_TABS.slice(FEATURED_CITY_COUNT).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <span className="hidden sm:inline-block h-4 w-px bg-[#D1D5DB]" />

        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          {(['Tümü', ...VENUE_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${activeCategory === cat
                ? 'border-[#0B4A4F] bg-[#EAF4F4] text-[#0B4A4F] font-semibold'
                : 'border-transparent bg-white text-[#4B5563] hover:border-[#D1D5DB]'
                }`}
            >
              {cat}
            </button>
          ))}

          <span className="h-4 w-px bg-[#D1D5DB] mx-1 shrink-0" />

          {(
            [
              { id: 'topRated', label: '★ 4.5+ Puan' },
              { id: 'established', label: '75+ Yorumlu' },
              { id: 'visualReviews', label: 'Görselli Yorumlu' },
            ] as const
          ).map((qp) => (
            <button
              key={qp.id}
              type="button"
              onClick={() => setQuickPick((prev) => (prev === qp.id ? 'all' : qp.id))}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-all cursor-pointer ${quickPick === qp.id
                ? 'border-[#D97706] bg-[#FEF3C7] text-[#92400E]'
                : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#D97706]'
                }`}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* LEFT RAIL: Either Google Maps-Style Rich Venue Detail Drawer OR High-Density Venue List */}
        <aside
          className={`${mobileView === 'list' ? 'flex' : 'hidden'
            } lg:flex flex-col w-full lg:w-[430px] xl:w-[460px] shrink-0 border-r border-[#E4E8EB] bg-white min-h-0`}
        >
          {selectedVenue ? (
            <VenueDetailDrawer
              venue={selectedVenue}
              rank={rankMap.get(selectedVenue.id)}
              isWant={wantSet.has(selectedVenue.id)}
              friends={allFriends}
              activeRoute={activeRoute}
              routingBusy={routingBusy}
              onClose={() => setSelectedVenueId(null)}
              onRankVenue={(v) => setRankingVenue(v)}
              onToggleWant={handleToggleWant}
              onStartRoute={(v, mode) => void handleStartRoute(v, mode)}
              onClearRoute={() => setActiveRoute(null)}
              onUpdateVenue={handleUpdateVenueDetails}
              isAdmin={isAdmin}
              onAdminDeleteVenue={handleAdminDeleteVenue}
              onMarkClosed={handleHideClosedVenue}
            />
          ) : (
            <>
              {/* Mobile Search Input + Live Turkey Search */}
              <div className="p-2.5 border-b border-[#E5E7EB] md:hidden flex gap-1.5">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Restoran, semt veya yemek ara..."
                  className="flex-1 rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-1.5 text-xs text-[#111827]"
                />
                {searchTerm.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => void handleLiveTurkeySearch()}
                    className="rounded-lg bg-[#0B4A4F] px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    Ara
                  </button>
                )}
              </div>

              {/* 4-Tab Rail Navigation */}
              <div className="grid grid-cols-4 border-b border-[#E4E8EB] bg-white shrink-0">
                {(
                  [
                    { id: 'discover', label: 'Keşfet', count: visibleVenues.length, icon: Compass },
                    { id: 'ranked', label: 'Sıralamam', count: filteredRanked.length, icon: Trophy },
                    { id: 'want', label: 'Kayıtlı', count: filteredWant.length, icon: Bookmark },
                    { id: 'friends', label: 'Çevre', count: allFriends.length, icon: Users },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold border-b-2 transition-colors cursor-pointer ${active
                        ? 'border-[#0B4A4F] text-[#0B4A4F] bg-[#F5FAFA]'
                        : 'border-transparent text-[#6B7280] hover:text-[#111827]'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>
                        {tab.label} <span className="tabular-nums opacity-75">({tab.count})</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Scrollable High-Density List Rows with Mini Real Thumbnails */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#EEF0F2]">
                {activeTab === 'discover' &&
                  (visibleVenues.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6B7280] space-y-3">
                      <p>Bu filtrede kayıt bulunamadı.</p>
                      {searchTerm.trim().length >= 2 && (
                        <button
                          type="button"
                          onClick={() => void handleLiveTurkeySearch()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4A4F] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          <Globe2 className="w-3.5 h-3.5" />
                          "{searchTerm}" için Tüm Türkiye’de Canlı Ara
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {recommendations.length > 0 && (
                        <div className="px-3.5 py-3 bg-gradient-to-b from-[#EFF6FF] to-white border-b border-[#DBEAFE]">
                          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#1D4ED8] mb-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            Yakınında Sana Önerilenler
                            {searchTerm.trim().length >= 2 && <span className="normal-case font-semibold">· “{searchTerm.trim()}”</span>}
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {recommendations.map(({ venue, reasons }) => (
                              <button
                                key={venue.id}
                                type="button"
                                onClick={() => setSelectedVenueId(venue.id)}
                                className="shrink-0 w-44 text-left rounded-xl border border-[#DBEAFE] bg-white p-2.5 hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <VenueThumb venue={venue} size="sm" liveThumb={liveThumbs[venue.id]} />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-[#111827] truncate">{venue.name}</div>
                                    <div className="text-[10px] text-[#64748B] truncate">{venue.category}</div>
                                  </div>
                                </div>
                                <div className="mt-1.5 text-[10px] font-semibold text-[#1D4ED8] line-clamp-2">
                                  {reasons.join(' · ')}
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="mt-1 text-[10px] text-[#64748B]">
                            Ne yemek istediğini yukarıdaki aramaya yaz (ör. “lahmacun”), öneriler ona göre değişir.
                          </div>
                        </div>
                      )}
                      {searchTerm.trim().length >= 2 && (
                        <div className="px-3.5 py-2 bg-[#F0FDFA] border-b border-[#CCFBF1] flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#134E4A] truncate">
                            Aradığın <strong>“{searchTerm.trim()}”</strong> listede yok mu?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickCreateAndRate(searchTerm)}
                            className="shrink-0 rounded-md bg-[#0B4A4F] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#083A3E] cursor-pointer"
                          >
                            + Hemen Ekle &amp; Puanla
                          </button>
                        </div>
                      )}
                      {visibleVenues.slice(0, listLimit).map((venue) => {
                        const rank = rankMap.get(venue.id);
                        const isWant = wantSet.has(venue.id);

                        return (
                          <div
                            key={venue.id}
                            className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-[#F3F8F8] transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedVenueId(venue.id)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <VenueThumb venue={venue} size="md" liveThumb={liveThumbs[venue.id]} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-[#111827] truncate">
                                    {venue.name}
                                  </span>
                                  {venue.googleRating && (
                                    <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-extrabold text-[#92400E] tabular-nums">
                                      <Star className="w-2.5 h-2.5 fill-[#D97706] text-[#D97706]" />
                                      {venue.googleRating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#6B7280] truncate mt-0.5">
                                  {userLoc && nearbyKm ? `${fmtDist(distKm(userLoc.lat, userLoc.lng, venue.lat, venue.lng))} · ` : ''}
                                  {venue.district}, {venue.city} · {venue.category} · {venue.priceTier}
                                </div>
                                <div className="text-[11px] text-[#4B5563] truncate mt-0.5">
                                  {venue.signatureDish}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {rank ? (
                                <button
                                  type="button"
                                  onClick={() => setRankingVenue(venue)}
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white tabular-nums cursor-pointer"
                                  style={{ backgroundColor: scoreColor(rank.score) }}
                                  title="Yeniden sırala"
                                >
                                  {rank.score.toFixed(1)}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleWant(venue.id)}
                                    aria-label="Gideceklerime ekle"
                                    className={`rounded-lg border p-2 cursor-pointer ${isWant
                                      ? 'border-[#0B4A4F] bg-[#0B4A4F] text-white'
                                      : 'border-[#D1D5DB] bg-white text-[#4B5563] hover:border-[#0B4A4F]'
                                      }`}
                                  >
                                    {isWant ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRankingVenue(venue)}
                                    className="rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] hover:border-[#0B4A4F] hover:text-[#0B4A4F] cursor-pointer"
                                  >
                                    Sırala
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {visibleVenues.length > listLimit && (
                        <div className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setListLimit((n) => n + 200)}
                            className="rounded-full border border-[#0B4A4F] px-4 py-1.5 text-xs font-bold text-[#0B4A4F] hover:bg-[#EAF4F4] cursor-pointer"
                          >
                            Daha Fazla Göster ({(visibleVenues.length - listLimit).toLocaleString('tr-TR')})
                          </button>
                        </div>
                      )}
                    </>
                  ))}

                {activeTab === 'ranked' &&
                  (filteredRanked.length === 0 ? (
                    <div className="p-6 text-center space-y-3">
                      <div className="text-xs text-[#6B7280]">
                        Bu şehirde henüz sıraladığın mekân yok. Gittiğin yerleri seçerek hemen kişisel listeni oluşturabilirsin.
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeckOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B4A4F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#083A3E] cursor-pointer"
                      >
                        Şehrindeki Ünlü Mekânlarla Hızlı Liste Oluştur
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="px-3.5 py-2 border-b border-[#E5E7EB] bg-[#F8FAFB] flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#64748B]">Kişisel sıralaman</span>
                        <button
                          type="button"
                          onClick={() => setDeckOpen(true)}
                          className="rounded-md bg-[#0B4A4F]/10 px-2.5 py-1 text-[11px] font-bold text-[#0B4A4F] hover:bg-[#0B4A4F]/20 cursor-pointer"
                        >
                          Hızlı Kartlar
                        </button>
                      </div>
                      {filteredRanked.map((entry, idx) => {
                        const venue = venueMap.get(entry.venueId);
                        if (!venue) return null;
                        return (
                          <div
                            key={entry.venueId}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-[#F8FAFB]"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedVenueId(venue.id)}
                              className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <span className="text-xs font-extrabold tabular-nums text-[#6B7280] w-5 shrink-0">
                                #{idx + 1}
                              </span>
                              <VenueThumb venue={venue} size="sm" liveThumb={liveThumbs[venue.id]} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-[#111827] truncate">{venue.name}</div>
                                <div className="text-xs text-[#6B7280] truncate">
                                  {venue.district}, {venue.city} · {venue.category}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white tabular-nums"
                                style={{ backgroundColor: scoreColor(entry.score) }}
                              >
                                {entry.score.toFixed(1)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRankingVenue(venue)}
                                aria-label="Yeniden sırala"
                                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#E5E7EB] cursor-pointer"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromLists(venue.id)}
                                aria-label="Listeden sil"
                                className="rounded-lg p-1.5 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ))}

                {activeTab === 'want' &&
                  (filteredWant.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6B7280]">
                      Bu şehirde kayıtlı gideceklerim mekânı yok.
                    </div>
                  ) : (
                    filteredWant.map((venue) => {
                      return (
                        <div
                          key={venue.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-[#F8FAFB]"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedVenueId(venue.id)}
                            className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <VenueThumb venue={venue} size="sm" liveThumb={liveThumbs[venue.id]} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-[#111827] truncate">{venue.name}</span>
                                {venue.sourcePlatform && (
                                  <span className="rounded bg-[#EAF4F4] px-1.5 py-0.5 text-[10px] font-bold text-[#0B4A4F]">
                                    {venue.sourcePlatform}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#6B7280] truncate">
                                {venue.district}, {venue.city} · {venue.category}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setRankingVenue(venue)}
                              className="rounded-lg bg-[#0B4A4F] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#08393D] cursor-pointer"
                            >
                              Sırala
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleWant(venue.id)}
                              aria-label="Kaldır"
                              className="rounded-lg p-1.5 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ))}

                {activeTab === 'friends' && (
                  <FriendsTab
                    friends={allFriends}
                    cloudFeed={cloudFeed}
                    venues={state.venues}
                    userRanked={state.ranked}
                    wantToGoIds={state.wantToGoIds}
                    cloudUser={cloudUser}
                    copiedShare={copiedShare}
                    onAddWantToGo={(id) => {
                      if (!wantSet.has(id)) handleToggleWant(id);
                    }}
                    onFocusVenue={(id) => {
                      const v = venueMap.get(id);
                      if (v) {
                        setActiveCity(v.city);
                        setSelectedVenueId(id);
                      }
                    }}
                    onCopyMyInviteLink={handleCopyShareUrl}
                    onAddFriendFromShare={handleAddFriendFromShare}
                    onRemoveCustomFriend={handleRemoveCustomFriend}
                    onRefreshCloudFriends={refreshCloudFriends}
                  />
                )}
              </div>

              {/* Rail Footer: KVKK & Privacy Control */}
              <div className="shrink-0 border-t border-[#E4E8EB] bg-[#F9FAFB] px-4 py-2 flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>3D Harita · Canlı OSM · Sıfır EXIF</span>
                <button
                  type="button"
                  onClick={() => setLegalOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-[#111827] hover:text-[#0B4A4F] cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                  KVKK & Yedek
                </button>
              </div>
            </>
          )}
        </aside>

        {/* RIGHT FULL-BLEED 3D APPLE-STYLE VECTOR MAP */}
        <main
          className={`${mobileView === 'map' ? 'block' : 'hidden'
            } lg:block flex-1 min-w-0 min-h-0 h-full`}
        >
          <TurkeyMap3D
            city={activeCity}
            visibleVenues={visibleVenues}
            ranked={state.ranked}
            wantToGoIds={state.wantToGoIds}
            selectedVenueId={selectedVenueId}
            activeRoute={activeRoute}
            loadingLiveOsm={loadingLiveOsm}
            liveOsmMsg={liveOsmMsg}
            onSelectVenue={handleSelectVenue}
            onRankVenue={(v) => setRankingVenue(v)}
            onToggleWant={handleToggleWant}
            onStartRoute={(v, mode) => void handleStartRoute(v, mode)}
            onClearRoute={() => setActiveRoute(null)}
            onFetchLiveArea={(bounds, force) => void handleFetchLiveArea(bounds, force)}
            onPickPoint={(lat, lng) => void handlePickPoint(lat, lng)}
            userLocation={nearbyKm ? userLoc : null}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </main>

        {/* Mobile Floating Map <-> List/Detail Switcher */}
        <button
          type="button"
          onClick={() => setMobileView((prev) => (prev === 'map' ? 'list' : 'map'))}
          className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[500] inline-flex items-center gap-2 rounded-full bg-[#0B4A4F] text-white px-5 py-2.5 text-xs font-bold shadow-xl cursor-pointer"
        >
          {mobileView === 'map' ? (
            <>
              <List className="w-4 h-4" /> Listeyi Gör ({visibleVenues.length})
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4" /> Tadım 3D Harita
            </>
          )}
        </button>
      </div>

      <CompareModal
        venue={rankingVenue}
        allVenues={state.venues}
        ranked={state.ranked}
        onClose={() => setRankingVenue(null)}
        onFinishRank={handleFinishRank}
      />

      <ReelsCatcherModal
        open={catcherOpen}
        defaultCity={activeCity}
        onClose={() => setCatcherOpen(false)}
        onSaveVenue={handleSaveNewVenue}
      />

      <QuickTasteDeckModal
        open={deckOpen}
        initialCity={activeCity}
        venues={state.venues}
        alreadyRankedIds={new Set(state.ranked.map((r) => r.venueId))}
        onClose={() => setDeckOpen(false)}
        onRateVenue={handleQuickRate}
        onWantVenue={(id) => {
          if (!wantSet.has(id)) handleToggleWant(id);
        }}
      />

      <AuthSyncModal
        open={authOpen}
        user={cloudUser}
        isAdmin={isAdmin}
        state={state}
        onClose={() => setAuthOpen(false)}
        onUserChange={setCloudUser}
        onApplyCloudState={(partial) =>
          setState((prev) => ({
            venues: partial.venues ?? prev.venues,
            ranked: partial.ranked ?? prev.ranked,
            wantToGoIds: partial.wantToGoIds ?? prev.wantToGoIds,
          }))
        }
      />

      <LegalPrivacyModal
        open={legalOpen}
        state={state}
        onClose={() => setLegalOpen(false)}
        onExportJson={handleExportJson}
        onImportJson={(imported) => setState(imported)}
        onDeleteAllData={handleDeleteAllData}
      />
    </div>
  );
}
