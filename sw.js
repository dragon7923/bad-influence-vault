// Offline helper: keeps the app and the paint lists on the device so it opens fast.
// Your own data always comes fresh from your account (requests to the database are never cached).
const CACHE = 'paint-checker-cloud-1f57a2e42b';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];

// Also needed to open with no connection: the pages and the libraries. Saved on a best-effort basis, so one of them
// being unreachable doesn't stop the app installing. (The paint and barcode lists come from the database and private
// storage, and the app keeps its own copy of those.)
const EXTRA = ['./privacy.html', './credits.html', './terms.html', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js', 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).then(() => Promise.all(EXTRA.map(u => c.add(u).catch(() => {}))))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('paint-checker-cloud-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co') || url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (url.origin === location.origin) {
    // The app itself: newest version when online, saved copy when not.
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Paint lists and libraries: use the saved copy right away, refresh it in the background.
  e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
    const fresh = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  })));
});
