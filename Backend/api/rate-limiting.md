# Rate Limiting

## Rate Limiting이란?

> 일정 시간 내 API 요청 횟수를 제한하는 기법

**왜 필요한가?**

- **서버 보호**: DDoS, 과부하 방지
- **공정한 사용**: 특정 사용자의 독점 방지
- **비용 관리**: 외부 API 호출 비용 제어
- **보안**: Brute Force 공격 방지

---

## 핵심 개념

| 용어       | 설명          | 예시   |
| ---------- | ------------- | ------ |
| **Rate**   | 허용 요청 수  | 100회  |
| **Window** | 시간 단위     | 1분    |
| **Limit**  | Rate / Window | 100/분 |

### 응답 헤더 (표준)

```
X-RateLimit-Limit: 100        # 허용량
X-RateLimit-Remaining: 42     # 남은 횟수
X-RateLimit-Reset: 1704067200 # 리셋 시간 (Unix timestamp)
Retry-After: 30               # 429 응답 시, 재시도까지 대기 시간
```

---

## Rate Limiting 알고리즘

### 1. Fixed Window

> 고정된 시간 구간에서 카운트

```
[00:00-01:00] 100회 허용
[01:00-02:00] 100회 허용
```

**장점**: 구현 단순, 메모리 효율  
**단점**: 경계 시점 burst 가능 (00:59에 100회 + 01:00에 100회)

### 2. Sliding Window Log

> 각 요청의 타임스탬프를 저장

```typescript
// 최근 1분 내 요청 수 확인
const recentRequests = requests.filter((t) => t > now - 60000);
if (recentRequests.length >= 100) reject();
```

**장점**: 정확함  
**단점**: 메모리 많이 사용

### 3. Sliding Window Counter ⭐

> Fixed Window + 가중치 계산

```
이전 윈도우: 80회 (40% 가중치)
현재 윈도우: 30회 (60% 가중치)
예상값: 80*0.4 + 30*0.6 = 50회
```

**장점**: 정확도와 효율 균형  
**단점**: 구현 복잡

### 4. Token Bucket

> 일정 속도로 토큰 생성, 요청 시 토큰 소비

```
버킷 용량: 100
토큰 충전: 10/초
요청 시: 토큰 1개 소비
```

**장점**: 버스트 트래픽 허용, 유연함  
**단점**: 구현 복잡

### 5. Leaky Bucket

> 일정 속도로 요청 처리 (버킷에서 물 새듯)

**장점**: 일정한 처리 속도  
**단점**: 버스트 처리 불가

---

## 🎯 알고리즘 선택 체크리스트

**Fixed Window 선택**

- [ ] 구현 단순성 우선
- [ ] 경계 burst 허용 가능
- [ ] 작은 규모

**Sliding Window Counter 선택**

- [ ] 정확도 + 성능 균형
- [ ] 대부분의 경우 권장 ⭐

**Token Bucket 선택**

- [ ] 버스트 트래픽 허용 필요
- [ ] API 과금 모델
- [ ] 유연한 제한 필요

---

## 구현 (Node.js)

### express-rate-limit

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 최대 100회
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);
```

### Redis 기반 (분산 환경)

```typescript
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

const redisClient = new Redis();

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 100, // 요청 허용량
  duration: 60, // 윈도우 (초)
  keyPrefix: "rl",
});

app.use(async (req, res, next) => {
  try {
    const key = req.user?.id || req.ip;
    await rateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    res.status(429).json({
      error: "Too many requests",
      retryAfter: rateLimiterRes.msBeforeNext / 1000,
    });
  }
});
```

---

## Rate Limit 설계

### 식별자 (Key)

```typescript
// IP 기반
const key = req.ip;

// 사용자 기반 (로그인 후)
const key = req.user.id;

// API 키 기반
const key = req.headers["x-api-key"];

// 조합
const key = `${req.user?.id || "anon"}:${req.ip}`;
```

### 엔드포인트별 차등 제한

```typescript
// 일반 API
const generalLimiter = rateLimit({ max: 100, windowMs: 60000 });

// 로그인 (브루트포스 방지)
const loginLimiter = rateLimit({ max: 5, windowMs: 60000 });

// 비용 높은 API
const heavyLimiter = rateLimit({ max: 10, windowMs: 60000 });

app.use("/api/", generalLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/export", heavyLimiter);
```

### 사용자 등급별 차등

```typescript
function getRateLimit(user) {
  if (user.plan === "enterprise") return 10000;
  if (user.plan === "pro") return 1000;
  return 100; // free
}

const limiter = new RateLimiterRedis({
  points: (req) => getRateLimit(req.user),
  duration: 60,
});
```

---

## 분산 환경

### 문제

```
서버 A: 50회 허용
서버 B: 50회 허용
→ 같은 사용자가 100회 요청 가능 (의도와 다름)
```

### 해결: 중앙 저장소 (Redis)

```typescript
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // 모든 서버가 같은 Redis 사용
  points: 100,
  duration: 60,
});
```

---

## 429 응답 처리 (클라이언트)

```typescript
async function fetchWithRetry(url, options, retries = 3) {
  const response = await fetch(url, options);

  if (response.status === 429 && retries > 0) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "1");
    await sleep(retryAfter * 1000);
    return fetchWithRetry(url, options, retries - 1);
  }

  return response;
}
```

---

## 🎯 Rate Limiting 설계 체크리스트

### 기본 설정

- [ ] 식별자 결정 (IP, User ID, API Key)
- [ ] 적절한 윈도우와 제한 설정
- [ ] 표준 헤더 응답 (X-RateLimit-\*)

### 세분화

- [ ] 엔드포인트별 차등 제한
- [ ] 사용자 등급별 차등 제한
- [ ] 로그인 등 민감 API 강한 제한

### 분산 환경

- [ ] Redis 등 중앙 저장소 사용
- [ ] 장애 시 fallback 전략

### 모니터링

- [ ] 429 응답 비율 모니터링
- [ ] 비정상 트래픽 탐지
- [ ] 제한 조정 기준 수립

---

## 주의사항

- ⚠️ 프록시 사용 시 `X-Forwarded-For` 확인
- ⚠️ 제한이 너무 빡빡하면 정상 사용자 불편
- ⚠️ 제한이 너무 느슨하면 의미 없음
- ⚠️ 분산 환경에서는 반드시 중앙 저장소 사용
