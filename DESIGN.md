# TadımRotası v4.0 — DESIGN.md (Impeccable Operate Mode + 3D Vector City Maps)

## Anti-AI-Slop Tasarım Kararları
- **Reddedilen AI Klişeleri:** Krem arka plan + yüksek kontrastlı serif (Playfair/Fraunces) + bordo vurgulu iç içe yuvarlak kartlar tamamen kaldırıldı.
- **Kararlı Ürün Kabuğu (Committed Shell):** Derin Boğaz Petrolü üst kabuk (`#0B4A4F`), saf beyaz liste ve detay rayı (`#FFFFFF`), `1px` saç kılı ayırıcılar (`#E4E8EB`), sıfır iç içe kart ve tam ekran (`100dvh`) bölünmüş harita-liste düzeni.
- **Tek İşlevsel Yazı Tipi:** `Manrope` (`tabular-nums` puan ve GPS hizalaması).
- **Apple Maps Tarzı 3D Şehir Haritası (`maplibre-gl` + OpenFreeMap):** `54°` eğimli kamera, yükseltilmiş 3D binalar (`fill-extrusion`), güneş ışığı gölgeleme, `3D Şehir / Açık / Uydu / Gece` katmanları, 3D/2D geçiş, pusula döndürme ve GPU hızlandırmalı WebGL nokta+etiket katmanı.
- **Google Maps Tarzı Mekân Detay Çekmecesi:** Herhangi bir restorana tıklandığında açılan 3'lü fotoğraf kolajı + tam ekran fotoğraf galerisi (Lightbox), çalışma saatleri, telefon, web sitesi, açık alan bilgisi, yol tarifi, Google Foto & Yorumlar bağlantısı ve opsiyonel `VITE_GOOGLE_PLACES_API_KEY` canlı Google Places entegrasyonu.
