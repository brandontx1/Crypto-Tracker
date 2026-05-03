// ₿ MoonTick Service Worker — To The Moon!!
const CACHE_NAME = ‘moon-cache-v3’;

const CORE_FILES = [
‘/Crypto-Tracker/’,
‘/Crypto-Tracker/index.html’,
‘/Crypto-Tracker/manifest.json’,
‘/Crypto-Tracker/icon-192.png’,
‘/Crypto-Tracker/icon-512.png’,
‘https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js’,
‘https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js’,
‘https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap’
];

// ── INSTALL — cache core files ─────────────────────────────
self.addEventListener(‘install’, event => {
// Skip waiting immediately so new SW activates right away
self.skipWaiting();
event.waitUntil(
caches.open(CACHE_NAME).then(cache => {
return cache.addAll(CORE_FILES).catch(err => {
// Don’t fail install if external CDN files can’t be cached
console.warn(’[SW] Some files could not be cached:’, err);
});
})
);
});

// ── ACTIVATE — clean up old caches ────────────────────────
self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys
.filter(key => key !== CACHE_NAME)
.map(key => {
console.log(’[SW] Deleting old cache:’, key);
return caches.delete(key);
})
)
).then(() => self.clients.claim())
);
});

// ── MESSAGE — handle skip waiting from page ────────────────
self.addEventListener(‘message’, event => {
if (event.data && event.data.type === ‘SKIP_WAITING’) {
self.skipWaiting();
}
});

// ── FETCH — smart caching strategy ────────────────────────
self.addEventListener(‘fetch’, event => {
const url = event.request.url;

// NEVER cache live API data — always fetch fresh prices
if (
url.includes(‘coingecko.com’) ||
url.includes(‘finnhub.io’) ||
url.includes(‘rss2json.com’) ||
url.includes(‘coincap.io’) ||
url.includes(‘fonts.gstatic.com’)
) {
event.respondWith(
fetch(event.request).catch(() => {
// If API is down, just fail gracefully — never serve stale prices
return new Response(’’, { status: 503 });
})
);
return;
}

// index.html — network first, short cache fallback
// This ensures updated app code always loads
if (url.includes(’/Crypto-Tracker/’) && (url.endsWith(’/’) || url.endsWith(‘index.html’))) {
event.respondWith(
fetch(event.request)
.then(response => {
// Cache a fresh copy
const clone = response.clone();
caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
return response;
})
.catch(() => {
// Offline fallback — serve cached version
return caches.match(event.request);
})
);
return;
}

// Static assets (icons, Chart.js, fonts CSS) — cache first
if (
url.includes(’/Crypto-Tracker/icon’) ||
url.includes(’/Crypto-Tracker/manifest.json’) ||
url.includes(‘chart.umd.min.js’) ||
url.includes(‘qrcode.min.js’) ||
url.includes(‘fonts.googleapis.com’)
) {
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

// Default — network first, cache fallback
event.respondWith(
fetch(event.request).catch(() => caches.match(event.request))
);
});
