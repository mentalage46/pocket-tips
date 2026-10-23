# 비동기와 이벤트 루프

> `await`가 **언제 끝나고**, 무엇이 **다른 코드를 막는지** — Node.js 기준으로 직접 실행해서 정리

JavaScript는 코드를 **하나의 스레드**에서 한 번에 하나씩 실행합니다. 동시에 많은 일을 처리하는 것처럼 보이는 것은 오래 걸리는 일(네트워크, 파일, 타이머)을 밖에 맡기고, 끝나면 **이벤트 루프**가 콜백을 하나씩 꺼내 실행하기 때문입니다. 그래서 두 가지가 핵심입니다.

1. 비동기 코드는 **정해진 순서**로 실행된다 (순서를 알아야 버그를 설명할 수 있다)
2. 동기 코드가 오래 걸리면 **모든 것이 멈춘다** (서버라면 모든 요청이)

> **이 문서의 출력은 모두 Node 24.13에서 직접 실행한 결과입니다.** 브라우저의 이벤트 루프는 구조가 다른 부분(렌더링 단계, `requestAnimationFrame` 등)이 있어 이 문서에서 확인하지 않았습니다.

---

## 개념 1: 실행 순서 — 동기, 마이크로태스크, 매크로태스크

```js
console.log('1 sync start');
setTimeout(() => console.log('6 setTimeout 0'), 0);
setImmediate(() => console.log('7 setImmediate'));
process.nextTick(() => console.log('3 nextTick'));
Promise.resolve().then(() => console.log('4 promise.then'));
queueMicrotask(() => console.log('5 queueMicrotask'));
(async () => { console.log('2 async fn body'); await null; console.log('5b after await'); })();
console.log('2b sync end');
```

CommonJS(`.cjs`)로 실행한 결과입니다.

```
1 sync start → 2 async fn body → 2b sync end        ← 동기 코드 전부
→ 3 nextTick → 4 promise.then → 5 queueMicrotask → 5b after await   ← 마이크로태스크
→ 7 setImmediate → 6 setTimeout 0                   ← 매크로태스크(콜백 단계)
```

| 단계 | 무엇이 들어가나 | 실행 시점 |
| --- | --- | --- |
| **동기 코드** | 현재 호출 스택 | 먼저, 끝까지 |
| **`process.nextTick`** (Node 전용) | nextTick 큐 | 현재 작업이 끝난 직후 |
| **마이크로태스크** | `Promise.then`, `await` 이후, `queueMicrotask` | 현재 작업이 끝난 직후, **다음 매크로태스크보다 먼저** |
| **매크로태스크** | `setTimeout`, `setInterval`, `setImmediate`, I/O 콜백 | 이벤트 루프의 각 단계에서 |

- **`async` 함수의 본문은 첫 `await`까지 동기로 실행됩니다.** 위에서 `2 async fn body`가 `2b sync end`보다 먼저 찍힌 이유입니다. `await` **뒤**의 코드가 마이크로태스크로 밀립니다.
- **마이크로태스크는 매크로태스크보다 항상 먼저**입니다. `setTimeout(fn, 0)`보다 `Promise.then`이 먼저 실행됩니다.
- **ESM에서는 `nextTick`의 순서가 달라집니다.** 같은 코드를 `.mjs`로 실행하면 `4 promise.then → 5 queueMicrotask → 5b after await → 3 nextTick` 순서였습니다. Node 문서가 이유를 설명합니다: ESM 모듈은 이미 **마이크로태스크 큐를 처리하는 도중**에 실행되므로, CommonJS와 달리 nextTick 콜백이 Promise보다 뒤에 옵니다. `process.nextTick`에 순서를 의존하는 코드는 모듈 형식이 바뀌면 깨질 수 있습니다.
- **`setTimeout(0)`과 `setImmediate`의 순서는 메인 모듈에서는 보장되지 않습니다.** 같은 코드를 6번 실행하자 `T I I T I T I T I T I T`처럼 섞여 나왔습니다. 반면 **I/O 콜백 안에서는** `setImmediate`가 항상 먼저였습니다(`fs.readFile` 콜백에서 확인). 이 순서에 의존하지 않습니다.
- `setTimeout(fn, 0)`의 `0`은 "즉시"가 아니라 **최소 대기 시간**입니다. 동기 코드가 길면 그만큼 늦게 실행됩니다.

---

## 개념 2: 동기 코드가 이벤트 루프를 막는다

50ms마다 실행되는 `setInterval`을 걸어 두고 중간에 **동기 반복문으로 400ms**를 점유했습니다.

```
50ms 인터벌 실행 시각(ms): 51, 102, 153, 205, 622, 673, 724
                                     └──── 205 → 622: 417ms 공백 ────┘
```

- 205ms와 622ms 사이에 **인터벌이 한 번도 실행되지 못했습니다.** 그 시간 동안 타이머뿐 아니라 새 HTTP 요청, 응답 콜백, 다른 `await`의 재개가 모두 멈춥니다.
- 서버에서 이런 코드(큰 JSON 파싱, 정규식 폭주, 동기 암호화, 거대한 배열 정렬)가 한 요청에서 돌면 **다른 모든 요청의 지연**으로 나타납니다. 평균 응답 시간보다 `p99`가 먼저 나빠집니다([평균 말고 백분위수](../Observability/metrics-and-tracing.md#평균-말고-백분위수)).
- 대응: 무거운 계산은 **Worker Threads나 별도 프로세스**로 옮기거나, 일을 **작은 조각으로 나눠 사이에 양보**합니다(이 문서에서 Worker는 실행하지 않았음, 미확인).

### 마이크로태스크로 도배하면 매크로태스크가 굶는다

마이크로태스크는 **큐가 빌 때까지** 연속으로 실행됩니다. 그래서 마이크로태스크 안에서 계속 새 마이크로태스크를 만들면 타이머가 실행될 틈이 없습니다.

| 방식 | `setTimeout(0)`이 실제로 실행된 시각 |
| --- | --- |
| `queueMicrotask`로 **200만 번 연쇄** | **130ms** |
| 같은 양의 계산을 `setImmediate`로 **쪼개서 양보** | **2ms** |

`await`도 같습니다. `for (let i = 0; i < 2e6; i++) await null;`을 돌렸더니 루프가 **86ms에 끝날 때까지 `setTimeout(0)`이 한 번도 실행되지 못했습니다**(타이머 실행 시각이 `null`). 긴 작업을 조각내서 돌릴 때 `await`만으로 양보한다고 생각하기 쉽지만, 이미 끝난 Promise를 `await`하는 것은 **마이크로태스크 사이를 오갈 뿐** 다른 매크로태스크에 기회를 주지 않습니다. 진짜로 양보하려면 `setImmediate`나 `setTimeout` 같은 매크로태스크를 거쳐야 합니다.

---

## 개념 3: `await`를 어디에 두느냐가 성능이다

각각 100ms 걸리는 작업 3개입니다.

| 코드 | 걸린 시간 |
| --- | --- |
| `await a(); await b(); await c();` (직렬) | **304ms** |
| `await Promise.all([a(), b(), c()])` | **101ms** |
| `const ps = [a(), b(), c()]; for (const p of ps) await p;` | **101ms** |

- 서로 의존하지 않는 작업을 `await`로 줄 세우면 시간이 **합**이 됩니다. 시작(호출)은 먼저 다 하고 기다리기만 나중에 하면 **가장 느린 하나**만큼만 걸립니다.
- 반대로 **동시에 너무 많이 시작하면** 외부 API나 DB가 버티지 못합니다. 수천 개를 한꺼번에 `Promise.all`에 넣지 말고 동시 실행 수를 제한합니다([Rate Limiting](../API/rate-limiting.md), [커넥션 풀](../Data/database/connection-pool.md)).
- 의존 관계가 있으면 직렬이 맞습니다. 직렬이 문제인 것이 아니라 **불필요한 직렬**이 문제입니다.

### 함정: `forEach(async …)`는 기다리지 않는다

```js
[1,2,3].forEach(async () => { await sleep(100); });
// forEach가 끝난 직후 경과 시간: 0ms
```

`forEach`는 콜백이 반환한 Promise를 쓰지 않으므로 **기다리지 않고 바로 다음 줄로 진행**합니다. 끝날 때까지 기다려야 하면 `for…of` + `await`(직렬) 또는 `await Promise.all(arr.map(async …))`(병렬)을 씁니다.

### Promise 조합기 4종

| 메서드 | 동작 | 직접 확인한 결과 |
| --- | --- | --- |
| `Promise.all` | 전부 성공해야 성공, **첫 실패에서 즉시 reject** | `boom`으로 reject |
| `Promise.allSettled` | 전부 끝나길 기다리고 각각의 상태를 돌려줌 | `fulfilled, rejected` |
| `Promise.race` | **가장 먼저 끝난 것**(성공이든 실패든) | `fast` |
| `Promise.any` | **가장 먼저 성공한 것**, 전부 실패하면 `AggregateError` | 실패 하나를 건너뛰고 `ok` |

`Promise.all`은 첫 실패에서 reject될 뿐, **나머지 작업을 취소하지는 않습니다.** 이미 시작된 요청은 계속 진행됩니다.

---

## 개념 4: 실패와 취소

### 처리하지 않은 reject는 프로세스를 죽인다

```js
Promise.reject(new Error('lost'));
setTimeout(() => console.log('still alive'), 100);
```

| 실행 옵션 | 결과 |
| --- | --- |
| 기본값 | 예외로 터져 **종료 코드 1**, `still alive`는 출력되지 않음 |
| `--unhandled-rejections=warn` | 경고만 출력하고 계속 실행, `still alive`가 출력됨 |

Node 15부터 기본 모드가 `throw`입니다(`--unhandled-rejections` 문서의 변경 이력). 즉 **`await`하지 않고 던져 둔 Promise의 실패**가 서버 전체를 내릴 수 있습니다. 반대로 `warn`으로 낮추면 에러가 조용히 묻혀 데이터 불일치로 이어집니다. 해법은 모드를 낮추는 것이 아니라 모든 Promise를 `await`하거나 `.catch()`로 처리하는 것입니다([예외 처리 전략](../Quality/exception-handling-strategy.md)).

### 취소는 `Promise.race`가 아니라 `AbortSignal`로

느린 서버(500ms 후 응답)에 대한 `fetch` 실험입니다.

| 방법 | 결과 |
| --- | --- |
| `signal: AbortSignal.timeout(100)` | `TimeoutError` — The operation was aborted due to timeout |
| `ac.abort()` 직접 호출 | `AbortError` — This operation was aborted |
| 타임아웃 없음 | 응답이 올 때까지 **513ms** 기다림 |
| `Promise.race([fetch, 100ms 타이머])` | 100ms에 `timeout`으로 reject되지만 **요청은 계속 진행**되어 결국 완료됨 |

- `fetch`에는 기본 타임아웃이 없습니다(위 실험에서 서버가 응답할 때까지 기다림). 외부 호출에는 **항상 타임아웃**을 걸어 요청이 쌓이는 것을 막습니다.
- `Promise.race`로 만든 타임아웃은 **호출자만 포기할 뿐 작업은 취소하지 못해** 소켓과 서버 자원을 계속 씁니다. 취소가 필요하면 `AbortSignal`을 넘깁니다.
- `AbortError`와 `TimeoutError`는 이름이 다르므로 재시도 판단에 구분해 쓸 수 있습니다([멱등성과 재시도](../API/idempotency.md)).

---

## 🎯 체크리스트

- [ ] 실행 순서: 동기 → 마이크로태스크(`then`, `await` 이후) → 매크로태스크(`setTimeout` 등)
- [ ] `process.nextTick`이나 `setTimeout(0)` vs `setImmediate`의 순서에 로직을 의존하지 않는다
- [ ] 서로 독립적인 `await`는 먼저 시작하고 `Promise.all`로 기다린다
- [ ] 동시 실행 수에 상한을 둔다 (수천 개를 한 번에 시작하지 않는다)
- [ ] `forEach(async …)` 대신 `for…of` 또는 `Promise.all(map(...))`
- [ ] 실패해도 계속해야 하면 `allSettled`, 하나라도 성공하면 `any`
- [ ] 모든 Promise를 `await`하거나 `.catch()` 한다 (unhandled rejection = 프로세스 종료)
- [ ] 외부 호출에는 `AbortSignal.timeout`을 건다 (`fetch`에 기본 타임아웃 없음)
- [ ] 이벤트 루프를 막는 동기 작업(큰 JSON, 동기 암호화, 긴 반복문)은 분리하거나 쪼갠다
- [ ] 모듈 형식(CJS/ESM)이 바뀌어도 실행 순서가 달라지지 않는지 확인한다

## 참고 자료

- [Node.js - The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) - 이벤트 루프 단계, `nextTick`, 타이머
- [Node.js process 문서](https://nodejs.org/api/process.html) - `process.nextTick`과 `queueMicrotask`의 순서, CJS와 ESM의 차이
- [Node.js CLI - `--unhandled-rejections`](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode) - 모드별 동작과 v15 기본값 변경
- [MDN - Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) - `all`/`allSettled`/`race`/`any`
- [MDN - AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) - `timeout()`, `abort()`

확인일: 2026-10-23 (Node 24.13에서 직접 실행: 실행 순서(CJS/ESM 비교), `setTimeout(0)` vs `setImmediate`(메인 모듈 6회, I/O 콜백), 동기 반복문으로 인터벌이 417ms 멈춘 것, 마이크로태스크 연쇄(`queueMicrotask`, `await null`)와 `setImmediate` 분할 비교, 직렬/병렬 `await` 소요 시간, `forEach(async)`, 조합기 4종, unhandled rejection의 종료 코드 1과 `warn` 모드, `AbortSignal.timeout`/`abort()`/`Promise.race` 비교. CJS와 ESM의 nextTick 차이 설명, 기본 모드 `throw`는 Node 문서(`process.md`, `cli.md`)에서 확인. 소요 시간은 이 기기에서의 1회 측정값이라 수치는 환경마다 다름. 브라우저의 이벤트 루프(렌더링 단계, `requestAnimationFrame`), Worker Threads, MDN·이벤트 루프 가이드 본문은 확인하지 못함)
