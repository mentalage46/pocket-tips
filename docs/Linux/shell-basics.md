# 셸 스크립트의 기본과 함정

> 셸은 프로그램을 **실행하고 연결**하는 언어입니다. 문법보다 **"텍스트가 어떻게 치환되고 쪼개지는가"** 와 **"실패가 어떻게 전파되는가"** 를 이해하는 것이 핵심입니다.

개발용 노트북(macOS)과 서버(Linux)의 도구가 달라서 생기는 문제도 함께 다룹니다. 이 문서의 모든 실행 결과는 **macOS 26.5의 bash 3.2.57과 순정 BSD 도구**에서 얻었고, GNU(Linux) 쪽 동작은 공식 문서로 확인했습니다.

---

## 개념 1: 모든 명령은 "종료 코드"로 말한다

| 개념 | 설명 |
| --- | --- |
| **종료 코드** | 프로그램이 끝나며 돌려주는 정수. **0 = 성공, 그 외 = 실패** |
| `$?` | 직전 명령의 종료 코드 |
| `a && b` | a가 **성공하면** b 실행 |
| `a \|\| b` | a가 **실패하면** b 실행 |
| `a ; b` | 결과와 무관하게 순서대로 실행 |

```bash
ls /nonexistent 2>/dev/null; echo "$?"     # 1  (실패)
true; echo "$?"                            # 0
```

셸에서 `if`는 **조건식이 아니라 명령의 종료 코드**를 검사합니다(`if grep -q foo file; then ...`).

### 파이프라인은 마지막 명령의 상태만 돌려준다

```bash
false | cat; echo "$?"                     # 0   ← false가 실패했는데 파이프라인은 성공
set -o pipefail
false | cat; echo "$?"                     # 1   ← pipefail: 파이프라인 중 실패가 있으면 실패
```

앞 단계가 실패해도 마지막 명령(`cat`)이 성공하면 전체가 성공으로 보입니다. `curl ... | tar xz`가 다운로드 실패를 놓치는 이유입니다.

### `set -euo pipefail`은 만능이 아니다

스크립트 첫머리의 관용구이지만, 각각이 하는 일과 **예외**를 알아야 합니다.

| 옵션 | 효과 |
| --- | --- |
| `-e` | 명령이 0이 아닌 상태로 끝나면 **즉시 종료** |
| `-u` | 정의되지 않은 변수를 쓰면 **오류** (`UNSET_VAR: unbound variable`) |
| `-o pipefail` | 파이프라인의 어느 단계든 실패하면 실패 |

Bash 매뉴얼은 `-e`가 **종료하지 않는 경우**를 명시합니다. `while`/`until`의 조건, `if`의 조건, `&&`/`||` 목록에서 **마지막이 아닌** 명령, 파이프라인의 마지막이 아닌 명령(`pipefail`이 없을 때), `!`로 상태를 뒤집은 명령입니다. 실행해서 확인했습니다.

```bash
( set -e; echo a; false; echo b )                  # a 출력 후 종료 (b는 출력 안 됨)
( set -e; false || true; echo "계속 실행" )         # || true 때문에 계속
( set -e; if false; then :; fi; echo "계속 실행" )  # if 조건의 실패는 무시
( set -e; f() { false; echo "false 다음 줄 실행됨"; }; f && echo done )
#   → "false 다음 줄 실행됨"이 출력됨: 함수가 && 안에서 호출되면 -e가 함수 안에서도 꺼짐
```

- 그래서 `-e`에 **오류 처리를 맡기지 말고**, 중요한 단계는 `command || { echo "실패"; exit 1; }`처럼 명시적으로 확인합니다.
- `local x=$(false)`처럼 **선언과 대입을 한 줄에** 쓰면 `$(...)`의 실패가 가려집니다(`x=[]`로 계속 진행됨을 확인). `local x; x=$(false)`로 나눕니다.

---

## 개념 2: 변수는 "텍스트로 치환된 뒤 공백으로 쪼개진다"

셸은 `$변수`를 값으로 **치환한 다음, 공백을 기준으로 단어를 나눕니다**(word splitting). 따옴표가 없으면 값에 공백이 있을 때 인자가 쪼개집니다.

```bash
d="my dir"
for x in $d;   do echo "[$x]"; done      # [my]  [dir]     ← 두 개로 쪼개짐
for x in "$d"; do echo "[$x]"; done      # [my dir]        ← 하나로 유지
```

**규칙: 변수는 항상 `"$var"`로 감쌉니다.** 파일 이름에 공백이 있을 때 `rm $file`은 엉뚱한 파일을 지울 수 있습니다.

### 빈 변수는 가장 위험한 입력이다

```bash
v=""
echo rm -rf /$v/tmp-demo                 # rm -rf //tmp-demo   ← 변수가 비면 경로가 루트 기준으로 바뀜
```

변수가 비었거나 정의되지 않았을 때 **멈추는** 형태를 씁니다.

```bash
rm -rf "/${v:?v is empty or unset}/tmp-demo"
# bash: v: v is empty or unset     ← 오류로 중단됨 (rm 실행 안 됨)
```

`${var:?메시지}`는 변수가 비었거나 없으면 메시지를 출력하고 종료합니다. `set -u`와 달리 **비어 있는 값도** 막습니다.

---

## 리다이렉션: 순서가 의미를 바꾼다

```bash
ls /nonexistent  > out.txt 2>&1     # stdout을 파일로, 그다음 stderr를 "지금 stdout이 가리키는 곳(파일)"으로
ls /nonexistent 2>&1 > out.txt      # stderr를 "지금 stdout(터미널)"으로, 그다음 stdout만 파일로
```

| 형태 | 파일 | 터미널 |
| --- | --- | --- |
| `> out.txt 2>&1` | 오류 메시지 44바이트 | 아무것도 없음 |
| `2>&1 > out.txt` | **0바이트** | 오류 메시지가 **터미널에 출력됨** |

`2>&1`은 "stderr를 **그 순간의** stdout 위치로 복제"하라는 뜻이라 **왼쪽에서 오른쪽으로** 평가됩니다. 둘 다 파일로 보내려면 `> file 2>&1` 순서입니다.

---

## 파일 이름 다루기: 공백과 개행을 견디는 방법

`ls | xargs`는 공백이 있는 이름에서 깨집니다. 실제 결과입니다(`a b.txt`가 있을 때).

```bash
ls *.txt | xargs -n1 echo "got:"
# got: a        ← "a b.txt"가 둘로 쪼개짐
# got: b.txt

find . -maxdepth 1 -name '*.txt' -print0 | xargs -0 -n1 echo "got:"
# got: ./a b.txt    ← 널 문자로 구분하면 안전
```

- `find -print0`과 `xargs -0`(널 문자 구분)을 한 쌍으로 씁니다. xargs 매뉴얼은 `--null`이 "항목에 공백, 따옴표, 백슬래시가 있을 수 있을 때" 유용하다고 설명합니다.
- 간단한 반복은 `for f in *.txt; do ... "$f" ...; done`처럼 **글로빙 결과를 따옴표로 감싸** 처리하면 파이프가 필요 없습니다.

---

## macOS(BSD)와 Linux(GNU)의 도구 차이

노트북에서 만든 스크립트가 서버에서 깨지거나 그 반대가 되는 가장 흔한 원인입니다. 순정 macOS 도구(`/usr/bin/*`)에서 실행한 결과와 GNU 문서를 대조했습니다.

| 하고 싶은 일 | GNU (Linux) | BSD (macOS) 실행 결과 | **양쪽에서 동작** |
| --- | --- | --- | --- |
| 파일 직접 수정 | `sed -i 's/a/b/' f` (접미사는 선택) | **오류** `invalid command code` — `-i` 뒤에 백업 접미사를 **반드시** 요구 | **`sed -i.bak 's/a/b/' f`** 후 `.bak` 삭제 |
| 날짜 문자열 해석 | `date -d "2026-10-22" +%s` | **오류** `illegal option -- d` | 언어별 라이브러리나 `python3 -c` 사용 |
| 파일 정보 출력 | `stat -c %s f` | **오류** `illegal option -- c` (BSD는 `stat -f %z`) | 가능하면 `wc -c < f` 같은 POSIX 방법 |
| PCRE 정규식 | `grep -P '\d'` | **오류** `invalid option -- P` | `grep -E '[0-9]'` |
| 출력 형식 지정 | `find . -printf '%p\n'` | **오류** `unknown primary or operator` | `find . -print` 또는 `-exec` |
| 확장 정규식 | `sed -E`, `sed 's/a\+/X/'` | `-E`는 동작, `\+`는 **동작 안 함**(`aaa`가 그대로) | **`sed -E 's/a+/X/'`** |
| 빈 입력의 xargs | 입력이 없어도 **한 번 실행**(`-r`을 주면 생략) | 입력이 없으면 **실행 안 함** | `xargs -r` (양쪽 모두 받아들임) |
| 기본 bash 버전 | 보통 5.x | **3.2.57** | 4.0+ 기능은 쓰지 않거나 버전 확인 |

- **`sed -i`**: GNU sed 매뉴얼은 `-i[SUFFIX]`로 접미사를 선택 사항이라 설명합니다. BSD는 접미사 인자를 항상 요구하므로 **`-i.bak`** 처럼 붙여 쓰는 형태가 양쪽에서 동작합니다. 또 GNU 매뉴얼의 경고대로 **`-n`과 `-i`를 함께 쓰면 `p` 명령 없이 파일이 비워질 수 있습니다**(`sed -ni 's/foo/bar/' FILE`은 파일을 잘라냅니다).
- **`xargs`**: GNU 문서는 "입력에 공백이 아닌 글자가 없으면 명령을 실행하지 않으려면 `-r`을 쓰라, 보통은 입력이 없어도 명령이 한 번 실행된다"고 합니다. 입력이 비어 있을 수 있는 파이프에서 `xargs rm`은 GNU에서는 인자 없이 `rm`이 실행되는 사고가 됩니다. `-r`을 항상 붙입니다.
- **bash 3.2**: macOS 기본 `/bin/bash`는 3.2.57이라 **연관 배열을 지원하지 않습니다**(`declare -A`가 `invalid option`). `#!/usr/bin/env bash`로 시작해도 PATH의 첫 bash가 3.2면 같습니다(이 환경에서 확인). 버전에 의존하는 기능은 피하거나 시작 부분에서 버전을 검사합니다.
- **`readlink -f`** 는 이 환경(macOS 26.5)에서 동작했습니다. 오래된 macOS에서는 없을 수 있습니다(해당 버전은 확인하지 않음, 미확인).
- 이 세션처럼 `grep`·`find`가 다른 구현으로 **별칭·함수로 바뀌어 있는 셸**에서는 위 차이가 가려질 수 있습니다. 순정 동작은 `/usr/bin/grep`처럼 경로를 직접 지정해 확인합니다.

### 이식성 있는 스크립트를 쓰는 방법

1. `#!/usr/bin/env bash` 또는 POSIX `#!/bin/sh`로 시작하고, **쓰는 기능이 그 셸에 있는지** 확인합니다.
2. 위 표의 오른쪽 열 형태를 우선 씁니다.
3. 정적 분석 도구 **ShellCheck**로 따옴표 누락 같은 흔한 실수를 잡습니다(이 문서에서 실행해 보지 않음, 미확인).
4. 배포 대상이 Linux라면 **컨테이너에서 실제로 실행**해 봅니다([Docker 명령어](../Infrastructure/docker/docker-command.md)).

---

## 🎯 체크리스트

- [ ] 변수는 항상 `"$var"`로 감싼다
- [ ] 위험한 명령에 쓰는 변수는 `"${var:?메시지}"`로 비어 있으면 중단
- [ ] `set -euo pipefail`을 쓰되, 중요한 단계는 명시적으로 실패를 확인
- [ ] `local x=$(cmd)`처럼 선언과 대입을 한 줄에 쓰지 않는다
- [ ] 파일 이름은 `find -print0 | xargs -0 -r`
- [ ] `> file 2>&1` 순서를 지킨다
- [ ] `sed -i.bak`, `sed -E`, `grep -E`처럼 BSD·GNU 양쪽에서 동작하는 형태
- [ ] bash 4+ 기능을 쓴다면 버전을 확인

## 참고 자료

- [Bash Reference Manual: The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) - `-e`가 종료하지 않는 경우, `-u`, `pipefail`
- [GNU sed: Command-Line Options](https://www.gnu.org/software/sed/manual/html_node/Command_002dLine-Options.html) - `-i[SUFFIX]`, `-E`, `-n`과 `-i`의 경고
- [xargs(1) (man7.org)](https://man7.org/linux/man-pages/man1/xargs.1.html) - `--no-run-if-empty`, `--null`

확인일: 2026-10-23 (Bash 매뉴얼, GNU sed 매뉴얼, xargs 맨페이지에서 확인한 GNU 쪽 동작. 종료 코드와 `pipefail`, `set -e`의 예외와 함수 안의 `-e` 무시, `local x=$(false)`, 따옴표와 단어 분리, `${v:?}`, 리다이렉션 순서, `xargs`의 공백 문제와 `-print0`, `sed -i`·`date -d`·`stat -c`·`grep -P`·`find -printf`·`\+`·`xargs`의 BSD 쪽 결과, bash 3.2의 `declare -A`는 macOS 26.5의 `/usr/bin`·`/bin` 순정 도구와 bash 3.2.57에서 직접 실행해 확인. GNU 도구의 실제 실행, 오래된 macOS의 `readlink -f`, ShellCheck, zsh와의 차이는 확인하지 못함. Linux 서버가 없어 GNU 쪽 결과는 문서로만 확인)
