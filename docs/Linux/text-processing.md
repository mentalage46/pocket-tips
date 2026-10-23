# 텍스트 처리 도구 (grep, sed, awk, sort, jq)

> 로그와 설정, CSV 같은 **줄 단위 텍스트**를 파이프로 이어서 찾고, 바꾸고, 집계하는 방법

[셸 스크립트의 기본](./shell-basics.md)의 파이프를 실제로 쓰는 문서입니다. 아래 결과는 macOS 26.5의 순정 BSD 도구, `awk` 20200816(onetrue-awk), `jq` 1.7.1로 가짜 접근 로그를 처리해 얻었습니다. GNU 쪽 동작은 별도로 표시했습니다.

---

## 개념: 작은 도구를 텍스트 스트림으로 이어 붙인다

유닉스 도구는 **표준 입력을 읽어 표준 출력으로 내보내는** 작은 프로그램이고, 한 가지 일을 합니다. 파이프(`|`)로 이으면 큰 프로그램을 만들지 않고도 처리 흐름을 조립할 수 있습니다. 대부분 **한 줄씩 스트리밍**으로 읽기 때문에 큰 파일도 메모리에 모두 올리지 않고 처리합니다(`sort`는 예외로 전체를 정렬해야 해서 임시 파일을 씁니다, 일반 설명).

| 하고 싶은 일 | 도구 |
| --- | --- |
| 줄 **찾기** | `grep` |
| **치환**, 줄 범위 선택·삭제 | `sed` |
| **필드(열) 단위** 조건·계산·집계 | `awk` |
| 열 자르기, 정렬, 중복 집계, 개수 세기 | `cut`, `sort`, `uniq`, `wc` |
| 문자 변환, 열 정렬 출력 | `tr`, `column -t` |
| **JSON** 질의·변환 | `jq` |

예제 로그(`access.log`, 한 줄이 한 요청)의 형식은 `IP - - [시각] "메서드 경로 프로토콜" 상태 바이트 응답시간`입니다.

```
203.0.113.5 - - [22/Oct/2026:09:00:01 +0900] "GET /api/users HTTP/1.1" 200 512 0.012
198.51.100.9 - - [22/Oct/2026:09:00:03 +0900] "POST /api/login HTTP/1.1" 401 40 0.150
203.0.113.77 - - [22/Oct/2026:09:00:06 +0900] "GET /api/orders HTTP/1.1" 500 80 1.900
```

공백으로 나누면 `$1`=IP, `$9`=상태 코드, `$10`=바이트, `$NF`(마지막 필드)=응답 시간입니다.

---

## grep: 줄을 찾는다

```bash
grep -c ' 500 ' access.log        # 500이 있는 줄의 개수              → 2
grep -vc ' 200 ' access.log       # 200이 아닌 줄의 개수              → 5
grep -oE '"(GET|POST) [^ ]+' access.log   # 매치된 부분만 출력        → "GET /api/users ...
```

| 옵션 | 의미 |
| --- | --- |
| `-c` | 일치하는 **줄 수**만 |
| `-v` | 일치하지 **않는** 줄 |
| `-o` | 줄 전체가 아니라 **일치한 부분만** |
| `-E` | 확장 정규식 (`+`, `?`, `\|`, `(…)`) |
| `-i`, `-w`, `-n`, `-r`, `-l` | 대소문자 무시, 단어 단위, 줄 번호, 재귀, 파일 이름만 |
| **`-F`** | 정규식이 아닌 **고정 문자열** |

- 정규식의 `.`은 "아무 문자"입니다. `a.b`로 검색하면 `a.b`와 `axb` 둘 다 잡혀 **2건**이지만, `-F 'a.b'`는 **1건**입니다. 점·괄호가 들어간 문자열(IP, 버전, 경로)을 그대로 찾을 때는 `-F`를 씁니다.
- `-P`(Perl 호환 정규식)는 GNU grep의 기능이라 순정 macOS grep에서는 쓸 수 없습니다([BSD/GNU 차이](./shell-basics.md#macosbsd와-linuxgnu의-도구-차이)). `-E`로 쓸 수 있는지 먼저 봅니다.

### 열 기반 데이터에 grep을 쓰면 오탐이 난다

"4xx/5xx 에러 요청 수"를 `grep`으로 세 보겠습니다.

```bash
grep -E ' (4|5)[0-9]{2} ' access.log | wc -l        # 6   ← 틀림
awk '$9 ~ /^[45]/' access.log | wc -l               # 5   ← 맞음
```

`grep`은 **줄 어디서든** 숫자 세 자리를 찾으므로, 바이트 수 필드(`200 512 0.012`의 `512`)까지 잡아 6건이 됩니다. 상태 코드는 **9번째 필드**라는 구조를 아는 `awk`가 정확합니다.

> 규칙: **필드 위치가 의미를 갖는 데이터**(접근 로그, CSV)는 `awk`로 열을 지정하고, 줄 안에서 문자열을 찾는 것이 목적이면 `grep`을 씁니다.

---

## awk: 필드 단위로 계산한다

`awk`는 입력을 줄마다 **필드로 나누어**(`$1`, `$2`, …, `$NF`) `패턴 { 동작 }`을 적용합니다. `BEGIN`은 시작 전, `END`는 끝난 뒤에 한 번 실행됩니다.

```bash
# 조건: 응답 시간이 1초를 넘는 요청의 경로와 시간
awk '$NF > 1 {print $7, $NF}' access.log
# /api/orders 1.900
# /api/orders 2.400

# 집계: 연관 배열로 상태 코드별 개수
awk '{c[$9]++} END{for (s in c) print s, c[s]}' access.log | sort
# 200 3
# 401 3
# 500 2

# 합계와 평균
awk '{b+=$10; t+=$NF; n++} END{printf "bytes=%d avg_time=%.3f n=%d\n", b, t/n, n}' access.log
# bytes=5118 avg_time=0.598 n=8
```

- 구분자가 공백이 아니면 `-F`로 지정합니다(`awk -F, '{print $2}'`는 CSV의 두 번째 열). **따옴표 안에 쉼표가 있는 CSV**는 단순 구분자로 처리할 수 없으므로 전용 도구를 씁니다(일반 설명).
- 평균 응답 0.598초는 대부분 빠르고 일부가 매우 느린 분포를 숨깁니다([백분위수](../Observability/metrics-and-tracing.md#평균-말고-백분위수)). 느린 요청은 위처럼 조건으로 따로 뽑아 봅니다.

### macOS의 awk는 gawk가 아니다

| 동작 | 순정 macOS `awk` (20200816) | GNU awk (`gawk`) |
| --- | --- | --- |
| `strftime()` | **오류** `calling undefined function strftime` | 지원 (gawk 확장) |
| `gensub()` | **오류** `calling undefined function gensub` | 지원 (gawk 확장) |
| `length("한글")` | **6** (바이트 수) | 로케일이 UTF-8이면 문자 수(공식 문서 미확인) |

`tolower`, `substr`, `length` 같은 **POSIX awk 기능**만 쓰면 양쪽에서 동작합니다. 서버에서 만든 `gawk` 스크립트를 macOS에서 돌리거나 그 반대일 때 확인합니다. 한글 같은 다바이트 문자를 다루는 길이 계산은 구현마다 다를 수 있습니다.

---

## sed: 치환과 줄 편집

```bash
sed -E 's/^([0-9]+\.[0-9]+)\.[0-9]+\.[0-9]+/\1.x.x/' access.log   # IP 끝 두 자리 가리기
# 203.0.x.x - - [22/Oct/2026:09:00:01 ...

sed -n '3,4p' access.log          # 3~4번째 줄만 출력 (-n: 자동 출력 끄기, p: 출력)
sed '2,4d'                        # 2~4번째 줄 삭제  (1 5 만 남음)
sed -n '$p'                       # 마지막 줄
sed -E 's/^([^=]+)=(.*)$/\2=\1/'  # k=v → v=k  (그룹 \1, \2 재사용)
```

- 형식은 `s/찾을패턴/바꿀내용/플래그`입니다. 패턴에 `/`가 많으면 `s|…|…|`처럼 구분자를 바꿉니다.
- **`-E`를 쓰면 `+`, `(…)`를 그대로** 쓸 수 있습니다. GNU의 `\+` 같은 이스케이프는 BSD sed에서 동작하지 않습니다(`aaa`가 그대로 출력됨, 확인). **`-E`가 양쪽에서 동작하는 형태**입니다.
- 파일을 직접 고치는 `-i`는 BSD와 GNU 인자가 다르고, `-n`과 함께 쓰면 파일이 비워질 수 있습니다([셸 기본: sed -i](./shell-basics.md#macosbsd와-linuxgnu의-도구-차이)).

---

## sort, uniq, cut: 빈도 집계 패턴

가장 자주 쓰는 레시피는 **"가장 많이 나온 것 상위 N개"** 입니다.

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -3
#    3 203.0.113.5
#    3 198.51.100.9
#    1 203.0.113.77
```

| 단계 | 하는 일 |
| --- | --- |
| `cut -d' ' -f1` | 공백으로 나눈 첫 번째 열(IP)만 |
| `sort` | **같은 값끼리 모이게** 정렬 |
| `uniq -c` | 연속된 같은 줄을 합치고 **개수를 앞에 붙임** |
| `sort -rn` | 개수(숫자, `-n`)를 **내림차순**(`-r`) |
| `head -3` | 상위 3개 |

- **`uniq`는 "인접한" 중복만 합칩니다.** `a b a`를 `sort` 없이 `uniq -c`에 넣으면 `1 a | 1 b | 1 a`이고, `sort`를 거쳐야 `2 a | 1 b`가 됩니다(실행 확인). 항상 `sort | uniq -c` 순서로 씁니다.
- `uniq -c`의 숫자 앞 **공백 정렬(패딩)** 은 구현마다 다릅니다(BSD는 `   2 a`). 숫자를 다시 파싱한다면 `awk '{print $1}'`처럼 공백에 둔감하게 처리합니다.
- 중복 제거만 필요하면 `sort -u`입니다(`awk '{print $7}' access.log | sort -u | wc -l` → 고유 경로 5개).

### `sort`는 로케일에 따라 순서가 달라진다

```bash
printf 'b\nA\na\nB\n' | sort                 # a A b B   (로케일 ko_KR.UTF-8)
printf 'b\nA\na\nB\n' | LC_ALL=C sort        # A B a b   (바이트 순서)
```

- 같은 데이터가 **환경의 로케일에 따라 다른 순서**로 정렬됩니다. 서버와 노트북에서 결과가 다르거나 `comm`·`join` 같은 정렬 전제 도구가 틀리는 원인이 됩니다. **스크립트에서는 `LC_ALL=C`를 명시**해 일관된 바이트 순서를 씁니다.
- `sort -h`는 `1K 2M 3G` 같은 크기 단위를 정렬하고(macOS에서 확인), `-k2,2`는 두 번째 필드 기준 정렬입니다.

---

## jq: JSON은 jq로 다룬다

구조화된 로그([로깅](../Observability/logging.md))는 JSON으로 한 줄씩 남는 경우가 많습니다. 이것을 `grep`이나 `sed` 같은 **텍스트 정규식으로 다루면 깨지기 쉽고**(따옴표 이스케이프, 필드 순서, 중첩), `jq`는 JSON 구조를 이해합니다.

```bash
# app.jsonl : 한 줄이 JSON 하나
jq -c 'select(.level=="error") | {msg, user_id}' app.jsonl
# {"msg":"db timeout","user_id":9}
# {"msg":"payment failed","user_id":7}

jq -r '.msg' app.jsonl                       # 따옴표 없는 원본 문자열 (-r: raw)
jq -r '[.time,.level] | @tsv' app.jsonl      # 탭으로 구분된 열로 변환
jq -s 'group_by(.level) | map({level: .[0].level, n: length})' -c app.jsonl
# [{"level":"error","n":2},{"level":"info","n":1},{"level":"warn","n":1}]
jq -s 'map(.duration_ms) | add / length' app.jsonl      # 평균 → 945
```

- `-c`는 한 줄 출력, `-r`은 raw 문자열, **`-s`(slurp)는 입력 전체를 하나의 배열로 읽어** 집계에 씁니다. `-s`는 파일 전체를 메모리에 올리므로 **큰 로그에는 줄 단위(기본) 처리**를 하고, 집계는 필요한 필드만 뽑아 `sort | uniq -c`로 넘기는 방식이 안전합니다.
- 이 환경의 `jq`는 `jq-1.7.1-apple`로 macOS에 기본 포함돼 있었습니다. Linux 서버에는 따로 설치해야 할 수 있습니다(패키지 설치는 확인하지 않음, 미확인).

---

## 레시피 모음

```bash
# 가장 느린 요청 5개
awk '{print $NF, $7}' access.log | sort -rn | head -5

# 상태 코드별 개수
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# 특정 IP의 요청만
grep -F '198.51.100.9' access.log

# 로그인 실패(401)가 많은 IP (공격 의심)
awk '$9 == 401 {print $1}' access.log | sort | uniq -c | sort -rn | head

# 고유 IP 수
cut -d' ' -f1 access.log | sort -u | wc -l

# 실시간으로 에러만 보기
tail -f access.log | awk '$9 ~ /^5/'
```

(마지막 줄의 `tail -f`는 이 문서에서 실행하지 않았습니다. 파이프 앞 단계가 버퍼링하면 출력이 지연될 수 있습니다, 미확인.)

---

## 🎯 체크리스트

- [ ] 열 위치가 의미 있는 데이터는 `grep` 대신 **`awk`** 로 필드 지정
- [ ] 빈도 집계는 항상 **`sort | uniq -c | sort -rn`** (uniq 전에 sort)
- [ ] 점·괄호가 든 문자열 검색은 `grep -F`
- [ ] 이식성이 필요하면 `sed -E`, `grep -E`, POSIX awk 기능만
- [ ] 스크립트의 `sort`/`comm`/`join` 앞에는 `LC_ALL=C`
- [ ] JSON은 정규식이 아니라 `jq`
- [ ] 큰 파일에 `jq -s` 같은 전체 읽기 모드를 쓰지 않기
- [ ] 한 번에 길게 쓰기보다 단계마다 결과를 확인하며 파이프를 늘리기

## 참고 자료

- [GNU sed 매뉴얼: Command-Line Options](https://www.gnu.org/software/sed/manual/html_node/Command_002dLine-Options.html) - `-E`는 POSIX에 추가되어 BSD·GNU 모두 지원
- [jq 매뉴얼](https://jqlang.org/manual/) - `select`, `group_by`, `@tsv`, `-r`/`-c`/`-s`

확인일: 2026-10-23 (GNU sed 매뉴얼의 `-E` 설명은 확인. `grep`의 `-c`·`-v`·`-o`·`-E`·`-F` 결과, 열 기반 데이터에서 `grep`이 6건·`awk`가 5건을 세는 것, `awk`의 필드 조건·연관 배열·합계·평균, `sed`의 치환·범위·`$p`·삭제, `sort | uniq -c | sort -rn`, `uniq`의 인접 중복, 로케일에 따른 `sort` 순서(`ko_KR.UTF-8` 대 `LC_ALL=C`), 순정 macOS `awk` 20200816에서 `strftime`·`gensub` 오류와 `length("한글")`=6, `jq` 1.7.1의 `select`·`group_by`·`@tsv`·평균, BSD `uniq -c`의 패딩은 macOS 26.5에서 직접 실행해 확인. 아래 jq 매뉴얼 링크는 열어서 대조하지 않았고(미확인), `gawk`의 UTF-8 문자 길이 동작, GNU `grep`·`sort`·`uniq` 구현, `tail -f` 파이프 지연, 쉼표가 든 CSV 처리는 일반 개념이거나 실행하지 못함)
