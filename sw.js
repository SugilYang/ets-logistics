// ETS 해외물류 관리시스템 - Service Worker
// 전략: network-first (항상 서버에서 최신을 먼저 가져오고, 오프라인일 때만 캐시 폴백)
const CACHE_NAME = 'ets-logistics-v1';

self.addEventListener('install', (e) => {
  // 새 SW를 즉시 활성화
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 오래된 캐시 정리
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // GET 요청만 처리
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 같은 출처만 처리 (외부 CDN, 백엔드 API 등은 건드리지 않음)
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      // network-first: 항상 서버에서 먼저
      const fresh = await fetch(req, { cache: 'no-store' });
      // 성공하면 캐시에도 저장(오프라인 폴백용)
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      } catch (_) {}
      return fresh;
    } catch (err) {
      // 네트워크 실패 → 캐시 폴백
      const cached = await caches.match(req);
      if (cached) return cached;
      // index.html 요청이면 캐시된 index.html로 폴백
      const fallback = await caches.match('index.html');
      if (fallback) return fallback;
      throw err;
    }
  })());
});
