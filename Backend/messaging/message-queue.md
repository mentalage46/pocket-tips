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
| **Redis (Pub/Sub)** | 단순, 빠름                        | 간단한 큐, 실시간 알림 |
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

```typescript
// 같은 메시지 여러 번 와도 한 번만 처리
async function processOrder(order) {
  const existing = await db.orders.findById(order.id);
  if (existing?.processed) return; // 이미 처리됨

  await db.orders.update(order.id, { processed: true });
  // 실제 처리 로직
}
```

---

## 요약

```
간단한 작업 큐     → BullMQ (Node.js) / RabbitMQ
대용량 이벤트 처리 → Kafka
AWS 환경          → SQS
```
