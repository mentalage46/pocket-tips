# 웹 공격과 방어: XSS, CSRF, 보안 헤더

> 브라우저를 통해 들어오는 공격과, 서버가 응답 헤더로 막을 수 있는 것

CORS는 [CORS](./cors.md), 쿠키 `SameSite`는 [Cookie](./cookie.md#samesite-속성-상세)를 참고합니다.

---

## XSS (Cross-Site Scripting)

공격자의 스크립트가 내 사이트의 출처(origin)로 실행되는 것. 쿠키·토큰 탈취, 화면 조작, 사용자 대신 요청 전송이 가능합니다.

| 종류 | 경로 |
| --- | --- |
| 저장형(Stored) | 게시글·댓글에 저장된 스크립트가 다른 사용자에게 출력 |
| 반사형(Reflected) | URL 파라미터가 그대로 응답에 출력 |
| DOM 기반 | 클라이언트 JS가 `location.hash` 등을 `innerHTML`에 넣음 |

### 방어

```typescript
// ❌ 사용자 입력을 HTML로 삽입
el.innerHTML = comment;

// ✅ 텍스트로 삽입
el.textContent = comment;

// ✅ HTML이 꼭 필요하면 정화(sanitize) 후 삽입
import DOMPurify from "dompurify";
el.innerHTML = DOMPurify.sanitize(comment);
```

| 규칙 | 설명 |
| --- | --- |
| 출력 위치에 맞게 인코딩 | HTML 본문, 속성, URL, JS 문자열마다 인코딩 방식이 다름 |
| 프레임워크 기본 이스케이프 유지 | React `dangerouslySetInnerHTML`, Vue `v-html`, Angular `bypassSecurityTrust*`는 예외 통로 |
| URL 스킴 확인 | `href`에 `javascript:` 차단. `http:`/`https:`만 허용 |
| CSP | 위를 놓쳤을 때 실행을 막는 2차 방어 |

> XSS가 있으면 CSRF 방어는 모두 우회됩니다. XSS 방지가 먼저입니다.

---

## CSRF (Cross-Site Request Forgery)

다른 사이트가 사용자의 브라우저를 이용해, 로그인된 내 사이트로 요청을 보내게 하는 공격. 브라우저가 쿠키를 자동으로 붙이기 때문에 생깁니다.

```html
<!-- 공격자 사이트 -->
<form action="https://bank.example.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="1000000" />
</form>
<script>document.forms[0].submit();</script>
```

### 방어 (OWASP CSRF Prevention)

| 방법 | 언제 |
| --- | --- |
| **Fetch Metadata** (`Sec-Fetch-Site`) | 1차 신호. 상태를 바꾸는 cross-site 요청 거부 |
| **Synchronizer Token** | 서버 세션이 있는 앱. 세션별 토큰을 폼·헤더로 받아 검증 |
| **Signed Double-Submit Cookie** | 상태 없는 앱. 세션에 묶인 HMAC 토큰을 쿠키와 헤더로 받아 비교 |
| **커스텀 헤더** (`X-CSRF-Token` 등) | API. 교차 출처에서 커스텀 헤더를 붙이면 프리플라이트가 필요해 CORS가 막음(CORS 출처 제한 필수) |
| **Origin 검증** | Fetch Metadata가 없는 브라우저 대비. 헤더 없음·`Origin: null`은 같은 출처로 보지 않음 |
| `SameSite` 쿠키 | 심층 방어. **단독으로는 대부분 부족** (`Lax`는 최상위 GET을 허용, 같은 등록 도메인의 서브도메인은 막지 못함) |

```typescript
// Fetch Metadata로 cross-site 변경 요청 거부 (Express)
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

app.use((req, res, next) => {
  const site = req.get("Sec-Fetch-Site");
  if (!site) return next(); // 헤더 없는 구형 브라우저: Origin 검증으로 대체
  if (SAFE.has(req.method)) return next();
  if (site === "same-origin" || site === "none") return next();
  return res.status(403).json({ error: "Cross-site request blocked" });
});
```

- GET 요청으로 상태를 바꾸지 않습니다. 그래야 위 방어가 의미가 있습니다.

---

## 보안 응답 헤더

| 헤더 | 권장 값 | 효과 |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS만 사용하도록 강제 (`preload`는 등록 요건 확인 후) |
| `Content-Security-Policy` | 아래 참고 | 스크립트·리소스 출처 제한 |
| `X-Content-Type-Options` | `nosniff` | MIME 추측 금지 |
| `X-Frame-Options` | `DENY` | 프레임 삽입 금지. CSP `frame-ancestors`를 우선 사용 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 외부로 전체 URL 유출 방지 |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | 안 쓰는 브라우저 기능 끄기 |
| `Cross-Origin-Opener-Policy` | `same-origin` | 다른 출처 창과 브라우징 컨텍스트 분리 |

**보내지 않을 헤더**

- `X-XSS-Protection`: 설정하지 않거나 `0`. CSP로 대체
- `X-Powered-By`: 제거 (Express는 `app.disable("x-powered-by")`)
- `Server`: 제거하거나 정보 없는 값

### CSP 예시

```http
# 같은 출처 리소스만 쓰는 사이트 (인라인 스크립트 없음)
Content-Security-Policy: default-src 'self'; frame-ancestors 'self'; form-action 'self';

# nonce 기반 strict CSP (요청마다 새 nonce)
Content-Security-Policy: script-src 'nonce-{RANDOM}' 'strict-dynamic'; object-src 'none'; base-uri 'none';
```

```html
<script nonce="{RANDOM}" src="/app.js"></script>
```

### CSP 도입 순서

1. `Content-Security-Policy-Report-Only`로 먼저 배포해 위반만 수집
2. 위반 보고는 `report-to`(+ `Reporting-Endpoints` 헤더). 구형 브라우저 대비로 `report-uri`를 함께 둠
3. 인라인 스크립트·`eval` 제거, 필요한 외부 출처 정리
4. 위반이 잦아들면 `Content-Security-Policy`로 전환

### Nginx 예시

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'self'; form-action 'self'" always;
server_tokens off;
```

> `add_header`는 하위 블록(`location`)에서 하나라도 쓰면 상위 블록의 `add_header`를 물려받지 않습니다. 헤더는 한 곳에 모아 두거나, Nginx 1.29.3 이상이면 `add_header_inherit merge;`로 합칩니다. `always`가 없으면 오류 응답(4xx·5xx)에는 헤더가 붙지 않습니다.

---

## 🎯 체크리스트

- [ ] 사용자 입력은 `textContent`/프레임워크 기본 바인딩으로 출력
- [ ] HTML 허용 입력은 DOMPurify 등으로 정화
- [ ] 상태 변경은 POST/PUT/PATCH/DELETE만, GET은 읽기 전용
- [ ] CSRF: Fetch Metadata 또는 토큰 + `SameSite` 쿠키
- [ ] HSTS, CSP, `nosniff`, `Referrer-Policy` 설정
- [ ] CSP는 Report-Only로 시작
- [ ] `X-Powered-By`, `Server` 버전 노출 제거

## 참고 자료

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) - 방어 방법과 SameSite 한계
- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) - 헤더별 권장 값, 제거할 헤더
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) - CSP 예시, Report-Only, `report-to`/`report-uri`
- [Nginx headers 모듈](https://nginx.org/en/docs/http/ngx_http_headers_module.html) - `add_header` 상속 규칙, `always`, `add_header_inherit`
- [DOMPurify](https://github.com/cure53/DOMPurify) - import와 `sanitize` 사용법

확인일: 2026-10-22 (CSRF 방어·헤더 값·CSP 예시·Nginx 상속 규칙·DOMPurify 사용법)
