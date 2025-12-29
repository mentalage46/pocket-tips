# Database Migration

## Migration이란?

> 데이터베이스 스키마 변경을 버전 관리하는 방식

**코드처럼 DB 스키마도 버전 관리!**

```
v1: users 테이블 생성
 ↓
v2: users에 email 컬럼 추가
 ↓
v3: orders 테이블 생성
 ↓
v4: users에 인덱스 추가
```

---

## 왜 Migration으로 버전 관리하는가?

### 1. 변경 이력 추적

```
migrations/
├── 20240101_create_users.sql
├── 20240115_add_email_to_users.sql
├── 20240201_create_orders.sql
└── 20240215_add_index_to_users.sql
```

- 언제, 어떤 변경이 있었는지 **히스토리** 확인
- Git과 함께 **코드 리뷰** 가능
- 문제 발생 시 **원인 파악** 용이

### 2. 환경 간 일관성

```
개발 DB ──┐
스테이징 DB ──┼── 동일한 Migration 적용 ──▶ 동일한 스키마
운영 DB ──┘
```

- 모든 환경에서 **같은 스키마** 보장
- "내 로컬에서는 됐는데..." 문제 방지
- 새 환경 구축 시 **순차 적용**으로 재현

### 3. 협업 충돌 방지

```
개발자 A: v5_add_profile_table.sql
개발자 B: v6_add_settings_table.sql
         ↓
    순차적 적용으로 충돌 없이 머지
```

- 여러 개발자가 동시에 스키마 변경 가능
- 적용 순서 명확
- 변경 사항 **코드 리뷰** 가능

### 4. 롤백 가능

```sql
-- Up (적용)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down (롤백)
ALTER TABLE users DROP COLUMN phone;
```

- 문제 발생 시 **되돌리기** 가능
- 배포 실패 시 빠른 복구

---

## Migration 활용 방법

### 1. CI/CD 파이프라인 연동

```yaml
# GitHub Actions 예시
deploy:
  steps:
    - name: Run migrations
      run: npm run migrate:prod
    - name: Deploy application
      run: npm run deploy
```

**활용**

- 배포 전 자동 마이그레이션
- 실패 시 배포 중단
- 마이그레이션 상태 로깅

### 2. 환경별 시드 데이터

```
migrations/     # 스키마 변경
seeds/          # 초기 데이터
├── dev/        # 개발용 테스트 데이터
├── staging/    # QA용 데이터
└── prod/       # 운영 필수 데이터 (코드값 등)
```

**활용**

- 개발 환경 빠른 세팅
- 테스트 데이터 일관성
- 필수 마스터 데이터 관리

### 3. 스키마 문서 자동화

```bash
# 현재 스키마 SQL 추출
pg_dump --schema-only mydb > schema.sql

# ERD 자동 생성 (도구 활용)
npx prisma generate  # Prisma ERD
```

**활용**

- 최신 스키마 문서 유지
- 신규 팀원 온보딩
- 아키텍처 리뷰

### 4. 데이터베이스 복제/복구

```bash
# 새 환경에 스키마 적용
npm run migrate:run

# 특정 버전까지만 적용
npm run migrate:to -- 20240201

# 마지막 N개 롤백
npm run migrate:rollback -- --step=3
```

**활용**

- 새 환경/서버 빠른 구축
- 재해 복구 시 스키마 복원
- 특정 시점 스키마로 테스트

### 5. 변경 영향도 분석

```sql
-- Migration 파일에서 테이블/컬럼 변경 추적
-- 어떤 기능에 영향을 미치는지 분석

-- 예: users.email 컬럼 변경
-- → 관련 API, 인덱스, 외래키 확인 가능
```

**활용**

- 스키마 변경 전 영향도 파악
- 레거시 테이블 의존성 분석
- 리팩토링 계획 수립

### 6. 감사(Audit) 로그

```sql
-- 마이그레이션 테이블 예시
SELECT * FROM migrations;

| version      | applied_at          | execution_time |
|--------------|---------------------|----------------|
| 20240101_001 | 2024-01-01 10:00:00 | 120ms          |
| 20240115_002 | 2024-01-15 14:30:00 | 85ms           |
```

**활용**

- 언제 어떤 변경이 적용되었는지 기록
- 성능 문제 시 최근 변경 확인
- 컴플라이언스/감사 요구사항 충족

---

## 주요 도구별 명령어

| 도구          | 생성                         | 적용                    | 롤백                    |
| ------------- | ---------------------------- | ----------------------- | ----------------------- |
| **Prisma**    | `prisma migrate dev`         | `prisma migrate deploy` | (수동)                  |
| **TypeORM**   | `typeorm migration:create`   | `typeorm migration:run` | `migration:revert`      |
| **Sequelize** | `sequelize migration:create` | `sequelize db:migrate`  | `db:migrate:undo`       |
| **Knex**      | `knex migrate:make`          | `knex migrate:latest`   | `knex migrate:rollback` |
| **Flyway**    | 파일 생성                    | `flyway migrate`        | (수동)                  |

---

## 🎯 Migration 작성 체크리스트

### 작성 시

- [ ] 변경 내용을 명확히 설명하는 파일명
- [ ] Up(적용)과 Down(롤백) 모두 작성
- [ ] 대용량 테이블 변경 시 성능 고려
- [ ] 외래키/인덱스 변경 시 순서 주의

### 적용 전

- [ ] 로컬에서 먼저 테스트
- [ ] 스테이징 환경에서 검증
- [ ] 롤백 스크립트 동작 확인
- [ ] 데이터 손실 가능성 체크

### 운영 적용

- [ ] 트래픽 낮은 시간대 선택
- [ ] 백업 확인
- [ ] 팀 공유 및 모니터링 준비
- [ ] 롤백 계획 수립

---

## 주의사항

- ⚠️ **운영 DB 직접 수정 금지** → 반드시 Migration 통해서
- ⚠️ **이미 적용된 Migration 수정 금지** → 새 Migration 생성
- ⚠️ **대용량 테이블** 변경 시 락 주의 (온라인 DDL 고려)
- ⚠️ **데이터 이관**은 별도 스크립트로 분리 권장

```
❌ 잘못된 예: 운영 DB에서 ALTER TABLE 직접 실행
✅ 올바른 예: Migration 파일 작성 → PR → 코드 리뷰 → 배포
```
