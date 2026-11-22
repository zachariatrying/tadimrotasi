import { useState, type FormEvent } from 'react';
import { X, Link2, MapPin, Search, CheckCircle2, Sparkles } from 'lucide-react';
import type { CityName, GoogleVisualReview, Venue, VenueCategory, VenueCity } from '../types';
import { CITY_CENTERS, VENUE_CATEGORIES, VENUE_CITIES } from '../data/venues';
import { searchTurkeyPlaces, type GeocodeResult } from '../utils/geocoder';
import { extractVenueViaScrapeGraph } from '../utils/pythonGmapsClient';

interface ReelsCatcherModalProps {
  open: boolean;
  defaultCity: CityName;
  onClose: () => void;
  onSaveVenue: (venue: Venue, startRankingImmediately: boolean) => void;
}

const CITIES: VenueCity[] = VENUE_CITIES;

export function ReelsCatcherModal({
  open,
  defaultCity,
  onClose,
  onSaveVenue,
}: ReelsCatcherModalProps) {
  const safeDefaultCity: VenueCity = defaultCity === 'Tüm Türkiye' ? 'İstanbul' : defaultCity;
  const [sourceUrl, setSourceUrl] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState<VenueCity>(safeDefaultCity);
  const [district, setDistrict] = useState('Kadıköy');
  const [category, setCategory] = useState<VenueCategory>('Esnaf Lokantası');
  const [dish, setDish] = useState('');
  const [priceTier, setPriceTier] = useState<'₺' | '₺₺' | '₺₺₺'>('₺₺');

  const [geoQuery, setGeoQuery] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sgLoading, setSgLoading] = useState(false);
  const [sgPhotos, setSgPhotos] = useState<string[]>([]);
  const [sgReviews, setSgReviews] = useState<GoogleVisualReview[]>([]);
  const [sgRating, setSgRating] = useState<number | undefined>(undefined);
  const [sgReviewCount, setSgReviewCount] = useState<number | undefined>(undefined);
  const [sgNodes, setSgNodes] = useState<string[]>([]);

  if (!open) return null;

  const handleScrapeGraphExtract = async () => {
    const target = (sourceUrl.trim() || geoQuery.trim() || name.trim());
    if (!target) return;
    setSgLoading(true);
    try {
      const data = await extractVenueViaScrapeGraph(target, city);
      if (data) {
        setName(data.name);
        if (CITIES.includes(data.city as VenueCity)) {
          setCity(data.city as VenueCity);
        }
        if (data.district) setDistrict(data.district);
        if (VENUE_CATEGORIES.includes(data.category as VenueCategory)) {
          setCategory(data.category as VenueCategory);
        }
        if (data.signatureDish) setDish(data.signatureDish);
        if (data.lat && data.lng) setPinnedCoords({ lat: data.lat, lng: data.lng });
        setSgPhotos(data.photos || []);
        setSgReviews(data.reviews || []);
        setSgRating(data.googleRating);
        setSgReviewCount(data.googleReviewCount);
        setSgNodes(data.nodes_executed || []);
      }
    } finally {
      setSgLoading(false);
    }
  };

  const handleSearchGps = async () => {
    const q = (geoQuery || name).trim();
    if (!q) return;
    setGeoLoading(true);
    try {
      const hits = await searchTurkeyPlaces(`${q} ${city}`);
      setGeoResults(hits);
    } finally {
      setGeoLoading(false);
    }
  };

  const applyGeocode = (hit: GeocodeResult) => {
    if (!name.trim()) setName(hit.shortName);
    setCity(hit.city);
    setDistrict(hit.district);
    setPinnedCoords({ lat: hit.lat, lng: hit.lng });
    setGeoResults([]);
  };

  const handleUrlBlur = () => {
    const raw = sourceUrl.trim();
    if (!raw || name.trim()) return;
    const clean = raw
      .replace(/^https?:\/\/(www\.)?/i, '')
      .split(/[/?#]/)
      .filter((seg) => seg && !['instagram.com', 'tiktok.com', 'reel', 'p', 'video'].includes(seg.toLowerCase()));
    const guess = clean[clean.length - 1];
    if (guess && guess.length > 2 && !/^\d+$/.test(guess)) {
      const formatted = guess
        .replace(/[-_@]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setName(formatted);
    }
  };

  const buildVenue = (): Venue => {
    const base = CITY_CENTERS[city];
    const lat = pinnedCoords ? pinnedCoords.lat : Number((base.lat + (Math.random() - 0.5) * 0.03).toFixed(5));
    const lng = pinnedCoords ? pinnedCoords.lng : Number((base.lng + (Math.random() - 0.5) * 0.04).toFixed(5));
    const lowerUrl = sourceUrl.toLowerCase();
    const platform = lowerUrl.includes('instagram')
      ? 'Instagram Reels'
      : lowerUrl.includes('tiktok')
        ? 'TikTok'
        : 'Manuel';

    return {
      id: `v-custom-${Date.now()}`,
      name: name.trim(),
      city,
      district: district.trim() || city,
      category,
      priceTier,
      lat,
      lng,
      gpsVerified: Boolean(pinnedCoords),
      signatureDish: dish.trim() || 'Öne çıkan tabak notu eklenmedi',
      osmImage: sgPhotos[0],
      googlePhotos: sgPhotos.length > 0 ? sgPhotos : undefined,
      googleReviews: sgReviews.length > 0 ? sgReviews : undefined,
      googleRating: sgRating,
      googleReviewCount: sgReviewCount,
      sourceUrl: sourceUrl.trim() || undefined,
      sourcePlatform: platform,
    };
  };

  const handleSubmit = (e: FormEvent, rankNow: boolean) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveVenue(buildVenue(), rankNow);
    setSourceUrl('');
    setName('');
    setDish('');
    setGeoQuery('');
    setPinnedCoords(null);
    setGeoResults([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mekân veya Reels ekle"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">Mekân veya Reels Ekle</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              OpenStreetMap ile gerçek GPS adresini bul veya Instagram Reels / TikTok linkini kaydet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-[#F5F7F8] border border-[#E4E8EB] p-3 space-y-2">
          <label htmlFor="geo-search" className="block text-xs font-bold text-[#111827]">
            Gerçek Türkiye Adresi Ara (GPS)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
              <input
                id="geo-search"
                type="text"
                value={geoQuery}
                onChange={(e) => setGeoQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSearchGps();
                  }
                }}
                placeholder="Örn. Moda Kahve, Karaköy Lokantası, Kızılay..."
                className="w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 py-2 text-xs text-[#111827]"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearchGps()}
              disabled={geoLoading}
              className="rounded-lg bg-[#111827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B4A4F] cursor-pointer disabled:opacity-60"
            >
              {geoLoading ? 'Aranıyor...' : 'Konum Bul'}
            </button>
          </div>

          {geoResults.length > 0 && (
            <ul className="space-y-1 max-h-36 overflow-y-auto pt-1">
              {geoResults.map((hit) => (
                <li key={hit.placeId}>
                  <button
                    type="button"
                    onClick={() => applyGeocode(hit)}
                    className="w-full text-left rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-xs hover:border-[#0B4A4F] cursor-pointer"
                  >
                    <div className="font-bold text-[#111827]">{hit.shortName}</div>
                    <div className="text-[11px] text-[#6B7280] truncate">{hit.displayName}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pinnedCoords && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#059669]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gerçek GPS sabitlendi ({pinnedCoords.lat}, {pinnedCoords.lng})
            </div>
          )}
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="reel-url" className="block text-xs font-semibold text-[#374151] mb-1">
              Web Sitesi / Google Maps / Instagram Reels / TikTok Linki
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
                <input
                  id="reel-url"
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://... veya mekân adı yazıp ScrapeGraphAI ile çekin"
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 py-2 text-xs text-[#111827]"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleScrapeGraphExtract()}
                disabled={sgLoading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#0B4A4F] px-3 py-2 text-xs font-bold text-white hover:bg-[#08393D] cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {sgLoading ? 'Kazınıyor...' : 'ScrapeGraphAI ile Çıkar'}
              </button>
            </div>
            {sgNodes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-semibold text-[#047857]">
                <span>ScrapeGraphAI:</span>
                {sgNodes.map((n) => (
                  <span key={n} className="rounded bg-[#ECFDF5] px-1.5 py-0.5 border border-[#A7F3D0]">
                    {n}
                  </span>
                ))}
                {sgPhotos.length > 0 && <span>· {sgPhotos.length} fotoğraf</span>}
                {sgReviews.length > 0 && <span>· {sgReviews.length} görselli yorum</span>}
              </div>
            )}
            {sgPhotos.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {sgPhotos.slice(0, 5).map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-14 h-12 rounded-md object-cover shrink-0 border border-[#CBD5E1]"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="venue-name" className="block text-xs font-semibold text-[#374151] mb-1">
              Mekân Adı *
            </label>
            <input
              id="venue-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Karaköy Lokantası"
              className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="venue-city" className="block text-xs font-semibold text-[#374151] mb-1">
                Şehir
              </label>
              <select
                id="venue-city"
                value={city}
                onChange={(e) => setCity(e.target.value as VenueCity)}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="venue-district" className="block text-xs font-semibold text-[#374151] mb-1">
                Semt
              </label>
              <input
                id="venue-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="venue-cat" className="block text-xs font-semibold text-[#374151] mb-1">
                Kategori
              </label>
              <select
                id="venue-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as VenueCategory)}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              >
                {VENUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[#374151] mb-1">Fiyat Bandı</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['₺', '₺₺', '₺₺₺'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPriceTier(tier)}
                    className={`rounded-lg border py-2 text-xs font-bold cursor-pointer ${
                      priceTier === tier
                        ? 'border-[#0B4A4F] bg-[#EAF4F4] text-[#0B4A4F]'
                        : 'border-[#D1D5DB] bg-white text-[#4B5563]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="venue-dish" className="block text-xs font-semibold text-[#374151] mb-1">
              Ne Yenir / Ne İçilir?
            </label>
            <input
              id="venue-dish"
              type="text"
              value={dish}
              onChange={(e) => setDish(e.target.value)}
              placeholder="Örn. Zeytinyağlı enginar, fıstıklı baklava..."
              className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B4A4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#08393D] cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              Gideceklerime Ekle
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="rounded-lg border border-[#111827] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6] cursor-pointer"
            >
              Gittim · Sırala
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
