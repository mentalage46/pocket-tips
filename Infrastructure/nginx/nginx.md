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
        proxy_pass http://app:3000;  # docker-compose 서비스명
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

```nginx
location /ws {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;  # 24시간
}
```

---

## 보안 헤더

```nginx
server {
    # ...

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # 서버 버전 숨김
    server_tokens off;
}
```

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
docker-compose logs -f nginx
```
