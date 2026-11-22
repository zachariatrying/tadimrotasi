import { useState, type FormEvent } from 'react';
import { Cloud, CloudOff, LogOut, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { TadimState } from '../types';
import {
  getSupabase,
  isSupabaseConfigured,
  pullStateFromCloud,
  pushStateToCloud,
  signInWithOAuthProvider,
  upsertMyProfile,
} from '../lib/supabase';

interface AuthSyncModalProps {
  open: boolean;
  user: User | null;
  isAdmin?: boolean;
  state: TadimState;
  onClose: () => void;
  onUserChange: (user: User | null) => void;
  onApplyCloudState: (partial: Partial<TadimState>) => void;
}

export function AuthSyncModal({
  open,
  user,
  isAdmin,
  state,
  onClose,
  onUserChange,
  onApplyCloudState,
}: AuthSyncModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [profileHandle, setProfileHandle] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileCity, setProfileCity] = useState('İstanbul');

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profileHandle.trim()) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await upsertMyProfile(
        user.id,
        profileHandle,
        profileName || profileHandle,
        profileCity
      );
      setStatusMsg(`@${profileHandle.trim().replace(/^@/, '').toLowerCase()} profilin kaydedildi — artık Çevre aramasında görünürsün.`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Profil kaydedilemedi.';
      setStatusMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res =
        mode === 'login'
          ? await sb.auth.signInWithPassword({ email, password })
          : await sb.auth.signUp({ email, password });

      if (res.error) throw res.error;
      onUserChange(res.data.user);
      setStatusMsg(
        mode === 'signup'
          ? 'Hesap oluşturuldu. E-posta doğrulamasından sonra buluta eşitleyebilirsin.'
          : 'Giriş yapıldı. Artık listeni cihazlar arası eşitleyebilirsin.'
      );
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Kimlik doğrulama başarısız.');
    } finally {
      setBusy(false);
    }
  };

  const handlePush = async () => {
    if (!user) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await pushStateToCloud(user.id, state);
      setStatusMsg('Tüm sıralamaların ve Gideceklerim listen Supabase bulutuna kaydedildi.');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Bulut kaydı sırasında hata oluştu.';
      setStatusMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const handlePull = async () => {
    if (!user) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const data = await pullStateFromCloud(user.id);
      if (data) {
        onApplyCloudState(data);
        setStatusMsg('Buluttaki son sıralaman bu cihaza indirildi.');
      } else {
        setStatusMsg('Bulutta henüz kayıtlı listen yok; önce "Buluta Gönder" ile kaydedebilirsin.');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Buluttan veri okunamadı.';
      setStatusMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    onUserChange(null);
    setStatusMsg('Çıkış yapıldı. Yerel listen cihazında güvende.');
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bulut senkronizasyonu ve üyelik"
    >
      <div className="w-full max-w-md rounded-xl border border-[#D8E0E4] bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E4E8EB]">
          <div>
            <h2 className="text-base font-extrabold text-[#111827] flex items-center gap-2 tracking-tight">
              {isSupabaseConfigured ? (
                <Cloud className="w-4 h-4 text-[#059669]" />
              ) : (
                <CloudOff className="w-4 h-4 text-[#D97706]" />
              )}
              Supabase Bulut & Üyelik
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isSupabaseConfigured
                ? 'Canlı PostgreSQL + RLS senkronizasyonu aktif.'
                : 'Çevrimdışı yerel mod aktif — bulut anahtarı girildiğinde anında açılır.'}
            </p>
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
          {!isSupabaseConfigured ? (
            <div className="rounded-lg bg-[#F8FAFB] border border-[#E4E8EB] p-4 text-xs text-[#475569] space-y-2 leading-relaxed">
              <p className="font-bold text-[#111827]">3 Dakikada Canlı Supabase Bağlantısı</p>
              <p>
                1. <code className="text-[#0B4A4F] font-semibold">supabase/migrations/001_initial_schema.sql</code>{' '}
                dosyasını Supabase SQL Editor’de çalıştır.
              </p>
              <p>
                2. <code className="text-[#0B4A4F] font-semibold">.env.example</code> dosyasını{' '}
                <code className="text-[#0B4A4F] font-semibold">.env.local</code> yapıp{' '}
                <code className="text-[#0B4A4F] font-semibold">VITE_SUPABASE_URL</code> ve{' '}
                <code className="text-[#0B4A4F] font-semibold">VITE_SUPABASE_ANON_KEY</code> değerlerini ekle.
              </p>
              <p className="text-[#059669] font-semibold pt-1">
                Şu an tüm verilerin cihazında kesintisiz saklanıyor ve linkle paylaşılabiliyor.
              </p>
            </div>
          ) : user ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#047857]">
                    <CheckCircle2 className="w-4 h-4" />
                    Bağlı Hesap
                  </div>
                  {isAdmin && (
                    <span className="rounded bg-[#0B4A4F] px-2 py-0.5 text-[10px] font-bold text-white">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[#111827] mt-1 font-semibold">{user.email}</div>
              </div>

              <form onSubmit={handleSaveProfile} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFB] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[#0B4A4F]">Herkese Açık @kullaniciadi Profili</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    required
                    value={profileHandle}
                    onChange={(e) => setProfileHandle(e.target.value)}
                    placeholder="@kullaniciadi"
                    className="rounded border border-[#D8E0E4] bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Ad Soyad"
                    className="rounded border border-[#D8E0E4] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    placeholder="Şehir (örn. İstanbul)"
                    className="flex-1 rounded border border-[#D8E0E4] bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={busy || !profileHandle.trim()}
                    className="rounded bg-[#0B4A4F] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                  >
                    Profili Kaydet
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePush()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B4A4F] py-2.5 text-xs font-bold text-white hover:bg-[#083A3E] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Buluta Gönder
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePull()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D8E0E4] bg-white py-2.5 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer disabled:opacity-50"
                >
                  Buluttan Çek
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] py-2 text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Oturumu Kapat
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F1F5F8] p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-md py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                    mode === 'login' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-md py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                    mode === 'signup' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Kayıt Ol
                </button>
              </div>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresin"
                className="w-full rounded-lg border border-[#D8E0E4] bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#0B4A4F] focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre (en az 6 karakter)"
                className="w-full rounded-lg border border-[#D8E0E4] bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#0B4A4F] focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[#0B4A4F] py-2.5 text-sm font-bold text-white hover:bg-[#083A3E] cursor-pointer disabled:opacity-60"
              >
                {busy ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signInWithOAuthProvider('google').catch((err) => setStatusMsg(err instanceof Error ? err.message : 'Google girişi başlatılamadı.'))}
                  className="rounded-lg border border-[#D8E0E4] bg-white py-2 text-xs font-bold text-[#111827] hover:bg-[#F3F6F8] cursor-pointer"
                >
                  Google ile Devam Et
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signInWithOAuthProvider('apple').catch((err) => setStatusMsg(err instanceof Error ? err.message : 'Apple girişi başlatılamadı.'))}
                  className="rounded-lg border border-[#111827] bg-[#111827] py-2 text-xs font-bold text-white hover:bg-[#1F2937] cursor-pointer"
                >
                  Apple ile Devam Et
                </button>
              </div>
            </form>
          )}

          {statusMsg && (
            <p className="rounded-lg bg-[#F8FAFB] border border-[#E4E8EB] px-3.5 py-2.5 text-xs font-medium text-[#111827]">
              {statusMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
