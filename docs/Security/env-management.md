# 환경변수 관리

## 왜 중요한가?

> 코드는 공유하고 배포하지만 비밀은 그러면 안 된다. 둘의 수명과 접근 범위가 다르기 때문에 분리한다

**원칙**

- 코드에 비밀 하드코딩 금지
- .env 파일 Git 커밋 금지
- 환경별 설정 분리

---

## 개념: 설정(config)과 비밀(secret)

[Twelve-Factor App](https://12factor.net/config)은 설정을 **"배포(deploy)마다 달라질 수 있는 모든 것"**(DB 주소, 외부 서비스 자격증명, 호스트명 등)으로 정의하고, 코드와 분리하라고 합니다. 분리가 잘 됐는지는 이 질문으로 확인합니다.

> 이 저장소를 지금 당장 공개해도 자격증명이 노출되지 않는가?

| 구분 | 예 | 노출되면 | 저장 위치 |
| --- | --- | --- | --- |
| 일반 설정 | `PORT`, `LOG_LEVEL`, `API_BASE_URL` | 문제 없음 | `.env.example`, 배포 설정 |
| 비밀(secret) | DB 비밀번호, API 키, JWT 서명 키 | 침해 사고 | Secret Manager, CI 시크릿 |
| 공개 값 | 분석 도구 ID, 공개 API 키(지도 등) | 문제 없음(공개 전제) | 빌드 설정 |

환경변수 하나하나를 독립된 값으로 두면 `development`/`staging`/`production` 같은 "환경 묶음"이 늘어날수록 생기는 설정 폭증을 피할 수 있습니다. 12-factor는 환경 이름별 설정 파일 묶음보다 **개별 환경변수**를 권장합니다.

---

## 환경변수는 안전한 금고가 아니다

환경변수는 "코드와 분리"해 줄 뿐 **암호화하거나 접근을 통제해 주지는 않습니다**. 유출 경로를 알아야 어디를 막을지 보입니다.

| 유출 경로 | 어떻게 | 대응 |
| --- | --- | --- |
| Git 이력 | `.env`를 한 번이라도 커밋하면 지워도 이력에 남음 | 유출로 간주하고 **키를 폐기·재발급**. 이력 삭제만으로 끝내지 않음 |
| 로그·에러 리포트 | `console.log(process.env)`, 에러 페이지의 환경 덤프 | 환경변수 전체를 출력하지 않음, 로그 마스킹 |
| 프로세스·컨테이너 검사 | 같은 호스트의 다른 사용자나 `docker inspect`로 환경변수가 보일 수 있음 | 호스트·Docker 접근 권한 최소화, 파일·시크릿 마운트 사용 고려 |
| 하위 프로세스 상속 | 자식 프로세스(빌드 스크립트, 서드파티 CLI)가 환경변수를 그대로 물려받음 | 필요한 변수만 넘김 |
| 클라이언트 번들 | 프런트 빌드에 값이 문자열로 박힘 | 아래 "빌드 타임 vs 런타임" 참고 |
| 이미지 레이어 | `COPY .env`, `ARG`/`ENV`로 넣은 값이 이미지에 남음 | `.dockerignore`에 `.env*`, 비밀은 런타임에 주입 |

> 이미 저장소에 올라간 비밀은 **GitHub push protection**이 이후 푸시를 막아 줄 뿐, 과거에 올라간 값을 지워 주지는 않습니다. 올라간 비밀은 이미 유출된 것으로 보고 폐기합니다.

---

## dotenv

```bash
npm install dotenv
```

### .env 파일

```env
# .env (Git 제외)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
API_KEY=sk-abc123
JWT_SECRET=super-secret-key
```

### 사용

```typescript
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

### Node 내장 기능 (dotenv 없이)

```bash
node --env-file=.env app.js
node --env-file=.env --env-file=.env.local app.js   # 뒤 파일이 앞 파일을 덮어씀
node --env-file-if-exists=.env.local app.js          # 파일이 없어도 오류 없음
```

- `--env-file`은 Node v20.6.0에서 추가됐고, 파일이 없으면 오류를 냅니다.
- **셸에 이미 설정된 환경변수가 `.env` 파일 값보다 우선**합니다. 그래서 배포 환경에서 주입한 값이 `.env`에 밀려 사라지지 않습니다.
- 파일의 값은 전부 **문자열**입니다. `PORT=3000`은 `"3000"`, `DEBUG=false`는 `"false"`(문자열이라 truthy)입니다. 숫자·불리언은 직접 변환해야 합니다.
- `process.loadEnvFile()`로 코드에서 읽는 방법도 있습니다(추가 버전과 덮어쓰기 규칙은 미확인).

### .env.example (Git 포함)

```env
# .env.example
DATABASE_URL=
API_KEY=
JWT_SECRET=
```

---

## 환경별 분리

```
.env              # 기본값 (커밋 가능한 비밀 없는 기본값)
.env.local        # 내 PC 전용 오버라이드 (Git 제외)
.env.production   # 프로덕션 기본값 (비밀은 넣지 않음)
.env.test         # 테스트
```

### 로딩 우선순위 (Next.js 기준)

앞에서부터 찾다가 처음 발견한 값을 씁니다.

1. `process.env` (셸·배포 환경에서 주입한 값)
2. `.env.$(NODE_ENV).local`
3. `.env.local` (`NODE_ENV=test`일 때는 건너뜀)
4. `.env.$(NODE_ENV)`
5. `.env`

- 테스트에서 `.env.local`을 건너뛰는 이유는 **개인 설정과 무관하게 누구에게나 같은 결과**가 나오게 하기 위해서입니다.
- 규칙은 도구마다 다릅니다(Vite, CRA, dotenv-flow 등). 쓰는 도구의 문서를 확인합니다.
- `.env.*.local`은 Git에서 제외하고, `.env.example`과 `.env.test`처럼 비밀이 없는 파일만 커밋합니다.

---

## 빌드 타임 vs 런타임

서버 코드의 `process.env.X`는 **실행할 때** 읽지만, 브라우저로 가는 코드는 **빌드할 때** 값이 문자열로 치환됩니다.

| 구분 | 읽는 시점 | 값 변경 | 비밀 여부 |
| --- | --- | --- | --- |
| 서버 환경변수 | 런타임 | 재시작만 하면 반영 | 가능 |
| 클라이언트 공개 변수 (`NEXT_PUBLIC_*`, Vite의 `VITE_*` 등) | **빌드 타임**에 번들에 박힘 | **다시 빌드**해야 반영 | **불가** (누구나 번들에서 볼 수 있음) |

- Next.js는 `NEXT_PUBLIC_` 접두사가 붙은 변수를 `next build`가 실행되는 환경의 값으로 번들에 인라인합니다. 빌드 후에는 환경변수를 바꿔도 반영되지 않습니다.
- 그래서 **Docker 이미지 하나를 여러 환경에 승격**하는 방식에서는 `NEXT_PUBLIC_*` 값이 이미지를 빌드할 때 이미 고정됩니다. 환경마다 달라야 하는 값은 서버 API로 내려 주는 방식을 씁니다.
- 접두사를 붙이는 것은 "브라우저에 공개해도 된다"는 선언입니다. **비밀에는 절대 붙이지 않습니다.**

---

## 클라우드 Secret Manager

### AWS Secrets Manager

```typescript
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManager();
const response = await client.getSecretValue({ SecretId: "my-secret" });
const secret = JSON.parse(response.SecretString);
```

### GCP Secret Manager

```typescript
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: "projects/my-project/secrets/my-secret/versions/latest",
});
const secret = version.payload.data.toString();
```

---

## Docker 환경

```yaml
# compose.yaml
services:
  app:
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
```

- `env_file`은 **컨테이너를 실행할 때** 주입합니다. 이미지에 구워 넣는 `COPY .env`·`ENV API_KEY=...`와 달리 이미지를 공유해도 값이 따라가지 않습니다.
- `.dockerignore`에 `.env*`를 넣어 빌드 컨텍스트로 새어 들어가는 것을 막습니다.
- 환경변수 방식이 부담스러운 비밀은 파일로 마운트(Docker/Compose secrets)하는 방식도 있습니다. 이 문서에서는 확인하지 않았습니다(미확인).

---

## 🎯 체크리스트

### 개발

- [ ] .env를 .gitignore에 추가
- [ ] .env.example 작성 (값 비우기)
- [ ] 환경변수 존재 검증

### 프로덕션

- [ ] Secret Manager 사용 고려
- [ ] 비밀과 일반 설정을 구분해 저장
- [ ] 비밀마다 접근 권한 최소화 (앱은 자기 비밀만 읽기)
- [ ] 정기적 키 로테이션과 폐기 절차 준비
- [ ] 로그에 환경변수·토큰이 찍히지 않는지 확인
- [ ] 클라이언트 공개 변수에 비밀이 없는지 확인
- [ ] 저장소 비밀 스캔(push protection 등) 켜기

### 키가 유출됐다면

1. **즉시 폐기·재발급** (이력 삭제보다 먼저)
2. 사용 기록에서 오용 여부 확인
3. 새 키를 배포하고 구 키 비활성화
4. 재발 방지: 스캔 도구, `.gitignore`, 권한 범위 축소

---

## 주의사항

```typescript
// ❌ 클라이언트에 노출되는 환경변수 주의
// Next.js: NEXT_PUBLIC_* 만 브라우저에 노출
const apiKey = process.env.NEXT_PUBLIC_API_KEY; // 브라우저에 노출됨!

// ✅ 민감정보는 서버에서만 사용
const secretKey = process.env.SECRET_KEY; // 서버만
```

## 참고 자료

- [The Twelve-Factor App: III. Config](https://12factor.net/config) - 설정의 정의, 공개 가능 여부 점검 질문, 개별 환경변수
- [Node.js 환경변수 (`.env` 파일)](https://nodejs.org/api/environment_variables.html) - `--env-file`, `--env-file-if-exists`, 값이 문자열이라는 점
- [Node.js CLI `--env-file`](https://nodejs.org/api/cli.html) - v20.6.0 추가, 셸 환경변수 우선, 뒤 파일이 앞 파일을 덮어씀, 파일이 없으면 오류
- [Next.js 환경변수](https://nextjs.org/docs/app/guides/environment-variables) - 로딩 우선순위, `NEXT_PUBLIC_` 빌드 타임 인라인, 테스트에서 `.env.local` 무시
- [GitHub push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection) - 푸시 시점에 비밀을 차단(이미 올라간 값을 지우지는 않음)

확인일: 2026-10-22 (config 정의, `--env-file` 동작, Next.js 로딩 순서·인라인, push protection 범위. `process.loadEnvFile` 버전, Docker secrets, `docker inspect`·하위 프로세스 상속 동작은 경험칙·미확인)
