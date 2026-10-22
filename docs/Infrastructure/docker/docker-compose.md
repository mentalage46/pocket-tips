# Docker Compose

## Docker Compose란?

> 여러 컨테이너를 정의하고 한 번에 실행하는 도구

**언제 사용?**

- 앱 + DB + Redis 등 여러 서비스 조합
- 개발 환경 구성
- 로컬 테스트 환경

> **현재 형식 요약**
>
> - 명령은 `docker compose`(Docker CLI 플러그인, Compose v2 이후)입니다. 하이픈이 붙은 `docker-compose`는 지원이 끝난 v1 명령입니다.
> - 기본 파일 이름은 `compose.yaml`(권장) 또는 `compose.yml`입니다. 예전 이름 `docker-compose.yml`도 계속 읽습니다.
> - 최상위 `version:` 키는 쓰지 않습니다. 넣어도 무시되고 "obsolete" 경고만 나옵니다.

---

## 기본 구조

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 주요 옵션

### services 옵션

```yaml
services:
  app:
    # 이미지 사용
    image: node:24-alpine

    # 또는 빌드
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        - NODE_ENV=development

    # 포트 매핑
    ports:
      - "3000:3000" # host:container
      - "9229:9229" # 디버거

    # 환경변수
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://...

    # 또는 파일에서
    env_file:
      - .env
      - .env.local

    # 볼륨 마운트
    volumes:
      - .:/app # 소스 동기화 (개발)
      - /app/node_modules # node_modules 제외
      - logs:/app/logs # named volume

    # 의존성
    depends_on:
      - db
      - redis

    # 재시작 정책
    restart: unless-stopped

    # 네트워크
    networks:
      - backend

    # 헬스체크
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # 리소스 제한
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
```

### 네트워크 & 볼륨

```yaml
networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
```

---

## 환경별 구성

### 개발 환경 (docker-compose.yml)

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229" # 디버거
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mydb_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev:/var/lib/postgresql/data

volumes:
  postgres_dev:
```

### 운영 환경 (docker-compose.prod.yml)

```yaml
services:
  app:
    image: myrepo/myapp:${IMAGE_TAG:-latest}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
```

### 환경별 실행

```bash
# 개발
docker compose up -d

# 운영
docker compose -f docker-compose.prod.yml up -d

# 오버라이드 조합
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 주요 명령어

```bash
# 시작
docker compose up
docker compose up -d              # 백그라운드
docker compose up --build         # 리빌드

# 중지
docker compose down
docker compose down -v            # 볼륨도 삭제
docker compose down --rmi all     # 이미지도 삭제

# 로그
docker compose logs
docker compose logs -f app        # 특정 서비스 실시간

# 상태
docker compose ps

# 특정 서비스만 실행
docker compose up -d db

# 스케일
docker compose up -d --scale app=3

# 재시작
docker compose restart app

# 서비스 내 명령 실행
docker compose exec app /bin/sh
docker compose exec app npm run migrate

# 이미지 빌드만
docker compose build

# 설정 확인 (문법 검증)
docker compose config
```

---

## 🎯 Docker Compose 체크리스트

### 작성 시

- [ ] 서비스 간 의존성 (`depends_on`) 설정
- [ ] 환경변수는 `.env` 파일로 분리
- [ ] 볼륨으로 데이터 영속성 확보
- [ ] 포트 충돌 확인

### 개발 환경

- [ ] 소스 볼륨 마운트 (hot-reload)
- [ ] 디버거 포트 노출
- [ ] 로컬 DB 포트 노출

### 운영 환경

- [ ] `restart: unless-stopped` 설정
- [ ] 헬스체크 설정
- [ ] 리소스 제한 (`deploy.resources`)
- [ ] 민감정보 환경변수 파일 분리
- [ ] 로그 드라이버 설정

### 보안

- [ ] 불필요한 포트 미노출
- [ ] `.env` 파일 .gitignore에 추가
- [ ] 운영 DB 포트 노출 안함

---

## 실전 예시: 풀스택 앱

```yaml
services:
  # 프론트엔드
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  # 백엔드 API
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # 데이터베이스
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # 캐시
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  # 리버스 프록시
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

## 참고 자료

- [Compose 파일 `version`과 `name`](https://docs.docker.com/reference/compose-file/version-and-name/) - `version` 키는 참고용이며 사용 시 obsolete 경고
- [Compose 버전 역사](https://docs.docker.com/compose/intro/history/) - v2부터 `docker compose`로 실행, 지원 버전
- [Compose 애플리케이션 모델](https://docs.docker.com/compose/intro/compose-application-model/) - 기본 파일 이름
- [services 요소](https://docs.docker.com/reference/compose-file/services/) - `depends_on`의 `condition` 값

확인일: 2026-10-22 (명령 형식·파일 이름·`version` 키·`depends_on` 조건. 이미지 태그와 개별 옵션은 미확인)
