# TadımRotası — iOS & Android Mobil Uygulama Lansman Planı

**Paket Kimliği (Bundle ID / Application ID):** `com.tadimrotasi.app`  
**Mimari:** Capacitor 7 (React 19 + Vite SPA + Yerel `localStorage`/IndexedDB + Opsiyonel FastAPI Sosyal Senkronizasyon)  
**Hedef Pazar:** Türkiye (Başlangıç), Ardından MENA / Avrupa Gurme Seyahat Segmenti

---

## 1. Mağaza Görselleri ve Marka Kimliği

- **Uygulama İkonu (`1024x1024`):** `public/store-assets/tadimrotasi_icon.png` — Yanık Terrakotta (`#C2410C`) ve sıcak krem zemin üzerinde minimalist harita pini + gurme çatal-kaşık amblemi.
- **Tanıtım Banner (`1600x900`):** `public/store-assets/tadimrotasi_promo.png` — Türkiye mekan listesi, Google Places fotoğraf keşfi ve 10'lu görsel yorum doğrulama vitrini.

---

## 2. Capacitor 7 Yerel Entegrasyon Mimarisi

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install @capacitor/geolocation @capacitor/camera @capacitor/share @capacitor/preferences @capacitor/haptics
npx cap init "TadımRotası" "com.tadimrotasi.app" --web-dir dist
npx cap add ios && npx cap add android
```

### Eklenti Eşlemesi
| Web Özelliği | Capacitor 7 Doğal API | Kullanım Amacı |
| :--- | :--- | :--- |
| Yakın Mekan Keşfi | `@capacitor/geolocation` | Kullanıcının bulunduğu şehir/semte göre mekan mesafe sıralaması |
| Yemek & Mekan Fotoğrafı | `@capacitor/camera` | Ziyaret defterine galeriden veya kameradan anlık tat fotoğrafı ekleme |
| Liste / Rota Paylaşımı | `@capacitor/share` | "İlk 10 Gurme Rotam" kartını WhatsApp / Instagram'a native paylaşım |
| Çevrimdışı Defter | `@capacitor/preferences` + SQLite | İnternetsiz ortamda dahi kayıtlı mekan ve kişisel yorumları koruma |

---

## 3. Doğal İzinler (`Info.plist` & `AndroidManifest.xml`)

### iOS (`ios/App/App/Info.plist`)
- `NSLocationWhenInUseUsageDescription`: *"Yakınınızdaki kayıtlı lezzet duraklarını harita üzerinde göstermek ve mesafe hesaplamak için konum bilginize ihtiyaç duyarız."*
- `NSCameraUsageDescription`: *"Ziyaret ettiğiniz mekanlarda çektiğiniz lezzet fotoğraflarını tat defterinize eklemek için kamera izni gerekir."*
- `NSPhotoLibraryUsageDescription`: *"Daha önce çektiğiniz yemek fotoğraflarını mekan yorumlarınıza eklemek için fotoğraf arşivinize erişiriz."*

### Android (`android/app/src/main/AndroidManifest.xml`)
- `android.permission.INTERNET`
- `android.permission.ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`
- `android.permission.CAMERA` (opsiyonel; yalnızca ziyaret fotoğrafı yüklerken istenir)

---

## 4. App Store & Google Play Uyumluluk Kapıları

1. **Apple Guideline 5.1.1(v) — Veri Kontrolü & KVKK:**
   - Uygulama hesap oluşturma zorunluluğu olmadan **tam işlevsel** çalışır (`Yerel Kütüphane`).
   - Ayarlar > Gizlilik ve Veri Yönetimi (`LegalPrivacyModal`) içinde JSON dışa aktarım, içe aktarım ve **"Tüm Verileri Kalıcı Olarak Sil"** butonu mevcuttur.
   - Hiçbir 3. parti reklam/takip SDK'sı yoktur (`App Tracking Transparency` prompt'u gerekmez; Privacy Nutrition Label = *"Data Not Collected"*).
2. **Kullanıcı Tarafından Oluşturulan İçerik (UGC) & Harici Veri:**
   - Google Places üzerinden çekilen fotoğraflar ve açık web doğrulamaları salt-okunur referans olarak sunulur; kullanıcının kendi notları cihazda kalır.
3. **Play Store Data Safety:**
   - Konum yalnızca ön planda (`When In Use`) kullanılır, sunucuda saklanmaz.

---

## 5. Türkçe ASO (App Store Optimization) & Gelir Modeli

- **Başlık (30 kr):** `TadımRotası: Gurme Defterim`
- **Alt Başlık (30 kr):** `Mekan Keşfet, Tatları Puanla`
- **Anahtar Kelimeler (100 kr):** `gurme,mekan,restoran,kafe,lezzet haritası,yemek,tat,gezi,rotam,puanla,istanbul,izmir,ankara`

### RevenueCat / TL PPP Fiyatlandırma Katmanları
| Katman | Fiyat (TRY) | Kapsam |
| :--- | :--- | :--- |
| **Ücretsiz (Sonsuza Dek)** | ₺0 | Sınırsız mekan kaydı, kişisel ilk 10, yerel istatistikler, JSON yedekleme |
| **TadımRotası Pro (Aylık)** | ₺59,99 / ay | Sınırsız yüksek çözünürlüklü mekan galerisi + PDF/Story rota kartı + bulut yedek |
| **TadımRotası Pro (Yıllık)** | ₺449,99 / yıl | %37 indirimli yıllık paket + çoklu cihaz senkronizasyonu |

---

## 6. 6 Haftalık Lansman Yol Haritası

| Hafta | Odak | Çıktı |
| :--- | :--- | :--- |
| **Hafta 1** | Capacitor 7 Kurulumu | iOS/Android projeleri, Safe Area & status bar uyumu |
| **Hafta 2** | Native Kamera & Konum | `@capacitor/camera` ve `@capacitor/geolocation` akışları |
| **Hafta 3** | İkon, Splash & Store Görselleri | 1024x1024 ikon, iPhone 6.7"/6.1" ekran görüntüleri |
| **Hafta 4** | TestFlight & Play Internal Testing | 15 kişilik beta testi, performans & bellek profili |
| **Hafta 5** | KVKK, Privacy Label & Review Paketi | Review notları, demo modu ve Apple 5.1.1(v) doğrulaması |
| **Hafta 6** | Mağaza Yayını & Organik Lansman | App Store / Play Store yayın + Türkiye gurme topluluk duyurusu |
