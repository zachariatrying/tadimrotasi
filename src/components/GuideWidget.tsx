import { useEffect, useState } from 'react';
import { BookOpen, Compass, MapPin, Scale, Sparkles, X } from 'lucide-react';

const GUIDE_STEPS = [
  {
    icon: Compass,
    badge: '01 · KEŞİF & 3B HARİTA',
    title: '3B Harita & Yakınımdaki Mekanlar',
    desc: 'Şehir veya mutfak kategorisi seçin; sağ alttaki 3D/2D ve GPS kontrolleriyle İstanbul, Ankara, İzmir ve seçili şehirlerdeki mekanları 3B haritada keşfedin.',
  },
  {
    icon: Scale,
    badge: '02 · ELO KARŞILAŞTIRMA',
    title: 'İkili Kıyaslama ile Gerçek Puan',
    desc: 'Gittiğiniz mekanı 10 üzerinden tahmin etmek yerine "Hangisi daha iyiydi?" diyerek iki mekanı karşılaştırın; kişisel sıralamanız otomatik oluşsun.',
  },
  {
    icon: Sparkles,
    badge: '03 · DESTE & REELS',
    title: 'Hızlı Tadım Destesi & Reels Yakalayıcı',
    desc: 'Kart destesiyle mekanları seri şekilde puanlayın veya Instagram / TikTok bağlantılarındaki mekanları tek tıkla listenize aktarın.',
  },
  {
    icon: MapPin,
    badge: '04 · ROTA & PAYLAŞIM',
    title: 'Gideceklerim, Rota & Arkadaşlar',
    desc: 'Beğendiğiniz mekanları Gideceklerim listesine ekleyin, yürüyüş/araç rotası çizin ve tadım listenizi arkadaşlarınızla paylaşın.',
  },
];

export function GuideWidget() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('rehber') === '1' || window.location.hash === '#rehber';
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Uygulama rehberini aç"
        className="fixed bottom-4 right-3 z-[450] inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#0B4A4F] hover:bg-[#08393D] text-white px-4 py-2.5 text-xs font-bold shadow-lg cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#0B4A4F] focus-visible:ring-offset-2"
      >
        <BookOpen className="w-4 h-4" />
        <span>Rehber</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-guide-title"
        >
          <div
            className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-[#E4E8EB] bg-white text-[#111827] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4E8EB] bg-[#0B4A4F] text-white px-5 py-4 rounded-t-2xl">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                  TadımRotası Kullanım Kılavuzu
                </div>
                <h2 id="app-guide-title" className="text-lg font-extrabold">
                  Nasıl Kullanılır?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Rehberi kapat"
                className="rounded-lg p-1.5 hover:bg-white/15 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {GUIDE_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.badge}
                    className="rounded-xl border border-[#E4E8EB] bg-[#F5F7F8] p-3.5 flex items-start gap-3"
                  >
                    <div className="shrink-0 rounded-lg bg-[#EAF4F4] text-[#0B4A4F] p-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold tracking-wider text-[#0B4A4F]">
                        {step.badge}
                      </div>
                      <h3 className="text-sm font-bold text-[#111827]">{step.title}</h3>
                      <p className="text-xs text-[#4B5563] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl border border-[#E4E8EB] bg-[#EAF4F4]/60 px-3.5 py-2.5 text-[11px] text-[#0B4A4F] font-medium">
                İpucu: Verileriniz cihazınızda saklanır; dilediğiniz zaman Hesap &amp; Senkronizasyon ekranından dışa aktarabilir veya silebilirsiniz.
              </div>
            </div>

            <div className="border-t border-[#E4E8EB] px-5 py-3 flex justify-end bg-[#F5F7F8] rounded-b-2xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-[#0B4A4F] hover:bg-[#08393D] text-white px-4 py-2 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0B4A4F]"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
