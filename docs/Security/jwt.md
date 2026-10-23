# JWT (JSON Web Token)

## JWT란?

> JSON 형식의 데이터를 안전하게 전달하기 위한 토큰 표준 (RFC 7519)

**특징**

- 자체 포함(Self-contained): 토큰 자체에 정보 포함
- 무상태(Stateless): 서버에서 세션 저장 불필요
- 서명으로 위/변조 검증 가능

---

## 개념: JWT는 "서명된 주장(claims)의 묶음"이지 "암호화된 세션"이 아니다

### 서명은 위변조를 막을 뿐 내용을 숨기지 않는다

JWT의 Header와 Payload는 **base64url로 인코딩**되었을 뿐이라 누구나 풀어서 읽을 수 있습니다. 실제로 발급한 토큰을 디코딩한 결과입니다.

```
header : { alg: 'HS256', typ: 'JWT' }
payload: { sub: 'u1', role: 'user', iat: ..., exp: ..., aud: 'web', iss: 'api.example.com' }
```

- **서명(Signature)** 은 Header와 Payload가 **발급자가 만든 그대로인지** 확인하게 합니다. 내용을 바꾸면 서명 검증이 실패합니다(`role`을 `admin`으로 바꿔 보면 `invalid signature`).
- 그러나 **내용은 숨겨지지 않습니다.** 민감정보를 Payload에 넣으면 토큰을 가진 누구나 봅니다.
- 내용까지 숨기려면 JWE(JSON Web Encryption, RFC 7516)를 쓰는데, 일반적인 로그인 토큰은 서명만 하는 JWS(RFC 7515)입니다. 이 문서의 JWT는 서명 방식(JWS)을 가리킵니다.

### `decode`와 `verify`는 전혀 다르다

가장 흔한 사고입니다. 같은 변조된 토큰에 두 함수를 적용했습니다(jsonwebtoken 9.0.3).

```javascript
jwt.verify(tampered, secret)   // → 오류: invalid signature
jwt.decode(tampered).role      // → 'admin'   ← 서명을 전혀 확인하지 않음
```

`decode`(또는 jose의 `decodeJwt`)는 **내용을 읽기만** 합니다. 인증·인가 판단에는 **반드시 `verify`** 의 결과만 씁니다. 프런트엔드에서 `decode`로 만료 시간을 읽어 UI를 바꾸는 것은 괜찮지만, 서버의 접근 제어 근거로 쓰면 안 됩니다.

### 서버가 검증해야 하는 것

서명만 맞으면 끝이 아닙니다. 아래를 **모두** 확인해야 합니다(RFC 8725 JWT Best Current Practices 기준).

| 검증 | 왜 | 실행 결과 |
| --- | --- | --- |
| **허용할 알고리즘을 명시** (`algorithms`) | 토큰 헤더의 `alg`를 그대로 믿으면 공격자가 알고리즘을 고를 수 있음. 라이브러리는 호출자가 허용 알고리즘 집합을 지정할 수 있어야 하고 그 외는 쓰면 안 됨 (RFC 8725 §3.1) | `alg: none` 토큰은 `jwt signature is required`로 거부 |
| **`exp` 확인** | 만료 시각 이후에는 처리하면 안 됨 (RFC 7519) | `TokenExpiredError: jwt expired` |
| **`iss` (발급자)** | 신뢰하는 발급자의 토큰인가 (§3.8) | `jwt issuer invalid` |
| **`aud` (대상)** | 같은 발급자가 여러 서비스용 토큰을 낼 때, **다른 서비스용 토큰을 가로채 쓰는 것**을 막음. 값이 없거나 내 서비스가 아니면 **반드시 거부** (§3.9) | `jwt audience invalid` |
| **`typ` 등 명시적 타입** | 서로 다른 종류의 JWT(액세스 토큰 vs ID 토큰)를 혼동해 쓰는 것을 막음 (§3.11) | (라이브러리 옵션으로 확인) |

```javascript
// ❌ 허용 알고리즘·발급자·대상을 지정하지 않음
const decoded = jwt.verify(token, SECRET_KEY);

// ✅ 모두 지정
const decoded = jwt.verify(token, SECRET_KEY, {
  algorithms: ["HS256"],
  issuer: "api.example.com",
  audience: "web",
});
```

> jsonwebtoken 9.0.3은 `algorithms`를 생략해도 `alg: none`과 키 유형이 맞지 않는 알고리즘을 거부했습니다(공개키를 HMAC 비밀로 쓰는 위조 토큰 `invalid algorithm`). 그러나 이는 **버전과 라이브러리에 따른 방어**이므로 옵션을 명시하는 습관이 안전합니다. 라이브러리 버전이 바뀌어도 의도가 코드에 남습니다.

그 밖에 헤더의 `kid`(키 식별자)로 키를 찾을 때는 SQL·LDAP 인젝션 방지를 위해 값을 검증하고, `jku`·`x5u`(키를 가져올 URL) 헤더는 **임의 URL을 따라가지 않도록** 허용 목록으로 제한합니다(SSRF 방지, RFC 8725 §3.10).

### 서명 알고리즘 선택: 대칭 vs 비대칭

| 구분 | HS256 (HMAC, 대칭) | RS256 / ES256 (비대칭) |
| --- | --- | --- |
| 키 | **발급자와 검증자가 같은 비밀**을 공유 | 발급은 **개인키**, 검증은 **공개키** |
| 검증할 수 있는 쪽 | 비밀을 아는 모든 쪽 = 토큰을 **위조할 수도 있는** 쪽 | 공개키를 가진 누구나, 위조는 불가 |
| 적합한 경우 | 발급과 검증을 **한 서비스**가 하는 경우 | 발급 서버와 **여러 검증 서비스**가 분리된 경우 |

마이크로서비스에서 모든 서비스가 같은 HS256 비밀을 갖는다면 그 서비스 중 하나만 뚫려도 임의 토큰을 만들 수 있습니다. 이런 구조에는 비대칭 서명과 공개키 배포(JWKS)가 맞습니다.

### 클레임(Claims) 정리

| 클레임 | 의미 | 검증 |
| --- | --- | --- |
| `iss` | 발급자 | 신뢰하는 값과 일치 |
| `sub` | 주체(보통 사용자 ID) | 발급자 안에서 유일 |
| `aud` | 토큰을 받을 대상 | **내 서비스가 포함되어야 함** |
| `exp` | 만료 시각 (이 시각 **이후**에는 거부) | 현재 시각이 `exp`보다 앞서야 함 |
| `nbf` | 이 시각 **이전**에는 거부 | |
| `iat` | 발급 시각 | |
| `jti` | 토큰 고유 ID | 폐기 목록·재사용 탐지에 활용 |

### 상태가 없다는 것의 대가: 폐기가 어렵다

JWT가 "stateless"인 이유는 서버가 **저장소를 조회하지 않고 서명만으로** 검증하기 때문입니다. 이것이 장점(확장성, 서비스 간 전달)이자 한계입니다.

- 발급한 토큰은 **`exp`까지 유효**합니다. 로그아웃, 비밀번호 변경, 계정 정지, 권한 회수가 **즉시 반영되지 않습니다.**
- 그래서 Access Token은 **짧게**(분 단위) 두어 피해 시간을 줄입니다. 즉시 차단이 필요하면 `jti`나 사용자별 "토큰 최소 발급 시각"을 **저장소에 기록해 조회**해야 하는데, 이는 세션과 같은 서버 상태를 다시 만드는 것입니다.
- **JWT가 세션보다 항상 낫다는 것은 오해입니다.** 단일 웹 서비스에서 즉시 로그아웃·강제 만료가 중요하다면 서버 세션 + HttpOnly 쿠키가 더 단순하고 안전합니다. 비교는 [인증과 비밀번호 저장](./auth-and-passwords.md#세션-vs-토큰)을 참고합니다.

### Refresh Token: 짧은 Access Token을 가능하게 하는 보조 장치

Access Token을 짧게 두면 사용자가 자주 로그인해야 하므로, 오래 유효한 **Refresh Token**으로 새 Access Token을 받습니다. Refresh Token은 탈취되면 오래 쓰일 수 있으므로 더 엄격히 다룹니다.

- **서버에 저장**(해시로)해서 폐기·추적할 수 있게 합니다. 이 토큰만은 stateless일 필요가 없습니다.
- **회전(rotation)**: 갱신할 때마다 새 Refresh Token을 주고 이전 것은 무효화합니다. 이미 사용된 Refresh Token이 **다시 제시되면 탈취 신호**로 보고 그 계열 전체를 폐기합니다(재사용 탐지). OAuth 보안 BCP(RFC 9700)도 공개 클라이언트의 Refresh Token은 **회전하거나 발신자에 묶어야(sender-constrained) 한다**고 합니다.
- **저장 위치**: HttpOnly + Secure + SameSite 쿠키([Cookie](./cookie.md#저장-위치별-위협-모델)). Access Token을 `localStorage`에 두면 XSS로 읽히므로, 메모리(변수)에 두고 새로고침 시 Refresh Token으로 다시 받는 구성이 일반적입니다.

---

## JWT 구조

```
xxxxx.yyyyy.zzzzz
  │      │      │
  │      │      └── Signature (서명)
  │      └── Payload (데이터)
  └── Header (알고리즘)
```

| 구성          | 내용                                 |
| ------------- | ------------------------------------ |
| **Header**    | 알고리즘(HS256, RS256 등), 토큰 타입 |
| **Payload**   | Claims - 사용자 정보, 만료시간 등    |
| **Signature** | Header + Payload를 비밀키로 서명     |

### 주요 Claims

`sub`(주체), `exp`(만료), `iat`(발급), `iss`(발급자), `aud`(대상), `nbf`(이전 거부), `jti`(고유 ID). 의미와 검증 방법은 위 "클레임 정리" 표를 참고합니다.

---

## 일반적인 JWT 인증 흐름

### Access Token + Refresh Token 방식 ⭐

```
┌─────────┐                         ┌─────────┐
│  Client │                         │  Server │
└────┬────┘                         └────┬────┘
     │  1. 로그인 (ID/PW)                │
     │ ─────────────────────────────────>│
     │                                   │
     │  2. Access Token + Refresh Token  │
     │ <─────────────────────────────────│
     │                                   │
     │  3. API 요청 (Authorization 헤더) │
     │ ─────────────────────────────────>│
     │                                   │
     │  4. 응답                          │
     │ <─────────────────────────────────│
     │                                   │
     │  5. Access Token 만료 시          │
     │     Refresh Token으로 재발급 요청 │
     │ ─────────────────────────────────>│
     │                                   │
     │  6. 새 Access Token 발급          │
     │ <─────────────────────────────────│
```

### 토큰 역할

| 토큰              | 만료 시간         | 저장 위치             | 용도                |
| ----------------- | ----------------- | --------------------- | ------------------- |
| **Access Token**  | 짧음 (15분~1시간) | **메모리** 권장 (localStorage는 XSS로 읽힘) | API 인증            |
| **Refresh Token** | 김 (7일~30일)     | httpOnly Cookie       | Access Token 재발급 |

---

## 구현 체크리스트

### 토큰 발급

- [ ] Access Token 만료시간 짧게 (15분~1시간)
- [ ] Refresh Token은 httpOnly 쿠키에 저장
- [ ] Payload에 민감정보 넣지 않기 (비밀번호 ❌)

### 토큰 검증

- [ ] 모든 API 요청에서 **`verify`** (`decode`는 검증이 아님)
- [ ] 허용 알고리즘을 명시 (`algorithms`)
- [ ] 만료시간(`exp`) 확인
- [ ] 발급자(`iss`)와 대상(`aud`) 확인
- [ ] `kid`·`jku` 헤더 값을 그대로 신뢰하지 않음

### 보안

- [ ] HTTPS 필수
- [ ] 비밀키 안전하게 관리 (환경변수)
- [ ] Refresh Token 탈취 대비 → Rotation + 재사용 탐지, 서버에 해시로 저장
- [ ] 로그아웃 시 Refresh Token 무효화 (블랙리스트/DB)

---

## 코드 예시

### 헤더 포맷

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Node.js (jsonwebtoken)

```javascript
// 발급
const token = jwt.sign({ sub: userId, role: "user" }, SECRET_KEY, {
  algorithm: "HS256",
  expiresIn: "15m",
  issuer: "api.example.com",
  audience: "web",
});

// 검증: 허용 알고리즘, 발급자, 대상을 모두 지정
const decoded = jwt.verify(token, SECRET_KEY, {
  algorithms: ["HS256"],
  issuer: "api.example.com",
  audience: "web",
});
```

### Node.js (jose)

```javascript
import { SignJWT, jwtVerify } from "jose";

const jwt = await new SignJWT({ role: "user" })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(userId)
  .setIssuer("api.example.com")
  .setAudience("web")
  .setIssuedAt()
  .setExpirationTime("15m")
  .sign(secretKey); // Uint8Array 또는 KeyObject

const { payload } = await jwtVerify(jwt, secretKey, {
  algorithms: ["HS256"],
  issuer: "api.example.com",
  audience: "web",
});
```

`jose`의 `jwtVerify`는 허용하지 않은 알고리즘이면 `ERR_JOSE_ALG_NOT_ALLOWED`로 거부합니다(jose 6.2.13에서 확인).

---

## 주의사항

- ⚠️ JWT는 암호화가 아닌 **인코딩 + 서명** → Payload 누구나 볼 수 있음
- ⚠️ 토큰 크기가 커지면 매 요청마다 오버헤드 증가
- ⚠️ 발급된 토큰은 만료 전까지 무효화 어려움 → Refresh Token 전략 필수

## 참고 자료

- [RFC 7519 JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519.html) - 클레임 정의(`iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`), `exp` 처리 규칙
- [RFC 8725 JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html) - 알고리즘 검증(§3.1), `iss`/`sub`(§3.8), `aud`(§3.9), 받은 클레임 불신(§3.10), 명시적 타입(§3.11)
- [RFC 7515 JWS](https://www.rfc-editor.org/rfc/rfc7515.html), [RFC 7516 JWE](https://www.rfc-editor.org/rfc/rfc7516.html)
- [RFC 9700 OAuth 2.0 Security BCP](https://www.rfc-editor.org/rfc/rfc9700.html) - 공개 클라이언트의 Refresh Token은 회전 또는 sender-constrained
- [RFC 9068 JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)

확인일: 2026-10-22 (RFC 7519·8725·9700 본문 확인. 서명 변조 거부, `decode`의 무검증, `alg: none` 거부, `aud`/`iss`/`exp` 검증 오류, 키 유형 불일치 알고리즘 거부, `jose`의 알고리즘 제한은 jsonwebtoken 9.0.3·jose 6.2.13으로 실행 확인(다른 버전은 동작이 다를 수 있음). 대칭/비대칭 선택, 폐기 전략, Refresh Token 회전·재사용 탐지의 구체적 구현, JWKS는 일반 개념이며 미확인.)
