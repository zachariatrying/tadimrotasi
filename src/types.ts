export type CityName =
  | 'Tüm Türkiye'
  | 'İstanbul'
  | 'Ankara'
  | 'İzmir'
  | 'Gaziantep'
  | 'Antalya'
  | 'Bursa'
  | 'Adana'
  | 'Eskişehir'
  | 'Trabzon'
  | 'Konya'
  | 'Muğla'
  | 'Hatay'
  | 'Adıyaman'
  | 'Afyonkarahisar'
  | 'Ağrı'
  | 'Aksaray'
  | 'Amasya'
  | 'Ardahan'
  | 'Artvin'
  | 'Aydın'
  | 'Balıkesir'
  | 'Bartın'
  | 'Batman'
  | 'Bayburt'
  | 'Bilecik'
  | 'Bingöl'
  | 'Bitlis'
  | 'Bolu'
  | 'Burdur'
  | 'Çanakkale'
  | 'Çankırı'
  | 'Çorum'
  | 'Denizli'
  | 'Diyarbakır'
  | 'Düzce'
  | 'Edirne'
  | 'Elazığ'
  | 'Erzincan'
  | 'Erzurum'
  | 'Giresun'
  | 'Gümüşhane'
  | 'Hakkari'
  | 'Iğdır'
  | 'Isparta'
  | 'Kahramanmaraş'
  | 'Karabük'
  | 'Karaman'
  | 'Kars'
  | 'Kastamonu'
  | 'Kayseri'
  | 'Kırıkkale'
  | 'Kırklareli'
  | 'Kırşehir'
  | 'Kilis'
  | 'Kocaeli'
  | 'Kütahya'
  | 'Malatya'
  | 'Manisa'
  | 'Mardin'
  | 'Mersin'
  | 'Muş'
  | 'Nevşehir'
  | 'Niğde'
  | 'Ordu'
  | 'Osmaniye'
  | 'Rize'
  | 'Sakarya'
  | 'Samsun'
  | 'Siirt'
  | 'Sinop'
  | 'Sivas'
  | 'Şanlıurfa'
  | 'Şırnak'
  | 'Tekirdağ'
  | 'Tokat'
  | 'Tunceli'
  | 'Uşak'
  | 'Van'
  | 'Yalova'
  | 'Yozgat'
  | 'Zonguldak';

export type VenueCity = Exclude<CityName, 'Tüm Türkiye'>;

export type VenueCategory =
  | 'Esnaf Lokantası'
  | '3. Nesil Kahve'
  | 'Döner & Ocakbaşı'
  | 'Meyhane & Bistro'
  | 'Kahvaltı & Fırın'
  | 'Tatlı & Pastane'
  | 'Sokak Lezzeti';

export type SentimentTier = 'bayildim' | 'guzeldi' | 'idare';

export interface VenuePhoto {
  url: string;
  caption: string;
  source: 'Google Fotoğrafı' | 'Görselli Yorum' | 'Wikimedia Mekân' | 'Semt Görünümü' | 'Mutfak Fotoğrafı';
  attribution?: string;
}

export interface GoogleVisualReview {
  author: string;
  badge?: string;
  avatar?: string;
  relativeTime?: string;
  text: string;
  photos: string[];
}

export interface Venue {
  id: string;
  name: string;
  city: VenueCity;
  district: string;
  category: VenueCategory;
  priceTier: '₺' | '₺₺' | '₺₺₺';
  lat: number;
  lng: number;
  signatureDish: string;
  gpsVerified?: boolean;
  isLiveOsm?: boolean;
  address?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  cuisineTags?: string[];
  outdoorSeating?: boolean;
  osmImage?: string;
  wikimediaCommons?: string;
  wikidataId?: string;
  googleRating?: number;
  googleReviewCount?: number;
  googlePhotos?: string[];
  googleReviews?: GoogleVisualReview[];
  sourceUrl?: string;
  sourcePlatform?: 'Instagram Reels' | 'TikTok' | 'Arkadaş' | 'OpenStreetMap' | 'Google' | 'Manuel';
  note?: string;
}

export interface RankedVenue {
  venueId: string;
  tier: SentimentTier;
  rankIndex: number;
  score: number;
  visitedAt: string;
  personalNote: string;
}

export interface FriendProfile {
  id: string;
  name: string;
  handle: string;
  city: VenueCity;
  bio: string;
  avatarBg: string;
  ratings: Array<{ venueId: string; score: number; note: string }>;
}

export interface TadimState {
  venues: Venue[];
  ranked: RankedVenue[];
  wantToGoIds: string[];
}

export interface SharedListPayload {
  owner: string;
  createdAt: string;
  items: Array<{
    name: string;
    city: VenueCity;
    district: string;
    category: VenueCategory;
    priceTier: '₺' | '₺₺' | '₺₺₺';
    lat: number;
    lng: number;
    score: number;
    signatureDish: string;
  }>;
}
