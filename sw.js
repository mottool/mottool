// ============================================================
// mottool — Service Worker
// ============================================================
// 핵심 동작:
//   - 정적 리소스 (HTML/CSS/JS/icons) 를 cache-first 로 제공 → 오프라인에서도 셸 동작
//   - books.json / Supabase API → network-first (항상 최신 데이터 우선)
//   - 푸시 알림 수신 (Web Push API)
//   - 알림 클릭 → 해당 페이지 열기
// ============================================================

const VERSION = 'mottool-v5';
const CORE = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/manifest.json',
  '/manifest-admin.json',
  '/supabase-client.js',
  '/supabase-config.js',
  '/assets/book.png',
  '/assets/mascot.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-apple.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Supabase / 외부 API → 항상 네트워크 (캐시 안 함)
  if (url.origin.includes('supabase.co') || url.origin.includes('googleapis.com')) {
    return; // 기본 동작 (캐시 안 거침)
  }
  if (req.method !== 'GET') return;

  // navigation (HTML) → network-first, 실패 시 캐시
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // 정적 리소스 → cache-first, 백그라운드로 갱신
  e.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});

// ============================================================
// Push 알림 (백그라운드)
// ============================================================
// 서버에서 push 보내면 이 핸들러가 받아서 사용자에게 표시.
// 페이로드 형식: { title, body, url, tag }
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: 'mottool', body: e.data ? e.data.text() : '' };
  }
  const title = data.title || 'mottool';
  const opts = {
    body: data.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [120, 50, 120],
    tag: data.tag || 'mottool-notification',
    data: { url: data.url || '/admin.html' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || '/admin.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      for (const c of all) {
        if (c.url.includes(target) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

// ============================================================
// 메시지 — 메인 페이지 → SW 통신 (예: skipWaiting 트리거)
// ============================================================
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
