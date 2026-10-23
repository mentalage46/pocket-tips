# 메트릭, 트레이싱, 헬스체크

> 시스템이 **지금 건강한가, 어디가 느린가**를 숫자와 요청 경로로 알아내는 방법

[로그](./logging.md)는 "무슨 일이 일어났나"를 알려 주지만 "얼마나, 어디서"에는 약합니다. 이 문서는 나머지 두 신호(메트릭, 트레이스)와 로드 밸런서·오케스트레이터가 쓰는 [헬스체크](../Network/load-balancing.md#헬스체크)를 다룹니다. 실행 결과는 Node.js 24.13과 prom-client 15.1.3에서 얻었습니다.

---

## 개념: 세 신호는 서로 다른 질문에 답한다

OpenTelemetry는 **트레이스**(요청이 애플리케이션을 거치는 경로), **메트릭**(실행 중에 측정한 값), **로그**(이벤트 기록), **베기지**(baggage, 서비스 사이에 전달하는 문맥 값)를 신호로 정의합니다(이벤트와 프로파일은 개발 중이거나 제안 단계).

| 신호 | 답하는 질문 | 강점 | 약점 |
| --- | --- | --- | --- |
| **메트릭** | **얼마나?** (요청 수, 에러율, 지연) | 값싸고 집계가 빠름, **알림과 대시보드**에 적합 | 개별 요청의 사정은 모름 |
| **트레이스** | **어디서 느린가?** (서비스 A → B → DB) | 요청 한 건의 **경로와 구간별 시간** | 모든 요청을 저장하면 비쌈(보통 샘플링) |
| **로그** | **무슨 일이 일어났나?** | 개별 사건의 맥락 | 양이 많고 집계가 느림 |

일반적인 문제 해결 순서는 **메트릭으로 이상을 알아채고 → 트레이스로 어느 구간인지 좁히고 → 로그로 원인을 확인**하는 것입니다. 세 신호를 `trace_id`로 연결하면 이 이동이 쉬워집니다.

---

## 무엇을 측정할 것인가

### Google SRE의 네 가지 골든 시그널

| 신호 | 의미 |
| --- | --- |
| **지연(Latency)** | 요청을 처리하는 데 걸리는 시간 |
| **트래픽(Traffic)** | 시스템에 걸리는 수요(웹 서비스는 보통 초당 요청 수) |
| **에러(Errors)** | 실패한 요청. 명시적(HTTP 500), 암묵적(200인데 내용이 틀림), 정책상(약속한 시간 초과) |
| **포화도(Saturation)** | 서비스가 얼마나 "가득 찼는가". 가장 제약이 큰 자원 기준 |

- 네 신호는 사용자가 겪는 문제를 비추는 **최소한의 출발점**입니다(일반 설명). 요청 중심 서비스는 요청 수·에러·지연(흔히 RED로 부름), 자원 중심(CPU·메모리·디스크)은 사용률·포화도·에러(흔히 USE로 부름)로 나눠 보는 방법이 널리 쓰입니다(RED/USE라는 이름과 정의는 이 문서에서 원 출처를 확인하지 않았음, 미확인).
- **성공과 실패의 지연을 따로 봅니다.** 실패는 빨리 돌아올 수 있어서 합치면 숫자가 좋아 보일 수 있습니다. SRE 책은 "느린 에러는 빠른 에러보다 나쁘다"고 말합니다.

### 평균 말고 백분위수

요청의 98%는 약 50ms, 2%는 약 2.3초 걸리는 서비스를 1만 건 시뮬레이션한 결과입니다.

```
avg = 93ms   p50 = 50ms   p95 = 59ms   p99 = 2,271ms   p99.9 = 2,469ms
```

- **평균(93ms)과 p50(50ms)** 은 "문제없음"으로 보이지만, 사용자 **50명 중 한 명은 2초 넘게 기다립니다**(p99).
- 지연은 꼬리가 길어서 **평균이 아니라 p95·p99로 목표를 정하고 알림을 겁니다.**
- 요청 하나가 서비스 여러 개를 거치면 꼬리 지연이 곱해져 나타납니다. 개별 서비스의 p99가 사용자에게는 더 자주 보입니다(일반적인 성질).

---

## 메트릭 종류 (Prometheus)

| 타입 | 정의 | 예 |
| --- | --- | --- |
| **Counter** | **증가만 하거나** 재시작 시 0으로 돌아가는 값. **줄어드는 값에는 쓰지 않음** | 요청 수, 에러 수 |
| **Gauge** | **오르내리는** 단일 값 | 처리 중인 요청 수, 큐 길이, 메모리 |
| **Histogram** | 관측값(요청 시간, 응답 크기)을 설정한 **버킷에 세어** 기록 | 요청 지연 분포 |
| **Summary** | 관측값에서 **슬라이딩 윈도우의 분위수**를 직접 계산 | (histogram과 달리 집계가 어려움, 일반 지식) |

작은 서버를 계측해 `/metrics`를 호출한 결과입니다.

```
http_requests_total{method="GET",route="/users/:id",status="200"} 3
http_requests_total{method="GET",route="/users/:id",status="500"} 1
http_request_duration_seconds_count{method="GET",route="/users/:id"} 4
http_requests_in_flight 0
```

- 히스토그램의 버킷은 **누적**입니다. 각 버킷은 "상한 이하인 관측값의 개수"이고, `le="+Inf"` 버킷은 `_count`와 같습니다.

```
http_request_duration_seconds_bucket{le="0.05"} 1     ← 50ms 이하 1건
http_request_duration_seconds_bucket{le="0.1"}  2     ← 100ms 이하 누적 2건
http_request_duration_seconds_bucket{le="+Inf"} 5     ← 전체 5건 (= _count)
```

- Counter는 **현재 값이 아니라 변화율**(예: 초당 요청 수)로 읽는 것이 보통입니다. 서버가 재시작해 0으로 돌아가도 변화율 계산이 이를 처리합니다(쿼리 함수 사용법은 이 문서에서 확인하지 않음, 미확인).
- **버킷 경계는 SLO 근처에 촘촘하게** 둡니다(예: 목표가 300ms이면 0.1, 0.25, 0.5…). 분위수는 버킷 경계 사이를 보간한 **추정치**입니다.

### 이름 규칙

- **기본 단위를 쓴다**: 밀리초가 아니라 **초**(`_seconds`), 바이트(`_bytes`).
- 누적 Counter는 **`_total`** 접미사 (`http_requests_total`).
- 레이블 이름을 메트릭 이름에 반복하지 않는다.

---

## 카디널리티: 메트릭을 망치는 가장 흔한 실수

레이블 값의 조합 하나가 **시계열 하나**입니다(Prometheus 문서). 값의 종류가 무한히 늘어나는 레이블을 쓰면 시계열이 폭증해 저장소와 쿼리가 무너집니다.

```javascript
// ❌ 사용자 ID를 레이블로: 사용자 5,000명이면 시계열 5,000개 (실제로 5,000개가 생성됨)
counter.inc({ user_id: "u123" });

// ❌ 원본 URL을 레이블로: /users/1, /users/2, ... 가 각각 시계열
counter.inc({ path: req.url });

// ✅ 라우트 "템플릿"을 레이블로: 아무리 많은 사용자가 와도 /users/:id 하나
counter.inc({ route: "/users/:id" });
```

- 문서의 경고: **"카디널리티가 높은 차원(사용자 ID, 이메일 등)을 레이블에 쓰지 말라."**
- 사용자·요청별 정보는 **메트릭이 아니라 로그와 트레이스**의 몫입니다.
- 위 서버 예제에서 알 수 없는 URL(`/nope-123`)을 `route="other"`로 묶은 것도 같은 이유입니다. 공격자가 임의 URL을 만들어 시계열을 늘리는 것을 막습니다.

---

## 트레이싱: 요청 하나의 경로를 따라간다

요청이 여러 서비스를 거칠 때 각 구간을 **span**이라 하고, 한 요청의 span 묶음이 **trace**입니다. 서비스 사이에서 **같은 `trace_id`를 전달**하는 것이 핵심이며, 표준이 W3C Trace Context의 `traceparent` 헤더입니다([로깅: 상관관계 ID](./logging.md#요청을-따라가기-상관관계-id와-w3c-trace-context)).

두 서비스를 만들어 실제로 전달한 결과입니다.

```json
{"svc":"service-a","trace_id":"fa49faf6...","span_id":"0003c581...","parent_span_id":null,"msg":"received request"}
{"svc":"service-b","trace_id":"fa49faf6...","span_id":"a042cb3e...","parent_span_id":"0003c581...","msg":"handling request"}
{"svc":"service-a","trace_id":"fa49faf6...","span_id":"0003c581...","parent_span_id":null,"msg":"done"}
```

- 두 서비스의 로그가 **같은 `trace_id`** 를 갖고, B의 `parent_span_id`가 A의 `span_id`와 같아 **호출 관계**가 드러납니다.
- A는 B를 호출할 때 `traceparent: 00-<trace_id>-<자기 span_id>-<flags>` 헤더를 붙였습니다. 헤더가 없으면(진입점) 새 `trace_id`를 만들고, 있으면 그것을 이어받습니다.
- **로그에 `trace_id`를 남기면** 메트릭에서 이상을 발견한 뒤 해당 요청의 로그를 바로 찾을 수 있습니다.
- 트레이스 전체를 저장하면 비용이 크므로 **샘플링**합니다. `traceparent`의 마지막 `flags` 비트가 샘플링 여부(`sampled`)를 나타냅니다.
- 직접 헤더를 전파하기보다 OpenTelemetry SDK의 자동 계측을 쓰는 것이 일반적입니다(세부 설정은 이 문서에서 확인하지 않음, 미확인).

---

## 알림: 증상에 알린다

SRE 책의 원칙입니다.

- **증상(what)에 알림**을 보냅니다. "사용자가 에러를 받는다", "응답이 느리다"처럼 사용자가 겪는 문제입니다. 원인(why, 예: CPU 높음)은 주로 디버깅 보조 수단이고, 원인이 확실하고 임박했을 때만 알립니다.
- 모든 알림은 **사람이 행동할 수 있어야** 합니다. 기계적으로 처리할 수 있으면 알림이 아니라 **자동화**해야 합니다.
- 알림이 오면 "지금 행동할 수 있나, 긴급한가, 안전하게 자동화할 수 있나"를 묻습니다. 알려진 소음을 반복하지 않습니다.
- 알림이 너무 잦으면 사람들이 무시하게 됩니다([로깅 레벨 기준](./logging.md#개념-로그는-무엇이고-무엇이-아닌가)도 같은 이유).

---

## 헬스체크: liveness, readiness, startup

Kubernetes 문서의 정의입니다.

| 프로브 | 질문 | 실패하면 |
| --- | --- | --- |
| **liveness** | 컨테이너를 **재시작**해야 하는가 (예: 데드락으로 진행 불가) | 컨테이너 재시작 |
| **readiness** | 트래픽을 **받을 준비**가 됐는가 | Service의 엔드포인트에서 **제외**(재시작 안 함) |
| **startup** | 애플리케이션이 **시작을 마쳤는가** | 컨테이너를 종료. 성공 전에는 liveness/readiness를 실행하지 않음 |

- **liveness를 잘못 만들면 연쇄 장애**가 납니다. 문서는 높은 부하에서 컨테이너가 재시작되고, 그 결과 실패한 요청이 늘고, 남은 Pod에 부하가 몰리는 악순환을 경고합니다. 그래서 liveness는 **"프로세스 자체가 진행 불가인가"** 만 가볍게 보고, DB 같은 외부 의존성은 **readiness에서만** 확인합니다(문서의 예: liveness는 앱 자신이 건강할 때 통과하고, readiness는 추가로 필요한 백엔드가 사용 가능한지 확인).
- 시작이 오래 걸리는 앱은 `startupProbe`로 시간을 벌어, 시작 중에 liveness가 앱을 죽이는 일을 막습니다.
- `periodSeconds` 기본값은 10초입니다. 나머지 기본값은 이 문서에서 확인하지 않았습니다(미확인).

```yaml
startupProbe:   { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 30 }  # 최대 300초 동안 시작 허용
livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10 }
readinessProbe: { httpGet: { path: /ready,   port: 8080 }, periodSeconds: 5 }
```

로드 밸런서의 헬스체크도 같은 원리입니다. readiness에 외부 API까지 넣으면 그 API가 죽을 때 **모든 서버가 동시에 빠지는** 문제가 생깁니다([로드 밸런싱: 헬스체크](../Network/load-balancing.md#헬스체크)).

---

## 작게 시작하는 최소 구성

혼자 또는 소규모로 운영한다면 처음부터 모든 것을 갖출 필요는 없습니다.

1. **구조화 로그 + 요청별 ID** ([로깅](./logging.md))
2. **메트릭 4개**: 요청 수(Counter, `method`·`route`·`status`), 지연(Histogram, `route`), 처리 중 요청(Gauge), 프로세스 기본 메트릭
3. **`/metrics`** 노출과 수집·시각화 도구 하나
4. **`/healthz`(liveness)와 `/ready`(readiness)** 분리
5. 알림은 **증상 2~3개**: 에러율 증가, p99 지연 초과, 서비스 다운

```javascript
import client from "prom-client";

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry }); // 프로세스 기본 메트릭

const requests = new client.Counter({
  name: "http_requests_total", help: "HTTP requests",
  labelNames: ["method", "route", "status"], registers: [registry],
});
const duration = new client.Histogram({
  name: "http_request_duration_seconds", help: "HTTP request duration",
  labelNames: ["method", "route"], buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5], registers: [registry],
});

// 요청 처리 시작 시:
const end = duration.startTimer({ method: req.method, route });   // route는 "/users/:id" 같은 템플릿
res.on("finish", () => {
  end();
  requests.inc({ method: req.method, route, status: String(res.statusCode) });
});

// GET /metrics
res.setHeader("Content-Type", registry.contentType);
res.end(await registry.metrics());
```

---

## 🎯 체크리스트

- [ ] 서비스마다 지연·트래픽·에러·포화도를 측정
- [ ] 지연은 평균이 아니라 **p95/p99**, 성공과 실패를 구분
- [ ] 메트릭 이름은 기본 단위(`_seconds`), Counter는 `_total`
- [ ] 레이블에 사용자 ID·원본 URL을 쓰지 않음 (**라우트 템플릿**)
- [ ] 서비스 간 호출에 `traceparent` 전달, 로그에 `trace_id` 포함
- [ ] 알림은 **증상** 기준, 사람이 행동할 수 있는 것만
- [ ] liveness는 가볍게, 외부 의존성 확인은 readiness에서
- [ ] 시작이 느린 앱에는 startup 프로브

## 참고 자료

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) - 네 가지 골든 시그널, 성공·실패 지연 분리, 증상 기준 알림, 사람이 행동할 수 있는 알림
- [Prometheus: Metric types](https://prometheus.io/docs/concepts/metric_types/) - Counter·Gauge·Histogram·Summary 정의, 히스토그램 버킷의 누적성
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/) - 기본 단위, `_total`, 높은 카디널리티 레이블 경고
- [OpenTelemetry: Signals](https://opentelemetry.io/docs/concepts/signals/) - 트레이스·메트릭·로그·베기지
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) - 프로브 정의, liveness 오용의 연쇄 장애, `periodSeconds` 기본 10초
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) - `traceparent` 형식

확인일: 2026-10-23 (SRE 책, Prometheus 문서 2건, OpenTelemetry, Kubernetes 문서에서 확인. 백분위수 시뮬레이션(평균 93ms·p99 2,271ms), prom-client 15.1.3의 `/metrics` 출력과 히스토그램 누적 버킷, `user_id` 레이블 5,000개가 시계열 5,000개가 되는 것, 계측한 서버 예제, 두 서비스 사이의 `traceparent` 전달과 `trace_id`·`parent_span_id` 연결은 Node 24.13에서 직접 실행해 확인. 베기지의 정의 설명, 평균이 꼬리 지연을 가린다는 설명, Summary와 Histogram의 집계 차이, 꼬리 지연의 곱해짐, 버킷 설계, 최소 구성 제안은 일반 개념·경험칙. RED/USE 이름의 출처, Counter의 변화율 쿼리 함수, OpenTelemetry SDK 설정, Kubernetes 프로브의 나머지 기본값, 수집·시각화 도구(Prometheus 서버, Grafana)의 설정은 미확인. 실제 Kubernetes 클러스터가 없어 프로브 동작은 실행하지 못함)
