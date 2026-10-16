# AI

## Prompting

- [Prompting Tips](./prompting/prompting-tips.md) - AI 프롬프팅 기법 & 템플릿

## LLM 기초

- [LLM 기초와 API 활용](./llm-basics/README.md) - 모델 동작, API 호출, 구조화 출력, 비용과 지연의 학습 순서
- [모델의 동작 원리](./llm-basics/how-llms-work.md) - 토큰, 문맥 창, 샘플링 파라미터, 학습 단계, 한계, 모델 선택
- [API 호출 구조](./llm-basics/api-usage.md) - 메시지 역할, 종료 이유, 멀티턴, 스트리밍, 오류와 재시도, 호출 래퍼
- [구조화 출력과 도구 호출](./llm-basics/structured-output.md) - JSON 스키마 출력, 검증 단계, 도구 호출 루프, 도구 정의 원칙
- [비용과 지연](./llm-basics/cost-and-latency.md) - 과금 구조, TTFT, 프롬프트 캐싱, 절감 순서, 속도 제한, 관측 지표

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
