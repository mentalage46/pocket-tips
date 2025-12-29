# PWA (Progressive Web App)

## PWA란?

> 웹 기술로 네이티브 앱 같은 경험을 제공

**핵심 기능**

- 오프라인 지원
- 홈 화면 설치
- 푸시 알림
- 백그라운드 동기화

---

## 필수 구성 요소

### 1. manifest.json

```json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```html
<link rel="manifest" href="/manifest.json" />
```

### 2. Service Worker

```javascript
// sw.js
const CACHE_NAME = "v1";
const ASSETS = ["/", "/index.html", "/style.css", "/app.js"];

// 설치
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// 요청 가로채기 (Cache First)
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
```

```javascript
// 등록 (main.js)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

---

## 캐싱 전략

| 전략                       | 설명                            | 용도                 |
| -------------------------- | ------------------------------- | -------------------- |
| **Cache First**            | 캐시 우선                       | 정적 자산            |
| **Network First**          | 네트워크 우선                   | API 데이터           |
| **Stale While Revalidate** | 캐시 반환 + 백그라운드 업데이트 | 자주 변경되는 콘텐츠 |

---

## Workbox (구글 라이브러리)

```javascript
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

// 정적 자산 프리캐시
precacheAndRoute(self.__WB_MANIFEST);

// API는 Network First
registerRoute(({ url }) => url.pathname.startsWith("/api"), new NetworkFirst());

// 이미지는 Cache First
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({ cacheName: "images" })
);
```

---

## 🎯 PWA 체크리스트

- [ ] HTTPS 필수
- [ ] manifest.json 설정
- [ ] Service Worker 등록
- [ ] 오프라인 폴백 페이지
- [ ] 아이콘 (192x192, 512x512)
- [ ] Lighthouse PWA 점수 확인
