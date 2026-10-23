# Caching (Redis)

## 캐시란?

> 자주 사용하는 데이터를 빠른 저장소에 임시 보관하여 성능 향상

**왜 필요한가?**

- DB 부하 감소
- 응답 시간 단축
- 비용 절감 (외부 API 호출 등)

---

## 개념: 캐시는 속도를 얻는 대신 정합성을 내주는 사본이다

캐시에 들어 있는 값은 **원본이 아니라 사본**입니다. 원본(DB)이 바뀌면 사본은 낡은 값이 되고, 캐시를 쓰는 순간 "어느 정도의 오래된 값은 허용한다"는 결정을 한 것입니다. 그래서 캐시는 두 가지를 먼저 따져야 합니다.

1. **효과가 있는가**: 같은 값을 **자주 읽고**, 만드는 비용(쿼리, 계산, 외부 호출)이 **크고**, 접근이 일부 데이터에 **몰려 있을 때** 효과가 큽니다. 조회가 거의 반복되지 않으면 캐시는 메모리만 쓰고 복잡도만 늘립니다.
2. **얼마나 낡아도 되는가**: 상품 목록은 몇 분 낡아도 되지만 결제 잔액은 안 됩니다. 이 허용치가 TTL과 무효화 전략을 정합니다.

### 효과 측정: 히트율

```
히트율 = keyspace_hits / (keyspace_hits + keyspace_misses) × 100
```

`INFO stats`의 값으로 계산합니다(Redis 공식 문서). 히트율이 기대보다 낮으면 `evicted_keys`(메모리 부족으로 쫓겨난 키)와 `expired_keys`(TTL로 만료된 키)를 봅니다. 쫓겨난 키가 많으면 메모리 부족이나 정책 문제, 만료가 많으면 TTL이 너무 짧거나 캐시할 대상을 잘못 고른 것입니다. `EXISTS`로 없는 키를 확인해도 miss로 집계된다는 점도 알아 둡니다.

### Redis는 메모리가 한정된 저장소다: 키가 쫓겨나는 규칙

Redis는 메모리에 데이터를 둡니다. `maxmemory`로 상한을 정하고, 넘으면 `maxmemory-policy`에 따라 키를 쫓아냅니다(eviction).

| 정책 | 동작 |
| --- | --- |
| `noeviction` | 쫓아내지 않음. **새 데이터를 쓰는 명령이 오류**를 냄 (읽기는 정상) |
| `allkeys-lru` | 모든 키 중 **가장 오래 안 쓴** 키 제거. 일부 키에 접근이 몰릴 때의 무난한 기본값 (공식 문서의 권고) |
| `allkeys-lfu` | 모든 키 중 **가장 적게 쓴** 키 제거 |
| `allkeys-random` | 무작위 제거. 모든 키가 비슷한 빈도로 접근될 때 |
| `volatile-lru`, `volatile-lfu`, `volatile-random`, `volatile-ttl` | **TTL이 설정된 키만** 대상. TTL 키가 없으면 `noeviction`처럼 동작 |

- `maxmemory` 기본값은 0(제한 없음, 64비트 기준)입니다. 캐시로 쓰면서 상한을 안 정하면 서버 메모리를 다 쓸 때까지 커집니다.
- **캐시 전용 Redis**라면 `maxmemory` + `allkeys-lru`(또는 lfu)가 일반적입니다. 캐시 키를 사용한 만큼 알아서 비워 주기 때문입니다.
- 한 인스턴스에 캐시와 영구 데이터(세션, 큐)를 섞으면 영구 데이터가 쫓겨날 수 있습니다. 공식 문서도 **인스턴스를 분리**하는 것을 권합니다.
- LRU는 정확한 계산이 아니라 **일부 키를 샘플링한 근사**입니다.

### 영속성: Redis는 DB가 아니다 (그래도 디스크에 쓸 수는 있다)

| 방식 | 내용 | 잃을 수 있는 데이터 |
| --- | --- | --- |
| 영속성 없음 | 재시작하면 비어 있음 | 전부 (캐시용으로 쓰기도 함) |
| RDB | 일정 간격 스냅샷 | 마지막 스냅샷 이후 (수 분) |
| AOF | 모든 쓰기를 로그에 기록 | `appendfsync everysec`(기본)면 최대 약 1초 |
| RDB + AOF | 둘 다 | AOF 기준 |

- 순수 캐시는 **잃어도 DB에서 다시 채우면 되는 데이터**이므로 영속성이 필요 없는 경우가 많습니다. 반대로 세션·카운터·큐처럼 잃으면 안 되는 용도는 영속성 설정과 백업을 따로 설계합니다.
- 그렇더라도 재시작 직후 캐시가 비면 **모든 요청이 DB로** 몰립니다. 캐시 워밍업이나 DB가 버틸 수 있는 보호 장치를 준비합니다.

### 캐시와 DB가 어긋나는 순간들

캐시와 DB는 별개의 저장소라서 **원자적으로 함께 바꿀 수 없습니다.** 대표적인 어긋남은 다음과 같습니다.

```
Cache-Aside에서 낡은 값이 캐시에 남는 경쟁 상태

요청 A: 캐시 miss → DB에서 읽음(옛 값)
요청 B:                        DB 갱신 → 캐시 삭제
요청 A:                                              캐시에 옛 값 저장   ← 낡은 값이 TTL까지 남음
```

- 이런 경쟁은 드물지만 **완전히 막을 수는 없습니다.** 그래서 무효화(삭제)만 믿지 말고 **TTL을 안전망**으로 항상 둡니다.
- 일반적으로 "DB를 먼저 갱신하고 캐시를 삭제"하는 순서가 많이 쓰이지만(아래 이벤트 기반 무효화), 실패 시에는 낡은 값이 남을 수 있으니 TTL이 필요합니다.
- 정확성이 중요한 값(잔액, 재고 차감)은 캐시를 **읽기 최적화에만** 쓰고, 판단과 차감은 DB의 트랜잭션에서 합니다.

### 캐시가 장애를 만드는 세 가지 패턴

| 이름 | 상황 | 대응 |
| --- | --- | --- |
| **Stampede / Thundering Herd** | 인기 키가 만료되는 순간 동시 요청이 모두 DB로 감 | 단일 갱신자(락), 만료 전 미리 갱신 |
| **Penetration (관통)** | **존재하지 않는 키**를 반복 조회 → 매번 miss라 DB까지 감 | "없음"도 짧은 TTL로 캐시(음성 캐시), 입력 검증 |
| **Avalanche (눈사태)** | 같은 시각에 많은 키가 **동시에 만료**되거나 Redis가 다운 | TTL에 무작위 지터, 장애 시 DB 보호(폴백, 제한) |

```typescript
// TTL 지터: 같은 시각에 몰려서 만료되지 않게 흩뿌림
const ttl = 3600 + Math.floor(Math.random() * 600); // 3600~4199초
await redis.setex(`user:${id}`, ttl, JSON.stringify(user));
```

(위 세 가지 패턴 이름과 대응은 일반적인 분류이며 Redis 공식 문서의 용어는 아닙니다.)

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

> `KEYS`는 모든 키를 훑는 동안 **서버를 막아** 다른 요청이 대기합니다. 공식 문서는 운영 코드에서 쓰지 말라고 경고합니다. 대신 `SCAN`으로 조금씩 순회합니다.
>
> `SCAN` 사용 시 알아 둘 점: ① `COUNT`(기본 10)는 한 번에 훑는 **작업량의 힌트**일 뿐 결과 개수를 보장하지 않고, ② `MATCH`는 **가져온 뒤에 걸러서** 대부분의 호출이 빈 결과일 수 있으며, ③ 같은 키가 **중복해서** 반환될 수 있습니다. 그래서 **커서가 `0`으로 돌아올 때까지** 반복하고, 처리(삭제 등)는 여러 번 해도 안전해야 합니다.
>
> 패턴 삭제가 자주 필요하다면 키 설계가 문제일 수 있습니다. 관련 키를 한 Hash나 Set에 모으거나, 키에 **버전 번호**를 넣고 올리는 방식(아래 "버전 포함")으로 한꺼번에 무효화하는 편이 낫습니다.


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

### 키 설계 원칙 (Redis 공식 가이드)

- **너무 긴 키는 피합니다.** 1024바이트 키는 메모리뿐 아니라 키 비교 비용도 늘립니다. 긴 값은 해시(SHA1 등)로 줄여 키로 씁니다.
- **너무 짧아도 좋지 않습니다.** `u1000flw`보다 `user:1000:followers`가 읽기 좋고, 절약되는 메모리는 미미합니다.
- `object-type:id` 같은 **스키마를 정해서** 지킵니다. 콜론(`:`)으로 구분하는 것이 관례입니다.
- Redis에는 네임스페이스가 없어서 **이름 충돌은 직접 피해야** 합니다. 앱·환경 접두사를 둡니다.
- 클러스터에서 여러 키를 한 명령으로 다루려면 `{...}` **해시태그**로 같은 슬롯에 모읍니다(남용하면 한 슬롯에 몰려 성능이 떨어짐).

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

핵심 아이디어는 **한 요청만 DB에서 값을 만들고 나머지는 기다리게** 하는 것입니다. 이를 위해 Redis로 락을 잡는데, 락은 **획득보다 해제가 더 위험**합니다.

```typescript
import { randomUUID } from "node:crypto";

// 내가 잡은 락일 때만 지움 (Redis 공식 문서의 Lua 스크립트)
const RELEASE_LOCK = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

async function getUserWithLock(id: string, attempt = 0): Promise<User> {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  // 락 획득: 키가 없을 때만(NX), 5초 뒤 자동 해제(PX), 값은 요청마다 고유한 토큰
  const lockKey = `lock:user:${id}`;
  const token = randomUUID();
  const acquired = await redis.set(lockKey, token, "PX", 5000, "NX");

  if (acquired !== "OK") {
    // 다른 요청이 처리 중 - 잠시 대기 후 재시도 (무한 재귀 방지)
    if (attempt >= 20) return db.users.findById(id); // 포기하고 DB로
    await sleep(100);
    return getUserWithLock(id, attempt + 1);
  }

  try {
    const user = await db.users.findById(id);
    await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
    return user;
  } finally {
    await redis.eval(RELEASE_LOCK, 1, lockKey, token); // 토큰이 같을 때만 삭제
  }
}
```

**왜 토큰과 스크립트가 필요한가** (Redis 분산 락 문서):

1. 락에는 만료(`PX`)가 있어야 합니다. 클라이언트가 죽어도 락이 영원히 남지 않게 하기 위해서입니다.
2. 작업이 락 유효 시간보다 길어지면 **락이 이미 만료돼 다른 클라이언트가 잡았는데**, 내가 뒤늦게 `DEL`하면 **남의 락을 지우게 됩니다.** 그래서 값에 고유 토큰을 넣고, **값이 내 토큰일 때만** 지우는 스크립트로 해제합니다(조회와 삭제를 한 번에 실행해야 하므로 Lua 스크립트). Redis 8.4부터는 `DELEX key IFEQ 값` 명령으로도 가능합니다.
3. `SET ... NX PX`는 **한 번의 명령**으로 존재 확인과 만료 설정을 함께 합니다. `SET NX`와 `EXPIRE`를 따로 호출하면 그 사이에 죽을 때 락이 영구히 남을 수 있습니다.

> **한계**: 이 락은 **Redis 한 대**에서만 안전합니다. 복제본으로 failover되면, 마스터가 락을 복제하기 전에 죽는 경우 두 클라이언트가 동시에 락을 가질 수 있습니다(복제가 비동기이기 때문). 캐시 stampede 방지처럼 "가끔 두 번 실행돼도 괜찮은" 용도에는 충분하지만, **돈이나 재고처럼 정확해야 하는 상호 배제**에는 쓰지 않습니다. 이때는 DB 락·유니크 제약 같은 DB의 보장이나 fencing token을 씁니다.

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

## 참고 자료

- [Redis: Key eviction](https://redis.io/docs/latest/develop/reference/eviction/) - `maxmemory`, `maxmemory-policy` 목록, 기본값, `allkeys-lru` 권고, 히트율 계산, 캐시와 영구 데이터 분리
- [Redis: Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) - RDB·AOF·영속성 없음, `appendfsync everysec`의 최대 1초 손실
- [Redis: Distributed Locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) - `SET ... NX PX`, 무작위 값, 해제 스크립트·`DELEX`, 복제 failover 한계, Redlock·fencing token
- [Redis: SCAN](https://redis.io/docs/latest/commands/scan/) - 보장 사항(중복 가능), `COUNT` 기본 10, `MATCH`는 조회 후 필터
- [Redis: Keys and values](https://redis.io/docs/latest/develop/using-commands/keyspace/) - 키 설계 지침, `KEYS` 경고, 해시태그, 만료 정보 영속화
- ioredis 6.0.0 타입 정의 - `set(..., 'PX', ms, 'NX')`, `setex`, `eval`, `scan(..., 'MATCH', ..., 'COUNT', ...)` 시그니처

확인일: 2026-10-22 (eviction 정책·기본값, 영속성 특성, 락 패턴, SCAN 보장, 키 설계 지침, ioredis 시그니처. 캐시 효과 조건, 경쟁 상태 시나리오, Stampede/Penetration/Avalanche 분류와 대응, TTL 지터 값은 일반 개념·경험칙이며 실제 Redis 서버가 없어 락 코드를 실행해 검증하지는 못함. 명령 원자성, Write-Behind·워밍업 예시, Node 연동 래퍼는 미확인)
