import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { FriendProfile, RankedVenue, SentimentTier, TadimState, Venue, VenueCategory, VenueCity } from '../types';

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

  // Upsert only venues referenced by user's ranked or wantToGo lists
  const referencedIds = new Set([
    ...state.ranked.map((r) => r.venueId),
    ...state.wantToGoIds,
  ]);
  const venueRows = state.venues
    .filter((v) => referencedIds.has(v.id))
    .map((v) => ({
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
    const { error: vErr } = await sb
      .from('venues')
      .upsert(venueRows, { onConflict: 'id', ignoreDuplicates: true });
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

export interface PublicProfileSummary {
  id: string;
  handle: string;
  display_name: string;
  home_city: string;
  bio: string;
}

export async function upsertMyProfile(
  userId: string,
  handle: string,
  displayName: string,
  homeCity: string,
  bio = ''
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış.');
  const cleanHandle = handle.trim().replace(/^@/, '').toLowerCase();
  const { error } = await sb.from('profiles').upsert({
    id: userId,
    handle: cleanHandle,
    display_name: displayName.trim() || cleanHandle,
    home_city: homeCity || 'İstanbul',
    bio,
    is_public: true,
  });
  if (error) throw error;
}

export async function searchPublicProfiles(query: string): Promise<PublicProfileSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const q = query.trim().replace(/^@/, '');
  if (!q) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('id, handle, display_name, home_city, bio')
    .eq('is_public', true)
    .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(10);
  if (error) throw error;
  return (data ?? []) as PublicProfileSummary[];
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış.');
  const { error } = await sb
    .from('follows')
    .upsert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış.');
  const { error } = await sb
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

const AVATAR_PALETTE = ['#0B4A4F', '#C84B31', '#6D28D9', '#047857', '#B45309'];

export async function fetchFollowingProfiles(followerId: string): Promise<FriendProfile[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: followRows, error: fErr } = await sb
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId);
  if (fErr || !followRows?.length) return [];

  const ids = followRows.map((r) => String(r.following_id));
  const [profRes, rankRes] = await Promise.all([
    sb.from('profiles').select('id, handle, display_name, home_city, bio').in('id', ids),
    sb.from('user_rankings').select('user_id, venue_id, score, personal_note').in('user_id', ids).order('score', { ascending: false }),
  ]);

  if (profRes.error || !profRes.data) return [];
  const ranksByUser = new Map<string, Array<{ venueId: string; score: number; note: string }>>();
  for (const r of rankRes.data ?? []) {
    const uid = String(r.user_id);
    const list = ranksByUser.get(uid) ?? [];
    list.push({
      venueId: String(r.venue_id),
      score: Number(r.score),
      note: String(r.personal_note || ''),
    });
    ranksByUser.set(uid, list);
  }

  return profRes.data.map((p, idx) => ({
    id: String(p.id),
    name: String(p.display_name || p.handle),
    handle: `@${String(p.handle)}`,
    city: (p.home_city as VenueCity) || 'İstanbul',
    bio: String(p.bio || 'TadımRotası kullanıcısı'),
    avatarBg: AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
    ratings: (ranksByUser.get(String(p.id)) ?? []).slice(0, 12),
  }));
}

export async function getIsAdmin(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return Boolean(data.is_admin);
}

export async function adminUpdateVenueInCloud(venue: Venue): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('venues').upsert(
    {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      district: venue.district,
      category: venue.category,
      price_tier: venue.priceTier,
      lat: venue.lat,
      lng: venue.lng,
      signature_dish: venue.signatureDish,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function adminDeleteVenueInCloud(venueId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('venues').delete().eq('id', venueId);
  if (error) throw error;
}

export async function signInWithOAuthProvider(provider: 'google' | 'apple'): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış.');
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) throw error;
}

export interface FeedActivityItem {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  avatarBg: string;
  venueId: string;
  score: number;
  note: string;
  visitedAt: string;
}

export async function fetchFollowingFeed(followerId: string): Promise<FeedActivityItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: followRows, error: fErr } = await sb
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId);
  if (fErr || !followRows?.length) return [];

  const ids = followRows.map((r) => String(r.following_id));
  const [profRes, rankRes] = await Promise.all([
    sb.from('profiles').select('id, handle, display_name').in('id', ids),
    sb
      .from('user_rankings')
      .select('user_id, venue_id, score, personal_note, visited_at, updated_at')
      .in('user_id', ids)
      .order('updated_at', { ascending: false })
      .limit(30),
  ]);
  if (profRes.error || rankRes.error || !profRes.data || !rankRes.data) return [];

  const profMap = new Map<string, { name: string; handle: string; bg: string }>();
  profRes.data.forEach((p, idx) => {
    profMap.set(String(p.id), {
      name: String(p.display_name || p.handle),
      handle: `@${String(p.handle)}`,
      bg: AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
    });
  });

  return rankRes.data.map((r) => {
    const uid = String(r.user_id);
    const prof = profMap.get(uid);
    return {
      id: `${uid}-${String(r.venue_id)}`,
      userId: uid,
      userName: prof?.name ?? 'Gurme',
      userHandle: prof?.handle ?? '@kullanici',
      avatarBg: prof?.bg ?? '#0B4A4F',
      venueId: String(r.venue_id),
      score: Number(r.score),
      note: String(r.personal_note || ''),
      visitedAt: String(r.visited_at || ''),
    };
  });
}
