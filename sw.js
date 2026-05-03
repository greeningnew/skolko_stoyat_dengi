const CACHE_NAME = 'skolko-stoyat-dengi-v14-ui-cleanup';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/logo.svg',
  './assets/favicon.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/categories/business.svg',
  './assets/categories/clothes.svg',
  './assets/categories/credit.svg',
  './assets/categories/debt.svg',
  './assets/categories/entertainment.svg',
  './assets/categories/food.svg',
  './assets/categories/health.svg',
  './assets/categories/other.svg',
  './assets/categories/restaurant.svg',
  './assets/categories/smoking.svg',
  './assets/categories/sport.svg',
  './assets/categories/subscriptions.svg',
  './assets/categories/transport.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
