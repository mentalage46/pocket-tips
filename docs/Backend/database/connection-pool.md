# Connection Pool

## Connection Pool이란?

> 데이터베이스 연결을 미리 생성해두고 재사용하는 기법

**왜 필요한가?**

- DB 연결 생성 비용이 높음 (TCP 핸드셰이크, 인증 등)
- 매 요청마다 연결/해제 → 성능 저하
- 풀에서 미리 만든 연결을 빌려쓰고 반납

```
┌─────────────────────────────────────────┐
│            Connection Pool              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │연결│ │연결│ │연결│ │연결│ │연결│   │
│  └────┘ └────┘ └────┘ └────┘ └────┘   │
└─────────────────────────────────────────┘
     ↑        ↑        ↑
   요청1    요청2    요청3   (빌려서 사용 후 반납)
```

---

## 개념: 풀은 재사용 장치이면서 동시성 제한 장치다

### 연결이 비싼 이유

연결 하나를 만들려면 TCP 핸드셰이크, (TLS), 인증이 필요하고 DB 서버 쪽에도 자원을 잡습니다. PostgreSQL은 **연결마다 전용 백엔드 프로세스를 하나씩 띄우는 "process per user" 모델**이라(공식 문서), 연결이 많으면 프로세스·메모리·컨텍스트 스위칭 비용이 그대로 늘어납니다. 그래서 DB는 동시 연결 수 상한(`max_connections`, 기본값은 보통 100)을 둡니다.

풀은 두 가지 일을 합니다.

1. **재사용**: 만들어 둔 연결을 빌려 쓰고 반납해서 생성 비용을 없앱니다.
2. **동시성 제한**: 풀 크기가 곧 **DB에 동시에 보내는 쿼리 수의 상한**입니다. 풀이 가득 차면 요청은 **대기열에서 기다립니다.** 이 대기가 DB를 보호합니다.

### 풀은 클수록 좋은 것이 아니다

HikariCP 문서는 이렇게 설명합니다. CPU 코어 하나는 한 번에 스레드 하나만 실행하므로, 동시 쿼리를 코어 수보다 훨씬 많이 보내면 시분할로 **오히려 느려집니다.** 문서가 소개하는 Oracle의 시연에서는 연결을 2,048개에서 96개로 줄였더니 응답 시간이 약 100ms에서 약 2ms로 줄었습니다. 결론은 **"작은 풀, 그 풀을 기다리는 스레드가 가득한 상태"**가 이상적이라는 것입니다.

PostgreSQL 프로젝트가 출발점으로 제시하는 식은 다음과 같습니다(HikariCP 문서에서 인용).

```
connections = (core_count × 2) + effective_spindle_count
```

- 이것은 **정답이 아니라 시작점**이며, 부하 테스트로 조정하라고 합니다.
- 코어는 **DB 서버**의 코어를 기준으로 합니다. 앱 서버 하나가 아니라 **모든 앱 인스턴스의 풀 합계**가 이 수에 가까워야 합니다.

### 필요한 연결 수는 계산으로 어림할 수 있다 (Little의 법칙)

```
동시에 쓰는 연결 수 ≈ 초당 요청 수 × 요청 하나가 연결을 잡고 있는 시간(초)
예: 500 req/s × 0.02초(20ms) = 10개
```

이 식에서 풀 크기를 줄이는 방법도 보입니다. **연결을 잡고 있는 시간을 줄이면 같은 풀로 더 많은 요청을 처리합니다.** 풀을 늘리기 전에 확인할 것:

| 연결을 오래 잡는 원인 | 대응 |
| --- | --- |
| 느린 쿼리 | 인덱스, 쿼리 개선 (풀을 키우면 DB만 더 느려짐) |
| **트랜잭션 안에서 외부 API 호출·파일 처리** | 트랜잭션은 짧게. 외부 호출은 트랜잭션 밖에서 |
| 트랜잭션을 열어 둔 채 방치 (`idle in transaction`) | 커밋·롤백 누락 점검, DB의 `idle_in_transaction_session_timeout` 활용 |
| 반납하지 않는 연결(누수) | 아래 "커넥션 누수" 참고 |

### 모든 인스턴스의 풀 합이 DB 한도를 넘지 않아야 한다

풀 크기는 앱 인스턴스 **하나**의 설정이지만, DB가 감당하는 것은 **전체 합계**입니다.

```
(최대 인스턴스 수) × (인스턴스당 풀 크기) + (관리·마이그레이션·모니터링 연결)
                       ≤ max_connections − superuser_reserved_connections
```

| 놓치기 쉬운 항목 | 설명 |
| --- | --- |
| **오토스케일 최대치** | 평소 3대여도 스케일 아웃되면 최대 대수로 계산 |
| **배포 중 겹침** | 롤링 배포에서는 구 버전과 신 버전 인스턴스가 **동시에** 연결을 가짐 |
| 예약 연결 | PostgreSQL은 `superuser_reserved_connections`(기본 3)를 관리자용으로 남김 |
| 마이그레이션·배치·BI 도구 | 앱과 별도로 연결을 씀 |
| 서버리스 | 함수 인스턴스마다 풀을 갖기 때문에 인스턴스 수가 급증하면 연결 폭증 → 외부 풀러 필요 |

> 아래 "권장 계산 공식"의 `max_connections / (인스턴스 수 + 여유분)`은 이 합계 조건을 간략히 표현한 것입니다. 위 항목을 모두 반영해서 계산합니다.

---

## 주요 설정값

| 설정                  | 설명                | 일반적인 기본값 |
| --------------------- | ------------------- | --------------- |
| **minPoolSize**       | 최소 연결 수        | 5~10            |
| **maxPoolSize**       | 최대 연결 수        | 10~50           |
| **connectionTimeout** | 연결 대기 시간      | 30초            |
| **idleTimeout**       | 유휴 연결 유지 시간 | 10분            |
| **maxLifetime**       | 연결 최대 수명      | 30분            |

### 라이브러리별 실제 기본값

위 표는 일반적인 범위이고, 실제 기본값은 라이브러리마다 다릅니다. 확인한 값입니다.

| 설정 | HikariCP | node-postgres (`pg`) |
| --- | --- | --- |
| 최대 크기 | `maximumPoolSize` **10** | `max` **10** |
| 최소/유휴 | `minimumIdle` 기본값은 **`maximumPoolSize`와 같음** (고정 크기 풀) | `min` **0** |
| 연결 대기 제한 | `connectionTimeout` **30초** | `connectionTimeoutMillis` **0 (무제한 대기)** |
| 유휴 연결 정리 | `idleTimeout` 10분 (`minimumIdle` < `maximumPoolSize`일 때만 의미 있음) | `idleTimeoutMillis` **10초** |
| 최대 수명 | `maxLifetime` 30분 | `maxLifetimeSeconds` 비활성(0) |
| 누수 감지 | `leakDetectionThreshold` 0 (꺼짐, 켜려면 2000ms 이상) | 없음 |

- **`pg`의 `connectionTimeoutMillis` 기본값이 0(무제한)입니다.** 풀이 고갈되면 요청이 **오류 없이 영원히 대기**할 수 있으므로 반드시 값을 지정합니다.
- HikariCP 문서는 `minimumIdle`을 따로 설정하지 말고 **고정 크기 풀**로 쓰기를 권하고(트래픽 급증에 더 빨리 반응), `maxLifetime`을 DB나 인프라(로드밸런서, 프록시)가 정한 **연결 시간 제한보다 몇 초 짧게** 두라고 합니다. 중간 장비가 조용히 끊은 연결을 풀이 계속 쓰는 문제를 막기 위해서입니다.

---

## Pool Size 조정 방법

### 1. 애플리케이션 설정

```typescript
// TypeORM
{
  type: 'postgres',
  extra: {
    max: 20,           // maxPoolSize
    min: 5,            // minPoolSize
    idleTimeoutMillis: 30000,
  }
}

// Prisma 6 이하 (schema.prisma): URL 파라미터
datasource db {
  url = "postgresql://...?connection_limit=20&pool_timeout=30"
}

// Prisma 7: 드라이버 어댑터의 풀 설정 (pg 드라이버 옵션)
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 20,                        // v6의 connection_limit에 해당 (기본 10)
  connectionTimeoutMillis: 5_000, // 기본 0(무제한)이므로 지정
  idleTimeoutMillis: 300_000,     // v6 기본 300초에 맞추려면 지정 (v7 기본 10초)
});
```

```java
// HikariCP (Spring)
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
```

### 2. DB 서버 설정

```sql
-- PostgreSQL: 전체 최대 연결 수
SHOW max_connections;  -- 기본 100
ALTER SYSTEM SET max_connections = 200;

-- MySQL
SHOW VARIABLES LIKE 'max_connections';
SET GLOBAL max_connections = 200;
```

### 3. 권장 계산 공식

```
애플리케이션 Pool Size = DB max_connections / (서버 인스턴스 수 + 여유분)

예: max_connections=100, 서버 3대
→ 각 서버 Pool Size = 100 / (3 + 1) = 25
```

---

## Pool Size 적정값 가이드

### CPU 코어 기반 공식 (HikariCP 권장)

```
pool size = (core_count * 2) + effective_spindle_count

예: 4코어, SSD → (4 * 2) + 1 = 9~10
```

> 💡 **핵심**: 커넥션 풀은 **많다고 좋은 게 아님**  
> 너무 많으면 → Context Switching 오버헤드, DB 부하 증가

### 규모별 권장값

| 규모               | Pool Size | 비고                        |
| ------------------ | --------- | --------------------------- |
| 소규모 (단일 서버) | 10~20     |                             |
| 중규모 (2~5 서버)  | 15~30     | DB max_connections 체크     |
| 대규모 (10+ 서버)  | 10~20     | 커넥션 풀러(PgBouncer) 고려 |

---

## 🎯 Pool Size 조정 체크리스트

### Pool 늘려야 하는 상황

- [ ] "Connection pool exhausted" 에러 발생
- [ ] 요청 대기 시간(connection timeout) 증가
- [ ] 동시 요청 수가 현재 pool size 초과
- [ ] 트래픽 급증 예상 (이벤트, 프로모션)
- [ ] 장시간 실행 쿼리가 커넥션 점유

### Pool 늘리기 전에 확인할 것

- [ ] DB `max_connections` 여유 있는가?
- [ ] (서버 수 × pool size) < DB max_connections 인가?
- [ ] 느린 쿼리가 커넥션 점유하고 있진 않은가?
- [ ] 트랜잭션이 제대로 커밋/롤백되고 있는가?
- [ ] 커넥션 누수(leak)는 없는가?

### Pool 줄여야 하는 상황

- [ ] DB CPU/메모리 과부하
- [ ] 대부분 커넥션이 idle 상태
- [ ] 서버 인스턴스 수가 증가했음

---

## 문제 진단

### 커넥션 부족 증상

```
- "Cannot acquire connection from pool"
- "Connection pool exhausted"
- 요청 타임아웃 증가
- 특정 시간대 응답 지연
```

### 확인 방법

```sql
-- PostgreSQL: 현재 연결 수
SELECT count(*) FROM pg_stat_activity;

-- 상태별 연결 수
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- MySQL: 현재 연결 수
SHOW STATUS LIKE 'Threads_connected';
```

### 커넥션 누수 의심 시

**반드시 반납해야 합니다.** node-postgres 문서는 클라이언트를 다 쓰면 `release`하지 않으면 풀이 고갈되고 이후 `pool.connect` 호출이 **타임아웃되거나 멈춘다**고 경고합니다. 또한 **트랜잭션에는 `pool.query`를 쓰지 않습니다.** `pool.query`는 문장마다 다른 클라이언트로 보낼 수 있지만 PostgreSQL 트랜잭션은 **한 연결 안에서** 이뤄져야 하므로, `pool.connect()`로 클라이언트 하나를 받아 트랜잭션 전체를 그 클라이언트로 실행하고 `release`합니다. HikariCP는 `leakDetectionThreshold`를 켜면 지정 시간 이상 반납되지 않는 연결을 로그로 알려 줍니다.


```typescript
// 트랜잭션 반드시 finally로 정리
try {
  await connection.beginTransaction();
  // 작업
  await connection.commit();
} catch (e) {
  await connection.rollback();
} finally {
  connection.release(); // 반드시!
}
```

---

## 대규모 트래픽 대응

### Connection Pooler 사용

> 애플리케이션 풀 → Pooler → DB

```
┌─────────┐     ┌───────────┐     ┌────┐
│ App 1   │────▶│           │     │    │
├─────────┤     │ PgBouncer │────▶│ DB │
│ App 2   │────▶│ (Pooler)  │     │    │
├─────────┤     │           │     │    │
│ App 3   │────▶│           │     └────┘
└─────────┘     └───────────┘
```

### PgBouncer의 풀링 모드

| 모드 | 서버 연결을 잡는 시간 | 특징 |
| --- | --- | --- |
| **Session** | 클라이언트가 접속해 있는 내내 | 모든 PostgreSQL 기능 사용 가능. 연결 절약 효과는 작음 |
| **Transaction** | **트랜잭션이 진행되는 동안만** | 연결 절약 효과가 큼. 일부 기능 사용 불가 |
| **Statement** | 쿼리 한 문장 | 가장 공격적. 여러 문장 트랜잭션 불가(autocommit 강제) |

**Transaction 모드에서 쓸 수 없는 기능**(PgBouncer 문서): `SET`/`RESET`(세션 설정), `LISTEN`, `WITH HOLD` 커서, `PREPARE`/`DEALLOCATE`(SQL 명령), 세션 수준 advisory lock 등. 연결이 요청마다 바뀔 수 있어서 "같은 세션 상태"가 이어지지 않기 때문입니다. 프로토콜 수준 prepared statement는 `max_prepared_statements` 설정이 0이 아니면 사용할 수 있습니다.

- 앱 쪽 풀과 풀러를 함께 쓸 때는 **앱 풀을 작게** 두고 풀러가 DB 연결을 모읍니다. 앱 풀을 크게 두면 풀러의 의미가 줄어듭니다.
- ORM이 내부에서 세션 상태나 prepared statement를 쓰는지 확인하고, Transaction 모드를 쓸 때 해당 옵션을 맞춥니다.

**대표 도구**

- PostgreSQL: **PgBouncer**, Pgpool-II
- MySQL: **ProxySQL**, MySQL Router

**장점**

- 수백 개 앱 연결 → 수십 개 DB 연결로 줄임
- DB 부하 감소
- 서버 스케일 아웃 용이

---

## 요약

```
Pool Size 결정 흐름:
1. 기본값으로 시작 (10~20)
2. 모니터링 (연결 대기, 타임아웃, idle 비율)
3. 병목 원인 분석 (쿼리? 누수? 실제 부족?)
4. 조정 (DB max_connections 범위 내에서)
5. 대규모 시 → Pooler 도입 검토
```

## 참고 자료

- [PostgreSQL: Connection Establishment](https://www.postgresql.org/docs/current/connect-estab.html) - "process per user" 모델, 연결마다 백엔드 프로세스 생성
- [PostgreSQL: Connection Settings](https://www.postgresql.org/docs/current/runtime-config-connection.html) - `max_connections` 기본 약 100, `superuser_reserved_connections` 기본 3
- [HikariCP README](https://github.com/brettwooldridge/HikariCP) - 설정 기본값, `minimumIdle` 권고, `maxLifetime` 권고, `leakDetectionThreshold`
- [HikariCP: About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing) - 풀 크기 공식(시작점), Oracle 시연, 작은 풀 원칙
- [node-postgres: Pool](https://node-postgres.com/apis/pool) - 옵션 기본값, 클라이언트 `release`, 트랜잭션에는 `pool.query` 금지
- [PgBouncer: Features](https://www.pgbouncer.org/features.html) - 풀링 모드, Transaction 모드의 제한 기능
- [Prisma ORM v7: Connection pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool) - v6 `connection_limit` ↔ v7 어댑터 `max`, 기본값

확인일: 2026-10-22 (PostgreSQL 연결 모델·기본값, HikariCP·node-postgres·Prisma 7 기본값과 권고, PgBouncer 모드와 제한 기능. Little의 법칙 계산은 일반 공식이며, 배포 중 연결 겹침·서버리스 연결 폭증·`idle in transaction` 대응은 일반 개념·경험칙. TypeORM `extra` 옵션, MySQL·ProxySQL·Pgpool-II 내용, `idle_in_transaction_session_timeout` 기본값은 미확인. 실제 DB가 없어 풀 동작을 실행해 검증하지는 못함)
