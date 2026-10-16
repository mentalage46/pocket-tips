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

jobs: # 작업 정의
  build:
    runs-on: ubuntu-latest # 실행 환경
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm install
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

- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `SSH_PRIVATE_KEY`
- `ENV_FILE` (환경변수 전체)

### Secrets 사용

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin

      - name: Deploy with SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull myapp:latest
            docker-compose up -d
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
      - run: echo ${{ secrets.SERVER_HOST }} # production 환경 값
```

---

## Docker 연동 CI/CD

### 기본 흐름

```
Push → Build → Test → Docker Build → Push to Registry → Deploy
```

---

## 환경별 CI/CD 구성

### Develop 환경

```yaml
# .github/workflows/deploy-develop.yml
name: Deploy to Develop

on:
  push:
    branches: [develop]

env:
  DOCKER_IMAGE: myapp
  DOCKER_TAG: develop

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: develop

    steps:
      - uses: actions/checkout@v4

      # Docker Buildx 설정
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Docker Hub 로그인
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # Docker 이미지 빌드 & 푸시
      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:${{ env.DOCKER_TAG }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # 서버에 배포
      - name: Deploy to Server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEV_SERVER_HOST }}
          username: ${{ secrets.DEV_SERVER_USER }}
          key: ${{ secrets.DEV_SSH_KEY }}
          script: |
            cd /app
            docker-compose pull
            docker-compose up -d
            docker image prune -f
```

### Production 환경

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    # 또는 태그 기반
    # tags: ['v*']

env:
  DOCKER_IMAGE: myapp

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.tag }}

    steps:
      - uses: actions/checkout@v4

      # 버전 태그 생성 (예: v1.0.0 또는 커밋 SHA)
      - name: Get version
        id: version
        run: echo "tag=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:${{ steps.version.outputs.tag }}
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production # 승인 필요 설정 가능

    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /app

            # 이미지 버전 업데이트
            export IMAGE_TAG=${{ needs.build.outputs.version }}

            # 무중단 배포 (rolling update)
            docker-compose pull
            docker-compose up -d --no-deps --scale app=2
            sleep 10
            docker-compose up -d --no-deps --scale app=1

            # 정리
            docker image prune -f
```

---

## 서버 docker-compose.yml 예시

```yaml
# /app/docker-compose.yml
version: "3.8"

services:
  app:
    image: ${DOCKER_USERNAME}/myapp:${IMAGE_TAG:-latest}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 통합 워크플로우 (환경 분기)

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      env: ${{ steps.set-env.outputs.environment }}
      tag: ${{ steps.set-env.outputs.tag }}

    steps:
      - uses: actions/checkout@v4

      - name: Set environment
        id: set-env
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "tag=latest" >> $GITHUB_OUTPUT
          else
            echo "environment=develop" >> $GITHUB_OUTPUT
            echo "tag=develop" >> $GITHUB_OUTPUT
          fi

      - name: Build and Push Docker
        # ... (생략)

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: ${{ needs.build.outputs.env }}

    steps:
      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }} # 환경별 다른 값
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            docker pull myapp:${{ needs.build.outputs.tag }}
            docker-compose up -d
```

---

## 🎯 체크리스트

### 초기 설정

- [ ] `.github/workflows/` 디렉토리 생성
- [ ] GitHub Secrets 등록 (Docker, SSH 등)
- [ ] Environment 생성 (develop, production)
- [ ] 서버에 docker-compose.yml 배치

### 보안

- [ ] Secrets에 민감 정보 저장 (하드코딩 금지)
- [ ] Production 환경에 승인 필수 설정
- [ ] SSH 키는 배포 전용으로 생성
- [ ] 최소 권한 원칙 적용

### 운영

- [ ] 빌드 캐시 활용 (속도 개선)
- [ ] 헬스체크 설정
- [ ] 배포 실패 시 알림 (Slack 등)
- [ ] 이미지 태그 전략 수립 (latest, 버전, SHA)

---

## 유용한 액션

| 액션                           | 용도                     |
| ------------------------------ | ------------------------ |
| `actions/checkout`             | 코드 체크아웃            |
| `docker/login-action`          | Docker 레지스트리 로그인 |
| `docker/build-push-action`     | 이미지 빌드 & 푸시       |
| `appleboy/ssh-action`          | SSH로 서버 명령 실행     |
| `actions/cache`                | 의존성 캐싱              |
| `slackapi/slack-github-action` | Slack 알림               |

---

## 요약

```
develop 브랜치
  └── Push → Build → docker push :develop → 개발 서버 배포

main 브랜치
  └── Push → Build → docker push :latest,:v1.0.0 → 운영 서버 배포 (승인)
```
