const CACHE = 'aes-lab-v7';
const ASSETS = [
  '/', '/index.html', '/css/style.css?v=4', '/js/main.js', '/js/aes-js.js',
  '/pagefind/pagefind-ui.js', '/pagefind/pagefind-ui.css', '/pagefind/pagefind.js',
  '/manifest.json'
];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
