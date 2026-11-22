import { BookmarkPlus, Check } from 'lucide-react';
import type { FriendProfile, RankedVenue, Venue } from '../types';
import { computeTasteMatch, scoreColor } from '../utils/elo';

interface FriendsTabProps {
  friends: FriendProfile[];
  venues: Venue[];
  userRanked: RankedVenue[];
  wantToGoIds: string[];
  onAddWantToGo: (venueId: string) => void;
  onFocusVenue: (venueId: string) => void;
}

export function FriendsTab({
  friends,
  venues,
  userRanked,
  wantToGoIds,
  onAddWantToGo,
  onFocusVenue,
}: FriendsTabProps) {
  const venueMap = new Map(venues.map((v) => [v.id, v]));
  const rankedSet = new Set(userRanked.map((r) => r.venueId));
  const wantSet = new Set(wantToGoIds);

  return (
    <div className="divide-y divide-[#E5E7EB]">
      {friends.map((friend) => {
        const matchPct = computeTasteMatch(userRanked, friend);
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
              <span className="rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 text-xs font-bold tabular-nums text-[#047857]">
                %{matchPct} uyum
              </span>
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
      })}
    </div>
  );
}
