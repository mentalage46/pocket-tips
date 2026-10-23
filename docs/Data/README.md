# Data

데이터를 저장하고, 빠르게 읽고, 다른 곳으로 전달하는 방법입니다.

## Database

- [인덱스와 쿼리 튜닝](./database/indexes.md) - 실행 계획 읽기, 복합 인덱스, 커버링·부분 인덱스, N+1
- [Connection Pool](./database/connection-pool.md) - 풀 크기 산정, 라이브러리별 기본값, PgBouncer
- [Migration](./database/migration.md) - DB 마이그레이션 전략
- [Transaction](./database/transaction.md) - 트랜잭션 & Isolation Level
- [View](./database/view.md) - View와 Materialized View, 보안 옵션

## Caching

- [Redis](./caching/redis.md) - 캐시 일관성, eviction, 영속성, 분산 락

## Messaging

- [Message Queue](./messaging/message-queue.md) - 전달 보장, 멱등성, Kafka·RabbitMQ·SQS·BullMQ
