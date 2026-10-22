# CORS (Cross-Origin Resource Sharing)

## CORS란?

> 브라우저가 다른 출처(origin)의 리소스 요청을 제어하는 보안 메커니즘

**출처(Origin) = 프로토콜 + 도메인 + 포트**

```
https://example.com:443  →  같은 출처
https://example.com:8080  →  다른 출처 (포트 다름)
https://api.example.com   →  다른 출처 (서브도메인 다름)
```

---

## 왜 필요한가: 동일 출처 정책(SOP)

브라우저는 기본적으로 **한 출처의 스크립트가 다른 출처의 응답을 읽지 못하게** 막습니다(동일 출처 정책, Same-Origin Policy). 이게 없으면 `evil.com`의 스크립트가 사용자 브라우저로 `bank.com`에 요청을 보내고, 사용자의 로그인 쿠키가 자동으로 붙은 응답을 읽어 갈 수 있습니다.

**CORS는 이 정책의 보안 장치가 아니라 "예외 규칙"입니다.** 서버가 응답 헤더로 "이 출처에는 읽기를 허용한다"고 알리면 브라우저가 SOP를 풀어 줍니다.

```
브라우저(https://app.example.com)  →  https://api.example.com
                                      ← Access-Control-Allow-Origin: https://app.example.com
브라우저: "서버가 허용했으니 JS에 응답을 넘겨 준다"
```

### 오해하기 쉬운 점

| 오해 | 사실 |
| --- | --- |
| CORS는 서버를 보호한다 | 아니다. **브라우저가 응답을 JS에 넘길지** 정하는 규칙이다. 서버는 요청을 이미 받았다 |
| CORS 에러면 요청이 안 갔다 | 단순 요청은 **서버까지 가서 처리된 뒤** 응답만 막힌다. 서버에 부작용이 생길 수 있다 |
| CORS가 CSRF를 막아 준다 | 아니다. CSRF는 응답을 읽지 않아도 성공한다([웹 공격과 방어](./web-attacks.md#csrf-cross-site-request-forgery)) |
| `curl`·Postman에도 적용된다 | 아니다. **브라우저만** 적용한다. 서버 간 호출에는 CORS가 없다 |
| `*`로 열면 편하고 안전하다 | 인증 없는 공개 API가 아니라면 위험하다. 인증이 걸린 API를 `*`로 열면 안 된다 |
| CORS 에러는 프런트 코드 문제다 | 해결은 **서버(또는 프록시) 응답 헤더**에서 한다 |

> **사이트(site)와 출처(origin)는 다릅니다.** `app.example.com`과 `api.example.com`은 출처는 다르지만 같은 사이트(same-site)입니다. CORS는 출처 기준이고, 쿠키의 `SameSite`는 사이트 기준입니다.

---

## 동작 방식

### Simple Request (프리플라이트 없음)

아래 조건을 **모두** 만족하면 바로 요청을 보냅니다.

- 메서드가 `GET`, `HEAD`, `POST` 중 하나
- 직접 설정한 헤더가 CORS 안전 목록(`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`, `Range`)뿐
- `Content-Type`이 `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain` 중 하나

그래서 **`Content-Type: application/json`을 쓰는 순간 단순 요청이 아니게 되어** 프리플라이트가 붙습니다. `Authorization` 헤더나 `PUT`/`DELETE`도 마찬가지입니다.

### Preflight Request

단순 요청이 아니면 브라우저가 먼저 `OPTIONS`로 "이 요청을 보내도 되는가"를 묻고, 허용될 때만 실제 요청을 보냅니다. 서버 부작용이 있을 수 있는 요청을 허락 없이 보내지 않기 위한 절차입니다.

```
브라우저 → OPTIONS /api/users
           Origin: https://app.example.com
           Access-Control-Request-Method: PUT
           Access-Control-Request-Headers: content-type, authorization
서버     ← 204
           Access-Control-Allow-Origin: https://app.example.com
           Access-Control-Allow-Methods: PUT
           Access-Control-Allow-Headers: content-type, authorization
           Access-Control-Max-Age: 600
브라우저 → PUT /api/users (실제 요청)
```

- 프리플라이트 응답은 `Access-Control-Max-Age`초 동안 캐시됩니다. 기본값은 5초이고 브라우저마다 상한이 있어, 길게 줘도 그 상한까지만 적용됩니다.
- 프리플라이트가 매 요청마다 나가면 왕복이 두 배가 됩니다. `Max-Age`를 적절히 주고, 가능하면 API와 프런트를 같은 출처로 두거나 프록시로 묶어 CORS 자체를 없앱니다.

### 쿠키·인증정보를 보내는 요청 (credentialed)

```typescript
fetch("https://api.example.com/me", { credentials: "include" });
```

| 규칙 | 이유 |
| --- | --- |
| `Access-Control-Allow-Origin`에 `*` 사용 불가, **정확한 출처** 명시 | 쿠키가 붙는 요청의 응답을 아무 출처에나 읽게 할 수 없음 |
| `Access-Control-Allow-Credentials: true` 필요 | 없으면 브라우저가 응답을 JS에 넘기지 않음 |
| `Allow-Headers`, `Allow-Methods`, `Expose-Headers`에도 `*` 사용 불가 | 같은 이유로 명시적 목록 필요 |
| `Set-Cookie`도 `*` 응답에서는 저장되지 않음 | |

### 출처를 동적으로 허용할 때 `Vary: Origin`

허용 목록에서 요청 출처를 골라 그대로 되돌려 주면, 응답이 `Origin` 값에 따라 달라집니다. 이때 `Vary: Origin`을 함께 보내지 않으면 **CDN·브라우저 캐시가 A 출처용 응답을 B 출처에 내줄** 수 있습니다.

```
Access-Control-Allow-Origin: https://app.example.com
Vary: Origin
```

> 요청의 `Origin` 값을 검증 없이 그대로 `Allow-Origin`에 반사(reflect)하면 사실상 `*`와 같고, credentials까지 켜면 더 위험합니다. 반드시 허용 목록과 **정확히 일치**하는지 확인합니다(`endsWith`, `includes` 같은 부분 일치는 `evil-example.com` 같은 우회를 허용합니다).

---

## 응답 헤더

| 헤더                               | 설명                |
| ---------------------------------- | ------------------- |
| `Access-Control-Allow-Origin`      | 허용 출처           |
| `Access-Control-Allow-Methods`     | 허용 메서드         |
| `Access-Control-Allow-Headers`     | 허용 헤더           |
| `Access-Control-Allow-Credentials` | 쿠키 허용           |
| `Access-Control-Max-Age`           | Preflight 캐시 시간 |

---

## Express 설정

```typescript
import cors from "cors";

// 모든 출처 허용 (개발용)
app.use(cors());

// 특정 출처만 허용 (프로덕션)
app.use(
  cors({
    origin: ["https://example.com", "https://app.example.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // 쿠키 포함
  })
);

// 동적 출처 검증
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = ["https://example.com"];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed"));
      }
    },
  })
);
```

---

## Nginx 설정

```nginx
location /api {
    add_header Access-Control-Allow-Origin "https://example.com";
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";

    if ($request_method = OPTIONS) {
        add_header Access-Control-Max-Age 86400;
        return 204;
    }
}
```

---

## 🎯 CORS 설정 체크리스트

### 개발

- [ ] 로컬 개발 시 프록시 사용 고려
- [ ] 와일드카드(\*) 사용 주의

### 프로덕션

- [ ] 특정 출처만 화이트리스트
- [ ] credentials: true 시 와일드카드 사용 불가
- [ ] 불필요한 메서드/헤더 허용 금지

---

## 흔한 에러

```
❌ Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

브라우저는 보안상 JS에 **구체적인 원인을 알려 주지 않습니다.** 정확한 이유는 개발자 도구 콘솔 메시지로만 확인합니다.

| 콘솔 메시지(요지) | 원인 | 해결 |
| --- | --- | --- |
| No 'Access-Control-Allow-Origin' header is present | 서버가 CORS 헤더를 안 보냄, 또는 에러 응답(4xx/5xx·프록시 오류)에 헤더가 빠짐 | CORS 미들웨어를 **인증·라우팅보다 앞**에 두고, 에러 응답에도 헤더가 붙는지 확인 |
| Response to preflight request doesn't pass access control check | `OPTIONS`에 2xx를 안 돌려줌 (인증 미들웨어가 OPTIONS를 401로 막는 경우가 흔함) | `OPTIONS`는 인증 전에 처리 |
| The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*' when credentials mode is 'include' | credentials와 `*` 동시 사용 | 정확한 출처 명시 + `Allow-Credentials: true` |
| Request header field ... is not allowed by Access-Control-Allow-Headers | 커스텀 헤더를 `Allow-Headers`에 안 넣음 | 헤더 추가 |
| Method ... is not allowed | `Allow-Methods`에 메서드 없음 | 메서드 추가 |

### 진단 순서

1. 개발자 도구 Network 탭에서 **`OPTIONS` 요청이 있는지, 상태 코드가 무엇인지** 본다
2. 응답 헤더에 `Access-Control-Allow-*`가 실제로 있는지 본다 (프록시·CDN이 지웠을 수 있음)
3. `curl -i -X OPTIONS -H 'Origin: https://app.example.com' -H 'Access-Control-Request-Method: PUT' https://api.example.com/users`로 서버 응답만 따로 확인한다
4. 배포 환경에서만 실패하면 Nginx·로드밸런서 설정을 의심한다

## 참고 자료

- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) - 단순 요청 조건, 프리플라이트, credentialed 요청의 와일드카드 제한, `Max-Age` 기본값 5초, `Vary: Origin`, 오류 정보 비공개

확인일: 2026-10-22 (단순 요청 조건·credentials 규칙·`Max-Age` 기본값·`Vary: Origin`·오류 비공개. 개념 비교표, 에러 메시지별 원인, 출처 반사 위험은 경험칙. 브라우저별 `Max-Age` 상한은 미확인)
