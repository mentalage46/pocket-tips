# OWASP Top 10

> 가장 흔한 웹 애플리케이션 보안 취약점 10가지

---

## 1. Broken Access Control (접근 제어 실패)

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

---

## 2. Cryptographic Failures (암호화 실패)

```typescript
// ❌ 평문 저장
db.save({ password: user.password });

// ✅ 해시 저장
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 12);
db.save({ password: hash });

// ✅ HTTPS 필수
// ✅ 민감정보 암호화 저장
```

---

## 3. Injection

```typescript
// ❌ SQL Injection 취약
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Parameterized Query
const query = "SELECT * FROM users WHERE id = $1";
db.query(query, [userId]);

// ✅ ORM 사용
User.findById(userId);
```

---

## 4. Insecure Design

- 위협 모델링 수행
- 보안 요구사항 정의
- 보안 설계 패턴 적용

---

## 5. Security Misconfiguration

```
✅ 기본 자격증명 변경
✅ 에러 메시지에 스택트레이스 숨김
✅ 불필요한 기능 비활성화
✅ 보안 헤더 설정
```

---

## 6. Vulnerable Components

```bash
# 취약점 검사
npm audit
npm audit fix

# 정기적 업데이트
npm update
```

---

## 7. Auth Failures (인증 실패)

```
✅ 강력한 비밀번호 정책
✅ MFA (다중 인증)
✅ 로그인 시도 제한 (Rate Limiting)
✅ 세션 타임아웃
```

---

## 8. Software Integrity Failures

```html
<!-- SRI (Subresource Integrity) -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"
></script>
```

---

## 9. Logging & Monitoring Failures

```
✅ 로그인 실패 기록
✅ 권한 거부 기록
✅ 의심스러운 활동 알림
✅ 로그 변조 방지
```

---

## 10. SSRF (Server-Side Request Forgery)

```typescript
// ❌ 취약
const response = await fetch(userProvidedUrl);

// ✅ URL 화이트리스트
const allowedHosts = ["api.example.com"];
const url = new URL(userProvidedUrl);
if (!allowedHosts.includes(url.hostname)) {
  throw new Error("Forbidden host");
}
```

---

## 🎯 보안 체크리스트

- [ ] 모든 입력값 검증
- [ ] Parameterized Query 사용
- [ ] 비밀번호 해시 저장 (bcrypt)
- [ ] HTTPS 필수
- [ ] 보안 헤더 설정
- [ ] 의존성 취약점 검사
- [ ] 로깅 & 모니터링
