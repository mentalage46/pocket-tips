# JWT (JSON Web Token)

## JWT란?

> JSON 형식의 데이터를 안전하게 전달하기 위한 토큰 표준 (RFC 7519)

**특징**

- 자체 포함(Self-contained): 토큰 자체에 정보 포함
- 무상태(Stateless): 서버에서 세션 저장 불필요
- 서명으로 위/변조 검증 가능

---

## JWT 구조

```
xxxxx.yyyyy.zzzzz
  │      │      │
  │      │      └── Signature (서명)
  │      └── Payload (데이터)
  └── Header (알고리즘)
```

| 구성          | 내용                                 |
| ------------- | ------------------------------------ |
| **Header**    | 알고리즘(HS256, RS256 등), 토큰 타입 |
| **Payload**   | Claims - 사용자 정보, 만료시간 등    |
| **Signature** | Header + Payload를 비밀키로 서명     |

### 주요 Claims

- `sub` - 사용자 식별자
- `exp` - 만료 시간
- `iat` - 발급 시간
- `iss` - 발급자

---

## 일반적인 JWT 인증 흐름

### Access Token + Refresh Token 방식 ⭐

```
┌─────────┐                         ┌─────────┐
│  Client │                         │  Server │
└────┬────┘                         └────┬────┘
     │  1. 로그인 (ID/PW)                │
     │ ─────────────────────────────────>│
     │                                   │
     │  2. Access Token + Refresh Token  │
     │ <─────────────────────────────────│
     │                                   │
     │  3. API 요청 (Authorization 헤더) │
     │ ─────────────────────────────────>│
     │                                   │
     │  4. 응답                          │
     │ <─────────────────────────────────│
     │                                   │
     │  5. Access Token 만료 시          │
     │     Refresh Token으로 재발급 요청 │
     │ ─────────────────────────────────>│
     │                                   │
     │  6. 새 Access Token 발급          │
     │ <─────────────────────────────────│
```

### 토큰 역할

| 토큰              | 만료 시간         | 저장 위치             | 용도                |
| ----------------- | ----------------- | --------------------- | ------------------- |
| **Access Token**  | 짧음 (15분~1시간) | 메모리 / localStorage | API 인증            |
| **Refresh Token** | 김 (7일~30일)     | httpOnly Cookie       | Access Token 재발급 |

---

## 구현 체크리스트

### 토큰 발급

- [ ] Access Token 만료시간 짧게 (15분~1시간)
- [ ] Refresh Token은 httpOnly 쿠키에 저장
- [ ] Payload에 민감정보 넣지 않기 (비밀번호 ❌)

### 토큰 검증

- [ ] 모든 API 요청에서 서명 검증
- [ ] 만료시간(`exp`) 확인
- [ ] 필요시 발급자(`iss`) 확인

### 보안

- [ ] HTTPS 필수
- [ ] 비밀키 안전하게 관리 (환경변수)
- [ ] Refresh Token 탈취 대비 → Rotation 적용
- [ ] 로그아웃 시 Refresh Token 무효화 (블랙리스트/DB)

---

## 코드 예시

### 헤더 포맷

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Node.js (jsonwebtoken)

```javascript
// 발급
const token = jwt.sign({ sub: userId, role: "user" }, SECRET_KEY, {
  expiresIn: "1h",
});

// 검증
const decoded = jwt.verify(token, SECRET_KEY);
```

---

## 주의사항

- ⚠️ JWT는 암호화가 아닌 **인코딩** → Payload 누구나 볼 수 있음
- ⚠️ 토큰 크기가 커지면 매 요청마다 오버헤드 증가
- ⚠️ 발급된 토큰은 만료 전까지 무효화 어려움 → Refresh Token 전략 필수
