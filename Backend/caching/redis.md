# Caching (Redis)

## 캐시란?

> 자주 사용하는 데이터를 빠른 저장소에 임시 보관하여 성능 향상

**왜 필요한가?**

- DB 부하 감소
- 응답 시간 단축
- 비용 절감 (외부 API 호출 등)

---

## Redis 기본

### 설치 & 실행

```bash
# Docker로 실행
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 접속
docker exec -it redis redis-cli
```

### 기본 명령어

```bash
# String
SET key "value"
GET key
SET key "value" EX 3600     # 1시간 후 만료
SETEX key 3600 "value"      # 위와 동일
TTL key                      # 남은 시간 확인

# 삭제
DEL key
EXPIRE key 3600             # 만료 시간 설정

# 존재 확인
EXISTS key

# 패턴 조회 (주의: 프로덕션에서 KEYS 사용 금지)
KEYS user:*                  # 개발용
SCAN 0 MATCH user:* COUNT 100  # 프로덕션용
```

### 자료구조

```bash
# Hash (객체)
HSET user:123 name "John" email "john@example.com"
HGET user:123 name
HGETALL user:123

# List (큐/스택)
LPUSH queue task1 task2
RPOP queue

# Set (중복 없는 집합)
SADD tags:post:1 "tech" "redis"
SMEMBERS tags:post:1

# Sorted Set (순위)
ZADD leaderboard 100 "player1" 200 "player2"
ZREVRANGE leaderboard 0 9 WITHSCORES  # 상위 10명
```

---

## 캐싱 전략

### 1. Cache-Aside (Lazy Loading) ⭐

> 애플리케이션이 캐시를 직접 관리

```typescript
async function getUser(id: string) {
  // 1. 캐시 확인
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  // 2. DB 조회
  const user = await db.users.findById(id);

  // 3. 캐시 저장
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));

  return user;
}
```

**장점**: 필요한 것만 캐싱, 구현 단순  
**단점**: 첫 요청 느림, 데이터 불일치 가능

### 2. Write-Through

> 쓰기 시 캐시와 DB 동시 업데이트

```typescript
async function updateUser(id: string, data: UserData) {
  // 1. DB 업데이트
  const user = await db.users.update(id, data);

  // 2. 캐시 업데이트
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));

  return user;
}
```

**장점**: 캐시 항상 최신  
**단점**: 쓰기 지연, 안 쓰는 데이터도 캐싱

### 3. Write-Behind (Write-Back)

> 캐시에 먼저 쓰고, 비동기로 DB 반영

```typescript
async function updateUser(id: string, data: UserData) {
  // 1. 캐시에 먼저 저장
  await redis.setex(`user:${id}`, 3600, JSON.stringify(data));

  // 2. 큐에 DB 업데이트 작업 추가
  await queue.add("syncUser", { id, data });

  return data;
}
```

**장점**: 쓰기 빠름, 배치 처리 가능  
**단점**: 데이터 유실 위험, 복잡성 증가

### 🎯 캐싱 전략 선택 체크리스트

**Cache-Aside 선택**

- [ ] 읽기 비율이 높음 (읽기 >> 쓰기)
- [ ] 캐시 미스 허용 가능
- [ ] 단순한 구현 원함
- [ ] 조회성 데이터 (상품 정보, 설정 등)

**Write-Through 선택**

- [ ] 데이터 일관성 중요
- [ ] 쓰기 후 바로 읽는 경우 많음
- [ ] 캐시 미스 최소화 필요
- [ ] 쓰기 지연 허용

**Write-Behind 선택**

- [ ] 쓰기 성능 중요
- [ ] 약간의 데이터 유실 허용
- [ ] 대량 쓰기 작업
- [ ] 분석/로그 데이터

---

## 캐시 무효화 (Invalidation)

### 시간 기반 (TTL)

```typescript
// 1시간 후 자동 만료
await redis.setex("key", 3600, "value");
```

### 이벤트 기반

```typescript
// 데이터 변경 시 삭제
async function updateUser(id: string, data: UserData) {
  await db.users.update(id, data);
  await redis.del(`user:${id}`);
}
```

### 패턴 삭제

```typescript
// 관련 키 모두 삭제 (SCAN 사용)
async function invalidateUserCache(userId: string) {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      `user:${userId}:*`,
      "COUNT",
      100
    );
    cursor = nextCursor;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
}
```

---

## 캐시 키 설계

### 네이밍 규칙

```
# 형식: {prefix}:{entity}:{id}:{subset}
user:123
user:123:profile
user:123:orders:list
product:456:details

# 버전 포함 (스키마 변경 대응)
v1:user:123

# 쿼리 파라미터 포함
products:list:category=tech:page=1:limit=20
```

### 키 생성 함수

```typescript
function getCacheKey(entity: string, id: string, ...parts: string[]) {
  return [entity, id, ...parts].join(":");
}

// 사용
const key = getCacheKey("user", "123", "orders", "list");
// → "user:123:orders:list"
```

---

## 캐시 패턴

### Thundering Herd 방지

> 캐시 만료 시 동시 요청이 DB 몰림

```typescript
// 분산 락 사용
async function getUserWithLock(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  // 락 획득 시도
  const lockKey = `lock:user:${id}`;
  const acquired = await redis.set(lockKey, "1", "NX", "EX", 5);

  if (!acquired) {
    // 다른 요청이 처리 중 - 잠시 대기 후 재시도
    await sleep(100);
    return getUserWithLock(id);
  }

  try {
    const user = await db.users.findById(id);
    await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
    return user;
  } finally {
    await redis.del(lockKey);
  }
}
```

### 캐시 워밍업

> 서버 시작 시 미리 캐시 채우기

```typescript
async function warmupCache() {
  const popularProducts = await db.products.findPopular(100);

  for (const product of popularProducts) {
    await redis.setex(`product:${product.id}`, 3600, JSON.stringify(product));
  }
}
```

---

## Node.js 연동

### ioredis

```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: "localhost",
  port: 6379,
  password: "your-password",
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// 사용
await redis.get("key");
await redis.setex("key", 3600, "value");
```

### 캐시 서비스 래퍼

```typescript
class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }
}
```

---

## 🎯 캐싱 체크리스트

### 도입 전

- [ ] 캐싱이 필요한지 확인 (먼저 쿼리 최적화)
- [ ] 캐시할 데이터 선정
- [ ] TTL 정책 수립
- [ ] 무효화 전략 결정

### 구현 시

- [ ] 일관된 키 네이밍
- [ ] 적절한 TTL 설정
- [ ] 에러 처리 (캐시 실패 시 DB 폴백)
- [ ] 캐시 미스 로깅

### 운영

- [ ] 히트율 모니터링
- [ ] 메모리 사용량 확인
- [ ] 만료 정책 확인
- [ ] Thundering Herd 대비

---

## 주의사항

- ⚠️ 캐시는 **DB가 아님** → 영구 저장 금지
- ⚠️ 먼저 **쿼리 최적화** → 그래도 느리면 캐시
- ⚠️ **TTL 필수** → 무한 캐시 금지
- ⚠️ **캐시 실패 = 서비스 실패** 아님 → 폴백 처리
