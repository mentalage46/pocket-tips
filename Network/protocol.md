# 네트워크 프로토콜 (Network Protocols) - 실무 가이드

네트워크 프로토콜은 단순한 규칙을 넘어, 성능 최적화와 보안의 핵심입니다. 실무에서 자주 접하는 시나리오와 코드를 중심으로 정리합니다.

## 1. HTTP/HTTPS: 애플리케이션의 핵심

### 1.1. 실무에서 중요한 HTTP 헤더

단순 전송을 넘어 브라우저와 서버의 동작을 제어합니다.

- **`Cache-Control`**: 브라우저 캐싱 전략을 결정합니다.
  - `no-store`: 캐싱 금지 (보안 민감 데이터)
  - `public, max-age=31536000, immutable`: 정적 리소스(JS/CSS) 최적화
- **`CORS (Cross-Origin Resource Sharing)`**: 보안 정책.
  - `Access-Control-Allow-Origin`: 허용할 도메인 지정
- **`Keep-Alive`**: TCP 연결 재사용으로 성능 향상.

### 1.2. 실제 API 요청/응답 예시 (Raw)

```http
# Request
GET /api/v1/users/1 HTTP/1.1
Host: api.pocket-tips.com
Authorization: Bearer <JWT_TOKEN>
Accept: application/json

# Response
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: private, max-age=60
X-Content-Type-Options: nosniff

{
  "id": 1,
  "name": "Antigravity",
  "role": "Developer"
}
```

---

## 2. 전송 계층: TCP vs UDP 소켓 통신

### 2.1. TCP (신뢰성 중심)

3-way handshake를 통해 연결을 확립합니다. 실무에서는 데이터 유실이 없어야 하는 대부분의 서비스에 사용합니다.

```javascript
// Node.js TCP Server 예시
const net = require("net");

const server = net.createServer((socket) => {
  console.log("Client connected");
  socket.on("data", (data) => {
    console.log("Received:", data.toString());
    socket.write("ACK from Server"); // 신뢰성 보장을 위한 응답
  });
});

server.listen(8080, "127.0.0.1");
```

### 2.2. UDP (속도 중심)

연결 과정 없이 데이터를 던집니다. 실시간성이 중요한 스트리밍이나 게임 서버에서 사용합니다.

```javascript
// Node.js UDP Client 예시
const dgram = require("dgram");
const message = Buffer.from("Real-time Data");
const client = dgram.createSocket("udp4");

client.send(message, 41234, "localhost", (err) => {
  client.close(); // 응답을 기다리지 않고 종료 가능
});
```

---

## 3. DNS (Domain Name System) 실무 팁

- **A Record**: 도메인을 IPv4 주소로 직접 매핑.
- **CNAME**: 도메인을 다른 도메인으로 매핑 (AWS CloudFront, ELB 등에서 주로 사용).
- **TTL (Time To Live)**: DNS 설정 변경 시 전파되는 시간. 실무에서 서버 이전 시에는 미리 TTL을 낮춰두는 것이 필수입니다.

> [!TIP] > **HTTPS의 동작 원리 (TLS Handshake)**:
>
> 1. Client Hello (암호화 방식 제안)
> 2. Server Hello + Certificate (서버 인증서 전달)
> 3. Key Exchange (대칭키 생성을 위한 정보 교환)
> 4. Change Cipher Spec (암호화 통신 시작)
