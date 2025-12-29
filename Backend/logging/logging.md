# Logging

## 로깅이란?

> 애플리케이션의 실행 상태, 에러, 이벤트를 기록하는 것

**왜 중요한가?**

- 디버깅 & 트러블슈팅
- 모니터링 & 알림
- 보안 감사
- 성능 분석

---

## 로깅 레벨

| 레벨      | 용도              | 예시                     |
| --------- | ----------------- | ------------------------ |
| **ERROR** | 에러, 예외 상황   | DB 연결 실패, API 에러   |
| **WARN**  | 경고, 잠재적 문제 | 메모리 부족 경고, 재시도 |
| **INFO**  | 주요 이벤트       | 서버 시작, 사용자 로그인 |
| **DEBUG** | 디버깅 정보       | 함수 호출, 변수 값       |
| **TRACE** | 상세 추적         | 모든 실행 흐름           |

### 환경별 레벨 설정

```
Production:  ERROR, WARN, INFO
Staging:     ERROR, WARN, INFO, DEBUG
Development: 모든 레벨
```

---

## 구조화된 로깅 (Structured Logging)

### 일반 로그 vs 구조화된 로그

```
# ❌ 일반 텍스트 로그
[2024-01-01 10:00:00] User 123 logged in from 192.168.1.1

# ✅ 구조화된 로그 (JSON)
{
  "timestamp": "2024-01-01T10:00:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": 123,
  "ip": "192.168.1.1",
  "userAgent": "Chrome/120",
  "requestId": "abc-123"
}
```

### 장점

- **검색 용이**: 특정 필드로 필터링
- **분석 가능**: 집계, 통계 추출
- **일관성**: 표준화된 형식
- **도구 연동**: ELK, Datadog 등과 쉽게 연동

---

## 로깅 라이브러리

### Node.js - Winston

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// 사용
logger.info("User logged in", { userId: 123, ip: "192.168.1.1" });
logger.error("Database connection failed", { error: err.message });
```

### Node.js - Pino (고성능)

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty", // 개발용
    options: { colorize: true },
  },
});

logger.info({ userId: 123, action: "login" }, "User logged in");
```

---

## 필수 로깅 항목

### 요청/응답 로그

```typescript
// 미들웨어로 자동 기록
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: req.id,
      userId: req.user?.id,
    });
  });

  next();
});
```

### 에러 로그

```typescript
logger.error({
  message: "Payment failed",
  error: {
    name: err.name,
    message: err.message,
    stack: err.stack,
  },
  context: {
    userId: 123,
    orderId: 456,
    amount: 10000,
  },
});
```

### 비즈니스 이벤트

```typescript
logger.info({
  event: "order_created",
  orderId: 456,
  userId: 123,
  amount: 50000,
  items: 3,
});
```

---

## Request ID (추적성)

```typescript
import { v4 as uuid } from 'uuid';

// 요청마다 고유 ID 부여
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuid();
  res.setHeader('x-request-id', req.id);
  next();
});

// 모든 로그에 포함
logger.info({ requestId: req.id, ... });
```

---

## 로그 수집 & 관리

### 로그 스택

```
App → Log Shipper → Log Storage → Visualization
     (Fluentd)      (Elasticsearch)  (Kibana)
```

### 주요 도구

| 도구               | 역할                              |
| ------------------ | --------------------------------- |
| **ELK Stack**      | Elasticsearch + Logstash + Kibana |
| **Loki + Grafana** | 경량 로그 수집                    |
| **Datadog**        | 통합 모니터링 (SaaS)              |
| **AWS CloudWatch** | AWS 네이티브                      |

### Docker 로그 수집

```yaml
# docker-compose.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🎯 로깅 전략 선택 체크리스트

### 로깅 레벨

- [ ] 환경별 레벨 분리 (prod: info, dev: debug)
- [ ] 민감정보는 절대 로깅하지 않음
- [ ] 에러 시 스택트레이스 포함

### 형식

- [ ] 구조화된 로그 (JSON) 사용
- [ ] 타임스탬프 포함 (ISO 8601)
- [ ] Request ID로 추적성 확보

### 수집

- [ ] 로그 파일 로테이션 설정
- [ ] 중앙 집중식 로그 수집 고려
- [ ] 알림 설정 (에러 발생 시)

---

## 주의사항

```typescript
// ❌ 민감정보 로깅 금지
logger.info({ password: user.password }); // 절대 안됨
logger.info({ creditCard: cardNumber }); // 절대 안됨

// ✅ 마스킹 처리
logger.info({ email: maskEmail(user.email) });

// ❌ 과도한 로깅
for (const item of items) {
  logger.debug({ item }); // 10만 건이면 10만 줄
}

// ✅ 요약 로깅
logger.debug({ itemCount: items.length });
```

---

## 요약

```
로깅 원칙:
1. 구조화된 로그 (JSON)
2. 적절한 레벨 사용
3. 추적 ID 포함
4. 민감정보 제외
5. 중앙 수집 & 모니터링
```
