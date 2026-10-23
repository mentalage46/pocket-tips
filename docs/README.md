# Pocket Tips 📚

> 개발 관련 핵심 팁과 체크리스트 모음

---

## 📁 카테고리

| 폴더                                                    | 설명                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| [AI](./AI/)                                             | LLM 기초·API, 프롬프팅, RAG, MCP, 운영, 보안, 로컬 모델, 에이전트 하네스와 개발 방법론 적용 |
| [API](./API/)                                           | API 설계, 호환성, 상태 코드, 페이지네이션, 레이트 리밋, 멱등성, 웹훅, OpenAPI |
| [Architecture](./Architecture/)                         | 설계 원칙, 아키텍처 스타일, 도메인 모델링, 품질 속성, ADR |
| [Automation](./Automation/)                             | PLC 구조, IEC 61131-3·래더, 산업 통신, HMI·SCADA, 기능 안전·OT 보안, 제조사 비교 |
| [Build](./Build/)                                       | 빌드 과정, 의존성, 도구 선택, 캐시, 오류 진단     |
| [Data](./Data/)                                         | DB(인덱스·쿼리 튜닝, 커넥션 풀, 트랜잭션, View), 캐싱, 메시지 큐 |
| [Hardware](./Hardware/)                                 | 전기·전자 기초, GPIO, 통신, 센서·모터 제어         |
| [I18N](./I18N/)                                         | 다국어 번역 파일 관리, React & Angular 구현        |
| [Linux](./Linux/)                                       | 셸 스크립트의 함정, 권한·프로세스, 파일 시스템·링크, 텍스트 처리, 시스템 진단, SSH, systemd·cron |
| [Network](./Network/)                                   | 프로토콜, DNS, TLS, HTTP 버전·캐싱, 실시간 통신(SSE·WebSocket), 서브넷·라우팅, 로드 밸런싱, 진단 명령 |
| [Infrastructure](./Infrastructure/)                     | Docker, CI/CD(배포 전략, 파이프라인 보안, 1인·소규모 도구), Nginx |
| [Observability](./Observability/)                       | 로깅, 메트릭, 트레이싱, 헬스체크                  |
| [Programming](./Programming/)                           | TypeScript, 시간·타임존 등 언어와 코드 작성의 개념 |
| [Quality](./Quality/)                                   | 테스트 전략, 예외 처리, 코드 리뷰                  |
| [Security](./Security/)                                 | OWASP Top 10:2025, 인증·비밀번호, JWT·쿠키, XSS·CSRF·보안 헤더, 공급망, CORS, 환경변수 |
| [UX](./UX/)                                             | 사용성 원칙, 사용자 조사, 시각 요소, 컴포넌트, 디자인 시스템 |
| [Utility](./Utility/)                                   | Makefile, YAML, Husky                              |
| [Version Control System](./Version%20Control%20System/) | Git 기본 모델, 브랜치 전략·커밋 규칙, Rebase, Cherry-pick, 서브모듈, SSH 키 |
| [Web](./Web/)                                           | 웹 성능, PWA, 상태 관리, 접근성                    |

---

## 🚀 Quick Links

### AI

- [Prompting 학습 가이드](./AI/prompting/README.md) - 프롬프팅 팁, 기법과 원리, 시스템 프롬프트, 테스트와 반복 개선
- [Prompting Tips](./AI/prompting/prompting-tips.md) | [기법과 원리](./AI/prompting/techniques.md) | [시스템 프롬프트 설계](./AI/prompting/system-prompts.md) | [테스트와 반복 개선](./AI/prompting/testing-and-iteration.md)
- [LLM 기초와 API 활용](./AI/llm-basics/README.md) - 모델 동작, API 호출, 구조화 출력, 비용과 지연
- [모델의 동작 원리](./AI/llm-basics/how-llms-work.md) | [API 호출 구조](./AI/llm-basics/api-usage.md) | [구조화 출력과 도구 호출](./AI/llm-basics/structured-output.md) | [비용과 지연](./AI/llm-basics/cost-and-latency.md)
- [RAG와 지식 검색](./AI/rag/README.md) - 검색 결합 생성의 구조, 청킹, 저장소, 검색 전략, 평가
- [전체 구조](./AI/rag/pipeline.md) | [청킹과 임베딩](./AI/rag/chunking-and-embedding.md) | [벡터 저장소](./AI/rag/vector-stores.md) | [검색 전략](./AI/rag/retrieval.md) | [평가와 실패 진단](./AI/rag/evaluation.md) | [RAG 도구](./AI/rag/tools.md)
- [MCP 서버와 도구 설계](./AI/mcp/README.md) - MCP 구조, 도구 설계, 서버 만들기, 테스트와 배포
- [MCP 개념](./AI/mcp/concepts.md) | [도구 설계](./AI/mcp/tool-design.md) | [서버 만들기](./AI/mcp/building-a-server.md) | [테스트와 배포](./AI/mcp/testing-and-distribution.md)
- [LLM 애플리케이션 운영](./AI/llmops/README.md) - 아키텍처, 프롬프트 관리, 신뢰성, 관측과 비용
- [아키텍처](./AI/llmops/architecture.md) | [프롬프트 관리](./AI/llmops/prompt-management.md) | [신뢰성](./AI/llmops/reliability.md) | [관측과 비용](./AI/llmops/observability-and-cost.md)
- [AI 보안](./AI/security/README.md) - OWASP LLM Top 10, 프롬프트 주입, 데이터 보호와 출력 검증
- [OWASP LLM Top 10](./AI/security/owasp-llm-top-10.md) | [프롬프트 주입](./AI/security/prompt-injection.md) | [데이터 보호와 출력 검증](./AI/security/data-and-output.md)
- [로컬 모델 실행](./AI/local-models/README.md) - 런타임, 양자화와 하드웨어, 서빙과 연결
- [런타임과 도구](./AI/local-models/runtimes.md) | [양자화와 하드웨어](./AI/local-models/quantization-and-hardware.md) | [서빙과 연결](./AI/local-models/serving-and-integration.md)
- [Harness 학습 가이드](./AI/harness/README.md) - 에이전트 실행과 평가 환경의 역할
- [Harness 개념](./AI/harness/concepts.md) | [실행 구조와 설계](./AI/harness/runtime-design.md) | [평가와 오류 진단](./AI/harness/evaluation.md)
- [Agents 학습 가이드](./AI/agents/README.md) - 에이전트를 PM·개발·리뷰·QA·운영에 적용하는 방법
- [에이전트 개념](./AI/agents/concepts.md) | [개발 방법론과 역할](./AI/agents/sdlc-roles.md) | [실무 워크플로](./AI/agents/workflows.md)
- [문맥과 지식 축적](./AI/agents/context-and-knowledge.md) | [도구와 생태계](./AI/agents/tools.md) | [운영과 안전](./AI/agents/operations.md)

### Architecture

- [학습 순서와 전체 목차](./Architecture/README.md)
- [모듈성과 경계](./Architecture/principles/modularity.md) | [의존성과 추상화](./Architecture/principles/dependencies.md)
- [계층형과 헥사고날](./Architecture/styles/layered-and-hexagonal.md) | [모놀리스와 마이크로서비스](./Architecture/styles/monolith-vs-microservices.md) | [이벤트 기반](./Architecture/styles/event-driven.md)
- [도메인 모델링](./Architecture/patterns/domain-modeling.md) | [경계 설계](./Architecture/patterns/boundaries.md) | [안티패턴](./Architecture/patterns/anti-patterns.md)
- [품질 속성](./Architecture/quality/quality-attributes.md) | [피트니스 함수](./Architecture/quality/fitness-functions.md)
- [ADR](./Architecture/process/adr.md) | [다이어그램](./Architecture/process/diagrams.md) | [마이그레이션과 기술 부채](./Architecture/process/migration-and-debt.md)

### Automation

- [학습 순서와 전체 목차](./Automation/README.md) | [용어집](./Automation/glossary/README.md)
- [PLC 구성과 형태](./Automation/basics/plc-architecture.md) | [스캔 사이클](./Automation/basics/scan-cycle.md) | [I/O 결선](./Automation/basics/io-wiring.md)
- [IEC 61131-3](./Automation/programming/iec-61131-3.md) | [래더 기초](./Automation/programming/ladder-basics.md) | [시퀀스 패턴](./Automation/programming/sequence-patterns.md) | [최신 개발 방식](./Automation/programming/modern-practices.md)
- [산업 통신 개요](./Automation/communication/fieldbus-overview.md) | [Modbus](./Automation/communication/modbus.md) | [산업 이더넷](./Automation/communication/industrial-ethernet.md) | [OPC UA·MQTT](./Automation/communication/opc-ua-and-mqtt.md)
- [HMI 설계](./Automation/hmi-scada/hmi-design.md) | [알람 관리](./Automation/hmi-scada/alarm-management.md) | [태그와 SCADA 구조](./Automation/hmi-scada/tags-and-architecture.md)
- [기능 안전](./Automation/safety/functional-safety.md) | [비상정지와 인터록](./Automation/safety/emergency-stop-and-interlock.md) | [OT 보안](./Automation/safety/ot-security.md)
- [제조사 비교](./Automation/vendors/vendor-comparison.md) | [주소 체계와 도구](./Automation/vendors/addressing-and-tools.md)

### API

- [API Design](./API/api-design.md) | [Rate Limiting](./API/rate-limiting.md)
- [멱등성과 안전한 재시도](./API/idempotency.md) | [웹훅](./API/webhooks.md) | [OpenAPI](./API/openapi.md)

### Build

- [학습 순서와 전체 목차](./Build/README.md)
- [빌드 과정](./Build/build-pipeline.md) | [의존성과 증분 빌드](./Build/dependency-graph.md) | [도구 선택](./Build/tools.md)
- [C 빌드 실습](./Build/c-build-example.md) | [캐시와 재현성](./Build/reproducibility.md) | [오류 진단](./Build/troubleshooting.md)
- [JavaScript 빌드 도구](./Build/javascript-tools.md) | [모듈과 번들링](./Build/javascript-modules.md) | [JS 빌드·모노레포](./Build/javascript-workflows.md)

### Data

- [인덱스와 쿼리 튜닝](./Data/database/indexes.md) | [Connection Pool](./Data/database/connection-pool.md) | [Transaction](./Data/database/transaction.md) | [Migration](./Data/database/migration.md) | [View](./Data/database/view.md)
- [Redis](./Data/caching/redis.md) | [Message Queue](./Data/messaging/message-queue.md)

### Hardware

- [학습 순서와 전체 목차](./Hardware/README.md)
- [전기 기초](./Hardware/basics/electrical-basics.md) | [전원과 배선](./Hardware/basics/power-and-wiring.md)
- [GPIO](./Hardware/interfaces/gpio.md) | [I2C](./Hardware/interfaces/i2c.md) | [SPI](./Hardware/interfaces/spi.md)
- [센서](./Hardware/modules/sensor-basics.md) | [출력 장치](./Hardware/modules/actuator-basics.md) | [문제 진단](./Hardware/debugging/troubleshooting.md)

### I18N

- [Translation](./I18N/translation.md) - 다국어 번역 파일 관리, 동적 언어 변경, UI 관리

### Linux

- [셸 스크립트의 기본과 함정](./Linux/shell-basics.md) | [파일 권한과 프로세스](./Linux/permissions-and-processes.md)
- [서비스 관리와 예약 실행](./Linux/services-and-scheduling.md)
- [파일 시스템과 링크](./Linux/filesystem-and-links.md) | [텍스트 처리 레시피](./Linux/text-processing.md)
- [시스템 진단](./Linux/system-diagnostics.md) | [SSH와 원격 작업](./Linux/ssh-and-remote.md)

### Network

- [Protocol](./Network/protocol.md) | [Top-down Network](./Network/topdown-network.md)
- [DNS](./Network/dns.md) | [TLS와 인증서](./Network/tls.md) | [HTTP 버전](./Network/http-versions.md) | [HTTP 캐싱](./Network/http-caching.md) | [실시간 통신](./Network/realtime-communication.md)
- [Subnet](./Network/subnet.md) | [Router](./Network/router.md) | [Gateway](./Network/gateway.md) | [로드 밸런싱](./Network/load-balancing.md)
- [진단 명령](./Network/diagnostics.md)

### Infrastructure

- [Docker](./Infrastructure/docker/docker.md) | [Docker Compose](./Infrastructure/docker/docker-compose.md) | [Nginx](./Infrastructure/nginx/nginx.md)
- [CI/CD 학습 순서](./Infrastructure/cicd/README.md) | [CI/CD 기초](./Infrastructure/cicd/cicd-basics.md) | [배포 전략](./Infrastructure/cicd/deployment-strategies.md) | [파이프라인 보안](./Infrastructure/cicd/pipeline-security.md)
- [1인·소규모 도구 선택](./Infrastructure/cicd/solo-dev-tools.md) | [릴리스·의존성 자동화](./Infrastructure/cicd/release-automation.md) | [GitHub Actions](./Infrastructure/cicd/github-action.md)

### Observability

- [Logging](./Observability/logging.md) | [메트릭·트레이싱·헬스체크](./Observability/metrics-and-tracing.md)

### Programming

- [TypeScript](./Programming/typescript.md) | [시간과 타임존](./Programming/datetime.md)

### Quality

- [Testing Strategy](./Quality/testing-strategy.md) | [Exception Handling](./Quality/exception-handling-strategy.md) | [Code Review](./Quality/code-review.md)

### Security

- [OWASP Top 10](./Security/owasp-top-10.md) | [인증과 비밀번호](./Security/auth-and-passwords.md) | [웹 공격과 방어](./Security/web-attacks.md)
- [JWT](./Security/jwt.md) | [Cookie](./Security/cookie.md) | [공급망 보안](./Security/supply-chain.md) | [CORS](./Security/cors.md) | [환경변수 관리](./Security/env-management.md)

### UX

- [학습 순서와 전체 목차](./UX/README.md)
- [사용성 원칙](./UX/foundations/principles.md) | [사용자 조사](./UX/foundations/research.md) | [정보 구조](./UX/foundations/information-architecture.md)
- [레이아웃과 간격](./UX/visual/layout-and-spacing.md) | [타이포그래피](./UX/visual/typography.md) | [색상](./UX/visual/color.md)
- [컴포넌트 규칙](./UX/components/components.md) | [폼 설계](./UX/components/forms.md) | [피드백과 상태](./UX/components/feedback-and-states.md) | [UX 라이팅](./UX/components/microcopy.md)
- [디자인 시스템](./UX/systems/design-system.md) | [반응형과 모션](./UX/systems/responsive-and-motion.md) | [협업과 측정](./UX/process/workflow.md)

### Git

- [Git 기본 모델](./Version%20Control%20System/git/basics.md) | [브랜치 전략과 커밋 규칙](./Version%20Control%20System/git/branching-and-commits.md)
- [Rebase](./Version%20Control%20System/git/rebase.md) | [Cherry-pick](./Version%20Control%20System/git/cherry-pick.md)
- [Tips](./Version%20Control%20System/git/tips.md) | [Submodules](./Version%20Control%20System/git/submodules.md) | [SSH 키](./Version%20Control%20System/git/public-key.md)

### Web

- [Web Performance](./Web/web-performance.md) | [PWA](./Web/pwa.md)
- [상태 관리](./Web/state-management.md) | [Accessibility](./Web/accessibility.md)
