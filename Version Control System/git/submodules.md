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
- ⚠️ 클론 후 `submodule update` 필수
- ⚠️ 서브모듈 내부 변경은 별도 커밋 필요
- ⚠️ 팀원 모두 서브모듈 이해 필요

---

## Submodule vs Subtree vs npm

| 방식           | 특징             | 적합한 경우            |
| -------------- | ---------------- | ---------------------- |
| **Submodule**  | 별도 저장소 링크 | 독립적 버전 관리 필요  |
| **Subtree**    | 히스토리 병합    | 단순 포함, 분리 불필요 |
| **npm/패키지** | 패키지 매니저    | 버전 관리된 라이브러리 |
