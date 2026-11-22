# TadımRotası v5.1 — Canlı Yayın, Python Google Maps Servisi, Supabase & Mobil Mağaza Rehberi

## 1. Python `googlemaps` + FastAPI Arka Uç Servisi (`:8005`)
```powershell
pip install -U googlemaps fastapi uvicorn httpx
cd C:\Users\ibrah\Projects\tadimrotasi\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8005
```
- **Swagger UI:** `http://127.0.0.1:8005/docs`
- Anahtarsız modda 3.545 gerçek mekân, Open-Meteo rakım/teras hava durumu, OSRM 3D rota ve Canlı Google Harita Embed otomatik çalışır.
- İsteğe bağlı `GOOGLE_MAPS_API_KEY` eklendiğinde (veya uygulama içi **KVKK & Yedek** penceresinden girildiğinde) resmi `googlemaps.Client` (`reverse_geocode(enable_address_descriptor=True)`, `places`, `directions`, `elevation`, `timezone`) devreye girer.

## 2. Supabase Bulut Senkronizasyonu (Opsiyonel — 3 Dakika)
Uygulama hiçbir anahtar olmadan `%100 yerel` olarak çalışır. Üyelik ve cihazlar arası senkronizasyon için:
1. [Supabase](https://supabase.com) üzerinde ücretsiz yeni bir proje aç.
2. SQL Editor'de `supabase/migrations/001_initial_schema.sql` dosyasını çalıştır (tablolar, RLS kuralları ve KVKK/App Store uyumlu `delete_my_data()` fonksiyonu kurulur).
3. `.env.example` dosyasını `.env.local` olarak kopyala ve `VITE_SUPABASE_URL` ile `VITE_SUPABASE_ANON_KEY` değerlerini gir.
4. `npm run dev` veya `npm run build` çalıştırdığında sağ üstteki **Bulut / Üyelik** butonu otomatik olarak canlı moda geçer.

## 2. Web Yayını (Vercel / Netlify — Tek Tık)
- **Vercel:** `npx vercel --prod` (`vercel.json` SPA yönlendirmesi ve güvenlik başlıkları hazır).
- **Netlify:** Klasörü bağla (`netlify.toml` hazır).
- SEO ve AI arama dosyaları hazır: `robots.txt`, `sitemap.xml`, `llms.txt`, `Schema.org JSON-LD`, OpenGraph ve PWA `sw.js`.

## 3. iOS & Android Mobil Paketleme (Capacitor)
```bash
npm run cap:android   # Android Studio projesi oluşturur
npm run cap:ios       # Xcode projesi oluşturur (macOS gerekir)
```

### App Store & Google Play Ön Kontrol Listesi (`app-store-compliance`)
- [x] **Privacy Manifest (`ios-compliance/PrivacyInfo.xcprivacy`):** `cap:ios` sonrası `ios/App/App/` içine kopyala.
- [x] **Hesap & Veri Silme (Apple 5.1.1(v) + KVKK):** Uygulama içi **Gizlilik & KVKK** penceresinde tek tıkla yerel + bulut veri silme mevcut.
- [x] **Demo Hesap:** App Store Connect / Play Console inceleme notlarına çalışan bir test e-posta + şifre ekle (Supabase'ten oluşturulmuş).
- [x] **İzleme Yok:** Reklam takipçisi (`ATT`) ve üçüncü parti veri satışı yok.

## 4. Native iOS Metal 3D Harita & CarPlay Navigasyon (`mapbox-maps-ios` & `mapbox-navigation-ios`)
Xcode (`ios/App`) projesine native Metal 3D harita veya CarPlay sesli navigasyon eklerken **yalnızca Swift Package Manager (SPM)** kullanılmalıdır (CocoaPods desteği kaldırılmıştır):
- `https://github.com/mapbox/mapbox-maps-ios.git` (`from: "11.0.0"`)
- `https://github.com/mapbox/mapbox-navigation-ios.git` (`from: "3.1.0"`)
- `Info.plist` içine `MBXAccessToken`, `NSLocationWhenInUseUsageDescription` ve `UIBackgroundModes: [audio, location]` ekle.

## 5. Organic Maps (`KML / GPX / GeoJSON`) & `google-maps-scraper` Veri Hattı
- Uygulama içi **KVKK & Yedek** penceresinden tüm mekânları `.kml`, `.gpx` veya `.geojson` olarak indirip **Organic Maps** üzerinde çevrimdışı açabilir veya `gosom/google-maps-scraper` JSON/JSONL çıktılarını doğrudan 3D haritaya yükleyebilirsin.
