# Exception Strategy

백엔드 프레임워크(NestJS, Spring 등)에서의 예외 처리 전략 비교

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

// 컨트롤러
const result = findUser(id);
if (!result.ok) {
  throw new NotFoundException(result.error);
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
