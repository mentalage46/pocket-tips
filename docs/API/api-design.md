# API Design

## RESTful API 설계 원칙

> REST(Representational State Transfer) 아키텍처 스타일을 따르는 API 설계

---

## 개념: API는 바꾸기 어려운 계약이다

서버 코드는 배포하면 끝나지만 **API는 당신이 통제하지 못하는 클라이언트**(업데이트하지 않은 모바일 앱, 외부 연동사)가 씁니다. 그래서 API 설계의 첫 번째 기준은 **한 번 공개한 것을 깨뜨리지 않는 것(하위 호환성)**입니다.

| 변경 | 호환 여부 |
| --- | --- |
| 응답에 **필드 추가**, 새 엔드포인트 추가, 선택 요청 파라미터 추가 | 호환 (클라이언트는 모르는 필드를 무시해야 함) |
| 필드 **삭제·이름 변경·타입 변경**, 필수 파라미터 추가 | **깨짐** |
| 같은 필드의 **의미 변경** (금액 단위가 원 → 센트) | **깨짐** (컴파일 오류도 없어 가장 위험) |
| 에러 코드·상태 코드 변경 | 깨질 수 있음 (클라이언트가 분기에 사용) |

> 위 분류는 널리 쓰이는 관례입니다. 호환 변경은 버전을 올리지 않고 추가하고, 깨는 변경만 새 버전으로 내보냅니다.

### REST는 무엇인가, 이 문서는 무엇을 다루는가

Fielding의 논문은 REST를 **제약의 조합**으로 정의합니다.

| 제약 | 의미 |
| --- | --- |
| Client-Server | UI와 데이터 저장을 분리해 각자 독립적으로 발전 |
| **Stateless** | 각 요청은 이해에 필요한 **모든 정보**를 담는다. 세션 상태는 클라이언트가 가짐 → 서버를 늘리기 쉬움 |
| Cache | 응답이 캐시 가능한지 표시 |
| **Uniform Interface** | 자원 식별(URI), **표현을 통한 조작**, 자기 서술적 메시지, **HATEOAS**(응답의 링크로 다음 동작을 안내) |
| Layered System | 구성 요소는 인접한 계층만 앎 (프록시, 게이트웨이 삽입 가능) |
| Code-on-Demand (선택) | 코드를 내려받아 실행 |

실무에서 말하는 "REST API"는 대부분 **HTTP + JSON으로 자원(resource)을 다루는 API**이고 HATEOAS까지 지키는 경우는 드뭅니다. 이 문서의 규칙(명사형 URL, 메서드 의미, 상태 코드)은 엄밀한 REST 준수가 아니라 **HTTP를 올바르게 쓰는 관례**입니다. 핵심은 "HTTP가 이미 정해 둔 의미를 따르면 프록시·캐시·클라이언트 라이브러리가 그 의미를 믿고 동작한다"는 점입니다.

### HTTP 메서드의 의미: 안전(safe)과 멱등(idempotent)

RFC 9110의 정의입니다.

- **안전(safe)**: 의미상 **읽기 전용**. 서버에 상태 변화를 요청하지도 기대하지도 않는다. (`GET`, `HEAD`, `OPTIONS`)
- **멱등(idempotent)**: **같은 요청을 여러 번 보내도 서버에 미치는 효과가 한 번 보낸 것과 같다.** `PUT`, `DELETE`와 안전한 메서드가 멱등이다.
- **`PATCH`는 정의상 안전하지도 멱등하지도 않다**(RFC 5789). 다만 멱등하게 *작성할 수는* 있다(예: "상태를 `active`로 설정"은 멱등, "수량을 1 증가"는 아님).

**왜 중요한가: 재시도.** 네트워크는 실패하고, 클라이언트·프록시는 요청이 처리됐는지 모른 채 다시 보내고 싶어집니다.

- 멱등한 메서드는 **다시 보내도 안전**하므로 연결 실패 시 자동 재시도할 수 있습니다.
- **프록시는 멱등하지 않은 요청을 자동으로 재시도해서는 안 됩니다**(MUST NOT, RFC 9110).
- 그래서 `POST /orders`에서 응답을 못 받은 클라이언트가 재시도하면 **주문이 두 번 생길 수 있습니다.**

**해결: 멱등 키(Idempotency-Key).** 클라이언트가 요청마다 고유 키를 보내고, 서버는 키별 결과를 저장해 같은 키가 오면 **처리하지 않고 저장된 응답을 돌려줍니다.**

```http
POST /orders
Idempotency-Key: 8e03978e-40d5-43e8-bc93-6894a57f9324
```

> `Idempotency-Key` 헤더는 IETF HTTP API 워킹그룹의 **인터넷 드래프트**(draft-ietf-httpapi-idempotency-key-header, 확인 시점 최신 개정 07, 2025-10)이며 **아직 RFC가 아닙니다.** 결제 API 등에서 이미 널리 쓰는 관례이지만 표준 문서처럼 인용하지 않습니다. 서버 구현(키 저장 기간, 같은 키에 다른 본문이 오면 거부 등)은 이 문서에서 다루지 않습니다.

### 동시 수정 충돌: 조건부 요청(ETag + If-Match)

두 사용자가 같은 리소스를 읽고 각자 `PUT`하면 나중 요청이 앞 요청을 **조용히 덮어씁니다**(lost update). HTTP는 이를 막는 표준 방법이 있습니다.

```http
GET /users/123            → 200, ETag: "v7"
PUT /users/123
If-Match: "v7"            → 그 사이 바뀌었다면 412 Precondition Failed
```

`412`는 요청의 조건 헤더가 서버에서 거짓으로 평가됐다는 뜻이며, 클라이언트가 **현재 리소스 상태를 기준으로 조건을 걸 수 있게** 해 줍니다. 낙관적 락(버전 컬럼)을 HTTP 레벨에서 표현한 것입니다.

---

## URL 설계

### 기본 규칙

```
# 리소스는 명사, 복수형 사용
✅ GET /users
✅ GET /users/123
✅ GET /users/123/orders

# 동사 사용 금지
❌ GET /getUsers
❌ POST /createUser
❌ DELETE /deleteUser/123
```

### 계층 관계

```
# 부모-자식 관계
GET /users/123/orders          # 사용자의 주문 목록
GET /users/123/orders/456      # 특정 주문

# 3단계 이상 중첩 피하기
❌ /users/123/orders/456/items/789/reviews
✅ /order-items/789/reviews
```

---

## HTTP 메서드

| 메서드   | 용도      | 멱등성 | 안전 |
| -------- | --------- | :----: | :--: |
| `GET`    | 조회      |   ✅   |  ✅  |
| `POST`   | 생성      |   ❌   |  ❌  |
| `PUT`    | 전체 수정 |   ✅   |  ❌  |
| `PATCH`  | 부분 수정 |   ❌   |  ❌  |
| `DELETE` | 삭제      |   ✅   |  ❌  |

### 사용 예시

```bash
GET    /users          # 목록 조회
POST   /users          # 생성
GET    /users/123      # 단건 조회
PUT    /users/123      # 전체 수정
PATCH  /users/123      # 부분 수정
DELETE /users/123      # 삭제
```

---

## 상태 코드

### 성공 (2xx)

| 코드  | 의미       | 사용                       |
| ----- | ---------- | -------------------------- |
| `200` | OK         | 조회/수정 성공             |
| `201` | Created    | 생성 성공 (`Location` 헤더에 새 리소스 URL) |
| `202` | Accepted   | 접수했지만 처리는 아직 (비동기 작업) |
| `204` | No Content | 삭제 성공 (응답 본문 없음) |

### 클라이언트 에러 (4xx)

| 코드  | 의미                 | 사용                           |
| ----- | -------------------- | ------------------------------ |
| `400` | Bad Request          | 잘못된 요청 (유효성 검증 실패) |
| `401` | Unauthorized         | 인증 정보가 없거나 유효하지 않음 (`WWW-Authenticate` 필수) |
| `403` | Forbidden            | 권한 없음                      |
| `404` | Not Found            | 리소스 없음                    |
| `409` | Conflict             | 충돌 (중복 등)                 |
| `422` | Unprocessable Content | 문법은 맞지만 내용을 처리할 수 없음 |
| `429` | Too Many Requests    | 요청 제한 초과 (`Retry-After`로 대기 시간 안내 가능) |

### 헷갈리는 상태 코드 고르기

| 상황 | 선택 | 이유 (RFC 9110) |
| --- | --- | --- |
| 토큰이 없거나 만료·위조 | **401** | 유효한 **인증 정보가 없다**는 뜻. 응답에 `WWW-Authenticate`로 인증 방법을 알려야 한다 |
| 로그인했지만 권한 없음 | **403** | 요청을 이해했지만 **거부**. 같은 인증 정보로 다시 보내지 말라는 의미 |
| 있는지조차 숨기고 싶은 리소스 | 403 대신 **404** | 존재 여부 자체가 정보 노출일 때 (보안상 선택, 일반 관례) |
| JSON 문법 오류, 필수 헤더 누락 | **400** | 요청 자체가 잘못됨 |
| 문법은 맞지만 값이 유효하지 않음 (이메일 형식 등) | **422** (또는 400) | 콘텐츠 타입은 이해했지만 내용을 처리할 수 없다 |
| 중복 생성, 이미 처리된 상태 | **409** | 리소스의 **현재 상태와 충돌**. 사용자가 해결해 다시 보낼 수 있을 때 쓰고, 충돌 내용을 본문에 설명해야 한다 |
| 조건부 요청 실패 (`If-Match`) | **412** | 조건 헤더가 거짓 |
| 오래 걸리는 작업 접수 | **202** | 접수만 했고 결과는 나중. 상태 조회 URL을 함께 주는 것이 관례 |

> 400과 422를 어떻게 나눌지는 팀마다 다릅니다. **어느 쪽이든 한 가지 규칙으로 일관되게** 쓰는 것이 중요합니다. 401을 "Unauthorized"라는 이름 때문에 권한 오류로 쓰는 실수가 흔한데, 의미는 **인증** 실패입니다.

### 서버 에러 (5xx)

| 코드  | 의미                  | 사용             |
| ----- | --------------------- | ---------------- |
| `500` | Internal Server Error | 서버 내부 오류   |
| `502` | Bad Gateway           | 게이트웨이 오류  |
| `503` | Service Unavailable   | 일시적 과부하·점검 (`Retry-After`로 재시도 시점 안내 가능) |

---

## 에러 응답 형식

### 표준 형식

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "사용자를 찾을 수 없습니다",
    "details": [
      {
        "field": "userId",
        "message": "유효하지 않은 사용자 ID입니다"
      }
    ]
  }
}
```

### 표준 형식: RFC 9457 Problem Details

에러 본문 형식은 직접 만들 수도 있지만, 이미 **표준**이 있습니다. RFC 9457(RFC 7807을 대체)은 `application/problem+json` 미디어 타입과 공통 필드를 정의합니다.

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://example.com/probs/out-of-credit",
  "title": "You do not have enough credit.",
  "status": 403,
  "detail": "Your current balance is 30, but that costs 50.",
  "instance": "/account/12345/msgs/abc"
}
```

| 필드 | 의미 |
| --- | --- |
| `type` | 문제 유형을 식별하는 **URI**. 클라이언트가 분기할 때의 기본 식별자이며 없으면 `about:blank`. 가능하면 절대 URI 사용 |
| `title` | 문제 유형의 짧은 사람용 요약 (같은 `type`이면 항상 같아야 함) |
| `status` | HTTP 상태 코드. **참고용**이며 실제 응답의 상태 코드와 반드시 같아야 함 |
| `detail` | **이번 발생**에 대한 설명 |
| `instance` | 이번 발생을 식별하는 URI |

- 필드를 **추가(확장)** 할 수 있으므로 유효성 검증 오류 목록(`errors: [...]`)이나 `balance` 같은 값을 얹을 수 있습니다.
- 위의 `error.code` 방식은 널리 쓰이지만 팀마다 모양이 달라지기 쉽습니다. 새 API라면 표준을 따르는 편이 클라이언트 라이브러리와 문서화 도구를 재사용하기 좋습니다(권장 사항).
- 에러 본문에는 스택 트레이스, SQL, 내부 경로 같은 **내부 정보를 넣지 않습니다**([OWASP A10](../Security/owasp-top-10.md#a10-mishandling-of-exceptional-conditions-예외-상황-처리-실패)).

### 유효성 검증 에러

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다",
    "details": [
      { "field": "email", "message": "이메일 형식이 올바르지 않습니다" },
      { "field": "password", "message": "비밀번호는 8자 이상이어야 합니다" }
    ]
  }
}
```

---

## 페이지네이션

### 왜 두 가지 방식이 있는가

**Offset 방식의 문제는 두 가지입니다.**

1. **느려진다**: `OFFSET N`은 앞의 N개 행을 **읽고 버린 뒤** 다음을 가져옵니다. 페이지가 깊을수록 비용이 커집니다.
2. **결과가 흔들린다**: 페이지를 넘기는 사이 데이터가 추가·삭제되면 **중복되거나 누락**됩니다.

SQLite 3.51로 실행한 결과입니다(최신순 정렬, 한 페이지 3건).

```
-- 1페이지 (OFFSET 0):                     10, 9, 8
-- 그 사이 새 행(id=11)이 추가됨
-- 2페이지 (OFFSET 3):                     8, 7, 6    ← 8이 중복!
-- 커서 방식 (마지막으로 본 (created_at=108, id=8) 이후): 7, 6, 5   ← 중복 없음
```

**Cursor(keyset) 방식**은 "마지막으로 본 항목 **다음부터**"를 조건으로 거는 방식입니다.

```sql
SELECT id FROM users
WHERE (created_at, id) < (:last_created_at, :last_id)   -- 마지막 항목 이후
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- 인덱스 (created_at DESC, id DESC)가 있으면 해당 위치로 바로 찾아간다
-- (SQLite 실행 계획: OFFSET은 "SCAN", keyset은 "SEARCH ... USING COVERING INDEX")
```

- 정렬 기준에 **유일한 컬럼(예: id)을 함께** 넣어야 합니다. `created_at`만 쓰면 같은 시각의 행에서 누락·중복이 생깁니다.
- 커서는 클라이언트가 내용을 해석하지 못하도록 **불투명한 문자열**(인코딩된 값)로 내려줍니다. 정렬 기준을 나중에 바꿀 수 있습니다.
- 대가: **특정 페이지로 바로 이동**하거나 **전체 개수**를 보여 주기 어렵습니다. 그래서 무한 스크롤에는 커서, 관리자 화면의 페이지 번호에는 offset이 맞습니다.

### Offset 기반 (단순)

```
GET /users?page=2&limit=20

{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Cursor 기반 (대규모 데이터)

```
GET /users?cursor=abc123&limit=20

{
  "data": [...],
  "meta": {
    "nextCursor": "def456",
    "hasNext": true
  }
}
```

### 🎯 페이지네이션 선택 체크리스트

**Offset 기반 선택**

- [ ] 전체 개수가 필요 (total count)
- [ ] 특정 페이지로 바로 이동 필요
- [ ] 데이터 규모가 작음 (< 10만 건)
- [ ] 실시간 데이터 변경이 적음

**Cursor 기반 선택**

- [ ] 대규모 데이터 (> 10만 건)
- [ ] 무한 스크롤 UI
- [ ] 실시간 데이터 변경이 많음
- [ ] 성능이 중요

---

## 필터링 & 정렬

```bash
# 필터링
GET /users?status=active&role=admin

# 정렬
GET /users?sort=createdAt:desc
GET /users?sort=-createdAt  # 또는 - 접두사

# 필드 선택 (Sparse Fieldset)
GET /users?fields=id,name,email

# 검색
GET /users?q=john
```

---

## API 버전 관리

### 버전을 언제 올리는가

버전은 **깨는 변경을 내보낼 때만** 올립니다(위 표). 필드 추가 같은 호환 변경은 같은 버전에서 합니다. 버전을 자주 올리면 오래된 버전을 **전부 유지보수**해야 합니다.

- **폐기 예고**: 오래된 버전을 없앨 계획이면 응답 헤더로 알립니다. `Deprecation` 헤더는 RFC 9745(2025-03), `Sunset` 헤더(종료 시점)는 RFC 8594입니다. 클라이언트가 사용 중인 버전을 로그로 보고 이전 상황을 확인한 뒤 종료합니다.
- 버전을 두지 않고 **하위 호환만 유지하며 진화**시키는 방식도 있습니다. 내부 API나 클라이언트를 통제할 수 있을 때 현실적입니다.

### URL Path (권장)

```
GET /api/v1/users
GET /api/v2/users
```

### Header

```
GET /api/users
Accept: application/vnd.example.v1+json   # 자체 vendor 미디어 타입으로 버전 표현
```

> 헤더 방식에서 `application/vnd.api+json;version=1`처럼 쓰지 않는 이유: `application/vnd.api+json`은 JSON:API 명세의 미디어 타입이며, 명세는 `ext`와 `profile` 외의 파라미터를 붙이면 서버가 **415**(Content-Type) 또는 **406**(Accept)로 응답하도록 정합니다. 직접 정한 vendor 미디어 타입을 씁니다.

### Query String

```
GET /api/users?version=1
```

### 🎯 버전 관리 선택 체크리스트

**URL Path 선택**

- [ ] 명시적이고 직관적
- [ ] 캐싱이 용이해야 함
- [ ] 브라우저에서 직접 테스트
- [ ] 대부분의 경우 (권장)

**Header 선택**

- [ ] URL 깔끔하게 유지
- [ ] 클라이언트가 헤더 설정 가능
- [ ] 버전 전환이 유연해야 함

---

## 응답 래핑

### 일관된 응답 구조

```json
// 성공
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}

// 에러
{
  "success": false,
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

> `success: true/false`는 HTTP 상태 코드가 이미 알려 주는 정보를 **중복**합니다. 성공은 2xx, 실패는 4xx/5xx이고 에러 본문은 위의 Problem Details 형식을 쓰면 충분합니다. 봉투(envelope)는 `meta`(페이지 정보) 같은 부가 정보를 함께 내려줄 때 필요합니다. 어느 쪽이든 **API 전체에서 한 가지로** 통일합니다(경험칙).

### 또는 단순 구조

```json
// 성공 - 데이터 직접 반환
{ "id": 1, "name": "John" }

// 에러 - error 객체
{ "error": { ... } }
```

---

## 🎯 API 설계 체크리스트

### URL 설계

- [ ] 리소스는 명사, 복수형
- [ ] 동사 사용 안함
- [ ] 소문자, 하이픈(-) 사용
- [ ] 3단계 이상 중첩 피함

### 응답

- [ ] 호환 변경과 깨는 변경을 구분해 버전 정책 수립
- [ ] POST 등 재시도 위험이 있는 요청에 멱등 키 고려
- [ ] 동시 수정 충돌이 중요하면 ETag/`If-Match`
- [ ] 적절한 HTTP 상태 코드
- [ ] 일관된 에러 응답 형식
- [ ] 페이지네이션 (목록 API)

### 보안

- [ ] HTTPS 필수
- [ ] Rate Limiting
- [ ] 인증/인가 적용

### 문서화

- [ ] OpenAPI (Swagger) 문서
- [ ] 예시 요청/응답 포함
- [ ] 에러 코드 정의

---

## 참고 자료

- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) - 안전·멱등 메서드 정의(§9.2), 자동 재시도 규칙, 201·202·204·401·403·409·412·422·503 정의
- [RFC 5789 PATCH Method for HTTP](https://www.rfc-editor.org/rfc/rfc5789.html) - PATCH는 안전하지도 멱등하지도 않음
- [RFC 6585 Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585.html) - 429와 `Retry-After`
- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) - `application/problem+json`, 필드 정의 (RFC 7807을 대체)
- [RFC 9745 Deprecation Header](https://www.rfc-editor.org/rfc/rfc9745.html), [RFC 8594 Sunset Header](https://www.rfc-editor.org/rfc/rfc8594.html)
- [draft-ietf-httpapi-idempotency-key-header](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) - Idempotency-Key 인터넷 드래프트(RFC 아님)
- [Fielding 박사 논문 5장: REST](https://roy.gbiv.com/pubs/dissertation/rest_arch_style.htm) - REST 제약 목록
- [JSON:API 명세](https://jsonapi.org/format/) - 미디어 타입 파라미터 제한(415/406)

### 설계 가이드

- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Google API Design Guide](https://cloud.google.com/apis/design)

확인일: 2026-10-22 (RFC 9110·5789·6585·9457 본문 확인, RFC 9745·8594 제목·상태, Idempotency-Key 드래프트 상태, Fielding 제약 목록, JSON:API 미디어 타입 규칙. offset vs keyset 비교 결과와 실행 계획은 SQLite 3.51.0에서 실행 확인(다른 DB는 실행 계획이 다를 수 있음). 호환 변경 분류, 404로 존재 숨기기, 400 vs 422 선택, 봉투 구조에 대한 의견은 관례·경험칙. Microsoft·Google 가이드라인 내용과 아래 페이지네이션 응답 예시는 미확인)
