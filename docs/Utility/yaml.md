# YAML

## YAML이란?

> 사람이 읽기 쉬운 데이터 직렬화 형식 (YAML Ain't Markup Language)

**주요 사용처**

- 설정 파일 (docker-compose, GitHub Actions, K8s)
- CI/CD 파이프라인
- 환경 설정

---

## 개념: YAML은 "모양은 하나, 해석은 파서마다"

### YAML이란

- YAML 1.2는 **JSON의 상위집합(superset)** 을 목표로 설계됐고(YAML 1.2.2 명세), 들여쓰기로 구조를 표현하는 사람이 읽기 쉬운 형식입니다. JSON과 달리 **주석**을 쓸 수 있어 설정 파일에 많이 쓰입니다.
- 구성 요소는 세 가지입니다: **스칼라**(값), **시퀀스**(리스트, `- a`), **매핑**(키-값). 매핑의 **키는 유일해야** 합니다(명세).

### 가장 큰 함정: 같은 텍스트를 다르게 해석한다

YAML은 따옴표 없는 값을 보고 **타입을 추측(암묵적 타입 변환)** 하는데, 그 규칙이 명세 버전(1.1 vs 1.2)과 라이브러리에 따라 다릅니다. 같은 문서를 세 파서로 읽은 결과입니다.

| 입력 | PyYAML 6.0.2 (YAML 1.1 계열) | `yaml` 2.9.1 (기본, YAML 1.2) | `yaml` 2.9.1 + `version: "1.1"` |
| --- | --- | --- | --- |
| `yes` / `no` / `on` | **불리언** (`yes`→`True`, `no`→`False` 실행 확인) | **문자열** (`"yes"`, `"no"`, `"on"`) | `true` / `false` / `true` |
| `country: NO` | **`False`** | 문자열 `"NO"` | `false` |
| `010` | **`8`** (8진수) | `10` | `8` |
| `1:30` | **`90`** (60진수) | 문자열 `"1:30"` | `90` |
| `2026-10-22` | `date` 객체 | 문자열 | `Date` 객체 |
| `3.10` | `3.1` (실수) | `3.1` | `3.1` |

- **`NO`가 `False`가 되는 것은 "노르웨이 문제"**로 유명합니다. 국가 코드 목록(`NO`, `SE`…)을 YAML에 쓰면 노르웨이가 불리언으로 읽힙니다.
- **`3.10`은 모든 파서에서 `3.1`** 이 됩니다. 소프트웨어 버전을 따옴표 없이 쓰면 `3.10`과 `3.1`이 구별되지 않습니다. GitHub Actions의 `python-version: "3.10"`처럼 **버전은 항상 따옴표**로 감쌉니다(현재 setup-python 문서의 예시도 버전을 따옴표로 씁니다).
- 결론: **의미가 모호한 값(`yes`/`no`/`on`/`off`, 국가 코드, 버전, 숫자 같은 문자열, `0`으로 시작하는 값, 시각)은 항상 따옴표로 문자열임을 명시**합니다. 어떤 파서가 읽을지 모르면 "`yes`는 불리언"이라고 가정하지 않습니다.
- JavaScript `js-yaml` 5.5.0의 기본 동작도 `yes`를 문자열로 읽었습니다(`yes`, `no`, `010`→`10`, `1:30`→문자열). 라이브러리 버전에 따라 기본값이 바뀔 수 있으니 사용 중인 버전으로 확인합니다.

### 중복 키: 어떤 파서는 조용히 덮어쓴다

명세는 키가 유일해야 한다고 하지만, 파서의 동작은 다릅니다. `a: 1`, `a: 2`를 읽은 결과입니다.

| 파서 | 결과 |
| --- | --- |
| `yaml` 2.9.1 | **오류** (`Map keys must be unique`) |
| `js-yaml` 5.5.0 | **오류** (`duplicated mapping key`) |
| PyYAML 6.0.2 | **`{'a': 2}`** — 오류 없이 마지막 값 채택 |

CI 설정이나 Compose 파일에서 같은 키를 실수로 두 번 쓰면, 파서에 따라 **앞의 값이 말없이 사라집니다.** `yamllint`로 중복 키를 잡습니다.

### 앵커와 병합 키(`<<`)는 이식성이 낮다

앵커(`&`)·별칭(`*`)은 YAML 기본 기능이지만, 매핑에 병합하는 **`<<` 키는 YAML 1.1의 병합 타입**입니다. 같은 문서를 읽은 결과입니다.

| 파서 | `<<: *defaults` 처리 |
| --- | --- |
| PyYAML 6.0.2 | **병합됨** (`timeout: 60`, `retries: 3`) |
| `yaml` 2.9.1 (기본) | **병합 안 됨** — `<<`가 그냥 키로 남음 (옵션 `merge: true` 필요) |
| `js-yaml` 5.5.0 (기본) | **병합 안 됨** — `<<`가 그냥 키로 남음 |

- Docker Compose는 "YAML merge 타입의 규칙을 따른다"고 문서화하고, 병합은 **매핑에만** 적용되며 시퀀스에는 쓸 수 없습니다.
- 도구가 병합을 지원하는지는 **그 도구의 문서**로 확인합니다. 지원하지 않는 곳에서는 `<<` 키가 데이터로 남아 의도와 다르게 동작합니다.

### 환경변수 치환은 YAML 기능이 아니다

`${DB_HOST:-localhost}` 같은 표기는 **YAML이 아니라 이를 읽는 도구**(예: Docker Compose)가 해석합니다. 순수 YAML 파서로 읽으면 그냥 문자열입니다.

```javascript
YAML.parse("host: ${DB_HOST:-localhost}")
// → { host: "${DB_HOST:-localhost}" }   (치환되지 않음)
```

같은 파일이라도 Compose가 읽으면 치환되고, 다른 도구가 읽으면 그대로입니다. 변수 치환 문법은 도구마다 다릅니다.

### 여러 줄 문자열: 끝 줄바꿈 처리

| 표기 | 줄바꿈 | 끝 줄바꿈 | 결과 예 (`a`, `b` 두 줄) |
| --- | --- | --- | --- |
| `\|` | 유지 | **유지** | `"a\nb\n"` |
| `\|-` | 유지 | 제거 | `"a\nb"` |
| `>` | 공백으로 합침 | **유지** | `"a b\n"` |
| `>-` | 공백으로 합침 | 제거 | `"a b"` |

`>`로 "한 줄로 합쳐진다"고 알고 있어도 **끝에 줄바꿈이 하나 남습니다.** 값에 줄바꿈이 있으면 안 되는 곳(토큰, 해시)에는 `>-`나 `|-`를 씁니다.

### 안전성: 신뢰할 수 없는 YAML을 읽을 때

일부 라이브러리는 YAML 태그로 **언어 객체를 생성**할 수 있습니다. PyYAML은 `safe_load`가 `!!python/object/apply:...` 같은 태그를 거부하고(`ConstructorError`), PyYAML 6에서는 `yaml.load`에 `Loader` 인자가 필수입니다. 외부에서 온 YAML은 **안전한 로더**(`safe_load` 등)로만 읽습니다.

---

## 기본 문법

### 키-값

```yaml
name: John
age: 30
active: true
score: 3.14
empty: null # 또는 ~
```

### 문자열

```yaml
# 따옴표 없이
simple: Hello World

# 따옴표 사용 (특수문자 포함 시)
quoted: "Hello: World"
single: "It's good"

# 여러 줄 (줄바꿈 유지)
multiline: |
  첫 번째 줄
  두 번째 줄
  세 번째 줄

# 여러 줄 (한 줄로 합침, 끝에 줄바꿈 1개 남음. 없애려면 >-)
folded: >
  이것은 한 줄로
  합쳐집니다.
```

### 리스트 (배열)

```yaml
# 기본 형태
fruits:
  - apple
  - banana
  - orange

# 인라인
colors: [red, green, blue]

# 객체 리스트
users:
  - name: John
    age: 30
  - name: Jane
    age: 25
```

### 중첩 객체

```yaml
database:
  host: localhost
  port: 5432
  credentials:
    username: admin
    password: secret
```

### 인라인 표기

```yaml
# 객체
person: { name: John, age: 30 }

# 배열
numbers: [1, 2, 3, 4, 5]
```

---

## 고급 기능

### 앵커 & 참조 (재사용)

```yaml
# 앵커 정의
defaults: &defaults
  timeout: 30
  retries: 3

# 참조
development:
  <<: *defaults # 병합 (파서에 따라 동작 안 할 수 있음, 위 개념 참고)
  host: localhost

production:
  <<: *defaults
  host: prod.example.com
  timeout: 60 # 오버라이드
```

### 환경변수

```yaml
# docker-compose 등 "도구"가 치환하는 문법 (YAML 자체 기능이 아님)
database:
  password: ${DB_PASSWORD}
  host: ${DB_HOST:-localhost} # 기본값
```

위 개념 섹션처럼 치환은 이를 읽는 도구가 합니다.

### 주석

```yaml
# 이것은 주석입니다
name: value # 인라인 주석
```

---

## 자주 쓰는 패턴

### compose.yaml (Docker Compose)

```yaml
services:
  app:
    image: node:24-alpine
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - .:/app
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
```

### GitHub Actions

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install
        run: npm install
      - name: Test
        run: npm test
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 3000
```

---

## 주의사항

### 들여쓰기

```yaml
# ✅ 스페이스 사용 (2칸 권장)
parent:
  child: value

# ❌ 탭 사용 금지
parent:
	child: value  # 에러!
```

### 특수문자

```yaml
# 따옴표 필요한 경우
yes_string: "yes" # 파서에 따라 yes가 boolean으로 해석될 수 있음
colon: "key: value" # 콜론 포함
hash: "text #comment" # 주석으로 해석 방지
```

### 타입 주의

```yaml
# 자동 타입 변환
port: 8080       # 숫자
port: "8080"     # 문자열

version: 1.0     # 숫자 (3.10은 3.1이 되므로 버전은 항상 따옴표)
version: "3.10"  # 문자열 (권장)

active: yes      # YAML 1.1 파서: boolean(true) / YAML 1.2 파서: 문자열 "yes"
active: true     # 모든 파서에서 boolean
active: "yes"    # 모든 파서에서 문자열
```

## 🎯 YAML 체크리스트

### 작성 시

- [ ] 탭 대신 스페이스 사용 (2칸 권장)
- [ ] 콜론 뒤 스페이스 필수
- [ ] 특수문자 포함 시 따옴표 사용
- [ ] 버전 번호는 문자열로 (`"3.10"`처럼 따옴표. 따옴표가 없으면 `3.10`이 `3.1`로 읽힘)
- [ ] `yes`/`no`/`on`/`off`/`NO`(국가 코드) 같은 모호한 값은 따옴표
- [ ] 같은 키를 두 번 쓰지 않았는지 (`yamllint`)

### 검증

- [ ] YAML Lint로 문법 확인
- [ ] 들여쓰기 일관성 체크
- [ ] 빈 값 의도한 것인지 확인

---

## 유용한 도구

```bash
# YAML 문법 검증
yamllint docker-compose.yml

# JSON ↔ YAML 변환
yq -o=json file.yaml
yq -P file.json
```

**온라인 도구**

- [YAML Lint](https://www.yamllint.com/)
- [YAML to JSON](https://www.json2yaml.com/)

## 참고 자료

- [YAML 1.2.2 명세](https://yaml.org/spec/1.2.2/) - JSON 상위집합이 목표, 매핑의 키는 유일해야 함
- [Docker Compose: Fragments](https://docs.docker.com/reference/compose-file/fragments/) - 앵커·별칭·병합 키(`<<`) 지원, 병합은 매핑에만 적용

확인일: 2026-10-22 (명세의 JSON 상위집합 목표와 키 유일성은 YAML 1.2.2 명세, Compose의 병합 규칙은 Compose 문서로 확인. 타입 해석·중복 키·병합 키·`>`/`|` 끝 줄바꿈·`${VAR}`·탭 들여쓰기 오류·`safe_load` 동작은 PyYAML 6.0.2, `yaml` 2.9.1, `js-yaml` 5.5.0을 직접 실행해 확인한 것으로 라이브러리 버전에 따라 달라질 수 있음. YAML 1.2 코어 스키마의 불리언 규칙 원문은 명세 본문이 잘려 읽지 못해 미확인(파서 동작으로만 확인). GitHub Actions `setup-python` 문서는 버전을 따옴표로 쓰는 예시만 확인했고 `3.10`→`3.1` 설명 문구는 찾지 못함. `yamllint`·`yq` 사용법은 미확인)
