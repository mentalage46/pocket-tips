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

## 개념: cherry-pick은 "커밋"이 아니라 "그 커밋이 만든 변경"을 복사한다

### 무엇이 복사되는가

커밋 `X`는 부모 대비 **변경(diff)** 을 가집니다. `git cherry-pick X`는 그 변경을 **현재 브랜치 끝 위에 새 커밋으로 다시 적용**합니다. 브랜치나 앞뒤 커밋은 가져오지 않습니다.

- 새 커밋의 **부모가 다르므로 해시가 다릅니다.** 실행해 보면 원본 `b99e714`가 `9a3f671`이 됩니다. 원본과 사본은 Git에게 **서로 무관한 커밋**입니다([rebase](rebase.md#개념-rebase는-커밋을-옮기는-것이-아니라-다시-만드는-것)의 원리와 같습니다).
- 커밋이 가진 변경만 가져오므로, 그 커밋이 **앞선 커밋이 만든 코드에 의존**하면 대상 브랜치에서 충돌하거나 컴파일이 깨집니다. "필요한 커밋만 골랐다"가 아니라 "그 변경이 단독으로 성립하는가"를 확인해야 합니다.

### 사본과 원본이 같은 변경이라는 걸 Git이 아는 방법

Git은 변경 내용으로 만든 **patch-id**로 "같은 패치"를 알아봅니다. 실제 결과입니다.

```bash
git cherry main feature
- b99e714...   # '-' : main에 같은 패치가 이미 있음 (cherry-pick된 fix: B)
+ 5774834...   # '+' : main에 아직 없음 (feat: C)
```

- 나중에 `feature`를 `main`에 merge해도 **같은 변경이 이미 들어 있으면 충돌 없이** 합쳐집니다. 대신 이력에는 **같은 변경의 커밋이 두 개**(원본 `b99e714`와 사본 `9a3f671`) 나란히 남습니다.
- 중복이 이상하다면 이것이 cherry-pick의 정상 결과입니다. 이력을 한 줄로 만들고 싶다면 cherry-pick 대신 merge나 rebase를 쓰는 것이 맞는 상황입니다.

### `-x`는 언제 쓰는가

`-x`는 메시지 끝에 `(cherry picked from commit ...)`을 붙입니다.

- Git 문서는 **비공개(개인) 브랜치에서 가져올 때는 쓰지 말라**고 합니다. 받는 사람에게는 쓸모없는 정보이기 때문입니다.
- **공개된 두 브랜치 사이**(예: 개발 브랜치의 수정을 이전 릴리스 유지보수 브랜치로 백포트)에서는 출처 추적에 유용합니다.
- 주의: 이 줄은 **충돌 없이 적용된 cherry-pick에만** 붙습니다. 충돌을 직접 해결한 경우에는 붙지 않으므로, 출처가 필요하면 커밋 메시지에 직접 적습니다.

### 병합 커밋은 어느 부모 기준인지 알려 줘야 한다

병합 커밋은 부모가 둘이라 "어느 쪽 대비 변경"인지 모호합니다. 그대로 cherry-pick하면 거부됩니다.

```bash
git cherry-pick <merge-commit>
error: <해시> 커밋은 병합이지만 -m 옵션이 주어지지 않았습니다.

git cherry-pick -m 1 <merge-commit>   # 첫 번째 부모(보통 병합받은 브랜치)를 기준으로 한 변경을 적용
```

### 범위를 줄 때 시작 커밋이 포함되는가

`A..B`는 **A를 제외**하고 B까지입니다. 실제로 `a-b-c-d`에서 `main~2..main`(b..d)을 cherry-pick하면 `c`와 `d`만 적용됩니다. `b`까지 포함하려면 `b^..d`를 씁니다.

### 언제 cherry-pick이 맞고 언제 아닌가

| 상황 | 선택 | 이유 |
| --- | --- | --- |
| 핫픽스를 여러 릴리스 브랜치에 **백포트** | cherry-pick | 브랜치 전체가 아니라 그 수정만 필요 |
| 엉뚱한 브랜치에 한 커밋 옮기기 | cherry-pick + 원래 브랜치에서 제거 | 단발성 이동 |
| 브랜치의 대부분을 가져옴 | **merge/rebase** | 하나씩 고르면 누락·중복·이력 분기가 생김 |
| 같은 브랜치끼리 계속 주고받음 | **merge** | 반복 cherry-pick은 같은 변경이 이력에 계속 중복됨 |

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

- ⚠️ cherry-pick은 **새로운 커밋**을 만듦 (해시 다름). 원본과 사본은 Git에게 무관한 커밋이며 `git cherry`로 동등 여부를 확인
- ⚠️ 동일 커밋을 여러 번 cherry-pick하면 충돌 가능
- ⚠️ 의존성 있는 커밋은 순서대로 적용
- ⚠️ 병합 커밋은 `-m <부모번호>` 필요
- ⚠️ `-x` 줄은 충돌 없이 적용된 경우에만 붙음
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

# 출처 기록 (공개 브랜치 사이에서 권장)
git cherry-pick -x <commit>

# 충돌 시
git cherry-pick --continue  # 또는 --abort
```

## 참고 자료

- [git-cherry-pick](https://git-scm.com/docs/git-cherry-pick) - `-x`(비공개 브랜치에서는 쓰지 말 것, 충돌 없는 경우에만 기록), 범위 지정
- [git-cherry](https://git-scm.com/docs/git-cherry) - patch 동등성 비교

확인일: 2026-10-22 (`-x` 규칙은 Git 2.52.0 매뉴얼로 확인. 해시 변화, `git cherry`의 `-`/`+`, cherry-pick 후 merge 시 충돌 없음과 중복 커밋, 병합 커밋의 `-m` 요구, `A..B`가 A를 제외하는 동작은 임시 저장소에서 Git 2.52.0으로 직접 실행해 확인. patch-id 내부 방식, 의존 커밋 문제, 상황별 선택 표는 일반 개념. `git cherry` 매뉴얼은 직접 읽지 않음, 미확인)
