'use strict';
const CACHE_NAME='bna-business-shell-v2';
const APP_FILES=[
 './','./index.html','./POS.html','./accounts.html','./drinks.html',
 './store.html','./transactions.html','./README.md',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE_NAME);
 await Promise.all(APP_FILES.map(async path=>{try{const response=await fetch(path,{cache:'reload'});if(response.ok)await cache.put(path,response)}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('bna-business-shell-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url),sameOrigin=url.origin===self.location.origin;
 const isFirebaseScript=url.hostname==='www.gstatic.com'&&url.pathname.includes('/firebasejs/');
 if(!sameOrigin&&!isFirebaseScript)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);const cached=await cache.match(req,{ignoreSearch:true});
  try{const response=await fetch(req);if(response&&response.ok)cache.put(req,response.clone()).catch(()=>{});return response}
  catch(_){if(cached)return cached;if(req.mode==='navigate'){const fallback=await cache.match('./index.html')||await cache.match('./');if(fallback)return fallback}
   return new Response('Offline: this resource has not been cached on this device yet.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}
 })());
});
