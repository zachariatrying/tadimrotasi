import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BookmarkPlus,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Images,
  MapPin,
  Navigation,
  Phone,
  Star,
  Trees,
  X,
  ChevronLeft,
  ChevronRight,
  Route,
  Footprints,
  Car,
  Sun,
  Map as MapIcon,
  Satellite,
  Mountain,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import type { FriendProfile, GoogleVisualReview, RankedVenue, Venue, VenuePhoto } from '../types';
import { scoreColor } from '../utils/elo';
import { resolveLiveVenueEnrichment } from '../utils/venuePhotos';
import type { ActiveRouteData } from '../utils/routingAndGeo';
import { fetchTerraceWeather, type TerraceWeatherInfo } from '../utils/terraceWeather';
import {
  inspectVenueViaPythonGmaps,
  type PythonGmapsInspection,
} from '../utils/pythonGmapsClient';

interface VenueDetailDrawerProps {
  venue: Venue;
  rank?: RankedVenue;
  isWant: boolean;
  friends: FriendProfile[];
  activeRoute: ActiveRouteData | null;
  routingBusy: boolean;
  onClose: () => void;
  onRankVenue: (venue: Venue) => void;
  onToggleWant: (venueId: string) => void;
  onStartRoute: (venue: Venue, mode: 'driving' | 'walking') => void;
  onClearRoute: () => void;
  onUpdateVenue?: (venueId: string, patch: Partial<Venue>) => void;
  isAdmin?: boolean;
  onAdminDeleteVenue?: (venueId: string) => void;
  onMarkClosed?: (venueId: string) => void;
}

export function VenueDetailDrawer({
  venue,
  rank,
  isWant,
  friends,
  activeRoute,
  routingBusy,
  onClose,
  onRankVenue,
  onToggleWant,
  onStartRoute,
  onClearRoute,
  onUpdateVenue,
  isAdmin,
  onAdminDeleteVenue,
  onMarkClosed,
}: VenueDetailDrawerProps) {
  const toGooglePhotos = (v: Venue): VenuePhoto[] =>
    (v.googlePhotos ?? []).map((url, idx) => ({
      url,
      caption: `${v.name} · Google Haritalar #${idx + 1}`,
      source: 'Google Fotoğrafı',
      attribution: 'Google Haritalar',
    }));

  const [photos, setPhotos] = useState<VenuePhoto[]>(() => toGooglePhotos(venue));
  const [reviews, setReviews] = useState<GoogleVisualReview[]>(() => venue.googleReviews ?? []);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [googleRating, setGoogleRating] = useState<number | undefined>(venue.googleRating);
  const [googleReviewCount, setGoogleReviewCount] = useState<number | undefined>(
    venue.googleReviewCount
  );
  const [liveHours, setLiveHours] = useState<string | undefined>(venue.openingHours);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [terraceWeather, setTerraceWeather] = useState<TerraceWeatherInfo | null>(null);
  const [heroTab, setHeroTab] = useState<'photos' | 'gmap' | 'sat'>('photos');
  const [pyGmaps, setPyGmaps] = useState<PythonGmapsInspection | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState(venue.name);
  const [editDistrict, setEditDistrict] = useState(venue.district);
  const [editLat, setEditLat] = useState(String(venue.lat));
  const [editLng, setEditLng] = useState(String(venue.lng));
  const [mismatchHint, setMismatchHint] = useState<{
    name?: string;
    lat?: number;
    lng?: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setPhotos(toGooglePhotos(venue));
    setReviews(venue.googleReviews ?? []);
    setGoogleRating(venue.googleRating);
    setGoogleReviewCount(venue.googleReviewCount);
    setLiveHours(venue.openingHours);
    setLoadingPhotos(true);
    setLightboxIdx(null);
    setTerraceWeather(null);
    setEditingDetails(false);
    setEditName(venue.name);
    setEditDistrict(venue.district);
    setEditLat(String(venue.lat));
    setEditLng(String(venue.lng));
    setMismatchHint(null);
    setPyGmaps(null);

    void fetchTerraceWeather(venue.lat, venue.lng).then((w) => {
      if (active) setTerraceWeather(w);
    });

    void inspectVenueViaPythonGmaps(venue).then((info) => {
      if (!active) return;
      setPyGmaps(info);
      if (info.google_place?.rating) setGoogleRating(info.google_place.rating);
      if (info.google_place?.user_ratings_total) {
        setGoogleReviewCount(info.google_place.user_ratings_total);
      }
      if (info.live_reviews && info.live_reviews.length > 0) {
        setReviews((prev) => (prev.length >= info.live_reviews!.length ? prev : info.live_reviews!));
      }
      if (info.live_photos && info.live_photos.length > 0) {
        if (!venue.googlePhotos?.length && onUpdateVenue) {
          onUpdateVenue(venue.id, { googlePhotos: info.live_photos });
        }
        const livePhotoObjs: VenuePhoto[] = info.live_photos.map((url, idx) => ({
          url,
          caption: `${venue.name} · Google Haritalar Görselli Yorum #${idx + 1}`,
          source: idx === 0 ? 'Google Fotoğrafı' : 'Görselli Yorum',
          attribution: 'Google Haritalar',
        }));
        setPhotos((prev) => {
          const seen = new Set<string>();
          const combined: VenuePhoto[] = [];
          for (const p of [...livePhotoObjs, ...prev]) {
            if (seen.has(p.url)) continue;
            seen.add(p.url);
            combined.push(p);
          }
          return combined.slice(0, 16);
        });
      }
      setLoadingPhotos(false);

      const latOk =
        typeof info.live_lat === 'number' &&
        info.live_lat >= 35.5 &&
        info.live_lat <= 42.5 &&
        typeof info.live_lng === 'number' &&
        info.live_lng >= 25.5 &&
        info.live_lng <= 45.0;
      const coordDiff =
        latOk &&
        (Math.abs((info.live_lat ?? venue.lat) - venue.lat) > 0.0008 ||
          Math.abs((info.live_lng ?? venue.lng) - venue.lng) > 0.0008);
      const suggestedName = info.google_place?.name?.trim();
      const nameDiff =
        Boolean(suggestedName) &&
        suggestedName!.toLocaleLowerCase('tr-TR') !== venue.name.toLocaleLowerCase('tr-TR');

      if (coordDiff || nameDiff) {
        setMismatchHint({
          name: nameDiff ? suggestedName : undefined,
          lat: coordDiff ? (info.live_lat ?? undefined) : undefined,
          lng: coordDiff ? (info.live_lng ?? undefined) : undefined,
        });
      }
    });

    void resolveLiveVenueEnrichment(venue).then((enriched) => {
      if (!active) return;
      const nonStockPhotos = enriched.photos.filter(
        (p) => !p.url.includes('wikimedia.org')
      );
      if (nonStockPhotos.length > 0) {
        setPhotos((prev) => (prev.length > 0 ? prev : nonStockPhotos));
      }
      if (enriched.googleRating) setGoogleRating(enriched.googleRating);
      if (enriched.googleReviewCount) setGoogleReviewCount(enriched.googleReviewCount);
      if (enriched.googleOpeningHours && !venue.openingHours) {
        setLiveHours(enriched.googleOpeningHours);
      }
      setLoadingPhotos(false);
    });

    return () => {
      active = false;
    };
  }, [venue]);

  // Keyboard navigation for Fullscreen Photo Lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft')
        setLightboxIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, photos.length]);

  const friendNotes = friends
    .map((f) => {
      const r = f.ratings.find((item) => item.venueId === venue.id);
      return r ? { friend: f, rating: r } : null;
    })
    .filter(
      (entry): entry is { friend: FriendProfile; rating: { venueId: string; score: number; note: string } } =>
        Boolean(entry)
    );

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name} ${venue.district} ${venue.city}`
  )}`;
  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;

  const primaryPhoto = photos[0];
  const sidePhotos = photos.slice(1, 3);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Back Bar (Google Maps desktop panel style) */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[#E4E8EB] bg-[#F8FAFB]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-[#111827] hover:bg-[#E5ECEC] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Listeye Dön
        </button>

        <span className="text-[11px] font-semibold text-[#64748B] truncate">
          {venue.district}, {venue.city}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="rounded-lg p-1 text-[#64748B] hover:bg-[#E5ECEC] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Google Maps-Style Place Body */}
      <div className="flex-1 overflow-y-auto">
        {/* 3-Mode Media Switcher: Photos Collage | Live Interactive Google Maps Embed | Satellite Roof View */}
        <div className="grid grid-cols-3 border-b border-[#E4E8EB] bg-[#F1F5F9] p-1 gap-1">
          <button
            type="button"
            onClick={() => setHeroTab('photos')}
            className={`inline-flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-extrabold cursor-pointer ${heroTab === 'photos'
              ? 'bg-[#0B4A4F] text-white shadow-xs'
              : 'text-[#475569] hover:bg-white'
              }`}
          >
            <Images className="w-3.5 h-3.5" />
            Fotoğraflar ({photos.length})
          </button>
          <button
            type="button"
            onClick={() => setHeroTab('gmap')}
            className={`inline-flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-extrabold cursor-pointer ${heroTab === 'gmap'
              ? 'bg-[#0B4A4F] text-white shadow-xs'
              : 'text-[#475569] hover:bg-white'
              }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Canlı Google Harita
          </button>
          <button
            type="button"
            onClick={() => setHeroTab('sat')}
            className={`inline-flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-extrabold cursor-pointer ${heroTab === 'sat'
              ? 'bg-[#0B4A4F] text-white shadow-xs'
              : 'text-[#475569] hover:bg-white'
              }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            Google Uydu
          </button>
        </div>

        {/* Hero Media Area */}
        {heroTab === 'photos' ? (
          <div className="relative bg-[#0F172A]">
            {!primaryPhoto ? (
              <div className="h-44 flex flex-col items-center justify-center gap-2 bg-[#F1F5F9] text-[#475569] px-4 text-center">
                <Images className="w-6 h-6 text-[#0B4A4F]" />
                <div className="text-xs font-semibold">
                  {loadingPhotos
                    ? 'Gerçek mekân fotoğrafları Google Haritalar’dan getiriliyor...'
                    : 'Henüz gerçek mekân fotoğrafı bulunamadı. Google Harita veya Uydu sekmesinden inceleyebilirsiniz.'}
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-3 gap-0.5 h-52 sm:h-56">
              {primaryPhoto && (
                <button
                  type="button"
                  onClick={() => setLightboxIdx(0)}
                  className="col-span-2 relative h-full overflow-hidden group cursor-pointer"
                >
                  <img
                    src={primaryPhoto.url}
                    alt={primaryPhoto.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {primaryPhoto.source}
                  </span>
                </button>
              )}

              <div className="col-span-1 flex flex-col gap-0.5 h-full">
                {sidePhotos.map((photo, idx) => (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => setLightboxIdx(idx + 1)}
                    className="relative flex-1 overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    />
                    {idx === sidePhotos.length - 1 && photos.length > 3 && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-xs font-extrabold gap-1">
                        <Images className="w-3.5 h-3.5" />+{photos.length - 3}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            )}

            <button
              type="button"
              onClick={() => setLightboxIdx(0)}
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-black/85 cursor-pointer"
            >
              <Images className="w-3 h-3" />
              {loadingPhotos ? 'Fotoğraflar güncelleniyor...' : `${photos.length} Fotoğraf`}
            </button>
          </div>
        ) : (
          <div className="relative h-60 bg-[#E2E8F0] border-b border-[#E4E8EB]">
            <iframe
              title={`${venue.name} Google Maps`}
              src={
                heroTab === 'gmap'
                  ? pyGmaps?.embed_place_url ||
                  `https://maps.google.com/maps?q=${encodeURIComponent(
                    `${venue.name} ${venue.district} ${venue.city}`
                  )}&hl=tr&z=17&output=embed`
                  : pyGmaps?.embed_coord_url ||
                  `https://maps.google.com/maps?q=${venue.lat},${venue.lng}&t=k&hl=tr&z=19&output=embed`
              }
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* Venue Header Block */}
        <div className="px-4 py-3.5 border-b border-[#E4E8EB]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-[#111827] leading-tight tracking-tight">
                {venue.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#64748B]">
                <span className="font-semibold text-[#0B4A4F]">{venue.category}</span>
                <span>·</span>
                <span className="font-bold text-[#111827]">{venue.priceTier}</span>
                {venue.isLiveOsm && (
                  <>
                    <span>·</span>
                    <span className="rounded bg-[#E0F2FE] px-1.5 py-0.5 text-[10px] font-bold text-[#0369A1]">
                      Canlı Harita Kaydı
                    </span>
                  </>
                )}
                {onUpdateVenue && (
                  <button
                    type="button"
                    onClick={() => setEditingDetails((e) => !e)}
                    className="ml-1 inline-flex items-center gap-1 rounded border border-[#D1D5DB] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#374151] hover:border-[#0B4A4F] cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    Konum / İsim Düzelt
                  </button>
                )}
                {onMarkClosed && (
                  <button
                    type="button"
                    onClick={() => onMarkClosed(venue.id)}
                    className="inline-flex items-center gap-1 rounded border border-[#FECACA] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
                  >
                    Kapandı / Kaldır
                  </button>
                )}
              </div>
            </div>

            {rank && (
              <div
                className="shrink-0 w-11 h-11 rounded-full flex flex-col items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: scoreColor(rank.score) }}
              >
                <span className="text-sm font-extrabold tabular-nums leading-none">
                  {rank.score.toFixed(1)}
                </span>
                <span className="text-[8px] font-bold opacity-90 uppercase mt-0.5">Elo</span>
              </div>
            )}
          </div>

          {mismatchHint && onUpdateVenue && (
            <div className="mt-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[#92400E] min-w-0">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" /> Doğrulama Önerisi
                </div>
                <div className="truncate">
                  {mismatchHint.name ? `Google adı: ${mismatchHint.name} ` : ''}
                  {mismatchHint.lat ? `· Yeni konum: ${mismatchHint.lat.toFixed(4)}, ${mismatchHint.lng?.toFixed(4)}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdateVenue(venue.id, {
                    ...(mismatchHint.name ? { name: mismatchHint.name } : {}),
                    ...(mismatchHint.lat && mismatchHint.lng
                      ? { lat: mismatchHint.lat, lng: mismatchHint.lng, gpsVerified: true }
                      : {}),
                  });
                  setMismatchHint(null);
                }}
                className="shrink-0 rounded-md bg-[#0B4A4F] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
              >
                Konum &amp; İsmi Güncelle
              </button>
            </div>
          )}

          {editingDetails && onUpdateVenue && (
            <div className="mt-2.5 rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] p-2.5 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Mekân adı"
                  className="rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  placeholder="Semt"
                  className="rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  placeholder="Enlem (Lat)"
                  className="rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  placeholder="Boylam (Lng)"
                  className="rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {isAdmin && onAdminDeleteVenue ? (
                  <button
                    type="button"
                    onClick={() => onAdminDeleteVenue(venue.id)}
                    className="rounded border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-bold text-[#B91C1C] cursor-pointer"
                  >
                    Mekânı Sil (Admin)
                  </button>
                ) : <span />}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingDetails(false)}
                    className="rounded px-2.5 py-1 text-[11px] font-semibold text-[#6B7280] cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const latNum = Number(editLat);
                      const lngNum = Number(editLng);
                      const validCoords =
                        Number.isFinite(latNum) &&
                        Number.isFinite(lngNum) &&
                        latNum >= 35.5 &&
                        latNum <= 42.5 &&
                        lngNum >= 25.5 &&
                        lngNum <= 45.0;
                      onUpdateVenue(venue.id, {
                        name: editName.trim() || venue.name,
                        district: editDistrict.trim() || venue.district,
                        ...(validCoords ? { lat: latNum, lng: lngNum, gpsVerified: true } : {}),
                      });
                      setEditingDetails(false);
                    }}
                    className="rounded bg-[#0B4A4F] px-3 py-1 text-[11px] font-bold text-white cursor-pointer"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {googleRating && (
              <div className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-1 text-xs font-bold text-[#92400E]">
                <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                {googleRating.toFixed(1)}
                {googleReviewCount ? ` (${googleReviewCount.toLocaleString('tr-TR')})` : ''}
              </div>
            )}

            {terraceWeather && (
              <div
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${terraceWeather.terraceSuitable
                  ? 'bg-[#ECFDF5] text-[#047857]'
                  : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
              >
                <Sun className="w-3.5 h-3.5" />
                {terraceWeather.badgeText}
              </div>
            )}

            {pyGmaps?.elevation_m !== null && pyGmaps?.elevation_m !== undefined && (
              <div className="inline-flex items-center gap-1 rounded-md bg-[#F0F9FF] px-2 py-1 text-xs font-bold text-[#0369A1]">
                <Mountain className="w-3.5 h-3.5" />
                Rakım: {pyGmaps.elevation_m} m
              </div>
            )}
          </div>



          {/* Quick Actions (Google Maps Style) */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onRankVenue(venue)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B4A4F] py-2 text-xs font-bold text-white hover:bg-[#08393D] cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {rank ? 'Yeniden Sırala' : 'Gittim · Sırala'}
            </button>

            <button
              type="button"
              onClick={() => onToggleWant(venue.id)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold cursor-pointer ${isWant
                ? 'border-[#0B4A4F] bg-[#EAF4F4] text-[#0B4A4F]'
                : 'border-[#D1D5DB] bg-white text-[#111827] hover:bg-[#F3F4F6]'
                }`}
            >
              {isWant ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              {isWant ? 'Gideceklerimde' : 'Kaydet'}
            </button>

            <a
              href={googleDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F4F6]"
            >
              <Navigation className="w-3.5 h-3.5 text-[#0B4A4F]" />
              Google Yol Tarifi
            </a>

            <a
              href={googleMapsSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F4F6]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0284C7]" />
              Google Foto & Yorum
            </a>
          </div>

          {/* In-App 3D Turn-by-Turn Navigation Trigger (Mapbox Navigation Style) */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={routingBusy}
              onClick={() => onStartRoute(venue, 'driving')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] py-2 text-xs font-extrabold text-[#047857] hover:bg-[#D1FAE5] cursor-pointer disabled:opacity-60"
            >
              <Car className="w-3.5 h-3.5" />
              {routingBusy ? 'Hesaplanıyor...' : '3D Araç Rotası Çiz'}
            </button>
            <button
              type="button"
              disabled={routingBusy}
              onClick={() => onStartRoute(venue, 'walking')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] py-2 text-xs font-extrabold text-[#0369A1] hover:bg-[#E0F2FE] cursor-pointer disabled:opacity-60"
            >
              <Footprints className="w-3.5 h-3.5" />
              3D Yürüyüş Rotası
            </button>
          </div>

          {activeRoute && activeRoute.venueId === venue.id && (
            <div className="mt-3 rounded-lg border border-[#A7F3D0] bg-[#F0FDF4] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-extrabold text-[#065F46]">
                  <Route className="w-4 h-4" />
                  {activeRoute.distanceKm} km · ~{activeRoute.durationMin} dk (
                  {activeRoute.mode === 'walking' ? 'Yürüyüş' : 'Araç'})
                </div>
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="text-[11px] font-bold text-[#047857] hover:underline cursor-pointer"
                >
                  Rotayı Kapat
                </button>
              </div>
              <div className="text-[11px] text-[#047857]">
                Başlangıç: <strong>{activeRoute.originLabel}</strong>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#111827] pt-1 border-t border-[#BBF7D0]">
                {activeRoute.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Horizontal Scrollable Thumbnail Strip (Google Maps Photos Tab Feel) */}
        <div className="px-4 py-3 border-b border-[#E4E8EB]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
              Google Haritalar Mekân & Yorum Fotoğrafları ({photos.length})
            </h3>
            <span className="text-[11px] text-[#64748B]">Büyütmek için tıkla</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo, idx) => (
              <button
                key={photo.url}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="shrink-0 w-24 h-18 rounded-lg overflow-hidden border border-[#E4E8EB] hover:border-[#0B4A4F] cursor-pointer relative group"
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Google Maps Visual Reviews Section (Görselli Google Yorumları) */}
        {reviews.length > 0 && (
          <div className="px-4 py-3.5 border-b border-[#E4E8EB] bg-[#F8FAFC] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B4A4F]">
                Google Haritalar Görselli Yorumlar ({reviews.length})
              </h3>
              <span className="text-[10px] font-semibold text-[#64748B]">
                Gerçek Ziyaretçi Fotoğrafları
              </span>
            </div>

            <div className="space-y-2.5">
              {reviews.map((rev, rIdx) => (
                <div
                  key={`${rev.author}-${rIdx}`}
                  className="rounded-lg border border-[#E2E8F0] bg-white p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {rev.avatar ? (
                        <img
                          src={rev.avatar}
                          alt={rev.author}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0 bg-[#E2E8F0]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#0B4A4F] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {rev.author.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#111827] truncate">
                          {rev.author}
                        </div>
                        {rev.badge && (
                          <div className="text-[10px] text-[#64748B] truncate">{rev.badge}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-0.5 text-[#D97706]">
                        <Star className="w-3 h-3 fill-[#D97706]" />
                        <Star className="w-3 h-3 fill-[#D97706]" />
                        <Star className="w-3 h-3 fill-[#D97706]" />
                        <Star className="w-3 h-3 fill-[#D97706]" />
                        <Star className="w-3 h-3 fill-[#D97706]" />
                      </div>
                      {rev.relativeTime && (
                        <span className="text-[10px] text-[#64748B]">{rev.relativeTime}</span>
                      )}
                    </div>
                  </div>

                  {rev.text && (
                    <p className="text-xs text-[#1E293B] leading-relaxed">{rev.text}</p>
                  )}

                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pt-1">
                      {rev.photos.map((pUrl) => {
                        const galleryIdx = photos.findIndex((p) => p.url === pUrl);
                        return (
                          <button
                            key={pUrl}
                            type="button"
                            onClick={() => setLightboxIdx(galleryIdx >= 0 ? galleryIdx : 0)}
                            className="shrink-0 w-20 h-16 rounded-md overflow-hidden border border-[#CBD5E1] hover:border-[#0B4A4F] cursor-pointer"
                          >
                            <img
                              src={pUrl}
                              alt={rev.author}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured Google Maps Metadata Rows */}
        <div className="divide-y divide-[#EEF0F2] text-xs">
          <div className="px-4 py-3 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#0B4A4F] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#111827]">
                {venue.address || `${venue.district}, ${venue.city}`}
              </div>
              <div className="text-[11px] text-[#64748B] tabular-nums mt-0.5">
                GPS: {venue.lat.toFixed(5)}, {venue.lng.toFixed(5)}
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
              Öne Çıkanlar / Mutfak
            </div>
            <div className="text-[#111827] font-medium leading-relaxed">{venue.signatureDish}</div>
            {pyGmaps?.ai_mode && (
              <div className="mt-2.5 rounded-lg border border-[#CCFBF1] bg-[#F0FDFA] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B4A4F]">
                    Google Yorumlarının Özeti
                  </span>
                  <a
                    href={pyGmaps.ai_mode.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0F766E] hover:underline"
                  >
                    Google’da Gör
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-[#134E4A] leading-relaxed">
                  {pyGmaps.ai_mode.response_text}
                </p>
                {pyGmaps.ai_mode.links &&
                  pyGmaps.ai_mode.links.filter(
                    (lk) => !lk.text.includes('udm=50') && !lk.text.includes('AI Mode')
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {pyGmaps.ai_mode.links
                        .filter(
                          (lk) => !lk.text.includes('udm=50') && !lk.text.includes('AI Mode')
                        )
                        .map((lk) => (
                          <a
                            key={lk.url}
                            href={lk.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-white border border-[#99F6E4] px-2 py-0.5 text-[10px] font-semibold text-[#0B4A4F] hover:bg-[#CCFBF1]"
                          >
                            {lk.text}
                          </a>
                        ))}
                    </div>
                  )}
              </div>
            )}
            {venue.cuisineTags && venue.cuisineTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {venue.cuisineTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#334155]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>



          {liveHours && (
            <div className="px-4 py-2.5 flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#64748B] shrink-0" />
              <span className="text-[#111827] font-medium">{liveHours}</span>
            </div>
          )}

          {venue.outdoorSeating && (
            <div className="px-4 py-2.5 flex items-center gap-3">
              <Trees className="w-4 h-4 text-[#059669] shrink-0" />
              <span className="text-[#111827] font-medium">Açık alan / bahçe oturumu mevcut</span>
            </div>
          )}

          {venue.phone && (
            <div className="px-4 py-2.5 flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#64748B] shrink-0" />
              <a href={`tel:${venue.phone}`} className="text-[#0B4A4F] font-semibold hover:underline">
                {venue.phone}
              </a>
            </div>
          )}

          {venue.website && (
            <div className="px-4 py-2.5 flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#64748B] shrink-0" />
              <a
                href={venue.website}
                target="_blank"
                rel="noreferrer"
                className="text-[#0B4A4F] font-semibold hover:underline truncate"
              >
                {venue.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}

          {rank?.personalNote && (
            <div className="px-4 py-3 bg-[#F5FAFA]">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B4A4F] mb-1">
                Senin Tadım Notun ({rank.visitedAt})
              </div>
              <p className="text-xs text-[#111827] leading-relaxed">{rank.personalNote}</p>
            </div>
          )}

          {friendNotes.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Çevrenden Puanlar
              </div>
              {friendNotes.map(({ friend, rating }) => (
                <div key={friend.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[#111827]">
                      {friend.name}{' '}
                      <span className="font-normal text-[#64748B]">{friend.handle}</span>
                    </div>
                    <div className="text-[#475569] mt-0.5">{rating.note}</div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white tabular-nums"
                    style={{ backgroundColor: scoreColor(rating.score) }}
                  >
                    {rating.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[1200] bg-black/92 flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Mekân fotoğraf galerisi"
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-3">
            <div>
              <div className="text-sm font-bold">{venue.name}</div>
              <div className="text-xs text-white/70">
                {photos[lightboxIdx].caption} · {photos[lightboxIdx].source} ({lightboxIdx + 1}/
                {photos.length})
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              aria-label="Galeriyi kapat"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full max-w-4xl flex items-center justify-center">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length)}
                aria-label="Önceki fotoğraf"
                className="absolute left-2 z-10 rounded-full bg-black/60 p-2.5 text-white hover:bg-black cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={photos[lightboxIdx].url}
              alt={photos[lightboxIdx].caption}
              referrerPolicy="no-referrer"
              className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-2xl"
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIdx((lightboxIdx + 1) % photos.length)}
                aria-label="Sonraki fotoğraf"
                className="absolute right-2 z-10 rounded-full bg-black/60 p-2.5 text-white hover:bg-black cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto max-w-full pb-1">
            {photos.map((p, idx) => (
              <button
                key={p.url}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className={`shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 cursor-pointer ${idx === lightboxIdx ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
              >
                <img src={p.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
