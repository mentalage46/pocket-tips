# C 프로젝트 빌드 실습

같은 프로그램을 수동 명령, Make, CMake로 빌드하면서 각 도구의 역할을 확인합니다. 아래 파일은 실습용 디렉터리에 직접 만듭니다.

**환경**: Linux/macOS의 POSIX 셸, GCC 또는 Clang 계열의 `cc`, GNU Make. CMake 실습은 CMake 3.16 이상과 Ninja가 추가로 필요합니다. 설치된 도구에 따라 명령 이름이 다를 수 있습니다.

## 1. 소스 준비

```text
build-demo/
├── main.c
├── math.c
└── math.h
```

`math.h` — 여러 소스에서 사용할 함수 선언:

```c
#ifndef DEMO_MATH_H
#define DEMO_MATH_H

int add(int a, int b);

#endif
```

`math.c` — 함수 정의:

```c
#include "math.h"

int add(int a, int b) {
    return a + b;
}
```

`main.c` — 함수를 사용하는 코드:

```c
#include <stdio.h>
#include "math.h"

int main(void) {
    printf("%d\n", add(2, 3));
    return 0;
}
```

## 2. 컴파일과 링크를 따로 실행

실습 디렉터리에서 실행합니다.

```sh
mkdir -p build-manual
cc -Wall -Wextra -g -c main.c -o build-manual/main.o
cc -Wall -Wextra -g -c math.c -o build-manual/math.o
cc build-manual/main.o build-manual/math.o -o build-manual/app
./build-manual/app
```

예상 출력은 `5`입니다. `-c`는 링크 없이 오브젝트 파일까지만 만듭니다. 마지막 `cc` 호출은 컴파일러 드라이버가 링커와 필요한 기본 런타임 라이브러리를 연결하도록 합니다.

링크 명령에서 `math.o`를 빼면 `add`의 정의를 찾을 수 없어 링크 오류가 발생합니다. 헤더의 선언과 링크할 구현이 다르다는 점을 확인할 수 있습니다.

## 3. Make로 의존성과 명령 선언

프로젝트 루트에 `Makefile`을 만듭니다. 명령 앞 들여쓰기는 **TAB**입니다.

```makefile
.DEFAULT_GOAL := all
CC = cc
CPPFLAGS =
CFLAGS = -Wall -Wextra -g
LDFLAGS =
LDLIBS =
BUILD = build-make
OBJECTS = $(BUILD)/main.o $(BUILD)/math.o
DEPS = $(OBJECTS:.o=.d)

.PHONY: all
all: $(BUILD)/app

$(BUILD)/app: $(OBJECTS)
	$(CC) $(LDFLAGS) $(OBJECTS) $(LDLIBS) -o $@

$(BUILD)/%.o: %.c | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

$(BUILD):
	mkdir -p $@

-include $(DEPS)
```

| 문법·옵션 | 의미 |
| --- | --- |
| `$@` | 현재 타깃 파일 |
| `$<` | 첫 번째 일반 의존 파일 |
| `%.o: %.c` | 같은 이름의 C 파일을 오브젝트로 만드는 패턴 규칙 |
| `\| $(BUILD)` | 디렉터리를 먼저 생성하되, 디렉터리 수정 시각 변화로 오브젝트를 다시 만들지는 않음 |
| `-MMD` | 사용자 헤더 의존성을 `.d` 파일로 생성; 시스템 헤더는 제외 |
| `-MP` | 의존성 파일에 헤더용 빈 규칙을 넣어 삭제·이름 변경한 헤더의 오래된 참조로 인한 Make 오류를 완화 |
| `-include` | 파일이 아직 없어도 오류 없이 읽기 시도 |

`-MP`는 소스가 여전히 필요로 하는 헤더의 누락을 해결하지 않습니다. 시스템 헤더·SDK가 바뀌면 이 예제에서는 별도로 전체 재빌드를 고려해야 합니다.

```sh
make -j4
./build-make/app
make -j4
```

두 번째 빌드에서는 컴파일·링크 명령이 다시 실행되지 않아야 합니다. `math.c` 내용만 수정하면 `math.o`와 실행 파일이, `math.h`를 수정하면 두 오브젝트와 실행 파일이 갱신됩니다.

이 예제는 컴파일 옵션 변경을 자동 추적하지 않습니다. 다른 설정은 `make BUILD=build-release CFLAGS='-Wall -Wextra -O2'`처럼 별도 디렉터리를 사용합니다. 이미 사용한 디렉터리에서 옵션을 또 바꾸는 경우에는 기존 출력을 제거하거나 설정 변경을 추적하는 규칙이 필요합니다.

## 4. CMake로 타깃 정의

루트에 `CMakeLists.txt`를 만듭니다.

```cmake
cmake_minimum_required(VERSION 3.16)
project(BuildDemo LANGUAGES C)

add_library(demo_math STATIC math.c)
target_include_directories(demo_math PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")

add_executable(app main.c)
target_link_libraries(app PRIVATE demo_math)
```

`PUBLIC` include 경로는 라이브러리 자체와 이를 사용하는 타깃에 적용됩니다. `app`은 `demo_math`에 대한 링크 관계를 선언하여 필요한 빌드 순서와 사용 요구사항을 전달받습니다.

```sh
cmake -S . -B build-cmake -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build-cmake --parallel 4
./build-cmake/app
```

첫 명령은 구성·생성, 두 번째는 실제 빌드입니다. `cmake --build`는 생성기에 맞는 실행기를 호출합니다. 빌드 명령을 다시 실행하거나 소스·헤더를 수정하여 Make 실습과 같은 변경 감지를 확인합니다.

`CMAKE_BUILD_TYPE`은 여기서 사용하는 Ninja 같은 단일 구성 생성기에 적용됩니다. Visual Studio나 Ninja Multi-Config 같은 다중 구성 생성기는 빌드 시 `--config Debug`를 사용하며 결과물 경로도 달라질 수 있습니다.

실제 프로젝트에서는 사용한 `build-manual/`, `build-make/`, `build-release/`, `build-cmake/` 같은 출력 디렉터리를 버전 관리에서 제외합니다.

참고: [GCC 옵션](https://gcc.gnu.org/onlinedocs/gcc/Option-Summary.html), [CMake 빌드 시스템](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html)
