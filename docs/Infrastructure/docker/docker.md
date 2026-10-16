# Docker & Dockerfile

## Docker란?

> 애플리케이션을 컨테이너로 패키징하여 어디서든 동일하게 실행하는 플랫폼

**핵심 개념**

- **이미지(Image)**: 컨테이너의 템플릿 (읽기 전용)
- **컨테이너(Container)**: 이미지를 실행한 인스턴스
- **레지스트리(Registry)**: 이미지 저장소 (Docker Hub, ECR 등)

```
Dockerfile → (build) → Image → (run) → Container
```

---

## Dockerfile 기본 구조

```dockerfile
# 베이스 이미지
FROM node:20-alpine

# 작업 디렉토리
WORKDIR /app

# 의존성 파일 복사 (캐시 활용)
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 복사
COPY . .

# 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# 실행 명령
CMD ["node", "dist/main.js"]
```

---

## 주요 명령어

| 명령어       | 설명               | 예시                      |
| ------------ | ------------------ | ------------------------- |
| `FROM`       | 베이스 이미지      | `FROM node:20-alpine`     |
| `WORKDIR`    | 작업 디렉토리      | `WORKDIR /app`            |
| `COPY`       | 파일 복사          | `COPY . .`                |
| `RUN`        | 빌드 시 명령 실행  | `RUN npm install`         |
| `CMD`        | 컨테이너 시작 명령 | `CMD ["npm", "start"]`    |
| `ENTRYPOINT` | 고정 실행 명령     | `ENTRYPOINT ["node"]`     |
| `ENV`        | 환경변수 설정      | `ENV NODE_ENV=production` |
| `EXPOSE`     | 포트 문서화        | `EXPOSE 3000`             |
| `ARG`        | 빌드 시 인자       | `ARG VERSION=1.0`         |

---

## Multi-stage Build (권장)

```dockerfile
# 1단계: 빌드
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: 실행 (최소 이미지)
FROM node:20-alpine AS runner
WORKDIR /app

# 프로덕션 의존성만
COPY package*.json ./
RUN npm ci --only=production

# 빌드 결과물만 복사
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**장점**

- 최종 이미지 크기 축소
- 빌드 도구 미포함 (보안)
- 빌드 캐시 효율화

---

## .dockerignore

```
node_modules
npm-debug.log
dist
.git
.gitignore
.env
.env.*
Dockerfile*
docker-compose*
README.md
.vscode
coverage
```

---

## 이미지 최적화 팁

### 1. 작은 베이스 이미지

```dockerfile
# ❌ 큰 이미지
FROM node:20

# ✅ Alpine (작음)
FROM node:20-alpine

# ✅ Distroless (더 작음, 보안)
FROM gcr.io/distroless/nodejs20
```

### 2. 레이어 캐시 활용

```dockerfile
# ✅ 의존성 먼저 복사 (변경 적음)
COPY package*.json ./
RUN npm ci

# 소스는 나중에 (변경 많음)
COPY . .
```

### 3. 불필요한 파일 제외

```dockerfile
# 필요한 것만 복사
COPY package*.json ./
COPY src ./src
COPY tsconfig.json ./
```

---

## 🎯 Dockerfile 체크리스트

### 작성 시

- [ ] 적절한 베이스 이미지 선택 (alpine 권장)
- [ ] Multi-stage build 사용
- [ ] .dockerignore 작성
- [ ] 레이어 캐시 고려한 순서

### 보안

- [ ] non-root 사용자 실행
- [ ] 불필요한 패키지 미설치
- [ ] 시크릿을 이미지에 포함하지 않음
- [ ] 최신 베이스 이미지 사용

### 최적화

- [ ] 프로덕션 의존성만 설치 (`--only=production`)
- [ ] 불필요한 파일 미복사
- [ ] 빌드 캐시 활용
- [ ] 이미지 크기 확인 (`docker images`)

---

## non-root 사용자 실행 (보안)

```dockerfile
FROM node:20-alpine

# 사용자 생성
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --chown=appuser:appgroup . .

# non-root로 전환
USER appuser

CMD ["node", "dist/main.js"]
```
