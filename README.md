# TadımRotası

Türkiye geneli gurme mekân keşif, ikili karşılaştırmalı Elo puanlama, 3D harita, arkadaş ekleme ve zevk uyumu öneri ağı.

## 🌐 Web'de Kullan

- **Canlı Adres:** https://zachariatrying.github.io/tadimrotasi/
- **Telefona PWA Olarak Ekleme:** Tarayıcı menüsünden **Ana Ekrana Ekle** seçeneğiyle uygulama gibi kullanabilirsiniz.
- **Backend (Opsiyonel Google Maps Zenginleştirme):** https://tadimrotasi-backend.onrender.com *(Ücretsiz planda 15 dk boşta kalınca uyur; ilk istek ~30-50 sn sürebilir. Uygulama içi **Ayarlar** menüsünden kendi Google Maps API anahtarınızı girebilirsiniz.)*

## 📱 Android APK İndir & Kur

1. [Build Android APK & Play AAB](https://github.com/zachariatrying/tadimrotasi/actions/workflows/android-apk.yml) sayfasına gidin.
2. En üstteki yeşil (başarılı) iş akışı koşusuna tıklayın.
3. Sayfanın en altındaki **Artifacts** bölümünden **`tadimrotasi-debug-apk`** dosyasını indirin.
4. İnen `.zip` dosyasını açıp içindeki `app-debug.apk` dosyasını Android telefonunuza aktarın.
5. Android ayarlarından **Bilinmeyen kaynaklardan uygulama yükleme** iznini onaylayarak kurulumu tamamlayın.

> Google Play Store için aynı sayfada **`tadimrotasi-release-aab`** (`app-release.aab`, R8 küçültmeli) paketi de üretilmektedir.

## ✨ Öne Çıkan Özellikler

- **3D Türkiye Haritası & Canlı OSM:** MapLibre GL tabanlı harita ve canlı OpenStreetMap mekân keşfi.
- **İkili Elo Sıralama:** Mekânları birbirleriyle kıyaslayarak kişisel 0–10 puan tablosu oluşturma.
- **Arkadaş & Zevk Uyumu Ağı:** Hesap açmadan paylaşım linki/kodu ile arkadaş ekleme veya Supabase bulut hesabıyla `@kullaniciadi` takibi; **%75+ zevk uyumu** olan kişilerin **8.0+** puanlı mekânlarını tek tıkla listeye ekleme.
- **Çevrimdışı & KVKK Dostu:** Sıfır takip SDK'sı, JSON yedekleme/içe aktarım, Organic Maps (KML/GPX/GeoJSON) ve n8n otomasyon şablonu dışa aktarımı.

## 🛠️ Yerel Geliştirme & Mobil Derleme

```bash
npm install
npm run dev        # Yerel geliştirme sunucusu
npm run build      # Üretim derlemesi (dist/)
npx cap sync       # Android & iOS projelerini güncelleme
```

- **Opsiyonel Bulut Sosyal Ağı (Supabase):** `supabase/migrations/001_initial_schema.sql` ve `002_social_network.sql` dosyalarını Supabase SQL Editor'de çalıştırıp `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değişkenlerini tanımlayın.
- **Opsiyonel Python Backend:** `cd backend && pip install -r requirements.txt && uvicorn main:app --host 127.0.0.1 --port 8005`
