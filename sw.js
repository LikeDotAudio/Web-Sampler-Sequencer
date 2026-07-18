self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('sampler-store').then((cache) => cache.addAll([
      './index.html',
      './manifest.json',
      './ICON and LOGO/icon-192.png',
      './ICON and LOGO/icon-512.png'
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
