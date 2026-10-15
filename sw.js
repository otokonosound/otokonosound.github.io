/* Service worker : le jeu et les morceaux déjà joués restent disponibles hors connexion. */
const CACHE = 'otoko-live-v10';
const SHELL = ['./', 'index.html', 'game.js', 'charter.js', 'songs.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // audio et partitions : cache d'abord ; le reste : réseau d'abord pour recevoir les mises à jour
  const cacheFirst = /\/(audio|charts)\//.test(url.pathname);
  e.respondWith(cacheFirst
    ? caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res; }))
    : fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res; }).catch(() => caches.match(e.request)));
});
