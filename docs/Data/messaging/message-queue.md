# Message Queue

## 메시지 큐란?

> 시스템 간 비동기 통신을 위한 중간 저장소

**왜 필요한가?**

- **비동기 처리**: 즉시 응답 필요 없는 작업 분리
- **부하 분산**: 작업을 순차적으로 처리
- **시스템 분리**: 서비스 간 결합도 낮춤
- **장애 내성**: 일시적 장애 시에도 메시지 보존

```
Producer → [Queue] → Consumer
(보내는 쪽)  (저장)   (받는 쪽)
```

---

## 개념: 큐는 시간을 분리하는 대신 확실성을 내준다

### 무엇을 얻고 무엇을 내주는가

동기 호출은 **받는 쪽이 지금 살아 있고 충분히 빨라야** 합니다. 큐를 두면 보내는 쪽은 "맡겨 두면 끝"이 되어 **시간적으로 분리**되고, 받는 쪽은 자기 속도로 처리해 **부하가 평탄화**됩니다.

| 얻는 것 | 내주는 것 |
| --- | --- |
| 받는 쪽 장애·지연이 보내는 쪽에 번지지 않음 | **즉시 결과를 알 수 없음** (최종 일관성) |
| 트래픽 급증을 큐가 흡수 | 메시지 **중복·순서 뒤바뀜**을 직접 다뤄야 함 |
| 소비자를 늘려 처리량 확장 | 디버깅과 추적이 어려워짐 (요청 한 건이 여러 곳에 흩어짐) |
| 재시도가 쉬움 | 운영할 인프라와 모니터링이 늘어남 |

> 응답에 결과가 **바로 필요한** 흐름(로그인, 결제 승인 확인)은 큐로 풀면 오히려 복잡해집니다. 큐는 "나중에 처리해도 되는 일"에 씁니다.

### 두 가지 모델: 큐와 로그

| 구분 | 큐(Queue) 모델 | 로그(Log) 모델 |
| --- | --- | --- |
| 메시지 수명 | **소비(ack)되면 사라짐** | **보관 기간 동안 남음** (소비해도 삭제 안 됨) |
| 소비자 | 같은 큐의 소비자들이 **경쟁**해서 나눠 가짐 | 소비자(그룹)마다 **자기 읽은 위치**를 관리 |
| 재처리 | 어렵다 (이미 삭제됨) | 위치를 되돌려 **다시 읽을 수 있음** |
| 예 | RabbitMQ, SQS | Kafka |

Kafka는 "이벤트는 소비 후에도 삭제되지 않고 토픽별 설정으로 보관된다", "토픽은 파티션으로 나뉘며 같은 키의 이벤트는 같은 파티션에 쌓인다", "소비자는 파티션의 이벤트를 쓰인 순서대로 읽는다"고 설명합니다. 즉 **순서 보장은 파티션 안에서만**이고, 토픽 전체의 순서는 아닙니다.

### 전달 보장: 한 번만 처리되는 메시지는 없다

| 보장 | 의미 | 문제 |
| --- | --- | --- |
| at-most-once | 많아야 한 번 전달 | **유실 가능** |
| at-least-once | 최소 한 번 전달 | **중복 가능** |
| exactly-once | 정확히 한 번 | 브로커만으로 달성하기 어렵고 범위가 제한적 |

- 대부분의 큐는 **at-least-once**입니다. 소비자가 메시지를 받고 처리하다가 ack 전에 죽으면 **다시 전달**하기 때문입니다.
- **RabbitMQ**: 수동 ack를 쓰면 ack되지 않은 메시지는 채널·연결이 닫힐 때 **재큐잉**됩니다. 문서는 소비자가 **재전달을 처리할 준비가 되어 있어야 한다**고 하고, 자동 ack(받는 즉시 처리 완료로 간주)는 **안전하지 않다**고 경고합니다.
- **SQS 표준 큐**: 문서가 "같은 메시지가 두 번 이상 전달될 수 있고 순서가 바뀔 수 있다"고 명시합니다.
- **Redis Pub/Sub**은 **at-most-once**입니다. 구독자가 연결이 끊겨 있거나 처리에 실패하면 메시지는 **영영 사라집니다.** 메시지를 보존하려면 Redis Streams를 씁니다(Redis 문서). 그래서 Pub/Sub은 "유실돼도 되는 실시간 알림"에만 맞고 작업 큐로는 부적합합니다.
- 결국 안전한 설계는 **at-least-once 전달 + 멱등한 소비자**입니다. "정확히 한 번 처리"는 중복이 와도 결과가 한 번만 반영되게 소비자를 만들어 달성합니다.

### 언제 ack 하는가

```
받음 → 처리 → 성공하면 ack      ✅ 처리 중 죽으면 재전달 (중복 가능, 유실 없음)
받음 → ack → 처리               ❌ 처리 중 죽으면 유실
```

처리를 **끝낸 뒤** ack합니다. 대신 중복을 감수해야 하므로 멱등성이 필요합니다.

### 처리 시간이 길면: 가시성 타임아웃 (SQS)

SQS는 메시지를 받으면 **일정 시간 다른 소비자에게 보이지 않게** 합니다. 이 시간 안에 삭제하지 못하면 **다시 보여서 다른 소비자가 중복 처리**합니다.

- 기본 30초, 최대 12시간입니다.
- 처리 시간이 길어질 수 있으면 `ChangeMessageVisibility`로 **연장**(heartbeat)하거나, 처리 시간에 맞춰 타임아웃을 설정합니다. 너무 길게 잡으면 실패한 메시지의 재시도가 늦어집니다.

### 실패한 메시지: 포이즌 메시지와 DLQ

항상 실패하는 메시지(데이터 오류, 버그)는 **무한히 재시도되며 큐를 막습니다.** 최대 재시도 횟수를 정하고, 초과한 메시지는 **Dead-Letter Queue(DLQ)**로 옮겨 원인을 분석합니다. DLQ는 만들고 끝이 아니라 **쌓이는 것을 알림으로 감시**해야 합니다.

### DB와 메시지의 정합성: 이중 쓰기 문제

```typescript
await db.orders.insert(order);        // 1. DB 커밋
await queue.publish("order.created"); // 2. 발행 ← 여기서 죽으면 주문은 있는데 이벤트는 없음
```

DB와 큐는 하나의 트랜잭션으로 묶을 수 없습니다. 해결책이 **트랜잭셔널 아웃박스**입니다. 같은 DB 트랜잭션에서 이벤트를 `outbox` 테이블에도 저장하고, 별도 프로세스가 이를 읽어 발행합니다([이벤트 기반 아키텍처](../../Architecture/styles/event-driven.md)).

### 운영에서 봐야 하는 지표

| 지표 | 의미 |
| --- | --- |
| 큐 깊이 / 소비 지연(lag) | 생산 속도가 소비 속도를 앞서고 있는가 (백프레셔) |
| 가장 오래된 메시지의 나이 | 처리가 막혔는가 |
| 재전달·실패 횟수 | 포이즌 메시지, 소비자 오류 |
| DLQ 크기 | 처리하지 못한 메시지가 쌓이는가 |

### 크기와 보관 한도 (SQS 예)

메시지 크기는 최대 **1 MiB**, 보관은 기본 **4일**(최대 14일)입니다. 더 큰 페이로드는 **본문을 S3 같은 저장소에 두고 참조만 메시지에 담는** 방식을 씁니다(claim check).

---

## 사용 사례

| 사례            | 설명                                |
| --------------- | ----------------------------------- |
| **이메일 발송** | 회원가입 후 환영 메일 비동기 발송   |
| **이미지 처리** | 업로드 후 리사이징/압축 비동기 처리 |
| **알림 전송**   | 푸시, SMS 등 외부 API 호출          |
| **주문 처리**   | 결제 완료 후 재고 차감, 배송 요청   |
| **로그 수집**   | 대량 로그 비동기 저장               |

---

## 대표 도구 비교

| 도구                | 특징                              | 적합한 경우            |
| ------------------- | --------------------------------- | ---------------------- |
| **RabbitMQ**        | 전통적 메시지 브로커, 다양한 패턴 | 일반적인 작업 큐       |
| **Kafka**           | 고성능, 이벤트 스트리밍           | 대용량 실시간 처리     |
| **Redis (Pub/Sub)** | 단순, 빠름. **메시지를 저장하지 않음(at-most-once)** | 유실돼도 되는 실시간 알림 (작업 큐는 Streams나 BullMQ) |
| **AWS SQS**         | 완전 관리형                       | AWS 환경               |
| **Bull/BullMQ**     | Node.js + Redis 기반              | Node.js 프로젝트       |

---

## RabbitMQ

### 기본 개념

```
Producer → Exchange → Queue → Consumer
              │
         Routing Key
```

### Node.js 예제 (amqplib)

```typescript
import amqp from "amqplib";

// 연결
const connection = await amqp.connect("amqp://localhost");
const channel = await connection.createChannel();

// 큐 생성
await channel.assertQueue("email-queue", { durable: true });

// 메시지 발행 (Producer)
channel.sendToQueue(
  "email-queue",
  Buffer.from(
    JSON.stringify({
      to: "user@example.com",
      subject: "Welcome",
      body: "가입을 환영합니다!",
    })
  ),
  { persistent: true }
);

// 메시지 소비 (Consumer)
channel.consume("email-queue", async (msg) => {
  const data = JSON.parse(msg.content.toString());
  await sendEmail(data);
  channel.ack(msg); // 처리 완료 확인
});
```

---

## Kafka

### 기본 개념

```
Producer → Topic (Partition) → Consumer Group
              │
         여러 파티션으로 분산
```

### 특징

- **로그 기반**: 메시지를 영구 저장
- **고성능**: 초당 수백만 메시지 처리
- **순서 보장**: 파티션 내 순서 보장
- **리플레이**: 과거 메시지 재처리 가능

### Node.js 예제 (kafkajs)

```typescript
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "my-app",
  brokers: ["localhost:9092"],
});

// Producer
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: "orders",
  messages: [
    {
      key: "order-123",
      value: JSON.stringify({ orderId: 123, amount: 50000 }),
    },
  ],
});

// Consumer
const consumer = kafka.consumer({ groupId: "order-processor" });
await consumer.connect();
await consumer.subscribe({ topic: "orders", fromBeginning: true });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const order = JSON.parse(message.value.toString());
    await processOrder(order);
  },
});
```

---

## BullMQ (Node.js 추천)

### 특징

- Redis 기반으로 간단
- 재시도, 지연, 우선순위 내장
- 대시보드 지원 (Bull Board)

> **BullMQ가 쓰는 Redis는 `maxmemory-policy`를 `noeviction`으로 설정해야 합니다.** BullMQ 문서는 Redis가 키를 임의로 쫓아내면 큐가 올바르게 동작할 수 없고 `noeviction`이 올바른 동작을 보장하는 유일한 설정이라고 합니다. 캐시용으로 `allkeys-lru`를 쓰는 Redis와는 **인스턴스를 분리**해야 합니다([Redis eviction](../caching/redis.md#redis는-메모리가-한정된-저장소다-키가-쫓겨나는-규칙)).

### 예제

```typescript
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis();

// 큐 생성
const emailQueue = new Queue("email", { connection });

// 작업 추가
await emailQueue.add(
  "send-email",
  {
    to: "user@example.com",
    subject: "Welcome",
  },
  {
    attempts: 3, // 재시도 3회
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
  }
);

// 워커 (작업 처리)
const worker = new Worker(
  "email",
  async (job) => {
    await sendEmail(job.data);
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

---

## 메시지 패턴

### 1. Work Queue (작업 분배)

```
Producer → Queue → Consumer 1
                → Consumer 2
                → Consumer 3
```

여러 워커가 작업 분담

### 2. Pub/Sub (구독)

```
Publisher → Exchange → Queue A → Consumer A
                    → Queue B → Consumer B
```

하나의 메시지를 여러 곳에 전달

### 3. Request/Reply (RPC)

```
Client → Request Queue → Server
      ← Reply Queue   ←
```

응답이 필요한 비동기 통신

---

## 🎯 메시지 큐 선택 체크리스트

**RabbitMQ 선택**

- [ ] 다양한 메시징 패턴 필요 (pub/sub, routing)
- [ ] 복잡한 라우팅 규칙 필요
- [ ] 메시지 우선순위 필요
- [ ] 트랜잭션/확인 응답 중요

**Kafka 선택**

- [ ] 대용량 데이터 (초당 수만 건 이상)
- [ ] 이벤트 소싱 / 로그 기반 아키텍처
- [ ] 메시지 리플레이 필요
- [ ] 실시간 스트리밍 처리

**BullMQ/Redis 선택**

- [ ] Node.js 프로젝트
- [ ] 구현 단순성 우선
- [ ] 작업 큐 용도 (이메일, 이미지 처리)
- [ ] 이미 Redis 사용 중

**AWS SQS 선택**

- [ ] AWS 환경
- [ ] 운영 부담 최소화
- [ ] 자동 스케일링 필요

---

## 주의사항

```
- ⚠️ 메시지 중복 처리 대비 (멱등성 보장)
- ⚠️ 순서 보장 필요 여부 확인
- ⚠️ Dead Letter Queue 설정 (실패 메시지 보관)
- ⚠️ 메시지 크기 제한 확인
- ⚠️ 모니터링 & 알림 설정
```

### 멱등성 보장

같은 메시지가 여러 번 와도 **결과가 한 번만 반영**되게 만드는 것입니다. 흔한 실수는 "조회 후 처리"입니다.

```typescript
// ❌ 조회 → 처리 → 갱신 사이에 틈이 있음
// 소비자 A와 B가 동시에 같은 메시지를 받으면 둘 다 existing.processed === false를 보고 처리해 버림
const existing = await db.orders.findById(order.id);
if (existing?.processed) return;
await processOrder(order);                                  // 외부 효과(결제, 메일)가 두 번 발생
await db.orders.update(order.id, { processed: true });
```

**해결: 처리 이력을 유니크 키로 원자적으로 기록**하고, 삽입에 성공한 쪽만 처리합니다.

```sql
CREATE TABLE processed_messages (
  message_id TEXT PRIMARY KEY,           -- 메시지 고유 ID (브로커 ID 또는 비즈니스 ID)
  processed_at TIMESTAMP DEFAULT now()
);

-- 소비자는 하나의 트랜잭션에서:
INSERT INTO processed_messages(message_id) VALUES ($1)
ON CONFLICT DO NOTHING;                  -- 영향 행이 0이면 이미 처리된 메시지 → 건너뜀
-- 영향 행이 1이면 같은 트랜잭션에서 비즈니스 처리를 수행하고 커밋
```

SQLite로 같은 구조를 실행해 확인한 결과(`INSERT OR IGNORE`)입니다. 같은 `message_id`를 재전달해도 두 번째는 영향 행이 0이어서 `payments`에는 한 건만 남습니다.

```
첫 번째 전달  → inserted = 1 → 결제 행 삽입
재전달        → inserted = 0 → 건너뜀
payments 행 수 = 1
```

- 처리 이력과 **비즈니스 변경을 같은 DB 트랜잭션**에 넣어야 "이력은 기록됐는데 처리는 안 됨"이 생기지 않습니다.
- 결제·메일처럼 **DB 밖의 효과**는 외부 서비스의 **멱등 키**를 함께 전달합니다([API 설계: 멱등 키](../../API/api-design.md#http-메서드의-의미-안전safe과-멱등idempotent)).
- 이력 테이블은 무한히 커지므로 **보관 기간**(재전달이 가능한 최대 기간보다 길게)을 정해 정리합니다.

---

## 요약

```
간단한 작업 큐     → BullMQ (Node.js) / RabbitMQ
대용량 이벤트 처리 → Kafka
AWS 환경          → SQS
```

## 참고 자료

- [RabbitMQ: Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms) - 수동 ack, 미확인 메시지 재큐잉, 자동 ack의 위험, 재전달 처리, 퍼블리셔 확인
- [Redis: Pub/Sub](https://redis.io/docs/latest/develop/pubsub/) - at-most-once 전달, Streams 권고
- [Amazon SQS: Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) - 기본 30초·최대 12시간, 시간 초과 시 재전달, `ChangeMessageVisibility`, DLQ
- [Amazon SQS: Standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html) - at-least-once, 중복·순서 뒤바뀜 가능
- [Amazon SQS: Message quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html) - 최대 1 MiB, 보관 기본 4일·최대 14일
- [Apache Kafka: Introduction](https://kafka.apache.org/intro) - 이벤트 보관, 파티션, 키, 파티션 내 순서, 복제
- [BullMQ: Going to production](https://docs.bullmq.io/guide/going-to-production) - Redis `maxmemory-policy=noeviction`

확인일: 2026-10-22 (RabbitMQ·Redis·SQS·Kafka 문서에서 확인한 동작과 한도, BullMQ의 `noeviction` 요구(검색 결과 요약으로 확인, 현재 버전의 강제 여부는 미확인). 처리 이력 테이블 방식은 SQLite 3.51.0에서 실행 확인(PostgreSQL 문법 `ON CONFLICT DO NOTHING`은 미실행). 큐와 로그 모델 비교, 전달 보장 표, 이중 쓰기·아웃박스, 운영 지표는 일반 개념. RabbitMQ ack 타임아웃 기본값, Kafka 소비자 그룹 세부 동작, 아래 amqplib·kafkajs·BullMQ 코드 예시는 미확인)
