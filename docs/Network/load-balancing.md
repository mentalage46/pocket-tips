# 로드 밸런싱

> 요청을 여러 서버에 나누고, 죽은 서버를 빼고, 다시 넣는 일

Nginx 기본 설정은 [Nginx](../Infrastructure/nginx/nginx.md#로드-밸런싱), 배포 중 트래픽 전환은 [배포 전략](../Infrastructure/cicd/deployment-strategies.md)을 참고합니다.

---

## L4 vs L7

| 구분 | L4 (전송 계층) | L7 (애플리케이션 계층) |
| --- | --- | --- |
| 보는 정보 | IP, 포트 | URL 경로, 호스트, 헤더, 쿠키 |
| TLS | 통과(passthrough) 가능 | 보통 여기서 종료(termination) |
| 라우팅 | 연결 단위 | 요청 단위 (`/api` → A, `/static` → B) |
| 성능 | 빠름, 단순 | 요청을 해석하므로 비용 있음 |
| 예 | AWS NLB, Nginx `stream` | AWS ALB, Nginx `http`, HAProxy, Traefik, Caddy |

대부분의 웹 서비스는 L7 하나로 충분합니다. L4는 TCP·UDP 프로토콜(DB, 게임, MQTT)이나 TLS를 백엔드까지 그대로 넘겨야 할 때 씁니다.

---

## 분산 알고리즘

| 알고리즘 | 동작 | 잘 맞는 경우 | Nginx |
| --- | --- | --- | --- |
| 라운드 로빈 (가중치) | 차례로 배분, 가중치만큼 더 | 요청 비용이 비슷할 때. 기본값 | 기본 |
| 최소 연결 | 활성 연결이 가장 적은 서버로 | 요청 처리 시간이 들쭉날쭉할 때 (긴 업로드, 스트리밍) | `least_conn` |
| IP 해시 | 클라이언트 IP로 서버 고정 | 간단한 세션 유지 | `ip_hash` (IPv4는 앞 3옥텟 사용) |
| 일반 해시 | 임의 키(URL, 사용자 ID)로 고정 | 캐시 서버 앞단. `consistent`로 서버 추가 시 재배치 최소화 | `hash $request_uri consistent` |

```nginx
upstream backend {
    least_conn;
    server app1:3000 weight=2;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 backup;      # 다른 서버가 모두 죽었을 때만
    keepalive 16;                 # 백엔드와 연결 재사용
}

server {
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";   # keepalive용
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> `ip_hash`는 사무실·모바일망처럼 많은 사용자가 같은 공인 IP를 쓰면 한 서버로 몰립니다. 또한 `backup`은 `hash`, `ip_hash`, `random`과 함께 쓸 수 없습니다.

---

## 헬스체크

| 방식 | 동작 | 예 |
| --- | --- | --- |
| 수동(passive) | 실제 요청이 실패하면 일정 시간 제외 | Nginx 오픈소스 `max_fails`/`fail_timeout` |
| 능동(active) | 주기적으로 `/health` 호출 | AWS ALB 대상 그룹, HAProxy `check`, Nginx Plus `health_check` |

- Nginx 오픈소스의 기본값은 `max_fails=1`, `fail_timeout=10s`입니다. 요청 1번 실패로 10초간 빠집니다.
- 능동 헬스체크는 오픈소스 Nginx에 없습니다(상용 구독 기능). 필요하면 HAProxy·Traefik이나 클라우드 LB를 씁니다.

### `/health` 엔드포인트 설계

| 종류 | 확인 내용 | 실패 시 |
| --- | --- | --- |
| liveness | 프로세스가 응답하는가 | 재시작 |
| readiness | DB 연결 등 요청을 받을 준비가 됐는가 | LB에서 제외(재시작 안 함) |

- readiness에 외부 API까지 넣으면, 외부 장애 때 **모든 서버가 동시에 빠져** 전체 장애가 됩니다. 꼭 필요한 의존성만 넣습니다.
- 헬스체크 응답은 가볍게. 인증 없이, 캐시 없이, 수 ms 안에.

---

## 세션 유지(sticky session)

| 방법 | 장단점 |
| --- | --- |
| IP 해시 | 설정 간단. 같은 IP에 몰림, 서버 제거 시 세션 유실 |
| 쿠키 기반 | LB가 서버 표시 쿠키를 발급. 고르게 분산 |
| **세션 외부 저장 (권장)** | Redis 등에 세션 저장. 어느 서버로 가도 됨, 배포·확장이 자유로움 |

가능하면 서버를 무상태(stateless)로 만들고 sticky session은 쓰지 않습니다. 세션 저장은 [Redis](../Data/caching/redis.md)를 참고합니다.

---

## 프록시 뒤에서 놓치기 쉬운 것

| 문제 | 원인 | 해결 |
| --- | --- | --- |
| 로그의 클라이언트 IP가 전부 LB IP | 원래 IP는 `X-Forwarded-For`에 있음 | 앱에서 신뢰할 프록시를 지정하고 헤더 사용 (Express `app.set("trust proxy", 1)`) |
| HTTPS인데 앱이 http로 리다이렉트 | TLS가 LB에서 끝나 앱은 http로 받음 | `X-Forwarded-Proto` 확인 |
| 아무나 `X-Forwarded-For` 위조 | 클라이언트가 보낸 헤더를 그대로 신뢰 | 신뢰할 프록시 수만큼만 오른쪽에서 읽기 |
| 배포 중 502 | 종료 중인 서버로 요청 | readiness 먼저 실패시키고 연결 정리 후 종료(graceful shutdown) |
| 긴 요청이 끊김 | LB 유휴 타임아웃 | LB와 앱 타임아웃 맞추기 (앱 keep-alive > LB 유휴 타임아웃) |

---

## 🎯 체크리스트

- [ ] 알고리즘: 기본 라운드 로빈, 처리 시간 편차가 크면 `least_conn`
- [ ] 헬스체크: liveness/readiness 분리, readiness는 필수 의존성만
- [ ] 세션은 외부 저장소, sticky session 지양
- [ ] `X-Forwarded-For`/`X-Forwarded-Proto` 전달과 앱의 trust proxy 설정
- [ ] graceful shutdown으로 배포 중 502 방지
- [ ] 백엔드 keepalive 설정

## 참고 자료

- [Nginx upstream 모듈](https://nginx.org/en/docs/http/ngx_http_upstream_module.html) - 기본 알고리즘, `least_conn`, `ip_hash`, `hash ... consistent`, `weight`·`max_fails`·`fail_timeout`·`backup` 기본값과 제약, `keepalive`, 능동 헬스체크는 상용 구독

확인일: 2026-10-22 (Nginx 지시어와 기본값. Express `trust proxy`, 클라우드 LB 이름, 타임아웃 권장은 미확인·경험칙)
