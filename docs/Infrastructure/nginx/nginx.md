# Nginx

## Nginx란?

> 고성능 웹 서버, 리버스 프록시, 로드 밸런서

**주요 용도**

- 정적 파일 서빙
- 리버스 프록시 (앱 서버 앞단)
- 로드 밸런싱
- SSL 종료
- 캐싱

---

## 개념: Nginx는 어떻게 요청을 처리하는가

### 프로세스 구조

- **master 프로세스 1개**: 설정을 읽고 검증하며 worker를 관리합니다.
- **worker 프로세스 여러 개**: 실제 요청을 처리합니다. `worker_processes auto;`는 CPU 코어 수에 맞춥니다.
- worker 하나가 **많은 연결을 이벤트 기반으로** 처리하기 때문에, 연결마다 스레드를 만들지 않고도 많은 동시 연결을 감당합니다. `worker_connections`는 worker 하나가 동시에 열 수 있는 연결 수입니다. 프록시로 쓰면 클라이언트 연결과 업스트림 연결을 각각 쓰므로 실제 동시 클라이언트 수는 그보다 적습니다(일반 설명).

### 설정 재적용은 무중단 (`nginx -s reload`)

1. master가 새 설정의 문법과 유효성을 검사합니다.
2. 성공하면 **새 worker를 시작**하고 기존 worker에게 종료를 요청합니다. 기존 worker는 새 연결을 받지 않고 **처리 중인 요청을 마친 뒤** 종료합니다.
3. 실패하면 변경을 되돌리고 **기존 설정으로 계속 동작**합니다.

그래서 `nginx -t`로 먼저 검사하고(`-t`는 이 설명 문서에서 확인하지 못했고 일반적인 사용법입니다) `reload`하는 것이 안전한 순서입니다. `restart`는 연결이 끊길 수 있으니 설정 변경에는 `reload`를 씁니다.

### 요청이 설정에 매칭되는 순서

```
요청 → listen(포트) + server_name으로 server 블록 선택 → URI로 location 블록 선택 → 처리
```

**location 선택 규칙** (공식 문서의 순서):

1. `=` (정확히 일치)가 있으면 즉시 확정
2. 접두사(prefix) location 중 **가장 긴 것**을 기억해 둠. 그것이 `^~`이면 정규식 검사 없이 확정
3. 정규식(`~`, `~*`)을 **파일에 쓴 순서대로** 검사해 **처음 일치하는 것**을 확정
4. 일치하는 정규식이 없으면 2에서 기억한 접두사 location 사용

```nginx
location = /               { }  # A: 정확히 "/"
location /                 { }  # B: 그 밖의 기본
location /documents/       { }  # C
location ^~ /images/       { }  # D: 정규식보다 우선
location ~* \.(gif|jpg)$   { }  # E
```

| 요청 | 선택 | 이유 |
| --- | --- | --- |
| `/` | A | 정확 일치 |
| `/index.html` | B | 가장 긴 접두사가 `/` |
| `/documents/document.html` | C | 더 긴 접두사 |
| `/images/1.gif` | **D** | `^~`가 있어 정규식 E를 검사하지 않음 |
| `/documents/1.jpg` | **E** | 접두사 C가 기억되지만 정규식이 일치하면 정규식이 이김 |

> "더 구체적인 것이 이긴다"가 아니라 **접두사는 길이, 정규식은 순서**입니다. 정규식 location의 순서를 바꾸면 결과가 달라질 수 있습니다.

### 리버스 프록시의 핵심: `proxy_pass` 뒤의 `/`

`proxy_pass`에 **URI(경로)가 있는지**에 따라 업스트림으로 가는 경로가 달라집니다. 가장 흔한 실수입니다.

| 설정 | 요청 | 업스트림이 받는 경로 |
| --- | --- | --- |
| `location /api/ { proxy_pass http://backend:4000/; }` (끝에 `/`, URI 있음) | `/api/users` | `/users` (location 부분이 **치환**됨) |
| `location /api/ { proxy_pass http://backend:4000; }` (URI 없음) | `/api/users` | `/api/users` (**그대로** 전달) |

- 정규식 location, 이름 있는 location, 변수가 들어간 `proxy_pass`에서는 치환할 부분을 정할 수 없으므로 URI 없이 씁니다.
- 아래 "정적 파일 서빙" 예시의 `/api/` → `http://backend:4000/`는 **`/api` 접두사를 떼고 전달**하는 설정입니다.

### 프록시가 요청을 바꾸는 것

- 기본적으로 `Host` 헤더는 **업스트림 주소**(`$proxy_host`)로 바뀝니다. 클라이언트가 보낸 원래 호스트를 앱이 알아야 하면 `proxy_set_header Host $host;`를 씁니다.
- 앱은 프록시를 거치므로 클라이언트 IP와 원래 프로토콜을 직접 알 수 없습니다. `X-Forwarded-For`, `X-Forwarded-Proto`를 전달하고 앱이 이를 신뢰하도록 설정합니다([로드 밸런싱](../../Network/load-balancing.md#프록시-뒤에서-놓치기-쉬운-것)).
- `proxy_set_header`를 하위 블록에서 하나라도 쓰면 상위 블록의 `proxy_set_header`는 **상속되지 않습니다**(`add_header`와 같은 규칙).

### 프록시 기본값

| 지시어 | 기본값 | 의미 |
| --- | --- | --- |
| `proxy_read_timeout` | 60s | 업스트림이 60초 동안 아무것도 안 보내면 연결을 끊음 (느린 API, 롱 폴링에서 504의 원인) |
| `proxy_buffering` | on | 업스트림 응답을 Nginx가 먼저 받아 두었다가 느린 클라이언트에 전달 (앱 서버를 빨리 해방) |
| `proxy_http_version` | 1.1 (1.29.7부터, 이전 버전은 1.0) | 업스트림 keep-alive, WebSocket에 필요. 이전 버전이면 명시 |

---

## 기본 구조

```nginx
# /etc/nginx/nginx.conf

# 워커 프로세스 수
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    # 로그 형식
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';

    # 성능 설정
    sendfile        on;
    keepalive_timeout  65;

    # gzip 압축
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # 서버 설정 포함
    include /etc/nginx/conf.d/*.conf;
}
```

---

## 리버스 프록시 설정

### 기본 리버스 프록시

```nginx
# /etc/nginx/conf.d/app.conf

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker 환경 (서비스명 사용)

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://app:3000;  # compose 서비스명
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## SSL/HTTPS 설정

```nginx
server {
    listen 80;
    server_name example.com;

    # HTTP → HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL 인증서
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL 설정 (보안)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 로드 밸런싱

```nginx
upstream backend {
    # 라운드 로빈 (기본)
    server app1:3000;
    server app2:3000;
    server app3:3000;

    # 또는 가중치
    # server app1:3000 weight=3;
    # server app2:3000 weight=1;

    # 또는 Least Connections
    # least_conn;

    # 또는 IP Hash (세션 유지)
    # ip_hash;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

알고리즘 선택, 헬스체크, 세션 유지는 [로드 밸런싱](../../Network/load-balancing.md)을 참고합니다.

---

## 정적 파일 서빙

```nginx
server {
    listen 80;
    server_name example.com;

    # 정적 파일 (React, Vue 빌드 결과물)
    root /var/www/html;
    index index.html;

    # SPA 라우팅 지원
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api/ {
        proxy_pass http://backend:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## WebSocket 지원

WebSocket은 HTTP 요청에 `Upgrade: websocket` 헤더를 붙여 프로토콜을 전환합니다. 그런데 `Upgrade`와 `Connection`은 **hop-by-hop 헤더**라서 프록시가 업스트림으로 전달하지 않습니다. 명시적으로 넘겨야 합니다.

```nginx
location /ws {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;      # 1.29.7 이전 버전에서 필요
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;  # 24시간
}
```

같은 location에 일반 HTTP 요청도 섞이면 `Connection`을 `Upgrade` 헤더 유무에 따라 정하는 `map` 방식이 공식 예시입니다.

```nginx
http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }
    server {
        location /chat/ {
            proxy_pass http://backend;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }
    }
}
```

- 기본 `proxy_read_timeout`(60초) 동안 업스트림이 아무 데이터도 안 보내면 연결이 끊깁니다. 타임아웃을 늘리거나, 앱이 주기적으로 **WebSocket ping 프레임**을 보내 유휴 상태를 없앱니다.

---

## 보안 헤더

```nginx
server {
    # ...

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # 서버 버전 숨김
    server_tokens off;
}
```

> `X-XSS-Protection`은 설정하지 않습니다(OWASP 권장, CSP로 대체). 헤더별 권장 값과 `add_header` 상속 주의점은 [웹 공격과 방어](../../Security/web-attacks.md#보안-응답-헤더)를 참고합니다.

---

## 주요 명령어

```bash
# 설정 테스트
nginx -t

# 재시작
nginx -s reload      # 설정 리로드 (무중단)
nginx -s stop        # 중지
nginx -s quit        # 정상 종료

# Docker에서
docker exec nginx nginx -t
docker exec nginx nginx -s reload
```

---

## 🎯 Nginx 체크리스트

### 기본 설정

- [ ] `server_tokens off` (버전 숨김)
- [ ] gzip 압축 활성화
- [ ] 적절한 `worker_processes` 설정
- [ ] 로그 형식 및 경로 설정

### 리버스 프록시

- [ ] `proxy_set_header` 설정 (Host, X-Real-IP 등)
- [ ] `proxy_http_version 1.1` 설정
- [ ] 타임아웃 설정

### SSL/HTTPS

- [ ] HTTP → HTTPS 리다이렉트
- [ ] TLSv1.2 이상만 허용
- [ ] HSTS 헤더 추가
- [ ] 인증서 자동 갱신 설정 (Let's Encrypt)

### 보안

- [ ] 보안 헤더 추가 (X-Frame-Options 등)
- [ ] 불필요한 location 차단
- [ ] rate limiting 설정 (필요 시)

### 성능

- [ ] 정적 파일 캐시 설정
- [ ] gzip 압축
- [ ] 버퍼 크기 최적화

---

## Docker + Nginx 예시

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./html:/var/www/html:ro
    depends_on:
      - app
    restart: unless-stopped

  app:
    build: .
    expose:
      - "3000" # 내부만 노출
```

---

## 설정 디버깅

```bash
# 설정 문법 확인
nginx -t

# 설정 내용 확인
nginx -T

# 로그 실시간 확인
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Docker에서
docker compose logs -f nginx
```

## 참고 자료

- [Nginx: Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html) - master/worker 구조, server·location 선택, reload 동작
- [Nginx: location](https://nginx.org/en/docs/http/ngx_http_core_module.html#location) - 매칭 순서, `=`·`^~`, 공식 예시
- [Nginx: proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) - URI 유무에 따른 경로 처리, `Host` 기본값, `proxy_http_version`·`proxy_buffering`·`proxy_read_timeout` 기본값
- [Nginx: WebSocket proxying](https://nginx.org/en/docs/http/websocket.html) - hop-by-hop 헤더, `map` 예시, 60초 타임아웃

확인일: 2026-10-22 (프로세스 구조·reload·location 매칭·`proxy_pass` URI 처리·기본값·WebSocket. `nginx -t` 설명, `worker_connections`와 프록시 연결 수 계산, 응답 캐시·`try_files`·`expires`와 `add_header` 조합은 미확인. 이 환경에는 nginx가 없어 실제 실행으로는 검증하지 못함)
