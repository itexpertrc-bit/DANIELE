// Service worker - HR Orion
// Strategia: prima la rete (così gli aggiornamenti arrivano subito), se offline usa la copia salvata.
const CACHE = 'hr-orion-v1';
const SHELL = [
  './', './index.html', './admin.html',
  './manifest.webmanifest', './manifest-admin.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // un file mancante non deve bloccare l'installazione
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                              // i POST verso Google Script non si toccano
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;               // Google Script e font restano in rete

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
