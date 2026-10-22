# SSL 인증서 자동화 (Nginx + Let's Encrypt)

## 개요

> Let's Encrypt + Certbot으로 무료 SSL 인증서 발급 및 자동 갱신

**핵심 흐름**

```
Certbot → Let's Encrypt에서 인증서 발급 → Nginx에 적용 → 자동 갱신
```

---

## 개념: 인증서 발급은 "도메인 소유 증명"이다

Let's Encrypt 같은 CA는 인증서를 주기 전에 **요청자가 그 도메인을 실제로 제어하는지** 확인합니다. 이 자동화 프로토콜이 ACME이고, Certbot은 ACME 클라이언트입니다. 확인 방식(챌린지)에 따라 필요한 조건이 다릅니다.

| 챌린지 | 증명 방법 | 필요 조건 | 와일드카드 | 잘 맞는 경우 |
| --- | --- | --- | --- | --- |
| **HTTP-01** | `http://도메인/.well-known/acme-challenge/<토큰>` 파일을 CA가 읽음 | **80번 포트**가 인터넷에서 접근 가능 | **불가** | 일반 웹 서버, 가장 쉬운 자동화 |
| **DNS-01** | `_acme-challenge.도메인`에 TXT 레코드를 만들고 CA가 DNS를 조회 | DNS API 접근 권한 | **가능** | 와일드카드, 서버가 외부에 공개되지 않은 경우, 서버가 여러 대 |
| **TLS-ALPN-01** | 443 포트의 TLS 핸드셰이크로 증명 | 이 챌린지를 지원하는 서버 | 불가 | 80번 포트를 쓸 수 없는 TLS 종단 프록시(클라이언트 지원 제한) |

- **HTTP-01에서 80번 포트는 인증서 발급·갱신 때마다 필요합니다.** HTTPS만 열어 두고 80을 막으면 갱신이 실패합니다. 80은 HTTPS로 리다이렉트하되, `/.well-known/acme-challenge/`는 응답할 수 있어야 합니다(리다이렉트는 따라가지만 http/https와 80/443 포트로만).
- **DNS-01**은 DNS API 자격증명을 서버에 두어야 해서 그 자격증명이 노출되면 위험합니다. 해당 레코드만 수정할 수 있는 **최소 권한 토큰**을 씁니다.
- 와일드카드(`*.example.com`)는 DNS-01만 가능합니다. `*.example.com`은 `example.com` 자체를 포함하지 않으므로 둘 다 발급받아야 하는 경우가 많습니다.

### 갱신: 발급만큼 중요하다

- 대부분의 Certbot 설치는 `certbot renew`를 실행하는 **스케줄 작업**(systemd timer 또는 cron)을 자동 등록합니다. `systemctl list-timers`나 crontab으로 확인합니다.
- **Certbot 4.0.0부터는 인증서 수명이 1/3 남았을 때** 갱신 대상이 됩니다(수명 10일 이하는 절반). 예전 설명인 "만료 30일 전"은 4.0.0 이전 기준입니다.
- 갱신된 인증서 파일은 Nginx가 **설정을 다시 읽을 때** 반영됩니다. 그래서 갱신 후 `reload`가 필요합니다. Certbot의 훅은 두 가지입니다.

| 훅 | 실행 시점 | 용도 |
| --- | --- | --- |
| `--deploy-hook` | 인증서가 **실제로 갱신(발급)에 성공했을 때만** | `systemctl reload nginx` 같은 반영 |
| `--post-hook` | 갱신 시도 후 **성공·실패와 무관하게** | 중지했던 서비스 다시 시작 |

- 두 훅 모두 인증서가 **실제로 갱신 대상일 때만** 실행됩니다(갱신할 게 없는 날에는 실행되지 않음). 인증서 반영이 목적이면, 갱신이 실패해도 도는 `--post-hook`보다 **성공했을 때만 도는 `--deploy-hook`**이 맞습니다. 아래 크론 예시도 `--deploy-hook`을 씁니다.
- 갱신 점검은 `certbot renew --dry-run`(스테이징 서버로 시험, 인증서는 저장하지 않음)으로 합니다.

### 파일: 어느 것을 Nginx에 쓰는가

| 파일 | 내용 | Nginx 지시어 |
| --- | --- | --- |
| `fullchain.pem` | 서버 인증서 + 중간 인증서 | `ssl_certificate` |
| `privkey.pem` | 개인키 (**비밀 유지**) | `ssl_certificate_key` |
| `cert.pem`, `chain.pem` | 서버 인증서, 중간 인증서 따로 | 둘을 함께 쓸 때만 |

- `/etc/letsencrypt/live/<이름>/` 안의 파일은 **심볼릭 링크**입니다. 복사하지 말고 이 경로를 그대로 가리켜야 갱신 때 자동으로 새 파일이 적용됩니다.
- 중간 인증서가 빠진 `cert.pem`만 쓰면 일부 클라이언트에서 인증서 검증이 실패합니다([TLS와 인증서](../../Network/tls.md#인증서-체인)).

### 발급 한도 (production)

| 한도 | 값 | 비고 |
| --- | --- | --- |
| 등록 도메인당 인증서 | 7일 동안 **50개** | 모든 계정 합산 |
| 동일한 도메인 조합의 중복 인증서 | 7일 동안 **5개** | 예외 없음 |
| 인증 실패 | 식별자·계정당 **1시간에 5번** | 예외 없음 |
| 새 주문 | 계정당 3시간에 300개 | |

- 설정을 시험할 때는 **스테이징 서버**를 씁니다(한도가 훨씬 넉넉하지만 인증서는 브라우저가 신뢰하지 않음).
- 스크립트가 실패하며 반복 재시도하면 **중복·실패 한도**에 걸립니다. 반복 실행하기 전에 원인부터 고칩니다.

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
0 0,12 * * * root certbot renew --quiet --deploy-hook "nginx -s reload"
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
  docker compose run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
      -keyout '/etc/letsencrypt/live/$domains/privkey.pem' \
      -out '/etc/letsencrypt/live/$domains/fullchain.pem' \
      -subj '/CN=localhost'" certbot
fi

# Nginx 시작
docker compose up -d nginx

# 임시 인증서 삭제
docker compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$domains && \
  rm -rf /etc/letsencrypt/archive/$domains && \
  rm -rf /etc/letsencrypt/renewal/$domains.conf" certbot

# 실제 인증서 발급
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $email \
    --agree-tos \
    --no-eff-email \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Nginx 재시작
docker compose restart nginx
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
docker compose run --rm certbot renew --dry-run

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

- ⚠️ Let's Encrypt 인증서는 현재 **90일** 유효이며 2028-02까지 45일로 줄어듭니다 → 자동 갱신 필수, 고정 주기 대신 ARI 지원 클라이언트 사용 ([TLS와 인증서](../../Network/tls.md#인증서-유효-기간이-짧아지고-있다))
- ⚠️ 발급 한도: 등록 도메인당 7일에 50개, 동일 조합 중복 7일에 5개, 인증 실패 1시간에 5번 (staging으로 테스트)
- ⚠️ 와일드카드 인증서는 DNS 챌린지 필요
- ⚠️ 처음 발급 시 80 포트 반드시 열려있어야 함

---

## 요약

```
개발/테스트 → 방법 1 (Certbot 직접)
단일 서버 운영 → 방법 2 (Docker + Certbot)
멀티 서비스 운영 → 방법 3 (nginx-proxy + acme-companion) ⭐
```

## 참고 자료

- [Let's Encrypt: Challenge Types](https://letsencrypt.org/docs/challenge-types/) - HTTP-01·DNS-01·TLS-ALPN-01의 방식, 포트, 와일드카드 지원, 장단점
- [Let's Encrypt: Rate Limits](https://letsencrypt.org/docs/rate-limits/) - 도메인당 50개/7일, 중복 5개/7일, 인증 실패 5번/시간, 스테이징 권장
- [Certbot 사용 문서](https://eff-certbot.readthedocs.io/en/stable/using.html) - 자동 갱신 작업, 4.0.0의 갱신 시점(수명 1/3), `--deploy-hook`·`--post-hook`, `--dry-run`, `live/` 파일 구성

확인일: 2026-10-22 (챌린지 특성, 발급 한도, Certbot 갱신 시점·훅·파일 구성. 심볼릭 링크 구조, "갱신 후 Nginx reload가 필요한 이유"는 일반 개념, Docker·nginx-proxy 방식과 아래 스크립트는 미확인. 한도 수치는 6개월 후 재확인 대상)
