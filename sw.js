// Service Worker for ONYX Hospitality Engine
const CACHE_NAME = 'onyx-cache-v13';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/cloud-config.js',
  '/js/telemetry.js',
  '/js/menu-data.js',
  '/js/db-service.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.png',
  '/icons/apple-touch-icon.png',
  '/icons/payment-qr.png',
  '/icons/payment-qr.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-First with Cache Fallback strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Skip API requests, EventSource streams, and external domains
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.protocol === 'chrome-extension:' || url.hostname.includes('supabase.co') || url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

