# HTTP/1.1, HTTP/2, HTTP/3

> 의미(메서드, 상태 코드, 헤더)는 같고, 전송 방식이 다르다

메서드·상태 코드·헤더의 의미는 버전과 관계없이 **RFC 9110 (HTTP Semantics)** 하나로 정의됩니다. 버전이 바꾸는 것은 "그 메시지를 연결 위에 어떻게 싣는가"입니다.

---

## 한눈에 비교

| 구분 | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| 전송 계층 | TCP | TCP | **QUIC (UDP 위)** |
| 메시지 형식 | 텍스트 | 바이너리 프레임 | 바이너리 프레임 |
| 동시 요청 | 연결당 1개씩 (여러 연결로 우회) | 한 연결에서 다중화(스트림) | 한 연결에서 다중화 |
| 헤더 압축 | 없음 | HPACK | QPACK |
| HOL 블로킹 | 응답 단위 | **TCP 패킷 손실 시 모든 스트림 정지** | 스트림별로 독립 |
| 암호화 | 선택 | 브라우저는 TLS에서만 지원 | **항상** (QUIC에 TLS 1.3 내장) |
| 연결 수립 | TCP + TLS 왕복 | TCP + TLS 왕복 | QUIC 1-RTT (재접속 0-RTT) |
| 명세 | RFC 9112 | RFC 9113 | RFC 9114 |

> **HOL(Head-of-Line) 블로킹**: 앞의 것이 막히면 뒤의 것도 기다리는 현상. HTTP/2는 HTTP 수준의 HOL은 풀었지만 TCP는 하나의 순서 있는 바이트 흐름이라, 패킷 하나가 유실되면 그 연결의 모든 스트림이 재전송을 기다립니다. HTTP/3은 QUIC이 스트림마다 순서를 따로 관리해 이 문제를 없앴습니다.

---

## 협상: 어떤 버전으로 말할지 정하는 방법

| 버전 | 방법 |
| --- | --- |
| HTTP/2 | TLS 핸드셰이크의 **ALPN**에서 `h2` 선택 |
| HTTP/3 | 처음엔 HTTP/2·1.1로 접속 → 응답의 `Alt-Svc: h3=":443"` 헤더 또는 DNS **HTTPS 레코드**로 HTTP/3 지원을 알게 됨 → 다음 요청부터 QUIC(UDP 443) 시도 |

```http
HTTP/2 200
alt-svc: h3=":443"; ma=86400
```

- HTTP/3 시도가 실패하면(UDP 443 차단 등) 브라우저는 조용히 HTTP/2로 돌아갑니다. 그래서 방화벽이 UDP를 막아도 장애로 보이지 않고 "가끔 느리다" 정도로만 나타납니다.

---

## HTTP/1.1 시절 최적화, 지금은?

| 기법 | HTTP/1.1에서 이유 | HTTP/2·3에서 |
| --- | --- | --- |
| 도메인 샤딩 (`static1`, `static2`) | 도메인당 연결 수 제한 우회 | **해로움**. 연결이 나뉘어 다중화·압축 효과 감소 |
| 이미지 스프라이트, 파일 합치기 | 요청 수 줄이기 | 효과 작음. 캐시 단위가 커지는 단점이 더 큼 |
| 인라인 리소스 | 왕복 줄이기 | 매우 작은 핵심 CSS 정도만 |
| Server Push | (HTTP/2에서 도입) | Chrome 106부터 기본 비활성, Nginx 1.25.1부터 `http2_push` 폐기. `103 Early Hints` + `preload`로 대체 |

---

## 서버 설정 확인

```nginx
# Nginx: HTTP/2
server {
    listen 443 ssl;
    http2 on;   # 1.25.1+. 예전 형식은 listen 443 ssl http2;
}
```

```bash
# 응답 버전 확인
curl -sI https://example.com -o /dev/null -w '%{http_version}\n'   # 2

# HTTP/3 시도 (curl이 HTTP/3 지원으로 빌드된 경우)
curl --http3 -sI https://example.com

# 응답 헤더에서 Alt-Svc 확인
curl -sI https://example.com | grep -i alt-svc
```

- 브라우저 개발자 도구의 Network 탭에서 **Protocol** 열을 켜면 `http/1.1`, `h2`, `h3`가 보입니다.
- CDN(Cloudflare, CloudFront 등) 뒤에 있으면 사용자 ↔ CDN 구간과 CDN ↔ 원본 서버 구간의 버전이 다릅니다. 원본은 HTTP/1.1이어도 사용자는 HTTP/3을 쓸 수 있습니다.

---

## 🎯 체크리스트

- [ ] HTTPS에서 HTTP/2 활성화
- [ ] HTTP/3을 쓰면 방화벽·보안 그룹에서 **UDP 443** 허용
- [ ] 도메인 샤딩 제거
- [ ] Server Push 대신 `preload` / `103 Early Hints`

## 참고 자료

- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9112 HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html)
- [RFC 9113 HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html)
- [RFC 9114 HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html)
- [RFC 9000 QUIC](https://www.rfc-editor.org/rfc/rfc9000.html)
- [Nginx HTTP/2 모듈](https://nginx.org/en/docs/http/ngx_http_v2_module.html) - `http2` 지시어(1.25.1), `http2_push` 폐기
- [Chrome: Removing HTTP/2 Server Push](https://developer.chrome.com/blog/removing-push) - Chrome 106 기본 비활성, Early Hints·preload 권장

확인일: 2026-10-22 (RFC 번호, Nginx 지시어, Server Push 제거, `curl -w '%{http_version}'`는 실행 확인)
