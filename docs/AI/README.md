# AI

## Prompting

- [Prompting 학습 가이드](./prompting/README.md) - 프롬프트가 할 수 있는 것과 없는 것, 학습 순서
- [Prompting Tips](./prompting/prompting-tips.md) - AI 프롬프팅 기법 & 템플릿
- [기법과 원리](./prompting/techniques.md) - 제로샷·퓨샷, 단계적 사고, 작업 분해, 역할, 자기 검증, 기법 선택
- [시스템 프롬프트 설계](./prompting/system-prompts.md) - 구조, 규칙 작성, 우선순위, 출력 형식, 길이 관리
- [테스트와 반복 개선](./prompting/testing-and-iteration.md) - 평가 세트, 채점 방법, 실패 분석, 변경 절차, 도구

## LLM 기초

- [LLM 기초와 API 활용](./llm-basics/README.md) - 모델 동작, API 호출, 구조화 출력, 비용과 지연의 학습 순서
- [모델의 동작 원리](./llm-basics/how-llms-work.md) - 토큰, 문맥 창, 샘플링 파라미터, 학습 단계, 한계, 모델 선택
- [API 호출 구조](./llm-basics/api-usage.md) - 메시지 역할, 종료 이유, 멀티턴, 스트리밍, 오류와 재시도, 호출 래퍼
- [구조화 출력과 도구 호출](./llm-basics/structured-output.md) - JSON 스키마 출력, 검증 단계, 도구 호출 루프, 도구 정의 원칙
- [비용과 지연](./llm-basics/cost-and-latency.md) - 과금 구조, TTFT, 프롬프트 캐싱, 절감 순서, 속도 제한, 관측 지표

## RAG

- [RAG와 지식 검색](./rag/README.md) - 검색 결합 생성의 역할, 해결하는 것과 못 하는 것, 학습 순서
- [전체 구조](./rag/pipeline.md) - 색인·질의 경로, 구성 요소, 시작 구성, 변형 구조, 권한 경계
- [청킹과 임베딩](./rag/chunking-and-embedding.md) - 청크 크기, 분할 전략, 메타데이터, 임베딩 모델 선택, 색인 갱신
- [벡터 저장소](./rag/vector-stores.md) - 유사도·인덱스 종류, 저장소 선택, 메타데이터 필터링, 운영
- [검색 전략](./rag/retrieval.md) - 키워드·벡터·하이브리드, 쿼리 변환, 재순위, 문맥 조립, 지연
- [평가와 실패 진단](./rag/evaluation.md) - 평가 세트, 검색·생성 지표, 실패 원인 추적, 개선 순서
- [RAG 도구와 생태계](./rag/tools.md) - 파싱, 청킹, 임베딩, 저장소, 검색·재순위, 프레임워크, 평가 도구

## MCP

- [MCP 서버와 도구 설계](./mcp/README.md) - MCP의 역할, 언제 서버를 만드는가, 학습 순서
- [개념과 구조](./mcp/concepts.md) - 호스트·클라이언트·서버, 도구·리소스·프롬프트, 전송 방식, 메시지 흐름
- [도구 설계](./mcp/tool-design.md) - 작업 단위 설계, 이름·설명·스키마, 결과·오류 형식, 권한
- [서버 만들기](./mcp/building-a-server.md) - SDK 선택, 최소 서버, 구성 요소, HTTP 전송과 인증, 로깅
- [테스트와 배포](./mcp/testing-and-distribution.md) - 테스트 단계, 흔한 문제, 호스트 등록, 패키징, 운영

## LLMOps

- [LLM 애플리케이션 운영](./llmops/README.md) - 일반 서비스 운영과 다른 점, 학습 순서
- [아키텍처](./llmops/architecture.md) - 계층 구조, 게이트웨이, 모델 라우팅, 동기·비동기, 배포 환경
- [프롬프트 관리](./llmops/prompt-management.md) - 프롬프트를 코드로, 템플릿 구성, 변경 흐름, 평가 세트, 도구
- [신뢰성](./llmops/reliability.md) - 장애 유형, 타임아웃·재시도, 폴백, 회로 차단, 캐싱, 품질 저하 모드
- [관측과 비용](./llmops/observability-and-cost.md) - 추적, 지표, 로그와 개인정보, 비용 배분, 예산 통제

## Security

- [AI 보안](./security/README.md) - 기존 보안과의 관계, 학습 순서
- [OWASP LLM Top 10](./security/owasp-llm-top-10.md) - 10가지 위협의 정의, 예, 대응, 점검 목록
- [프롬프트 주입](./security/prompt-injection.md) - 직접·간접 주입, 피해 유형, 방어 층, 승인 지점, 테스트
- [데이터 보호와 출력 검증](./security/data-and-output.md) - 민감 정보 분류, 공급자 정책, 출력 검증, 가드레일, 사고 대응

## Local Models

- [로컬 모델 실행](./local-models/README.md) - 언제 로컬 모델인가, 학습 순서
- [런타임과 도구](./local-models/runtimes.md) - Ollama, llama.cpp, vLLM 등 비교, 모델 허브·형식, 모델 선택
- [양자화와 하드웨어](./local-models/quantization-and-hardware.md) - 메모리 계산, 양자화 수준, GPU·Mac·CPU 선택, 속도 요인
- [서빙과 연결](./local-models/serving-and-integration.md) - OpenAI 호환 API, 기능 지원, 팀 서빙, 운영, API 모델과의 차이

## Harness

- [Harness 학습 가이드](./harness/README.md) - 에이전트 하네스와 평가 하네스의 역할, 학습 순서
- [개념과 용어](./harness/concepts.md) - 모델·에이전트·하네스의 관계와 도입 기준
- [실행 구조와 설계](./harness/runtime-design.md) - 도구 실행, 문맥·상태, 권한, 재시도와 복구
- [평가와 오류 진단](./harness/evaluation.md) - 완료 조건, 평가 세트, 지표, 실패 원인 분석

## Agents

- [Agents 학습 가이드](./agents/README.md) - 에이전트를 개발 과정에 적용하는 방법, 학습 순서
- [개념과 구성 요소](./agents/concepts.md) - 정의, 구성 요소, 자율성 단계, 워크플로와의 차이, 기본 패턴
- [개발 방법론과 역할](./agents/sdlc-roles.md) - SDLC 단계별·PM·개발자·리뷰어·QA·운영 역할별 적용, 애자일 의식
- [실무 워크플로](./agents/workflows.md) - 스펙 주도, 계획→구현→검증, TDD, 리뷰 루프, 멀티 에이전트, 실패 패턴
- [문맥과 지식 축적](./agents/context-and-knowledge.md) - 지침 파일, 스킬, ADR, 메모리, 문맥 예산, 온보딩 체크리스트
- [도구와 생태계](./agents/tools.md) - 코딩 에이전트 제품, 프레임워크·SDK, MCP·A2A, 평가·관측, 실행 환경
- [운영과 안전](./agents/operations.md) - 권한·격리, 프롬프트 주입, 비용, 관측, 품질 게이트, 팀 도입 단계
