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
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type {
  CityName,
  FriendProfile,
  SentimentTier,
  SharedListPayload,
  TadimState,
  Venue,
  VenueCategory,
} from './types';
import {
  CITY_CENTERS,
  CITY_TABS,
  FRIENDS,
  INITIAL_RANKED,
  INITIAL_VENUES,
  INITIAL_WANT_TO_GO,
  VENUE_CATEGORIES,
} from './data/venues';
import { insertRankedVenue, recalculateScores, scoreColor } from './utils/elo';
import { buildShareableListUrl, parseSharedListInput, readSharedListFromHash } from './utils/shareLink';
import { downloadTopTenStoryPng } from './utils/storyCard';
import { fetchLiveOsmVenuesInBounds, type MapBoundsBox } from './utils/overpass';
import { searchLiveTurkeyRestaurants } from './utils/geocoder';
import { fetchQuickGoogleMapsThumb, getCachedVenueThumb } from './utils/pythonGmapsClient';
import { calculateInAppRoute, type ActiveRouteData } from './utils/routingAndGeo';
import {
  adminDeleteVenueInCloud,
  adminUpdateVenueInCloud,
  deleteAllCloudUserData,
  fetchFollowingProfiles,
  getCurrentUser,
  getIsAdmin,
  isSupabaseConfigured,
} from './lib/supabase';
import { TurkeyMap3D } from './components/TurkeyMap3D';
import { VenueDetailDrawer } from './components/VenueDetailDrawer';
import { CompareModal } from './components/CompareModal';
import { ReelsCatcherModal } from './components/ReelsCatcherModal';
import { FriendsTab } from './components/FriendsTab';
import { AuthSyncModal } from './components/AuthSyncModal';
import { LegalPrivacyModal } from './components/LegalPrivacyModal';

const STORAGE_KEY = 'tadimrotasi_state_v5';
const SEED_IDS = new Set(INITIAL_VENUES.map((v) => v.id));

function createDefaultState(): TadimState {
  return {
    venues: INITIAL_VENUES,
    ranked: INITIAL_RANKED,
    wantToGoIds: INITIAL_WANT_TO_GO,
  };
}

function loadState(): TadimState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as TadimState;
    const customVenues = (parsed.venues ?? []).filter((v) => !SEED_IDS.has(v.id));
    return {
      ranked: parsed.ranked ?? INITIAL_RANKED,
      wantToGoIds: parsed.wantToGoIds ?? INITIAL_WANT_TO_GO,
      venues: [...customVenues, ...INITIAL_VENUES],
    };
  } catch {
    return createDefaultState();
  }
}

type RailTab = 'discover' | 'ranked' | 'want' | 'friends';

function VenueThumb({ venue, size = 'md', liveThumb }: { venue: Venue; size?: 'md' | 'sm'; liveThumb?: string }) {
  const realUrl = venue.googlePhotos?.[0] || liveThumb || getCachedVenueThumb(venue) || '';
  const sizeCls = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';

  if (!realUrl) {
    return (
      <div
        className={`${sizeCls} rounded-lg shrink-0 bg-[#EEF3F4] border border-[#DCE5E7] flex flex-col items-center justify-center text-[#0B4A4F] select-none`}
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
      className={`${sizeCls} rounded-lg object-cover shrink-0 bg-[#E5ECEC]`}
    />
  );
}

export default function App() {
  const [state, setState] = useState<TadimState>(() => loadState());
  const [activeCity, setActiveCity] = useState<CityName>('İstanbul');
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
      return;
    }
    try {
      const list = await fetchFollowingProfiles(cloudUser.id);
      setCloudFriends(list);
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
    for (const f of [...cloudFriends, ...customFriends, ...FRIENDS]) {
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
      return cityOk && catOk && quickOk && searchOk;
    },
    [activeCity, activeCategory, quickPick, searchTerm]
  );

  const visibleVenues = useMemo(
    () => state.venues.filter(matchesFilters),
    [state.venues, matchesFilters]
  );

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
          void adminUpdateVenueInCloud(updatedVenue).catch(() => {});
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
      void adminDeleteVenueInCloud(venueId).catch(() => {});
    },
    [isAdmin]
  );

  const handleHideClosedVenue = useCallback(
    (venueId: string) => {
      setHiddenVenueIds((prev) => (prev.includes(venueId) ? prev : [...prev, venueId]));
      setSelectedVenueId(null);
      if (isAdmin) {
        void adminDeleteVenueInCloud(venueId).catch(() => {});
      }
    },
    [isAdmin]
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
      <header className="h-14 shrink-0 bg-[#0B4A4F] text-white px-3 sm:px-4 flex items-center justify-between gap-3 border-b border-[#08393D]">
        <div className="flex items-center gap-2.5 shrink-0">
          <img src="/favicon.svg" alt="" className="w-7 h-7 rounded-md" />
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
      <div className="shrink-0 bg-[#F5F7F8] border-b border-[#E4E8EB] px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full" role="group" aria-label="Şehir seç">
          {CITY_TABS.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setActiveCity(city);
                setSelectedVenueId(null);
              }}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeCity === city
                  ? 'bg-[#0B4A4F] text-white'
                  : 'text-[#374151] hover:bg-[#E5ECEC]'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <span className="hidden sm:inline-block h-4 w-px bg-[#D1D5DB]" />

        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          {(['Tümü', ...VENUE_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === cat
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
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                quickPick === qp.id
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
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
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
                      className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold border-b-2 transition-colors cursor-pointer ${
                        active
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
                    visibleVenues.slice(0, 200).map((venue) => {
                      const rank = rankMap.get(venue.id);
                      const isWant = wantSet.has(venue.id);

                      return (
                        <div
                          key={venue.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-[#F8FAFB] transition-colors"
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
                                  className={`rounded-lg border p-2 cursor-pointer ${
                                    isWant
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
                    })
                  ))}

                {activeTab === 'ranked' &&
                  (filteredRanked.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6B7280]">
                      Bu şehirde henüz sıraladığın mekân yok. Keşfet sekmesinden veya 3D haritadan bir mekâna tıkla.
                    </div>
                  ) : (
                    filteredRanked.map((entry, idx) => {
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
                    })
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
          className={`${
            mobileView === 'map' ? 'block' : 'hidden'
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
              <MapIcon className="w-4 h-4" /> 3D Haritayı Gör
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
