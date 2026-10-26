/* Service worker прототипа 1win Reels.
   Ролики (*.mp4): cache-first — один раз скачали, дальше всегда из кэша.
   Страница: stale-while-revalidate — открывается из кэша и тихо обновляется в фоне.
   Чтобы сбросить кэш после замены роликов, увеличьте номер версии ниже. */
const CACHE = 'reels-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith('.mp4')) {
    // ключ кэша — сам адрес, без заголовка Range: страница запрашивает файл целиком
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(url.href);
      if (hit) return hit;
      const res = await fetch(url.href);
      if (res.ok && res.status === 200) c.put(url.href, res.clone());
      return res;
    })());
    return;
  }

  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
  }
});
