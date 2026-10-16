# Build

소스코드가 실행 파일·라이브러리·배포 패키지가 되는 과정과, 그 과정을 자동화하는 빌드 시스템을 정리합니다.

빌드 시스템은 **무엇을 입력으로 받아, 어떤 작업을, 어떤 순서로 실행하고, 무엇을 다시 사용할지** 결정합니다. 컴파일러는 그 작업 중 소스코드를 변환하는 도구입니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [빌드 과정과 용어](./build-pipeline.md) | 전처리, 컴파일, 어셈블, 링크, 패키징의 차이 |
| 2 | [의존성과 증분 빌드](./dependency-graph.md) | 작업 순서, 변경 감지, 병렬 실행의 원리 |
| 3 | [도구의 역할과 선택](./tools.md) | Make, Ninja, CMake, Gradle, Maven, Cargo, 웹 빌드 도구 |
| 4 | [C 프로젝트 빌드 실습](./c-build-example.md) | 수동 빌드 → Make → CMake로 같은 프로그램 빌드 |
| 5 | [캐시와 재현 가능한 빌드](./reproducibility.md) | 캐시 키, 환경 고정, 크로스 컴파일, CI 적용 |
| 6 | [빌드 오류 진단](./troubleshooting.md) | 실패 단계와 증상에 따른 점검 순서 |

처음에는 1~3을 읽고 실습으로 확인합니다. C 예제는 컴파일과 링크를 구분하기 위한 예제이며, 모든 언어가 같은 단계를 거치는 것은 아닙니다.

## JavaScript·TypeScript 빌드

웹·Node.js 프로젝트를 다룬다면 공통 개념을 읽은 뒤 아래 순서로 이어갑니다.

1. [도구의 역할과 선택](./javascript-tools.md) - 패키지 관리자, 변환기, 번들러, 프레임워크, 작업 관리 도구
2. [모듈과 번들링 원리](./javascript-modules.md) - ESM/CommonJS, 모듈 해석, 트리 셰이킹, 코드 분할, 라이브러리 출력
3. [개발·배포 빌드와 모노레포](./javascript-workflows.md) - Vite 스크립트, CI 설치, 환경변수, Turborepo·Nx, 캐시 점검

## 빠르게 구분하기

| 용어 | 의미 | 예시 |
| --- | --- | --- |
| 소스(Source) | 사람이 작성하거나 도구가 생성한 코드 | `.c`, `.java`, `.ts` |
| 타깃(Target) | 만들 결과물 또는 실행할 논리적 작업 | 실행 파일, 라이브러리, `test` |
| 아티팩트(Artifact) | 작업으로 만들어진 결과물 | `.o`, `.jar`, 웹 번들 |
| 툴체인(Toolchain) | 빌드에 사용하는 도구와 대상 환경의 조합 | 컴파일러, 링커, SDK, 표준 라이브러리 |
| 의존성(Dependency) | 결과를 만들기 전에 필요한 입력이나 작업 | 헤더, 라이브러리, 코드 생성 작업 |
| 빌드 설정(Configuration) | 결과를 만드는 옵션의 묶음 | Debug, Release, 대상 아키텍처 |

## 관련 지식

- [Makefile 문법과 활용](../Utility/makefile.md)
- [GitHub Actions](../Infrastructure/cicd/github-action.md)
- [Docker](../Infrastructure/docker/docker.md)
- [테스트 전략](../Backend/testing/testing-strategy.md)
