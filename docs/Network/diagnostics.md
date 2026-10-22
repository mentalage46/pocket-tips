# 네트워크 진단 명령

> "안 붙어요"를 어느 계층에서 끊겼는지로 바꾸는 순서와 명령

---

## 진단 순서 (아래 계층부터)

```
1. 이름이 풀리는가?          dig
2. 경로가 있는가?            ping, traceroute
3. 포트가 열려 있는가?       nc, curl
4. TLS가 맞는가?             openssl s_client
5. HTTP 응답이 맞는가?       curl -v
6. 서버에서 듣고 있는가?     lsof / ss
7. 패킷이 오가는가?          tcpdump
```

한 단계가 실패하면 그 아래를 고칩니다. 예: `curl`은 실패하는데 `dig`가 틀린 IP를 주면 DNS 문제입니다.

---

## 1. DNS

```bash
dig +short api.example.com
dig @1.1.1.1 +short api.example.com     # 다른 리졸버와 비교
```

자세한 내용은 [DNS 실무](./dns.md#조회-명령-dig)를 참고합니다.

---

## 2. 경로

```bash
ping -c 4 api.example.com
traceroute api.example.com
mtr api.example.com          # ping + traceroute 연속 측정 (macOS는 brew install mtr)
```

> 클라우드 서버나 방화벽은 ICMP를 막는 경우가 많습니다. `ping`이 안 돼도 서비스는 정상일 수 있으니 다음 단계로 넘어가 확인합니다.

---

## 3. 포트

```bash
nc -vz api.example.com 443          # TCP 연결만 시도
nc -vz -w 3 db.internal 5432        # 3초 타임아웃
```

| 결과 | 의미 |
| --- | --- |
| `succeeded` / `open` | 포트가 열려 있고 무언가 듣고 있음 |
| `Connection refused` | 호스트에 도달했지만 그 포트를 듣는 프로세스가 없음 |
| 타임아웃 | 방화벽·보안 그룹이 조용히 버림(drop), 또는 경로 없음 |

> **refused와 타임아웃의 차이가 핵심**입니다. refused면 서버 프로세스·바인딩 주소 문제, 타임아웃이면 방화벽·보안 그룹·라우팅 문제입니다.

---

## 4. TLS

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null
```

인증서 기간·이름 확인과 흔한 오류는 [TLS와 인증서](./tls.md#확인-명령)를 참고합니다.

---

## 5. HTTP (`curl`)

```bash
curl -v https://api.example.com/health        # 요청·응답 헤더, TLS 과정
curl -sI https://api.example.com              # 응답 헤더만
curl -sL https://example.com                  # 리다이렉트 따라가기

# 특정 IP로 강제 연결 (DNS 바꾸기 전 새 서버 확인)
curl --resolve api.example.com:443:203.0.113.20 https://api.example.com/health

# 구간별 시간
curl -s -o /dev/null -w 'dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total} http=%{http_version}\n' \
  https://api.example.com
```

`-w` 값은 요청 시작부터의 누적 시간(초)입니다.

| 구간 | 계산 | 크면 |
| --- | --- | --- |
| DNS | `time_namelookup` | 리졸버 느림, 캐시 없음 |
| TCP 연결 | `time_connect - time_namelookup` | 물리적 거리, 네트워크 혼잡 |
| TLS | `time_appconnect - time_connect` | 인증서 체인 크기, TLS 1.2 |
| 서버 처리 | `time_starttransfer - time_appconnect` | **앱·DB가 느림** (대개 여기) |
| 전송 | `time_total - time_starttransfer` | 응답 크기, 대역폭 |

---

## 6. 서버에서 듣고 있는가

```bash
# macOS / Linux 공통
sudo lsof -iTCP -sTCP:LISTEN -n -P
sudo lsof -i :3000                  # 3000 포트를 쓰는 프로세스

# Linux
ss -tlnp                            # TCP LISTEN 소켓과 프로세스
ss -tn state established '( dport = :5432 )'   # DB 연결 수 확인
```

| 확인 | 흔한 원인 |
| --- | --- |
| `127.0.0.1:3000`으로만 듣고 있음 | 외부·다른 컨테이너에서 접속 불가 → `0.0.0.0`으로 바인딩 |
| Docker 안에서는 되는데 밖에서 안 됨 | 포트 매핑(`-p 3000:3000`) 누락, 또는 위 바인딩 문제 |
| 포트 충돌 (`EADDRINUSE`) | 이전 프로세스가 남아 있음 → `lsof -i :포트`로 찾기 |

---

## 7. 패킷 (`tcpdump`)

```bash
sudo tcpdump -i any -n port 443                 # 443 포트 패킷
sudo tcpdump -i any -n host 203.0.113.20        # 특정 호스트
sudo tcpdump -i any -n -w capture.pcap port 5432   # 파일로 저장 → Wireshark로 분석
```

- SYN만 계속 나가고 응답이 없으면 → 상대 방화벽에서 drop
- SYN 다음 RST가 오면 → refused (듣는 프로세스 없음)
- macOS는 `tcpdump -D`로 인터페이스 목록을 보고 `-i en0`(Wi-Fi)·`-i lo0`(로컬)처럼 지정합니다. 로컬 서버끼리의 통신은 `lo0`에서만 보입니다.

---

## 증상별 빠른 판단

| 증상 | 먼저 볼 것 |
| --- | --- |
| 도메인으로는 안 되고 IP로는 됨 | DNS (`dig`) |
| 로컬에서는 되고 서버에 배포하면 안 됨 | 바인딩 주소, 보안 그룹·방화벽 (`nc`, `ss`) |
| 가끔 느림 | `curl -w` 구간별 시간, DNS TTL, 커넥션 풀 |
| 브라우저는 되고 서버 간 호출만 실패 | 중간 인증서 누락 (`openssl s_client`) |
| 502 Bad Gateway | 프록시 뒤 앱이 죽었거나 포트·주소 오설정 (프록시 에러 로그) |
| 504 Gateway Timeout | 앱 처리 시간 > 프록시 타임아웃 |

## 참고 자료

- [curl `--write-out` 변수 목록](https://everything.curl.dev/usingcurl/verbose/writeout.html)

확인일: 2026-10-22 (`curl -w`·`--resolve`, `dig`, `nc -vz`, `lsof`, `tcpdump -D`는 macOS(curl 8.7.1, tcpdump 4.99.1)에서 실행 확인. Linux `ss` 필터 문법과 `mtr`은 미확인)
