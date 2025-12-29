# Database View

## View란?

> 저장된 쿼리(SELECT)를 가상 테이블처럼 사용하는 데이터베이스 객체

**특징**

- 실제 데이터를 저장하지 않음 (쿼리 결과만 제공)
- 테이블처럼 SELECT 가능
- 복잡한 쿼리를 단순화

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
