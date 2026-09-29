// Service Worker:App 殼層快取,離線也能開
// 改版時把 VERSION +1,舊快取會在 activate 時清掉
const VERSION = 'daily-ledger-v42';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './entry-fx.js',
  './reconcile.js',
  './institutions.js',
  './icons/banks/aeonbank.png',
  './icons/banks/affin.png',
  './icons/banks/agrobank.png',
  './icons/banks/alliance.png',
  './icons/banks/ambank.png',
  './icons/banks/bankislam.png',
  './icons/banks/bankrakyat.png',
  './icons/banks/bigpay.png',
  './icons/banks/boost.png',
  './icons/banks/boostbank.png',
  './icons/banks/bsn.png',
  './icons/banks/cimb.png',
  './icons/banks/citi.png',
  './icons/banks/grabpay.png',
  './icons/banks/gxbank.png',
  './icons/banks/hongleong.png',
  './icons/banks/hsbc.png',
  './icons/banks/lazada.png',
  './icons/banks/mae.png',
  './icons/banks/maybank.png',
  './icons/banks/mbsb.png',
  './icons/banks/muamalat.png',
  './icons/banks/ocbc.png',
  './icons/banks/publicbank.png',
  './icons/banks/rhb.png',
  './icons/banks/sc.png',
  './icons/banks/setel.png',
  './icons/banks/shopeepay.png',
  './icons/banks/tng.png',
  './icons/banks/uob.png',
  './lib/idb-keyval.js',
  './manifest.json',
  './privacy.html',
  './terms.html',
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
