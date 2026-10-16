# Git Cherry-pick

## Cherry-pick이란?

> 특정 커밋만 골라서 현재 브랜치에 적용하는 것

**사용 사례**

- 핫픽스를 여러 브랜치에 적용
- 다른 브랜치의 특정 기능만 가져오기
- 잘못된 브랜치에 커밋한 것 옮기기

```
main:    A---B---C
              \
feature:       D---E---F

# E 커밋만 main에 적용
main:    A---B---C---E'
```

---

## 기본 사용법

### 단일 커밋 cherry-pick

```bash
# 특정 커밋 적용
git cherry-pick <commit-hash>

# 예시
git cherry-pick abc1234
```

### 여러 커밋 cherry-pick

```bash
# 여러 커밋 (개별)
git cherry-pick abc1234 def5678 ghi9012

# 범위 (시작 미포함, 끝 포함)
git cherry-pick abc1234..ghi9012

# 범위 (시작 포함)
git cherry-pick abc1234^..ghi9012
```

### 옵션

```bash
# 커밋하지 않고 스테이징만
git cherry-pick --no-commit <commit>
git cherry-pick -n <commit>

# 커밋 메시지에 원본 정보 추가
git cherry-pick -x <commit>
# 메시지: (cherry picked from commit abc1234...)

# 서명 추가
git cherry-pick -s <commit>
```

---

## 충돌 해결

```bash
# 충돌 발생 시
# 1. 충돌 파일 수정
# 2. 스테이징
git add <file>

# 3. cherry-pick 계속
git cherry-pick --continue

# 또는 취소
git cherry-pick --abort

# 또는 현재 커밋 건너뛰기
git cherry-pick --skip
```

---

## 실전 예시

### 핫픽스 적용

```bash
# main에서 버그 수정 후
git checkout main
git commit -m "fix: critical bug"  # abc1234

# develop에도 적용
git checkout develop
git cherry-pick abc1234

# release 브랜치에도 적용
git checkout release/1.0
git cherry-pick abc1234
```

### 잘못된 브랜치 커밋 옮기기

```bash
# feature-a에 실수로 커밋함 (abc1234)
# feature-b로 옮기고 싶을 때

# 1. feature-b로 이동
git checkout feature-b

# 2. 커밋 가져오기
git cherry-pick abc1234

# 3. feature-a에서 해당 커밋 제거
git checkout feature-a
git reset --hard HEAD~1
```

### 특정 기능만 가져오기

```bash
# feature 브랜치의 특정 커밋들만 main에 적용
git checkout main
git cherry-pick feat123 feat456 feat789
```

---

## 커밋 해시 찾기

```bash
# 브랜치의 커밋 목록
git log feature --oneline

# 특정 파일 변경한 커밋
git log --oneline -- path/to/file

# 특정 메시지 포함 커밋
git log --oneline --grep="bug fix"

# 커밋 상세 내용
git show abc1234
```

---

## cherry-pick vs 다른 방법

| 방법            | 사용 시점            |
| --------------- | -------------------- |
| **cherry-pick** | 특정 커밋만 필요     |
| **merge**       | 브랜치 전체 병합     |
| **rebase**      | 브랜치 베이스 이동   |
| **patch**       | 커밋 없이 변경사항만 |

---

## 🎯 Cherry-pick 체크리스트

### 사용 전

- [ ] 올바른 커밋 해시 확인 (`git log`)
- [ ] 대상 브랜치 checkout
- [ ] 의존성 있는 커밋 확인

### 적용 후

- [ ] 코드 정상 동작 확인
- [ ] 테스트 통과 확인
- [ ] 충돌 없이 적용되었는지 확인

### 팀 협업

- [ ] `-x` 옵션으로 출처 기록
- [ ] 관련 이슈/PR 연결
- [ ] 여러 브랜치 적용 시 동일성 확인

---

## 주의사항

- ⚠️ cherry-pick은 **새로운 커밋**을 만듦 (해시 다름)
- ⚠️ 동일 커밋을 여러 번 cherry-pick하면 충돌 가능
- ⚠️ 의존성 있는 커밋은 순서대로 적용
- ⚠️ 너무 자주 사용하면 히스토리 관리 어려움

---

## 고급: 범위 지정

```bash
# A..B : A 미포함, B 포함
git cherry-pick A..B

# A^..B : A 포함, B 포함 (더 자주 사용)
git cherry-pick A^..B

# 예: abc부터 def까지 (3개 커밋)
#     abc---def---ghi
git cherry-pick abc^..ghi
```

---

## 요약

```bash
# 기본
git cherry-pick <commit>

# 여러 개
git cherry-pick <commit1> <commit2>

# 출처 기록 (권장)
git cherry-pick -x <commit>

# 충돌 시
git cherry-pick --continue  # 또는 --abort
```
