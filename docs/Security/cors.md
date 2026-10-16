# CORS (Cross-Origin Resource Sharing)

## CORS란?

> 브라우저가 다른 출처(origin)의 리소스 요청을 제어하는 보안 메커니즘

**출처(Origin) = 프로토콜 + 도메인 + 포트**

```
https://example.com:443  →  같은 출처
https://example.com:8080  →  다른 출처 (포트 다름)
https://api.example.com   →  다른 출처 (서브도메인 다름)
```

---

## 동작 방식

### Simple Request

GET, POST (일부)는 바로 요청

### Preflight Request

PUT, DELETE 등은 먼저 OPTIONS 요청

```
브라우저 → OPTIONS /api/users (Preflight)
서버     ← Access-Control-Allow-Origin: *
브라우저 → POST /api/users (실제 요청)
```

---

## 응답 헤더

| 헤더                               | 설명                |
| ---------------------------------- | ------------------- |
| `Access-Control-Allow-Origin`      | 허용 출처           |
| `Access-Control-Allow-Methods`     | 허용 메서드         |
| `Access-Control-Allow-Headers`     | 허용 헤더           |
| `Access-Control-Allow-Credentials` | 쿠키 허용           |
| `Access-Control-Max-Age`           | Preflight 캐시 시간 |

---

## Express 설정

```typescript
import cors from "cors";

// 모든 출처 허용 (개발용)
app.use(cors());

// 특정 출처만 허용 (프로덕션)
app.use(
  cors({
    origin: ["https://example.com", "https://app.example.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // 쿠키 포함
  })
);

// 동적 출처 검증
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = ["https://example.com"];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed"));
      }
    },
  })
);
```

---

## Nginx 설정

```nginx
location /api {
    add_header Access-Control-Allow-Origin "https://example.com";
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";

    if ($request_method = OPTIONS) {
        add_header Access-Control-Max-Age 86400;
        return 204;
    }
}
```

---

## 🎯 CORS 설정 체크리스트

### 개발

- [ ] 로컬 개발 시 프록시 사용 고려
- [ ] 와일드카드(\*) 사용 주의

### 프로덕션

- [ ] 특정 출처만 화이트리스트
- [ ] credentials: true 시 와일드카드 사용 불가
- [ ] 불필요한 메서드/헤더 허용 금지

---

## 흔한 에러

```
❌ Access to fetch has been blocked by CORS policy

원인:
1. 서버에 CORS 헤더 없음
2. 출처가 허용 목록에 없음
3. credentials 설정 불일치

해결:
1. 서버에 CORS 미들웨어 추가
2. 허용 출처 확인
3. 프론트/백엔드 credentials 설정 일치
```
