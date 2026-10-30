const VERSION = 'svs-pwa-v1';
const APP_SHELL = ['./','./index.html','./pwa.css','./pwa.js','./fashion-prompts.js','./fashion-ui.js','./manifest.webmanifest','./icons/icon-32.png','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_SHELL))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put('./index.html', copy)); return response; }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => { if (response.ok) caches.open(VERSION).then(cache => cache.put(request, response.clone())); return response; }).catch(() => cached);
    return cached || network;
  }));
});
