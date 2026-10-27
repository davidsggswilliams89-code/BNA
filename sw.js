'use strict';
const CACHE_NAME = 'bna-business-offline-v2';
const APP_FILES = [
  './', './index.html', './accounts.html', './store.html', './transactions.html',
  './POS.html', './drinks.html', './sw.js'
];
const FIREBASE_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_FILES.map(async path => {
      try { const res = await fetch(path, {cache:'reload'}); if(res.ok) await cache.put(path,res); } catch (_) {}
    }));
    // Best-effort cache of Firebase SDK files while online; required for app startup offline.
    await Promise.all(FIREBASE_SCRIPTS.map(async url => {
      try { const res = await fetch(url, {mode:'no-cors', cache:'reload'}); if(res && (res.ok || res.type==='opaque')) await cache.put(url,res); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('bna-business-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim()})());
});
self.addEventListener('fetch', event => {
  const req=event.request; if(req.method!=='GET')return;
  const url=new URL(req.url); const sameOrigin=url.origin===self.location.origin; const firebaseSdk=url.origin==='https://www.gstatic.com'&&url.pathname.includes('/firebasejs/');
  if(!sameOrigin&&!firebaseSdk)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME); const cached=await cache.match(req,{ignoreSearch:true});
    if(cached){ if(sameOrigin) fetch(req).then(r=>{if(r&&r.ok)cache.put(req,r.clone())}).catch(()=>{}); return cached; }
    try{const response=await fetch(req);if(response&&(response.ok||response.type==='opaque'))cache.put(req,response.clone()).catch(()=>{});return response;}
    catch(_){if(cached)return cached;if(req.mode==='navigate'){const home=await cache.match('./index.html');if(home)return home;}return new Response('Offline: this file has not been cached on this device yet.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}
  })());
});
