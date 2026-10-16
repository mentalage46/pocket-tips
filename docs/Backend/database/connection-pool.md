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

## 주요 설정값

| 설정                  | 설명                | 일반적인 기본값 |
| --------------------- | ------------------- | --------------- |
| **minPoolSize**       | 최소 연결 수        | 5~10            |
| **maxPoolSize**       | 최대 연결 수        | 10~50           |
| **connectionTimeout** | 연결 대기 시간      | 30초            |
| **idleTimeout**       | 유휴 연결 유지 시간 | 10분            |
| **maxLifetime**       | 연결 최대 수명      | 30분            |

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

// Prisma (schema.prisma)
datasource db {
  url = "postgresql://...?connection_limit=20&pool_timeout=30"
}
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
