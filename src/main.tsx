import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const BUILD_VERSION = 'tadimrotasi-v5.5';

// Automatically purge stale Service Workers & old caches so localhost preview always loads fresh
if ('serviceWorker' in navigator) {
  const lastVersion = localStorage.getItem('tr_build_version');
  if (lastVersion !== BUILD_VERSION) {
    localStorage.setItem('tr_build_version', BUILD_VERSION);
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        keys.forEach((k) => void caches.delete(k));
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
