# MCP 서버 테스트와 배포

서버가 프로토콜상 동작하는 것과 **모델이 도구를 잘 쓰는 것**은 다른 문제입니다. 단위 테스트, Inspector 수동 확인, 실제 호스트에서의 시나리오 테스트를 단계별로 나눕니다.

## 테스트 단계

```mermaid
flowchart LR
    U[단위 테스트: 도구 함수] --> I[Inspector: 프로토콜·스키마 확인]
    I --> H[호스트 연동: 실제 에이전트 시나리오]
    H --> E[평가 세트: 도구 선택·인자 정확도]
```

| 단계 | 방법 | 확인하는 것 |
| --- | --- | --- |
| 단위 | 도구 함수를 직접 호출, 외부 API는 모킹 | 로직, 오류 형식, 결과 크기 상한 |
| 프로토콜 | MCP Inspector로 서버 실행, 도구 목록·호출 | 스키마가 의도대로 생성되는지, 설명 노출 |
| 클라이언트 테스트 | SDK의 클라이언트로 서버를 띄워 자동 호출 | CI에서 회귀 검사 |
| 호스트 연동 | 코딩 에이전트·데스크톱 앱에 등록해 실제 요청 | 모델이 도구를 고르는지, 승인 흐름 |
| 평가 세트 | 대표 요청 20~50개와 기대 도구 호출 | 설명·스키마 변경의 효과 측정 |

```bash
# Inspector 웹 UI
npx @modelcontextprotocol/inspector

# Inspector CLI로 도구 목록 확인 (최신 프로토콜과 2025년식 핸드셰이크를 각각 검사)
npx @modelcontextprotocol/inspector --cli node build/index.js --protocol-era modern --method tools/list
npx @modelcontextprotocol/inspector --cli node build/index.js --protocol-era legacy --method tools/list

# Python SDK: 개발 모드로 Inspector에 연결
uv run mcp dev server.py
```

## 흔한 문제

| 증상 | 원인 | 확인 |
| --- | --- | --- |
| 호스트가 서버를 찾지 못함 | 실행 경로·명령 오류, 가상 환경 미활성화 | 호스트 설정에서 절대 경로, 호스트 MCP 로그 |
| 연결 직후 끊김 | stdout에 로그 출력, 초기화 전 예외 | stderr로 로그 이동, 서버 단독 실행 |
| 도구가 목록에 없음 | 등록 누락, 호스트 캐시 | Inspector로 `tools/list` 확인 |
| 모델이 도구를 쓰지 않음 | 설명이 모호, 비슷한 내장 도구 존재 | 설명에 언제 쓰는지 명시, 이름 변경 |
| 잘못된 인자로 호출 | 스키마 제약 부족, 설명 누락 | `enum`·범위·설명 추가 |
| 결과가 너무 길어 문맥 소모 | 상한 없음 | 결과 요약과 페이지 처리 |
| 환경 변수 누락 | 호스트가 셸 환경을 상속하지 않음 | 호스트 설정의 `env`에 명시 |

## 호스트에 등록하기

| 호스트 | 방법(예) |
| --- | --- |
| Claude Code | `claude mcp add --transport stdio <name> -- <command> [args]`, HTTP는 `claude mcp add --transport http <name> <url>`. 프로젝트 공유는 `--scope project`로 `.mcp.json`에 기록 |
| Claude Desktop | 설정 파일의 `mcpServers` 항목 |
| Cursor, Windsurf 등 | 각 제품의 MCP 설정 파일 또는 UI |
| 자체 에이전트 | SDK 클라이언트로 연결하고 도구 목록을 모델 API 형식으로 변환 |

```bash
# 환경 변수는 --env (또는 -e)로. 옵션은 이름 앞에, -- 뒤는 서버 명령 그대로 전달
claude mcp add --env TRACKER_TOKEN=xxx --transport stdio issues -- uvx my-issues-mcp
```

```json
{
  "mcpServers": {
    "issues": {
      "command": "uvx",
      "args": ["my-issues-mcp"],
      "env": { "TRACKER_TOKEN": "${TRACKER_TOKEN}" }
    },
    "shared-api": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

`.mcp.json`의 `env`·`url`·`headers`는 `${VAR}`, `${VAR:-기본값}` 형태로 셸 환경을 참조할 수 있습니다. 설정 파일 형식과 범위(사용자·프로젝트)는 호스트마다 다릅니다. 프로젝트 공유 설정에는 비밀을 넣지 않고 환경 변수 참조로 둡니다.

## 패키징과 배포

| 형태 | 방법 | 적합한 경우 |
| --- | --- | --- |
| Python 패키지 | PyPI 배포, `uvx <package>`로 실행 | 설치 없이 실행, 팀 공유 |
| npm 패키지 | `npx <package>`로 실행 | TypeScript 서버 |
| 컨테이너 | Docker 이미지, stdio는 `docker run -i` | 의존성 격리, 서버 사이드 |
| 원격 HTTP | 컨테이너·서버리스에 배포, 인증 적용 | 다중 사용자, 중앙 운영 |
| 레지스트리 등록 | 공식 MCP 레지스트리·호스트별 마켓 | 외부 공개 |

| 배포 전 점검 | 내용 |
| --- | --- |
| 버전 | 서버 이름·버전을 초기화 응답에 포함, 변경 이력 관리 |
| 의존성 고정 | 락 파일, 최소 런타임 버전 명시 |
| 설정 문서 | 필요한 환경 변수, 권한, 예시 설정 |
| 보안 | 비밀 미포함, 허용 범위 기본값이 보수적인지 |
| 호환성 | 지원 프로토콜 버전(최신 SDK는 2025년식 `initialize` 클라이언트와 2026-07-28 클라이언트 모두 처리), 주요 호스트에서 동작 확인 |

## 운영

| 항목 | 내용 |
| --- | --- |
| 사용량 | 도구별 호출 수, 실패율, 소요 시간 |
| 변경 관리 | 도구 이름·스키마 변경은 호환성 깨짐. 새 도구 추가 후 구 도구 폐기 |
| 외부 API 변경 | 통합 테스트를 주기적으로 실행 |
| 서드파티 서버 사용 | 출처·권한 검토. 서버는 모델에 지시를 주입할 수 있는 위치 |
| 비용 | 도구 결과 길이가 모델 입력 토큰으로 이어짐 |

## 참고 자료

- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Claude Code MCP 설정](https://code.claude.com/docs/en/mcp)

확인일: 2026-10-16

관련: [GitHub Actions](../../Infrastructure/cicd/github-action.md), [Docker](../../Infrastructure/docker/docker.md), [테스트 전략](../../Quality/testing-strategy.md), [AI 보안](../security/README.md)
