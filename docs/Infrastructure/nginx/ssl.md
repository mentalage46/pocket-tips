# SSL 인증서 자동화 (Nginx + Let's Encrypt)

## 개요

> Let's Encrypt + Certbot으로 무료 SSL 인증서 발급 및 자동 갱신

**핵심 흐름**

```
Certbot → Let's Encrypt에서 인증서 발급 → Nginx에 적용 → 자동 갱신
```

---

## 방법 1: Certbot 직접 설치

### 1. Certbot 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Amazon Linux 2
sudo amazon-linux-extras install epel
sudo yum install certbot python3-certbot-nginx
```

### 2. 인증서 발급

```bash
# Nginx 플러그인 사용 (자동 설정)
sudo certbot --nginx -d example.com -d www.example.com

# 또는 인증서만 발급 (수동 설정)
sudo certbot certonly --nginx -d example.com
```

### 3. 자동 갱신 설정

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 크론탭 자동 등록 확인
sudo systemctl status certbot.timer

# 또는 수동 크론 설정
# /etc/cron.d/certbot
0 0,12 * * * root certbot renew --quiet --post-hook "nginx -s reload"
```

### 4. 생성되는 파일

```
/etc/letsencrypt/live/example.com/
├── fullchain.pem   # 인증서 + 체인
├── privkey.pem     # 개인키
├── cert.pem        # 인증서
└── chain.pem       # 체인
```

### 5. Nginx 설정

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;

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

---

## 방법 2: Docker + Certbot (권장)

### 구조

```
├── docker-compose.yml
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf
├── certbot/
│   ├── conf/          # 인증서 저장
│   └── www/           # 챌린지 파일
└── init-letsencrypt.sh
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - app
    restart: unless-stopped
    command: '/bin/sh -c ''while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g "daemon off;"'''

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  app:
    build: .
    expose:
      - "3000"
```

### Nginx 설정 (초기 - HTTP만)

```nginx
# nginx/conf.d/default.conf

server {
    listen 80;
    server_name example.com www.example.com;

    # Let's Encrypt 챌린지
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

### 초기 인증서 발급 스크립트

```bash
#!/bin/bash
# init-letsencrypt.sh

domains=(example.com www.example.com)
email="your-email@example.com"
staging=0  # 테스트 시 1로 설정

# 디렉토리 생성
mkdir -p ./certbot/conf ./certbot/www

# 임시 인증서 생성 (nginx 시작용)
if [ ! -e "./certbot/conf/live/$domains" ]; then
  mkdir -p "./certbot/conf/live/$domains"
  docker-compose run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
      -keyout '/etc/letsencrypt/live/$domains/privkey.pem' \
      -out '/etc/letsencrypt/live/$domains/fullchain.pem' \
      -subj '/CN=localhost'" certbot
fi

# Nginx 시작
docker-compose up -d nginx

# 임시 인증서 삭제
docker-compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$domains && \
  rm -rf /etc/letsencrypt/archive/$domains && \
  rm -rf /etc/letsencrypt/renewal/$domains.conf" certbot

# 실제 인증서 발급
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $email \
    --agree-tos \
    --no-eff-email \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Nginx 재시작
docker-compose restart nginx
```

```bash
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

### Nginx 설정 (인증서 발급 후 - HTTPS)

```nginx
# nginx/conf.d/default.conf

server {
    listen 80;
    server_name example.com www.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

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

## 방법 3: nginx-proxy + acme-companion (가장 자동화)

```yaml
version: "3.8"

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    restart: unless-stopped

  acme-companion:
    image: nginxproxy/acme-companion
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - acme:/etc/acme.sh
    environment:
      - DEFAULT_EMAIL=your-email@example.com
    depends_on:
      - nginx-proxy
    restart: unless-stopped

  app:
    build: .
    expose:
      - "3000"
    environment:
      - VIRTUAL_HOST=example.com,www.example.com
      - VIRTUAL_PORT=3000
      - LETSENCRYPT_HOST=example.com,www.example.com
    restart: unless-stopped

volumes:
  certs:
  vhost:
  html:
  acme:
```

**장점**

- 새 서비스 추가 시 환경변수만 설정하면 자동 인증서 발급
- 자동 갱신 내장
- 멀티 도메인 간편 관리

---

## 자동 갱신 확인

```bash
# 직접 설치 시
sudo certbot renew --dry-run

# Docker 시
docker-compose run --rm certbot renew --dry-run

# 인증서 만료일 확인
sudo certbot certificates

# 또는
openssl x509 -enddate -noout -in /etc/letsencrypt/live/example.com/fullchain.pem
```

---

## 🎯 SSL 자동화 체크리스트

### 초기 설정

- [ ] 도메인 DNS A 레코드 설정
- [ ] 80 포트 열림 확인 (챌린지용)
- [ ] 443 포트 열림 확인
- [ ] 이메일 주소 설정 (만료 알림용)

### Nginx 설정

- [ ] HTTP → HTTPS 리다이렉트
- [ ] `/.well-known/acme-challenge/` 경로 설정
- [ ] TLSv1.2 이상만 허용
- [ ] HSTS 헤더 추가

### 자동 갱신

- [ ] 갱신 테스트 (`--dry-run`)
- [ ] 크론/타이머 설정 확인
- [ ] 갱신 후 Nginx 리로드 확인

### 모니터링

- [ ] 인증서 만료일 모니터링
- [ ] 갱신 실패 알림 설정

---

## 주의사항

- ⚠️ Let's Encrypt 인증서는 **90일** 유효 → 자동 갱신 필수
- ⚠️ 발급 한도: 같은 도메인 주 50회 (staging으로 테스트)
- ⚠️ 와일드카드 인증서는 DNS 챌린지 필요
- ⚠️ 처음 발급 시 80 포트 반드시 열려있어야 함

---

## 요약

```
개발/테스트 → 방법 1 (Certbot 직접)
단일 서버 운영 → 방법 2 (Docker + Certbot)
멀티 서비스 운영 → 방법 3 (nginx-proxy + acme-companion) ⭐
```
