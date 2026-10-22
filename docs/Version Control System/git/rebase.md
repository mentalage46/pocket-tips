# Git Rebase

## Rebase란?

> 브랜치의 베이스(시작점)를 다른 커밋으로 옮기는 것

**Merge vs Rebase**

```
# Merge: 병합 커밋 생성
main:    A---B---C---M
              \     /
feature:       D---E

# Rebase: 히스토리를 직선으로
main:    A---B---C
                  \
feature:           D'---E'
```

---

## 개념: Rebase는 커밋을 "옮기는" 것이 아니라 "다시 만드는" 것

### 커밋은 불변이다

Git의 커밋은 **내용(스냅샷) + 부모 커밋 + 작성자·시각 + 메시지**를 해시한 값으로 식별됩니다. 부모가 하나라도 달라지면 해시가 달라지므로, 커밋을 "수정"하거나 "옮기는" 일은 불가능하고 **같은 변경을 가진 새 커밋을 만들 수 있을 뿐**입니다.

Rebase는 내 브랜치의 커밋들이 만든 변경(diff)을 **새 베이스 위에 하나씩 다시 적용**해 새 커밋을 만드는 작업입니다. 실제로 실행한 결과입니다(Git 2.52).

```
# rebase 전                          # rebase 후 (feature를 main 위로)
* 4b3026c E  (feature)               * 56ef38f E   ← 해시가 달라짐
* fec49a4 D                          * 10d2ef8 D   ← 해시가 달라짐
| * 03160d8 C  (main)                * 03160d8 C  (main)
|/                                   * c058332 B
* c058332 B                          * e5304ae A
* e5304ae A
```

```bash
git range-diff main...<이전 feature> main...feature
1:  fec49a4 = 1:  10d2ef8 D     # = : 내용(패치)이 같은 커밋
2:  4b3026c = 2:  56ef38f E
```

- 변경 내용은 같지만 **부모가 `B`에서 `C`로 바뀌어 해시가 다릅니다.** `git range-diff`는 두 버전의 커밋을 짝지어 `=`(동일 패치)나 `!`(달라짐)로 보여 줍니다.
- 옛 커밋은 **지워지지 않고 아무 브랜치도 가리키지 않게 될 뿐**입니다. 그래서 되돌릴 수 있습니다(아래 "안전망").

### 왜 공유한 브랜치를 rebase하면 안 되는가

`E`를 이미 팀원이 받아 그 위에 `F`를 커밋했다고 합시다. 내가 `E`를 `E'`로 다시 만들어 force push하면 원격에는 `E'`만 있고, 팀원의 `F`는 **옛 `E`의 자식**입니다. 팀원이 pull하면 `E`와 `E'`가 둘 다 히스토리에 나타나 **같은 변경이 중복되고 충돌**이 납니다. 규칙은 단순합니다: **다른 사람이 근거로 삼았을 수 있는 커밋은 다시 만들지 않는다.**

### 충돌은 커밋마다, 그리고 "ours/theirs"가 뒤바뀐다

Merge는 양쪽 끝점을 한 번에 합치므로 충돌을 한 번에 풀지만, rebase는 **커밋을 순서대로 하나씩 재적용**하므로 **같은 줄을 건드린 커밋이 여러 개면 충돌도 여러 번** 납니다. 반복되는 충돌 해결은 `rerere`(해결 방법을 기록해 같은 충돌에 자동 재사용)로 줄일 수 있습니다(`rerere.enabled`).

더 헷갈리는 점은 **`ours`와 `theirs`가 merge와 반대**라는 것입니다. 같은 충돌을 merge와 rebase로 각각 만든 결과입니다.

| | `ours` (`git checkout --ours`, stage 2) | `theirs` (stage 3) |
| --- | --- | --- |
| **merge** (feature에서 `git merge main`) | 내 브랜치(feature) = `line=FEATURE` | 합치려는 쪽(main) = `line=MAIN` |
| **rebase** (feature에서 `git rebase main`) | **upstream(main) 쪽** = `line=MAIN` | **재적용 중인 내 커밋** = `line=FEATURE` |

- Git 문서도 같은 설명입니다: rebase에서 `ours`는 `<upstream>`부터 이미 재적용된 커밋들이고 `theirs`는 작업 브랜치이므로 "양쪽이 뒤바뀐다".
- 충돌 마커의 `<<<<<<< HEAD`는 rebase 중에는 **upstream 쪽**이고, `>>>>>>> <해시> (커밋 메시지)`는 **지금 재적용하는 내 커밋**입니다.
- 그래서 rebase 중 "내 변경을 우선"하려면 `--theirs`를 선택해야 합니다.

### Merge와 Rebase는 "이력에 무엇을 남기는가"가 다르다

| | Merge | Rebase |
| --- | --- | --- |
| 이력이 말하는 것 | **실제로 일어난 일**(언제 갈라졌고 합쳐졌는지) | **정리된 이야기**(처음부터 최신 위에서 만든 것처럼) |
| 장점 | 원본 보존, 안전 | 직선 이력, `git log`·`bisect`가 읽기 쉬움 |
| 비용 | 병합 커밋이 쌓임 | 해시가 바뀜, 충돌이 반복될 수 있음, 공유 브랜치에서 위험 |

둘 중 정답은 없고 **팀의 규칙**입니다. 로컬 작업 브랜치는 rebase로 정리하고, 공유 브랜치로 들어갈 때는 팀이 정한 방식(merge commit, squash, rebase merge)을 따릅니다.

### 안전망: rebase는 되돌릴 수 있다

위 실험에서 rebase 직후 `ORIG_HEAD`는 옛 `feature` 끝(`4b3026c`)을 가리켰고, `git reflog`에 rebase의 모든 단계가 남았습니다.

```bash
git reset --hard ORIG_HEAD     # rebase 직전으로 복구 (실험에서 원래 이력으로 돌아옴)
```

- `ORIG_HEAD`는 위험한 작업 직전의 위치를 담는 참조이고, 다른 명령이 덮어쓸 수 있으므로 **바로** 씁니다. 시간이 지나면 `git reflog`에서 `HEAD@{n}`을 찾습니다.
- reflog 항목은 기본적으로 **90일**(현재 팁에서 도달 가능한 항목) 뒤, 도달 불가능한 항목은 **30일** 뒤 정리됩니다(`gc.reflogExpire`, `gc.reflogExpireUnreachable` 기본값).
- 불안하면 시작 전에 `git branch backup/feature`로 이름표를 하나 붙여 둡니다.

### force push의 안전장치: `--force-with-lease`와 그 구멍

`--force`는 원격이 어떤 상태든 덮어씁니다. `--force-with-lease`는 **"원격 브랜치가 내가 마지막으로 본 값 그대로일 때만" 덮어씁니다.** Git 문서는 이를 ref에 대한 "임대(lease)"로 설명합니다.

실제로 확인한 동작입니다. 팀원이 같은 브랜치에 커밋을 push한 상황에서 내가 `commit --amend` 후 push했습니다.

| 단계 | 결과 |
| --- | --- |
| 내가 fetch하지 않은 상태에서 `--force-with-lease` | `! [rejected] (stale info)` → **거부됨**. 의도대로 동작 |
| **그 사이 `git fetch`가 실행된 뒤** `--force-with-lease` | `+ ... (forced update)` → **통과, 팀원의 커밋이 사라짐** (원격이 내 amend 커밋 하나만 남음) |
| fetch 후 `--force-with-lease --force-if-includes` | `! [rejected] (remote ref updated since checkout)` → **거부됨** |

- 구멍의 원인: `--force-with-lease`는 **로컬의 원격 추적 브랜치**(`origin/feature`)와 비교합니다. `git fetch`(IDE·도구의 자동 fetch 포함)가 이 값을 최신으로 갱신하면, 내가 팀원의 커밋을 **보지도 통합하지도 않았는데** 비교가 통과합니다.
- `--force-if-includes`는 원격 추적 브랜치의 끝이 **내 로컬 브랜치의 reflog에서 도달 가능한지**(= 내가 통합했는지) 확인해 이 구멍을 막습니다. 두 옵션을 함께 씁니다.

```bash
git push --force-with-lease --force-if-includes
```

### 편의 옵션

| 옵션 | 효과 |
| --- | --- |
| `git commit --fixup=<커밋>` + `git rebase -i --autosquash` | 제목이 `fixup! ...`인 커밋을 **대상 커밋 바로 뒤로 옮기고 `fixup`으로 바꿔** 줌. 리뷰 반영 커밋을 정리할 때 편리 |
| `--update-refs` (`rebase.updateRefs`) | rebase되는 커밋을 가리키던 **다른 브랜치도 자동으로 강제 갱신**. 브랜치를 겹쳐 쌓는(stacked) 작업에 유용. 워크트리에 체크아웃된 브랜치는 제외 |
| `-r`, `--rebase-merges` | 병합 커밋을 평탄화하지 않고 **구조를 유지**한 채 재적용 |
| `git pull --rebase` | `fetch` 후 merge 대신 rebase |

---

## 기본 사용법

### 브랜치 rebase

```bash
# feature 브랜치에서
git checkout feature

# main의 최신 커밋 위로 rebase
git rebase main

# 또는 한 줄로
git rebase main feature
```

### rebase 후 push

```bash
# 이미 push한 브랜치는 force push 필요 (아래 "force push의 안전장치" 참고)
git push --force-with-lease --force-if-includes

# 또는 (주의: 더 위험)
git push -f
```

---

## Interactive Rebase (강력한 기능)

```bash
# 최근 N개 커밋 수정
git rebase -i HEAD~3

# 특정 커밋부터
git rebase -i <commit-hash>
```

### 에디터에서 선택

```
pick abc1234 첫 번째 커밋
pick def5678 두 번째 커밋
pick ghi9012 세 번째 커밋

# 명령어:
# p, pick   = 커밋 사용
# r, reword = 커밋 메시지 수정
# e, edit   = 커밋 수정
# s, squash = 이전 커밋에 합치기 (메시지 유지)
# f, fixup  = squash와 동일 (메시지 버림)
# d, drop   = 커밋 삭제
# 순서 변경 = 커밋 순서 변경
```

### 자주 쓰는 패턴

#### 커밋 합치기 (squash)

```
# 변경 전
pick abc1234 feat: 기능 추가
pick def5678 fix: 오타 수정
pick ghi9012 fix: 버그 수정

# 변경 후 (하나로 합침)
pick abc1234 feat: 기능 추가
squash def5678 fix: 오타 수정
squash ghi9012 fix: 버그 수정
```

#### 커밋 메시지 수정

```
# 변경 전
pick abc1234 오타있는 메시지

# 변경 후
reword abc1234 오타있는 메시지
```

#### 커밋 순서 변경

```
# 변경 전
pick abc1234 세 번째 작업
pick def5678 첫 번째 작업
pick ghi9012 두 번째 작업

# 변경 후 (순서 변경)
pick def5678 첫 번째 작업
pick ghi9012 두 번째 작업
pick abc1234 세 번째 작업
```

---

## Rebase 충돌 해결

```bash
# 충돌 발생 시
# 1. 충돌 파일 수정
# 2. 스테이징
git add <file>

# 3. rebase 계속
git rebase --continue

# 또는 현재 커밋 건너뛰기
git rebase --skip

# 또는 rebase 취소
git rebase --abort
```

---

## 실전 워크플로우

### PR 전 커밋 정리

```bash
# 1. main 최신화
git checkout main
git pull

# 2. feature 브랜치에서 rebase
git checkout feature
git rebase main

# 3. 커밋 정리 (선택)
git rebase -i HEAD~5

# 4. force push
git push --force-with-lease --force-if-includes
```

### main에서 최신 코드 가져오기

```bash
# feature 브랜치에서
git fetch origin
git rebase origin/main

# 충돌 해결 후
git push --force-with-lease --force-if-includes
```

---

## Rebase vs Merge

| 항목          | Rebase      | Merge            |
| ------------- | ----------- | ---------------- |
| **히스토리**  | 직선 (깔끔) | 분기/병합 (복잡) |
| **커밋 해시** | 변경됨      | 유지됨           |
| **충돌 해결** | 각 커밋마다 | 한 번에          |
| **협업**      | 주의 필요   | 안전             |
| **원본 보존** | ❌          | ✅               |

### 언제 사용?

```
Rebase:
- 로컬 브랜치 정리
- PR 전 커밋 정리
- 히스토리 깔끔하게 유지

Merge:
- 공유된 브랜치 (main, develop)
- 원본 히스토리 보존 필요
- 안전이 중요한 경우
```

---

## 🎯 Rebase 체크리스트

### 사용 전

- [ ] 이미 push한 브랜치인가? (주의 필요)
- [ ] 다른 사람과 공유 중인가? (사용 금지)
- [ ] 백업 필요한가? (브랜치 복사)

### Interactive Rebase

- [ ] 목적 명확 (squash, reword, edit)
- [ ] 충돌 대비
- [ ] `--abort`로 복구 가능 인지

### Push

- [ ] `--force-with-lease --force-if-includes` 사용 (force보다 안전, 자동 fetch가 있어도 보호)
- [ ] 팀원에게 알림 (공유 브랜치인 경우)

---

## 주의사항

- ⚠️ **공유된 브랜치에서 rebase 금지** (main, develop)
- ⚠️ rebase는 커밋 해시를 변경함 → force push 필요
- ⚠️ `--force` 대신 `--force-with-lease --force-if-includes` 사용
- ⚠️ rebase 중 `ours`/`theirs`는 merge와 반대 (`ours` = upstream, `theirs` = 내 커밋)
- ⚠️ 잘못되면 `git reflog`로 복구 가능

```bash
# 복구 방법
git reset --hard ORIG_HEAD    # 방금 한 rebase 직전으로
# 시간이 지났다면
git reflog
git reset --hard HEAD@{n}
```

---

## 요약

```
로컬 작업:
feature에서 작업 → rebase -i로 정리 → main rebase → PR

Golden Rule:
"공유된 브랜치는 rebase 하지 않는다"
```

## 참고 자료

- [git-rebase](https://git-scm.com/docs/git-rebase) - `ours`/`theirs` 반전, `--autosquash`, `--update-refs`, `--rebase-merges`
- [git-push](https://git-scm.com/docs/git-push) - `--force-with-lease`, `--force-if-includes`
- [git-config](https://git-scm.com/docs/git-config) - `gc.reflogExpire`(90일), `gc.reflogExpireUnreachable`(30일), `rerere.enabled`

확인일: 2026-10-22 (위 문서들은 Git 2.52.0 설치본의 매뉴얼(`git help`)로 확인. 해시 변화, `range-diff`, `ORIG_HEAD` 복구, `ours`/`theirs` 반전, `--force-with-lease`의 stale 거부와 fetch 뒤 통과, `--force-if-includes` 거부는 임시 저장소에서 Git 2.52.0으로 직접 실행해 확인. 공유 브랜치 rebase 시 중복 커밋 시나리오, merge와 rebase의 이력 비교는 일반 개념. `--force-if-includes`가 도입된 Git 버전은 미확인)
