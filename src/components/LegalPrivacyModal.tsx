import { useState, type ChangeEvent } from 'react';
import { ShieldCheck, Download, Upload, Trash2, X, MapPin, BarChart3, Workflow } from 'lucide-react';
import { downloadTadimN8nBlueprint } from '../utils/n8nExport';
import type { TadimState } from '../types';
import {
  downloadOrganicMapsGeoJson,
  downloadOrganicMapsGpx,
  downloadOrganicMapsKml,
  parseBackupOrScraperJson,
} from '../utils/routingAndGeo';
import {
  getSavedGoogleMapsKey,
  saveGoogleMapsKeyToPython,
} from '../utils/pythonGmapsClient';

interface LegalPrivacyModalProps {
  open: boolean;
  state: TadimState;
  onClose: () => void;
  onExportJson: () => void;
  onImportJson: (state: TadimState) => void;
  onDeleteAllData: () => Promise<void>;
}

export function LegalPrivacyModal({
  open,
  state,
  onClose,
  onExportJson,
  onImportJson,
  onDeleteAllData,
}: LegalPrivacyModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gmapsKey, setGmapsKey] = useState(() => getSavedGoogleMapsKey());

  if (!open) return null;

  const handleSaveGmapsKey = async () => {
    const ok = await saveGoogleMapsKeyToPython(gmapsKey);
    setFeedback(
      ok
        ? 'Google Maps API anahtarı Python (googlemaps) servisine ve tarayıcıya kaydedildi.'
        : 'Anahtar tarayıcıya kaydedildi (Python servisi: http://127.0.0.1:8005).'
    );
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseBackupOrScraperJson(String(reader.result), state);
        onImportJson(result.state);
        setFeedback(result.message);
      } catch (err) {
        setFeedback(
          err instanceof Error
            ? err.message
            : 'Dosya okunamadı. TadımRotası JSON veya Google Maps Scraper JSON seç.'
        );
      }
    };
    reader.readAsText(file);
  };

  const handlePurge = async () => {
    await onDeleteAllData();
    setConfirmDelete(false);
    setFeedback('Tüm yerel ve (bağlıysa) bulut verilerin kalıcı olarak silindi.');
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="KVKK, Gizlilik ve Veri Yönetimi"
    >
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-xl border border-[#D8E0E4] bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E8EB]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B4A4F]" />
            <h2 className="text-base font-extrabold text-[#111827] tracking-tight">
              KVKK, Gizlilik & Veri Kontrolü
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F3F6F8] hover:text-[#111827] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Peach-style Local Library & Media Coverage Statistics */}
          <div className="rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0B4A4F]">
                <BarChart3 className="w-4 h-4" />
                Yerel Kütüphane & Medya İstatistikleri
              </div>
              <span className="text-[10px] font-bold text-[#0F766E]">Çevrimdışı Hazır</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              <div className="rounded-md bg-white border border-[#D8E0E4] py-2 px-1">
                <div className="text-sm font-extrabold text-[#111827] tabular-nums">
                  {state.venues.length.toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold">Toplam Mekân</div>
              </div>
              <div className="rounded-md bg-white border border-[#D8E0E4] py-2 px-1">
                <div className="text-sm font-extrabold text-[#0B4A4F] tabular-nums">
                  {state.venues.filter((v) => v.googlePhotos?.length).length.toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold">Google Foto</div>
              </div>
              <div className="rounded-md bg-white border border-[#D8E0E4] py-2 px-1">
                <div className="text-sm font-extrabold text-[#0284C7] tabular-nums">
                  {state.venues.filter((v) => v.googleReviews?.length).length.toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold">Görselli Yorum</div>
              </div>
              <div className="rounded-md bg-white border border-[#D8E0E4] py-2 px-1">
                <div className="text-sm font-extrabold text-[#059669] tabular-nums">
                  {state.ranked.length.toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold">Sıralamam</div>
              </div>
              <div className="rounded-md bg-white border border-[#D8E0E4] py-2 px-1">
                <div className="text-sm font-extrabold text-[#D97706] tabular-nums">
                  {state.wantToGoIds.length.toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold">Kayıtlı</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#F8FAFB] border border-[#E4E8EB] p-4 text-xs text-[#475569] space-y-2 leading-relaxed">
            <p className="font-bold text-[#111827]">6698 Sayılı KVKK & Mağaza Gizlilik İlkeleri</p>
            <p>
              • <strong className="text-[#111827]">Sıfır Takip & Sıfır Reklam:</strong> Üçüncü parti
              reklam SDK’ları, arka plan konum izleme veya çapraz uygulama takibi (ATT) kullanılmaz.
            </p>
            <p>
              • <strong className="text-[#111827]">Açık Harita Verisi:</strong> Haritada yalnızca
              kayıtlı işletme koordinatları ve OpenStreetMap kamusal mekân verileri görüntülenir.
            </p>
            <p>
              • <strong className="text-[#111827]">Taşınabilirlik & Silme Hakkı (Apple 5.1.1(v)):</strong>{' '}
              Verilerini JSON olarak dışa aktarabilir veya tek tıkla kalıcı olarak silebilirsin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onExportJson}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B4A4F] py-2.5 text-xs font-bold text-white hover:bg-[#083A3E] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              JSON Yedek İndir
            </button>
            <label className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D8E0E4] bg-white py-2.5 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              JSON / KML / GPX Yükle
              <input
                type="file"
                accept=".json,.jsonl,.kml,.gpx,.geojson,application/json,application/xml,text/xml"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="rounded-lg bg-[#F8FAFB] border border-[#E4E8EB] p-3.5 space-y-2">
            <div className="text-xs font-bold text-[#111827]">
              Python <code>googlemaps</code> & Google Places API Anahtarı (İsteğe Bağlı)
            </div>
            <p className="text-[11px] text-[#64748B]">
              Anahtarsız modda 3.545 gerçek mekân, Canlı Google Harita Embed ve Wikimedia fotoğrafları
              otomatik çalışır. Kendi Google Cloud anahtarını eklersen Python{' '}
              <code>googlemaps.Client</code> üzerinden resmi Google Places ve trafik verisi çekilir.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={gmapsKey}
                onChange={(e) => setGmapsKey(e.target.value)}
                placeholder="AIzaSy... (opsiyonel Google Maps API Key)"
                className="flex-1 rounded-lg border border-[#D8E0E4] bg-white px-3 py-1.5 text-xs text-[#111827]"
              />
              <button
                type="button"
                onClick={() => void handleSaveGmapsKey()}
                className="rounded-lg bg-[#0B4A4F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#083A3E] cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-[#F8FAFB] border border-[#E4E8EB] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0B4A4F]" />
                Organic Maps Çevrimdışı Harita (KML · GPX · GeoJSON)
              </div>
              <a
                href="https://organicmaps.app"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-[#0B4A4F] hover:underline"
              >
                Organic Maps Project ↗
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => downloadOrganicMapsKml(state.venues.slice(0, 350), state.ranked)}
                className="rounded-lg border border-[#D8E0E4] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer"
              >
                KML İndir (.kml)
              </button>
              <button
                type="button"
                onClick={() => downloadOrganicMapsGpx(state.venues.slice(0, 350), state.ranked)}
                className="rounded-lg border border-[#D8E0E4] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer"
              >
                GPX İndir (.gpx)
              </button>
              <button
                type="button"
                onClick={() => downloadOrganicMapsGeoJson(state.venues.slice(0, 350), state.ranked)}
                className="rounded-lg border border-[#D8E0E4] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer"
              >
                GeoJSON (.geojson)
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#D8E0E4] bg-[#F8FAFB] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111827]">
              <Workflow className="h-4 w-4" /> n8n / Windmill Otomasyon Şablonu (.json)
            </div>
            <p className="text-[11px] text-[#4B5563]">
              İlk 10 mekânınızı Webhook → Kod → Telegram akışıyla haftalık özet olarak gönderen, n8n&apos;e doğrudan içe aktarılabilir iş akışı. Telegram düğümünde <code>YOUR_CHAT_ID</code> değerini değiştirin.
            </p>
            <button
              type="button"
              onClick={() => {
                const n = downloadTadimN8nBlueprint(state);
                setFeedback(`n8n iş akışı indirildi (${n} mekân). n8n → Import from File ile açabilirsiniz.`);
              }}
              className="w-full rounded-lg border border-[#D8E0E4] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer"
            >
              n8n İş Akışını İndir
            </button>
          </div>

          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 space-y-2.5">
            <div className="text-xs font-bold text-[#991B1B]">Hesap ve Tüm Verileri Kalıcı Sil</div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC2626] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#B91C1C] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tüm Verilerimi Sil
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handlePurge()}
                  className="rounded-lg bg-[#DC2626] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#B91C1C] cursor-pointer"
                >
                  Evet, Kalıcı Olarak Sil
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-[#D8E0E4] bg-white px-3 py-2 text-xs font-bold text-[#111827] cursor-pointer"
                >
                  Vazgeç
                </button>
              </div>
            )}
          </div>

          {feedback && (
            <p className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2 text-xs font-semibold text-[#047857]">
              {feedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
