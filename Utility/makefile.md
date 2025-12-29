# Makefile

## Makefile이란?

> 빌드 자동화 도구 `make`의 설정 파일. 반복 명령어를 타겟으로 정의하여 실행

**핵심 개념**

- **타겟(Target)**: 실행할 작업 이름
- **의존성(Dependencies)**: 타겟 실행 전 필요한 것들
- **레시피(Recipe)**: 실제 실행할 명령어

---

## 기본 문법

```makefile
타겟: 의존성
	명령어  # 반드시 TAB으로 시작!

# 예시
build: clean
	npm run build

clean:
	rm -rf dist

# 여러 명령어
deploy: build
	docker build -t myapp .
	docker push myapp
```

### 자주 쓰는 기능

```makefile
# 변수 정의
APP_NAME = myapp
VERSION = 1.0.0

build:
	docker build -t $(APP_NAME):$(VERSION) .

# .PHONY - 실제 파일이 아닌 타겟 명시
.PHONY: build clean test

# 기본 타겟 (make만 입력 시 실행)
.DEFAULT_GOAL := help

# 도움말 자동 생성
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## 프로젝트 빌드
	npm run build

test: ## 테스트 실행
	npm test
```

---

## 주요 기능

| 기능              | 설명                      | 예시                 |
| ----------------- | ------------------------- | -------------------- |
| **명령어 간소화** | 긴 명령어를 짧은 타겟으로 | `make deploy`        |
| **의존성 관리**   | 순서대로 실행 보장        | `deploy: build test` |
| **변수 지원**     | 재사용 가능한 값          | `$(APP_NAME)`        |
| **조건부 실행**   | 파일 변경 시에만 빌드     | 타임스탬프 비교      |
| **병렬 실행**     | `-j` 옵션                 | `make -j4 build`     |

---

## 실제 활용 예시

### 개발 환경

```makefile
.PHONY: dev install lint test

install:
	npm install

dev:
	npm run dev

lint:
	npm run lint

test:
	npm test

# 한번에 검증
check: lint test
```

### Docker/배포

```makefile
IMAGE = myapp
TAG = latest

build:
	docker build -t $(IMAGE):$(TAG) .

push: build
	docker push $(IMAGE):$(TAG)

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f
```

### 데이터베이스

```makefile
db-up:
	docker-compose up -d postgres

db-migrate:
	npm run migrate

db-seed:
	npm run seed

db-reset: db-migrate db-seed
```

---

## 🎯 Makefile 도입 체크리스트

### 도입하면 좋은 경우

- [ ] 반복적으로 치는 긴 명령어가 있다
- [ ] 팀원마다 명령어 실행 방식이 다르다
- [ ] README에 "이 명령어를 실행하세요"가 많다
- [ ] 빌드/배포 순서가 복잡하다
- [ ] 여러 명령어를 순서대로 실행해야 한다
- [ ] 새 팀원 온보딩 시 명령어 설명이 길다

### 도입 안해도 되는 경우

- [ ] 명령어가 1-2개로 단순
- [ ] package.json scripts로 충분
- [ ] Windows 단독 환경 (호환성 이슈)
- [ ] CI/CD가 이미 모든 걸 처리

---

## Makefile vs package.json scripts

| 비교             | Makefile             | npm scripts        |
| ---------------- | -------------------- | ------------------ |
| **의존성**       | 네이티브 지원        | 별도 패키지 필요   |
| **병렬 실행**    | `make -j`            | `npm-run-all` 필요 |
| **조건부 실행**  | 파일 변경 감지       | 불가               |
| **언어 독립**    | ✅ 어떤 프로젝트든   | Node.js만          |
| **가독성**       | 중간                 | 좋음               |
| **Windows 호환** | 🔺 WSL/Git Bash 필요 | ✅                 |

### 권장 조합

```
npm scripts → 개발 명령어 (dev, build, test)
Makefile → 인프라/배포 명령어 (docker, deploy, setup)
```

---

## 팁

- 🔧 `@` 접두사: 명령어 출력 숨김 (`@echo "Done"`)
- 🔧 `-` 접두사: 에러 무시하고 계속 (`-rm file.txt`)
- 🔧 Windows: Git Bash, WSL, 또는 `make` for Windows 설치
- 🔧 `make -n`: 실제 실행 없이 명령어만 확인 (dry-run)
