# OpenAPI로 API 계약 문서화하기

> API를 **기계가 읽을 수 있는 명세**로 적어 문서·검증·코드 생성의 기준으로 삼는다

[API Design](./api-design.md)가 "무엇을 설계할 것인가"라면, OpenAPI는 그 결과를 **하나의 파일로 고정하는 형식**입니다. 같은 파일에서 문서 페이지, 클라이언트 SDK, 서버 스텁, 목(mock) 서버, 요청·응답 검증을 만들 수 있습니다.

> **예제 명세는 직접 검증했습니다.** Redocly CLI 2.69.0(`redocly lint`)에 정상 파일과 일부러 깨뜨린 파일 3종을 넣어 나온 규칙 이름과 메시지를 그대로 옮겼습니다. 코드 생성기·목 서버·호환성 검사 도구는 실행하지 않았습니다.

---

## 개념: 버전과 구조

확인 시점(2026-10-23)에 OAS 릴리스는 3.0.4, 3.1.2, 3.2.0, **3.2.1(2026-09-10, 최신)** 이었습니다. 이 문서의 구조 설명은 3.1.2 본문에서 확인했고, 예제는 `openapi: 3.1.0`으로 검증했습니다. 3.2의 변경점은 확인하지 않았습니다.

### 3.0과 3.1의 큰 차이: 스키마가 JSON Schema가 됨

3.1의 Schema Object는 **JSON Schema 2020-12의 상위 집합**입니다. 그래서 3.0의 `nullable`이 사라졌습니다(3.0.4 본문에는 3회, 3.1.2 본문에는 0회 등장).

```yaml
# 3.0
note: { type: string, nullable: true }
# 3.1
note: { type: [string, "null"] }
```

3.1 파일에 3.0식 `nullable: true`를 쓰고 린트하면 이렇게 나옵니다.

```
Property `nullable` is not expected here.   (struct 규칙)
```

또 3.1에서는 `paths` 없이 **`webhooks`** 최상위 필드로 "수신자가 구현할 수 있는 요청"([웹훅](./webhooks.md))을 기술할 수 있습니다.

### 문서의 뼈대

```yaml
openapi: 3.1.0
info: { title: Orders API, version: 1.0.0 }      # openapi, info는 필수
servers: [{ url: https://api.example.com/v1 }]
paths:
  /orders:
    post:
      operationId: createOrder                    # 문서 전체에서 유일해야 함
      parameters:
        - { name: Idempotency-Key, in: header, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/NewOrder' }
      responses:
        '201':
          description: 생성됨
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Order' }
        '422':
          description: 멱등 키를 다른 본문에 재사용
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/Problem' }
components:
  schemas:
    NewOrder:
      type: object
      required: [item]
      properties:
        item: { type: string }
        note: { type: [string, "null"] }
    Order:
      allOf:
        - $ref: '#/components/schemas/NewOrder'
        - type: object
          properties: { id: { type: integer } }
    Problem:
      type: object
      properties: { type: { type: string }, title: { type: string }, status: { type: integer } }
```

- **`components` + `$ref`** 로 스키마를 한 번만 정의하고 재사용합니다. 오류 응답([Problem Details](./api-design.md#표준-형식-rfc-9457-problem-details))이나 페이지네이션 응답처럼 여러 엔드포인트가 공유하는 형태를 한곳에서 관리합니다.
- **`operationId`** 는 문서 전체에서 유일해야 하며(MUST), 대소문자를 구분합니다. 클라이언트 생성기는 보통 이 값을 **메서드 이름**으로 씁니다. 나중에 바꾸면 생성된 SDK의 메서드 이름이 바뀌므로 신중히 정합니다.
- `example`과 `examples`는 **동시에 쓸 수 없고**(mutually exclusive), 있으면 스키마 안의 예시를 덮어씁니다.
- 오류 응답은 일반 JSON과 다른 미디어 타입(`application/problem+json`)으로 따로 적습니다.

---

## 린트로 계약 품질 지키기

위 정상 예제를 `redocly lint`(내장 recommended 설정)로 검사한 결과입니다.

| 결과 | 규칙 | 의미 |
| --- | --- | --- |
| **Error** | `security-defined` | 모든 오퍼레이션에 **인증 요구가 선언**되어 있어야 함 (명세에 `security`가 없었음) |
| Warning | `info-license` | `info`에 `license` 필드 권장 |
| Warning | `no-server-example.com` | `servers.url`이 `example.com`/`localhost`를 가리킴 |

문법상 정상이어도 **정책 규칙** 때문에 실패할 수 있습니다. 일부러 깨뜨린 파일의 결과입니다.

| 깨뜨린 부분 | 린트 결과 |
| --- | --- |
| 존재하지 않는 `$ref` (`#/components/schemas/Missing`) | `Can't resolve $ref` (`no-unresolved-refs`) |
| 두 오퍼레이션에 같은 `operationId` | `operation-operationId-unique` |
| 3.1 파일에 `nullable: true` | `Property nullable is not expected here` (`struct`) |
| 참조되지 않는 스키마 | `no-unused-components` (경고) |

- 린트를 **CI에 넣어** 명세가 깨진 채 머지되지 않게 합니다. 규칙은 팀 정책에 맞게 켜고 끕니다(어떤 규칙을 끌지는 팀의 판단이며 이 문서에서 권고하지 않음).
- 명세와 구현이 어긋나는 문제는 린트로 잡히지 않습니다. 구현 쪽에서 **요청·응답을 명세로 검증**하는 계약 테스트가 필요합니다(이 문서에서 실행하지 않음).

---

## 명세를 먼저 쓸까, 코드에서 뽑을까

| | 명세 우선(contract-first) | 코드 우선(code-first) |
| --- | --- | --- |
| 흐름 | 명세 작성·합의 → 서버·클라이언트 구현 | 코드의 어노테이션/타입에서 명세 생성 |
| 장점 | 구현 전에 **프론트·백엔드가 병렬 작업**, 변경이 리뷰 대상이 됨 | 구현과 명세가 **어긋나기 어려움**, 작성 부담 적음 |
| 단점 | 명세와 구현을 맞추는 검증 필요 | 생성물이 지저분하거나 의도와 다를 수 있음, 설계 리뷰가 늦어짐 |

어느 쪽이든 핵심은 **명세 파일을 저장소에 두고 변경을 PR로 리뷰**하는 것입니다. 호환성이 깨지는 변경(필수 필드 추가, 필드 삭제·타입 변경)은 [버전 관리](./api-design.md#api-버전-관리) 규칙대로 다룹니다.

---

## 🎯 체크리스트

- [ ] 명세 파일(`openapi.yaml`)을 저장소에 두고 PR로 리뷰한다
- [ ] 버전을 명시하고(`openapi: 3.1.x`) 3.0식 `nullable`을 쓰지 않는다
- [ ] 공통 스키마(오류, 페이지네이션)는 `components`에 두고 `$ref`로 재사용한다
- [ ] 모든 오퍼레이션에 유일한 `operationId`와 `summary`가 있다
- [ ] 성공뿐 아니라 **오류 응답**(4xx, 429, 5xx)과 인증 방식을 기술한다
- [ ] 요청·응답 **예시**를 넣는다
- [ ] 린트를 CI에서 돌린다
- [ ] 보내는 이벤트(웹훅)는 `webhooks`로 기술한다
- [ ] 명세와 실제 구현이 어긋나지 않는지 계약 테스트로 확인한다

## 참고 자료

- [OpenAPI Specification v3.1.2](https://spec.openapis.org/oas/v3.1.2.html) - 문서 구조, `webhooks`, `operationId` 유일성, `example`/`examples`, JSON Schema 2020-12
- [OpenAPI Specification v3.0.4](https://spec.openapis.org/oas/v3.0.4.html) - `nullable`
- [OpenAPI 릴리스 목록](https://github.com/OAI/OpenAPI-Specification/releases) - 3.2.1 최신(2026-09-10) 확인
- [Redocly CLI](https://redocly.com/docs/cli/) - `lint`와 규칙 목록

확인일: 2026-10-23 (3.1.2·3.0.4·3.2.1 명세 본문 다운로드 후 `nullable` 등장 횟수와 `webhooks`·`operationId`·`example` 규칙 확인, 릴리스 날짜는 GitHub API로 확인. 예제 명세는 `openapi: 3.1.0`으로 Redocly CLI 2.69.0 `lint`에 넣어 정상·`$ref` 누락·`operationId` 중복·`nullable` 오류의 결과를 확인. 3.2의 변경점, 코드 생성기·목 서버·호환성 검사 도구, 계약 테스트는 실행하지 못함. 명세 우선 vs 코드 우선 비교는 경험칙)
