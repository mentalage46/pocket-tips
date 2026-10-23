# OWASP Top 10

> 가장 흔한 웹 애플리케이션 보안 위험 10가지 (OWASP Top 10:2025 기준)

---

## 2021판과 달라진 점

| 변화 | 내용 |
| --- | --- |
| 신규 | **A03 Software Supply Chain Failures**: 2021판 A06 Vulnerable and Outdated Components를 공급망 전체로 넓힌 항목 |
| 신규 | **A10 Mishandling of Exceptional Conditions**: 잘못된 오류 처리, 논리 오류, 실패 시 열림(fail open) |
| 통합 | 2021판 A10 SSRF는 **A01 Broken Access Control**에 합쳐짐 |
| 이름 변경 | A07 Identification and Authentication Failures → Authentication Failures, A09 Security Logging and Monitoring Failures → Security Logging and Alerting Failures |
| 순위 변화 | Security Misconfiguration 5위 → 2위, Cryptographic Failures 2위 → 4위, Injection 3위 → 5위, Insecure Design 4위 → 6위 |

---

## A01. Broken Access Control (접근 제어 실패)

```typescript
// ❌ 취약한 코드
app.get("/users/:id", (req, res) => {
  const user = db.findById(req.params.id); // 권한 확인 없음
  res.json(user);
});

// ✅ 안전한 코드
app.get("/users/:id", authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const user = db.findById(req.params.id);
  res.json(user);
});
```

### SSRF (Server-Side Request Forgery)

2025판부터 이 항목에 포함됩니다. 서버가 사용자가 준 URL로 요청을 보내면 내부망이나 클라우드 메타데이터 주소에 접근할 수 있습니다.

```typescript
// ❌ 취약
const response = await fetch(userProvidedUrl);

// ✅ URL 허용 목록
const allowedHosts = ["api.example.com"];
const url = new URL(userProvidedUrl);
if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
  throw new Error("Forbidden host");
}
```

---

## A02. Security Misconfiguration (보안 설정 오류)

```
✅ 기본 자격증명 변경
✅ 에러 메시지에 스택트레이스 숨김
✅ 불필요한 기능·포트·샘플 앱 비활성화
✅ 보안 헤더 설정 (CSP, HSTS 등)
✅ 클라우드 스토리지 공개 권한 점검
```

보안 헤더는 [웹 공격과 방어](./web-attacks.md)를 참고합니다.

---

## A03. Software Supply Chain Failures (소프트웨어 공급망 실패)

알려진 취약점이 있는 의존성뿐 아니라, 악성 패키지·탈취된 빌드 도구·검증되지 않은 배포 경로까지 포함합니다.

```bash
# 취약점 검사
npm audit

# lockfile 그대로 설치 (CI)
npm ci
```

자세한 내용은 [공급망 보안](./supply-chain.md)을 참고합니다.

---

## A04. Cryptographic Failures (암호화 실패)

```typescript
// ❌ 평문 저장
db.save({ password: user.password });

// ✅ 비밀번호 전용 해시 함수로 저장
import * as argon2 from "argon2";
const hash = await argon2.hash(password); // 기본값이 argon2id
db.save({ password: hash });

// ✅ HTTPS 필수
// ✅ 민감정보 암호화 저장
```

비밀번호 해시 선택은 [인증과 비밀번호 저장](./auth-and-passwords.md)을 참고합니다.

---

## A05. Injection

```typescript
// ❌ SQL Injection 취약
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Parameterized Query
const query = "SELECT * FROM users WHERE id = $1";
db.query(query, [userId]);

// ✅ ORM 사용
User.findById(userId);
```

XSS도 이 항목에 속합니다. [웹 공격과 방어](./web-attacks.md)를 참고합니다.

---

## A06. Insecure Design (안전하지 않은 설계)

- 위협 모델링 수행
- 보안 요구사항 정의
- 보안 설계 패턴 적용 (예: 비밀번호 재설정 흐름, 결제 한도)

---

## A07. Authentication Failures (인증 실패)

```
✅ 유출 비밀번호 목록 대조, 길이 중심 비밀번호 정책
✅ MFA (다중 인증)
✅ 로그인 시도 제한 (Rate Limiting)
✅ 세션 타임아웃, 로그아웃 시 세션 무효화
```

---

## A08. Software or Data Integrity Failures (소프트웨어·데이터 무결성 실패)

```html
<!-- SRI (Subresource Integrity) -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"
></script>
```

- 신뢰할 수 없는 데이터의 역직렬화 금지
- 자동 업데이트·배포 산출물의 서명 확인

---

## A09. Security Logging and Alerting Failures (보안 로깅·알림 실패)

```
✅ 로그인 실패 기록
✅ 권한 거부 기록
✅ 의심스러운 활동 알림 (기록만 하고 아무도 보지 않으면 소용없음)
✅ 로그 변조 방지
```

---

## A10. Mishandling of Exceptional Conditions (예외 상황 처리 실패)

오류가 났을 때 시스템이 안전한 쪽으로 멈추지 않고 열려 버리거나(fail open), 오류 메시지가 내부 정보를 드러내는 문제입니다.

```typescript
// ❌ 실패 시 열림: 권한 서비스가 죽으면 모두 통과
async function canAccess(user, resource) {
  try {
    return await authz.check(user, resource);
  } catch {
    return true;
  }
}

// ✅ 실패 시 닫힘: 오류는 기록하고 거부
async function canAccess(user, resource) {
  try {
    return await authz.check(user, resource);
  } catch (err) {
    logger.error({ err }, "authz check failed");
    return false;
  }
}
```

```
✅ 예외를 삼키지 않는다 (빈 catch 금지)
✅ 트랜잭션 중간 실패 시 롤백
✅ 사용자에게는 일반 메시지, 상세는 로그로
✅ 자원 한도(메모리, 파일 핸들, 타임아웃) 초과 시 동작 정의
```

예외 처리 설계는 [예외 처리 전략](../Quality/exception-handling-strategy.md)을 참고합니다.

---

## 🎯 보안 체크리스트

- [ ] 모든 요청에서 서버 측 권한 확인
- [ ] 모든 입력값 검증, Parameterized Query 사용
- [ ] 비밀번호는 argon2id 등 전용 해시로 저장
- [ ] HTTPS 필수, 보안 헤더 설정
- [ ] lockfile 고정 설치와 의존성 취약점 검사
- [ ] 오류 시 실패 닫힘(fail closed)
- [ ] 보안 이벤트 로깅과 알림

## 참고 자료

- [OWASP Top 10:2025](https://top10.owasp.org/2025/) - 항목 목록과 순서
- [OWASP Top 10:2025 Introduction](https://top10.owasp.org/2025/0x00_2025-Introduction/) - 2021판 대비 신규·통합·이름 변경

확인일: 2026-10-22 (항목 이름·순서·변경 사항)
