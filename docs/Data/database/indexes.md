# 인덱스와 쿼리 튜닝

> 느린 쿼리를 **측정하고, 실행 계획을 읽고, 인덱스를 설계**하는 방법

[keyset 페이지네이션](../../API/api-design.md#왜-두-가지-방식이-있는가), [View](./view.md), [커넥션 풀](./connection-pool.md)은 모두 "알맞은 인덱스가 있다"는 전제 위에 있습니다. 이 문서는 그 전제를 다룹니다.

---

## 개념: 인덱스는 "정렬된 보조 자료구조"다

인덱스가 없으면 DB는 조건에 맞는 행을 찾으려고 **테이블 전체를 읽습니다**(full scan, O(n)). 인덱스는 특정 컬럼 값을 **정렬해 따로 저장**해 두어서(보통 B-tree), 책의 색인처럼 값으로 위치를 **바로 찾아가게**(O(log n)) 해 줍니다.

20만 행 테이블에서 이메일 한 건을 찾은 결과입니다(SQLite 3.51).

```
인덱스 없음: SCAN users                                         ≈ 9 ms
인덱스 있음: SEARCH users USING COVERING INDEX idx_email (email=?)  ≈ 0 ms (측정 한계 미만)
```

행이 수백만 건이면 차이는 훨씬 커집니다. 그러나 인덱스는 공짜가 아닙니다.

### 비용: 읽기는 빨라지고 쓰기와 공간은 늘어난다

같은 30만 행을 삽입할 때 보조 인덱스 개수만 바꿔 측정했습니다(SQLite, 동기화 끔, 메모리 위주 조건).

| 보조 인덱스 | 삽입 시간 | DB 파일 크기 |
| --- | --- | --- |
| 0개 | 0.31초 | 16.5 MiB |
| 5개 | **1.36초 (약 4.4배)** | **44.5 MiB (약 2.7배)** |

- 인덱스는 `INSERT`/`UPDATE`/`DELETE`마다 **함께 갱신**되어야 합니다. 쓰기가 많은 테이블에 인덱스를 무작정 늘리면 쓰기가 느려집니다.
- 그래서 원칙은 **"쿼리 패턴을 보고, 필요한 인덱스만"** 입니다. 사용되지 않는 인덱스는 비용만 냅니다.
- 위 숫자는 이 조건에서의 상대적인 크기를 보여 줄 뿐입니다. 실제 배율은 DB, 디스크, 컬럼 크기에 따라 다릅니다.

---

## 실행 계획 읽기: 추측하지 말고 확인한다

쿼리가 인덱스를 쓰는지는 **`EXPLAIN`** 으로 확인합니다.

| DB | 명령 | 주요 용어 |
| --- | --- | --- |
| SQLite | `EXPLAIN QUERY PLAN <쿼리>` | `SCAN`(전체 읽기), `SEARCH`(인덱스로 탐색), `COVERING INDEX`, `USE TEMP B-TREE FOR ORDER BY`(별도 정렬) |
| PostgreSQL | `EXPLAIN <쿼리>` / `EXPLAIN ANALYZE <쿼리>` | `Seq Scan`, `Index Scan`, `Bitmap Heap Scan`, `cost`, `rows` |

### PostgreSQL의 `EXPLAIN`

- `cost=시작..전체`는 **임의 단위의 추정 비용**(전통적으로 디스크 페이지 읽기 횟수 기준)이며 시간(ms)과 직접 비교할 수 없습니다. `rows`는 그 노드가 내보낼 것으로 **추정한 행 수**입니다.
- **`EXPLAIN ANALYZE`는 쿼리를 실제로 실행**합니다. 결과는 버리지만 부작용은 그대로 일어납니다. `INSERT`/`UPDATE`/`DELETE`에 쓸 때는 트랜잭션으로 감싸고 롤백합니다.

```sql
BEGIN;
EXPLAIN ANALYZE UPDATE orders SET status = 'done' WHERE id < 100;
ROLLBACK;
```

- 가장 먼저 볼 것은 **추정 행 수와 실제 행 수가 비슷한가**입니다. 크게 다르면 플래너의 통계가 낡았다는 신호이고, `ANALYZE`(통계 갱신)가 첫 조치입니다. 통계는 표본 추출이므로 실행할 때마다 조금 달라질 수 있습니다.
- 스캔 방식은 **데이터 비율**에 따라 달라집니다.

| 스캔 | 언제 유리한가 |
| --- | --- |
| `Seq Scan` | 테이블이 작거나 **대부분의 행이 조건에 맞을 때** |
| `Index Scan` | 조건에 맞는 행이 **소수**일 때 (한 건 조회에 흔함) |
| `Bitmap Heap Scan` | 중간 정도의 비율. 인덱스로 위치를 모아 정렬한 뒤 한 번에 읽음 |

그래서 **인덱스가 있는데도 `Seq Scan`이 나오는 것이 항상 문제는 아닙니다.** `status = 'active'`처럼 거의 모든 행이 맞는 조건은 인덱스가 오히려 손해라서, 플래너가 전체 읽기를 고르는 것이 합리적입니다(선택도가 낮음).

---

## 인덱스를 못 쓰게 만드는 패턴

### 컬럼에 함수나 연산을 씌우기

```sql
-- ❌ lower()를 씌우면 email 인덱스로 탐색할 수 없음
SELECT id FROM users WHERE lower(email) = 'user150000@example.com';
-- 실행 계획: SCAN users USING COVERING INDEX idx_email   (인덱스 "전체"를 훑음, 탐색이 아님)

-- ✅ 같은 표현식으로 인덱스를 만들면 탐색 가능
CREATE INDEX idx_email_lower ON users (lower(email));
-- 실행 계획: SEARCH users USING COVERING INDEX idx_email_lower (<expr>=?)
```

- `SCAN ... USING COVERING INDEX`는 인덱스를 **쓰기는 하지만 처음부터 끝까지 읽는 것**입니다. `SEARCH`와 구별합니다.
- `WHERE created_at + 60 = 1700000120`처럼 컬럼에 연산을 씌워도 마찬가지로 `SCAN`이 됩니다(실행 확인). 연산을 **상수 쪽으로 옮겨** `created_at = 1700000060`으로 씁니다.
- 대소문자를 구분하지 않는 검색이 필요하면 표현식 인덱스(SQLite, PostgreSQL 지원) 또는 컬럼의 정렬 규칙(collation) 설정을 씁니다.

### 그 밖에 주의할 것 (일반 원칙)

- **선행 와일드카드** `LIKE '%abc'`는 B-tree로 시작 위치를 정할 수 없어 전체를 읽는 것이 일반적입니다. 접두사 검색(`LIKE 'abc%'`)과 구분합니다(DB의 `LIKE` 최적화 규칙은 이 문서에서 확인하지 않음, 미확인).
- 컬럼과 비교하는 값의 **타입이 달라** 암묵적 변환이 일어나면 인덱스를 못 쓸 수 있습니다(DB별 규칙은 미확인).
- `OR`로 서로 다른 컬럼을 묶으면 DB에 따라 인덱스 병합(SQLite의 `MULTI-INDEX OR`)을 하기도, 못 하기도 합니다. 계획으로 확인합니다.

---

## 복합 인덱스: 컬럼 순서가 곧 설계다

`(status, created_at)` 인덱스는 **status로 먼저 정렬하고, 같은 status 안에서 created_at으로 정렬**한 목록입니다. 그래서 앞 컬럼부터 좁혀 가는 조건에 강합니다.

PostgreSQL 문서의 규칙은 이렇습니다. **선행 컬럼의 등치(`=`) 조건과, 등치가 없는 첫 컬럼의 부등호(범위) 조건**이 인덱스에서 읽을 구간을 좁힙니다. 그 뒤 컬럼의 조건은 인덱스 안에서 검사되어 테이블 접근은 줄이지만, 읽는 구간을 반드시 줄여 주지는 않습니다.

```sql
CREATE INDEX idx_status_created ON users (status, created_at);

-- ✅ 등치(status) + 범위(created_at): 둘 다 구간을 좁힘 (SEARCH ... status=? AND created_at>?)
SELECT id FROM users WHERE status = 'banned' AND created_at > 1705000000;

-- ✅ 등치 + 정렬 + LIMIT: 인덱스 순서 그대로 읽어서 별도 정렬이 없음
SELECT id FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 20;

-- ⚠️ 정렬 기준이 인덱스에 없으면 정렬 단계가 추가됨 (USE TEMP B-TREE FOR ORDER BY)
SELECT id FROM users WHERE status = 'active' ORDER BY country LIMIT 20;
```

설계 규칙을 정리하면:

1. **등치로 비교하는 컬럼을 앞에**, **범위 비교·정렬 컬럼을 뒤에** 둡니다.
2. 가장 자주 쓰는 쿼리의 `WHERE`와 `ORDER BY`를 인덱스 컬럼 순서와 맞춥니다. 위 예에서 `ORDER BY created_at DESC LIMIT 20`은 정렬 없이 처음 20개만 읽고 끝납니다.
3. 인덱스를 **너무 많은 컬럼**으로 만들지 않습니다. PostgreSQL 문서는 "3개를 넘는 인덱스는 사용 패턴이 매우 정형화된 경우가 아니면 도움이 되기 어렵다"고 합니다.

### 선행 컬럼 없이 뒤 컬럼만 조회하면?

`WHERE created_at > ...`만 있고 `status` 조건이 없을 때의 동작은 DB와 버전에 따라 다릅니다.

| DB | 동작 |
| --- | --- |
| SQLite 3.51 | `ANALYZE` 후 **skip-scan**으로 이 인덱스를 쓰기도 함 (`SEARCH ... (ANY(status) AND created_at>? ...)` 실행 확인). 별도 `created_at` 인덱스가 있으면 그쪽을 선택 |
| PostgreSQL 18 | **skip scan 도입**. 선행 컬럼의 고유 값이 적어 "값마다 한 번씩 찾아도" 더 빠르다고 플래너가 판단할 때 사용 |
| PostgreSQL 17 이하 | 선행 컬럼 제약이 없으면 일반적으로 효율적으로 쓰지 못함 |

**skip scan에 기대어 설계하지 않습니다.** 선행 컬럼의 고유 값이 적을 때만 이득이고 플래너 판단에 달려 있습니다. 자주 쓰는 조건에는 그 조건에 맞는 인덱스를 둡니다.

---

## 커버링 인덱스와 index-only scan

쿼리가 필요로 하는 **모든 컬럼이 인덱스 안에 있으면**, 테이블 본체를 읽지 않고 인덱스만으로 답할 수 있습니다. 위 계획의 `COVERING INDEX`가 그 표시입니다.

PostgreSQL에서는 이를 index-only scan이라 하고, 몇 가지 조건이 붙습니다.

- 인덱스 종류가 지원해야 합니다(B-tree는 항상 지원).
- 쿼리가 **인덱스에 있는 컬럼만** 참조해야 합니다.
- 검색 키는 아니지만 결과에 필요한 컬럼은 `INCLUDE`로 덧붙일 수 있습니다.

```sql
CREATE INDEX orders_user_idx ON orders (user_id) INCLUDE (total);
-- SELECT total FROM orders WHERE user_id = 7  → 테이블 접근 없이 처리 가능
```

- **가시성 맵(visibility map)** 때문에, 최근에 많이 바뀐 테이블에서는 일부 행을 확인하러 테이블을 읽어야 해서 이득이 줄어듭니다. 문서는 테이블 페이지 중 상당수가 "모두 보임(all-visible)" 상태일 때만 이득이라고 설명하고, `VACUUM`이 이 정보를 갱신합니다.
- `INCLUDE` 컬럼은 인덱스를 **키우므로** 보수적으로 추가합니다.

---

## 부분 인덱스: 필요한 행만 색인하기

PostgreSQL은 `WHERE`가 붙은 **부분(partial) 인덱스**를 지원합니다. 전체 행이 아니라 쓸모 있는 일부만 색인해 크기와 쓰기 비용을 줄입니다.

```sql
-- 아직 청구되지 않은 소수의 주문만 색인
CREATE INDEX orders_unbilled_idx ON orders (order_date) WHERE billed = false;

-- 삭제되지 않은 행끼리만 이메일 유일성 보장 (soft delete)
CREATE UNIQUE INDEX users_active_email_idx ON users (email) WHERE deleted_at IS NULL;
```

두 번째가 실무에서 특히 유용합니다. `deleted_at`으로 논리 삭제를 하면서도, **삭제된 계정의 이메일은 재가입에 쓸 수 있게** 하는 유일성 제약입니다. 인덱스 정의에 쓰는 함수와 연산자는 `immutable`이어야 합니다.

---

## 운영 중인 DB에 인덱스를 추가할 때

PostgreSQL의 일반 `CREATE INDEX`는 끝날 때까지 **쓰기를 막습니다**(읽기는 가능). 운영 중 큰 테이블에는 `CONCURRENTLY`를 씁니다.

```sql
CREATE INDEX CONCURRENTLY orders_user_idx ON orders (user_id);
```

| 항목 | `CONCURRENTLY` |
| --- | --- |
| 쓰기 차단 | **하지 않음** |
| 소요 시간 | 테이블을 **두 번 스캔**하고 기존 트랜잭션을 기다려서 **훨씬 오래 걸림** |
| 실패 시 | 쿼리에서는 무시되지만 갱신 비용은 계속 드는 **`INVALID` 인덱스가 남음** → 지우고 다시 만들거나 `REINDEX INDEX CONCURRENTLY` |
| 제약 | **트랜잭션 블록 안에서 실행 불가** (마이그레이션 도구가 트랜잭션으로 감싸면 실패) |

마이그레이션 절차는 [Migration](./migration.md)을 참고합니다.

---

## N+1 문제: 쿼리 하나가 아니라 "쿼리 개수"가 병목일 때

목록 1번 조회 후 각 항목마다 관련 데이터를 조회하면 **1 + N번**의 쿼리가 나갑니다(ORM의 지연 로딩이 흔한 원인).

```javascript
const users = await db.query("SELECT id FROM users");              // 1번
for (const u of users) {
  await db.query("SELECT * FROM orders WHERE user_id = ?", [u.id]); // N번
}
```

사용자 2,000명(주문 각 5건)으로 측정한 결과입니다(Node 24의 `node:sqlite`, 같은 프로세스 안의 메모리 DB).

| 방식 | 쿼리 수 | 시간 |
| --- | --- | --- |
| N+1, `orders.user_id`에 **인덱스 없음** | 2,001 | **587 ms** |
| N+1, `orders.user_id`에 인덱스 | 2,000 | 5 ms |
| 한 번의 `IN` 서브쿼리 | 1 | 4 ms |

- 인덱스 하나로 587ms가 5ms가 됐습니다. **외래 키 컬럼에 인덱스**가 없으면 매 조회가 전체 스캔이 됩니다. PostgreSQL은 외래 키를 선언해도 **참조하는 쪽 컬럼에 인덱스를 자동으로 만들지 않으며**, 참조되는 행을 `DELETE`/`UPDATE`할 때도 그 컬럼을 스캔해야 하므로 보통 직접 만들라고 문서가 설명합니다.
- 인덱스가 있으면 N+1과 한 번의 쿼리가 5ms 대 4ms로 비슷한데, 이것은 **같은 프로세스 안의 DB라서 네트워크 왕복이 없기 때문**입니다. 실제 서비스에서는 쿼리마다 DB 왕복 시간이 붙습니다. 예를 들어 왕복이 1ms라면 2,000번은 그 지연만으로 약 2초입니다(단순 계산). 그래서 **쿼리 개수 자체를 줄이는 것**(조인, `IN`, 배치 로딩, ORM의 즉시 로딩)이 해결책입니다.
- 쿼리 수는 DB 로그나 ORM의 쿼리 로깅으로 확인합니다. 한 요청에서 같은 모양의 쿼리가 반복되면 N+1을 의심합니다.

---

## 튜닝 순서

```
1. 느린 쿼리를 찾는다      (슬로우 쿼리 로그, 요청별 쿼리 수/시간 측정)
2. EXPLAIN으로 계획을 본다  (SCAN/Seq Scan인가? 정렬 단계가 있는가?)
3. 추정 행 수 vs 실제 행 수 (크게 다르면 ANALYZE로 통계 갱신)
4. 원인에 맞게 고친다       (인덱스 추가/컬럼 순서 변경, 함수 제거, 쿼리 수 줄이기)
5. 다시 측정한다            (바꾼 뒤 정말 빨라졌는지, 쓰기 성능은 괜찮은지)
```

추측으로 인덱스를 추가하지 않습니다. **계획과 숫자로 확인**하고, 효과가 없거나 쓰이지 않는 인덱스는 지웁니다.

## 🎯 체크리스트

- [ ] `EXPLAIN`으로 `SCAN`/`Seq Scan`과 별도 정렬 단계를 확인
- [ ] 외래 키(`*_id`) 컬럼에 인덱스
- [ ] `WHERE` 컬럼에 함수·연산을 씌우지 않음 (필요하면 표현식 인덱스)
- [ ] 복합 인덱스는 등치 컬럼 → 범위/정렬 컬럼 순서
- [ ] 목록 API의 `ORDER BY ... LIMIT`가 인덱스 순서를 타는지 확인
- [ ] 운영 중 큰 테이블에는 `CREATE INDEX CONCURRENTLY` (PostgreSQL)
- [ ] 한 요청의 쿼리 수 확인 (N+1)
- [ ] 쓰지 않는 인덱스 정리 (쓰기 비용)

## 참고 자료

- [PostgreSQL: Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) - 등치·범위 조건이 인덱스 구간을 좁히는 규칙, 3개 초과 컬럼 인덱스에 대한 조언, skip scan
- [PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/current/release-18.html) - B-tree skip scan 도입
- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) - `EXPLAIN ANALYZE`는 실제 실행, cost·rows·actual time, 스캔 종류, 통계와 `ANALYZE`
- [PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html) - `CONCURRENTLY`의 동작과 제약, `INCLUDE`, 부분 인덱스
- [PostgreSQL: Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html) - 조건, 가시성 맵, `INCLUDE`
- [PostgreSQL: Constraints (Foreign Keys)](https://www.postgresql.org/docs/current/ddl-constraints.html) - 참조하는 컬럼에 인덱스가 자동 생성되지 않음
- [SQLite: EXPLAIN QUERY PLAN](https://www.sqlite.org/eqp.html)

확인일: 2026-10-23 (PostgreSQL 18 문서에서 확인한 규칙. 인덱스 유무에 따른 `SCAN`/`SEARCH` 전환, 표현식 인덱스, 복합 인덱스 계획, `ORDER BY` 정렬 단계, SQLite의 skip-scan, 삽입 시간·파일 크기 비교(SQLite 3.51.0, 30만 행·동기화 끔), N+1 측정(Node 24.13 `node:sqlite`, 사용자 2,000명)은 직접 실행해 확인. PostgreSQL 서버가 없어 PostgreSQL의 `EXPLAIN` 출력과 `CONCURRENTLY`는 실행하지 못했고 공식 문서로만 확인. 선행 와일드카드 `LIKE`, 암묵적 타입 변환, `OR`와 인덱스, MySQL의 인덱스 동작, SQLite의 `EXPLAIN QUERY PLAN` 상세 문서는 일반 개념이거나 미확인. 왕복 1ms 가정의 2초 계산은 단순 곱셈이며 실측이 아님)
