# PWA (Progressive Web App)

## PWA란?

> 웹 기술로 네이티브 앱 같은 경험을 제공

**핵심 기능**

- 오프라인 지원
- 홈 화면 설치
- 푸시 알림
- 백그라운드 동기화

---

## 개념: PWA는 제품이 아니라 "웹 기술의 조합"

PWA는 별도 플랫폼이 아니라 **HTTPS + 웹 앱 매니페스트 + 서비스 워커** 같은 표준 기술을 조합해 웹 앱이 설치 가능하고 네트워크가 불안정해도 동작하게 만든 것입니다. 네이티브 앱을 대체한다기보다 **"웹의 도달 범위(링크, 검색, 설치 없이 사용)에 앱다운 경험을 더하는"** 접근입니다.

| 구성 | 역할 |
| --- | --- |
| HTTPS | 서비스 워커는 안전한 출처에서만 동작 (`localhost`는 개발용 예외) |
| 매니페스트 | 이름, 아이콘, 시작 URL, 표시 방식 → **설치 가능**하게 하는 메타데이터 |
| 서비스 워커 | 페이지와 네트워크 사이에 끼는 스크립트 → **오프라인, 캐싱, 푸시** |

### 설치 가능 조건 (Chromium 기준)

- HTTPS로 제공
- 매니페스트에 `name`(또는 `short_name`), **192px와 512px 아이콘**, `start_url`, `display`(`fullscreen`, `standalone`, `minimal-ui`, `window-controls-overlay` 중 하나) 포함
- `prefer_related_applications`가 없거나 `false`
- 사용자가 페이지를 한 번 이상 클릭·탭하고 **30초 이상** 본 뒤(참여 조건)
- 이미 설치되어 있지 않음

> 설치 조건은 브라우저마다 조금씩 다릅니다. 위 목록은 web.dev가 정리한 Chromium 기준이며, Safari와 Firefox는 확인하지 않았습니다(미확인). 이 문서의 출처는 서비스 워커가 설치 조건이라고 적지 않았습니다. 서비스 워커는 **오프라인과 푸시를 위한 것**으로 이해합니다.

### 서비스 워커의 성격

- **메인 스레드 밖**의 별도 워커입니다. **DOM에 접근할 수 없고**, 페이지와는 메시지로 통신합니다.
- **이벤트로 깨어나는** 구조입니다(`install`, `activate`, `fetch`, `push` 등). 계속 떠 있는 서버가 아니므로 **전역 변수에 상태를 두지 말고**, 비동기 작업은 `event.waitUntil()`로 끝날 때까지 종료되지 않게 합니다.
- **프록시처럼 모든 요청을 가로챌 수** 있습니다. 그만큼 잘못 만들면 사이트 전체가 오래된 파일만 보여 주게 됩니다.
- **범위(scope)**: 기본적으로 서비스 워커 파일이 있는 디렉터리와 그 하위만 제어합니다. `/js/sw.js`는 `/js/` 아래만 다룹니다. 사이트 전체를 다루려면 **루트(`/sw.js`)에 두거나** `Service-Worker-Allowed` 헤더를 사용합니다.

### 수명주기와 업데이트: 가장 자주 하는 실수

```
register → install → (waiting) → activate → 제어 시작
                         ↑
        이전 버전이 제어 중인 탭이 모두 닫힐 때까지 새 버전은 대기
```

1. 새 `sw.js`를 배포하면 브라우저가 파일이 바뀐 것을 감지해 새 버전을 `install`합니다.
2. 기존 탭이 이전 버전의 제어를 받고 있으면 새 버전은 **waiting 상태로 대기**합니다. 새로고침만으로는 바뀌지 않고, **그 사이트의 모든 탭을 닫아야** 활성화됩니다.
3. `skipWaiting()`을 호출하면 대기하지 않고 바로 활성화합니다. `clients.claim()`은 이미 열린 페이지까지 제어하게 합니다. 열려 있던 문서는 원래 처음 로드된 때의 제어 상태를 유지하기 때문입니다.

| 선택 | 장점 | 위험 |
| --- | --- | --- |
| 대기 (기본) | 한 페이지 안에서 버전이 섞이지 않음 | 사용자가 탭을 닫기 전까지 업데이트가 안 보임 |
| `skipWaiting()` + `clients.claim()` | 업데이트가 빨리 반영됨 | 이미 열린 페이지가 **새 서비스 워커 + 옛날 JS/HTML**로 동작해 깨질 수 있음 |
| "새 버전이 있습니다. 새로고침" 안내 | 사용자가 시점을 정함 | UI를 만들어야 함 (Angular는 `SwUpdate`) |

### 캐시 무효화는 직접 해야 한다

서비스 워커의 Cache는 브라우저 HTTP 캐시와 별개이고 **자동으로 만료되지 않습니다.** 그래서 캐시 이름에 버전을 두고, 새 버전이 `activate`될 때 이전 캐시를 지웁니다.

```javascript
const CACHE_NAME = "v2"; // 파일 목록이 바뀌면 올림

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});
```

> Cache First로 `/index.html`을 캐시하면 사용자가 **오래된 앱 셸**을 계속 받습니다. HTML은 Network First(또는 Stale While Revalidate)로 두고, 해시가 붙은 JS/CSS처럼 **내용이 바뀌면 이름이 바뀌는 파일**만 Cache First로 둡니다.

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

// 요청 가로채기 (Cache First). HTML까지 Cache First면 앱이 갱신되지 않음 → 위 "캐시 무효화" 참고
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

요청마다 "캐시와 네트워크 중 무엇을 먼저 믿을까"를 정하는 것입니다.

| 전략                       | 동작                                 | 용도                                           | 주의 |
| -------------------------- | ------------------------------------ | ---------------------------------------------- | ---- |
| **Cache First**            | 캐시에 있으면 사용, 없으면 네트워크  | 버전이 정해진 정적 자산(해시 파일), 오프라인 우선 | 갱신이 안 보임 → 파일 이름에 해시 |
| **Network First**          | 네트워크 우선, 실패하면 캐시         | 자주 바뀌는 데이터, HTML                       | 느린 네트워크에서 오래 기다린 뒤 캐시로 전환 |
| **Stale While Revalidate** | 캐시를 즉시 주고 백그라운드에서 갱신 | 최신이 필수는 아닌 자주 바뀌는 리소스(아바타 등) | 한 번은 오래된 값을 보여 줌 |
| **Cache Only**             | 캐시만 사용                          | 설치 때 캐시한 앱 버전 고정 자산                | 캐시에 없으면 실패 |
| **Network Only**           | 항상 네트워크                        | 오프라인 대체가 없는 요청(분석 전송, **POST 등 GET이 아닌 요청**) | 오프라인 불가 |

- 한 앱 안에서 **리소스 종류별로 전략을 섞습니다.** 정적 자산은 Cache First, API는 Network First, 결제처럼 최신이 중요한 요청은 Network Only.
- 개인 정보가 담긴 응답(인증된 API)을 서비스 워커 캐시에 남길 때는 로그아웃 시 지우는 정책까지 정합니다.

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

## Angular PWA

### 설치

```bash
ng add @angular/pwa
```

이 명령은 자동으로:

- `manifest.webmanifest` 생성
- Service Worker 설정 (`ngsw-config.json`)
- `index.html`에 manifest 링크 추가
- 앱 아이콘 생성

### ngsw-config.json

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api",
      "urls": ["/api/**"],
      "cacheConfig": {
        "maxSize": 100,
        "maxAge": "1h",
        "strategy": "freshness"
      }
    }
  ]
}
```

### SwUpdate Service

```typescript
import { SwUpdate } from "@angular/service-worker";
import { inject } from "@angular/core";

export class AppComponent {
  private swUpdate = inject(SwUpdate);

  ngOnInit() {
    // 업데이트 확인
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === "VERSION_READY") {
          if (confirm("새 버전이 있습니다. 업데이트하시겠습니까?")) {
            window.location.reload();
          }
        }
      });
    }
  }
}
```

### 푸시 알림 (Angular)

```typescript
import { SwPush } from "@angular/service-worker";

export class NotificationService {
  private swPush = inject(SwPush);

  subscribeToPush() {
    this.swPush
      .requestSubscription({
        serverPublicKey: "YOUR_PUBLIC_KEY",
      })
      .then((sub) => console.log("Subscribed", sub))
      .catch((err) => console.error("Error", err));
  }

  // 푸시 메시지 수신
  ngOnInit() {
    this.swPush.messages.subscribe((msg) => {
      console.log("Push message:", msg);
    });
  }
}
```

---

## 🎯 PWA 체크리스트

- [ ] HTTPS 필수
- [ ] manifest.json 설정
- [ ] Service Worker 등록
- [ ] 오프라인 폴백 페이지
- [ ] 아이콘 (192x192, 512x512)
- [ ] 서비스 워커 업데이트 전략 결정 (대기 / `skipWaiting` / 새로고침 안내)
- [ ] 이전 버전 캐시 삭제(`activate`)
- [ ] HTML은 Cache First를 피함
- [ ] 설치 가능 여부는 개발자 도구 Application 탭에서 확인 (Lighthouse의 PWA 점수 검사는 폐기됨)

## 참고 자료

- [web.dev: Installation criteria](https://web.dev/articles/install-criteria) - Chromium 설치 조건(HTTPS, 매니페스트 필수 항목, 아이콘 192/512, 참여 조건)
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) - 수명주기, HTTPS 요구와 `localhost` 예외, 범위 규칙, `skipWaiting()`·`clients.claim()`, `waitUntil()`
- [web.dev: The Offline Cookbook](https://web.dev/articles/offline-cookbook) - 캐싱 전략별 용도
- [Chrome Developers: Lighthouse PWA](https://developer.chrome.com/docs/lighthouse/pwa/) - Lighthouse의 PWA 테스트 폐기 안내

확인일: 2026-10-22 (설치 조건은 Chromium 한정, 수명주기·범위·캐싱 전략·Lighthouse 폐기. 서비스 워커가 설치 필수인지, Safari·Firefox 조건, "이벤트로 깨어나므로 전역 상태 금지"의 세부 동작, 아래 Workbox·Angular PWA 예시는 미확인·일반 개념)
