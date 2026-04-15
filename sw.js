// ₿ To The Moon!! — Service Worker
// Caches the app shell for fast loading and offline fallback

const CACHE_NAME = 'moon-cache-v1';

// Core files to cache on install
const CORE_FILES = [
  '/Crypto-Tracker/',
  '/Crypto-Tracker/index.html',
  '/Crypto-Tracker/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap'
];

// Install — cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_FILES).catch(err => {
        // Don't fail install if external resources can't be cached
        console.warn('SW: Some files could not be cached', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls (coingecko, finnhub, rss2json) → always network, never cache
// - Core app files → cache first, fall back to network
// - Everything else → network first, fall back to cache
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always fetch live data from APIs — never serve stale prices
  if (
    url.includes('coingecko.com') ||
    url.includes('finnhub.io') ||
    url.includes('rss2json.com') ||
    url.includes('coincap.io')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Core app files — cache first
  if (url.includes('/Crypto-Tracker/') || url.includes('chart.umd.min.js') || url.includes('fonts.googleapis')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Default — network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
