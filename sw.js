const CACHE = 'flashy-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/flashcards.css',
  './css/content.css',
  './css/themes.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/render.js',
  './js/data.js',
  './js/views/home.js',
  './js/views/subject.js',
  './js/views/chapter.js',
  './js/views/flashcards.js',
  './js/views/summary.js',
  './js/views/exercises.js',
  './js/views/resources.js',
  './js/views/search.js',
  './js/views/glossary.js',
  './js/views/settings.js',
  './js/services/spaced.js',
  './js/services/timer.js',
  './data/index.json',
  './data/geo/chine/cards.json',
  './data/geo/chine/summary.json',
  './data/geo/chine/exercises.json',
  './data/geo/chine/resources.json'
];

// Install: pre-cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first, fallback to network, cache new responses
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline: serve index for navigation requests
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
