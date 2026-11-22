import { useMemo, useState } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import type { RankedVenue, SentimentTier, Venue } from '../types';

interface CompareModalProps {
  venue: Venue | null;
  allVenues: Venue[];
  ranked: RankedVenue[];
  onClose: () => void;
  onFinishRank: (venueId: string, tier: SentimentTier, insertIndexInTier: number, note: string) => void;
}

const SENTIMENTS: Array<{ id: SentimentTier; label: string; sub: string; color: string }> = [
  { id: 'bayildim', label: 'Bayıldım', sub: '8.4 – 9.8 · Tekrar giderim', color: '#059669' },
  { id: 'guzeldi', label: 'Güzeldi', sub: '6.8 – 8.3 · Tavsiye ederim', color: '#D97706' },
  { id: 'idare', label: 'İdare Eder', sub: '4.5 – 6.7 · Özel yol yapmam', color: '#64748B' },
];

export function CompareModal({
  venue,
  allVenues,
  ranked,
  onClose,
  onFinishRank,
}: CompareModalProps) {
  const [step, setStep] = useState<'sentiment' | 'duel'>('sentiment');
  const [tier, setTier] = useState<SentimentTier>('bayildim');
  const [note, setNote] = useState('');
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);

  const tierPeers = useMemo(() => {
    if (!venue) return [];
    return ranked
      .filter((r) => r.tier === tier && r.venueId !== venue.id)
      .sort((a, b) => a.rankIndex - b.rankIndex);
  }, [ranked, tier, venue]);

  if (!venue) return null;

  const startDuel = (chosenTier: SentimentTier) => {
    setTier(chosenTier);
    const peers = ranked
      .filter((r) => r.tier === chosenTier && r.venueId !== venue.id)
      .sort((a, b) => a.rankIndex - b.rankIndex);

    if (peers.length === 0) {
      onFinishRank(venue.id, chosenTier, 0, note.trim());
      setNote('');
      return;
    }
    setLow(0);
    setHigh(peers.length);
    setStep('duel');
  };

  const mid = Math.floor((low + high) / 2);
  const opponentRank = tierPeers[mid];
  const opponentVenue = opponentRank
    ? allVenues.find((v) => v.id === opponentRank.venueId)
    : undefined;

  const chooseWinner = (newVenueIsBetter: boolean) => {
    const nextLow = newVenueIsBetter ? low : mid + 1;
    const nextHigh = newVenueIsBetter ? mid : high;

    if (nextLow >= nextHigh) {
      onFinishRank(venue.id, tier, nextLow, note.trim());
      setStep('sentiment');
      setNote('');
      return;
    }
    setLow(nextLow);
    setHigh(nextHigh);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="İkili karşılaştırmalı mekân sıralama"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">{venue.name}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {venue.district}, {venue.city} · {venue.category}
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

        {step === 'sentiment' ? (
          <div className="pt-4 space-y-4">
            <div>
              <label htmlFor="visit-note" className="block text-xs font-semibold text-[#374151] mb-1">
                Kısa tadım notun (isteğe bağlı)
              </label>
              <input
                id="visit-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn. Öğlen 12:30'dan önce gitmeli, sıcak lavaşı harika..."
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#374151]">
                Genel değerlendirmeni seç — ardından ikili karşılaştırmayla tam puanını hesaplayalım:
              </p>
              {SENTIMENTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => startDuel(s.id)}
                  className="w-full flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-left hover:border-[#0B4A4F] hover:bg-[#EAF4F4] transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-bold text-[#111827]">{s.label}</div>
                    <div className="text-xs text-[#6B7280]">{s.sub}</div>
                  </div>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#0B4A4F]">
              <ArrowLeftRight className="w-4 h-4" />
              Hangisini daha çok beğendin?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseWinner(true)}
                className="rounded-xl border-2 border-[#E5E7EB] bg-white p-4 text-left hover:border-[#0B4A4F] hover:bg-[#F5FAFA] transition-colors cursor-pointer"
              >
                <span className="inline-block rounded-md bg-[#EAF4F4] px-2 py-0.5 text-[11px] font-bold text-[#0B4A4F]">
                  Yeni Mekân
                </span>
                <div className="text-base font-bold text-[#111827] mt-2">{venue.name}</div>
                <div className="text-xs text-[#6B7280]">
                  {venue.district} · {venue.category}
                </div>
                <p className="text-xs text-[#4B5563] mt-2 line-clamp-2">{venue.signatureDish}</p>
              </button>

              {opponentVenue && opponentRank && (
                <button
                  type="button"
                  onClick={() => chooseWinner(false)}
                  className="rounded-xl border-2 border-[#E5E7EB] bg-white p-4 text-left hover:border-[#059669] hover:bg-[#F0FDF4] transition-colors cursor-pointer"
                >
                  <span className="inline-block rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#059669]">
                    Mevcut · {opponentRank.score.toFixed(1)}
                  </span>
                  <div className="text-base font-bold text-[#111827] mt-2">{opponentVenue.name}</div>
                  <div className="text-xs text-[#6B7280]">
                    {opponentVenue.district} · {opponentVenue.category}
                  </div>
                  <p className="text-xs text-[#4B5563] mt-2 line-clamp-2">
                    {opponentVenue.signatureDish}
                  </p>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
