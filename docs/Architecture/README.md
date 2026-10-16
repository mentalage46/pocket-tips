# Software Architecture

소프트웨어 아키텍처는 **바꾸기 어려운 결정**의 집합입니다. 모듈을 어떻게 나누고, 의존성을 어느 방향으로 흐르게 하며, 데이터와 트랜잭션의 경계를 어디에 둘지가 여기에 속합니다. 이 폴더는 설계 원칙부터 아키텍처 스타일, 도메인 모델링, 품질 속성의 트레이드오프, 결정을 기록하고 바꾸는 절차까지 다룹니다.

## 학습 순서

| 순서 | 폴더 | 문서 | 알 수 있는 것 |
| --- | --- | --- | --- |
| 1 | principles | [모듈성과 경계](./principles/modularity.md) | 응집도·결합도, 모듈 경계를 긋는 기준, 인터페이스 |
| 2 | principles | [의존성과 추상화](./principles/dependencies.md) | 의존성 방향, SOLID, 의존성 역전, 추상화의 비용 |
| 3 | styles | [계층형과 헥사고날](./styles/layered-and-hexagonal.md) | 계층 규칙, 포트·어댑터, 클린 아키텍처, 선택 기준 |
| 4 | styles | [모놀리스와 마이크로서비스](./styles/monolith-vs-microservices.md) | 모듈러 모놀리스, 분리 기준, 분산의 비용 |
| 5 | styles | [이벤트 기반 아키텍처](./styles/event-driven.md) | 이벤트·메시지, CQRS, 사가, 멱등성, 일관성 |
| 6 | patterns | [도메인 모델링](./patterns/domain-modeling.md) | 유비쿼터스 언어, 엔티티·값 객체·애그리거트, 바운디드 컨텍스트 |
| 7 | patterns | [경계 설계](./patterns/boundaries.md) | 트랜잭션 경계, 데이터 소유권, API 경계, 계약 |
| 8 | patterns | [안티패턴](./patterns/anti-patterns.md) | 흔한 구조적 실패와 신호, 대응 |
| 9 | quality | [품질 속성과 트레이드오프](./quality/quality-attributes.md) | 성능·확장성·가용성·보안·변경 용이성, 시나리오 작성 |
| 10 | quality | [피트니스 함수](./quality/fitness-functions.md) | 아키텍처 규칙을 자동 검증하는 방법 |
| 11 | process | [ADR](./process/adr.md) | 아키텍처 결정 기록의 형식과 운영 |
| 12 | process | [다이어그램](./process/diagrams.md) | C4 모델, 다이어그램 종류별 용도, 코드로 그리기 |
| 13 | process | [마이그레이션과 기술 부채](./process/migration-and-debt.md) | 스트랭글러 패턴, 점진적 전환, 부채 관리 |

## 아키텍처가 다루는 것과 다루지 않는 것

| 다루는 것 | 다루지 않는 것 |
| --- | --- |
| 모듈·서비스의 경계와 책임 | 함수 내부 구현 |
| 의존성의 방향과 허용 규칙 | 변수 이름, 코드 스타일 |
| 데이터 소유권과 일관성 모델 | 특정 쿼리 최적화 |
| 품질 속성(성능, 가용성, 보안)의 목표와 트레이드오프 | 개별 버그 |
| 바꾸기 어려운 기술 선택(언어, 저장소, 통신 방식) | 쉽게 바꿀 수 있는 라이브러리 |

## 먼저 기억할 것

- 모든 아키텍처는 트레이드오프입니다. "좋은 아키텍처"가 아니라 "이 제약과 목표에 맞는 아키텍처"를 찾습니다.
- 경계는 변경이 함께 일어나는 단위로 긋습니다. 기술 종류(컨트롤러, 서비스, 리포지토리)로만 나누면 변경이 모든 층을 관통합니다.
- 단순한 구조로 시작하고, 측정된 문제가 생길 때 복잡도를 추가합니다. 분산은 마지막 수단입니다.
- 결정은 기록합니다. 왜 그렇게 했는지 모르면 바꿀 수도, 지킬 수도 없습니다.
- 아키텍처 규칙은 문서가 아니라 테스트와 도구로 지킵니다.

관련: [API 설계](../Backend/api/api-design.md), [상태 관리](../Frontend/state-management.md), [문맥과 지식 축적](../AI/agents/context-and-knowledge.md)
