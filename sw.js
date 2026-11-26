// ভাড়ার খাতা: lets the website open like an installed app, also without internet.
// Only this site's own files are kept. Ledger data (Supabase) and fonts always come from the network, never from here.
// Paths are relative, so it works at the site root (Vercel) and in a sub-folder (GitHub Pages).
// Raise the version when the list of files below changes.
const CACHE = 'bharar-khata-app-v1';
const PAGE = new URL('./', self.location).href;
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('bharar-khata-app-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google Fonts: straight to the network

  // the page itself: always the newest from the network, the saved copy only when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(PAGE, copy)); }
          return res;
        })
        .catch(() => caches.match(PAGE).then(hit => hit || Response.error()))
    );
    return;
  }

  // icons and the manifest: saved copy at once, refreshed in the background
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    })
  );
});
