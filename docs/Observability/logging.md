# Logging

## 로깅이란?

> 애플리케이션의 실행 상태, 에러, 이벤트를 기록하는 것

**왜 중요한가?**

- 디버깅 & 트러블슈팅
- 모니터링 & 알림
- 보안 감사
- 성능 분석

---

## 개념: 로그는 무엇이고 무엇이 아닌가

### 관측성의 세 신호

| 신호 | 질문 | 형태 | 예 |
| --- | --- | --- | --- |
| **로그** | **무슨 일이 일어났나?** | 시간순 개별 이벤트 | `"user 123 login failed: bad password"` |
| **메트릭** | **얼마나, 어떤 추세인가?** | 숫자 집계(시계열) | 초당 요청 수, 에러율, p95 지연 |
| **트레이스** | **요청이 어디를 거쳐 어디서 느렸나?** | 서비스·함수 호출의 연결 | 주문 요청 → 결제 → 재고 호출 시간 |

- **알림과 추세는 메트릭**으로, **원인 파악은 로그와 트레이스**로 합니다. "에러율이 올랐다"(메트릭)는 알림을 받고, 해당 시간대의 로그에서 이유를 찾습니다.
- 로그로 모든 것을 하려 하면(로그에서 건수를 세어 대시보드를 만들기 등) 비용과 지연이 커집니다. 자주 세는 것은 처음부터 메트릭으로 만듭니다([메트릭, 트레이싱, 헬스체크](./metrics-and-tracing.md)).

### 로그는 이벤트 스트림이다 (Twelve-Factor)

12-factor는 로그를 **"시간 순서로 모인 이벤트 스트림"**으로 보고, 앱이 **로그의 라우팅이나 저장에 관여하지 않아야 한다**고 합니다. 앱은 버퍼링 없이 **표준 출력(stdout)에 쓰기만** 하고, 수집·보관·검색은 실행 환경(Docker, Kubernetes, 클라우드)이 맡습니다.

```
앱 → stdout → [실행 환경이 수집] → 로그 저장소 → 검색/알림
```

- 앱 안에서 로그 파일을 열고 로테이션하는 코드를 쓰지 않아도 됩니다. 컨테이너에서는 특히 그렇습니다. 아래 Winston 예시의 `File` transport는 이 원칙과 거리가 있으므로, 컨테이너 환경에서는 `Console`만 쓰고 수집은 환경에 맡깁니다.
- 목적지가 바뀌어도(파일 → Loki → Datadog) 앱 코드는 그대로입니다.

### 좋은 로그 한 줄의 조건

로그는 나중에 **검색하고 집계하기 위해** 씁니다. OWASP는 이벤트마다 "언제, 어디서, 누가, 무엇을"을 남기라고 합니다.

| 질문 | 필드 예 |
| --- | --- |
| 언제 | 로그 시각, 이벤트 시각, 요청을 묶는 ID |
| 어디서 | 서비스 이름·버전, 호스트, 코드 위치(모듈) |
| 누가 | 사용자 ID, 클라이언트 IP (사람 또는 시스템) |
| 무엇을 | 이벤트 종류, 심각도, 설명 |

```typescript
// ❌ 변하는 값이 메시지에 섞여 있어 그룹화·집계가 어려움
logger.info(`User ${userId} paid ${amount} for order ${orderId}`);

// ✅ 메시지는 고정, 값은 필드로
logger.info({ event: "payment.completed", userId, amount, orderId }, "payment completed");
```

- 메시지가 고정되어 있으면 `event = "payment.completed"`로 **건수·추세를 집계**하고 필드로 필터링할 수 있습니다.
- 값이 무한히 늘어나는 필드(사용자 ID 등)를 **메트릭 라벨**로 쓰면 비용이 폭증하지만, 로그 필드로는 괜찮습니다. 신호마다 쓰임이 다릅니다.

### 요청을 따라가기: 상관관계 ID와 W3C Trace Context

요청 하나가 서비스 여러 개를 지나면 로그가 흩어집니다. **같은 ID를 모든 로그에 붙이면** 한 요청의 경로를 모아 볼 수 있습니다. 직접 만든 `x-request-id`도 되지만, 표준이 있습니다.

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             └┬┘ └──────────── trace-id (32 hex) ─────────┘ └ parent-id (16 hex) ┘ └ flags
          version
```

- **W3C Trace Context**(Recommendation, 2021-11)는 `traceparent` 헤더로 `trace-id`(요청 전체)와 `parent-id`(현재 구간)를 전달하는 표준입니다. 마지막 비트는 `sampled` 플래그입니다.
- 서비스 간 호출 때 이 헤더를 **그대로 전달**하고, 로그에 `trace-id`를 필드로 남기면 로그와 트레이스를 서로 연결할 수 있습니다. 트레이싱 도구를 쓰지 않아도 같은 규칙으로 ID를 전파하면 나중에 도입하기 쉽습니다.

### 로그는 무기도 된다: 인젝션과 민감정보

**로그 인젝션**: 사용자 입력에 줄바꿈이 들어 있으면 공격자가 **가짜 로그 줄**을 끼워 넣을 수 있습니다. 텍스트 로그와 JSON 로그를 비교한 결과입니다(Node에서 확인).

```
[텍스트 로그]
2026-10-22T09:59:59.000Z INFO login failed user=kim
2026-10-22T10:00:00Z INFO admin logged in from 10.0.0.1      ← 공격자가 만든 가짜 줄

[JSON 로그]
{"time":"...","msg":"login failed","user":"kim\n2026-10-22T10:00:00Z INFO admin logged in ..."}   ← 한 줄로 이스케이프됨
```

- JSON처럼 **직렬화 시 줄바꿈을 이스케이프하는 형식**이 인젝션에 유리합니다. 그래도 OWASP는 로그에 쓰는 모든 이벤트 데이터를 정화(sanitize)하라고 합니다. 다른 신뢰 영역에서 온 데이터는 신뢰하지 않습니다.

**로그에 남기면 안 되는 것** (OWASP): 비밀번호, 액세스 토큰, 암호화 키, DB 연결 문자열, 카드 정보. 세션 ID는 가급적 피하고 필요하면 해시 값을 씁니다. 개인정보(PII)도 필요 없으면 남기지 않거나 비식별화합니다.

**로그를 지켜야 하는 것**: 변조 감지, 읽기 권한 제한, 로그에 대한 접근 모니터링, 신뢰할 수 없는 네트워크를 지날 때 보안 전송. 모든 서버의 **시간 동기화**도 필요합니다. 시각이 어긋나면 서비스 간 로그를 시간순으로 맞출 수 없습니다.

### 무엇을 남길 것인가

OWASP가 항상 남기라고 하는 이벤트: 입력 검증 실패, 인증 성공·실패, 권한 거부, 세션 관리 실패, 애플리케이션 오류, 시작·종료. 위험도가 높은 행위(사용자 관리, 관리자 작업, 민감 데이터 접근)도 남깁니다. 이는 [OWASP A09 보안 로깅·알림 실패](../Security/owasp-top-10.md#a09-security-logging-and-alerting-failures-보안-로깅알림-실패)와 직접 연결됩니다.

### 로그의 비용

- 로그는 **저장·전송·검색에 모두 비용**이 듭니다. 한 줄이 작아도 요청마다 남기면 큰 양이 됩니다.
- 정상 경로의 `DEBUG`를 운영에서 계속 켜 두거나, **같은 에러를 `catch`마다 기록하고 다시 throw**해서 한 장애가 로그 수십 줄이 되는 일을 피합니다. 에러는 **처리하는 지점에서 한 번** 기록합니다.
- 보관 기간은 용도로 정합니다. 장애 분석은 며칠~몇 주, 보안 감사는 더 길게. 긴 보관이 필요한 이벤트(감사 로그)는 일반 애플리케이션 로그와 분리합니다.

---

## 로깅 레벨

| 레벨      | 용도              | 예시                     |
| --------- | ----------------- | ------------------------ |
| **FATAL** | 프로세스가 계속 못 돌아가는 치명적 오류 | 시작 시 필수 설정 누락, 복구 불가 |
| **ERROR** | 에러, 예외 상황   | DB 연결 실패, API 에러   |
| **WARN**  | 경고, 잠재적 문제 | 메모리 부족 경고, 재시도 |
| **INFO**  | 주요 이벤트       | 서버 시작, 사용자 로그인 |
| **DEBUG** | 디버깅 정보       | 함수 호출, 변수 값       |
| **TRACE** | 상세 추적         | 모든 실행 흐름           |

**레벨의 기준은 "누가 언제 봐야 하는가"입니다.**

- `ERROR`/`FATAL`: 사람이 **지금 확인해야 하는** 것 (알림 대상). 정상적인 비즈니스 결과(로그인 실패, 검증 오류)까지 `ERROR`로 남기면 알림이 소음이 되어 진짜 장애를 놓칩니다.
- `WARN`: 지금은 동작하지만 **지켜봐야 하는** 것 (재시도 성공, 임계치 근접)
- `INFO`: 시스템 **상태 변화와 주요 비즈니스 이벤트**
- `DEBUG`/`TRACE`: 개발·진단용. 운영에서는 평소 끄고 필요할 때 일시적으로 올립니다.

> 로깅 라이브러리의 레벨 체계는 숫자 기준이 있습니다. Pino는 `trace` 10, `debug` 20, `info` 30, `warn` 40, `error` 50, `fatal` 60이고, **기본 레벨은 `info`**입니다. 설정한 최소 레벨 미만은 출력하지 않습니다.

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

> **Pino의 `redact`**: 지정한 경로의 값을 `[Redacted]`로 바꿔 출력합니다. 기본값은 비어 있으므로(`undefined`) **설정하지 않으면 아무것도 가려지지 않습니다.** `password`, `authorization` 헤더 같은 경로를 미리 지정해 둡니다. 또한 Pino는 기본으로 `pid`와 `hostname`을 모든 줄에 붙입니다(`base` 옵션으로 변경).

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

## 참고 자료

- [The Twelve-Factor App: XI. Logs](https://12factor.net/logs) - 로그는 이벤트 스트림, stdout, 실행 환경이 수집·라우팅
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - 기록할 이벤트, 남기면 안 되는 데이터, 로그 인젝션 정화, 무결성·접근 통제, 시간 동기화, when/where/who/what
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) - `traceparent` 형식(Recommendation, 2021-11-23)
- [Pino API](https://github.com/pinojs/pino/blob/main/docs/api.md) - 레벨 숫자값, 기본 레벨 `info`, `redact`, `base`

확인일: 2026-10-22 (12-factor, OWASP 권고, `traceparent` 형식, Pino 레벨·`redact` 기본값. 로그 인젝션 비교 출력은 Node 24.13에서 실행 확인. 로그·메트릭·트레이스 구분, 레벨 선택 기준, 에러 이중 기록, 보관 기간은 일반 개념·경험칙. 아래 Winston·Fluentd·ELK·Docker 로그 수집 예시는 미확인)
