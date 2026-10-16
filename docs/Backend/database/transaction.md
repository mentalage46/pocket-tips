# Transaction

## 트랜잭션이란?

> 하나의 작업 단위로 처리되어야 하는 연산들의 집합

**ACID 특성**

- **A**tomicity (원자성) - 전부 성공 or 전부 실패
- **C**onsistency (일관성) - 트랜잭션 전후 데이터 무결성 유지
- **I**solation (격리성) - 동시 실행 트랜잭션 간 간섭 방지
- **D**urability (지속성) - 완료된 트랜잭션은 영구 반영

---

## Isolation Level 비교

| Level            | Dirty Read | Non-Repeatable Read | Phantom Read |  성능   |
| ---------------- | :--------: | :-----------------: | :----------: | :-----: |
| READ UNCOMMITTED |  ⚠️ 가능   |       ⚠️ 가능       |   ⚠️ 가능    | 🚀 최고 |
| READ COMMITTED   |  ✅ 방지   |       ⚠️ 가능       |   ⚠️ 가능    | 🚀 높음 |
| REPEATABLE READ  |  ✅ 방지   |       ✅ 방지       |   ⚠️ 가능    |  보통   |
| SERIALIZABLE     |  ✅ 방지   |       ✅ 방지       |   ✅ 방지    | 🐢 낮음 |

### 문제 유형 설명

- **Dirty Read**: 커밋 안된 데이터를 읽음
- **Non-Repeatable Read**: 같은 쿼리가 다른 결과 반환
- **Phantom Read**: 같은 조건인데 행 개수가 달라짐

---

## 🎯 Isolation Level 선택 체크리스트

### READ UNCOMMITTED 선택

- [ ] 대략적인 통계/집계만 필요
- [ ] 데이터 정확도보다 속도가 우선
- [ ] 실시간 모니터링 대시보드

### READ COMMITTED 선택 ⭐ (대부분의 기본값)

- [ ] 일반적인 CRUD 작업
- [ ] 읽기 위주의 서비스
- [ ] 동일 트랜잭션 내 재조회 없음

### REPEATABLE READ 선택

- [ ] 같은 데이터를 여러 번 읽어야 함
- [ ] 읽은 값 기반으로 계산/비교 수행
- [ ] 보고서 생성, 정산 처리

### SERIALIZABLE 선택

- [ ] 금융 거래, 재고 차감
- [ ] 절대적 데이터 정합성 필요
- [ ] 동시성보다 정확성이 우선
- [ ] 트랜잭션 충돌 시 재시도 구현됨

---

## 빠른 선택 가이드

```
일반 웹 서비스 → READ COMMITTED
├── 통계/로그 조회 → READ UNCOMMITTED
├── 보고서/정산 → REPEATABLE READ
└── 결제/재고/송금 → SERIALIZABLE
```

## 주의사항

- DBMS마다 기본값이 다름 (MySQL: REPEATABLE READ, PostgreSQL: READ COMMITTED)
- 높은 격리 수준 = 데드락 가능성 ↑
- SERIALIZABLE은 반드시 **재시도 로직** 구현
