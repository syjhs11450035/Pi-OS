const CACHE_NAME = 'pios-main-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './os/style.css',
  './os/kernel.js',
  './os/i18n.js',
  './os/fs.js',
  './os/wm.js',
  './os/apploader.js',
  './os/api.js',
  './os/desktop.js',
  './os/boot.js',
  './apps/index.json',
  './apps/explorer/info.json',
  './apps/explorer/app.js',
  './apps/explorer/icon.svg',
  './apps/explorer/en.json',
  './apps/explorer/zh-tw.json',
  './apps/explorer/zh-cn.json',
  './apps/notepad/info.json',
  './apps/notepad/app.js',
  './apps/notepad/icon.svg',
  './apps/notepad/en.json',
  './apps/notepad/zh-tw.json',
  './apps/notepad/zh-cn.json',
  './apps/terminal/info.json',
  './apps/terminal/app.js',
  './apps/terminal/icon.svg',
  './apps/terminal/en.json',
  './apps/terminal/zh-tw.json',
  './apps/terminal/zh-cn.json',
  './apps/browser/info.json',
  './apps/browser/app.js',
  './apps/browser/icon.svg',
  './apps/browser/en.json',
  './apps/browser/zh-tw.json',
  './apps/browser/zh-cn.json',
  './apps/vm/info.json',
  './apps/vm/app.js',
  './apps/vm/icon.svg',
  './apps/vm/en.json',
  './apps/vm/zh-tw.json',
  './apps/vm/zh-cn.json',
  './apps/settings/info.json',
  './apps/settings/app.js',
  './apps/settings/icon.svg',
  './apps/settings/en.json',
  './apps/settings/zh-tw.json',
  './apps/settings/zh-cn.json',
  '../api/logo.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
