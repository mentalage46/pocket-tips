# Cookie (Auth 관점)

## Cookie란?

> 브라우저에 저장되는 작은 데이터 조각. 서버-클라이언트 간 상태 유지에 사용

**인증에서의 역할**

- 세션 ID 저장
- JWT (Refresh Token) 저장
- 사용자 식별 정보 유지

---

## 개념: 쿠키는 "브라우저가 자동으로 붙여 주는 헤더"다

```
서버  →  Set-Cookie: sid=abc; HttpOnly; Secure         (응답)
브라우저: 저장
브라우저 →  Cookie: sid=abc                              (이후 같은 사이트로 가는 모든 요청에 자동 첨부)
```

HTTP는 요청 사이에 상태가 없습니다. 쿠키는 서버가 브라우저에 맡긴 값을 **이후 요청마다 자동으로 되돌려받는** 장치입니다. 이 **"자동 첨부"**가 쿠키의 편리함이자 보안 문제의 원인입니다.

- 자바스크립트가 `Authorization` 헤더를 직접 붙이는 방식과 달리, 쿠키는 **다른 사이트가 유도한 요청에도 브라우저가 알아서 붙입니다.** 그래서 **CSRF**가 생깁니다([웹 공격과 방어](./web-attacks.md#csrf-cross-site-request-forgery)).
- 반대로 토큰을 `localStorage` 같은 곳에 두면 JS가 읽을 수 있어 **XSS로 탈취**됩니다.

### 저장 위치별 위협 모델

| 저장 위치 | XSS로 토큰 탈취 | CSRF (자동 전송) | 비고 |
| --- | --- | --- | --- |
| `HttpOnly` 쿠키 | **불가** (JS가 읽지 못함) | **가능** → `SameSite`·CSRF 토큰 필요 | 인증 토큰에 일반적 |
| `localStorage` / `sessionStorage` | **가능** | 불가 (자동 첨부 안 됨) | JS가 헤더에 직접 붙임 |
| JS 메모리(변수) | 가능(실행 중 스크립트) | 불가 | 새로고침하면 사라짐 |

> **`HttpOnly`는 만능이 아닙니다.** MDN은 `HttpOnly` 쿠키도 JS가 시작한 요청(`fetch`, `XMLHttpRequest`)에 **여전히 함께 전송된다**고 설명합니다. XSS 공격자는 쿠키 값을 훔치지 못할 뿐, **피해자의 브라우저에서 피해자 권한으로 요청을 보낼 수는 있습니다.** 그래서 `HttpOnly`는 "토큰 유출을 막는 층"이고, XSS 자체를 막는 것(CSP, 출력 인코딩)은 별개입니다. 아래 "Server Cookie" 항목의 "XSS 공격으로부터 보호"는 이 의미로 읽어야 합니다.

### 어떤 요청에 쿠키가 붙는가: 사이트(site)와 출처(origin)

- **출처(origin)** = 스킴 + 호스트 + 포트 → CORS 기준 ([CORS](./cors.md))
- **사이트(site)** = 등록 가능한 도메인(예: `example.com`) 단위 → `SameSite` 기준

`app.example.com`과 `api.example.com`은 **출처는 다르지만 같은 사이트**입니다. 그래서 `SameSite=Strict` 쿠키도 이 둘 사이의 요청에는 붙습니다.

**`Domain` 속성은 범위를 넓힙니다.** MDN 기준으로,

- `Domain`을 **생략**하면 쿠키는 쿠키를 설정한 **그 호스트에만**(host-only) 전송됩니다.
- `Domain=example.com`으로 지정하면 **모든 하위 도메인**에도 전송됩니다.

따라서 아래 표의 "Domain: 명시적 설정"은 **하위 도메인과 공유해야 할 때만**입니다. 공유가 필요 없으면 생략하는 편이 안전합니다. 하위 도메인 하나가 탈취되거나 신뢰할 수 없는 서비스(사용자 콘텐츠 호스팅 등)가 있으면, 공유 쿠키를 읽거나 **덮어쓸** 수 있기 때문입니다(일반 개념).

### 이름 접두사: `__Host-`와 `__Secure-`

쿠키 이름 앞에 붙이면 브라우저가 속성 조건을 **강제**합니다(MDN).

| 접두사 | 조건 |
| --- | --- |
| `__Secure-` | `Secure` 속성 + HTTPS 페이지에서 설정 |
| `__Host-` | `Secure` + **`Domain` 없음** + `Path=/` (host-only로 고정) |

```http
Set-Cookie: __Host-sid=abc; Secure; HttpOnly; Path=/; SameSite=Lax
```

세션 쿠키에는 `__Host-`가 가장 강한 선택입니다. 하위 도메인이 같은 이름의 쿠키를 덮어쓰는 것을 막아 줍니다. 단, 접두사를 지원하지 않는 브라우저에서는 조건 없이 그냥 받아들여질 수 있습니다(MDN 경고).

### 수명: 세션 쿠키와 영구 쿠키

- `Max-Age`도 `Expires`도 없으면 **세션 쿠키**입니다(브라우저 세션이 끝나면 삭제).
- 둘 다 있으면 **`Max-Age`가 우선**합니다. `Max-Age`가 0 이하이면 즉시 만료됩니다.
- **삭제는 값을 지우는 것이 아니라 만료시키는 것**입니다. 쿠키는 이름 + `Domain` + `Path`로 식별되므로, 삭제할 때 **같은 `Domain`·`Path`로** `Max-Age=0`을 보내야 합니다(아래 `clearCookie`에서 `path`를 동일하게 쓰는 이유).

### 크기 한도

RFC 6265는 브라우저가 최소한 **쿠키당 4,096바이트**(이름+값+속성의 합), **도메인당 50개**, 전체 3,000개를 지원해야 한다고 정합니다. 그래서 쿠키에 큰 값을 넣지 않고, **세션 ID만 쿠키에 두고 데이터는 서버에** 저장하는 구조가 일반적입니다. 요청마다 모든 쿠키가 전송되므로 쿠키가 크면 **모든 요청의 헤더가 커집니다.**

### 세션 쿠키 vs 토큰 쿠키

| 구분 | 쿠키에 담는 것 | 서버 | 즉시 무효화 |
| --- | --- | --- | --- |
| 세션 방식 | 무작위 **세션 ID** | 세션 저장소 필요 | 서버에서 세션 삭제 |
| 토큰 방식 | JWT 등 **토큰** | 저장소 불필요 | 만료까지 유효(차단 목록 필요) |

둘 다 같은 쿠키 속성 규칙을 따릅니다. 비교는 [인증과 비밀번호 저장](./auth-and-passwords.md#세션-vs-토큰)을 참고합니다.

---

## Cookie 주요 속성

| 속성                  | 설명                    | 인증 시 권장값      |
| --------------------- | ----------------------- | ------------------- |
| **HttpOnly**          | JS에서 접근 차단        | ✅ `true`           |
| **Secure**            | HTTPS에서만 전송        | ✅ `true`           |
| **SameSite**          | 크로스 사이트 요청 제어 | `Strict` 또는 `Lax` (명시) |
| **Domain**            | 쿠키 전송 도메인        | **생략**(host-only). 하위 도메인 공유가 필요할 때만 지정 |
| **Path**              | 쿠키 전송 경로          | `/` 또는 특정 경로  |
| **Max-Age / Expires** | 만료 시간               | 용도에 맞게         |

---

## Client Cookie vs Server Cookie

### Client Cookie (JS 접근 가능)

```javascript
// 설정
document.cookie = "theme=dark; path=/; max-age=86400";

// 읽기
console.log(document.cookie); // "theme=dark; lang=ko"
```

**특징**

- JavaScript로 읽기/쓰기 가능
- `HttpOnly` 속성 **없음**
- UI 설정, 비민감 데이터용

### Server Cookie (HttpOnly)

```typescript
// Express
res.cookie('refreshToken', token, {
  httpOnly: true,   // JS 접근 차단
  secure: true,     // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
  path: '/api/auth', // 인증 경로만
});

// NestJS
@Res() response: Response
response.cookie('refreshToken', token, { httpOnly: true, ... });
```

**특징**

- JavaScript로 접근 **불가**
- XSS 공격으로부터 보호
- 인증 토큰 저장에 필수

---

## SameSite 속성 상세

| 값         | 동작                      | CSRF 방어 | 사용 사례             |
| ---------- | ------------------------- | --------- | --------------------- |
| **Strict** | **같은 사이트**에서 시작한 요청에만 전송 | 강함 (단독으로는 부족) | 민감한 인증 |
| **Lax**    | 같은 사이트 요청 + **최상위 탐색이면서 안전한 메서드(GET 등)**인 크로스 사이트 요청 | 부분 | 일반적 |
| **None**   | 크로스 사이트에도 전송 (**`Secure` 필수**) | 없음 | 서드파티 임베드, 크로스 사이트 필요 시 |

```
Strict: 다른 사이트의 링크를 클릭해 들어오면 첫 요청에는 쿠키가 붙지 않음 (로그아웃된 것처럼 보임)
Lax:    다른 사이트에서 링크(GET 이동)로 들어올 때는 붙고, POST·PUT·DELETE 등 크로스 사이트 요청에는 안 붙음
None:   항상 전송 (반드시 Secure)
```

- **기본값**: `SameSite`를 생략하면 **일부 브라우저가 `Lax`로 취급**합니다(MDN은 어느 브라우저인지 명시하지 않음). 브라우저에 맡기지 말고 **명시**합니다.
- 기본 `Lax` 취급에서는 **쿠키 설정 후 2분 이내의 크로스 사이트 POST**에도 쿠키가 전송되는 완화 규칙이 있다고 MDN이 설명합니다(명시적으로 `Lax`를 쓰면 해당 없음). 그래서 "Lax는 POST에 안 붙는다"를 절대적으로 믿으면 안 됩니다.
- **Strict의 UX 비용**: 이메일·메신저의 링크로 들어온 사용자가 첫 화면에서 로그인 안 된 것처럼 보일 수 있습니다. 로그인 유지가 중요한 웹 앱은 세션 쿠키에 `Lax`, 민감한 작업 경로의 쿠키(예: 토큰 갱신 엔드포인트)에 `Strict`를 쓰는 식으로 나눕니다.
- **`SameSite`만으로 CSRF를 막았다고 보지 않습니다.** 같은 사이트의 다른 하위 도메인이나 `Lax`가 허용하는 GET 변경 요청은 막지 못합니다. CSRF 토큰·Fetch Metadata와 함께 씁니다([웹 공격과 방어](./web-attacks.md#csrf-cross-site-request-forgery)).

---

## 인증 쿠키 설정 예시

### Refresh Token 저장 (권장)

```typescript
// 서버에서 설정
res.cookie("refreshToken", refreshToken, {
  httpOnly: true, // XSS 방어
  secure: true, // HTTPS
  sameSite: "strict", // CSRF 방어
  path: "/api/auth", // 인증 API만
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### 쿠키 삭제 (로그아웃)

```typescript
res.clearCookie("refreshToken", {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/api/auth", // 설정 시와 동일해야 함!
});
```

---

## 🎯 Cookie 설정 체크리스트

### Server Cookie (인증 토큰)

- [ ] `HttpOnly: true` - JS 접근 차단
- [ ] `Secure: true` - HTTPS에서만 전송
- [ ] `SameSite: Strict` 또는 `Lax`
- [ ] `Path` 제한 - 필요한 경로만
- [ ] 적절한 만료 시간 설정
- [ ] 삭제 시 동일 옵션 사용

### Client Cookie (비민감 데이터)

- [ ] 민감 정보 저장 안함
- [ ] 토큰, 세션 ID 저장 금지
- [ ] 필요 시 만료 시간 설정

### 크로스 도메인 환경

- [ ] `SameSite: None` + `Secure: true`
- [ ] CORS `credentials: true` 설정
- [ ] 서버 `Access-Control-Allow-Credentials: true`
- [ ] `Access-Control-Allow-Origin`에 와일드카드(\*) 사용 불가

### 보안 점검

- [ ] Access Token은 쿠키 대신 메모리/헤더 사용 고려
- [ ] Refresh Token은 반드시 HttpOnly
- [ ] CSRF 토큰 병행 사용 (SameSite 미지원 브라우저 대비)
- [ ] 로그아웃 시 서버에서도 토큰 무효화

---

## 일반적인 구성

```
┌─────────────────────────────────────────────────────┐
│ Access Token                                        │
│ - 저장: 메모리 (변수) 또는 Authorization 헤더       │
│ - 만료: 15분~1시간                                  │
│ - XSS 노출 위험 있지만 단기 만료로 보완             │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ Refresh Token                                       │
│ - 저장: HttpOnly Cookie                             │
│ - 만료: 7~30일                                      │
│ - JS 접근 불가, 서버에서만 처리                     │
└─────────────────────────────────────────────────────┘
```

---

## 주의사항

- ⚠️ `Secure` 쿠키는 HTTPS에서만 설정·전송되지만 **`localhost`는 예외**입니다(MDN: localhost가 설정하는 `Secure` 쿠키는 https 요구가 무시됨). 그래도 `http://` 로 접속하는 **다른 개발 호스트**(사설 IP, 임의 호스트명)에서는 `Secure` 쿠키를 받지 못하므로 개발 환경에서는 조건부 설정이 필요할 수 있음
- ⚠️ 쿠키 삭제 시 `path`, `domain` 동일해야 함
- ⚠️ 브라우저마다 `SameSite` 기본값과 서드파티 쿠키 정책이 다를 수 있음 (Safari 등 개별 동작은 미확인)
- ⚠️ 쿠키 크기: 브라우저는 최소 쿠키당 4,096바이트, 도메인당 50개를 지원해야 함 (RFC 6265). 토큰이 크면 문제

```typescript
// 개발/운영 환경 분기
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
};
```

---

## 빠른 선택 가이드

```
저장할 데이터?
├── 인증 토큰 (Refresh Token)
│   └── HttpOnly + Secure + SameSite:Strict
├── 세션 ID
│   └── HttpOnly + Secure + SameSite:Strict
├── UI 설정 (테마, 언어)
│   └── Client Cookie (HttpOnly 없음)
└── 크로스 도메인 인증
    └── HttpOnly + Secure + SameSite:None + CORS 설정
```

## 참고 자료

- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) - `SameSite` 값과 기본 `Lax` 취급(2분 POST 완화), `Secure`와 localhost 예외, `Max-Age`/`Expires`, `__Host-`·`__Secure-` 접두사, `Partitioned`, `HttpOnly`가 JS 요청에는 여전히 전송됨, `Domain`의 host-only 동작
- [RFC 6265 HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html) - 쿠키당 4,096바이트·도메인당 50개 최소 지원

확인일: 2026-10-22 (MDN과 RFC 6265에서 확인한 속성 동작과 크기 한도. 저장 위치별 위협 모델 표, 하위 도메인의 쿠키 덮어쓰기 위험, Strict의 UX 비용, 세션/토큰 비교는 일반 개념. Chrome의 Max-Age 400일 상한, Safari·Firefox별 `SameSite` 기본값, 서드파티 쿠키 정책 현황, Express `clearCookie` 세부 동작은 미확인)
