# Rate Limiting

## Rate Limiting이란?

> 일정 시간 내 API 요청 횟수를 제한하는 기법

**왜 필요한가?**

- **서버 보호**: DDoS, 과부하 방지
- **공정한 사용**: 특정 사용자의 독점 방지
- **비용 관리**: 외부 API 호출 비용 제어
- **보안**: Brute Force 공격 방지

---

## 개념: 무엇을, 어디서, 누구 기준으로 제한하는가

### 비슷하지만 다른 네 가지

| 이름 | 제한 대상 | 예 |
| --- | --- | --- |
| **Rate limit** | **시간당 요청 수** | 사용자당 분당 100회 |
| **Quota** | **장기간 총량** | 월 100만 호출 (요금제) |
| **Concurrency limit** | **동시에 처리 중인 요청 수** | 사용자당 동시 5개 |
| **Load shedding** | **서버 전체가 한계에 가까울 때** 일부 요청 버림 | CPU 90% 초과 시 우선순위 낮은 요청에 503 |

Rate limit은 **개별 클라이언트의 과한 사용**을 막고, Load shedding은 **서버 전체의 과부하**를 막습니다. 한쪽만으로는 부족합니다. 모든 클라이언트가 한도 안에서 요청해도 합계가 서버 용량을 넘을 수 있습니다.

### 어디에서 제한하는가

```
클라이언트 → [CDN/WAF/엣지] → [API Gateway/로드밸런서] → [애플리케이션] → [DB/외부 API]
              대량 트래픽 차단     공통 정책, 키 단위 제한      사용자·플랜·엔드포인트별     자원별 보호
```

- **앞쪽일수록 싸게 막습니다.** 앱까지 온 요청은 이미 연결과 파싱에 자원을 썼습니다. DDoS 같은 대량 트래픽은 엣지에서 막는 것이 맞습니다.
- **뒤쪽일수록 의미를 압니다.** "free 플랜은 분당 100회", "로그인은 계정당 5회"처럼 **비즈니스 규칙**은 사용자와 엔드포인트를 아는 앱 계층에서 구현합니다.
- 여러 계층을 **겹쳐서** 씁니다. 엣지(거친 한도) + 앱(정교한 한도).

### 누구를 기준으로 제한하는가 (키 선택)

| 키 | 장점 | 한계 |
| --- | --- | --- |
| IP | 인증 전에도 사용 가능 | 같은 NAT·회사·모바일망의 **여러 사용자가 한 IP를 공유**하면 억울하게 막힘. 공격자는 IP를 바꿈 |
| 사용자 ID | 정확함 | 로그인 후에만 사용 가능 |
| API 키 | 외부 연동 클라이언트 식별 | 키 유출 시 도용 |
| 계정(로그인 시도 대상) | 특정 계정 공격 방어 | 공격자가 남의 계정을 잠그는 **DoS**에 악용될 수 있음 |

**IP를 키로 쓸 때 놓치기 쉬운 두 가지**

1. **프록시 뒤에서는 `req.ip`가 프록시의 IP입니다.** 원래 IP는 `X-Forwarded-For`에 있는데 **클라이언트가 위조할 수 있습니다.** 신뢰하는 프록시 수만큼만 오른쪽에서 읽도록 설정해야 합니다([로드 밸런싱: 프록시 뒤에서](../../Network/load-balancing.md#프록시-뒤에서-놓치기-쉬운-것)). 이를 잘못 설정하면 제한이 우회되거나, 모든 사용자가 한 IP로 보여 한꺼번에 막힙니다.
2. **IPv6는 사용자 한 명이 주소 블록 전체를 가집니다.** 주소 하나씩 제한하면 쉽게 우회됩니다. express-rate-limit은 IPv6 주소를 `ipv6Subnet`(기본 `/56`)으로 묶어서 센 뒤 제한합니다.

로그인 같은 민감한 API는 **IP 기준과 계정 기준을 함께** 쓰고, 지연이나 CAPTCHA를 단계적으로 붙이는 편이 계정 잠금보다 안전합니다([인증과 비밀번호](../../Security/auth-and-passwords.md)).

### 저장소 장애 시 어떻게 할 것인가: fail-open vs fail-closed

카운터를 Redis에 두면 **Redis 장애가 곧 제한 장치의 장애**입니다.

| 정책 | 동작 | 적합한 경우 |
| --- | --- | --- |
| **fail-open** | 제한 장치가 죽으면 **통과**시킴 | 일반 API (제한 때문에 서비스 전체가 멈추는 것이 더 큰 피해) |
| **fail-closed** | 제한 장치가 죽으면 **거부**함 | 로그인·결제 등 남용되면 피해가 큰 엔드포인트 |

express-rate-limit은 스토어 오류 시 기본이 **fail-closed**(`passOnStoreError: false`)이고 `true`로 바꾸면 fail-open입니다. 엔드포인트별로 의식적으로 선택합니다.

---

## 핵심 개념

| 용어       | 설명          | 예시   |
| ---------- | ------------- | ------ |
| **Rate**   | 허용 요청 수  | 100회  |
| **Window** | 시간 단위     | 1분    |
| **Limit**  | Rate / Window | 100/분 |

### 응답 헤더: 관례와 표준화 진행 중

```
X-RateLimit-Limit: 100        # 허용량
X-RateLimit-Remaining: 42     # 남은 횟수
X-RateLimit-Reset: 1704067200 # 리셋 시간 (서비스마다 의미가 다름: Unix 시각 또는 남은 초)
Retry-After: 30               # 429 응답 시, 재시도까지 대기 시간
```

- **`X-RateLimit-*`는 표준이 아니라 널리 쓰이는 관례**입니다. 같은 이름이 서비스마다 다른 의미(예: `Reset`이 Unix 시각인지 남은 초인지)로 쓰입니다. IETF 드래프트도 이를 **상호운용 문제가 있는 기존 관행**으로 부록에 정리합니다.
- 표준화는 IETF HTTP API 워킹그룹의 인터넷 드래프트(`draft-ietf-httpapi-ratelimit-headers`, 확인 시점 개정 11, Standards Track)가 진행 중이며 **`RateLimit`**과 **`RateLimit-Policy`** 헤더를 정의합니다. **아직 RFC가 아닙니다.**
- express-rate-limit은 `standardHeaders`로 드래프트 버전을 고릅니다(`draft-6`: `RateLimit-Limit`·`-Remaining`·`-Reset` 개별 헤더, `draft-7`/`draft-8`: 결합된 `RateLimit` 헤더). `true`는 `draft-6`과 같으며 이 동작은 앞으로 바뀔 수 있다고 문서가 밝힙니다. `legacyHeaders`는 기본이 `true`(`X-RateLimit-*` 전송)라서, 한 가지 방식만 쓰려면 명시적으로 `false`로 둡니다.
- **`Retry-After`**는 표준(RFC 9110)이며 값은 **초 단위 정수 또는 HTTP 날짜**(`Fri, 31 Dec 1999 23:59:59 GMT`) 둘 중 하나입니다. 클라이언트는 두 형식을 모두 처리해야 합니다(아래 "429 응답 처리").

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

> Fixed Window의 카운터 두 개로 슬라이딩 윈도우를 **근사**

현재 윈도우의 카운트는 그대로 더하고, **이전 윈도우의 카운트는 아직 현재 슬라이딩 윈도우에 걸쳐 있는 비율만큼만** 반영합니다.

```
추정치 = 이전 윈도우 카운트 × (남은 겹침 비율) + 현재 윈도우 카운트

예 (한도 50/분): 이전 분에 42회, 현재 분이 시작된 지 15초, 현재 18회
→ 42 × (60 − 15) / 60 + 18 = 42 × 0.75 + 18 = 49.5
```

Cloudflare가 소개한 이 방식은 실제 트래픽 4억 건 분석에서 **0.003%**의 요청만 잘못 허용·차단했고, 실제 비율과 근사치의 평균 차이는 약 6%였다고 합니다.

> 흔한 오류: 현재 윈도우의 카운트에도 가중치(경과 비율)를 곱하는 것입니다. 현재 윈도우의 요청은 **이미 전부 슬라이딩 윈도우 안에 있으므로 그대로 더합니다.** 가중치는 **이전 윈도우에만** 적용합니다. 예를 들어 이전 80회, 현재 30회, 현재 윈도우가 60% 지났다면 올바른 추정치는 `80 × 0.4 + 30 = 62`입니다(`80×0.4 + 30×0.6 = 50`으로 계산하면 과소 추정되어 한도를 넘는 요청을 허용합니다).

**장점**: 정확도와 효율 균형, 키당 카운터 두 개(O(1) 메모리)  
**단점**: 근사값이라 오차가 있음

### 4. Token Bucket

> 일정 속도로 토큰이 채워지고, 요청마다 토큰을 소비

```
버킷 용량: 100       ← 한 번에 허용되는 최대 버스트
토큰 충전: 10/초     ← 지속 가능한 평균 속도
요청 시: 토큰 1개 소비, 없으면 거부
```

- 한도가 **두 개의 값**(평균 속도, 최대 버스트)으로 표현되어 "평소엔 초당 10회, 순간적으로 100회까지"처럼 **쓰지 않던 여유를 모아 두었다가 쓰는** 사용 패턴에 잘 맞습니다.
- 요청이 없던 시간 동안 토큰이 쌓이므로 **오래 쉬었다 오면 버스트가 허용**됩니다.

**장점**: 버스트 허용, 평균 속도 보장, 상태가 작음(토큰 수 + 마지막 갱신 시각)  
**단점**: 버스트 크기를 신중히 정해야 함

### 5. Leaky Bucket

> 요청이 버킷(큐)에 쌓이고, **일정한 속도로만 빠져나가 처리**

- Token Bucket이 "요청을 허용/거부"하는 **검사기**(policing)에 가깝다면, Leaky Bucket은 흐름을 **일정한 속도로 고르게 만드는** 성형기(shaping)에 가깝습니다. 하류 시스템이 일정한 속도로만 받을 수 있을 때(외부 API 호출 제한 등) 맞습니다.
- 버킷이 가득 차면 새 요청을 버립니다.

**장점**: 일정한 출력 속도  
**단점**: 버스트를 흡수하지만 **지연이 늘어남**(큐에서 기다림)

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
  windowMs: 60 * 1000, // 1분 (기본값)
  limit: 100, // 최대 100회 (v7부터 이름이 max → limit, max도 동작)
  message: { error: "Too many requests" },
  standardHeaders: "draft-7", // true는 draft-6과 같고 앞으로 바뀔 수 있음
  legacyHeaders: false, // 기본값 true: X-RateLimit-* 도 같이 전송
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
const generalLimiter = rateLimit({ limit: 100, windowMs: 60000 });

// 로그인 (브루트포스 방지)
const loginLimiter = rateLimit({ limit: 5, windowMs: 60000 });

// 비용 높은 API
const heavyLimiter = rateLimit({ limit: 10, windowMs: 60000 });

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

### 해결: 중앙 저장소 (Redis) — 그리고 원자성

모든 서버가 같은 저장소의 카운터를 쓰게 합니다. 이때 **"읽고, 올리고, 만료를 설정하는" 단계가 하나로 실행**되어야 합니다.

```
❌ 순서가 나뉜 구현: INCR 후 클라이언트가 죽으면 EXPIRE가 실행되지 않음
   → 만료 없는 카운터 키가 남아 그 키는 영원히 제한됨 (Redis 문서가 지적하는 경쟁 조건)

✅ 원자적 구현 (Redis 공식 문서의 Lua 스크립트)
```

```typescript
const INCR_WITH_EXPIRE = `
local current = redis.call("incr", KEYS[1])
if current == 1 then
  redis.call("expire", KEYS[1], ARGV[1])
end
return current`;

// 윈도우(초) 단위 고정 윈도우 카운터
const windowSec = 60;
const key = `rl:${userId}:${Math.floor(Date.now() / 1000 / windowSec)}`;
const count = (await redis.eval(INCR_WITH_EXPIRE, 1, key, windowSec * 2)) as number;
if (count > 100) return res.status(429).end();
```

- 또는 `MULTI`/`EXEC`로 `INCR`와 `EXPIRE`를 묶는 방법이 있습니다(`redis.multi().incr(key).expire(key, ttl).exec()`). Redis 문서가 소개하는 "초 단위 키마다 카운터" 방식이 이 형태입니다.
- Redis 호출 자체가 요청마다 한 번 추가되므로 지연이 늘어납니다. 부하가 큰 API에서는 **앱 인스턴스의 로컬 카운터로 1차 거름 + Redis로 보정**하는 방식도 씁니다(일반 개념).
- 위 정책을 어떻게 할지(fail-open/closed)는 앞의 개념 섹션을 참고합니다.


```typescript
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // 모든 서버가 같은 Redis 사용
  points: 100,
  duration: 60,
});
```

---

## 429 응답 처리 (클라이언트)

`Retry-After`가 **초 단위 정수일 수도 HTTP 날짜일 수도 있고**, 없을 수도 있습니다. 그리고 여러 클라이언트가 같은 시각에 재시도하면 **다시 한꺼번에 몰립니다.** 그래서 **대기 시간 해석 + 무작위 지터(jitter)**를 둡니다.

```typescript
function retryDelayMs(res: Response, attempt: number): number {
  const header = res.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return seconds * 1000;             // "120"
    const date = Date.parse(header);                                  // "Fri, 31 Dec 1999 23:59:59 GMT"
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  // 헤더가 없으면 지수 백오프 (1s, 2s, 4s ...)
  return 1000 * 2 ** attempt;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, attempt = 0): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 429 && retries > 0) {
    const delay = retryDelayMs(response, attempt);
    const jitter = Math.random() * 250;                               // 동시 재시도 분산
    await sleep(delay + jitter);
    return fetchWithRetry(url, options, retries - 1, attempt + 1);
  }

  return response;
}
```

- 서버가 알려 준 `Retry-After`를 **존중**하는 것이 가장 중요합니다. 무시하고 즉시 재시도하면 한도가 더 오래 막힙니다.
- **멱등하지 않은 요청(POST)을 자동 재시도**할 때는 중복 실행에 주의합니다. 429는 서버가 요청을 처리하지 않고 거부한 것이지만, 5xx나 타임아웃은 처리됐는지 알 수 없습니다([API 설계: 멱등성](api-design.md#http-메서드의-의미-안전safe과-멱등idempotent)).

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

- ⚠️ 프록시 사용 시 `X-Forwarded-For` 확인 — 신뢰하는 프록시 수만큼만 해석하고 클라이언트가 보낸 값은 믿지 않음
- ⚠️ 제한 장치 장애 시 동작(fail-open/closed)을 엔드포인트별로 결정
- ⚠️ 제한이 너무 빡빡하면 정상 사용자 불편
- ⚠️ 제한이 너무 느슨하면 의미 없음
- ⚠️ 분산 환경에서는 반드시 중앙 저장소 사용

## 참고 자료

- [Cloudflare: Counting things, a lot of different things](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/) - Sliding Window Counter 공식과 정확도 분석(4억 건, 0.003%)
- [express-rate-limit 설정 레퍼런스](https://express-rate-limit.mintlify.app/reference/configuration) - `limit`(구 `max`), `standardHeaders` 값, `legacyHeaders` 기본값, `ipv6Subnet` 기본 56, `passOnStoreError`
- [IETF draft-ietf-httpapi-ratelimit-headers](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) - `RateLimit`·`RateLimit-Policy` 헤더 드래프트(개정 11, RFC 아님), `X-RateLimit-*`의 상호운용 문제
- [RFC 9110: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) - 초 또는 HTTP 날짜
- [RFC 6585: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html)
- [Redis: INCR (Pattern: Rate limiter)](https://redis.io/docs/latest/commands/incr/) - `INCR`+`EXPIRE` 경쟁 조건, `MULTI`/`EXEC`와 Lua 스크립트 해결책
- ioredis 6.0.0 타입 정의 - `eval`, `multi()...exec()` 시그니처

확인일: 2026-10-22 (Sliding Window Counter 공식과 정확도, express-rate-limit 옵션·기본값, IETF 드래프트 상태, `Retry-After` 형식, Redis 레이트 리미터 패턴. 제한 종류 비교, 계층별 배치, 키 선택의 장단점, fail-open/closed 선택 기준, Token/Leaky Bucket의 policing·shaping 구분, 재시도 지터는 일반 개념·경험칙. Redis가 없어 Lua 스크립트와 클라이언트 재시도 코드는 실행해 검증하지 못함. `rate-limiter-flexible` 라이브러리 사용법과 Node.js 외 구현은 미확인)
