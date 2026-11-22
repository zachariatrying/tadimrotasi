import { useMemo, useState } from 'react';
import { BookmarkPlus, Check, Copy, Search, Sparkles, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { FriendProfile, RankedVenue, Venue } from '../types';
import { computeTasteMatch, scoreColor } from '../utils/elo';
import {
  followUser,
  isSupabaseConfigured,
  searchPublicProfiles,
  unfollowUser,
  type PublicProfileSummary,
} from '../lib/supabase';

interface FriendsTabProps {
  friends: FriendProfile[];
  venues: Venue[];
  userRanked: RankedVenue[];
  wantToGoIds: string[];
  cloudUser: User | null;
  copiedShare: boolean;
  onAddWantToGo: (venueId: string) => void;
  onFocusVenue: (venueId: string) => void;
  onCopyMyInviteLink: () => void;
  onAddFriendFromShare: (input: string) => { ok: boolean; message: string };
  onRemoveCustomFriend: (friendId: string) => void;
  onRefreshCloudFriends?: () => Promise<void>;
}

export function FriendsTab({
  friends,
  venues,
  userRanked,
  wantToGoIds,
  cloudUser,
  copiedShare,
  onAddWantToGo,
  onFocusVenue,
  onCopyMyInviteLink,
  onAddFriendFromShare,
  onRemoveCustomFriend,
  onRefreshCloudFriends,
}: FriendsTabProps) {
  const [inputVal, setInputVal] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PublicProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const venueMap = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);
  const rankedSet = useMemo(() => new Set(userRanked.map((r) => r.venueId)), [userRanked]);
  const wantSet = useMemo(() => new Set(wantToGoIds), [wantToGoIds]);
  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  // Taste-matched recommendation feed from people with >= 75% compatibility
  const compatibleRecs = useMemo(() => {
    const bestByVenue = new Map<
      string,
      {
        venue: Venue;
        score: number;
        weightedScore: number;
        matchPct: number;
        friendName: string;
        note: string;
      }
    >();

    for (const friend of friends) {
      const matchPct = computeTasteMatch(userRanked, friend);
      if (matchPct < 75) continue;

      for (const rating of friend.ratings) {
        if (rating.score < 8.0) continue;
        if (rankedSet.has(rating.venueId) || wantSet.has(rating.venueId)) continue;
        const venue = venueMap.get(rating.venueId);
        if (!venue) continue;

        const weightedScore = (matchPct / 100) * rating.score;
        const prev = bestByVenue.get(rating.venueId);
        if (!prev || weightedScore > prev.weightedScore) {
          bestByVenue.set(rating.venueId, {
            venue,
            score: rating.score,
            weightedScore,
            matchPct,
            friendName: friend.name,
            note: rating.note,
          });
        }
      }
    }

    return [...bestByVenue.values()]
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 6);
  }, [friends, userRanked, rankedSet, wantSet, venueMap]);

  const handleAddOrSearch = async () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    // 1) Try share link / code first (works without login!)
    if (trimmed.includes('#liste=') || trimmed.length > 36) {
      const res = onAddFriendFromShare(trimmed);
      setFeedback(res.message);
      if (res.ok) setInputVal('');
      return;
    }

    // 2) Otherwise search Supabase public @handles if signed in
    if (isSupabaseConfigured && cloudUser) {
      setSearching(true);
      setFeedback(null);
      try {
        const list = await searchPublicProfiles(trimmed);
        setSearchResults(list.filter((p) => p.id !== cloudUser.id));
        if (list.length === 0) {
          setFeedback('Bu kullanıcı adına sahip herkese açık profil bulunamadı.');
        }
      } catch {
        setFeedback('Profil araması yapılamadı.');
      } finally {
        setSearching(false);
      }
      return;
    }

    // 3) Offline hint
    setFeedback(
      'Hesap açmadan eklemek için arkadaşının "Paylaş" linkini/kodunu buraya yapıştır. @kullaniciadi araması için sağ üstten Bulut hesabı bağlayabilirsin.'
    );
  };

  const handleToggleFollow = async (profile: PublicProfileSummary) => {
    if (!cloudUser) return;
    try {
      if (friendIds.has(profile.id)) {
        await unfollowUser(cloudUser.id, profile.id);
      } else {
        await followUser(cloudUser.id, profile.id);
      }
      if (onRefreshCloudFriends) await onRefreshCloudFriends();
    } catch {
      setFeedback('Takip işlemi başarısız oldu.');
    }
  };

  return (
    <div className="divide-y divide-[#E5E7EB]">
      {/* 1. Add Friend & Invite Card */}
      <section className="p-4 bg-[#F8FAFB] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B4A4F]">
            <Users className="w-4 h-4" /> Arkadaş Ekle &amp; Davet Et
          </div>
          <button
            type="button"
            onClick={onCopyMyInviteLink}
            className="inline-flex items-center gap-1 rounded-md border border-[#0B4A4F]/25 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B4A4F] hover:bg-[#ECFDF5] cursor-pointer"
          >
            {copiedShare ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedShare ? 'Kopyalandı' : 'Davet Linkimi Kopyala'}
          </button>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleAddOrSearch()}
            placeholder="Arkadaşının TadımRotası linki veya @kullaniciadi..."
            className="flex-1 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs text-[#111827] placeholder:text-[#9CA3AF]"
          />
          <button
            type="button"
            disabled={searching}
            onClick={() => void handleAddOrSearch()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#0B4A4F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#093D41] disabled:opacity-60 cursor-pointer shrink-0"
          >
            {isSupabaseConfigured && cloudUser && !inputVal.includes('#liste=') ? (
              <Search className="w-3.5 h-3.5" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            Ekle
          </button>
        </div>

        {feedback && (
          <div className="rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1.5 text-[11px] text-[#065F46]">
            {feedback}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {searchResults.map((p) => {
              const following = friendIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111827] truncate">{p.display_name}</div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      @{p.handle} · {p.home_city}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleFollow(p)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      following
                        ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                        : 'bg-[#0B4A4F] text-white'
                    }`}
                  >
                    {following ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                    {following ? 'Takiptesin' : 'Takip Et'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Taste-Matched Recommendations Feed */}
      {compatibleRecs.length > 0 && (
        <section className="p-4 bg-[#FFFBEB]/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#92400E]">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              Sana Uygun Öneriler (Zevk Uyumu Ağı)
            </div>
            <span className="text-[10px] font-semibold text-[#B45309]">%75+ uyum</span>
          </div>

          <div className="space-y-2">
            {compatibleRecs.map((rec) => (
              <div
                key={rec.venue.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#FDE68A] bg-white px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onFocusVenue(rec.venue.id)}
                  className="flex-1 text-left min-w-0 cursor-pointer"
                >
                  <div className="text-xs font-bold text-[#111827] truncate">
                    {rec.venue.name}{' '}
                    <span className="font-normal text-[#6B7280]">· {rec.venue.district}</span>
                  </div>
                  <div className="text-[11px] text-[#4B5563] truncate mt-0.5">
                    <span className="font-semibold text-[#047857]">
                      {rec.friendName} (%{rec.matchPct} uyum)
                    </span>
                    {rec.note ? ` · “${rec.note}”` : ''}
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-extrabold text-white tabular-nums"
                    style={{ backgroundColor: scoreColor(rec.score) }}
                  >
                    {rec.score.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddWantToGo(rec.venue.id)}
                    className="rounded-md border border-[#D1D5DB] bg-white p-1.5 text-[#374151] hover:border-[#0B4A4F] cursor-pointer"
                    title="Gideceklerime ekle"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Friends List */}
      {friends.length === 0 ? (
        <div className="p-6 text-center space-y-2">
          <Users className="w-7 h-7 text-[#0B4A4F]/60 mx-auto" />
          <div className="text-sm font-bold text-[#111827]">Henüz arkadaş eklemedin</div>
          <p className="text-xs text-[#6B7280]">
            Yukarıdan <span className="font-semibold">@kullaniciadi</span> arayarak veya davet linkiyle arkadaşlarını ekle, zevk uyumunuzu gör.
          </p>
        </div>
      ) : (
      friends.map((friend) => {
        const matchPct = computeTasteMatch(userRanked, friend);
        const isCustom = friend.id.startsWith('custom-');
        return (
          <article key={friend.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: friend.avatarBg }}
                >
                  {friend.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#111827]">{friend.name}</div>
                  <div className="text-xs text-[#6B7280]">
                    {friend.handle} · {friend.city}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 text-xs font-bold tabular-nums text-[#047857]">
                  %{matchPct} uyum
                </span>
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => onRemoveCustomFriend(friend.id)}
                    className="rounded-md p-1 text-[#9CA3AF] hover:text-[#DC2626] cursor-pointer"
                    title="Arkadaşı çıkar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-[#4B5563] mt-2 mb-3">{friend.bio}</p>

            <ul className="divide-y divide-[#F3F4F6] border border-[#E5E7EB] rounded-lg overflow-hidden">
              {friend.ratings.map((item) => {
                const venue = venueMap.get(item.venueId);
                if (!venue) return null;
                const alreadySaved = rankedSet.has(venue.id) || wantSet.has(venue.id);

                return (
                  <li
                    key={item.venueId}
                    className="flex items-center justify-between gap-2.5 bg-white px-3 py-2.5 hover:bg-[#F9FAFB]"
                  >
                    <button
                      type="button"
                      onClick={() => onFocusVenue(venue.id)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[#111827] truncate">
                        {venue.name}{' '}
                        <span className="font-normal text-[#6B7280]">· {venue.district}</span>
                      </div>
                      <div className="text-[11px] text-[#4B5563] truncate mt-0.5">“{item.note}”</div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-extrabold text-white tabular-nums"
                        style={{ backgroundColor: scoreColor(item.score) }}
                      >
                        {item.score.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        disabled={alreadySaved}
                        onClick={() => onAddWantToGo(venue.id)}
                        className={`rounded-md p-1.5 border ${
                          alreadySaved
                            ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#059669] cursor-default'
                            : 'border-[#D1D5DB] bg-white text-[#374151] hover:border-[#0B4A4F] cursor-pointer'
                        }`}
                        title={alreadySaved ? 'Listende var' : 'Gideceklerime ekle'}
                      >
                        {alreadySaved ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })
      )}
    </div>
  );
}
