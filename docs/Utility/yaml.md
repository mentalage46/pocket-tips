# YAML

## YAML이란?

> 사람이 읽기 쉬운 데이터 직렬화 형식 (YAML Ain't Markup Language)

**주요 사용처**

- 설정 파일 (docker-compose, GitHub Actions, K8s)
- CI/CD 파이프라인
- 환경 설정

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

# 여러 줄 (한 줄로 합침)
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
  <<: *defaults # 병합
  host: localhost

production:
  <<: *defaults
  host: prod.example.com
  timeout: 60 # 오버라이드
```

### 환경변수

```yaml
# docker-compose 등에서
database:
  password: ${DB_PASSWORD}
  host: ${DB_HOST:-localhost} # 기본값
```

### 주석

```yaml
# 이것은 주석입니다
name: value # 인라인 주석
```

---

## 자주 쓰는 패턴

### docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    image: node:20-alpine
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
yes_string: "yes" # yes는 boolean으로 해석
colon: "key: value" # 콜론 포함
hash: "text #comment" # 주석으로 해석 방지
```

### 타입 주의

```yaml
# 자동 타입 변환
port: 8080       # 숫자
port: "8080"     # 문자열

version: 1.0     # 숫자
version: "1.0"   # 문자열 (권장)

active: yes      # boolean (true)
active: "yes"    # 문자열
```

---

## 🎯 YAML 체크리스트

### 작성 시

- [ ] 탭 대신 스페이스 사용 (2칸 권장)
- [ ] 콜론 뒤 스페이스 필수
- [ ] 특수문자 포함 시 따옴표 사용
- [ ] 버전 번호는 문자열로 (`"3.8"`)

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
