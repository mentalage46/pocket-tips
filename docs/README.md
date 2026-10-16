# Pocket Tips 📚

> 개발 관련 핵심 팁과 체크리스트 모음

---

## 📁 카테고리

| 폴더                                                    | 설명                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| [AI](./AI/)                                             | LLM 기초·API, 프롬프팅, RAG, MCP, 운영, 보안, 로컬 모델, 에이전트 하네스와 개발 방법론 적용 |
| [Architecture](./Architecture/)                         | 설계 원칙, 아키텍처 스타일, 도메인 모델링, 품질 속성, ADR |
| [Backend](./Backend/)                                   | API 설계, 인증, DB, 캐싱, 로깅, 메시징, 테스트     |
| [Build](./Build/)                                       | 빌드 과정, 의존성, 도구 선택, 캐시, 오류 진단     |
| [Frontend](./Frontend/)                                 | 상태 관리, TypeScript, 성능 최적화, PWA, 웹 접근성 |
| [Hardware](./Hardware/)                                 | 전기·전자 기초, GPIO, 통신, 센서·모터 제어         |
| [I18N](./I18N/)                                         | 다국어 번역 파일 관리, React & Angular 구현        |
| [Network](./Network/)                                   | 프로토콜, 서브넷, 라우터, 게이트웨이               |
| [Infrastructure](./Infrastructure/)                     | Docker, CI/CD, Nginx                               |
| [Security](./Security/)                                 | OWASP, 환경변수, CORS                              |
| [UX](./UX/)                                             | 사용성 원칙, 사용자 조사, 시각 요소, 컴포넌트, 디자인 시스템 |
| [Utility](./Utility/)                                   | Makefile, YAML, Husky, 코드 리뷰                   |
| [Version Control System](./Version%20Control%20System/) | Git 명령어, Rebase, Cherry-pick                    |

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

### Backend

- [API Design](./Backend/api/api-design.md) | [Rate Limiting](./Backend/api/rate-limiting.md)
- [JWT](./Backend/auth/jwt.md) | [Cookie](./Backend/auth/cookie.md)
- [Redis](./Backend/caching/redis.md) | [Testing](./Backend/testing/testing-strategy.md)

### Build

- [학습 순서와 전체 목차](./Build/README.md)
- [빌드 과정](./Build/build-pipeline.md) | [의존성과 증분 빌드](./Build/dependency-graph.md) | [도구 선택](./Build/tools.md)
- [C 빌드 실습](./Build/c-build-example.md) | [캐시와 재현성](./Build/reproducibility.md) | [오류 진단](./Build/troubleshooting.md)
- [JavaScript 빌드 도구](./Build/javascript-tools.md) | [모듈과 번들링](./Build/javascript-modules.md) | [JS 빌드·모노레포](./Build/javascript-workflows.md)

### Frontend

- [State Management](./Frontend/state-management.md) | [TypeScript](./Frontend/typescript.md)
- [Web Performance](./Frontend/web-performance.md) | [PWA](./Frontend/pwa.md)
- [Accessibility](./Frontend/accessibility.md)

### Hardware

- [학습 순서와 전체 목차](./Hardware/README.md)
- [전기 기초](./Hardware/basics/electrical-basics.md) | [전원과 배선](./Hardware/basics/power-and-wiring.md)
- [GPIO](./Hardware/interfaces/gpio.md) | [I2C](./Hardware/interfaces/i2c.md) | [SPI](./Hardware/interfaces/spi.md)
- [센서](./Hardware/modules/sensor-basics.md) | [출력 장치](./Hardware/modules/actuator-basics.md) | [문제 진단](./Hardware/debugging/troubleshooting.md)

### I18N

- [Translation](./I18N/translation.md) - 다국어 번역 파일 관리, 동적 언어 변경, UI 관리

### Network

- [Protocol](./Network/protocol.md) | [Top-down Network](./Network/topdown-network.md)
- [Subnet](./Network/subnet.md) | [Router](./Network/router.md) | [Gateway](./Network/gateway.md)

### Infrastructure

- [Docker](./Infrastructure/docker/docker.md) | [Docker Compose](./Infrastructure/docker/docker-compose.md)
- [GitHub Actions](./Infrastructure/cicd/github-action.md) | [Nginx](./Infrastructure/nginx/nginx.md)

### Security

- [OWASP Top 10](./Security/owasp-top-10.md) | [CORS](./Security/cors.md)

### UX

- [학습 순서와 전체 목차](./UX/README.md)
- [사용성 원칙](./UX/foundations/principles.md) | [사용자 조사](./UX/foundations/research.md) | [정보 구조](./UX/foundations/information-architecture.md)
- [레이아웃과 간격](./UX/visual/layout-and-spacing.md) | [타이포그래피](./UX/visual/typography.md) | [색상](./UX/visual/color.md)
- [컴포넌트 규칙](./UX/components/components.md) | [폼 설계](./UX/components/forms.md) | [피드백과 상태](./UX/components/feedback-and-states.md) | [UX 라이팅](./UX/components/microcopy.md)
- [디자인 시스템](./UX/systems/design-system.md) | [반응형과 모션](./UX/systems/responsive-and-motion.md) | [협업과 측정](./UX/process/workflow.md)

### Git

- [Rebase](./Version%20Control%20System/git/rebase.md) | [Cherry-pick](./Version%20Control%20System/git/cherry-pick.md)
- [Tips](./Version%20Control%20System/git/tips.md)
