# Testing Strategy

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

### Mock vs Stub vs Spy

| 종류     | 용도                      |
| -------- | ------------------------- |
| **Mock** | 가짜 객체, 호출 검증      |
| **Stub** | 미리 정의된 응답 반환     |
| **Spy**  | 실제 객체 감시, 호출 기록 |

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

### 커버리지 종류

| 종류          | 설명                |
| ------------- | ------------------- |
| **Line**      | 실행된 코드 줄 비율 |
| **Branch**    | 분기문 커버 비율    |
| **Function**  | 호출된 함수 비율    |
| **Statement** | 실행된 구문 비율    |

### 권장 커버리지

```
전체: 70~80% (맹목적 100% 추구 금지)
핵심 비즈니스 로직: 90%+
유틸리티/헬퍼: 80%+
UI 컴포넌트: 60~70%
```

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

### 테스트 격리

```typescript
// ✅ 각 테스트는 독립적
beforeEach(() => {
  jest.clearAllMocks();
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
