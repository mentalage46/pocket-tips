# Testing Strategy

## 개념: 테스트는 무엇을 위한 것인가

테스트의 목적은 "버그가 없음을 증명"하는 것이 아니라 **코드를 바꿀 때 기존 동작이 깨졌는지 빠르게 알려 주는 안전망**입니다. 안전망이 느리거나, 자주 거짓으로 실패하거나, 구현이 바뀔 때마다 깨지면 사람들은 테스트를 믿지 않고 무시합니다. 그래서 좋은 테스트 전략은 아래 네 가지 사이의 균형입니다.

| 성질 | 의미 | 낮으면 |
| --- | --- | --- |
| 속도 | 실행에 걸리는 시간 | 자주 돌리지 않게 되어 피드백이 늦어짐 |
| 신뢰도 | 실제 환경에서의 동작을 얼마나 반영하는가 | 테스트는 통과하는데 운영에서 깨짐 |
| 원인 파악 | 실패했을 때 어디가 문제인지 아는가 | 실패 원인을 찾느라 시간을 씀 |
| 안정성 | 같은 코드에서 항상 같은 결과가 나오는가 | flaky 테스트가 쌓여 실패를 무시하게 됨 |

한 종류의 테스트가 네 가지를 모두 만족하지는 않습니다. **단위 테스트는 빠르고 원인이 분명하지만 신뢰도가 낮고, E2E는 신뢰도가 높지만 느리고 불안정하고 원인 파악이 어렵습니다.** 그래서 여러 층을 섞습니다.

### 테스트 피라미드가 말하는 것

Mike Cohn이 제안한 개념으로, Martin Fowler의 글은 핵심을 이렇게 요약합니다.

- **서로 다른 크기(granularity)의 테스트를 작성한다.**
- **높은 층일수록 테스트 수를 줄인다.**
- **상위 테스트가 버그를 잡았는데 하위 테스트가 실패하지 않았다면, 하위 테스트를 추가한다.** 가능한 한 테스트를 아래층으로 내린다.
- 층 이름(단위/통합/E2E)에 집착하지 않는다. "무엇을 얼마나 넓게 검증하는가"가 기준이다.

### 구현이 아니라 동작을 테스트한다

> "단위 테스트에 내부 코드 구조를 그대로 반영하지 말고, 관찰 가능한 동작을 테스트한다." (Fowler)

```typescript
// ❌ 구현에 묶인 테스트: 내부 호출 순서가 바뀌면 동작은 같아도 깨짐
expect(repo.findById).toHaveBeenCalledTimes(1);
expect(mapper.toDto).toHaveBeenCalledWith(user);

// ✅ 동작을 검증: 입력이 주어졌을 때 결과가 어떤가
expect(await service.getUser(1)).toEqual({ id: 1, name: "John" });
```

리팩터링(동작은 그대로, 내부 구조만 변경)을 해도 테스트가 깨지지 않아야 안전망 역할을 합니다.

---

## 테스트 피라미드

```
        ▲
       /E2E\        적음, 느림, 비용 높음
      /─────\
     /통합테스트\
    /───────────\
   /  단위 테스트  \  많음, 빠름, 비용 낮음
  ─────────────────
```

---

## 테스트 종류

| 종류            | 범위         |  속도   |    비용     |
| --------------- | ------------ | :-----: | :---------: |
| **단위 테스트** | 함수/클래스  | 🚀 빠름 |   💰 낮음   |
| **통합 테스트** | 모듈 간 연동 |  보통   |    중간     |
| **E2E 테스트**  | 전체 시스템  | 🐢 느림 | 💰💰💰 높음 |

---

## 단위 테스트 (Unit Test)

> 개별 함수/클래스의 동작을 검증

### 기본 구조 (AAA 패턴)

```typescript
describe("UserService", () => {
  it("should create a user", () => {
    // Arrange (준비)
    const userData = { name: "John", email: "john@example.com" };

    // Act (실행)
    const user = userService.create(userData);

    // Assert (검증)
    expect(user.name).toBe("John");
    expect(user.email).toBe("john@example.com");
  });
});
```

### 좋은 테스트 작성법

```typescript
// ✅ 테스트 이름은 행동을 설명
it("should throw error when email is invalid", () => {});
it("should return null when user not found", () => {});

// ❌ 모호한 이름
it("test1", () => {});
it("works", () => {});
```

### 테스트 케이스 분류

```typescript
describe("calculateDiscount", () => {
  // 정상 케이스
  describe("when valid inputs", () => {
    it("should apply 10% discount for orders over $100", () => {});
    it("should apply 20% discount for VIP members", () => {});
  });

  // 경계값
  describe("edge cases", () => {
    it("should return 0 for $0 order", () => {});
    it("should handle exactly $100 order", () => {});
  });

  // 에러 케이스
  describe("error cases", () => {
    it("should throw for negative amount", () => {});
    it("should throw for invalid member type", () => {});
  });
});
```

---

## Mocking

### 테스트 대역(Test Double)의 종류

실제 의존성(DB, 외부 API, 시계)을 가짜로 바꿔 테스트를 빠르고 결정적으로 만드는 것을 통틀어 **테스트 대역**이라 합니다. Meszaros의 분류는 다음과 같습니다.

| 종류 | 정의 | 예 |
| --- | --- | --- |
| **Dummy** | 전달만 되고 **실제로는 쓰이지 않는** 객체 | 필수 매개변수를 채우는 빈 객체 |
| **Fake** | **실제로 동작하는** 단순화된 구현. 운영용은 아님 | 메모리에 저장하는 `InMemoryUserRepository` |
| **Stub** | 호출에 **미리 정한 답**을 돌려줌 | `findById`가 항상 `{ id: 1 }` 반환 |
| **Spy** | Stub이면서 **어떻게 호출됐는지 기록** | 이메일 서비스가 몇 번 호출됐는지 기록 |
| **Mock** | **기대하는 호출을 미리 프로그래밍**해 두고 검증 | "`send`가 이 인자로 한 번 호출돼야 한다" |

- 일상에서는 이 용어들이 섞여 쓰이고, Jest의 `jest.fn()`은 Stub·Spy·Mock 역할을 모두 합니다. 용어보다 **무엇을 검증하려는가**가 중요합니다.
- **결과(상태)를 검증**할 수 있으면 결과를 검증하고, 결과로 드러나지 않는 부수 효과(메일 발송, 결제 요청)일 때만 **호출을 검증**합니다.
- 호출 검증을 남발하면 구현을 바꿀 때마다 테스트가 깨집니다. 복잡한 의존성은 호출을 검증하는 Mock보다 **동작하는 Fake**가 더 오래 갑니다.
- **Mock의 한계**: 테스트가 가정한 대로만 동작하므로, 실제 DB·API가 다르게 동작해도 통과합니다. 그래서 의존성과 만나는 경계는 통합 테스트로 한 번 검증합니다.

### Jest Mock 예시

```typescript
// 모듈 전체 mock
jest.mock("./userRepository");

// 특정 함수 mock
const mockFindById = jest.fn().mockResolvedValue({ id: 1, name: "John" });
userRepository.findById = mockFindById;

// 호출 검증
expect(mockFindById).toHaveBeenCalledWith(1);
expect(mockFindById).toHaveBeenCalledTimes(1);
```

### 외부 의존성 Mock

```typescript
// API 호출 mock
jest.mock("axios");
(axios.get as jest.Mock).mockResolvedValue({ data: { users: [] } });

// 시간 mock
jest.useFakeTimers();
jest.setSystemTime(new Date("2024-01-01"));

// 환경변수
process.env.API_KEY = "test-key";
```

---

## 통합 테스트 (Integration Test)

> 여러 컴포넌트의 연동을 검증

### API 통합 테스트

```typescript
describe("POST /users", () => {
  it("should create user and return 201", async () => {
    const response = await request(app)
      .post("/users")
      .send({ name: "John", email: "john@example.com" })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe("John");
  });

  it("should return 400 for invalid email", async () => {
    const response = await request(app)
      .post("/users")
      .send({ name: "John", email: "invalid" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

### DB 통합 테스트

```typescript
describe("UserRepository", () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    await db.clear(); // 테스트 간 격리
  });

  it("should save and retrieve user", async () => {
    const user = await userRepository.save({ name: "John" });
    const found = await userRepository.findById(user.id);

    expect(found.name).toBe("John");
  });
});
```

---

## E2E 테스트 (End-to-End)

> 사용자 시나리오 전체를 검증

### Playwright 예시

```typescript
test("user can login and see dashboard", async ({ page }) => {
  // 로그인 페이지로 이동
  await page.goto("/login");

  // 로그인
  await page.fill('[name="email"]', "user@example.com");
  await page.fill('[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // 대시보드 확인
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("h1")).toContainText("Welcome");
});
```

---

## 🎯 테스트 전략 선택 체크리스트

### 단위 테스트 우선

- [ ] 비즈니스 로직이 복잡
- [ ] 순수 함수가 많음
- [ ] 빠른 피드백 필요
- [ ] 리팩토링 자주 함

### 통합 테스트 우선

- [ ] API 엔드포인트 검증
- [ ] DB 쿼리 정확성 중요
- [ ] 외부 서비스 연동 많음
- [ ] 단위 테스트만으로 불안

### E2E 테스트 우선

- [ ] 핵심 사용자 플로우 검증
- [ ] 결제, 회원가입 등 중요 기능
- [ ] UI 상호작용 복잡
- [ ] 배포 전 최종 검증

---

## 테스트 커버리지

### 커버리지가 말해 주는 것과 아닌 것

커버리지는 **테스트가 실행하는 코드의 비율**일 뿐, **그 코드가 올바른지 검증했는지**는 말해 주지 않습니다.

```javascript
// discount.mjs
export function calculateDiscount(member, order) {
  if (member.type === "VIP") return order.amount * 0.2;
  return 0;
}

// 단언이 하나도 없는 테스트
test("calls both branches", () => {
  calculateDiscount({ type: "VIP" }, { amount: 100 });
  calculateDiscount({ type: "BASIC" }, { amount: 100 });
});
```

이 테스트는 Line·Branch·Function 커버리지가 모두 **100%**이고 통과합니다. 그런데 `0.2`를 `0.9`로 바꾼 버그를 넣어도 **여전히 통과합니다**(Node 24의 내장 테스트 러너로 확인).

- **낮은 커버리지**는 "여기는 테스트가 없다"는 확실한 신호입니다.
- **높은 커버리지**는 "테스트가 충분하다"는 증거가 아닙니다. 단언의 질을 봐야 합니다.
- 수치를 목표로 삼으면 의미 없는 테스트가 늘어납니다(수치가 목표가 되면 좋은 지표가 아니게 됨). 수치는 **빠진 곳을 찾는 도구**로 씁니다.
- 테스트가 버그를 실제로 잡는지 확인하는 방법으로 **뮤테이션 테스트**(코드를 일부러 바꿔 테스트가 실패하는지 확인)가 있습니다.

### 커버리지 종류

| 종류          | 설명                | 비고 |
| ------------- | ------------------- | ---- |
| **Line**      | 실행된 코드 줄 비율 | |
| **Branch**    | 분기문 커버 비율    | `if`의 참/거짓 양쪽을 탔는가. Line보다 엄격 |
| **Function**  | 호출된 함수 비율    | |
| **Statement** | 실행된 구문 비율    | 한 줄에 구문이 여러 개일 때 Line과 다름 |

### 권장 커버리지 (경험칙)

```
전체: 70~80% (맹목적 100% 추구 금지)
핵심 비즈니스 로직: 90%+
유틸리티/헬퍼: 80%+
UI 컴포넌트: 60~70%
```

> 위 수치는 널리 쓰이는 경험칙이며 공식 기준이 아닙니다. 팀이 정한 **최소선**(예: 새로 바뀐 코드의 커버리지)을 CI에서 막는 용도로 쓰고, 그 이상은 위험도가 높은 코드(결제, 권한, 계산)에 집중합니다.

---

## 테스트 팁

### Given-When-Then 패턴

```typescript
it("should apply discount for VIP member", () => {
  // Given: VIP 회원이고 주문금액이 100달러일 때
  const member = { type: "VIP" };
  const order = { amount: 100 };

  // When: 할인을 계산하면
  const discount = calculateDiscount(member, order);

  // Then: 20% 할인이 적용된다
  expect(discount).toBe(20);
});
```

### 결정적(deterministic)인 테스트: flaky를 만드는 것들

같은 코드인데 어떤 때는 통과하고 어떤 때는 실패하는 테스트(flaky)는 신뢰를 가장 빨리 무너뜨립니다. 원인은 대부분 **테스트가 통제하지 못하는 것**에 의존하기 때문입니다.

| 원인 | 대응 |
| --- | --- |
| 현재 시각, 타이머 | `jest.useFakeTimers()` + `jest.setSystemTime()`으로 고정 |
| 난수, UUID | 시드 고정 또는 주입해서 대체 |
| 외부 네트워크·API | Stub·Fake로 대체하거나 로컬 테스트 서버 사용 |
| 테스트 간 공유 상태(DB, 전역 변수, 캐시) | 매 테스트 전 초기화, 테스트가 만든 데이터는 직접 정리 |
| 실행 순서 의존 | 각 테스트가 스스로 준비(Arrange)하게 함 |
| 비동기 대기(`sleep`) | 고정 시간 대기 대신 조건을 기다림 |

> 상위 층(E2E)일수록 flaky해지기 쉽습니다. 그래서 핵심 사용자 시나리오 몇 개만 E2E로 두고 나머지는 아래층에서 검증합니다.

### 테스트 격리

```typescript
// ✅ 각 테스트는 독립적
beforeEach(() => {
  jest.clearAllMocks(); // 호출 기록만 지움. 구현(mockResolvedValue 등)은 남음
  // 상태 초기화
});

// ❌ 테스트 간 의존성
let user;
it("creates user", () => {
  user = createUser();
});
it("updates user", () => {
  updateUser(user);
}); // 이전 테스트에 의존
```

---

## 🎯 테스트 작성 체크리스트

### 작성 시

- [ ] AAA / Given-When-Then 패턴 사용
- [ ] 하나의 테스트는 하나의 동작만 검증
- [ ] 테스트 이름이 행동을 설명
- [ ] 정상/경계/에러 케이스 포함

### 유지보수

- [ ] 테스트 간 독립성 보장
- [ ] Mock은 필요한 만큼만
- [ ] 테스트 실행 시간 관리
- [ ] 실패 시 원인 파악 용이

### CI/CD

- [ ] PR마다 테스트 실행
- [ ] 커버리지 리포트 생성
- [ ] 테스트 실패 시 머지 차단

## 참고 자료

- [Martin Fowler: The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) - 피라미드의 원 출처(Cohn), 다양한 크기의 테스트, 아래층으로 내리기, 관찰 가능한 동작, E2E의 불안정성
- [Martin Fowler: Test Double](https://martinfowler.com/bliki/TestDouble.html) - Dummy·Fake·Stub·Spy·Mock 정의(Meszaros)
- [Jest: Mock Functions](https://jestjs.io/docs/mock-function-api) - `mockClear`·`mockReset`·`mockRestore` 차이, `clearMocks`·`resetMocks`·`restoreMocks` 설정

확인일: 2026-10-22 (피라미드 원칙, 테스트 대역 정의, Jest mock 메서드 차이. 커버리지 100%이지만 버그를 못 잡는 예시는 Node 24.13 내장 테스트 러너(`node --test --experimental-test-coverage`)로 실행 확인. 상태 검증 vs 행위 검증 설명, 권장 커버리지 수치, 4가지 성질 표, `jest.clearAllMocks`·`resetAllMocks` 비교는 일반 개념·경험칙·미확인. 아래 Playwright·DB 통합 테스트 예시는 미확인)
