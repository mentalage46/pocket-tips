# 빌드 도구의 역할과 선택

도구 이름보다 맡는 역할을 먼저 구분하면 조합을 이해하기 쉽습니다. 한 도구가 여러 역할을 제공하기도 합니다.

## 역할별 비교

| 역할 | 책임 | 대표 도구 |
| --- | --- | --- |
| 컴파일러·링커 | 소스를 변환하고 오브젝트를 연결 | GCC, Clang, MSVC, rustc |
| 빌드 실행기 | 의존성에 따라 작업 실행, 변경 감지, 병렬 처리 | Make, Ninja |
| 빌드 구성·생성 도구 | 프로젝트 정의로 실행기·IDE용 빌드 파일 생성 | CMake, Meson |
| 생태계 통합 도구 | 의존성, 컴파일, 테스트, 패키징 통합 | Maven, Gradle, Cargo |
| 웹 빌드 도구 | 개발 서버, 모듈 변환·번들링, 자산 처리 등 | Vite, webpack, Rollup, esbuild |
| 패키지 관리자·스크립트 실행기 | 패키지 설치와 프로젝트 명령 실행 | npm, pnpm, Yarn |
| 대규모 빌드 시스템 | 명시적인 작업·의존성 모델, 캐시·원격 실행 지원 | Bazel |

`npm run build`의 실제 동작은 `package.json`의 `scripts.build`에 달려 있습니다. npm 자체가 프로젝트의 소스를 컴파일하거나 증분 빌드 그래프를 자동으로 구성하는 것은 아닙니다.

JavaScript 생태계는 [도구별 비교와 선택 기준](./javascript-tools.md)에서 자세히 다룹니다. [모듈과 번들링](./javascript-modules.md), [개발·배포 작업 구성](./javascript-workflows.md)도 함께 참고합니다.

## Make, Ninja, CMake의 관계

```text
CMakeLists.txt
    ↓ cmake로 구성·생성
build.ninja 또는 Makefile 등
    ↓ Ninja 또는 Make로 실행
컴파일러·링커 호출
    ↓
실행 파일·라이브러리
```

- **Make**: 파일 의존성과 명령을 직접 작성하기 쉽습니다. 반복 명령을 묶는 용도로도 사용합니다.
- **Ninja**: 빌드 실행에 집중하며, 빌드 파일은 보통 CMake·Meson 같은 상위 도구로 생성합니다.
- **CMake**: 타깃, 소스, 라이브러리, 옵션을 선언하면 선택한 생성기(Generator)에 맞는 빌드 파일을 만듭니다. 컴파일러 자체는 별도로 필요합니다.

생성된 `build.ninja`나 Makefile을 직접 수정하면 다음 구성·생성 때 덮어써질 수 있습니다. 프로젝트의 원본 설정을 수정합니다.

## 프로젝트에 맞게 선택하기

| 상황 | 시작점 | 판단 기준 |
| --- | --- | --- |
| 작은 C/C++ 프로젝트 | Make | 의존성과 명령을 직접 관리할 수 있는 규모인지 |
| 여러 OS·IDE를 지원하는 C/C++ | CMake 또는 Meson | 사용하는 라이브러리·SDK가 지원하는 방식인지 |
| Java/Kotlin | Maven 또는 Gradle | 기존 프로젝트 관례, 플러그인, 멀티 모듈 요구 |
| Rust | Cargo | 생태계의 기본 패키지·빌드 흐름 활용 |
| 웹 애플리케이션 | 프레임워크가 제공하는 빌드 도구 | 타입 검사, 번들 생성, 서버 빌드 명령 구분 |
| 큰 저장소·여러 언어 | 기존 도구의 확장성 평가 후 Bazel 등 검토 | 의존성 모델링 비용 대비 캐시·원격 실행의 이점 |

도구를 추가하기 전에 병목이 컴파일인지, 의존성 다운로드인지, 테스트인지 측정합니다. 모노레포라는 이유만으로 새로운 빌드 시스템이 필요한 것은 아닙니다.

## 공식 자료

- [GNU Make](https://www.gnu.org/software/make/manual/make.html), [Ninja](https://ninja-build.org/manual.html)
- [CMake Tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html), [Meson](https://mesonbuild.com/)
- [Maven](https://maven.apache.org/guides/), [Gradle](https://docs.gradle.org/current/userguide/userguide.html), [Cargo](https://doc.rust-lang.org/cargo/)
- [Vite](https://vite.dev/guide/), [Bazel](https://bazel.build/start)
