# Pocket Tips 📚

> 개발 관련 핵심 팁과 체크리스트 모음

---

## 📁 카테고리

| 폴더                                                    | 설명                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| [AI](./AI/)                                             | LLM 기초·API, 프롬프팅, 에이전트 하네스, 에이전트의 개발 방법론 적용 |
| [Backend](./Backend/)                                   | API 설계, 인증, DB, 캐싱, 로깅, 메시징, 테스트     |
| [Build](./Build/)                                       | 빌드 과정, 의존성, 도구 선택, 캐시, 오류 진단     |
| [Frontend](./Frontend/)                                 | 상태 관리, TypeScript, 성능 최적화, PWA, 웹 접근성 |
| [Hardware](./Hardware/)                                 | 전기·전자 기초, GPIO, 통신, 센서·모터 제어         |
| [I18N](./I18N/)                                         | 다국어 번역 파일 관리, React & Angular 구현        |
| [Network](./Network/)                                   | 프로토콜, 서브넷, 라우터, 게이트웨이               |
| [Infrastructure](./Infrastructure/)                     | Docker, CI/CD, Nginx                               |
| [Security](./Security/)                                 | OWASP, 환경변수, CORS                              |
| [Utility](./Utility/)                                   | Makefile, YAML, Husky, 코드 리뷰                   |
| [Version Control System](./Version%20Control%20System/) | Git 명령어, Rebase, Cherry-pick                    |

---

## 🚀 Quick Links

### AI

- [Prompting Tips](./AI/prompting/prompting-tips.md) - 프롬프팅 기법과 템플릿
- [LLM 기초와 API 활용](./AI/llm-basics/README.md) - 모델 동작, API 호출, 구조화 출력, 비용과 지연
- [모델의 동작 원리](./AI/llm-basics/how-llms-work.md) | [API 호출 구조](./AI/llm-basics/api-usage.md) | [구조화 출력과 도구 호출](./AI/llm-basics/structured-output.md) | [비용과 지연](./AI/llm-basics/cost-and-latency.md)
- [Harness 학습 가이드](./AI/harness/README.md) - 에이전트 실행과 평가 환경의 역할
- [Harness 개념](./AI/harness/concepts.md) | [실행 구조와 설계](./AI/harness/runtime-design.md) | [평가와 오류 진단](./AI/harness/evaluation.md)
- [Agents 학습 가이드](./AI/agents/README.md) - 에이전트를 PM·개발·리뷰·QA·운영에 적용하는 방법
- [에이전트 개념](./AI/agents/concepts.md) | [개발 방법론과 역할](./AI/agents/sdlc-roles.md) | [실무 워크플로](./AI/agents/workflows.md)
- [문맥과 지식 축적](./AI/agents/context-and-knowledge.md) | [도구와 생태계](./AI/agents/tools.md) | [운영과 안전](./AI/agents/operations.md)

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

### Git

- [Rebase](./Version%20Control%20System/git/rebase.md) | [Cherry-pick](./Version%20Control%20System/git/cherry-pick.md)
- [Tips](./Version%20Control%20System/git/tips.md)
