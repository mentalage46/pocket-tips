# JavaScript 모듈과 번들링 원리

번들러는 진입점(Entry point)에서 시작해 `import` 등의 의존 관계를 따라가고, 모듈을 해석·변환하여 출력 파일을 만듭니다. 결과는 하나의 파일일 수도 있고 여러 청크(Chunk)일 수도 있습니다.

## ESM과 CommonJS

| 구분 | ESM | CommonJS |
| --- | --- | --- |
| 기본 문법 | `import`, `export` | `require`, `module.exports` |
| 특징 | 정적인 import/export 관계를 분석하기 쉬움 | 실행 중 결정되는 require 등으로 정적 분석이 어려울 수 있음 |
| 사용 환경 | 브라우저 모듈, Node.js, 번들러 | 주로 Node.js와 이를 지원하는 번들러 |

Node.js에서 `.mjs`는 ESM, `.cjs`는 CommonJS를 명시합니다. `.js`는 가장 가까운 `package.json`의 `type` 등 실행 환경의 규칙에 영향을 받으므로 배포 패키지에 형식을 명시하는 편이 좋습니다.

ESM과 CommonJS 사이의 상호 운용 규칙은 Node.js 버전과 도구에 따라 다릅니다. 타입 검사나 번들링이 성공해도 실제 소비 환경에서 export 형태가 맞는지 확인해야 합니다.

### 패키지 이름은 어떻게 파일이 되는가?

```js
import { format } from "some-package";
```

`some-package`는 파일 경로가 아닌 패키지 지정자입니다. Node.js나 번들러는 패키지의 `exports`, 조건별 진입점, 지원 시 `main` 등의 필드를 확인하여 실제 파일을 찾습니다. 브라우저가 패키지 관리자의 설치 구조를 자동으로 이해하는 것은 아니며, 직접 실행하려면 URL이나 import map 등으로 해석할 수 있어야 합니다.

- **`exports`**: 패키지에서 공개하는 진입점과 `import`·`require` 등 조건별 경로를 정의합니다.
- **`main`**: 전통적인 기본 진입점입니다. `exports`가 있는 환경에서는 공개 경로 규칙에 주의합니다.
- **`module`**: 일부 번들러가 사용하는 관례이며 Node.js의 표준 진입점 필드는 아닙니다.
- **`types`**: TypeScript가 사용할 타입 선언 위치를 지정합니다. 조건부 exports를 사용하면 타입 경로도 함께 설계합니다.

TypeScript의 `paths`는 타입 검사기의 경로 해석을 돕지만 일반적으로 출력 JS의 경로를 바꾸지 않습니다. 별칭을 사용한다면 번들러·런타임·테스트 도구가 모두 같은 경로를 해석하도록 설정합니다.

## 변환과 폴리필

**트랜스파일(Transpile)**은 코드를 다른 문법의 코드로 변환하는 작업입니다. JSX를 JS 호출로, TypeScript에서 타입 구문을 제거한 JS로 바꾸는 것이 예입니다.

**폴리필(Polyfill)**은 실행 환경에 없는 API를 보충하는 구현입니다. 문법을 낮추는 것과 API를 추가하는 것은 다릅니다. 오래된 브라우저를 대상으로 코드를 변환해도 `Promise`나 최신 배열 메서드가 자동으로 생기는 것은 아닙니다.

대상 환경은 번들러의 target, Babel 설정, Browserslist 등 도구가 실제로 읽는 설정으로 지정합니다. 모든 도구가 Browserslist를 자동으로 사용한다고 가정하지 않습니다.

## 번들 최적화

| 기능 | 목적 | 확인할 점 |
| --- | --- | --- |
| Tree shaking | 사용하지 않는 export·코드 제거 | 정적 분석 가능성, 부수 효과, 배포 빌드 설정 |
| Code splitting | 필요한 시점에 코드를 나눠 로드 | 초기 로드와 추가 요청 비용, 공유 청크 |
| Minification | 코드 크기 축소 | 압축 후 실제 전송 크기와 실행 비용 |
| 소스맵(Source map) | 변환된 코드를 원본 위치와 연결 | 오류 추적 도구 연동과 배포 범위 |
| 콘텐츠 해시 파일명 | 파일 내용 변경 시 URL 변경 | HTML과 청크를 함께 배포하고 캐시 정책 구성 |

### Tree shaking과 부수 효과

함수를 호출하지 않아도 모듈을 불러오는 것만으로 전역 등록, 폴리필 적용, CSS 로드 같은 동작이 발생할 수 있습니다. 이런 동작이 부수 효과(Side effect)입니다.

webpack 등 `sideEffects` 필드를 사용하는 도구에서는 이 정보를 최적화에 활용합니다. 예를 들어 다음은 CSS와 등록 모듈에 부수 효과가 있다고 선언하는 `package.json` 일부입니다.

```json
{
  "sideEffects": ["**/*.css", "./src/register.js"]
}
```

나머지 파일은 부수 효과가 없다고 선언하는 셈이므로 실제 코드와 맞아야 합니다. 배포 파일이 `dist/`에 있다면 패턴도 그 구조에 맞춥니다. 무조건 `false`로 설정하면 필요한 초기화 코드나 스타일이 제거될 수 있습니다.

### 동적 import와 청크

```js
export async function openChart(data) {
  const { renderChart } = await import("./chart.js");
  renderChart(data);
}
```

번들러가 코드 분할을 지원하고 해당 출력 방식이 활성화되어 있으면 `chart.js`를 별도 청크로 만들 수 있습니다. 실제 청크 구분과 로드 시점은 정적 import, 공유 의존성, 프리로드, 설정에도 영향을 받습니다. 별도 청크가 생겼다는 사실만으로 초기 로드가 줄었다고 단정하지 않습니다.

### External과 라이브러리 빌드

**External**로 지정한 의존성은 번들 안에 포함하지 않고 소비 환경에서 제공하도록 남깁니다. Node.js 내장 모듈이나 소비 앱과 공유할 라이브러리에 사용합니다.

`peerDependencies`는 소비 측 의존성 관계를 표현하는 패키지 메타데이터입니다. 모든 번들러가 이를 읽어 자동으로 external 처리하는 것은 아닙니다. 예를 들어 React 라이브러리는 React의 중복 포함을 피하도록 peer 의존성과 번들 설정을 함께 확인합니다.

라이브러리 배포에서는 ESM·CommonJS 출력, `.d.ts`, `exports`, 자산 경로가 서로 맞아야 합니다. 두 형식을 모두 제공하는 비용이 필요하지 않다면 하나의 형식만 지원할 수도 있습니다.

## 결과를 확인하는 방법

- 번들 분석 보고서로 큰 패키지와 중복 의존성을 찾습니다.
- 개발 서버가 아닌 배포 빌드에서 초기 요청, 청크 크기, 실제 기능을 확인합니다.
- 라이브러리는 패키지에 포함될 파일을 확인하고, 소비 프로젝트에서 import와 타입 해석을 검증합니다.

관련: [개발·배포 빌드와 모노레포](./javascript-workflows.md), [웹 성능](../Frontend/web-performance.md)

참고: [Node.js 패키지](https://nodejs.org/api/packages.html), [webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/), [TypeScript 모듈 해석](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
