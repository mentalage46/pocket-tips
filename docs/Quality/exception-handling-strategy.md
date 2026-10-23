# Exception Strategy

백엔드 프레임워크(NestJS, Spring 등)에서의 예외 처리 전략 비교

---

## 개념: 전략을 고르기 전에 "어떤 실패인가"부터 나눈다

### 예상된 실패와 예상하지 못한 결함

| 구분 | 예 | 호출자가 | 응답 | 로그 |
| --- | --- | --- | --- | --- |
| **예상된 실패** (비즈니스·입력) | 사용자 없음, 중복 이메일, 검증 실패 | 알아서 복구·안내 가능 | **4xx** + 안정적인 에러 코드 | `INFO`/`WARN`, 스택 불필요 |
| **예상하지 못한 결함** (버그·인프라) | null 참조, DB 연결 끊김, 외부 API 장애 | 고칠 수 없음 | **5xx** + 일반 메시지(내부 정보 숨김) | `ERROR` + 스택, 알림 대상 |

- 이 구분이 아래 네 가지 전략보다 먼저입니다. 전략은 "예상된 실패를 어떻게 표현하는가"의 차이이고, 예상하지 못한 결함은 **어떤 전략에서도 마지막 안전망**(전역 핸들러)이 500으로 처리해야 합니다.
- 구분하지 않으면 **정상적인 로그인 실패가 `ERROR`로 쌓여 알림이 소음**이 되거나, 반대로 **500 응답에 스택 트레이스·SQL이 노출**됩니다([로깅 레벨 기준](../Observability/logging.md#로그는-무기도-된다-인젝션과-민감정보), [OWASP A10](../Security/owasp-top-10.md#a10-mishandling-of-exceptional-conditions-예외-상황-처리-실패)).

### 어디서 잡는가: 경계에서 한 번

예외는 **발생한 곳에서 던지고, 변환·로그·응답은 경계(전역 필터, 에러 미들웨어)에서 한 번만** 합니다.

```
Controller → Service → Repository
   ↑            ↑           ↑ 예외는 위로 전파
   └── 전역 필터/미들웨어에서 한 번: 로그 + HTTP 상태/본문 변환
```

중간 계층에서 `catch`가 정당한 경우는 세 가지뿐입니다.

1. **복구할 수 있을 때**: 기본값 사용, 재시도, 대체 경로
2. **맥락을 더해 다시 던질 때**: 어떤 작업이 실패했는지 덧붙이고 **원인(cause)을 보존**
3. **자원 정리**: `finally`

**하지 말 것**: 빈 `catch`로 삼키기(실패가 조용히 사라짐), `catch` → 로그 → 다시 throw(한 장애가 로그 여러 줄이 됨).

### 원인 보존: `Error`의 `cause`

```javascript
try {
  JSON.parse(raw);
} catch (e) {
  throw new AppError("설정 파일을 읽을 수 없습니다", { cause: e }); // ES2022
}
```

원인을 보존하는 것은 좋지만, 로그에 남길 때 함정이 있습니다(Node 24에서 확인).

| 방법 | `cause`가 보이는가 |
| --- | --- |
| `err.stack` | **아니오** — 스택 문자열에 원인이 없음 |
| `JSON.stringify(err)` | **아니오** — 결과가 `{}` (`Error`의 속성은 열거되지 않음) |
| `util.inspect(err)` / `console.log(err)` | 예 — `[cause]`로 표시 |

로깅 라이브러리에 `err`를 넘길 때 **에러 직렬화**가 `cause`와 `code` 같은 속성을 포함하는지 확인합니다(라이브러리별 동작은 미확인). 에러 코드처럼 클라이언트와 로그가 모두 쓰는 값은 명시적인 필드로 둡니다.

### 에러 코드는 API 계약이다

`USER_NOT_FOUND` 같은 코드는 클라이언트가 분기(화면 문구, 재시도 여부)에 사용하므로 **바꾸면 깨지는 변경**입니다([API 설계: 호환성](../API/api-design.md#개념-api는-바꾸기-어려운-계약이다)). 이름을 한 번 공개하면 유지하고, 응답 본문은 표준 형식(RFC 9457 Problem Details)으로 통일하는 것을 검토합니다([에러 응답](../API/api-design.md#표준-형식-rfc-9457-problem-details)).

### Node.js·프레임워크의 현실

**Express 5**(공식 문서 기준)

| 상황 | 동작 |
| --- | --- |
| 동기 핸들러에서 throw | 자동으로 에러 처리기로 전달 |
| **Promise를 반환하는(`async`) 핸들러가 reject/throw** | 자동으로 `next(err)` 호출 |
| Promise 체인을 `return` 하지 않음 | Express가 못 봄 → **미처리 거부로 프로세스가 종료**될 수 있음 |
| 콜백·타이머 안의 오류 | 직접 `next(err)` 호출 필요 |

- 에러 처리 미들웨어는 **인자 4개** `(err, req, res, next)`이고 다른 `app.use()`·라우트 **뒤에** 정의합니다. 시그니처에 `next`가 있어야 에러 처리기로 인식됩니다.
- 응답을 이미 보내기 시작했다면(`res.headersSent`) 직접 응답하지 말고 `next(err)`로 기본 처리기에 넘깁니다.
- Express의 **기본 처리기는 `NODE_ENV`가 `production`이 아니면 스택 트레이스를 응답에 포함**합니다. 운영에서는 `NODE_ENV=production`을 반드시 설정합니다([환경변수 관리](../Security/env-management.md)).
- (Express 4의 동작은 이 문서에서 확인하지 않았습니다. 미확인)

**NestJS**(공식 문서 기준)

- 내장 예외 계층이 처리하지 않은 예외를 응답으로 바꾸며, **`HttpException`이 아닌 예외는 `500 Internal server error`** 로 응답합니다. 이것이 "예상하지 못한 결함"의 안전망입니다.
- `@Catch()`를 인자 없이 쓰면 **모든 예외**를 잡습니다. catch-all 필터와 특정 예외 필터를 함께 쓸 때는 **catch-all을 먼저 선언**해야 특정 필터가 자기 예외를 처리할 수 있습니다.
- 전역 필터는 `app.useGlobalFilters()`(의존성 주입 **불가**) 또는 `APP_FILTER` 프로바이더(주입 가능)로 등록합니다.

**프로세스 수준**

- Node는 처리되지 않은 Promise 거부를 기본적으로(`--unhandled-rejections=throw`) **uncaught exception으로 승격**합니다. 실제로 `async` 함수 안의 `throw`를 처리하지 않으면 프로세스가 **종료 코드 1로 종료**됐습니다(Node 24에서 확인).
- `process.on('uncaughtException')`은 공식 문서가 **최후의 수단**이라 부르며, 올바른 용도는 **동기적으로 자원을 정리한 뒤 종료**하는 것입니다. 이후 **정상 실행을 계속하는 것은 안전하지 않습니다**(상태를 알 수 없음). 재시작은 프로세스 관리자·컨테이너 오케스트레이터가 맡습니다.

### 예외와 트랜잭션

예외는 트랜잭션의 롤백 여부를 정하는 신호이기도 합니다. Spring은 `@Transactional`에서 **`RuntimeException`과 `Error`만 롤백**하고 **체크 예외는 기본적으로 롤백하지 않습니다**(공식 문서). 체크 예외에서도 롤백하려면 `rollbackFor`를 지정합니다.

```java
@Transactional(rollbackFor = Exception.class)   // 체크 예외도 롤백
```

예외를 중간에서 삼키면 트랜잭션 경계 안에서 **실패했는데 커밋**되는 일이 생길 수 있습니다(일반 개념). 롤백이 필요한 실패는 반드시 트랜잭션 경계까지 전파합니다.

### 전략은 섞어서 쓸 수 있다

| 대상 | 표현 방식 |
| --- | --- |
| 예상된 실패 (검증, 조회 없음) | 도메인 예외 또는 `Result` 값 |
| 예상하지 못한 결함 | 일반 예외를 그대로 던져 전역 핸들러가 500 처리 |

아래 전략 중 하나만 고집하기보다, **예상된 실패는 명시적으로, 결함은 예외로** 나누는 혼합이 흔합니다.

---

## 전략 1: HTTP 예외 직접 사용

> 프레임워크 제공 HTTP 예외 클래스를 그대로 사용

```typescript
// NestJS 예시
throw new BadRequestException("잘못된 요청입니다");
throw new NotFoundException("사용자를 찾을 수 없습니다");
```

### 장점

- ✅ 구현이 간단하고 빠름
- ✅ HTTP 상태 코드와 직접 매핑
- ✅ 프레임워크 기본 지원으로 추가 설정 불필요

### 단점

- ❌ 비즈니스 로직이 HTTP에 의존
- ❌ 도메인 계층에서 HTTP 개념 노출
- ❌ 에러 코드 체계화 어려움

### 선택 체크리스트

- [ ] 소규모 프로젝트 / MVP
- [ ] 단순 CRUD API
- [ ] 빠른 개발이 우선
- [ ] 도메인 복잡도 낮음

---

## 전략 2: 커스텀 비즈니스 예외 + 전역 필터

> 도메인 예외 정의 후 전역 필터에서 HTTP 예외로 변환

```typescript
// 비즈니스 예외 정의
class UserNotFoundException extends BusinessException {
  constructor() {
    super("USER_NOT_FOUND", "사용자를 찾을 수 없습니다");
  }
}

// 서비스에서 사용
throw new UserNotFoundException();

// 전역 필터에서 HTTP 변환
@Catch(BusinessException)
export class BusinessExceptionFilter {
  catch(exception: BusinessException, host: ArgumentsHost) {
    // BusinessException → HttpException 변환
  }
}
```

### 장점

- ✅ 도메인 로직과 HTTP 분리
- ✅ 에러 코드 체계화 가능 (예: `USER_001`)
- ✅ 테스트 용이
- ✅ 클라이언트에 일관된 에러 응답

### 단점

- ❌ 초기 설정 비용
- ❌ 예외 클래스 증가
- ❌ 예외-HTTP 매핑 관리 필요

### 선택 체크리스트

- [ ] 중/대규모 프로젝트
- [ ] 도메인 로직 복잡
- [ ] 여러 인터페이스 지원 (REST, GraphQL 등)
- [ ] 에러 코드 문서화 필요
- [ ] 클린 아키텍처 / DDD 적용

---

## 전략 3: Result/Either 패턴

> 예외 대신 성공/실패를 타입으로 명시적 반환

```typescript
// Result 타입
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// 서비스
function findUser(id: string): Result<User, "NOT_FOUND" | "INVALID_ID"> {
  if (!isValidId(id)) return { ok: false, error: "INVALID_ID" };
  const user = db.find(id);
  if (!user) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, value: user };
}

// 컨트롤러: 에러 종류마다 알맞은 HTTP 상태로 변환
const result = findUser(id);
if (!result.ok) {
  switch (result.error) {
    case "INVALID_ID":
      throw new BadRequestException(result.error); // 400
    case "NOT_FOUND":
      throw new NotFoundException(result.error); // 404
  }
}
```

### 장점

- ✅ 에러 처리가 명시적 (컴파일 타임 검증)
- ✅ 예외 흐름 추적 용이
- ✅ 함수형 프로그래밍 친화적
- ✅ 예외 throw 비용 없음

### 단점

- ❌ 코드 장황해질 수 있음
- ❌ 팀원 학습 곡선
- ❌ 기존 프레임워크 패턴과 다름
- ❌ 중첩 시 처리 복잡

> 기존 예시는 `INVALID_ID`까지 `NotFoundException`(404)으로 변환해 잘못된 입력과 없는 리소스를 구분하지 못했습니다. `Result`의 장점은 컴파일러가 **모든 에러 종류의 처리를 강제**하게 할 수 있다는 것입니다(`switch`에서 한 종류를 빠뜨리면 타입 오류가 나도록 `never` 검사를 추가).

### 선택 체크리스트

- [ ] 함수형 프로그래밍 선호
- [ ] 에러 흐름 명시적 제어 필요
- [ ] 타입 안전성 중시
- [ ] 성능 크리티컬 (예외 throw 비용 회피)

---

## 전략 4: 에러 코드 Enum + 단일 예외 클래스

> 하나의 예외 클래스 + 에러 코드 enum으로 관리

```typescript
// 에러 코드 정의
enum ErrorCode {
  USER_NOT_FOUND = "USER_NOT_FOUND",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
}

// 단일 예외 클래스
class AppException extends Error {
  constructor(public code: ErrorCode, public statusCode: number = 400) {
    super(code);
  }
}

// 사용
throw new AppException(ErrorCode.USER_NOT_FOUND, 404);
```

### 장점

- ✅ 예외 클래스 폭발 방지
- ✅ 에러 코드 중앙 관리
- ✅ IDE 자동완성 지원
- ✅ 구현 단순

### 단점

- ❌ 예외별 추가 데이터 전달 어려움
- ❌ enum 비대해질 수 있음
- ❌ 도메인별 분리 어려움

### 선택 체크리스트

- [ ] 중규모 프로젝트
- [ ] 에러 코드 체계화 필요하지만 클래스 증가는 피하고 싶음
- [ ] 단일 도메인 또는 모놀리식
- [ ] 빠른 개발 + 어느 정도 구조화

---

## 전략 비교 요약

| 전략               | 복잡도  | 확장성  | 도메인 분리 | 추천 규모 |
| ------------------ | :-----: | :-----: | :---------: | :-------: |
| HTTP 예외 직접     | 🟢 낮음 | 🔴 낮음 |     ❌      |  소규모   |
| 커스텀 예외 + 필터 | 🟡 중간 | 🟢 높음 |     ✅      | 중/대규모 |
| Result 패턴        | 🔴 높음 | 🟢 높음 |     ✅      |  상황별   |
| 에러코드 Enum      | 🟢 낮음 | 🟡 중간 |     🔺      |  중규모   |

---

## 빠른 선택 가이드

```
프로젝트 규모?
├── 소규모/MVP → HTTP 예외 직접
├── 중규모 → 에러코드 Enum + 단일 예외
└── 대규모/DDD
    ├── 일반적 → 커스텀 예외 + 전역 필터 ⭐
    └── 함수형 선호 → Result 패턴
```

## 참고 자료

- [Express: Error Handling](https://expressjs.com/en/guide/error-handling.html) - Express 5의 동기/Promise 오류 처리, 에러 미들웨어 시그니처, 기본 처리기의 스택 노출
- [NestJS: Exception filters](https://docs.nestjs.com/exception-filters) - 내장 예외 계층, 비 `HttpException`의 500 응답, `@Catch()`, 전역 필터 등록
- [Spring: Rolling Back a Declarative Transaction](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html) - 기본 롤백 규칙(런타임 예외·`Error`), `rollbackFor`
- [Node.js: process 이벤트 `uncaughtException`](https://nodejs.org/api/process.html#event-uncaughtexception) - 최후의 수단, 정리 후 종료, 정상 실행 재개는 안전하지 않음

확인일: 2026-10-22 (Express 5·NestJS·Spring·Node 공식 문서 확인. 미처리 거부의 종료 코드 1과 `Error`의 `cause`가 `stack`·`JSON.stringify`에 나타나지 않고 `util.inspect`에는 나타나는 것은 Node 24.13에서 직접 실행해 확인. 예상된 실패와 결함의 구분, 경계에서 한 번 처리, 트랜잭션 중 예외 삼킴 위험, 혼합 전략은 일반 개념·경험칙. Express 4의 동작, 로깅 라이브러리별 `cause` 직렬화, Spring 외 프레임워크의 롤백 규칙은 미확인)
