# Git Submodules

## Submodule이란?

> Git 저장소 안에 다른 Git 저장소를 포함시키는 기능

**사용 사례**

- 공통 라이브러리 공유
- 마이크로서비스 모노레포 구성
- 외부 의존성 버전 고정

```
main-project/
├── .git/
├── .gitmodules        # 서브모듈 설정
├── src/
└── libs/
    └── shared-lib/    # 서브모듈 (별도 저장소)
```

---

## 개념: 서브모듈은 "저장소가 아니라 커밋 하나를 가리키는 포인터"다

### 상위 저장소가 실제로 저장하는 것

서브모듈을 추가해도 상위 저장소에는 서브모듈의 **파일이 들어가지 않습니다.** 대신 트리(tree)에 **"이 경로는 저 저장소의 이 커밋"** 이라는 항목 하나가 들어갑니다. 실행해서 확인한 결과입니다.

```bash
git ls-tree HEAD libs/lib
160000 commit 364c8c933a7e1e442163230eda9f098070f0e62e	libs/lib
```

- `160000`은 서브모듈(gitlink)을 뜻하는 특별한 모드이고, 값은 **서브모듈의 커밋 해시**입니다. 파일(`100644 blob`)도 디렉터리(`040000 tree`)도 아닙니다.
- 그래서 서브모듈은 **"브랜치 최신"이 아니라 "이 정확한 커밋"으로 고정**됩니다. 이것이 외부 의존성 버전 고정에 쓰이는 이유이자, 업데이트가 번거로운 이유입니다.

### 설정이 두 곳에 나뉘어 있다

| 위치 | 성격 | 내용 |
| --- | --- | --- |
| `.gitmodules` | **커밋되어 공유**됨 | 경로(`path`), URL(`url`), 선택적으로 브랜치 |
| `.git/config` | **로컬**, `submodule init`(또는 `add`)이 `.gitmodules`에서 복사 | 이 클론이 쓸 URL, 활성화 여부(`active`) |

- `.gitmodules`의 URL이 바뀌어도 이미 초기화된 클론의 `.git/config`는 그대로입니다. 로컬 설정을 `.gitmodules`에 맞추려면 `git submodule sync`를 실행합니다.
- 팀원이 새로 받은 클론은 `submodule init` 시 `.gitmodules`를 읽어 로컬 설정을 만듭니다.

### 클론하면 서브모듈 디렉터리는 비어 있다

```bash
git clone <app>                          # libs/lib 디렉터리가 존재하지만 비어 있음 (파일 0개)
git submodule update --init --recursive  # 이제 상위가 기록한 커밋으로 채워짐
```

처음부터 받으려면 `git clone --recurse-submodules`를 씁니다. CI에서 "서브모듈 파일이 없다"는 오류가 나면 대부분 이 단계가 빠진 것입니다.

### 서브모듈은 detached HEAD 상태가 기본이다

`submodule update` 후 서브모듈 안에서 `git status`를 보면 `HEAD가 다음 위치에서 분리: e21152e`처럼 **브랜치가 아닌 특정 커밋**을 가리킵니다. 상위 저장소가 "이 커밋"을 기록했기 때문입니다.

- 이 상태에서 서브모듈 안에서 바로 커밋하면 **어느 브랜치에도 속하지 않은 커밋**이 됩니다. 다른 곳으로 이동하면 찾기 어려워지므로 작업 전에 브랜치로 전환(`git switch main`)합니다.
- `git submodule add`로 막 추가했을 때는 서브모듈이 브랜치에 체크아웃된 상태일 수 있고, `submodule update` 이후부터 detached가 됩니다(실행 결과).

### 업데이트는 "서브모듈 → 상위" 두 단계다

```
1. 서브모듈 저장소에서 변경 커밋 + push
2. 상위 저장소에서 "서브모듈이 가리키는 커밋"이 바뀐 것을 커밋 + push
```

상위 저장소에서 새 포인터를 커밋했는데 **서브모듈 쪽을 push하지 않았다면**, 다른 사람이 클론할 때 **존재하지 않는 커밋**을 찾지 못해 실패합니다. 그래서 문서의 `push.recurseSubmodules=check` 설정이 유용합니다.

`git submodule update --remote`는 서브모듈을 **원격의 최신**(`submodule.<name>.branch`로 지정한 브랜치, 없으면 원격 HEAD)으로 이동시킵니다. 그 결과는 상위 저장소에서 `M libs/lib`(포인터가 바뀜)으로 보이며 **커밋해야 팀에 반영**됩니다.

```
$ git status --short
 M libs/lib
$ git diff --submodule
Submodule libs/lib 364c8c9..e21152e:
  > lib v2
```

### 로컬 경로를 URL로 쓰면 막힌다

로컬 디렉터리를 서브모듈 URL로 쓰면 `fatal: transport 'file' not allowed`로 실패합니다. Git은 `file` 프로토콜의 기본 정책을 `user`(기본적으로는 허용하지 않음)로 둡니다(`protocol.file.allow`). 실서비스의 `https://`·`ssh` URL은 해당 없고, 로컬에서 실험할 때만 `git -c protocol.file.allow=always submodule add ...`로 허용합니다. 신뢰할 수 없는 저장소의 서브모듈 URL이 로컬 파일을 가리키지 못하게 하려는 안전장치로 이해하면 됩니다(의도 설명은 일반 개념).

---

## 기본 명령어

### 서브모듈 추가

```bash
# 서브모듈 추가
git submodule add https://github.com/user/repo.git libs/shared-lib

# 특정 브랜치로 추가
git submodule add -b main https://github.com/user/repo.git libs/shared-lib
```

### 서브모듈 포함 저장소 클론

```bash
# 클론 시 서브모듈도 함께
git clone --recurse-submodules https://github.com/user/main-project.git

# 이미 클론한 경우
git submodule init
git submodule update

# 또는 한 번에
git submodule update --init --recursive
```

### 서브모듈 업데이트

```bash
# 원격 최신으로 업데이트
git submodule update --remote

# 특정 서브모듈만
git submodule update --remote libs/shared-lib

# 모든 서브모듈 최신 + 재귀적
git submodule update --init --recursive --remote
```

### 서브모듈 삭제

```bash
# 1. .gitmodules에서 해당 섹션 삭제
# 2. .git/config에서 해당 섹션 삭제
# 3. 캐시 및 디렉토리 삭제
git rm --cached libs/shared-lib
rm -rf libs/shared-lib
rm -rf .git/modules/libs/shared-lib

# 커밋
git commit -m "Remove submodule libs/shared-lib"
```

---

## .gitmodules 파일

```ini
[submodule "libs/shared-lib"]
    path = libs/shared-lib
    url = https://github.com/user/shared-lib.git
    branch = main
```

---

## 서브모듈 작업 흐름

### 서브모듈 내부에서 작업

```bash
# 서브모듈 디렉토리로 이동
cd libs/shared-lib

# 브랜치로 전환 (기본은 detached HEAD)
git checkout main

# 작업 후 커밋
git add .
git commit -m "Update shared-lib"
git push

# 상위 프로젝트로 이동
cd ../..

# 서브모듈 레퍼런스 업데이트 커밋
git add libs/shared-lib
git commit -m "Update shared-lib submodule"
git push
```

### 서브모듈 변경사항 확인

```bash
# 서브모듈 상태
git submodule status

# 서브모듈 요약
git submodule summary

# diff 확인
git diff --submodule
```

---

## 유용한 설정

```bash
# diff에 서브모듈 변경 표시
git config --global diff.submodule log

# status에 서브모듈 요약 표시
git config --global status.submodulesummary 1

# push 시 서브모듈도 확인
git config --global push.recurseSubmodules check
```

---

## 자주 쓰는 명령어

```bash
# 전체 업데이트 (가장 많이 사용)
git submodule update --init --recursive

# 모든 서브모듈에서 명령 실행
git submodule foreach 'git checkout main && git pull'

# 서브모듈 브랜치 확인
git submodule foreach 'git branch -v'
```

---

## 🎯 Submodule 체크리스트

### 추가 시

- [ ] 적합한 경로 선택 (libs/, modules/ 등)
- [ ] 브랜치 지정 (`-b main`)
- [ ] .gitmodules 커밋

### 클론/협업

- [ ] `--recurse-submodules` 사용
- [ ] 또는 `git submodule update --init`
- [ ] README에 서브모듈 초기화 방법 명시

### 업데이트

- [ ] 서브모듈 내부 커밋 먼저
- [ ] 상위 저장소에서 레퍼런스 커밋
- [ ] 순서 중요: 서브모듈 push → 메인 push

---

## 주의사항

- ⚠️ 서브모듈은 특정 **커밋**을 가리킴 (브랜치 X)
- ⚠️ 클론 후 `submodule update --init` 필수 (안 하면 디렉터리가 비어 있음)
- ⚠️ 서브모듈 URL이 바뀌면 `git submodule sync`
- ⚠️ 서브모듈 내부 변경은 별도 커밋 필요
- ⚠️ 팀원 모두 서브모듈 이해 필요

---

## Submodule vs Subtree vs npm

| 방식           | 특징             | 적합한 경우            |
| -------------- | ---------------- | ---------------------- |
| **Submodule**  | 별도 저장소의 **커밋 포인터** | 독립적 버전 관리 필요, 소스를 직접 수정·기여해야 할 때 |
| **Subtree**    | 히스토리 병합    | 단순 포함, 분리 불필요 |
| **npm/패키지** | 패키지 매니저(버전·잠금 파일) | 버전 관리된 라이브러리. 소스를 고칠 필요가 없을 때 |

**선택 기준**: 단순히 버전 관리된 라이브러리를 쓰는 것이라면 **패키지 매니저**가 클론·CI·업데이트 모두 쉽습니다. 서브모듈은 해당 코드를 **함께 수정하며 개발**해야 하거나 패키지로 배포되지 않은 코드를 특정 커밋에 고정해야 할 때 선택합니다. 서브모듈은 팀원 모두가 위 동작(포인터, 초기화, detached HEAD)을 이해해야 해서 학습·운영 비용이 있습니다.

## 참고 자료

- [git-submodule](https://git-scm.com/docs/git-submodule) - `update`(`--remote`의 대상 브랜치), `sync`, `.gitmodules`와 `.git/config`의 관계
- [git-config](https://git-scm.com/docs/git-config) - `protocol.file.allow` 정책(`file`의 기본값은 `user`), `submodule.<name>.branch`, `submodule.recurse`

확인일: 2026-10-22 (매뉴얼은 Git 2.52.0 설치본으로 확인. `160000 commit` gitlink 항목, `.gitmodules`와 `.git/config`의 분리, 일반 clone 시 빈 디렉터리, `update` 후 detached HEAD, `update --remote`의 `M` 표시와 `diff --submodule`, `file` 프로토콜 거부는 임시 저장소에서 직접 실행해 확인. 로컬 경로 거부의 설계 의도, "서브모듈 vs 패키지" 선택 기준은 일반 개념·경험칙. 아래 서브모듈 삭제 절차는 이번에 재검증하지 않음, 미확인)
