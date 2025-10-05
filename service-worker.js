const CACHE_NAME = 'mushitori-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/pop.mp3',
  '/bgm.mp3',
  '/manifest.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request).then((fetchResp) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(evt.request, fetchResp.clone());
          return fetchResp;
        });
      }).catch(() => {
        // If offline and request is navigation, serve cached index.html
        if (evt.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
