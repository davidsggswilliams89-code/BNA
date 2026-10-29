/* B-N-A offline app shell and runtime asset cache. Deploy beside index.html on GitHub Pages. */
'use strict';
const CACHE_VERSION = 'bna-offline-v2';
const APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    for (const url of APP_SHELL) {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (error) { /* GitHub Pages may not serve both aliases; cache whichever exists. */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('bna-offline-') && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isAppPage = url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  const isScriptOrStyle = /\.(js|css)(\?.*)?$/i.test(url.pathname) ||
    (url.origin === 'https://www.gstatic.com' && /firebasejs/i.test(url.pathname));

  if (isAppPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (error) {
        return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Cache successful same-origin files and Firebase SDK scripts so a previously
  // opened app can load its UI while disconnected. Never cache Firestore API data.
  if (isScriptOrStyle) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) {
        fetch(request).then(response => {
          if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        return Response.error();
      }
    })());
  }
});
