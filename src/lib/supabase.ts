import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { RankedVenue, SentimentTier, TadimState, Venue, VenueCategory, VenueCity } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR-PROJECT-REF')
);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function pushStateToCloud(userId: string, state: TadimState): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış.');

  // Upsert venues
  const venueRows = state.venues.map((v) => ({
    id: v.id,
    created_by: userId,
    name: v.name,
    city: v.city,
    district: v.district,
    category: v.category,
    price_tier: v.priceTier,
    lat: v.lat,
    lng: v.lng,
    signature_dish: v.signatureDish,
    source_url: v.sourceUrl ?? null,
    source_platform: v.sourcePlatform ?? null,
  }));

  if (venueRows.length > 0) {
    const { error: vErr } = await sb.from('venues').upsert(venueRows, { onConflict: 'id' });
    if (vErr) throw vErr;
  }

  // Replace user rankings cleanly
  await sb.from('user_rankings').delete().eq('user_id', userId);
  if (state.ranked.length > 0) {
    const rankRows = state.ranked.map((r) => ({
      user_id: userId,
      venue_id: r.venueId,
      tier: r.tier,
      rank_index: r.rankIndex,
      score: r.score,
      visited_at: r.visitedAt,
      personal_note: r.personalNote,
    }));
    const { error: rErr } = await sb.from('user_rankings').insert(rankRows);
    if (rErr) throw rErr;
  }

  // Replace want_to_go
  await sb.from('want_to_go').delete().eq('user_id', userId);
  if (state.wantToGoIds.length > 0) {
    const wantRows = state.wantToGoIds.map((venueId) => ({
      user_id: userId,
      venue_id: venueId,
    }));
    const { error: wErr } = await sb.from('want_to_go').insert(wantRows);
    if (wErr) throw wErr;
  }
}

export async function pullStateFromCloud(userId: string): Promise<Partial<TadimState> | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const [venuesRes, rankRes, wantRes] = await Promise.all([
    sb.from('venues').select('*'),
    sb.from('user_rankings').select('*').eq('user_id', userId).order('rank_index'),
    sb.from('want_to_go').select('venue_id').eq('user_id', userId),
  ]);

  if (venuesRes.error || rankRes.error || wantRes.error) {
    throw venuesRes.error || rankRes.error || wantRes.error;
  }

  const venues: Venue[] = (venuesRes.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    city: (row.city as VenueCity) || 'İstanbul',
    district: String(row.district || ''),
    category: (row.category as VenueCategory) || 'Esnaf Lokantası',
    priceTier: (row.price_tier as '₺' | '₺₺' | '₺₺₺') || '₺₺',
    lat: Number(row.lat),
    lng: Number(row.lng),
    gpsVerified: true,
    signatureDish: String(row.signature_dish || ''),
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    sourcePlatform: row.source_platform as Venue['sourcePlatform'],
  }));

  const ranked: RankedVenue[] = (rankRes.data ?? []).map((row) => ({
    venueId: String(row.venue_id),
    tier: (row.tier as SentimentTier) || 'guzeldi',
    rankIndex: Number(row.rank_index),
    score: Number(row.score),
    visitedAt: String(row.visited_at),
    personalNote: String(row.personal_note || ''),
  }));

  const wantToGoIds = (wantRes.data ?? []).map((row) => String(row.venue_id));

  if (ranked.length === 0 && wantToGoIds.length === 0) return null;
  return { venues, ranked, wantToGoIds };
}

export async function deleteAllCloudUserData(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc('delete_my_data');
  if (error) throw error;
  await sb.auth.signOut();
}
