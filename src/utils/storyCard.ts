import type { RankedVenue, Venue } from '../types';
import { scoreColor } from './elo';

/**
 * Generates a crisp 1080x1350 Instagram Story / Reels PNG poster in TadımRotası Deep Bosphorus Teal.
 */
export function downloadTopTenStoryPng(
  ranked: RankedVenue[],
  venues: Venue[],
  title = 'En İyi Mekânlarım'
): void {
  const venueMap = new Map(venues.map((v) => [v.id, v]));
  const topItems = [...ranked]
    .sort((a, b) => a.rankIndex - b.rankIndex)
    .slice(0, 8)
    .map((r) => ({ rank: r, venue: venueMap.get(r.venueId) }))
    .filter((entry): entry is { rank: RankedVenue; venue: Venue } => Boolean(entry.venue));

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Crisp pure white canvas
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Committed Deep Bosphorus Teal header band
  ctx.fillStyle = '#0B4A4F';
  ctx.fillRect(0, 0, canvas.width, 250);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '700 22px Manrope, system-ui, sans-serif';
  ctx.fillText('TADIMROTASI  ·  KİŞİSEL GASTRONOMİ SIRALAMASI', 72, 86);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 58px Manrope, system-ui, sans-serif';
  ctx.fillText(title, 72, 162);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '500 24px Manrope, system-ui, sans-serif';
  ctx.fillText('Sahte 5 yıldız yok · İkili karşılaştırma (Elo) sıralaması', 72, 210);

  // Clean hairline rows — zero nested card slop
  topItems.forEach(({ rank, venue }, idx) => {
    const y = 278 + idx * 120;

    if (idx > 0) {
      ctx.strokeStyle = '#E4E8EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(72, y - 10);
      ctx.lineTo(1008, y - 10);
      ctx.stroke();
    }

    // Rank number
    ctx.fillStyle = '#94A3B8';
    ctx.font = '800 26px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${idx + 1}.`, 72, y + 54);

    // Venue title + metadata
    ctx.fillStyle = '#111827';
    ctx.font = '800 32px Manrope, system-ui, sans-serif';
    ctx.fillText(venue.name.slice(0, 32), 144, y + 46);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 22px Manrope, system-ui, sans-serif';
    ctx.fillText(`${venue.district}, ${venue.city} · ${venue.category} · ${venue.priceTier}`, 144, y + 82);

    // Score circle ring
    const ringColor = scoreColor(rank.score);
    ctx.beginPath();
    ctx.arc(960, y + 52, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = ringColor;
    ctx.stroke();

    ctx.fillStyle = ringColor;
    ctx.font = '800 28px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rank.score.toFixed(1), 960, y + 62);
  });

  // Footer hairline & watermark
  ctx.strokeStyle = '#E4E8EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 1245);
  ctx.lineTo(1008, 1245);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0B4A4F';
  ctx.font = '800 24px Manrope, system-ui, sans-serif';
  ctx.fillText('tadimrotasi.app', 72, 1296);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 22px Manrope, system-ui, sans-serif';
  ctx.fillText('Türkiye lezzet haritanı kur', 1008, 1296);

  const link = document.createElement('a');
  link.download = `tadimrotasi-top-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
