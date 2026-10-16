# Git 생산성 향상 팁

> 실무에서 자주 사용하는 필수 Git 명령어 10가지

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

> rebase나 reset으로 사라진 커밋도 30일 내 복구 가능

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

> 테스트 스크립트: 성공 시 `exit 0`, 실패 시 `exit 1`

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
git bundle create repo.bundle HEAD
git bundle create repo.bundle --all  # 모든 브랜치

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
| `-f` | 강제 삭제 |
| `-d` | 디렉토리 포함 |
| `-x` | .gitignore 파일도 삭제 |
| `-i` | 대화형 모드 |

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
git push --force-with-lease
```

### 빠른 stash

```bash
git stash push -m "작업중"
git stash pop
```

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

## 참고

- [Git 공식 문서](https://git-scm.com/doc)
- [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials)
