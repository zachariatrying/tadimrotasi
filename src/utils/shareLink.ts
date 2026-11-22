import type { RankedVenue, SharedListPayload, Venue } from '../types';

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): string {
  const padLen = (4 - (encoded.length % 4)) % 4;
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareableListUrl(
  owner: string,
  ranked: RankedVenue[],
  venues: Venue[]
): string {
  const venueMap = new Map(venues.map((v) => [v.id, v]));
  const items = [...ranked]
    .sort((a, b) => a.rankIndex - b.rankIndex)
    .slice(0, 10)
    .map((r) => {
      const v = venueMap.get(r.venueId);
      if (!v) return null;
      return {
        name: v.name,
        city: v.city,
        district: v.district,
        category: v.category,
        priceTier: v.priceTier,
        lat: v.lat,
        lng: v.lng,
        score: r.score,
        signatureDish: v.signatureDish,
      };
    })
    .filter((x): x is SharedListPayload['items'][number] => Boolean(x));

  const payload: SharedListPayload = {
    owner: owner || 'TadımRotası Kullanıcısı',
    createdAt: new Date().toISOString().slice(0, 10),
    items,
  };

  const hash = `#liste=${toBase64Url(JSON.stringify(payload))}`;
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

export function readSharedListFromHash(): SharedListPayload | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#liste=')) return null;
    const raw = fromBase64Url(hash.slice('#liste='.length));
    const parsed = JSON.parse(raw) as SharedListPayload;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}
