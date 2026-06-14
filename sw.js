// Service Worker:App 殼層快取,離線也能開
// 改版時把 VERSION +1,舊快取會在 activate 時清掉
const VERSION = 'daily-ledger-v5';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './lib/idb-keyval.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 收到「更新到最新版」指令時,立即啟用等待中的新版本
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// 快取優先、背景更新(stale-while-revalidate):
// 離線立即可用;連線時下次開啟會拿到新版本
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached ?? (request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || fresh;
    })
  );
});
