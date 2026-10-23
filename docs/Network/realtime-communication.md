# 실시간 통신: 폴링, SSE, WebSocket

> 서버가 클라이언트에 **먼저** 데이터를 보내는 네 가지 방법과, 연결을 오래 유지할 때 생기는 문제

HTTP는 기본적으로 클라이언트가 묻고 서버가 답하는 구조입니다. 알림·채팅·시세처럼 **서버에서 일이 생겼을 때 바로** 알려야 하면 방법이 갈립니다. 서버가 다른 **서버**에 알리는 방식은 [웹훅](../API/webhooks.md)이고, 이 문서는 **브라우저 같은 클라이언트와 오래 연결을 유지하는** 방식을 다룹니다.

> **SSE와 WebSocket의 동작은 로컬 Node 서버로 직접 실행해 확인했습니다**(Node 24.13, `ws` 8.22.0, Node의 실험적 `EventSource`). 프록시·로드밸런서·모바일 네트워크는 재현하지 못했고, 해당 내용은 문서 출처를 밝히거나 미확인으로 표시했습니다.

---

## 한눈에 비교

| | 폴링 | 롱 폴링 | **SSE** | **WebSocket** |
| --- | --- | --- | --- | --- |
| 방향 | 클라이언트 → 서버 요청 | 클라이언트 → 서버 요청 | **서버 → 클라이언트** 단방향 | **양방향** |
| 연결 | 매번 새 요청 | 이벤트가 있을 때까지 요청을 붙잡아 둠 | HTTP 응답 하나를 계속 열어 둠 | HTTP로 시작해 **다른 프로토콜로 전환** |
| 형식 | 자유 | 자유 | 텍스트(`text/event-stream`, UTF-8) | 텍스트·바이너리 프레임 |
| 자동 재연결 | 직접 구현 | 직접 구현 | **브라우저가 해 줌** | 직접 구현 |
| 끊긴 뒤 이어받기 | 직접 구현 | 직접 구현 | `Last-Event-ID` 헤더 지원 | 직접 구현 |
| 일반 HTTP 인프라와 궁합 | 매우 좋음 | 좋음 | 좋음(응답 버퍼링 주의) | 프록시 설정 필요 |

### 무엇을 고를까

- **서버 → 클라이언트 알림·진행률·로그 스트림**이면 SSE가 먼저 후보입니다. 재연결과 이어받기가 규격에 들어 있어 구현이 짧습니다.
- **클라이언트도 자주 메시지를 보내야 하는**(채팅, 협업 편집, 게임) 경우에는 WebSocket입니다.
- 이벤트가 **드물고 지연이 몇십 초 늘어도 괜찮으면** 폴링이 가장 단순하고 운영하기 쉽습니다. 연결을 유지하지 않으니 배포와 확장이 쉽습니다.
- 선택 기준은 기능 필요 여부이지 "최신 기술이라서"가 아닙니다. 아래의 운영 비용(연결 수, 재연결, 스케일아웃)까지 같이 봅니다.

---

## SSE (Server-Sent Events)

### 전송 형식

서버는 `Content-Type: text/event-stream`으로 응답을 **닫지 않고** 아래 형식의 텍스트를 계속 씁니다. 이벤트는 **빈 줄**로 구분합니다.

```
retry: 200
: hello comment

id: 1
event: tick
data: msg 1

id: 2
event: tick
data: msg 2

```

| 필드 | 의미 |
| --- | --- |
| `data:` | 이벤트 본문 |
| `event:` | 이벤트 이름 (`addEventListener('tick', …)`로 받음, 없으면 `message`) |
| `id:` | 이벤트 ID. 클라이언트가 **마지막으로 받은 값**을 기억함 |
| `retry:` | 재연결까지 기다릴 시간(ms, 숫자만 유효) |
| `:` 로 시작하는 줄 | **주석**. 클라이언트는 무시함 → keep-alive 용도 |

스트림은 항상 **UTF-8**로 해석합니다(다른 인코딩을 지정할 방법이 없음, WHATWG HTML 명세).

### 재연결과 이어받기: 직접 실행한 결과

서버가 연결을 끊는 상황을 만들고 `EventSource`가 어떻게 행동하는지 봤습니다. 서버는 연결마다 이벤트 2개를 쓴 뒤 연결을 닫습니다(첫 연결은 `destroy`로 비정상 종료, 이후는 `end`로 정상 종료).

| 서버가 받은 연결 | `Accept` | `Last-Event-ID` |
| --- | --- | --- |
| #1 | `text/event-stream` | (없음) |
| #2 | `text/event-stream` | **2** |
| #3 | `text/event-stream` | **4** |
| #4 | `text/event-stream` | **6** |

- 클라이언트는 이벤트를 `1,2 → 3,4 → 5,6 → 7,8`로 **빠짐없이** 받았고, 연결이 끊길 때마다 `error` 이벤트와 함께 `readyState`가 `0(CONNECTING)`이 됐습니다.
- **정상 종료(`end`)여도 재연결**합니다. 서버가 "더 보낼 게 없다"고 응답을 끝내면 클라이언트는 이를 장애와 구분하지 못하고 `retry` 간격 뒤에 다시 연결합니다.
- 재연결을 **멈추게 하려면** 서버가 `204 No Content`로 응답합니다(명세). 실제로 `204`를 받자 `readyState`가 `2(CLOSED)`가 되어 재시도하지 않았습니다.
- `Content-Type`이 `text/event-stream`이 아닌 `200`(예: `application/json`)도 **연결 실패로 처리**되어 `CLOSED`가 됐습니다.

서버 쪽 이어받기는 직접 구현해야 합니다.

```js
const last = req.headers['last-event-id'];       // 마지막으로 받은 id
const start = last ? Number(last) + 1 : 1;       // 그 다음부터 다시 보냄
```

즉 **이벤트를 일정 기간 보관**하고 ID로 다시 읽을 수 있어야 이어받기가 성립합니다. ID가 단조 증가하는 값이어야 "그 이후"를 정할 수 있습니다.

> 위 실험의 `EventSource`는 Node 24의 **실험 기능**(`--experimental-eventsource`)입니다. 브라우저의 동작은 같은 WHATWG 명세를 따르지만, 이 문서에서 브라우저를 직접 돌려 확인하지는 않았습니다.

### SSE의 제약

- **단방향**입니다. 클라이언트가 서버로 보낼 때는 별도의 일반 HTTP 요청을 씁니다.
- `EventSource`는 **텍스트만** 다룹니다. 바이너리는 인코딩해야 합니다.
- 브라우저의 `EventSource`로는 요청에 **임의의 헤더를 붙일 수 없다**고 알려져 있습니다(인증 방식에 영향. 이 문서에서는 확인하지 않음, 미확인). 쿠키 기반 인증이나 `fetch`로 스트림을 직접 읽는 방식을 검토합니다.
- 명세는 **HTTP의 서버당 연결 수 제한** 때문에 같은 도메인에서 여러 탭이 각각 `EventSource`를 열면 문제가 생길 수 있다고 경고합니다. HTTP/2 이상에서는 한 연결 위에 여러 스트림이 올라가므로 완화됩니다([HTTP 버전](./http-versions.md)). 서버가 허용하는 동시 스트림 수는 RFC 9113이 **100 이상**을 권장합니다.

---

## WebSocket

### 시작은 HTTP다 (업그레이드 핸드셰이크)

WebSocket은 HTTP/1.1의 `Upgrade` 메커니즘으로 같은 TCP 연결을 다른 프로토콜로 바꿉니다. RFC 6455의 예제 키로 날것의 요청을 보내 본 결과입니다.

```
GET /chat HTTP/1.1
Host: 127.0.0.1:18201
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

- 서버는 `Sec-WebSocket-Key`에 고정 GUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`를 이어 **SHA-1 → base64**한 값을 `Sec-WebSocket-Accept`로 돌려줍니다. 직접 계산한 값이 RFC의 예시와 일치했습니다. 이것은 **서버가 WebSocket을 이해한다는 확인**이지 인증이나 암호화가 아닙니다.
- `Upgrade` 헤더가 없는 일반 `GET`을 보내면 이 서버(`ws`)는 **`426 Upgrade Required`** 로 응답했습니다.
- `ws`는 `Sec-WebSocket-Version: 8` 요청도 받아들였습니다. 라이브러리가 구버전(8)도 허용하는 것이므로, 이 동작을 RFC 6455(버전 13)의 규칙으로 일반화하지 않습니다.

이후 연결은 HTTP가 아니라 **프레임** 단위로 오갑니다.

### 연결 상태와 종료 코드

| 상황 | 직접 실행한 결과 |
| --- | --- |
| 정상 종료 `close(1000, 'bye')` | 상대가 `code=1000 reason="bye"`를 받음 |
| 허용 크기(`maxPayload` 1KB)를 넘는 메시지(2KB) | 서버가 `WS_ERR_UNSUPPORTED_MESSAGE_LENGTH` 오류를 내고, 클라이언트는 **`1009`** 로 닫힘 |
| `terminate()`처럼 close 프레임 없이 TCP를 끊음 | 상대가 **`1006`** (비정상 종료)을 받음. 1006은 **실제로 주고받는 코드가 아니라**, 종료 핸드셰이크 없이 끊겼음을 알려 주는 값 |
| 서버가 `ping('hi')` | 클라이언트가 같은 payload로 **자동 `pong`** 응답, 서버가 `pong` 수신 |

- **크기 제한을 반드시 둡니다.** 제한이 없으면 클라이언트가 거대한 메시지로 메모리를 소모시킬 수 있습니다. 위 실험의 `ws` 서버는 오류 이벤트를 **처리하는 리스너가 없으면 프로세스가 예외로 종료**됐습니다(`error` 리스너 필수).
- RFC 6455는 `Ping`을 받으면 `Pong`으로 답해야 하고(MUST), `Ping`은 **keepalive**로도, 상대가 살아 있는지 확인하는 수단으로도 쓸 수 있다고 설명합니다.
- 1006으로 끊긴 연결은 클라이언트가 **재연결과 상태 복구를 직접** 해야 합니다. SSE의 `Last-Event-ID` 같은 이어받기는 WebSocket에 없습니다.

### 보안: Origin을 직접 확인해야 한다

브라우저는 WebSocket을 열 때 `Origin` 헤더를 보내지만, **서버가 확인하지 않으면 어떤 사이트든 연결할 수 있습니다.** 쿠키 인증을 쓰는 서비스라면 악성 페이지가 사용자의 쿠키를 실어 연결하는 공격(Cross-Site WebSocket Hijacking)이 가능합니다. RFC 6455 §10.2는 특정 사이트만 허용하려는 서버는 `Origin`을 검증해야 하고(SHOULD), 허용되지 않으면 **403**으로 응답하라고 합니다.

| 서버 | `Origin: https://evil.example` | `Origin: https://app.example.com` |
| --- | --- | --- |
| 기본 설정 (`ws`) | **연결 성공** | 연결 성공 |
| `Origin` 검증 추가 | **HTTP 403** | 연결 성공 |

- 기본 설정의 서버가 임의의 출처를 받아들이는 것을 직접 확인했습니다.
- 이 검증은 **브라우저가 보내는 `Origin`**에만 의미가 있습니다. 브라우저가 아닌 클라이언트는 `Origin`을 마음대로 보낼 수 있으므로, **인증은 별도로** 해야 합니다(토큰 검증 등).
- 일반 HTTP처럼 CORS가 적용되지 않는 점이 이 공격의 배경입니다(이 문서에서 브라우저로 확인하지는 않음).

### HTTP/2, HTTP/3에서

HTTP/2는 연결 전체에 적용되는 `Upgrade`·`Connection` 헤더와 `101` 응답을 허용하지 않아 RFC 6455의 핸드셰이크를 그대로 쓸 수 없습니다. 그래서 **RFC 8441**이 `CONNECT` 메서드를 확장해(`SETTINGS_ENABLE_CONNECT_PROTOCOL`) HTTP/2 스트림 하나 위에서 WebSocket을 돌리는 방법을 정했고, **RFC 9220**이 이를 HTTP/3에 맞췄습니다. 실제 서버·프록시·브라우저의 지원 범위는 확인하지 않았습니다(미확인).

---

## 오래 유지되는 연결의 운영 문제

연결이 길어지면 "요청 처리 시간"이 아니라 **동시 연결 수**와 **중간 장비의 타임아웃**이 문제가 됩니다.

### 프록시와 로드밸런서

nginx 공식 문서에서 확인한 내용입니다(다른 프록시는 확인하지 않음).

- `Upgrade`와 `Connection`은 **hop-by-hop 헤더**라 프록시가 뒤쪽 서버로 전달하지 않습니다. WebSocket은 **명시적으로 넘겨야** 합니다.

```nginx
location /chat/ {
    proxy_pass http://backend;
    # proxy_http_version 1.1;   # nginx 1.29.7 이전 버전에서는 필요
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

- 백엔드가 **60초 동안 아무것도 보내지 않으면 연결을 닫습니다**(`proxy_read_timeout` 기본값). 문서는 이 값을 늘리거나, 백엔드가 주기적으로 **WebSocket ping 프레임**을 보내 타임아웃을 갱신하라고 안내합니다.
- SSE에는 같은 이유로 **주석 줄을 15초 정도마다** 보내라고 WHATWG 명세가 권합니다(일부 프록시가 짧은 유휴 시간 뒤 연결을 끊음).
- `proxy_buffering`의 기본값은 `on`입니다. 버퍼링이 켜져 있으면 nginx가 응답을 모아서 전달하므로, **이벤트가 즉시 도착하지 않을 수 있습니다.** 꺼져 있으면 받는 즉시 전달합니다. SSE 엔드포인트의 버퍼링 설정은 환경에 따라 달라지니 실제로 확인합니다(이번에는 nginx를 실행하지 않음, 미확인).
- 로드밸런서·CDN·API Gateway마다 **유휴 타임아웃과 WebSocket 지원 여부**가 다릅니다. 사용하는 제품의 문서를 확인해야 합니다([로드 밸런싱](./load-balancing.md), [Gateway](./gateway.md)).

### 연결이 서버 메모리를 차지한다

- 연결 하나가 소켓과 상태를 계속 점유합니다. 폴링과 달리 **트래픽이 적어도 연결 수만큼 자원**이 듭니다. 동시 접속 상한을 정하고 [메트릭](../Observability/metrics-and-tracing.md)으로 연결 수를 관찰합니다.
- 배포(재시작) 때 모든 연결이 한꺼번에 끊기고, 클라이언트가 **동시에 재연결**합니다. 재연결에는 **지수 백오프와 무작위 지터**를 넣어 몰림을 막습니다([429 처리](../API/rate-limiting.md#429-응답-처리-클라이언트)의 재시도 원칙과 같음).
- 끊어진 TCP 연결을 서버가 모를 수 있으므로 **주기적 ping 또는 주석 줄**로 죽은 연결을 정리합니다.

### 서버가 여러 대일 때

사용자 A의 연결은 서버 1에, 이벤트를 만든 요청은 서버 2에 도착하면 서버 2는 A에게 보낼 수 없습니다. 흔한 해법은 서버 사이에 **메시지 브로커(Redis Pub/Sub, [메시지 큐](../Data/messaging/message-queue.md) 등)** 를 두고 모든 서버가 이벤트를 받아 자기 연결에 전달하는 것입니다. 스티키 세션만으로는 해결되지 않습니다. 이 구성은 이번에 구현·실행하지 않았습니다(미확인).

---

## 🎯 체크리스트

- [ ] 정말 실시간이 필요한가? 드문 이벤트면 폴링으로 충분하지 않은가
- [ ] 서버 → 클라이언트만 필요하면 SSE, 양방향이면 WebSocket
- [ ] SSE: 이벤트에 단조 증가 `id`를 붙이고 `Last-Event-ID`로 이어받을 수 있게 보관 기간을 둔다
- [ ] SSE: 더 보내지 않을 때는 `204`로 재연결을 멈춘다 (정상 `end`도 재연결을 부름)
- [ ] 15초 안팎으로 SSE 주석 또는 WebSocket ping을 보내 유휴 타임아웃을 막는다
- [ ] WebSocket: 메시지 최대 크기, `error`/`close` 핸들러, 동시 연결 상한을 둔다
- [ ] WebSocket: `Origin`을 검증하고 인증은 별도로 한다
- [ ] 프록시에서 `Upgrade`/`Connection` 전달, 읽기 타임아웃, SSE 응답 버퍼링을 확인한다
- [ ] 클라이언트 재연결에 백오프와 지터를 넣는다
- [ ] 서버가 여러 대면 브로커로 이벤트를 모든 서버에 전달한다

## 참고 자료

- [WHATWG HTML Standard 9.2 Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) - 스트림 형식, `Last-Event-ID`, 재연결·204·Content-Type 규칙, 15초 주석 권고, 서버당 연결 제한
- [RFC 6455 The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html) - 핸드셰이크와 `Sec-WebSocket-Accept`, Ping/Pong, §10.2 Origin
- [RFC 8441](https://www.rfc-editor.org/rfc/rfc8441.html) - HTTP/2에서의 WebSocket, [RFC 9220](https://www.rfc-editor.org/rfc/rfc9220.html) - HTTP/3에서의 WebSocket
- [RFC 9113 HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html) - `SETTINGS_MAX_CONCURRENT_STREAMS` 권장값
- [nginx - WebSocket proxying](https://nginx.org/en/docs/http/websocket.html), [ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) - `Upgrade` 전달, 60초 기본 타임아웃, `proxy_buffering`

확인일: 2026-10-23 (SSE 형식·재연결·`Last-Event-ID`·204·Content-Type 규칙과 15초 주석 권고는 WHATWG 명세 본문에서, 핸드셰이크 Accept 계산·Ping/Pong·Origin 403은 RFC 6455 본문에서, nginx 설정·60초 타임아웃·버퍼링 기본값은 nginx 공식 문서에서 확인. Node 24.13의 실험적 `EventSource`와 `ws` 8.22.0으로 로컬에서 직접 실행: SSE 재연결과 `Last-Event-ID`(1~8 무손실), 204/잘못된 Content-Type의 CLOSED, WebSocket 핸드셰이크·426·1000·1009·1006·ping/pong·Origin 검증. 실제 브라우저, nginx·클라우드 로드밸런서의 동작, `EventSource`의 헤더 제약, HTTP/2·3 위의 WebSocket 실제 지원, 브로커 기반 스케일아웃, 연결 수 한계 수치는 확인하지 못함)
