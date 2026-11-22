import type { FriendProfile, RankedVenue, SentimentTier } from '../types';

const TIER_BANDS: Record<SentimentTier, { min: number; max: number }> = {
  bayildim: { min: 8.4, max: 9.8 },
  guzeldi: { min: 6.8, max: 8.3 },
  idare: { min: 4.5, max: 6.7 },
};

/**
 * Recomputes smooth, honest 0.0–10.0 scores from relative rank positions within each sentiment tier.
 */
export function recalculateScores(items: RankedVenue[]): RankedVenue[] {
  const ordered = [...items].sort((a, b) => a.rankIndex - b.rankIndex);
  const byTier: Record<SentimentTier, RankedVenue[]> = {
    bayildim: [],
    guzeldi: [],
    idare: [],
  };

  for (const item of ordered) {
    byTier[item.tier].push(item);
  }

  const tierOrder: SentimentTier[] = ['bayildim', 'guzeldi', 'idare'];
  const result: RankedVenue[] = [];
  let globalIdx = 0;

  for (const tier of tierOrder) {
    const group = byTier[tier];
    const band = TIER_BANDS[tier];
    group.forEach((entry, i) => {
      const ratio = group.length <= 1 ? 0.25 : i / (group.length - 1);
      const rawScore = band.max - ratio * (band.max - band.min);
      result.push({
        ...entry,
        rankIndex: globalIdx++,
        score: Math.round(rawScore * 10) / 10,
      });
    });
  }

  return result;
}

/**
 * Inserts a newly compared venue at a specific index inside its tier and recalculates all scores.
 */
export function insertRankedVenue(
  existing: RankedVenue[],
  newEntry: Omit<RankedVenue, 'rankIndex' | 'score'>,
  insertPositionInTier: number
): RankedVenue[] {
  const cleaned = existing.filter((r) => r.venueId !== newEntry.venueId);
  const sameTier = cleaned
    .filter((r) => r.tier === newEntry.tier)
    .sort((a, b) => a.rankIndex - b.rankIndex);
  const otherTiers = cleaned.filter((r) => r.tier !== newEntry.tier);

  const clampedPos = Math.max(0, Math.min(sameTier.length, insertPositionInTier));
  const placeholder: RankedVenue = {
    ...newEntry,
    rankIndex: 0,
    score: 8.0,
  };

  sameTier.splice(clampedPos, 0, placeholder);

  const tierOrder: SentimentTier[] = ['bayildim', 'guzeldi', 'idare'];
  const combined: RankedVenue[] = [];
  let idx = 0;
  for (const t of tierOrder) {
    const bucket =
      t === newEntry.tier
        ? sameTier
        : otherTiers.filter((r) => r.tier === t).sort((a, b) => a.rankIndex - b.rankIndex);
    for (const item of bucket) {
      combined.push({ ...item, rankIndex: idx++ });
    }
  }

  return recalculateScores(combined);
}

/**
 * Computes taste-match percentage between the user and a friend based on overlapping venues.
 */
export function computeTasteMatch(userRanked: RankedVenue[], friend: FriendProfile): number {
  const userMap = new Map(userRanked.map((r) => [r.venueId, r.score]));
  const diffs: number[] = [];
  for (const fr of friend.ratings) {
    const mine = userMap.get(fr.venueId);
    if (mine !== undefined) {
      diffs.push(Math.abs(mine - fr.score));
    }
  }
  if (diffs.length === 0) return 76;
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.max(52, Math.min(99, Math.round(100 - avgDiff * 14)));
}

export function scoreColor(score: number): string {
  if (score >= 8.5) return '#059669';
  if (score >= 7.0) return '#D97706';
  return '#64748B';
}
