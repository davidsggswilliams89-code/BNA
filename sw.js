'use strict';

const CACHE_NAME = 'bna-business-shell-v1';
const APP_FILES = [
  './',
  './index.html',
  './index_mobile_compact.html',
  './accounts.html',
  './store.html',
  './add-transaction.html',
  './transactions.html',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache only files that exist; one optional page must not break installation.
    await Promise.all(APP_FILES.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok) await cache.put(path, response);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('bna-business-shell-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });

    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html') || await cache.match('./index_mobile_compact.html') || await cache.match('./');
        if (fallback) return fallback;
      }
      return new Response('You are offline and this page is not cached on this device yet.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
