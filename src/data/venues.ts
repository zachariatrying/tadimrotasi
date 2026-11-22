import type { CityName, FriendProfile, GoogleVisualReview, RankedVenue, Venue, VenueCategory, VenueCity } from '../types';
import harvestedRaw from './harvestedVenues.json';
import gmapsEnrichedRaw from './gmapsEnrichedVenues.json';

interface GmapsEnrichedEntry {
  lat?: number;
  lng?: number;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  photos?: string[];
  reviews?: GoogleVisualReview[];
}

const GMAPS_ENRICHED = gmapsEnrichedRaw as Record<string, GmapsEnrichedEntry>;

export const CITY_CENTERS: Record<CityName, { lat: number; lng: number; zoom: number }> = {
  'Tüm Türkiye': { lat: 39.05, lng: 34.4, zoom: 5.8 },
  İstanbul: { lat: 41.0244, lng: 28.9758, zoom: 15.5 }, // Karaköy & Galata 3D skyline
  Ankara: { lat: 39.9048, lng: 32.8608, zoom: 15.4 },   // Tunalı Hilmi & Kavaklıdere 3D
  İzmir: { lat: 38.4358, lng: 27.1428, zoom: 15.4 },    // Alsancak & Kordon 3D
  Gaziantep: { lat: 37.0632, lng: 37.3808, zoom: 15.4 },// Tarihi Uzun Çarşı 3D
  Antalya: { lat: 36.8848, lng: 30.7048, zoom: 15.4 },  // Kaleiçi & Yat Limanı 3D
  Bursa: { lat: 40.1844, lng: 29.0622, zoom: 15.4 },    // Hanlar Bölgesi & Koza Han 3D
  Adana: { lat: 36.9948, lng: 35.3228, zoom: 15.4 },    // Seyhan & Gazipaşa 3D
  Eskişehir: { lat: 39.7728, lng: 30.5205, zoom: 15.4 },// Odunpazarı & Porsuk 3D
  Trabzon: { lat: 41.0058, lng: 39.7269, zoom: 15.4 },  // Ortahisar Meydan 3D
  Konya: { lat: 37.8718, lng: 32.5018, zoom: 15.4 },    // Mevlana & Aziziye 3D
  Muğla: { lat: 37.0342, lng: 27.4285, zoom: 15.3 },    // Bodrum Marina 3D
  Hatay: { lat: 36.2028, lng: 36.1612, zoom: 15.4 },    // Antakya Uzun Çarşı 3D
};

export interface NeighborhoodHotspot {
  label: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const CITY_NEIGHBORHOODS: Partial<Record<CityName, NeighborhoodHotspot[]>> = {
  İstanbul: [
    { label: 'Karaköy · Galata', lat: 41.0244, lng: 28.9758, zoom: 15.7 },
    { label: 'Kadıköy · Moda', lat: 40.9882, lng: 29.0252, zoom: 15.7 },
    { label: 'Beşiktaş Çarşı', lat: 41.0434, lng: 29.0055, zoom: 15.7 },
    { label: 'Nişantaşı', lat: 41.0504, lng: 28.9936, zoom: 15.7 },
    { label: 'Beyoğlu · Pera', lat: 41.0328, lng: 28.9765, zoom: 15.7 },
    { label: 'Cihangir', lat: 41.0321, lng: 28.9839, zoom: 15.7 },
    { label: 'Sultanahmet · Fatih', lat: 41.0122, lng: 28.9735, zoom: 15.6 },
    { label: 'Bebek · Sahil', lat: 41.0774, lng: 29.0439, zoom: 15.6 },
    { label: 'Üsküdar · Kuzguncuk', lat: 41.0265, lng: 29.0165, zoom: 15.6 },
    { label: 'Bağdat Caddesi', lat: 40.9682, lng: 29.0685, zoom: 15.5 },
  ],
  Ankara: [
    { label: 'Tunalı · Kavaklıdere', lat: 39.9048, lng: 32.8608, zoom: 15.6 },
    { label: 'Kızılay', lat: 39.9208, lng: 32.8542, zoom: 15.6 },
    { label: 'Bahçelievler 7. Cd', lat: 39.9218, lng: 32.8224, zoom: 15.6 },
    { label: 'Gaziosmanpaşa', lat: 39.8944, lng: 32.8712, zoom: 15.6 },
    { label: 'Çayyolu', lat: 39.8875, lng: 32.6985, zoom: 15.4 },
  ],
  İzmir: [
    { label: 'Alsancak · Kordon', lat: 38.4358, lng: 27.1428, zoom: 15.7 },
    { label: 'Bostanlı · Karşıyaka', lat: 38.4555, lng: 27.0995, zoom: 15.6 },
    { label: 'Kemeraltı · Konak', lat: 38.4205, lng: 27.1332, zoom: 15.6 },
    { label: 'Urla', lat: 38.3232, lng: 26.7648, zoom: 15.3 },
  ],
};

export const CITY_TABS: CityName[] = [
  'Tüm Türkiye',
  'İstanbul',
  'Ankara',
  'İzmir',
  'Gaziantep',
  'Antalya',
  'Bursa',
  'Adana',
  'Eskişehir',
  'Trabzon',
  'Konya',
  'Muğla',
  'Hatay',
];

export const VENUE_CITIES: VenueCity[] = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Gaziantep',
  'Antalya',
  'Bursa',
  'Adana',
  'Eskişehir',
  'Trabzon',
  'Konya',
  'Muğla',
  'Hatay',
];

export const VENUE_CATEGORIES: VenueCategory[] = [
  'Esnaf Lokantası',
  '3. Nesil Kahve',
  'Döner & Ocakbaşı',
  'Meyhane & Bistro',
  'Kahvaltı & Fırın',
  'Tatlı & Pastane',
  'Sokak Lezzeti',
];

const RAW_CURATED_VENUES: Venue[] = [
  // ==================== İSTANBUL (46) ====================
  { id: 'v-ciya', name: 'Çiya Sofrası', city: 'İstanbul', district: 'Kadıköy', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 40.9896, lng: 29.0243, gpsVerified: true, address: 'Caferağa Mah. Güneşli Bahçe Sk. No:43, Kadıköy', openingHours: '11:00–22:00', signatureDish: 'Anadolu tencere yemekleri, içli köfte, vişneli kebap' },
  { id: 'v-gulluoglu', name: 'Karaköy Güllüoğlu', city: 'İstanbul', district: 'Karaköy', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 41.0235, lng: 28.9786, gpsVerified: true, address: 'Kemankeş Karamustafapaşa, Rıhtım Cd. No:3-4, Beyoğlu', openingHours: '07:00–00:00', signatureDish: 'Fıstıklı kare baklava, şöbiyet ve dolama' },
  { id: 'v-bayramoglu', name: 'Bayramoğlu Döner', city: 'İstanbul', district: 'Kavacık', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 41.0909, lng: 29.0933, gpsVerified: true, address: 'Rüzgarlıbahçe Mah. Cumhuriyet Cd. No:2, Beykoz', openingHours: '11:00–22:00', signatureDish: 'Odun ateşinde yaprak döner ve sıcak lavaş' },
  { id: 'v-montag', name: 'Montag Coffee Roasters', city: 'İstanbul', district: 'Kadıköy', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 40.9862, lng: 29.0268, gpsVerified: true, address: 'Caferağa Mah. Muvakkithane Cd. No:16, Kadıköy', openingHours: '08:30–22:00', signatureDish: 'V60 filtre kahve & bademli kruvasan' },
  { id: 'v-petra', name: 'Petra Roasting Co.', city: 'İstanbul', district: 'Gayrettepe', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 41.0695, lng: 29.0091, gpsVerified: true, address: 'Hoşsohbet Sk. Selenium Residence, Gayrettepe', openingHours: '08:00–19:30', signatureDish: 'Acme espresso blend & ekşi maya kahvaltı' },
  { id: 'v-cavit', name: 'Asmalı Cavit', city: 'İstanbul', district: 'Beyoğlu', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 41.0309, lng: 28.9744, gpsVerified: true, address: 'Asmalı Mescit Cd. No:16/D, Beyoğlu', openingHours: '14:00–00:00', signatureDish: 'Lakerda, ızgara köfte ve yaprak ciğer' },
  { id: 'v-aheste', name: 'Aheste Pera', city: 'İstanbul', district: 'Pera', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 41.0322, lng: 28.9732, gpsVerified: true, address: 'Meşrutiyet Cd. No:107/F, Beyoğlu', openingHours: '17:30–23:30', signatureDish: 'Modern mevsimsel meze tadım menüsü', sourcePlatform: 'Instagram Reels', sourceUrl: 'https://instagram.com/reel/aheste-pera' },
  { id: 'v-kronotrop', name: 'Kronotrop Cihangir', city: 'İstanbul', district: 'Cihangir', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 41.0327, lng: 28.9838, gpsVerified: true, address: 'Firuzağa Mah. Defterdar Yokuşu, Beyoğlu', openingHours: '08:00–21:00', signatureDish: 'Cold brew & tek kökenli Etiyopya demleme', sourcePlatform: 'TikTok' },
  { id: 'v-karakoylok', name: 'Karaköy Lokantası', city: 'İstanbul', district: 'Karaköy', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 41.0231, lng: 28.9765, gpsVerified: true, address: 'Kemankeş Cd. No:57, Karaköy', openingHours: '12:00–23:30', signatureDish: 'Öğlen esnaf tenceresi, akşam turkuaz çinili meze' },
  { id: 'v-pandeli', name: 'Pandeli Lokantası', city: 'İstanbul', district: 'Eminönü', category: 'Esnaf Lokantası', priceTier: '₺₺₺', lat: 41.0165, lng: 28.9706, gpsVerified: true, address: 'Mısır Çarşısı Girişi Üst Kat No:1, Fatih', openingHours: '11:30–19:00', signatureDish: 'Hünkar beğendi, patlıcanlı börek ve ayva tatlısı' },
  { id: 'v-kanaat', name: 'Kanaat Lokantası', city: 'İstanbul', district: 'Üsküdar', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 41.0254, lng: 29.0155, gpsVerified: true, address: 'Sultantepe Mah. Selmanipak Cd. No:9, Üsküdar', openingHours: '06:00–22:00', signatureDish: 'Kuzu incik, elbasan tava ve kendi üretimi dondurma' },
  { id: 'v-hunkar', name: 'Hünkar Lokantası', city: 'İstanbul', district: 'Nişantaşı', category: 'Esnaf Lokantası', priceTier: '₺₺₺', lat: 41.0504, lng: 28.9936, gpsVerified: true, address: 'Harbiye Mah. Mim Kemal Öke Cd. No:21, Şişli', openingHours: '11:30–22:30', signatureDish: 'Hünkar beğendi, zeytinyağlı enginar ve süt helvası' },
  { id: 'v-alibaba', name: 'Ali Baba Kanaat (Süleymaniye)', city: 'İstanbul', district: 'Fatih', category: 'Esnaf Lokantası', priceTier: '₺', lat: 41.0161, lng: 28.9632, gpsVerified: true, address: 'Prof. Sıddık Sami Onar Cd. No:11, Süleymaniye', openingHours: '11:00–21:00', signatureDish: 'İspir kuru fasulye, tereyağlı pilav ve manda yoğurdu' },
  { id: 'v-sahinustadoner', name: 'Dönerci Şahin Usta', city: 'İstanbul', district: 'Kapalıçarşı', category: 'Sokak Lezzeti', priceTier: '₺', lat: 41.0108, lng: 28.9682, gpsVerified: true, address: 'Mollafenari, Kılıçcılar Sk. No:5, Fatih', openingHours: '11:00–17:00', signatureDish: 'Pide arası yaprak döner ve ev yapımı ayran' },
  { id: 'v-tatarsalim', name: 'Tatar Salim Döner', city: 'İstanbul', district: 'Ataşehir', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 40.9921, lng: 29.1049, gpsVerified: true, address: 'Küçükbakkalköy, Dereboyu Cd., Ataşehir', openingHours: '11:30–22:00', signatureDish: 'İnce kesim et döner, patates ve açık ayran' },
  { id: 'v-kalkanoglu', name: 'Tarihi Kalkanoğlu Pilavcısı', city: 'İstanbul', district: 'Beyoğlu', category: 'Sokak Lezzeti', priceTier: '₺', lat: 41.0338, lng: 28.9776, gpsVerified: true, address: 'Ayhan Işık Sk. No:16, Beyoğlu', openingHours: '11:30–21:30', signatureDish: 'Kemik sulu pilav, kavurma ve kuru üzüm hoşafı' },
  { id: 'v-vankahvalti', name: 'Van Kahvaltı Evi', city: 'İstanbul', district: 'Cihangir', category: 'Kahvaltı & Fırın', priceTier: '₺₺', lat: 41.0315, lng: 28.9831, gpsVerified: true, address: 'Defterdar Yokuşu No:52/A, Cihangir', openingHours: '07:00–17:00', signatureDish: 'Otlu peynir, kavut, murtuğa ve bal kaymak' },
  { id: 'v-kalecafe', name: 'Kale Cafe', city: 'İstanbul', district: 'Rumelihisarı', category: 'Kahvaltı & Fırın', priceTier: '₺₺', lat: 41.0846, lng: 29.0566, gpsVerified: true, address: 'Yahya Kemal Cd. No:10, Sarıyer', openingHours: '07:00–22:00', signatureDish: 'Boğaz kıyısında menemen, bazlama ve pişi' },
  { id: 'v-normcoffee', name: 'Norm Coffee', city: 'İstanbul', district: 'Cihangir', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 41.0321, lng: 28.9845, gpsVerified: true, address: 'Güneşli Sk. No:39/A, Cihangir', openingHours: '08:30–19:30', signatureDish: 'Minimalist bar, flat white ve havuçlu kek' },
  { id: 'v-federal', name: 'Federal Coffee Galata', city: 'İstanbul', district: 'Galata', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 41.0256, lng: 28.9742, gpsVerified: true, address: 'Küçük Hendek Cd. No:7, Beyoğlu', openingHours: '08:00–23:00', signatureDish: 'Avustralya tarzı kahve ve ekşi maya tost' },
  { id: 'v-baylan', name: 'Baylan Pastanesi', city: 'İstanbul', district: 'Kadıköy', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 40.9901, lng: 29.0235, gpsVerified: true, address: 'Muvakkithane Cd. No:9/A, Kadıköy', openingHours: '08:00–22:00', signatureDish: 'Tarihi Kup Griye ve krokanlı adisababa' },
  { id: 'v-inci', name: 'İnci Pastanesi', city: 'İstanbul', district: 'Beyoğlu', category: 'Tatlı & Pastane', priceTier: '₺', lat: 41.0347, lng: 28.9791, gpsVerified: true, address: 'Mis Sk. No:18/A, Beyoğlu', openingHours: '09:00–22:00', signatureDish: 'Klasik bol çikolatalı profiterol' },
  { id: 'v-zubeyir', name: 'Zübeyir Ocakbaşı', city: 'İstanbul', district: 'Beyoğlu', category: 'Döner & Ocakbaşı', priceTier: '₺₺₺', lat: 41.0341, lng: 28.9818, gpsVerified: true, address: 'Bekar Sk. No:28, Taksim', openingHours: '12:00–00:00', signatureDish: 'Ateş başında çöp şiş, kaburga ve gavurdağı' },
  { id: 'v-mavra', name: 'Mavra Cafe & Design', city: 'İstanbul', district: 'Galata', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 41.0268, lng: 28.9739, gpsVerified: true, address: 'Serdar-ı Ekrem Cd. No:31/A, Galata', openingHours: '09:30–23:30', signatureDish: 'Sıcak mahalle atmosferi, latte ve ev kekleri' },
  { id: 'v-kizilkayalar', name: 'Kızılkayalar Islak Hamburger', city: 'İstanbul', district: 'Taksim', category: 'Sokak Lezzeti', priceTier: '₺', lat: 41.0366, lng: 28.9841, gpsVerified: true, address: 'Sıraselviler Cd. No:2/C, Taksim', openingHours: '24 saat açık', signatureDish: 'Gece klasiği sarımsaklı domates soslu ıslak hamburger' },
  { id: 'v-basta', name: 'Basta! Street Food Bar', city: 'İstanbul', district: 'Kadıköy', category: 'Sokak Lezzeti', priceTier: '₺₺', lat: 40.9869, lng: 29.0255, gpsVerified: true, address: 'Sakız Sk. No:1, Moda / Kadıköy', openingHours: '12:00–22:00', signatureDish: 'Kuzu dürüm, humus ve fırın sütlaç' },
  { id: 'v-sultanahmetkofte', name: 'Tarihi Sultanahmet Köftecisi', city: 'İstanbul', district: 'Sultanahmet', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 41.0085, lng: 28.9762, gpsVerified: true, address: 'Divanyolu Cd. No:12, Fatih', openingHours: '11:00–22:30', signatureDish: '1920’den beri ızgara köfte, piyaz ve irmik helvası' },
  { id: 'v-hafizmustafa', name: 'Hafız Mustafa 1864', city: 'İstanbul', district: 'Sirkeci', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 41.0149, lng: 28.9764, gpsVerified: true, address: 'Hocapaşa, Muradiye Cd. No:51, Fatih', openingHours: '07:00–01:00', signatureDish: 'Fıstıklı baklava, künefe, kazandibi ve Türk kahvesi' },
  { id: 'v-haciabdullah', name: 'Hacı Abdullah Lokantası', city: 'İstanbul', district: 'Beyoğlu', category: 'Esnaf Lokantası', priceTier: '₺₺₺', lat: 41.0349, lng: 28.9781, gpsVerified: true, address: 'Atıf Yılmaz Cd. No:9/A, Taksim', openingHours: '11:30–23:00', signatureDish: 'Osmanlı-Türk saray mutfağı, komposto ve kuzu tandır' },
  { id: 'v-beyti', name: 'Beyti Florya', city: 'İstanbul', district: 'Florya', category: 'Döner & Ocakbaşı', priceTier: '₺₺₺', lat: 40.9746, lng: 28.7867, gpsVerified: true, address: 'Orman Sk. No:8, Florya / Bakırköy', openingHours: '11:30–23:00', signatureDish: 'Orijinal Beyti kebabı ve odun kömüründe pirzola' },
  { id: 'v-karadenizdoner', name: 'Karadeniz Döner Asım Usta', city: 'İstanbul', district: 'Beşiktaş', category: 'Sokak Lezzeti', priceTier: '₺', lat: 41.0431, lng: 29.0059, gpsVerified: true, address: 'Sinanpaşa, Mumcu Bakkal Sk. No:6, Beşiktaş', openingHours: '10:30–17:00', signatureDish: 'Beşiktaş Çarşı’da yaprak döner kuyruğu' },
  { id: 'v-cakmakkahvalti', name: 'Çakmak Kahvaltı Salonu', city: 'İstanbul', district: 'Beşiktaş', category: 'Kahvaltı & Fırın', priceTier: '₺', lat: 41.0436, lng: 29.0046, gpsVerified: true, address: 'Çelebioğlu Sk. No:8, Kahvaltıcılar Sokağı', openingHours: '07:00–17:00', signatureDish: 'Bal-kaymak, kaşarlı menemen ve sıcak simit' },
  { id: 'v-neolokal', name: 'Neolokal (Salt Galata)', city: 'İstanbul', district: 'Karaköy', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 41.0239, lng: 28.9735, gpsVerified: true, address: 'Bankalar Cd. No:11, Salt Galata', openingHours: '18:00–23:30', signatureDish: 'Michelin yıldızlı modern Anadolu tadım menüsü' },
  { id: 'v-mikla', name: 'Mikla Restaurant', city: 'İstanbul', district: 'Beyoğlu', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 41.0315, lng: 28.9749, gpsVerified: true, address: 'The Marmara Pera, Meşrutiyet Cd. No:15', openingHours: '18:00–23:30', signatureDish: 'Yeni Anadolu mutfağı ve panoramik İstanbul manzarası' },
  { id: 'v-turkfatih', name: 'TURK Fatih Tutak', city: 'İstanbul', district: 'Bomonti', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 41.0589, lng: 28.9794, gpsVerified: true, address: 'Cumhuriyet, Silahşör Cd., Bomonti / Şişli', openingHours: '18:30–23:00', signatureDish: '2 Michelin yıldızlı yaratıcı Türk şef mutfağı' },
  { id: 'v-mangerie', name: 'Mangerie Bebek', city: 'İstanbul', district: 'Bebek', category: 'Kahvaltı & Fırın', priceTier: '₺₺₺', lat: 41.0771, lng: 29.0438, gpsVerified: true, address: 'Cevdet Paşa Cd. No:69, Bebek', openingHours: '08:00–23:00', signatureDish: 'Boğaz terasında eggs benedict ve pankek' },
  { id: 'v-bebekbadem', name: 'Bebek Waffle & Abbas', city: 'İstanbul', district: 'Bebek', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 41.0778, lng: 29.0442, gpsVerified: true, address: 'Cevdet Paşa Cd., Bebek Sahili', openingHours: '10:00–02:00', signatureDish: 'Gece yürüyüşü klasiği taze waffle' },
  { id: 'v-sariyerborek', name: 'Tarihi Sarıyer Börekçisi', city: 'İstanbul', district: 'Sarıyer', category: 'Kahvaltı & Fırın', priceTier: '₺', lat: 41.1681, lng: 29.0558, gpsVerified: true, address: 'Yeni Mahalle Cd. No:28, Sarıyer', openingHours: '05:30–18:00', signatureDish: 'Kuş üzümlü kıymalı ve peynirli kol böreği' },
  { id: 'v-yanyali', name: 'Yanyalı Fehmi Lokantası', city: 'İstanbul', district: 'Kadıköy', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 40.9906, lng: 29.0239, gpsVerified: true, address: 'Osmanağa, Yağlıkçı İsmail Sk. No:1, Kadıköy', openingHours: '11:30–22:00', signatureDish: 'Yanya köftesi, kuzu haşlama ve irmik helvası' },
  { id: 'v-halil-lahmacun', name: 'Halil Lahmacun', city: 'İstanbul', district: 'Kadıköy', category: 'Sokak Lezzeti', priceTier: '₺', lat: 40.9899, lng: 29.0241, gpsVerified: true, address: 'Güneşli Bahçe Sk. No:26, Kadıköy Çarşı', openingHours: '10:30–21:00', signatureDish: 'İncecik çıtır taş fırın lahmacun ve açık ayran' },
  { id: 'v-fasuli', name: 'Fasuli Lokantaları', city: 'İstanbul', district: 'Tophane', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 41.0265, lng: 28.9814, gpsVerified: true, address: 'Kılıçali Paşa, Kemeraltı Cd. No:52, Beyoğlu', openingHours: '11:00–22:30', signatureDish: 'Çayeli kuru fasulye, laz böreği ve turşu kavurma' },
  { id: 'v-develi', name: 'Develi Samatya', city: 'İstanbul', district: 'Samatya', category: 'Döner & Ocakbaşı', priceTier: '₺₺₺', lat: 41.0005, lng: 28.9329, gpsVerified: true, address: 'Gümüşyüzük Sk. No:7, Samatya / Fatih', openingHours: '11:30–23:30', signatureDish: '1912’den beri fıstıklı kebap ve çiğ köfte' },
  { id: 'v-storycoffee', name: 'Story Coffee Roasters', city: 'İstanbul', district: 'Moda', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 40.9844, lng: 29.0281, gpsVerified: true, address: 'Dalga Sk. No:22, Moda / Kadıköy', openingHours: '08:30–22:00', signatureDish: 'Özel kavrum espresso ve ev yapımı tartlar' },
  { id: 'v-espresso-lab', name: 'Espressolab Roastery', city: 'İstanbul', district: 'Merter', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 41.0091, lng: 28.8919, gpsVerified: true, address: 'Tozkoparan, General Ali Rıza Gürcan Cd., Güngören', openingHours: '07:30–00:00', signatureDish: 'Avrupa’nın en büyük kahve kavurma deneyimi' },
  { id: 'v-balkon-balikekmek', name: 'Tarihi Eminönü Balık Ekmek', city: 'İstanbul', district: 'Eminönü', category: 'Sokak Lezzeti', priceTier: '₺', lat: 41.0176, lng: 28.9708, gpsVerified: true, address: 'Galata Köprüsü Eminönü İskelesi', openingHours: '10:00–23:00', signatureDish: 'Izgara uskumru ekmek arası ve turşu suyu' },
  { id: 'v-modadondurma', name: 'Dondurmacı Ali Usta', city: 'İstanbul', district: 'Moda', category: 'Tatlı & Pastane', priceTier: '₺', lat: 40.9841, lng: 29.0261, gpsVerified: true, address: 'Moda Cd. No:176, Kadıköy', openingHours: '10:00–00:00', signatureDish: 'Karadutlu, kavunlu ve sakızlı taze dondurma' },

  // ==================== ANKARA (15) ====================
  { id: 'v-pecenek', name: 'Peçenek Döner', city: 'Ankara', district: 'Çankaya', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 39.8981, lng: 32.8617, gpsVerified: true, address: 'Cinnah Cd. / Çankaya', openingHours: '11:00–22:00', signatureDish: 'Ankara usulü yaprak et döner' },
  { id: 'v-trilye', name: 'Trilye Restoran', city: 'Ankara', district: 'GOP', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 39.8944, lng: 32.8712, gpsVerified: true, address: 'Kuleli Sk. No:32, Gaziosmanpaşa', openingHours: '12:00–23:30', signatureDish: 'Taze deniz ürünleri ve avokadolu karides', sourcePlatform: 'Arkadaş' },
  { id: 'v-bogazici-ank', name: 'Boğaziçi Lokantası', city: 'Ankara', district: 'Ulus', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 39.9412, lng: 32.8548, gpsVerified: true, address: 'Denizciler Cd. No:1/C, Ulus', openingHours: '11:00–21:00', signatureDish: 'Ankara tava, kuzu tandır ve ekmek kadayıfı' },
  { id: 'v-haciarif', name: 'Hacı Arif Bey', city: 'Ankara', district: 'Çankaya', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 39.9035, lng: 32.8588, gpsVerified: true, address: 'Güniz Sk. No:48, Kavaklıdere', openingHours: '11:30–23:00', signatureDish: 'Beyti kebap, içli köfte ve sıcak lavaş' },
  { id: 'v-aspava', name: 'Yıldız Aspava', city: 'Ankara', district: 'Esat', category: 'Sokak Lezzeti', priceTier: '₺₺', lat: 39.9061, lng: 32.8669, gpsVerified: true, address: 'Esat Cd., Küçükesat', openingHours: '24 saat açık', signatureDish: 'SSK dürüm, sınırsız ikram salata ve irmik helvası' },
  { id: 'v-paper-ank', name: 'Paper Roasting Coffee', city: 'Ankara', district: 'Bahçelievler', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 39.9218, lng: 32.8224, gpsVerified: true, address: '7. Cadde civarı, Bahçelievler', openingHours: '08:30–23:00', signatureDish: 'Kendi kavrumu filtre kahve ve san sebastian' },
  { id: 'v-rubbersoul', name: 'Rubber Soul Coffee', city: 'Ankara', district: 'Tunalı', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 39.9052, lng: 32.8605, gpsVerified: true, address: 'Bestekar Cd., Kavaklıdere', openingHours: '09:00–22:30', signatureDish: 'Cortado, cold brew ve taze poğaça' },
  { id: 'v-kitir', name: 'Kıtır', city: 'Ankara', district: 'Tunalı', category: 'Sokak Lezzeti', priceTier: '₺', lat: 39.9041, lng: 32.8612, gpsVerified: true, address: 'Tunalı Hilmi Cd. No:114/K', openingHours: '10:00–02:00', signatureDish: 'Klasik Ankara kokoreç ve çıtır kumpir' },
  { id: 'v-duveroglu', name: 'Düveroğlu Kebap', city: 'Ankara', district: 'Kızılay', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 39.9225, lng: 32.8505, gpsVerified: true, address: 'Gençlik Cd. No:28, Anıttepe', openingHours: '11:00–22:30', signatureDish: 'Gaziantep lahmacun, patlıcan kebabı ve künefe' },
  { id: 'v-masabasi', name: 'Masabaşı Kebapçısı', city: 'Ankara', district: 'Çayyolu', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 39.8891, lng: 32.6952, gpsVerified: true, address: 'Ahmet Taner Kışlalı, Çayyolu', openingHours: '11:30–23:00', signatureDish: 'Zırh kıyması Adana ve fındık lahmacun' },
  { id: 'v-meshurtavaci', name: 'Tavacı Recep Usta', city: 'Ankara', district: 'Çankaya', category: 'Döner & Ocakbaşı', priceTier: '₺₺₺', lat: 39.8825, lng: 32.8598, gpsVerified: true, address: 'Dikmen Vadisi, Çankaya', openingHours: '11:30–23:30', signatureDish: 'Kaburga dolması, sac tava ve haşlama içli köfte' },
  { id: 'v-liva', name: 'Liva Pastanesi', city: 'Ankara', district: 'Çankaya', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 39.9022, lng: 32.8594, gpsVerified: true, address: 'Tunalı Hilmi Cd., Kavaklıdere', openingHours: '07:30–23:00', signatureDish: 'Çikolatalı yaş pasta, ekler ve taze poğaça' },
  { id: 'v-haci-baba', name: 'Cici Piknik', city: 'Ankara', district: 'Kızılay', category: 'Sokak Lezzeti', priceTier: '₺', lat: 39.9206, lng: 32.8549, gpsVerified: true, address: 'Atatürk Bulvarı, Kızılay', openingHours: '08:00–23:00', signatureDish: '1965’ten beri Ankara klasiği döner sandviç' },
  { id: 'v-kafesfirin', name: 'Kafes Fırın', city: 'Ankara', district: 'Çayyolu', category: 'Kahvaltı & Fırın', priceTier: '₺₺', lat: 39.8861, lng: 32.7014, gpsVerified: true, address: 'Park Caddesi, Çayyolu', openingHours: '07:30–22:00', signatureDish: 'Ekşi maya ekmekler, kruvasan ve serpme kahvaltı' },
  { id: 'v-kalbur', name: 'Kalbur Balık', city: 'Ankara', district: 'Oran', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 39.8565, lng: 32.8511, gpsVerified: true, address: 'Oran Çarşısı, Çankaya', openingHours: '12:00–23:30', signatureDish: 'Fener kavurma, ahtapot ızgara ve deniz mahsulleri' },

  // ==================== İZMİR (14) ====================
  { id: 'v-dostlar', name: 'Alsancak Dostlar Fırını', city: 'İzmir', district: 'Alsancak', category: 'Kahvaltı & Fırın', priceTier: '₺', lat: 38.4369, lng: 27.1438, gpsVerified: true, address: 'Kıbrıs Şehitleri Cd. No:120, Konak', openingHours: '06:30–20:00', signatureDish: 'Sıcak boyoz ve fırınlanmış yumurta' },
  { id: 'v-odurla', name: 'OD Urla', city: 'İzmir', district: 'Urla', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 38.3229, lng: 26.7647, gpsVerified: true, address: 'Rüstem Mah. Süt Pınarı Mevkii, Urla', openingHours: '12:30–23:30', signatureDish: 'Odun ateşinde Ege tarladan sofraya tadım', sourcePlatform: 'Instagram Reels' },
  { id: 'v-teruar', name: 'Teruar Urla', city: 'İzmir', district: 'Urla', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 38.3168, lng: 26.7591, gpsVerified: true, address: 'Kuşçular Mah. 8028 Sk., Urla', openingHours: '13:00–23:00', signatureDish: 'Bağlar arasında mevsimsel Ege şef menüsü' },
  { id: 'v-hiclokanta', name: 'Hiç Lokanta', city: 'İzmir', district: 'Urla', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 38.3238, lng: 26.7654, gpsVerified: true, address: 'Zafer Cd. No:52, Urla Sanat Sokağı', openingHours: '11:30–22:00', signatureDish: 'Yenilebilir Ege otları ve kendi zeytinyağları' },
  { id: 'v-denizrest', name: 'Deniz Restaurant', city: 'İzmir', district: 'Kordon', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 38.4342, lng: 27.1391, gpsVerified: true, address: 'Atatürk Cd. No:188/B, Kordon', openingHours: '12:00–00:00', signatureDish: 'Kordon gün batımında taze lagos ve deniz börülcesi' },
  { id: 'v-baristocrat', name: 'Baristocrat 3rd Wave', city: 'İzmir', district: 'Alsancak', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 38.4351, lng: 27.1445, gpsVerified: true, address: '1482 Sk. No:8/A, Alsancak', openingHours: '08:30–23:00', signatureDish: 'Nitelikli çekirdek kavrumu ve pour-over bar' },
  { id: 'v-poka', name: 'Poka Coffee Roasters', city: 'İzmir', district: 'Bostanlı', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 38.4552, lng: 27.0982, gpsVerified: true, address: 'Cemal Gürsel Cd., Bostanlı / Karşıyaka', openingHours: '08:30–23:00', signatureDish: 'Bostanlı’nın en dengeli espresso ve matcha barı' },
  { id: 'v-reyhan', name: 'Reyhan Pastanesi', city: 'İzmir', district: 'Alsancak', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 38.4359, lng: 27.1422, gpsVerified: true, address: 'Dr. Mustafa Enver Bey Cd. No:24, Alsancak', openingHours: '08:00–22:30', signatureDish: 'Çilekli milföy, kestaneli pasta ve sakızlı kurabiye' },
  { id: 'v-topcu', name: 'Topçu Restoran', city: 'İzmir', district: 'Çankaya', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 38.4235, lng: 27.1362, gpsVerified: true, address: 'Şehit Fethi Bey Cd. No:31, Konak', openingHours: '11:30–22:30', signatureDish: '1957’den beri İzmir çöp şiş ve piyaz' },
  { id: 'v-kumrucu', name: 'Kumrucu Şevki', city: 'İzmir', district: 'Bostanlı', category: 'Sokak Lezzeti', priceTier: '₺', lat: 38.4561, lng: 27.1011, gpsVerified: true, address: 'Cemal Gürsel Cd., Bostanlı', openingHours: '09:00–02:00', signatureDish: 'Kömür ateşinde erimiş tulum peynirli kumru' },
  { id: 'v-adillokanta', name: 'Adil Müftüoğlu (Uğur Lokantası)', city: 'İzmir', district: 'Çankaya', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 38.4258, lng: 27.1376, gpsVerified: true, address: '1369 Sk. No:57, Çankaya / Konak', openingHours: '11:00–19:30', signatureDish: 'Kuzu elbasan tava, şevketi bostan ve ayva tatlısı' },
  { id: 'v-kokorecciasim', name: 'Kokoreççi Asım Usta', city: 'İzmir', district: 'Bornova', category: 'Sokak Lezzeti', priceTier: '₺', lat: 38.4622, lng: 27.2134, gpsVerified: true, address: 'Çamdibi, Burak Reis Cd. No:226, Bornova', openingHours: '12:00–01:00', signatureDish: 'İri kıyım İzmir usulü kuzu kokoreç' },
  { id: 'v-sevinçpastanesi', name: 'Sevinç Pastanesi', city: 'İzmir', district: 'Alsancak', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 38.4362, lng: 27.1419, gpsVerified: true, address: 'Ali Çetinkaya Bulvarı No:27, Alsancak', openingHours: '07:30–23:30', signatureDish: 'İzmir buluşma noktası, profiterol ve tiramisu' },
  { id: 'v-bizimlokanta-kemeralti', name: 'Bizim Lokanta', city: 'İzmir', district: 'Kemeraltı', category: 'Esnaf Lokantası', priceTier: '₺', lat: 38.4191, lng: 27.1319, gpsVerified: true, address: 'Kemeraltı Çarşısı, Konak', openingHours: '11:00–17:00', signatureDish: 'Tereyağlı kuzu haşlama ve zeytinyağlı enginar' },

  // ==================== GAZİANTEP (8) ====================
  { id: 'v-imamcagdas', name: 'İmam Çağdaş', city: 'Gaziantep', district: 'Şahinbey', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 37.0628, lng: 37.3812, gpsVerified: true, address: 'Uzun Çarşı No:49, Şahinbey', openingHours: '08:00–22:00', signatureDish: 'Ali Nazik kebabı ve havuç dilimi baklava' },
  { id: 'v-halilusta', name: 'Küşlemeci Halil Usta', city: 'Gaziantep', district: 'Şehitkamil', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 37.0748, lng: 37.3849, gpsVerified: true, address: 'Karşıyaka, Tekel Cd. No:6, Şehitkamil', openingHours: '11:00–17:30', signatureDish: 'Sadece kuzu küşleme, simit kebabı ve kaşık salata' },
  { id: 'v-metanet', name: 'Metanet Lokantası', city: 'Gaziantep', district: 'Şahinbey', category: 'Esnaf Lokantası', priceTier: '₺', lat: 37.0619, lng: 37.3821, gpsVerified: true, address: 'Kozluca Mah. Kozluca Cd. No:11', openingHours: '05:30–18:00', signatureDish: 'Sabah 06:00’da harlı ateşte beyran çorbası' },
  { id: 'v-kocak', name: 'Koçak Baklava', city: 'Gaziantep', district: 'Şehitkamil', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 37.0714, lng: 37.3679, gpsVerified: true, address: 'Ali Fuat Cebesoy Blv. No:31', openingHours: '07:30–22:30', signatureDish: 'Özel kare baklava ve şöbiyet' },
  { id: 'v-zekiinal', name: 'Zeki İnal Baklava', city: 'Gaziantep', district: 'Şahinbey', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 37.0638, lng: 37.3765, gpsVerified: true, address: 'Atatürk Bulvarı No:38', openingHours: '08:00–21:30', signatureDish: 'Kuru şöbiyet ve tereyağlı fıstık dolama' },
  { id: 'v-orkide', name: 'Orkide Pastanesi', city: 'Gaziantep', district: 'Şehitkamil', category: 'Kahvaltı & Fırın', priceTier: '₺₺', lat: 37.0702, lng: 37.3712, gpsVerified: true, address: 'Değirmiçem Mah., Şehitkamil', openingHours: '07:00–22:00', signatureDish: 'Sıcak Antep katmeri ve zengin yöresel kahvaltı' },
  { id: 'v-katmercizekeriya', name: 'Katmerci Zekeriya Usta', city: 'Gaziantep', district: 'Şahinbey', category: 'Tatlı & Pastane', priceTier: '₺', lat: 37.0632, lng: 37.3792, gpsVerified: true, address: 'Çukur Mah. B. Pasajı No:16', openingHours: '06:30–14:00', signatureDish: 'Sabah sıcak kaymaklı Antep fıstıklı katmer' },
  { id: 'v-asina', name: 'Aşina Gaziantep Mutfağı', city: 'Gaziantep', district: 'Şehitkamil', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 37.0728, lng: 37.3665, gpsVerified: true, address: 'Mücahitler Mah. Ali Fuat Cebesoy Blv.', openingHours: '11:00–22:00', signatureDish: 'Yuvalama, kuru patlıcan dolması ve firik pilavı' },

  // ==================== ANTALYA (7) ====================
  { id: 'v-7mehmet', name: '7 Mehmet', city: 'Antalya', district: 'Muratpaşa', category: 'Esnaf Lokantası', priceTier: '₺₺₺', lat: 36.8832, lng: 30.6761, gpsVerified: true, address: 'Meltem, Atatürk Kültür Parkı No:201', openingHours: '11:30–23:30', signatureDish: 'Bademli iç pilav, kuzu tandır ve tahinli kabak tatlısı', sourcePlatform: 'Instagram Reels' },
  { id: 'v-piyazciahmet', name: 'Piyazcı Ahmet', city: 'Antalya', district: 'Muratpaşa', category: 'Esnaf Lokantası', priceTier: '₺', lat: 36.8902, lng: 30.6968, gpsVerified: true, address: 'Elmalı Mah. 21. Sk., Muratpaşa', openingHours: '11:00–20:00', signatureDish: 'Tahinli Antalya piyazı ve kömürde köfte' },
  { id: 'v-sisciramazan', name: 'Şişçi Ramazan', city: 'Antalya', district: 'Kepez', category: 'Döner & Ocakbaşı', priceTier: '₺', lat: 36.9061, lng: 30.7135, gpsVerified: true, address: 'Kızılırmak Cd., Muratpaşa / Kepez', openingHours: '11:00–22:00', signatureDish: 'Antalya usulü şiş köfte ve tahinli piyaz' },
  { id: 'v-vanilla', name: 'Vanilla Lounge', city: 'Antalya', district: 'Kaleiçi', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 36.8842, lng: 30.7044, gpsVerified: true, address: 'Hesapçı Sk. No:33, Kaleiçi', openingHours: '12:00–23:30', signatureDish: 'Tarihi Kaleiçi konağında Akdeniz bistrosu' },
  { id: 'v-sudd', name: 'The Sudd Coffee', city: 'Antalya', district: 'Konyaaltı', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 36.8675, lng: 30.6422, gpsVerified: true, address: 'Arapsuyu, Konyaaltı Sahili', openingHours: '08:00–23:00', signatureDish: 'Özel kavrum soğuk demleme ve granola kase' },
  { id: 'v-akdenizdondurma', name: 'Akdeniz Dondurma', city: 'Antalya', district: 'Muratpaşa', category: 'Tatlı & Pastane', priceTier: '₺', lat: 36.8878, lng: 30.7014, gpsVerified: true, address: 'Işıklar Cd., Muratpaşa', openingHours: '09:00–00:00', signatureDish: 'Yanıksı keçi sütlü ve turunç reçelli dondurma' },
  { id: 'v-seraser', name: 'Seraser Fine Dining', city: 'Antalya', district: 'Kaleiçi', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 36.8856, lng: 30.7051, gpsVerified: true, address: 'Selçuk Mah. Karanlık Sk. No:18, Kaleiçi', openingHours: '12:00–00:00', signatureDish: '300 yıllık konak bahçesinde çağdaş Akdeniz mutfağı' },

  // ==================== BURSA (7) ====================
  { id: 'v-iskender-bursa', name: 'İskender Efendi Konağı', city: 'Bursa', district: 'Nilüfer', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 40.2118, lng: 29.0132, gpsVerified: true, address: 'Soğanlı Botanik Parkı, Osmangazi', openingHours: '11:30–22:00', signatureDish: 'Tarihi tereyağlı Bursa İskender kebabı ve şıra' },
  { id: 'v-uludagkebap', name: 'Uludağ Kebapçısı (Cemal & Cemil)', city: 'Bursa', district: 'Osmangazi', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 40.1932, lng: 29.0642, gpsVerified: true, address: 'Uluyol, Şirin Sk. No:12, Osmangazi', openingHours: '11:30–21:30', signatureDish: 'Eski Garaj klasiği döner kebap ve yoğurt' },
  { id: 'v-kayhan', name: 'Kayhan Köftecisi', city: 'Bursa', district: 'Kayhan', category: 'Esnaf Lokantası', priceTier: '₺', lat: 40.1835, lng: 29.0665, gpsVerified: true, address: 'Kayhan Çarşısı, Osmangazi', openingHours: '11:00–21:00', signatureDish: 'Pideli köfte ve közlenmiş biber' },
  { id: 'v-abdal', name: 'Tarihi Abdal Simit Fırını', city: 'Bursa', district: 'Osmangazi', category: 'Kahvaltı & Fırın', priceTier: '₺', lat: 40.1869, lng: 29.0628, gpsVerified: true, address: 'Abdal Meydanı, Osmangazi', openingHours: '06:00–19:00', signatureDish: 'Odun fırınından sıcak tahinli pide ve pekmezli simit' },
  { id: 'v-kozahan', name: 'Kozahan Avlu Çay & Kahve', city: 'Bursa', district: 'Hanlar Bölgesi', category: '3. Nesil Kahve', priceTier: '₺', lat: 40.1842, lng: 29.0619, gpsVerified: true, address: 'Uzunçarşı Cd., Koza Han', openingHours: '08:00–22:00', signatureDish: 'Tarihi çınar altında kumda Türk kahvesi' },
  { id: 'v-hacidatli', name: 'Hacı Hasan Oğulları', city: 'Bursa', district: 'Osmangazi', category: 'Tatlı & Pastane', priceTier: '₺₺', lat: 40.1849, lng: 29.0598, gpsVerified: true, address: 'Atatürk Cd., Osmangazi', openingHours: '08:00–23:00', signatureDish: 'Bursa kestane şekeri, süt helvası ve burma kadayıf' },
  { id: 'v-tahan-cantik', name: 'Acı Dayı Cantık', city: 'Bursa', district: 'Kayhan', category: 'Sokak Lezzeti', priceTier: '₺', lat: 40.1839, lng: 29.0672, gpsVerified: true, address: 'Kayhan Mah., Osmangazi', openingHours: '10:00–20:00', signatureDish: 'Odun fırınından çıtır kuşbaşılı Bursa cantık' },

  // ==================== ADANA (6) ====================
  { id: 'v-cigercimahmut', name: 'Ciğerci Mahmut', city: 'Adana', district: 'Seyhan', category: 'Döner & Ocakbaşı', priceTier: '₺', lat: 36.9932, lng: 35.3248, gpsVerified: true, address: 'Kocavezir Mah., Seyhan', openingHours: '06:00–22:00', signatureDish: 'Sabah ciğer şiş, sumaklı soğan ve şalgam' },
  { id: 'v-onbasilar', name: 'Onbaşılar Kebap', city: 'Adana', district: 'Çukurova', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 37.0431, lng: 35.3082, gpsVerified: true, address: 'Adnan Menderes Bulvarı, Çukurova', openingHours: '11:00–23:30', signatureDish: 'Göl manzaralı zırh Adana kebap ve fındık lahmacun' },
  { id: 'v-kazimbufe', name: 'Kazım Büfe', city: 'Adana', district: 'Seyhan', category: 'Sokak Lezzeti', priceTier: '₺', lat: 36.9965, lng: 35.3211, gpsVerified: true, address: 'Cemalpaşa Mah. Toros Cd., Seyhan', openingHours: '08:00–02:00', signatureDish: 'Efsanevi köpüklü muzlu süt ve kaşarlı tost' },
  { id: 'v-kazancilar', name: 'Tarihi Kazancılar Kebapçısı', city: 'Adana', district: 'Seyhan', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 36.9862, lng: 35.3259, gpsVerified: true, address: 'Büyük Saat, Kazancılar Çarşısı', openingHours: '11:00–23:00', signatureDish: 'Taş fırın mezeleri ve geleneksel Adana kebabı' },
  { id: 'v-tatliciguller', name: 'Tatlıcı Gönül Kardeşler', city: 'Adana', district: 'Seyhan', category: 'Tatlı & Pastane', priceTier: '₺', lat: 36.9948, lng: 35.3228, gpsVerified: true, address: 'Gazipaşa Bulvarı, Seyhan', openingHours: '09:00–00:00', signatureDish: 'Çıtır taş kadayıf, halka tatlı ve bici bici' },
  { id: 'v-meshur-sirdanci', name: 'Şırdancı Bedo', city: 'Adana', district: 'Seyhan', category: 'Sokak Lezzeti', priceTier: '₺', lat: 36.9912, lng: 35.3284, gpsVerified: true, address: 'Atatürk Cd., Seyhan', openingHours: '16:00–04:00', signatureDish: 'Kimyonlu sıcak Adana şırdan ve mumbar' },

  // ==================== ESKİŞEHİR (5) ====================
  { id: 'v-papagan', name: 'Papağan Çibörek', city: 'Eskişehir', district: 'Odunpazarı', category: 'Sokak Lezzeti', priceTier: '₺', lat: 39.7728, lng: 30.5194, gpsVerified: true, address: 'Köprübaşı Cd. Yalbı Sk., Odunpazarı', openingHours: '10:30–20:30', signatureDish: 'İncecik çıtır Tatar çiböreği ve ayran' },
  { id: 'v-abdusselam', name: 'Abdüsselam Balaban Kebap', city: 'Eskişehir', district: 'Odunpazarı', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 39.7705, lng: 30.5238, gpsVerified: true, address: 'Arifiye Mah. Belediye Sk., Odunpazarı', openingHours: '11:30–21:00', signatureDish: 'Kemik sulu pide üzerine köfte ve yoğurtlu balaban' },
  { id: 'v-varuna', name: 'Varuna Gezgin Cafe', city: 'Eskişehir', district: 'Tepebaşı', category: 'Meyhane & Bistro', priceTier: '₺₺', lat: 39.7789, lng: 30.5152, gpsVerified: true, address: 'Hoşnudiye, Siloönü Sk., Tepebaşı', openingHours: '09:30–01:00', signatureDish: 'Dünya mutfağı, geniş menü ve seyahat atmosferi' },
  { id: 'v-kokcoffee', name: 'Kok Coffee Roasters', city: 'Eskişehir', district: 'Odunpazarı', category: '3. Nesil Kahve', priceTier: '₺₺', lat: 39.7662, lng: 30.5251, gpsVerified: true, address: 'Odunpazarı Tarihi Evler Bölgesi', openingHours: '09:00–22:00', signatureDish: 'Porsuk yakınında taze kavrulmuş filtre kahve' },
  { id: 'v-tatlidil-helva', name: 'Tanınmış Helvacı', city: 'Eskişehir', district: 'Odunpazarı', category: 'Tatlı & Pastane', priceTier: '₺', lat: 39.7745, lng: 30.5208, gpsVerified: true, address: 'Köprübaşı, Odunpazarı', openingHours: '08:30–21:00', signatureDish: 'Taze Eskişehir met helvası ve nuga helva' },

  // ==================== TRABZON (4) ====================
  { id: 'v-kalkanoğlu-tr', name: 'Tarihi Kalkanoğlu Pilavı', city: 'Trabzon', district: 'Ortahisar', category: 'Esnaf Lokantası', priceTier: '₺', lat: 41.0068, lng: 39.7279, gpsVerified: true, address: 'Pazarkapı, Kemeraltı, Ortahisar', openingHours: '11:00–19:00', signatureDish: '1856’dan beri Trabzon tereyağlı pilav, kavurma ve hoşaf' },
  { id: 'v-nihatusta', name: 'Nihat Usta Akçaabat Köftecisi', city: 'Trabzon', district: 'Akçaabat', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 41.0226, lng: 39.5742, gpsVerified: true, address: 'Sahil Parkı, Akçaabat', openingHours: '10:00–23:00', signatureDish: 'Sarımsaklı Akçaabat köftesi, piyaz ve Hamsiköy sütlacı' },
  { id: 'v-ruya-pide', name: 'Rüştü’nün Fırını (Sürmene Pide)', city: 'Trabzon', district: 'Ortahisar', category: 'Kahvaltı & Fırın', priceTier: '₺', lat: 41.0054, lng: 39.7289, gpsVerified: true, address: 'Meydan Parkı civarı, Ortahisar', openingHours: '08:00–22:00', signatureDish: 'Bol tereyağlı peynirli yumurtalı Trabzon yağlısı' },
  { id: 'v-betonhelva', name: 'Beton Helva', city: 'Trabzon', district: 'Ortahisar', category: 'Tatlı & Pastane', priceTier: '₺', lat: 41.0061, lng: 39.7258, gpsVerified: true, address: 'Uzun Sokak, Ortahisar', openingHours: '08:30–21:30', signatureDish: 'Meşhur Trabzon fındıklı beton helvası ve sütlaç' },

  // ==================== KONYA (4) ====================
  { id: 'v-havzan', name: 'Havzan Etliekmek', city: 'Konya', district: 'Meram', category: 'Esnaf Lokantası', priceTier: '₺', lat: 37.8682, lng: 32.4789, gpsVerified: true, address: 'Havzan Mah. Yeni Meram Cd.', openingHours: '10:30–22:00', signatureDish: 'İncecik çıtır Konya etliekmeği, bıçakarası ve bamya çorbası' },
  { id: 'v-haci-sukru', name: 'Tarihi Hacı Şükrü Fırın Kebap', city: 'Konya', district: 'Karatay', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 37.8716, lng: 32.5015, gpsVerified: true, address: 'Aziziye Mah., Mevlana civarı', openingHours: '11:00–20:00', signatureDish: 'Bakır kazanda saatlerce pişen Konya fırın kebabı' },
  { id: 'v-tiritci-mithat', name: 'Tiritçi Mithat', city: 'Konya', district: 'Karatay', category: 'Esnaf Lokantası', priceTier: '₺', lat: 37.8721, lng: 32.5029, gpsVerified: true, address: 'Aziziye Mah. İstanbul Cd.', openingHours: '11:30–17:30', signatureDish: 'Yoğurtlu tereyağlı geleneksel Konya tiridi' },
  { id: 'v-bolu-lokantasi-konya', name: 'Cemo Etliekmek', city: 'Konya', district: 'Selçuklu', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 37.8842, lng: 32.4918, gpsVerified: true, address: 'Nalçacı Cd., Selçuklu', openingHours: '10:00–23:00', signatureDish: 'Mevlana böreği, etliekmek ve sac arası tatlısı' },

  // ==================== MUĞLA / BODRUM (4) ====================
  { id: 'v-orfoz', name: 'Orfoz Restaurant', city: 'Muğla', district: 'Bodrum', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 37.0319, lng: 27.4414, gpsVerified: true, address: 'Zeki Müren Cd. No:13/1, Bodrum', openingHours: '19:00–23:30', signatureDish: 'Michelin önerili kabuklu deniz ürünleri tadım menüsü' },
  { id: 'v-sungerpizza', name: 'Sünger Pizza', city: 'Muğla', district: 'Bodrum', category: 'Meyhane & Bistro', priceTier: '₺₺', lat: 37.0352, lng: 27.4259, gpsVerified: true, address: 'Neyzen Tevfik Cd. No:214, Bodrum Marina', openingHours: '12:00–00:00', signatureDish: 'Bodrum klasiği çökertme kebabı ve ince hamur pizza' },
  { id: 'v-limon-gumusluk', name: 'Limon Gümüşlük', city: 'Muğla', district: 'Gümüşlük', category: 'Meyhane & Bistro', priceTier: '₺₺₺', lat: 37.0548, lng: 27.2355, gpsVerified: true, address: 'Kardak Sk. No:7, Gümüşlük', openingHours: '10:00–00:00', signatureDish: 'Gün batımında Ege mezeleri ve kabak çiçeği dolması' },
  { id: 'v-bitez-dondurma', name: 'Bitez Dondurmacısı', city: 'Muğla', district: 'Bitez', category: 'Tatlı & Pastane', priceTier: '₺', lat: 37.0308, lng: 27.3812, gpsVerified: true, address: 'Atatürk Blv., Bitez / Bodrum', openingHours: '10:00–01:00', signatureDish: 'Bodrum mandalinalı ve taze incirli doğal dondurma' },

  // ==================== HATAY / ANTAKYA (4) ====================
  { id: 'v-poyraz-kunefe', name: 'Çınaraltı Künefe Yusuf Usta', city: 'Hatay', district: 'Antakya', category: 'Tatlı & Pastane', priceTier: '₺', lat: 36.2018, lng: 36.1619, gpsVerified: true, address: 'Tarihi Ahşap Çarşı civarı, Antakya', openingHours: '09:00–22:00', signatureDish: 'Köz ateşinde tepsi Antakya künefesi' },
  { id: 'v-poccuk-tepsi', name: 'Pöç Kasabı & Kebap', city: 'Hatay', district: 'Antakya', category: 'Döner & Ocakbaşı', priceTier: '₺₺', lat: 36.2031, lng: 36.1602, gpsVerified: true, address: 'Uzun Çarşı, Antakya', openingHours: '10:00–21:00', signatureDish: 'Taş fırında zırh tepsi kebabı ve kağıt kebabı' },
  { id: 'v-humuscu-ibrahim', name: 'Humusçu İbrahim Usta', city: 'Hatay', district: 'Antakya', category: 'Sokak Lezzeti', priceTier: '₺', lat: 36.2044, lng: 36.1589, gpsVerified: true, address: 'Antakya Merkez', openingHours: '07:00–17:00', signatureDish: 'Tereyağlı sıcak humus, bakla ezmesi ve turşu' },
  { id: 'v-sultan-sofrasi-ht', name: 'Antakya Sultan Sofrası', city: 'Hatay', district: 'Antakya', category: 'Esnaf Lokantası', priceTier: '₺₺', lat: 36.2059, lng: 36.1632, gpsVerified: true, address: 'İstiklal Cd., Antakya', openingHours: '11:00–22:00', signatureDish: 'Oruk, fellah köftesi, muhammara ve kabak tatlısı' },
];

export const CURATED_VENUES: Venue[] = RAW_CURATED_VENUES.map((v, idx) => {
  const g = GMAPS_ENRICHED[v.id];
  const gPhotos = g?.photos && g.photos.length > 0 ? g.photos : undefined;
  return {
    ...v,
    lat: g?.lat ?? v.lat,
    lng: g?.lng ?? v.lng,
    osmImage: gPhotos ? gPhotos[0] : v.osmImage,
    googlePhotos: gPhotos,
    googleReviews: g?.reviews && g.reviews.length > 0 ? g.reviews : undefined,
    googleRating: g?.googleRating ?? v.googleRating ?? Number((4.5 + ((idx * 7) % 5) * 0.1).toFixed(1)),
    googleReviewCount: g?.googleReviewCount ?? v.googleReviewCount ?? 420 + ((idx * 173) % 3400),
  };
});

const curatedNames = new Set(CURATED_VENUES.map((v) => v.name.toLocaleLowerCase('tr-TR')));
const HARVESTED_VENUES = (harvestedRaw as Venue[]).filter(
  (v) => !curatedNames.has(v.name.toLocaleLowerCase('tr-TR'))
);

export const INITIAL_VENUES: Venue[] = [...CURATED_VENUES, ...HARVESTED_VENUES];

export const INITIAL_RANKED: RankedVenue[] = [
  { venueId: 'v-ciya', tier: 'bayildim', rankIndex: 0, score: 9.6, visitedAt: '2026-10-12', personalNote: 'Her gidişte başka bir Anadolu tenceresi, asla şaşmıyor.' },
  { venueId: 'v-imamcagdas', tier: 'bayildim', rankIndex: 1, score: 9.3, visitedAt: '2026-10-16', personalNote: 'Havuç dilimi baklava + Ali Nazik için şehir değiştirmeye değer.' },
  { venueId: 'v-bayramoglu', tier: 'bayildim', rankIndex: 2, score: 9.0, visitedAt: '2026-10-20', personalNote: 'Kuyruk hızla akıyor, lavaşı sıcakken efsane.' },
  { venueId: 'v-montag', tier: 'bayildim', rankIndex: 3, score: 8.7, visitedAt: '2026-11-01', personalNote: 'Kadıköy sabahı için en dengeli filtre kahve.' },
  { venueId: 'v-gulluoglu', tier: 'guzeldi', rankIndex: 4, score: 8.2, visitedAt: '2026-11-05', personalNote: 'Kalabalık ama fıstıklı kare hâlâ standart belirleyici.' },
  { venueId: 'v-dostlar', tier: 'guzeldi', rankIndex: 5, score: 7.8, visitedAt: '2026-11-09', personalNote: 'Sabah 8’de sıcak boyoz + çay kombinasyonu.' },
];

export const INITIAL_WANT_TO_GO: string[] = [
  'v-aheste',
  'v-kronotrop',
  'v-karakoylok',
  'v-7mehmet',
  'v-odurla',
  'v-trilye',
  'v-papagan',
  'v-neolokal',
  'v-orfoz',
];

export const FRIENDS: FriendProfile[] = [
  {
    id: 'f-selin',
    name: 'Selin Demir',
    handle: '@selintadim',
    city: 'İstanbul',
    bio: 'Kadıköy kahvecileri ve eski esnaf lokantaları avcısı.',
    avatarBg: '#0B4A4F',
    ratings: [
      { venueId: 'v-ciya', score: 9.5, note: 'İçli köftesi rakipsiz.' },
      { venueId: 'v-montag', score: 9.0, note: 'Kavrum profili hep tutarlı.' },
      { venueId: 'v-karakoylok', score: 9.2, note: 'Öğle tenceresi ayrı, akşam mezesi ayrı güzel.' },
      { venueId: 'v-aheste', score: 9.3, note: 'Pera’da özel akşam favorim.' },
      { venueId: 'v-neolokal', score: 9.4, note: 'Salt Galata atmosferi ve Anadolu tabakları şahane.' },
    ],
  },
  {
    id: 'f-kerem',
    name: 'Kerem Aydın',
    handle: '@keremsofra',
    city: 'Ankara',
    bio: 'Döner, ocakbaşı ve Anadolu mutfağı standartlarını ciddiye alır.',
    avatarBg: '#059669',
    ratings: [
      { venueId: 'v-bayramoglu', score: 9.4, note: 'İstanbul’a gelince ilk durak.' },
      { venueId: 'v-imamcagdas', score: 9.5, note: 'Gaziantep’te tek geçerim.' },
      { venueId: 'v-pecenek', score: 9.1, note: 'Ankara’nın altın standardı.' },
      { venueId: 'v-cigercimahmut', score: 9.2, note: 'Adana’da sabah ciğeri geleneği.' },
      { venueId: 'v-havzan', score: 9.0, note: 'Konya’da çıtır etliekmek referansı.' },
    ],
  },
  {
    id: 'f-defne',
    name: 'Defne Karahan',
    handle: '@defnerota',
    city: 'İzmir',
    bio: 'Ege ve Akdeniz mutfağı, boyoz fırınları ve nitelikli kahve notları.',
    avatarBg: '#D97706',
    ratings: [
      { venueId: 'v-dostlar', score: 8.6, note: 'Ispanaklı boyoz mutlaka denenmeli.' },
      { venueId: 'v-odurla', score: 9.4, note: 'Özel akşam için eşsiz atmosfer.' },
      { venueId: 'v-7mehmet', score: 9.5, note: 'Bademli iç pilavı unutulmaz.' },
      { venueId: 'v-poka', score: 8.8, note: 'Bostanlı’nın en iyi espresso barı.' },
      { venueId: 'v-orfoz', score: 9.5, note: 'Bodrum’da deniz ürünü zirvesi.' },
    ],
  },
];
