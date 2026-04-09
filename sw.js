const CACHE = 'flashy';

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

// Install: pre-cache all files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: take control immediately
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// Fetch: stale-while-revalidate
// → Sert le cache immédiatement (rapide)
// → Met à jour le cache en arrière-plan (frais)
// → Au prochain chargement, l'élève a la dernière version
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    )
  );
});
