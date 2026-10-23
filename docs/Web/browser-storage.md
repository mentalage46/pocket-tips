# 브라우저 저장소 선택하기

> 쿠키, `localStorage`, `sessionStorage`, IndexedDB, Cache API — **무엇을 어디에 저장할지** 정하는 기준

브라우저에는 데이터를 저장하는 방법이 여럿이고, 서로 **수명, 용량, 서버 전송 여부, JS 접근 가능 여부, 저장 가능한 타입**이 다릅니다. 잘못 고르면 보안 사고(토큰 노출)나 성능 문제(메인 스레드 차단)로 이어집니다. 인증 쿠키의 상세 속성은 [Cookie](../Security/cookie.md), 토큰 보관은 [JWT](../Security/jwt.md)를 참고합니다.

> **이 문서의 동작은 실제 브라우저(Chrome 155, Playwright로 구동)에서 로컬 서버(두 개의 포트)를 열어 직접 실행해 확인했습니다.** Firefox와 Safari는 확인하지 않았고, 수치(용량 등)는 브라우저·기기·설정에 따라 달라집니다.

---

## 한눈에 비교

| | 쿠키 | `localStorage` | `sessionStorage` | IndexedDB | Cache API |
| --- | --- | --- | --- | --- | --- |
| 서버로 **자동 전송** | **예**(요청마다) | 아니오 | 아니오 | 아니오 | 아니오 |
| 수명 | 만료 설정 또는 세션 | 지울 때까지 | **탭(브라우징 컨텍스트)** 단위 | 지울 때까지 | 지울 때까지 |
| JS 접근 | `HttpOnly`면 **불가** | 가능 | 가능 | 가능 | 가능 |
| 저장 타입 | 문자열 | **문자열만** | **문자열만** | 구조화 복제(Date, Map, 바이너리 등) | `Request`/`Response` 쌍 |
| API | 문자열 파싱 | **동기** | **동기** | **비동기**(트랜잭션) | 비동기(Promise) |
| Service Worker에서 | (헤더로만) | **불가** | **불가** | 가능 | 가능 |
| 대표 용도 | 인증 세션, 서버가 알아야 하는 값 | 테마, 작은 설정 | 한 탭의 임시 상태 | 큰 데이터, 오프라인 데이터 | 오프라인 리소스 캐시 |

"Service Worker에서"는 이 문서에서 직접 확인하지 않았고, `localStorage`가 동기 API라 서비스 워커에서 쓸 수 없다는 일반적인 설명에 따른 것입니다(미확인).

---

## 직접 확인한 동작

### 모든 저장소는 출처(origin) 단위로 격리된다 — 쿠키만 예외

`http://127.0.0.1:18400`에서 데이터를 저장한 뒤 **포트만 다른** `http://127.0.0.1:18401`에서 읽었습니다.

| 저장소 | 다른 포트에서 보이는가 |
| --- | --- |
| `localStorage` | 아니오 (`null`) |
| `sessionStorage` | 아니오 (`null`) |
| IndexedDB | 아니오 (데이터베이스 목록이 빔) |
| Cache API | 아니오 (캐시 목록이 빔) |
| **쿠키** | **예** (`theme=dark`가 그대로 보임) |

쿠키는 **포트로 격리되지 않습니다.** RFC 6265가 명시한 성질입니다("Cookies do not provide isolation by port"). 같은 호스트에서 포트만 다른 서비스(개발 환경의 여러 로컬 서버 등)가 쿠키를 공유하므로, 이름이 겹치면 서로 덮어쓰고 개발 중에 원인 모를 로그인 풀림이 생깁니다. 또한 같은 호스트의 다른 포트에서 동작하는 신뢰할 수 없는 서비스가 쿠키를 읽거나 쓸 수 있다는 뜻이기도 합니다.

### HttpOnly 쿠키는 JS에서 보이지 않는다

서버가 `sid=abc; HttpOnly`와 `theme=dark`를 함께 내려보냈을 때 `document.cookie`는 **`theme=dark`만** 돌려줬습니다. XSS로 스크립트가 실행돼도 `HttpOnly` 쿠키는 읽히지 않으므로 세션 식별자는 여기에 둡니다. `localStorage`에 둔 토큰은 같은 상황에서 그대로 읽힙니다.

### `localStorage`/`sessionStorage`는 문자열만 저장한다

```js
localStorage.setItem('obj', {a: 1});   // 저장된 값: "[object Object]"
localStorage.setItem('n', 42);         // 읽으면 typeof "string"
localStorage.setItem('u', undefined);  // 저장된 값: "undefined" (문자열)
localStorage.getItem('missing');       // null
```

객체는 `JSON.stringify`/`JSON.parse`로 다뤄야 하고, 깨진 JSON이 들어 있을 때를 대비해 `try/catch`로 읽습니다. `Date`, `Map`, 바이너리는 JSON으로 왕복하면 형태를 잃습니다.

### 용량: 한계에 닿으면 예외가 난다

| 항목 | 직접 측정한 결과 (Chrome 155) |
| --- | --- |
| `localStorage`에 1MB(문자 100만 개)씩 쓰기 | **4번 성공, 5번째에 `QuotaExceededError`** |
| 쿠키 하나 | **5,000바이트는 저장되지 않음(조용히 무시)**, 3,000바이트는 저장됨 |
| `navigator.storage.estimate()`의 quota | 약 **10.7GB** (이 기기·이 세션 기준) |
| `navigator.storage.persisted()` | `false` |

- `localStorage` 한도는 **구현이 정하는 값**입니다. 현재 WHATWG HTML 명세는 "quota를 초과하면 `QuotaExceededError`를 던질 수 있다"고만 규정하고 구체적인 크기를 정하지 않습니다. 위 측정(문자 400만~500만 개 사이)은 이 브라우저에서의 값일 뿐이므로 약 5MB 정도로 보고 설계하되, **쓰기는 항상 `try/catch`** 합니다.
- 쿠키는 RFC 6265가 브라우저에 **쿠키당 최소 4096바이트**를 지원하라고 요구합니다. 그 이상은 브라우저가 거부할 수 있고, 위 실험에서 `document.cookie`로 5,000바이트를 쓰자 **오류 없이 사라졌습니다.** 쿠키는 매 요청에 실려 가므로 작게 유지합니다.
- IndexedDB와 Cache API는 `localStorage`보다 훨씬 큰 **출처 단위의 공용 할당량**을 씁니다. `estimate()`로 확인할 수 있고, 브라우저가 공간이 부족하면 **영구 저장을 요청하지 않은 데이터부터 지울 수 있습니다**(`persisted()`가 `false`). 지워지면 안 되는 데이터는 `navigator.storage.persist()`를 요청해야 하지만 이 문서에서는 호출해 확인하지 않았습니다(미확인).

### 새로고침·이동 후에도 남는가

`18400`으로 돌아와 다시 읽었을 때 `localStorage`(`ev`), `sessionStorage`(`k`), IndexedDB(`t`), Cache(`c`)가 모두 그대로였습니다. 같은 탭에서 다른 출처로 이동했다가 돌아와도 `sessionStorage`가 유지됐습니다.

### `sessionStorage`는 "탭마다"이고, 새 창으로 **복사**된다

`window.open('/', '_blank')`로 같은 출처의 새 창을 열자:

- 새 창의 `sessionStorage`에 **부모의 값이 복사**되어 있었습니다(`"session"`). HTML 명세도 "새 보조 브라우징 컨텍스트가 만들어질 때 session storage가 복사된다"고 합니다.
- 새 창에서 값을 바꿔도 **부모의 값은 바뀌지 않았습니다.** 복사본이라 서로 독립적입니다.
- 같은 출처의 `localStorage`는 두 창이 공유했습니다.

### 같은 탭의 `storage` 이벤트는 오지 않는다

`localStorage.setItem` 뒤 100ms를 기다려도 **같은 탭의 `storage` 이벤트 리스너는 호출되지 않았습니다.** 이 이벤트는 같은 출처의 **다른** 창·탭에 알리는 용도입니다(탭 간 동기화에 쓰고, 이 문서에서 두 탭 사이의 전달은 따로 실험하지 않았음).

### 동기 API의 비용

`localStorage`에 100바이트 값 2,000개를 쓰는 데 **9ms**가 걸렸습니다. 작은 값 몇 개는 문제없지만, API가 **동기**라서 값이 커지거나 쓰기가 잦으면 메인 스레드를 막습니다([이벤트 루프](../Programming/async-and-event-loop.md#개념-2-동기-코드가-이벤트-루프를-막는다)). 큰 JSON을 매번 파싱하는 코드가 대표적인 병목입니다.

### IndexedDB는 JS 객체를 그대로 저장한다

`Date`, `Map`, `Uint8Array`를 가진 객체를 `put`하고 다시 읽었을 때 **타입이 모두 유지**됐습니다(구조화 복제). 반대로 **함수가 든 객체는 `DataCloneError`** 로 저장에 실패했습니다.

IndexedDB의 API는 이벤트 기반으로 장황합니다. 실무에서는 래퍼 라이브러리를 쓰는 경우가 많지만 이 문서에서 라이브러리는 확인하지 않았습니다.

### Cache API

`caches.open('c')` → `cache.put('/x', new Response('cached'))` → `match('/x')`로 응답 본문을 다시 꺼낼 수 있었습니다. 서비스 워커의 오프라인 캐시 전략은 [PWA](./pwa.md)를 참고합니다.

---

## 무엇을 어디에 저장할까

| 데이터 | 권장 | 이유 |
| --- | --- | --- |
| 세션 ID, Refresh Token | **`HttpOnly` + `Secure` + `SameSite` 쿠키** | JS에서 읽을 수 없어 XSS에 강함 ([Cookie](../Security/cookie.md)) |
| Access Token | **메모리(변수)** 가 일반적 | 영구 저장소에 두면 XSS로 노출 ([JWT](../Security/jwt.md)) |
| 테마, 언어, 접은 사이드바 같은 UI 설정 | `localStorage` | 서버가 몰라도 되고 작고 민감하지 않음 |
| 작성 중인 폼 초안, 한 번의 흐름(위저드) 상태 | `sessionStorage` | 탭을 닫으면 사라져야 함 |
| 오프라인 데이터, 큰 목록, 파일/Blob | IndexedDB | 큰 용량, 비동기, 구조화 타입 |
| 정적 리소스·API 응답의 오프라인 캐시 | Cache API (서비스 워커) | `Request`/`Response` 단위 |
| 서버 상태(목록, 상세) | 저장소가 아니라 **서버 상태 라이브러리의 메모리 캐시** | 서버와 동기화가 핵심 ([상태 관리](./state-management.md)) |

- **민감한 값은 JS가 읽을 수 있는 저장소(`localStorage`, `sessionStorage`, IndexedDB)에 두지 않습니다.** 같은 출처에서 스크립트가 한 줄만 실행되면(XSS, 침해된 서드파티 스크립트) 전부 읽힙니다.
- 저장소의 값은 **사용자가 직접 수정할 수 있는 입력**입니다. 읽을 때 검증하고, 권한 판단을 저장된 값에 의존하지 않습니다.
- 브라우저 데이터는 사용자가 지우거나 시크릿 모드에서 막힐 수 있습니다. **저장소 접근을 `try/catch`로 감싸고 없어도 앱이 동작**하게 만듭니다.
- 스키마가 바뀌면 옛 형식의 값이 남아 있습니다. 저장 키에 **버전**을 넣거나(`settings:v2`) 읽을 때 마이그레이션합니다.

---

## 🎯 체크리스트

- [ ] 인증에 쓰는 값은 `HttpOnly` 쿠키 또는 메모리에 둔다 (`localStorage`에 토큰 저장 금지)
- [ ] `localStorage`/`sessionStorage`의 값은 문자열이므로 `JSON.parse`를 `try/catch`로 감싼다
- [ ] 저장소 쓰기는 `QuotaExceededError`를 처리한다
- [ ] 큰 데이터·바이너리·오프라인 데이터는 IndexedDB를 쓴다 (동기 API로 메인 스레드를 막지 않는다)
- [ ] 쿠키는 작게(4KB 이하) 유지하고, 같은 호스트의 다른 포트와 쿠키가 공유된다는 점을 기억한다
- [ ] 저장 키에 버전을 붙이고 옛 형식 데이터를 처리한다
- [ ] 저장된 값을 신뢰하지 않고 읽을 때 검증한다
- [ ] 저장소가 비어 있거나 막혀 있어도 앱이 동작한다
- [ ] 지워지면 안 되는 데이터는 영구 저장(`persist()`) 필요 여부를 검토한다

## 참고 자료

- [WHATWG HTML - Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) - `Storage` 인터페이스, `QuotaExceededError`, `storage` 이벤트, 새 창에서 session storage 복사
- [RFC 6265 HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html) - 포트 격리 없음, 쿠키당 최소 4096바이트
- [WHATWG Storage Standard](https://storage.spec.whatwg.org/) - `navigator.storage.estimate()`/`persist()`
- [MDN - Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API), [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

확인일: 2026-10-23 (Chrome 155를 Playwright로 구동해 로컬 서버 두 포트에서 직접 실행: 출처 격리 5종, `HttpOnly` 쿠키 비노출, 문자열 변환, `localStorage` 쿼터 오류(1MB×4 성공), 쿠키 5,000바이트 무시·3,000바이트 저장, `estimate()`·`persisted()`, 이동 후 유지, `window.open`의 session storage 복사, 같은 탭의 `storage` 이벤트 미발생, 동기 쓰기 2,000회 9ms, IndexedDB 구조화 복제와 `DataCloneError`, Cache API 왕복. 포트 비격리·4096바이트는 RFC 6265 본문, session storage 복사와 `QuotaExceededError`는 WHATWG HTML 본문에서 확인. Firefox·Safari, 다른 탭 사이의 `storage` 이벤트 전달, `persist()` 호출 결과, 서비스 워커에서의 접근 가능 여부, 시크릿 모드 동작, 용량 수치의 다른 환경 값, IndexedDB 래퍼 라이브러리는 확인하지 못함)
