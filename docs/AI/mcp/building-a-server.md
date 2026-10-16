# MCP 서버 만들기

공식 SDK를 쓰면 프로토콜 처리는 SDK가 맡고, 개발자는 도구 함수와 설정만 작성합니다. 이 문서는 언어 선택부터 최소 서버, 설정·상태·인증·로깅까지의 절차를 다룹니다.

## SDK 선택

| 언어 | SDK | 비고 |
| --- | --- | --- |
| Python | 공식 Python SDK(FastMCP 포함) | 데코레이터로 도구 정의, 프로토타입에 빠름 |
| TypeScript | 공식 TypeScript SDK | npm 배포와 `npx` 실행이 편리, 호스트 생태계와 궁합 |
| Java/Kotlin, C#, Go, Rust, Swift 등 | 공식·커뮤니티 SDK | 기존 백엔드 언어와 맞출 때 |

선택 기준은 **연결할 시스템의 클라이언트 라이브러리가 어느 언어에 있는가**입니다. 프로토콜 기능 차이보다 그쪽이 큽니다.

## 최소 서버

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("issues")

@mcp.tool()
def search_issues(query: str, state: str = "open", limit: int = 20) -> str:
    """이슈 트래커에서 제목·본문을 검색합니다. 이슈 번호를 알면 get_issue를 사용합니다."""
    rows = tracker.search(query=query, state=state, limit=min(limit, 50))
    if not rows:
        return "검색 결과 없음. 다른 검색어를 시도하거나 state='all'로 재검색."
    return "\n".join(f"#{r.id} [{r.state}] {r.title}" for r in rows)

if __name__ == "__main__":
    mcp.run()  # 기본 stdio
```

타입 힌트와 독스트링이 입력 스키마와 설명이 됩니다. 설명 작성 규칙은 [도구 설계](./tool-design.md)를 따릅니다.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "issues", version: "0.1.0" });
server.tool("search_issues", "이슈 트래커에서 제목·본문을 검색합니다.",
  { query: z.string().describe("검색어"), limit: z.number().int().max(50).default(20) },
  async ({ query, limit }) => ({ content: [{ type: "text", text: await search(query, limit) }] }));

await server.connect(new StdioServerTransport());
```

SDK API 이름은 버전에 따라 바뀌므로 공식 문서의 현재 예제를 기준으로 합니다.

## 구성 요소별 설계

```mermaid
flowchart TB
    T[전송: stdio / HTTP] --> P[프로토콜 처리: SDK]
    P --> R[라우팅: 도구·리소스·프롬프트]
    R --> V[검증·권한]
    V --> B[비즈니스 로직: 외부 API, DB]
    B --> F[결과 포맷·마스킹]
    C[설정: 환경 변수, 파일] --> V
    L[로깅: stderr / 파일] --- R
```

| 요소 | 설계 포인트 |
| --- | --- |
| 설정 | 환경 변수로 API 키·기본 URL·허용 범위를 받음. 호스트 설정 파일에서 `env`로 전달 |
| 상태 | stdio 서버는 호스트 세션과 수명이 같음. 캐시는 메모리, 영속 상태는 파일·DB |
| 외부 호출 | 타임아웃과 재시도를 도구 안에서 처리. 모델에 오류를 돌려줄 때는 구조화 |
| 결과 포맷 | 텍스트·JSON·이미지 등 콘텐츠 타입. 크기 상한 적용 |
| 동시성 | HTTP 서버는 요청 간 상태 공유에 주의. 세션별 격리 |

## 리소스와 프롬프트 추가

| 요소 | 정의 | 사용 예 |
| --- | --- | --- |
| 리소스 | URI 템플릿 + 읽기 함수 | `issue://{id}` → 이슈 본문. 호스트가 문맥에 첨부 |
| 프롬프트 | 이름 + 인자 + 메시지 생성 함수 | `triage_issue(id)` → 분류 지시와 이슈 내용을 묶은 프롬프트 |

호스트가 리소스·프롬프트를 어떻게 노출하는지는 제품마다 다릅니다. 핵심 기능은 도구로 제공하고, 리소스·프롬프트는 보조로 둡니다.

## HTTP 전송과 인증

| 항목 | 내용 |
| --- | --- |
| 언제 | 여러 사용자가 공유, 서버가 원격에 있음, 호스트가 프로세스를 띄울 수 없음 |
| 인증 | 명세의 OAuth 2.1 기반 인가 흐름. 호스트가 토큰을 획득해 요청에 첨부 |
| 간단한 대안 | 사내 전용이면 리버스 프록시 뒤에서 헤더 토큰·네트워크 제한 |
| 세션 | 세션 ID로 상태 유지, 만료 처리 |
| 배포 | 일반 웹 서비스와 동일: 컨테이너, HTTPS, 상태 점검 |

개인·로컬 용도는 stdio로 시작하고, 공유가 필요해질 때 HTTP로 옮깁니다. 도구 코드는 전송과 분리해 두면 전환이 쉽습니다.

## 로깅과 진단

| 규칙 | 이유 |
| --- | --- |
| stdio 서버는 stderr 또는 파일에만 로그 | stdout은 프로토콜 채널 |
| 도구 호출마다 이름·인자 요약·소요 시간·성공 여부 | 오용·성능 분석 |
| 인자·결과의 민감 값 마스킹 | 로그 유출 방지 |
| 호스트의 MCP 로그 위치 확인 | 연결 실패 원인은 호스트 쪽 로그에 남는 경우가 많음 |

관련: [환경변수 관리](../../Security/env-management.md), [로깅](../../Backend/logging/logging.md), [예외 처리 전략](../../Backend/exception/exception-handling-strategy.md)

다음: [테스트와 배포](./testing-and-distribution.md)
