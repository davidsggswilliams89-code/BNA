/* B-N-A offline-first app shell for GitHub Pages. Keep this file beside index.html. */
'use strict';
const CACHE_VERSION = 'bna-offline-v3';
const SHELL = ['./', './index.html', './sw.js'];
const FIREBASE_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    for (const path of SHELL) {
      try { const response = await fetch(path, {cache:'reload'}); if (response.ok) await cache.put(path, response.clone()); }
      catch (_) { /* Cache the remaining shell assets even if one alias is unavailable. */ }
    }
    for (const url of FIREBASE_ASSETS) {
      try { const response = await fetch(url, {mode:'cors', credentials:'omit'}); if (response.ok) await cache.put(url, response.clone()); }
      catch (_) { /* Runtime caching can fill this later while online. */ }
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
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
  const sameOrigin = url.origin === self.location.origin;
  const isAppNavigation = request.mode === 'navigate' && sameOrigin;
  const isAppShellFile = sameOrigin && (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/sw.js'));
  const isFirebaseSDK = url.origin === 'https://www.gstatic.com' && /firebasejs\/10\.12\.2\/firebase-(app|firestore|auth)-compat\.js$/.test(url.pathname);
  const isLocalAsset = sameOrigin && /\.(js|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
  if (isAppNavigation || isAppShellFile) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cacheKey = isAppNavigation ? './index.html' : request;
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(cacheKey, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return (await cache.match(request)) || (await cache.match(cacheKey)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  if (isFirebaseSDK || isLocalAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) {
        fetch(request).then(response => { if (response && response.ok) cache.put(request, response.clone()).catch(() => {}); }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) { return Response.error(); }
    })());
  }
});
