# Top-down 네트워크 접근 방식 - 실무 분석

브라우저에 URL을 입력했을 때부터 데이터가 물리적으로 전송되기까지의 과정을 실무적인 관점에서 분석합니다.

## 1. Request Flow: "google.com"을 입력하면 생기는 일

실무에서는 이 과정을 이해하는 것이 트러블슈팅의 시작입니다.

1.  **DNS Lookup**: 도메인을 IP로 변환. (브라우저 캐시 -> OS 캐시 -> Router 캐시 -> ISP DNS 순서)
2.  **TCP 3-Way Handshake**: 서버와 연결 확립.
3.  **TLS Handshake**: HTTPS 보안 연결 설정.
4.  **HTTP Request**: 브라우저가 서버에 데이터를 요청.
5.  **Server Processing**: 로드밸런서(ELB/Nginx)를 거쳐 애플리케이션 서버가 응답 생성.
6.  **HTTP Response**: 서버가 브라우저에 데이터 전송.
7.  **Browser Rendering**: HTML/CSS/JS를 해석하여 화면 표시.

---

## 2. 데이터 캡슐화 (Encapsulation) - 코드 구조 관점

데이터가 계층을 내려가며 어떻게 포장되는지 객체 구조로 표현해 봅니다.

```javascript
// 1. Application Layer (Data)
const message = { type: "GET", path: "/index.html" };

// 2. Transport Layer (Segment)
const segment = {
  header: { srcPort: 54321, destPort: 443, seqNum: 101 },
  data: message,
};

// 3. Network Layer (Packet/Datagram)
const packet = {
  header: { srcIP: "192.168.0.10", destIP: "142.250.196.110" },
  data: segment,
};

// 4. Data Link Layer (Frame)
const frame = {
  header: { srcMAC: "AA:BB:CC:DD:EE:FF", destMAC: "11:22:33:44:55:66" },
  data: packet,
  trailer: { crc: "0x12345678" }, // 오류 검출용
};
```

---

## 3. 실무 인프라와의 연결 (Cloud/VPC)

네트워크 계층 구조는 클라우드 환경의 설정과 직결됩니다.

- **VPC (Virtual Private Cloud)**: 논리적으로 격리된 네트워크 공간 (L3 영역).
- **Subnet**: VPC 내에서 IP 대역을 분할하여 관리.
- **Security Group / ACL**: 특정 포트(L4)나 IP(L3)의 접근을 제어하는 방화벽.
- **Load Balancer (L4/L7)**:
  - **L4 LB**: IP와 포트 번호를 기준으로 트래픽 분산 (TCP/UDP).
  - **L7 LB**: HTTP 헤더, 쿠키, URL 경로를 기준으로 트래픽 분산 (애플리케이션 계층).

> [!IMPORTANT] > **트러블슈팅 팁**:
>
> - 접속이 아예 안 된다면? -> DNS Lookup 또는 L3(IP/Routing) 문제 확인.
> - 연결은 되는데 타임아웃이 난다면? -> L4(Port/Security Group) 또는 서버 부하 확인.
> - 특정 URL만 안 된다면? -> L7(Load Balancer/Application) 설정 확인.
