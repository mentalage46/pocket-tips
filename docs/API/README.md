# API

서버가 외부에 제공하는 인터페이스를 설계하고 보호하는 방법입니다. 인증·토큰은 [Security](../Security/README.md), 오류 처리는 [Quality](../Quality/README.md)를 참고합니다.

- [API Design](./api-design.md) - 호환성, HTTP 메서드의 의미, 상태 코드, Problem Details, 페이지네이션, 버전 관리
- [Rate Limiting](./rate-limiting.md) - 알고리즘, 키 선택, 분산 환경, 429 처리
- [멱등성과 안전한 재시도](./idempotency.md) - 멱등 키, 409·422 처리, 키 선점의 원자성, 클라이언트 재시도 규칙
- [웹훅](./webhooks.md) - 서명 검증(raw body, 상수 시간 비교, 재생 방지), 중복 제거, 재시도 스케줄, SSRF
- [OpenAPI](./openapi.md) - 3.0과 3.1의 차이, `components`/`$ref`, `operationId`, 린트 결과, 명세 우선 vs 코드 우선
