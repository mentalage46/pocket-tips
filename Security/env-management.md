# 환경변수 관리

## 왜 중요한가?

> 민감정보(API 키, DB 비밀번호)를 코드와 분리

**원칙**

- 코드에 비밀 하드코딩 금지
- .env 파일 Git 커밋 금지
- 환경별 설정 분리

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
.env              # 기본 (개발)
.env.local        # 로컬 오버라이드
.env.production   # 프로덕션
.env.test         # 테스트
```

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
# docker-compose.yml
services:
  app:
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
```

---

## 🎯 체크리스트

### 개발

- [ ] .env를 .gitignore에 추가
- [ ] .env.example 작성 (값 비우기)
- [ ] 환경변수 존재 검증

### 프로덕션

- [ ] Secret Manager 사용 고려
- [ ] 환경변수 암호화
- [ ] 접근 권한 최소화
- [ ] 정기적 키 로테이션

---

## 주의사항

```typescript
// ❌ 클라이언트에 노출되는 환경변수 주의
// Next.js: NEXT_PUBLIC_* 만 브라우저에 노출
const apiKey = process.env.NEXT_PUBLIC_API_KEY; // 브라우저에 노출됨!

// ✅ 민감정보는 서버에서만 사용
const secretKey = process.env.SECRET_KEY; // 서버만
```
