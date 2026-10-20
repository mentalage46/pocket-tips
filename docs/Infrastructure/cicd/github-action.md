# GitHub Actions

## GitHub Actions란?

> GitHub 저장소에서 직접 CI/CD 워크플로우를 자동화하는 도구

**특징**

- GitHub에 내장 (별도 서버 불필요)
- YAML로 워크플로우 정의
- 다양한 이벤트 트리거 (push, PR, schedule 등)
- Marketplace에서 액션 재사용

---

## 기본 구조

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on: # 트리거 조건
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions: # GITHUB_TOKEN 권한 최소화
  contents: read

jobs: # 작업 정의
  build:
    runs-on: ubuntu-latest # 실행 환경
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

### 주요 개념

| 용어         | 설명                             |
| ------------ | -------------------------------- |
| **Workflow** | 자동화 프로세스 (.yml 파일)      |
| **Job**      | 같은 러너에서 실행되는 스텝 묶음 |
| **Step**     | 개별 작업 (명령어 또는 액션)     |
| **Action**   | 재사용 가능한 작업 단위          |
| **Runner**   | 워크플로우 실행 서버             |

---

## GitHub Secrets 연동

### Secrets 설정

```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

**일반적인 시크릿**

- `DOCKER_USERNAME`, `DOCKER_PASSWORD` (Docker Hub 사용 시. 비밀번호 대신 액세스 토큰 권장)
- `SSH_PRIVATE_KEY` (배포 전용 키)
- 클라우드 키(`AWS_ACCESS_KEY_ID` 등)는 시크릿에 저장하기보다 OIDC를 권장합니다. [파이프라인 보안](./pipeline-security.md#2-장기-비밀값-대신-oidc) 참고

### Secrets 사용

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Deploy with SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app
            docker compose pull
            docker compose up -d
```

### Environment Secrets (환경별 분리)

```
Repository → Settings → Environments → New environment
- develop (개발 서버 시크릿)
- production (운영 서버 시크릿)
```

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production # 이 환경의 시크릿 사용
    steps:
      - run: echo "${{ secrets.SERVER_HOST }}" # production 환경 값(로그에는 마스킹됨)
```

> 환경의 필수 승인자(Required reviewers) 기능은 Free·Pro·Team 플랜에서 **공개 저장소에만** 적용됩니다. 비공개 저장소에서 승인 단계가 필요하면 태그 푸시나 `workflow_dispatch`(수동 실행)를 운영 배포 트리거로 씁니다. [운영 배포 보호](./pipeline-security.md#6-운영-배포-보호) 참고.

---

## Docker 연동 CI/CD

### 기본 흐름

```
Push → Build → Test → Docker Build → Push to Registry → Deploy
```

---

## 환경별 CI/CD 구성

아래 예시는 Docker Hub를 레지스트리로 씁니다. GHCR을 쓰면 레지스트리용 시크릿 없이 `GITHUB_TOKEN`으로 푸시할 수 있습니다. [GHCR 예시](./solo-dev-tools.md#예시-github-actions-ghcr-vpsdocker-compose) 참고.

### Develop 환경

```yaml
# .github/workflows/deploy-develop.yml
name: Deploy to Develop

on:
  push:
    branches: [develop]

permissions:
  contents: read

env:
  DOCKER_IMAGE: myapp

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: develop

    steps:
      - uses: actions/checkout@v7

      # Docker Buildx 설정
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      # Docker Hub 로그인
      - name: Login to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # Docker 이미지 빌드 & 푸시 (develop 태그 + 커밋 SHA 태그)
      - name: Build and Push
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:develop
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # 서버에 배포
      - name: Deploy to Server
        uses: appleboy/ssh-action@v1
        env:
          IMAGE_TAG: ${{ github.sha }}
        with:
          host: ${{ secrets.DEV_SERVER_HOST }}
          username: ${{ secrets.DEV_SERVER_USER }}
          key: ${{ secrets.DEV_SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            cd /app
            echo "IMAGE_TAG=$IMAGE_TAG" > .env.deploy
            docker compose --env-file .env --env-file .env.deploy pull
            docker compose --env-file .env --env-file .env.deploy up -d
            docker image prune -f
```

### Production 환경

운영에는 커밋 SHA 같은 **불변 태그**로 배포합니다. `latest`만 쓰면 되돌릴 이전 이미지를 지정할 수 없습니다.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    # 또는 태그 기반
    # tags: ['v*']

permissions:
  contents: read

concurrency: # 운영 배포는 한 번에 하나만, 진행 중인 배포는 취소하지 않음
  group: deploy-production
  cancel-in-progress: false

env:
  DOCKER_IMAGE: myapp

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.tag }}

    steps:
      - uses: actions/checkout@v7

      # 버전 태그 생성 (짧은 커밋 SHA)
      - name: Get version
        id: version
        run: echo "tag=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and Push
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:${{ steps.version.outputs.tag }}
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production # 운영 서버 시크릿은 이 환경에만 등록

    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1
        env:
          IMAGE_TAG: ${{ needs.build.outputs.version }}
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            set -e
            cd /app

            # 롤백용으로 현재 태그 보관
            [ -f .env.deploy ] && cp .env.deploy .env.deploy.prev

            # 새 이미지 태그로 교체 (재생성 배포: 수 초 중단)
            echo "IMAGE_TAG=$IMAGE_TAG" > .env.deploy
            docker compose --env-file .env --env-file .env.deploy pull
            docker compose --env-file .env --env-file .env.deploy up -d

            # 헬스체크 실패 시 이전 태그로 되돌리고 실패 처리
            if ! curl -fsS --retry 10 --retry-delay 3 --retry-all-errors http://localhost:3000/health; then
              if [ -f .env.deploy.prev ]; then
                cp .env.deploy.prev .env.deploy
                docker compose --env-file .env --env-file .env.deploy up -d
              fi
              exit 1
            fi

            # 태그 없는(dangling) 이미지만 정리. SHA 태그 이미지는 롤백용으로 남음
            docker image prune -f
```

**무중단 배포에 대해**

같은 호스트 포트(`3000:3000`)를 쓰는 서비스는 `docker compose up --scale app=2`로 늘릴 수 없습니다. 두 번째 컨테이너가 "port is already allocated" 오류로 시작되지 않습니다. 컨테이너를 겹쳐 띄우며 교체하려면 다음 중 하나가 필요합니다.

- 앱 컨테이너는 호스트 포트를 열지 않고, 앞단 리버스 프록시(Nginx, Traefik, Caddy)가 컨테이너 네트워크로 트래픽을 넘기게 합니다. 새 컨테이너가 헬스체크를 통과한 뒤 이전 컨테이너를 내리는 순서는 직접 스크립트로 관리해야 합니다.
- 이 교체 과정을 자동화한 도구(Kamal의 kamal-proxy, Coolify·Dokploy 등)를 씁니다. [1인·소규모 도구 선택](./solo-dev-tools.md#vps-자체-호스팅-paas) 참고.

전략별 장단점은 [배포 전략과 롤백](./deployment-strategies.md)에서 다룹니다.

---

## 서버 compose.yaml 예시

```yaml
# /app/compose.yaml
# Compose v2에서는 최상위 version 키가 필요 없습니다.
services:
  app:
    image: ${DOCKER_USERNAME:?DOCKER_USERNAME is required}/myapp:${IMAGE_TAG:-latest}
    ports:
      - "127.0.0.1:3000:3000" # 외부 공개는 앞단 Nginx가 담당
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL:?DATABASE_URL is required}
    restart: unless-stopped
    healthcheck:
      # 이미지 안에 curl이 있어야 동작. 없으면 wget이나 앱 자체 점검 명령으로 바꿈
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# /app/.env (서버에만 두고 저장소에 커밋하지 않음)
DOCKER_USERNAME=myname
DATABASE_URL=postgres://...
```

- 워크플로가 만드는 `.env.deploy`에는 `IMAGE_TAG`만 들어갑니다. `--env-file`을 여러 번 주면 뒤의 파일이 앞의 값을 덮어씁니다.
- 비공개 이미지라면 서버에서 미리 `docker login`을 해 둡니다(읽기 전용 토큰 권장).

**수동 롤백**

```bash
cd /app
echo "IMAGE_TAG=<이전 SHA>" > .env.deploy
docker compose --env-file .env --env-file .env.deploy up -d
```

---

## 통합 워크플로우 (환경 분기)

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]

permissions:
  contents: read

env:
  DOCKER_IMAGE: myapp

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      env: ${{ steps.set-env.outputs.environment }}
      tag: ${{ steps.set-env.outputs.tag }}

    steps:
      - uses: actions/checkout@v7

      - name: Set environment
        id: set-env
        run: |
          if [ "$GITHUB_REF" = "refs/heads/main" ]; then
            echo "environment=production" >> "$GITHUB_OUTPUT"
          else
            echo "environment=develop" >> "$GITHUB_OUTPUT"
          fi
          echo "tag=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v4

      - uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and Push Docker
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:${{ steps.set-env.outputs.tag }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: ${{ needs.build.outputs.env }}

    steps:
      - name: Deploy
        uses: appleboy/ssh-action@v1
        env:
          IMAGE_TAG: ${{ needs.build.outputs.tag }}
        with:
          host: ${{ secrets.SERVER_HOST }} # 환경별 다른 값
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            cd /app
            echo "IMAGE_TAG=$IMAGE_TAG" > .env.deploy
            docker compose --env-file .env --env-file .env.deploy pull
            docker compose --env-file .env --env-file .env.deploy up -d
```

---

## 🎯 체크리스트

### 초기 설정

- [ ] `.github/workflows/` 디렉토리 생성
- [ ] GitHub Secrets 등록 (Docker, SSH 등)
- [ ] Environment 생성 (develop, production)
- [ ] 서버에 compose.yaml과 `.env` 배치

### 보안

- [ ] 워크플로 최상단에 `permissions: contents: read`
- [ ] Secrets에 민감 정보 저장 (하드코딩 금지)
- [ ] 운영 배포는 `main`·태그·수동 실행으로만 (비공개 저장소의 승인자 기능은 플랜 제약 확인)
- [ ] SSH 키는 배포 전용으로 생성
- [ ] 서드파티 액션 버전 관리 (SHA 고정 또는 Dependabot)

### 운영

- [ ] 빌드 캐시 활용 (속도 개선)
- [ ] 헬스체크 설정
- [ ] 배포 실패 시 알림 (Slack 등)
- [ ] 이미지 태그 전략 수립 (불변 SHA·버전 태그 + 편의용 latest)
- [ ] 롤백 명령 확인

---

## 유용한 액션

| 액션                           | 용도                     |
| ------------------------------ | ------------------------ |
| `actions/checkout`             | 코드 체크아웃            |
| `actions/setup-node`           | Node 설치, 의존성 캐시   |
| `docker/login-action`          | Docker 레지스트리 로그인 |
| `docker/build-push-action`     | 이미지 빌드 & 푸시       |
| `docker/metadata-action`       | 브랜치·태그 기반 이미지 태그 생성 |
| `appleboy/ssh-action`          | SSH로 서버 명령 실행     |
| `actions/cache`                | 의존성 캐싱              |
| `slackapi/slack-github-action` | Slack 알림               |

---

## 요약

```
develop 브랜치
  └── Push → Build → docker push :develop,:<sha> → 개발 서버 배포

main 브랜치
  └── Push → Build → docker push :<sha>,:latest → 운영 서버 배포 → 헬스체크 실패 시 이전 SHA로 복구
```

## 참고 자료

- 액션 최신 메이저 버전: [actions/checkout](https://github.com/actions/checkout/releases), [actions/setup-node](https://github.com/actions/setup-node/releases), [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action/releases), [docker/login-action](https://github.com/docker/login-action/releases), [docker/build-push-action](https://github.com/docker/build-push-action/releases), [appleboy/ssh-action](https://github.com/appleboy/ssh-action) (`envs` 입력)
- [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) - 플랜별 보호 규칙
- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) - `permissions`, `concurrency`
- [Compose 변수 치환](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) - `--env-file` 우선순위, `${VAR:?error}`, [version 키 폐기](https://docs.docker.com/reference/compose-file/version-and-name/)

확인일: 2026-10-20 (액션 메이저 버전, ssh-action `envs`, 환경 보호 규칙 플랜 제약, Compose 변수 치환·`version` 키)

관련: [CI/CD 학습 순서](./README.md), [배포 전략과 롤백](./deployment-strategies.md), [파이프라인 보안](./pipeline-security.md)
