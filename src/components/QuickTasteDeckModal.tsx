import { useMemo, useState } from 'react';
import { BookmarkPlus, CheckCircle2, Heart, MapPin, SkipForward, Sparkles, ThumbsUp, X } from 'lucide-react';
import type { CityName, SentimentTier, Venue } from '../types';
import { CITY_TABS } from '../data/venues';

interface QuickTasteDeckModalProps {
  open: boolean;
  initialCity: CityName;
  venues: Venue[];
  alreadyRankedIds: Set<string>;
  onClose: () => void;
  onRateVenue: (venue: Venue, tier: SentimentTier) => void;
  onWantVenue: (venueId: string) => void;
}

export function QuickTasteDeckModal({
  open,
  initialCity,
  venues,
  alreadyRankedIds,
  onClose,
  onRateVenue,
  onWantVenue,
}: QuickTasteDeckModalProps) {
  const cities = useMemo(
    () => CITY_TABS.filter((c): c is Exclude<CityName, 'Tüm Türkiye'> => c !== 'Tüm Türkiye'),
    []
  );
  const [selectedCity, setSelectedCity] = useState<Exclude<CityName, 'Tüm Türkiye'>>(() =>
    initialCity === 'Tüm Türkiye' ? 'İstanbul' : initialCity
  );
  const [index, setIndex] = useState(0);
  const [ratedCount, setRatedCount] = useState(0);

  const deck = useMemo(() => {
    return venues
      .filter((v) => v.city === selectedCity && !alreadyRankedIds.has(v.id))
      .sort((a, b) => {
        const scoreA = (a.googleReviewCount ?? 0) + (a.googleRating ?? 0) * 40;
        const scoreB = (b.googleReviewCount ?? 0) + (b.googleRating ?? 0) * 40;
        return scoreB - scoreA;
      })
      .slice(0, 10);
  }, [venues, selectedCity, alreadyRankedIds]);

  if (!open) return null;

  const current = deck[index];
  const finished = !current || index >= deck.length;

  const handleCityChange = (city: Exclude<CityName, 'Tüm Türkiye'>) => {
    setSelectedCity(city);
    setIndex(0);
  };

  const handleRate = (tier: SentimentTier) => {
    if (!current) return;
    onRateVenue(current, tier);
    setRatedCount((c) => c + 1);
    setIndex((i) => i + 1);
  };

  const handleWant = () => {
    if (!current) return;
    onWantVenue(current.id);
    setIndex((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#E4E8EB] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E8EB] bg-[#F8FAFB]">
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0B4A4F]">
            <Sparkles className="w-4 h-4" />
            Şehrindeki Ünlü Mekânlar
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6B7280] hover:bg-[#E5ECEC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* City selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCityChange(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold cursor-pointer ${
                  selectedCity === c
                    ? 'bg-[#0B4A4F] text-white'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {finished ? (
            <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-6 text-center space-y-3">
              <CheckCircle2 className="w-9 h-9 text-[#059669] mx-auto" />
              <div className="text-base font-extrabold text-[#111827]">
                Harika! Kişisel listen oluştu.
              </div>
              <p className="text-xs text-[#4B5563]">
                {ratedCount > 0
                  ? `${ratedCount} mekânı puanladın. Şimdi listeni görebilir veya arkadaşlarınla zevk uyumunu karşılaştırabilirsin.`
                  : 'Bu şehirdeki tüm popüler kartları geçtin. Başka bir şehir seçebilirsin.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#0B4A4F] py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                Listemi Gör
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#DCE5E7] bg-[#F8FAFB] p-5 space-y-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
                <span>
                  {selectedCity} · {current.district}
                </span>
                <span className="tabular-nums">
                  {index + 1} / {deck.length}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-[#111827] leading-snug">
                  {current.name}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#4B5563]">
                  <span className="font-semibold text-[#0B4A4F]">{current.category}</span>
                  <span>·</span>
                  <span className="font-bold">{current.priceTier}</span>
                  {current.googleRating && (
                    <>
                      <span>·</span>
                      <span>★ {current.googleRating.toFixed(1)}</span>
                    </>
                  )}
                </div>
                {current.signatureDish && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-white border border-[#E2E8F0] px-2.5 py-1 text-xs text-[#334155]">
                    <MapPin className="w-3 h-3 text-[#0B4A4F]" />
                    {current.signatureDish}
                  </div>
                )}
              </div>

              <div className="text-xs font-bold text-[#111827]">Buraya daha önce gittin mi?</div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRate('bayildim')}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] py-2.5 text-xs font-bold text-[#047857] hover:bg-[#D1FAE5] cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  Bayıldım
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('guzeldi')}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] py-2.5 text-xs font-bold text-[#B45309] hover:bg-[#FEF3C7] cursor-pointer"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Güzeldi
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('idare')}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white py-2.5 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  İdare Eder
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleWant}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#0B4A4F]/30 bg-white py-2 text-xs font-bold text-[#0B4A4F] hover:bg-[#F0FDFA] cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Gideceklerime Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => i + 1)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFB] cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Gitmedim / Geç
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
