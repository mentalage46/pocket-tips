# Database View

## View란?

> 저장된 쿼리(SELECT)를 가상 테이블처럼 사용하는 데이터베이스 객체

**특징**

- 실제 데이터를 저장하지 않음 (쿼리 결과만 제공)
- 테이블처럼 SELECT 가능
- 복잡한 쿼리를 단순화

---

## 개념: View는 "저장된 쿼리"이지 "저장된 결과"가 아니다

### 일반 View는 쿼리를 펼쳐서 실행한다

일반 View는 데이터를 갖지 않습니다. View를 참조하는 쿼리가 들어오면 DB가 **View의 정의 쿼리를 서브쿼리로 치환**한 뒤 전체를 한 번에 최적화합니다. PostgreSQL은 이를 쿼리 재작성(rewrite) 단계의 규칙으로 구현하며, 공식 문서는 View를 "`ON SELECT DO INSTEAD` 규칙이 걸린 빈 테이블"로 설명합니다.

```sql
SELECT * FROM order_details WHERE status = 'pending';
-- 내부적으로는 아래와 비슷하게 펼쳐진 뒤 하나의 쿼리로 계획됨
SELECT ... FROM (
  SELECT o.id, o.status, u.name, p.name, p.price
  FROM orders o JOIN users u ON ... JOIN products p ON ...
) order_details
WHERE status = 'pending';
```

이 사실에서 나오는 결론은 다음과 같습니다.

| 결론 | 이유 |
| --- | --- |
| **일반 View는 성능을 높이지 않는다** | 쿼리를 대신 짧게 써 줄 뿐, 매번 정의 쿼리를 실행한다. 느린 쿼리는 View로 감싸도 느리다 |
| **View도 전체 최적화 대상이다** | 플래너가 서브쿼리를 끌어올려(pull-up) 직접 쓴 쿼리처럼 계획하므로, 바깥 `WHERE` 조건이 안쪽으로 반영될 수 있다 |
| **View 위의 View는 계속 펼쳐진다** | 중첩이 깊으면 실제 쿼리가 예상보다 훨씬 커진다. 읽기 쉽다고 비용이 싼 것이 아니다 |
| **View는 항상 최신** | 저장된 결과가 없으므로 원본 테이블의 현재 상태를 그대로 본다 |

> 다른 DB에서는 최적화 방식이 다를 수 있습니다(위는 PostgreSQL 기준).

### 정의 시점에 고정되는 것

- **`SELECT *`는 만든 시점의 컬럼으로 펼쳐집니다.** 나중에 테이블에 컬럼을 추가해도 View에는 나타나지 않습니다(PostgreSQL 공식 문서). View에는 `*` 대신 컬럼을 명시하는 편이 의도가 분명합니다.
- **`CREATE OR REPLACE VIEW`는 컬럼을 줄이거나 순서·이름·타입을 바꿀 수 없고, 끝에 컬럼을 추가하는 것만 허용됩니다**(PostgreSQL). 그 외 변경은 `DROP` 후 다시 만들어야 하고, 이 View에 의존하는 다른 객체도 영향을 받습니다. View는 **코드의 API처럼 하위 호환을 고려**해서 바꿉니다.

### 보안 용도로 쓸 때 반드시 알아야 할 것

"민감 컬럼을 뺀 View만 열어 주고 원본 테이블은 막는다"는 흔한 패턴입니다. 이때 **누구의 권한으로 원본 테이블을 읽는가**가 핵심입니다.

| 설정 | 원본 테이블 접근 권한 |
| --- | --- |
| 기본 (PostgreSQL) | **View 소유자**의 권한 |
| `WITH (security_invoker = true)` (PostgreSQL 15+) | **View를 조회하는 사용자**의 권한 (행 수준 보안 정책도 호출자 기준) |
| `WITH (security_barrier = true)` | 행 수준 보안을 위한 View. 조건 함수 등이 View의 필터보다 먼저 실행되어 **보이지 말아야 할 행을 새게 하는 일**을 막음 |

- 기본 설정에서는 View 소유자가 원본에 접근할 수 있으면 조회자는 원본 권한이 없어도 View를 읽을 수 있습니다. 이것이 "원본 접근 차단 + View만 허용" 패턴이 동작하는 이유이며, 동시에 **소유자 권한이 과하면 View가 우회로가 된다**는 뜻입니다.
- View는 **접근 제어의 보조 수단**입니다. 컬럼 숨기기만으로 보안을 끝냈다고 보지 말고, 권한(`GRANT`)과 행 수준 보안을 함께 설계합니다.
- 보안 옵션과 기본값은 DB마다 다릅니다. MySQL 등은 이 문서에서 확인하지 않았습니다(미확인).

### 수정 가능한 View (Updatable View)

PostgreSQL은 아래를 **모두** 만족하는 단순한 View를 자동으로 수정 가능하게 합니다.

- `FROM`에 테이블(또는 수정 가능한 View)이 **정확히 하나**
- 최상위에 `WITH`, `DISTINCT`, `GROUP BY`, `HAVING`, `LIMIT`, `OFFSET`, 집합 연산(`UNION` 등)이 없음
- 선택 목록에 집계 함수, 윈도 함수, 집합 반환 함수가 없음

조건을 만족하지 못하는 View는 읽기 전용이며, `INSTEAD OF` 트리거로 쓰기를 직접 구현할 수 있습니다. View에서 쓰기를 허용할 때는 `WITH CHECK OPTION`을 붙여 **View의 조건에 맞지 않는 행이 들어가거나 수정되는 것**을 막습니다.

---

## Materialized View의 본질: 쿼리 결과의 스냅샷

Materialized View는 **쿼리 결과를 테이블처럼 저장**합니다. 읽을 때는 저장된 결과를 읽으므로 빠르고 인덱스를 걸 수 있지만, **원본이 바뀌어도 스스로 갱신되지 않습니다.** 갱신은 `REFRESH`로 직접 해야 합니다.

- `REFRESH MATERIALIZED VIEW`는 내용을 **통째로 다시 만들어 교체**합니다(증분 갱신이 아님). 원본이 크면 갱신 자체가 무거운 작업입니다.
- 기본 갱신은 자원을 덜 쓰고 빠르지만 **View를 읽는 연결을 막을 수 있습니다.**
- `CONCURRENTLY`는 읽기를 막지 않고 갱신합니다. 단, **모든 행을 포함하는 UNIQUE 인덱스(컬럼만 사용, 표현식·`WHERE` 없음)가 필요**하고, 이미 데이터가 채워져 있어야 하며, 한 MV에 동시에 하나의 REFRESH만 실행됩니다.
- 따라서 "언제, 누가 갱신하는가"(스케줄러, 배치, 이벤트)를 함께 설계해야 합니다. 갱신이 멈추면 **조용히 낡은 데이터**를 보여 줍니다.

```sql
CREATE UNIQUE INDEX monthly_stats_month_idx ON monthly_stats (month);
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_stats;
```

> Materialized View는 PostgreSQL, Oracle 등에서 제공하는 기능이며 표준 SQL의 일부가 아닙니다. 지원하지 않는 DB에서는 **집계 결과를 담는 요약 테이블을 직접 만들고 배치로 갱신**하는 방식으로 같은 일을 합니다(일반 개념, DB별 지원 여부는 미확인).

---

## 기본 문법

```sql
-- View 생성
CREATE VIEW active_users AS
SELECT id, name, email, created_at
FROM users
WHERE status = 'active';

-- View 사용
SELECT * FROM active_users WHERE created_at > '2024-01-01';

-- View 수정
CREATE OR REPLACE VIEW active_users AS
SELECT id, name, email, created_at, role
FROM users
WHERE status = 'active';

-- View 삭제
DROP VIEW active_users;
```

---

## View 종류

| 종류                  | 설명                    | 특징             |
| --------------------- | ----------------------- | ---------------- |
| **일반 View**         | 쿼리 저장, 실행 시 계산 | 항상 최신 데이터 |
| **Materialized View** | 결과를 물리적으로 저장  | 빠름, 갱신 필요  |

### Materialized View

```sql
-- PostgreSQL 예시
CREATE MATERIALIZED VIEW monthly_stats AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total
FROM orders
GROUP BY 1;

-- 데이터 갱신
REFRESH MATERIALIZED VIEW monthly_stats;

-- 동시 접근 허용 갱신
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_stats;
```

---

## 주요 활용 사례

### 1. 복잡한 JOIN 단순화

```sql
-- 복잡한 쿼리를 View로
CREATE VIEW order_details AS
SELECT
  o.id, o.status,
  u.name as customer_name,
  p.name as product_name,
  p.price
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id;

-- 사용 시 간단
SELECT * FROM order_details WHERE status = 'pending';
```

### 2. 보안 (컬럼 제한)

```sql
-- 민감정보 제외
CREATE VIEW public_users AS
SELECT id, name, profile_image
FROM users;
-- password, email 등 노출 안됨
```

### 3. 권한 분리

```sql
-- 특정 View만 접근 허용
GRANT SELECT ON public_users TO analyst_role;
-- 원본 테이블 접근 차단
```

### 4. 레거시 호환

```sql
-- 테이블 구조 변경 시 기존 코드 호환
CREATE VIEW old_table_name AS
SELECT new_col1 as old_col1, new_col2 as old_col2
FROM new_table_name;
```

---

## 🎯 View 도입 체크리스트

### 일반 View 사용

- [ ] 복잡한 JOIN이 여러 곳에서 반복됨
- [ ] 특정 컬럼만 노출해야 함 (보안)
- [ ] 쿼리 가독성 개선 필요
- [ ] 권한을 세분화해야 함
- [ ] 레거시 코드와 호환 유지 필요

### Materialized View 사용

- [ ] 집계/통계 쿼리가 느림
- [ ] 실시간성보다 **성능**이 중요
- [ ] 데이터 변경 빈도가 낮음
- [ ] 대시보드/리포트용 데이터
- [ ] 주기적 갱신이 허용됨

### View 사용 주의

- [ ] UPDATE/INSERT 필요? → 제약 많음
- [ ] 실시간 데이터 필수? → 일반 View (성능 주의)
- [ ] 인덱스 필요? → Materialized View만 가능

---

## View vs Materialized View

| 비교            | View           | Materialized View |
| --------------- | -------------- | ----------------- |
| **데이터 저장** | ❌             | ✅ 물리적 저장    |
| **성능**        | 매번 쿼리 실행 | 빠름 (캐시됨)     |
| **실시간성**    | ✅ 항상 최신   | ❌ 갱신 필요      |
| **인덱스**      | ❌             | ✅ 가능           |
| **저장 공간**   | 없음           | 필요              |
| **갱신**        | 불필요         | REFRESH 필요      |

---

## 주의사항

- ⚠️ View 안의 View (중첩) → 성능 저하 가능
- ⚠️ 복잡한 View → 쿼리 플랜 최적화 어려움
- ⚠️ Updatable View 조건 까다로움 (단일 테이블, 집계 없음 등)
- ⚠️ Materialized View 갱신 시 락 주의 (`CONCURRENTLY` 옵션 활용)

---

## 빠른 선택 가이드

```
목적?
├── 쿼리 단순화/보안 → 일반 View
├── 성능 개선 (집계/통계)
│   ├── 실시간 필요 → 캐시 레이어 (Redis 등)
│   └── 주기적 갱신 OK → Materialized View
└── 인덱싱 필요 → Materialized View
```

## 참고 자료

- [PostgreSQL: CREATE VIEW](https://www.postgresql.org/docs/current/sql-createview.html) - `OR REPLACE` 제약, `security_invoker`·`security_barrier`, 소유자 권한 기본값, 자동 수정 가능 조건, `WITH CHECK OPTION`, `SELECT *` 확장 시점
- [PostgreSQL: Views and the Rule System](https://www.postgresql.org/docs/current/rules-views.html) - View는 쿼리 재작성으로 서브쿼리로 치환, 플래너가 전체를 함께 최적화
- [PostgreSQL: REFRESH MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html) - 전체 교체, 읽기 차단 가능성, `CONCURRENTLY` 요건(UNIQUE 인덱스 등)

확인일: 2026-10-22 (PostgreSQL 18 문서 기준 동작. `security_invoker`의 도입 버전 15는 공식 페이지에 명시되지 않아 일반 지식으로 적음, 미확인. MySQL 등 다른 DB의 View·보안·Materialized View 지원은 미확인이며 PostgreSQL 서버가 없어 예시 SQL을 실행해 검증하지는 못함)
