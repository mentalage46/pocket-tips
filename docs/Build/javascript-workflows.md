# JavaScript 개발·배포 빌드와 모노레포

개발 서버가 실행된다는 것은 개발 중 코드를 제공할 수 있다는 뜻입니다. 타입 검사, 배포 번들 생성, 배포 환경에서의 실행도 각각 확인해야 합니다.

## 개발 서버와 배포 빌드

| 작업 | 주요 목적 | 확인할 점 |
| --- | --- | --- |
| 개발 서버 | 빠른 코드 반영과 디버깅 | 요청 시 변환, 메모리 캐시, HMR 등 도구별 동작 |
| 타입 검사 | 타입 오류 탐지 | 번들러와 별도 프로세스인지 |
| 배포 빌드 | 배포 대상에 맞는 출력 생성 | 최적화, 자산 경로, 환경 설정, 서버·클라이언트 분리 |
| 로컬 미리보기 | 생성된 출력의 동작 확인 | 실제 운영 서버·SSR 환경과의 차이 |

**HMR(Hot Module Replacement)**은 페이지 전체를 다시 불러오지 않고 변경 모듈을 교체하는 기능입니다. 상태 보존 범위는 프레임워크 통합에 따라 다르며, 모든 변경에서 상태를 유지하는 것은 아닙니다.

## Vite + TypeScript 스크립트 예시

아래는 Vite와 TypeScript가 개발 의존성으로 설치되어 있고, 진입 HTML과 소스, `tsconfig.json`이 준비된 **단일 브라우저 앱**의 `package.json` 일부입니다. 독립 실행 가능한 전체 프로젝트는 아닙니다.

```json
{
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview"
  }
}
```

- `npm run dev`: 개발 서버를 실행합니다.
- `npm run typecheck`: JS 파일을 생성하지 않고 타입을 검사합니다.
- `npm run build`: 타입 검사가 성공한 뒤 배포 빌드를 만듭니다.
- `npm run preview`: 빌드 결과를 로컬에서 확인합니다. 운영 서버로 사용하는 명령은 아닙니다.

프로젝트 참조(Project references)를 사용하는 템플릿은 `tsc -b` 등 여러 TS 프로젝트를 처리하는 명령이 필요할 수 있습니다. 기존 템플릿의 빌드 명령을 이 예제로 무조건 교체하지 않습니다. Vite의 TS 변환 자체는 타입 검사를 대신하지 않습니다.

## 의존성 설치와 CI

| 도구 | 기존 lockfile을 따르는 CI 설치 예시 | 조건 |
| --- | --- | --- |
| npm | `npm ci` | `package-lock.json` 등 지원 lockfile이 존재하고 manifest와 일치 |
| pnpm | `pnpm install --frozen-lockfile` | `pnpm-lock.yaml`이 manifest와 일치 |
| 현대 Yarn | `yarn install --immutable` | 해당 Yarn 버전의 lockfile을 변경하지 않음 |
| Yarn Classic 1.x | `yarn install --frozen-lockfile` | 현대 Yarn과 설정·명령 차이 확인 |

프로젝트가 사용하는 패키지 관리자와 lockfile을 선택하고, Node.js·패키지 관리자 버전을 팀과 CI에서 맞춥니다. `packageManager` 필드로 의도를 기록할 수 있지만 모든 환경에서 그 버전이 자동 설치·강제되는 것은 아닙니다.

npm 프로젝트의 CI에서는 다음 흐름으로 실행할 수 있습니다. 앞의 build 스크립트가 있다는 전제입니다.

```sh
npm ci
npm run build
```

빌드 도구는 보통 `devDependencies`에 있으므로 빌드 단계에서 이를 생략하면 명령을 찾지 못할 수 있습니다. Node.js 서비스의 실행 환경에서 필요한 의존성을 줄이는 작업은 빌드 단계와 구분합니다. 브라우저 정적 앱은 일반적으로 생성된 자산을 배포하며 `node_modules` 전체를 제공하지 않습니다.

## 환경변수와 배포 대상

- Vite의 `import.meta.env.VITE_*`처럼 클라이언트 코드에 노출되는 값은 빌드 결과에 들어갈 수 있습니다. 해당 접두사에 비밀 값을 넣지 않습니다.
- 빌드 시 치환한 API 주소는 배포 서버의 환경변수를 바꿔도 이미 생성된 JS에서 바뀌지 않습니다. 런타임 설정이 필요하면 별도 설정 응답이나 서버 주입 방식을 설계합니다.
- 하위 경로에 배포한다면 도구의 base/public path와 라우터의 기준 경로를 맞춥니다.
- SSR은 브라우저 코드와 서버 코드를 함께 다룹니다. `window`, `document`와 Node.js 전용 API의 사용 위치를 구분합니다.
- 프레임워크 결과물이 정적 파일인지 서버 실행물인지 확인하고, 정적 호스팅·Node.js 서버·서버리스 등 대상에 맞는 출력 방식을 사용합니다.

## Workspace와 작업 그래프

**Workspace**는 한 저장소에서 여러 패키지를 관리하고 연결하는 기능입니다. 연결되었다는 사실만으로 모든 패키지의 빌드 순서와 결과 캐시가 자동으로 해결되지는 않습니다.

```text
packages/ui의 build → apps/web의 build
```

위 관계는 `web`이 `ui`의 빌드 결과를 읽을 때 필요합니다. `ui` 소스를 직접 처리하는 구성에서는 별도 `ui` 빌드가 필요하지 않을 수도 있습니다. 실제 입력 관계에 따라 작업을 연결합니다.

### Turborepo와 Nx

| 도구 | 주요 개념 | 확인할 설정 |
| --- | --- | --- |
| Turborepo | workspace 패키지 스크립트를 작업 그래프로 실행 | `dependsOn`, `inputs`, `outputs`, 환경변수 |
| Nx | 프로젝트 그래프와 작업 그래프, 플러그인·executor, 캐시·affected 실행 | 작업의 의존성·입력·출력, 변경 기준 커밋 |

Turborepo 2 계열 설정 형식의 예시입니다. 각 패키지에 `build` 스크립트가 있고, 패키지 의존성이 manifest에 선언되어 있으며, 결과를 각각 `dist/`에 출력한다고 가정합니다.

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "env": ["VITE_API_URL"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`^build`는 의존 패키지의 build를 먼저 실행하도록 연결합니다. `outputs`는 캐시에서 복원할 경로를 각 패키지 기준으로 선언합니다. `.next/` 등 다른 출력 구조를 사용하는 앱은 그에 맞춰 설정해야 합니다.

`env`는 결과에 영향을 주는 환경변수를 캐시 키에 반영합니다. `.env` 파일도 빌드 입력에 포함되어야 합니다. 기본 입력에서 제외되는 파일, 공통 설정, 코드 생성 입력이 있다면 `inputs`나 전역 입력 설정을 점검합니다. 기본 입력을 사용자 목록으로 대체할 때 필요한 소스를 빠뜨리지 않습니다.

### 캐시 확인 체크리스트

- [ ] 의존 패키지 변경 시 소비 앱의 빌드도 갱신되는가?
- [ ] 출력 디렉터리가 없는 상태에서 캐시 적중 시 필요한 파일이 복원되는가?
- [ ] 환경변수·공통 설정·코드 생성 입력 변경이 반영되는가?
- [ ] 개발 서버처럼 끝나지 않는 작업을 일반 빌드 작업의 선행 조건으로 두지 않았는가?
- [ ] 캐시 없이도 빈 체크아웃에서 빌드가 성공하는가?

## 흔한 문제

| 증상 | 먼저 확인할 것 |
| --- | --- |
| 개발 서버는 되는데 타입 검사가 실패 | 변환과 타입 검사 분리, 검사 대상 tsconfig |
| TS 별칭은 인식하지만 실행 중 모듈을 못 찾음 | 번들러·런타임의 별칭 설정, 출력 import 경로 |
| `require`·`module`이 없다는 오류 | ESM/CommonJS 형식, 확장자, `type`, 도구 설정 파일 형식 |
| 배포 후 청크 404 | base 경로, 이전 HTML 캐시, 배포 중 이전 청크 삭제 |
| 라이브러리 CSS나 초기화가 사라짐 | `sideEffects`, tree shaking, 배포 자산 목록 |
| 캐시 적중인데 출력이 없거나 설정이 오래됨 | `outputs`, 환경변수·파일 입력 선언 |

관련: [캐시와 재현성](./reproducibility.md), [빌드 오류 진단](./troubleshooting.md)

참고: [Vite 기능](https://vite.dev/guide/features), [Vite 환경변수](https://vite.dev/guide/env-and-mode), [Turborepo 설정](https://turborepo.com/docs/reference/configuration), [Nx 캐시](https://nx.dev/concepts/how-caching-works)
