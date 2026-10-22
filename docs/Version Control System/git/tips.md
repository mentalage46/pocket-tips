# Git 생산성 향상 팁

> 실무에서 자주 사용하는 필수 Git 명령어 10가지

---

## 먼저: 어떤 명령이 "기록을 바꾸고" 어떤 명령이 "작업물을 지우는가"

이 문서의 명령은 위험도가 서로 다릅니다. 실행 전에 어느 쪽인지 구분하면 사고를 줄일 수 있습니다.

| 종류 | 명령 | 되돌릴 수 있는가 |
| --- | --- | --- |
| **읽기 전용** | `reflog`, `worktree list`, `bisect`(탐색), `bundle`/`archive`(생성) | 영향 없음 |
| **커밋 기록을 새로 만듦**(옛 커밋은 남음) | `rebase -i`, `commit --amend`, `reset --soft/--mixed` | **가능** — 옛 커밋은 reflog에 남음([rebase 안전망](./rebase.md#안전망-rebase는-되돌릴-수-있다)) |
| **작업 디렉터리를 덮어씀** | `reset --hard`, `checkout .` | 커밋하지 않은 변경은 **복구 불가** |
| **추적되지 않는 파일을 삭제** | `clean -f` | **복구 불가** (Git이 기록하지 않은 파일) |

핵심은 **Git이 알고 있는 것(커밋된 것)은 대부분 되돌릴 수 있고, Git이 모르는 것(추적되지 않거나 커밋하지 않은 변경)은 되돌릴 수 없다**는 점입니다.

---

## 1. git rebase -i: 커밋 내역 정리

커밋을 합치고, 순서를 변경하고, 메시지를 수정할 수 있음

```bash
# 최근 3개 커밋 정리
git rebase -i HEAD~3
```

**주요 옵션**
| 명령 | 설명 |
|------|------|
| `pick` | 커밋 유지 |
| `reword` | 커밋 메시지 수정 |
| `squash` | 이전 커밋에 합치기 (메시지 유지) |
| `fixup` | 이전 커밋에 합치기 (메시지 버림) |
| `drop` | 커밋 삭제 |

> 💡 **팁**: 개인 브랜치 정리에 `rebase`, 공개 브랜치 병합에 `merge` 사용 권장

---

## 2. git reflog: HEAD 이동 추적

모든 HEAD 이동 이력을 확인하여 잃어버린 커밋 복구

```bash
# HEAD 이동 히스토리 확인
git reflog

# 이전 상태로 복구
git reset --hard HEAD@{n}
```

> rebase나 reset으로 브랜치에서 떨어져 나간 커밋도 **reflog에 남아 있는 동안** 복구할 수 있습니다. reflog 항목은 기본적으로 **90일**, 현재 브랜치 끝에서 도달할 수 없는 항목은 **30일** 뒤 정리됩니다(`gc.reflogExpire`, `gc.reflogExpireUnreachable`).
> reflog는 **내 로컬 저장소에만** 있습니다. 다른 사람의 저장소나 원격에는 없습니다.

---

## 3. git worktree: 브랜치 전환 없이 동시 작업

별도 디렉토리에서 다른 브랜치 작업 가능 (stash 불필요)

```bash
# worktree 생성
git worktree add -b hotfix/bug ../hotfix-work main

# worktree 목록 확인
git worktree list

# worktree 삭제
git worktree remove ../hotfix-work

# 사용하지 않는 worktree 정리
git worktree prune
```

**사용 사례**

- 긴급 핫픽스 작업
- 여러 기능 동시 개발
- 코드 리뷰하면서 본 작업 유지

**동작 원리와 제약**

- worktree는 **같은 `.git`(객체 저장소)을 공유하는 여러 작업 디렉터리**입니다. 저장소를 다시 클론하는 것보다 디스크를 덜 쓰고 브랜치·커밋을 즉시 공유합니다.
- **한 브랜치는 한 worktree에서만 체크아웃**할 수 있습니다. 같은 브랜치로 두 번째 worktree를 만들면 `fatal: 'hotfix' is already used by worktree at ...`로 거부됩니다.
- 변경이 있는 worktree는 `git worktree remove`가 거부하며 `--force`가 필요합니다(`contains modified or untracked files`). 디렉터리를 `rm -rf`로 지웠다면 `git worktree prune`으로 남은 등록 정보를 정리합니다.

---

## 4. git bisect: 버그 커밋 자동 탐색

이진 탐색으로 버그가 발생한 커밋을 빠르게 찾기

```bash
# bisect 시작
git bisect start

# 나쁜 커밋 (버그 있음)
git bisect bad HEAD

# 좋은 커밋 (버그 없음)
git bisect good abc1234

# Git이 중간 커밋으로 이동 → 테스트 후 good/bad 반복

# 종료 (HEAD 복원)
git bisect reset
```

### 자동화 (테스트 스크립트 사용)

```bash
git bisect start
git bisect bad HEAD
git bisect good abc1234
git bisect run ./test.sh  # 스크립트 결과로 자동 판단
git bisect reset
```

> **테스트 스크립트의 종료 코드** (Git 매뉴얼): `0` = 좋음(old), `1`~`127`(125 제외) = 나쁨(new), **`125` = 이 커밋은 테스트할 수 없음(건너뜀)**. 그 밖의 코드는 bisect를 **중단**시킵니다. 빌드가 깨지는 커밋을 만나면 `exit 125`로 건너뛰게 합니다.
> 8개 커밋(c1~c8)에서 c5부터 `bug.txt`가 생기게 만들고 `git bisect run`을 실행하니 `c5`를 "first bad commit"으로 찾았습니다. n개 커밋 중 이진 탐색이므로 약 log₂(n)번만 테스트합니다.

---

## 5. git format-patch & git am: 패치 파일 생성/적용

이메일 기반 코드 리뷰나 오프라인 공유에 사용

```bash
# 패치 파일 생성 (최근 3개 커밋)
git format-patch HEAD~3 -o ./patches

# 패치 적용
git am ./patches/*.patch

# 또는 단일 파일
git am ./patches/0001-fix-bug.patch
```

---

## 6. git bundle: 저장소 전체 백업

네트워크 없이 저장소 공유 또는 백업

```bash
# 번들 파일 생성
git bundle create repo.bundle --all  # 모든 브랜치와 태그 (백업에는 이쪽)
git bundle create repo.bundle HEAD   # HEAD 하나만 (아래 주의)

# 번들에서 복원
git clone repo.bundle new-repo

# 기존 저장소에서 fetch
git fetch repo.bundle main:main
```

---

## 7. git archive: 소스 코드 압축 배포

.git 디렉토리 없이 소스만 압축

```bash
# ZIP 파일로 압축
git archive --format=zip --output=release.zip HEAD

# 특정 태그
git archive --format=zip --output=v1.0.zip v1.0.0

# tar.gz
git archive --format=tar.gz --output=release.tar.gz HEAD
```

> **`HEAD`만 담은 번들을 clone하면 브랜치가 없는 detached HEAD 상태**가 됩니다(커밋 8개는 모두 받았지만 `* (no branch)`). 브랜치까지 복원하려면 `--all`로 만든 번들을 씁니다(실행해서 확인).

**bundle vs archive**
| | git bundle | git archive |
|------|------------|-------------|
| .git 포함 | ✅ | ❌ |
| clone/fetch 가능 | ✅ | ❌ |
| 용도 | 저장소 백업 | 배포용 압축 |

---

## 8. git commit --amend: 마지막 커밋 수정

```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "새로운 메시지"

# 파일 추가 후 마지막 커밋에 포함
git add forgotten-file.js
git commit --amend --no-edit  # 메시지 유지

# 작성자 변경
git commit --amend --author="Name <email@example.com>"
```

> `--amend`는 마지막 커밋을 고치는 것이 아니라 **새 커밋으로 교체**합니다(해시가 `aaa2add` → `47ac404`처럼 바뀜). **이미 push한 커밋**을 amend하면 force push가 필요하고, 다른 사람이 그 커밋을 받았다면 [공유 브랜치 rebase와 같은 문제](./rebase.md#왜-공유한-브랜치를-rebase하면-안-되는가)가 생깁니다.

---

## 9. git clean: 추적되지 않는 파일 삭제

```bash
# 삭제될 파일 미리보기 (dry-run)
git clean -n

# 파일만 삭제
git clean -f

# 파일 + 디렉토리 삭제
git clean -fd

# .gitignore 파일도 포함해서 삭제
git clean -fdx

# 인터랙티브 모드
git clean -i
```

**옵션**
| 옵션 | 설명 |
|------|------|
| `-n` | 미리보기 (삭제 안함) |
| `-f` | 강제 삭제 (`clean.requireForce`가 켜져 있으면 `-f` 없이는 거부됨) |
| `-d` | 디렉토리 포함 (없으면 추적되지 않는 **디렉터리는 대상에서 제외**) |
| `-x` | `.gitignore` 규칙을 무시하고 **무시된 파일까지** 삭제 |
| `-i` | 대화형 모드 |

> **`-x`는 위험합니다.** `.gitignore`에 들어 있는 파일은 보통 **`.env` 같은 로컬 설정과 비밀, 의존성(`node_modules`), 빌드 결과**입니다. 임시 저장소에서 `.env`가 `git clean -fd`에서는 남았지만 `git clean -fdx`에서는 **삭제**됐습니다. 항상 `-n`으로 먼저 확인합니다.

---

## 10. 유용한 조합 & 팁

### 실수 복구 패턴

```bash
# 마지막 커밋 취소 (변경사항 유지)
git reset --soft HEAD~1

# rebase/merge 잘못했을 때
git reflog
git reset --hard HEAD@{n}
```

### 커밋 정리 후 push

```bash
git rebase -i HEAD~5
git push --force-with-lease --force-if-includes
```

### 빠른 stash

```bash
git stash push -m "작업중"
git stash pop
```

> `git stash`는 **추적 중인 파일의 변경만** 보관합니다. 새로 만든(추적되지 않는) 파일은 작업 디렉터리에 그대로 남습니다(실행해서 확인). 함께 보관하려면 `-u`(`--include-untracked`)를 씁니다.

### reset 모드 비교

| 모드 | 커밋(HEAD) | 인덱스(스테이징) | 작업 디렉터리 |
| --- | --- | --- | --- |
| `--soft` | 이동 | 유지 | 유지 |
| `--mixed` (기본) | 이동 | 되돌림 | 유지 |
| `--hard` | 이동 | 되돌림 | **되돌림(커밋하지 않은 변경 삭제)** |

`reset --soft HEAD~1`을 실행하자 마지막 커밋이 취소되고 그 변경은 **스테이징된 상태로 남았습니다**(`A .gitignore`).

---

## 🎯 Quick Reference

| 상황                  | 명령어                 |
| --------------------- | ---------------------- |
| 커밋 정리             | `git rebase -i HEAD~N` |
| 잃어버린 커밋 찾기    | `git reflog`           |
| 동시 작업             | `git worktree add`     |
| 버그 커밋 찾기        | `git bisect`           |
| 마지막 커밋 수정      | `git commit --amend`   |
| 추적 안되는 파일 삭제 | `git clean -fd`        |
| 소스 압축 배포        | `git archive`          |
| 저장소 백업           | `git bundle`           |

---

## 참고 자료

- [git-bisect](https://git-scm.com/docs/git-bisect) - `bisect run`의 종료 코드(0 좋음, 1~127 나쁨, 125 건너뜀)
- [git-worktree](https://git-scm.com/docs/git-worktree) - 제거 시 `--force`, `prune`
- [git-clean](https://git-scm.com/docs/git-clean) - `-x`는 무시 규칙을 쓰지 않고 모든 추적되지 않는 파일을 삭제
- [git-config](https://git-scm.com/docs/git-config) - `gc.reflogExpire`(90일), `gc.reflogExpireUnreachable`(30일)
- [Git 공식 문서](https://git-scm.com/doc), [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials)

확인일: 2026-10-22 (Git 2.52.0 설치본의 매뉴얼로 `bisect run` 종료 코드·`clean -x`·reflog 만료 기본값 확인. `clean`의 `-f` 요구와 `-x`의 `.env` 삭제, `stash`가 추적되지 않는 파일을 남기는 것, worktree의 같은 브랜치 중복 거부와 변경 시 제거 거부, `bisect run`의 `c5` 탐색, `HEAD`만 담은 번들 clone의 detached HEAD, `--all` 번들의 브랜치 복원, `--amend`의 해시 변화, `reset --soft` 결과, `git archive --format=tar.gz`는 임시 저장소에서 직접 실행해 확인. 위험도 분류 표는 일반 개념. `format-patch`/`am`과 stash의 다른 옵션은 미확인)
