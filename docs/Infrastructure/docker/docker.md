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

## 개념: 컨테이너는 무엇이고 이미지는 어떻게 만들어지는가

### 컨테이너 vs 가상 머신

| 구분 | 가상 머신 | 컨테이너 |
| --- | --- | --- |
| 격리 단위 | 게스트 OS 전체 (하이퍼바이저 위) | **호스트 커널을 공유**하는 격리된 프로세스 |
| 격리 방법 | 하드웨어 가상화 | 리눅스 커널의 **namespace**(보이는 자원의 범위 제한) 등 |
| 크기·시작 | 크고 느림 | 작고 빠름 |
| 격리 강도 | 강함 | 상대적으로 약함 (커널을 공유하므로) |

Docker 공식 문서는 컨테이너를 "느슨하게 격리된 환경", namespace를 그 격리의 기반, 하이퍼바이저 기반 VM에 대한 **가볍고 비용 효율적인 대안**으로 설명합니다. 커널을 공유한다는 점이 보안의 출발점입니다. 컨테이너 안에서 root로 실행하면 격리가 뚫렸을 때 피해가 커지므로 아래 [non-root 실행](#non-root-사용자-실행-보안)이 중요합니다.

### Docker의 구성

```
docker CLI(클라이언트) → dockerd(데몬: 빌드·실행·배포) ⇄ 레지스트리(이미지 저장소, 기본 Docker Hub)
```

### 이미지는 레이어의 쌓임이다

- 이미지는 컨테이너를 만들기 위한 **읽기 전용 템플릿**입니다.
- Dockerfile의 **각 명령이 레이어 하나**가 됩니다. 이미지를 다시 빌드할 때 **바뀐 레이어만 다시 만들어** 빌드가 빠르고 이미지가 작게 유지됩니다.
- 컨테이너는 이미지 위에 **쓰기 가능한 층**을 얹어 실행한 것이라서, 컨테이너가 사라지면 그 안에 쓴 파일도 사라집니다. 남겨야 하는 데이터는 **볼륨**이나 외부 저장소에 둡니다(일반 개념).

### 빌드 캐시 규칙: 순서가 곧 성능이다

> 레이어가 바뀌면 그 레이어는 다시 만들어야 하고, **그 아래(이후)의 모든 레이어도 다시 만들어야** 합니다. (Docker 문서)

그래서 Dockerfile은 **자주 바뀌지 않는 것을 위에, 자주 바뀌는 것을 아래에** 둡니다.

```dockerfile
COPY package*.json ./   # 의존성 목록: 드물게 바뀜
RUN npm ci              # → package.json이 그대로면 캐시 사용 (오래 걸리는 단계)
COPY . .                # 소스: 자주 바뀜 → 여기서부터만 다시 실행
```

`COPY . .`를 `npm ci`보다 먼저 두면 소스를 한 줄만 고쳐도 의존성을 매번 다시 설치합니다.

### 이미지는 불변, 설정은 밖에서

한 번 빌드한 이미지를 개발·스테이징·운영에서 **그대로** 쓰고, 달라지는 값(DB 주소, 키)은 실행할 때 환경변수나 시크릿으로 주입하는 것이 원칙입니다. 이미지 안에 비밀을 넣으면 레이어에 남아 이미지를 받는 누구나 볼 수 있습니다. 자세한 내용은 [환경변수 관리](../../Security/env-management.md#docker-환경)를 참고합니다.

### Dockerfile 명령의 의미를 정확히

| 주제 | 규칙 |
| --- | --- |
| `CMD` vs `ENTRYPOINT` | `CMD`는 `docker run`에 인자를 주면 **대체**됩니다. `ENTRYPOINT`는 컨테이너를 **실행 파일처럼** 쓸 때 고정합니다. `CMD`가 여러 개면 **마지막 것만** 적용됩니다 |
| exec form vs shell form | `["node","app.js"]`(exec)는 셸 없이 직접 실행, `node app.js`(shell)는 `/bin/sh -c`로 실행됩니다. shell form은 **신호를 전달하지 않아** 프로세스가 PID 1이 되지 못하고 `docker stop`의 `SIGTERM`을 못 받습니다(→ 우아한 종료 불가). **exec form을 씁니다** |
| `EXPOSE` | 포트를 **문서화**할 뿐 열지 않습니다. 실제 공개는 `docker run -p`(또는 Compose `ports`) |
| `ARG` vs `ENV` | `ARG`는 **빌드 시에만** 존재하고 최종 이미지·컨테이너에는 없습니다. `ENV`는 이미지에 **남아** 실행 시에도 보입니다 |
| `RUN` vs `CMD` | `RUN`은 **빌드할 때** 실행해 결과가 레이어에 저장되고, `CMD`는 **컨테이너를 시작할 때** 실행됩니다 |

> `CMD ["npm","start"]`처럼 npm을 거치면 npm이 PID 1이 되어 신호 전달이 기대대로 되지 않을 수 있습니다(일반적으로 알려진 문제이며 이 문서에서 확인하지 않음, 미확인). 가능하면 `CMD ["node","dist/main.js"]`로 직접 실행합니다.

---

## Dockerfile 기본 구조

```dockerfile
# 베이스 이미지
FROM node:24-alpine

# 작업 디렉토리
WORKDIR /app

# 의존성 파일 복사 (캐시 활용)
COPY package*.json ./

# 의존성 설치 (빌드에 devDependencies가 필요하므로 전부 설치)
RUN npm ci

# 소스 복사
COPY . .

# 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# 실행 명령
CMD ["node", "dist/main.js"]
```

> **베이스 이미지 버전을 확인합니다.** Node.js 20은 2026-04-30에 지원이 끝났습니다(공식 릴리스 일정). 이 문서의 예시는 `node:24`를 쓰며, 운영에는 **LTS 버전**만 씁니다. 오늘(2026-10-22) 기준 v22는 Maintenance(지원 종료 2027-04-30), v24는 2026-10-20부터 Maintenance(지원 종료 2028-04-30), v26은 2026-10-28에 LTS로 전환될 예정입니다. 버전은 계속 바뀌므로 [Node.js 릴리스 일정](https://nodejs.org/en/about/previous-releases)을 확인하세요.
>
> 위 기본 예시는 **이미지에 devDependencies와 빌드 도구가 그대로 남습니다.** 이를 해결하는 것이 아래 Multi-stage build입니다.

---

## 주요 명령어

| 명령어       | 설명               | 예시                      |
| ------------ | ------------------ | ------------------------- |
| `FROM`       | 베이스 이미지      | `FROM node:24-alpine`     |
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
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: 실행 (최소 이미지)
FROM node:24-alpine AS runner
WORKDIR /app

# 프로덕션 의존성만
COPY package*.json ./
RUN npm ci --omit=dev

# 빌드 결과물만 복사
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

> `--only=production`은 npm이 `Use --omit=dev to omit dev dependencies` 경고를 내는 옵션입니다(npm 11.6.2에서 확인). 둘 다 devDependencies를 설치하지 않지만 `--omit=dev`를 씁니다.

**장점**

- 최종 이미지 크기 축소
- 빌드 도구 미포함 (보안)
- 빌드 캐시 효율화

---

## .dockerignore

빌드 컨텍스트(`docker build`가 데몬에 보내는 파일 묶음)에서 제외할 파일입니다. 제외하면 **빌드가 빨라지고**, `COPY . .`로 `.env`나 `.git`, 로컬 `node_modules`가 이미지에 **섞여 들어가는 것을 막습니다.**


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
FROM node:24

# ✅ Alpine (작음)
FROM node:24-alpine

# ✅ Distroless (더 작음, 보안)
FROM gcr.io/distroless/nodejs24-debian13
```

### 2. 레이어 캐시 활용

```dockerfile
# ✅ 의존성 먼저 복사 (변경 적음)
COPY package*.json ./
RUN npm ci

# 소스는 나중에 (변경 많음)
COPY . .
```

> **Alpine/Distroless의 트레이드오프**
>
> - **Alpine**은 작지만 glibc가 아닌 musl libc를 써서 일부 네이티브 모듈이 문제를 일으킬 수 있습니다(일반 개념, 미확인). 문제가 생기면 Debian 계열(`-slim`)을 씁니다.
> - **Distroless**는 패키지 매니저와 셸이 없어 공격 표면이 작지만, 컨테이너에 들어가 디버깅하기 어렵습니다. 문제 해결용으로 busybox 셸이 포함된 `:debug` 태그가 있습니다. `nonroot` 태그도 제공됩니다.
> - 이미지 이름은 `gcr.io/distroless/nodejs24-debian13`처럼 **Node 버전과 Debian 버전이 포함**됩니다. 이전 예시의 `nodejs20`은 현재 목록에 없습니다.

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

- [ ] 프로덕션 의존성만 설치 (`--omit=dev`)
- [ ] 불필요한 파일 미복사
- [ ] 빌드 캐시 활용
- [ ] 이미지 크기 확인 (`docker images`)

---

## non-root 사용자 실행 (보안)

```dockerfile
FROM node:24-alpine

# 사용자 생성
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --chown=appuser:appgroup . .

# non-root로 전환
USER appuser

CMD ["node", "dist/main.js"]
```

## 참고 자료

- [Docker 개요](https://docs.docker.com/get-started/docker-overview/) - 컨테이너, namespace, VM과의 차이, 클라이언트·데몬·레지스트리, 이미지와 레이어
- [Docker 빌드 캐시](https://docs.docker.com/build/cache/) - 레이어 무효화 규칙(이후 레이어 전부 재빌드)
- [Dockerfile 레퍼런스](https://docs.docker.com/reference/dockerfile/) - `CMD`/`ENTRYPOINT`, exec·shell form과 신호, `EXPOSE`, `ARG`/`ENV`
- [Node.js 릴리스 일정](https://github.com/nodejs/Release/blob/main/schedule.json) - 버전별 LTS·Maintenance·지원 종료일
- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci) - lockfile 요구, `--omit=dev`
- [GoogleContainerTools/distroless](https://github.com/GoogleContainerTools/distroless) - `nodejs22/24/26-debian13` 이미지, `nonroot`·`debug` 태그, 셸·패키지 매니저 없음

확인일: 2026-10-22 (컨테이너·레이어·캐시 규칙, Dockerfile 명령 의미, Node 일정(공식 `schedule.json`), distroless 이미지 이름, `npm ci --only=production` 경고와 `--omit=dev` 동작(npm 11.6.2에서 실행 확인). 커널 공유와 격리 강도 비교, 컨테이너 쓰기 층, `npm start`의 PID 1 문제, Alpine의 musl 이슈는 일반 개념·미확인. Docker가 이 환경에서 실행 중이 아니어서 Dockerfile을 실제로 빌드해 검증하지는 못함. Node 버전은 6개월 안에 재확인 대상)
