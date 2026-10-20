# 1인·소규모 팀을 위한 CI/CD 도구 선택

혼자 또는 몇 명이 운영할 때는 **관리할 것이 적은 도구**가 가장 좋은 도구입니다. 이 문서는 CI 서비스, 배포 대상, 보조 도구를 비용과 운영 부담 기준으로 정리합니다.

> 무료 한도와 가격은 자주 바뀝니다. 아래 수치는 확인일(2026-10-20) 기준이며, 도입 전에 각 서비스의 가격 페이지를 다시 확인합니다.

## 먼저 정할 것

```text
1. 코드를 어디에 두는가?        → GitHub / GitLab / Bitbucket / 자체 호스팅(Gitea·Forgejo)
2. 무엇을 배포하는가?           → 정적 사이트 / 서버리스·풀스택 웹 / 컨테이너 / 모바일
3. 서버를 직접 관리할 의향이 있는가? → 관리형 플랫폼 / VPS + 자체 호스팅 PaaS
4. 상업용인가?                   → 무료 플랜의 상업 이용 제한 확인
```

CI는 보통 **코드 저장소에 붙어 있는 것**을 쓰는 것이 가장 단순합니다. 저장소와 CI가 다르면 권한·웹훅·상태 표시 연동을 따로 관리해야 합니다.

## CI 서비스 비교

| 서비스 | 무료 한도(비공개 저장소) | 공개 저장소 | 특징 |
| --- | --- | --- | --- |
| GitHub Actions | Free: 월 2,000분, 아티팩트 500MB | 표준 호스티드 러너 무료 | Marketplace 액션이 가장 많음. 1인 개발의 사실상 기본값 |
| GitLab CI/CD | 월 400 컴퓨트 분, 프로젝트당 10GiB | - | 비공개 최상위 그룹은 무료 사용자 5명 제한 |
| CircleCI | 월 30,000 크레딧(소형 Docker 기준 최대 약 6,000분) | - | 활성 사용자 5명. 크레딧은 리소스 크기에 따라 차감 |
| Bitbucket Pipelines | 월 50분 | - | 사용자 5명. Jira 연동이 필요할 때 |
| Buildkite | 월 2,000 Linux vCPU 분(호스티드), 자체 러너 동시 10잡 | - | 사용자 5명. 에이전트를 직접 운영하는 방식이 중심 |

### GitHub Actions 비용 감각

| 러너 | 분당 가격(초과 시) |
| --- | --- |
| Linux 2코어 x64 | $0.006 |
| Linux 2코어 arm64 | $0.005 |
| Windows 2코어 | $0.010 |
| macOS 3·4코어 | $0.062 |

- 2026-01-01부로 호스티드 러너 가격이 최대 39% 인하되었고, 무료 제공 분은 그대로입니다.
- 공개 저장소는 arm64 Linux 러너(`ubuntu-24.04-arm` 등)도 무료입니다.
- 자체 호스팅 러너는 현재 무료입니다. 2025-12에 분당 $0.002 과금이 예고되었다가 **연기**되었고, 새 일정은 발표되지 않았습니다.
- macOS 러너는 Linux보다 약 10배 비쌉니다. iOS 빌드가 있다면 macOS 잡을 최소화하거나 태그 푸시 때만 실행합니다.

## 자체 호스팅 CI

저장소까지 직접 운영하거나, 홈서버·VPS의 남는 자원을 쓰고 싶을 때 선택합니다.

| 도구 | 성격 | 설정 파일 | 비고 |
| --- | --- | --- | --- |
| Woodpecker CI | Drone 0.8에서 갈라져 나온 경량 CI | `.woodpecker/*.yaml` 또는 `.woodpecker.yaml` | Apache-2.0, 3.x. 컨테이너 기반, 가벼움 |
| Gitea Actions | Gitea 내장 CI, GitHub Actions와 "대부분 호환" | `.gitea/workflows/` | 러너 이름이 act_runner에서 **Gitea Runner**(`gitea-runner`)로 바뀜 |
| Forgejo Actions | Forgejo 내장 CI | `.forgejo/workflows/` (없으면 `.github/workflows/`) | GitHub Actions와 호환을 **목표로 하지 않음**. 보통 약간의 수정 필요. 러너는 `forgejo-runner` |
| Harness Open Source | Drone의 후속(구 Gitness). 코드 호스팅 + CI/CD 통합 | - | `github.com/drone/drone`이 이 저장소로 이동 |
| Jenkins | 가장 오래된 범용 CI 서버 | `Jenkinsfile` | 플러그인 관리 부담이 큼. Java 21 또는 25 필요(Java 17 지원 종료) |

Codeberg(Forgejo 기반 비영리 호스팅)는 Woodpecker(신청·검토 후 사용)와 Forgejo Actions(제한적 오픈 알파)를 제공합니다.

1인 개발이라면 Jenkins는 권하지 않습니다. 플러그인 업데이트와 보안 패치가 곧 또 하나의 운영 업무가 됩니다(경험칙).

## 배포 대상 비교

### 관리형 플랫폼(git push로 배포)

| 플랫폼 | 무료 플랜 | 주의점 | 잘 맞는 것 |
| --- | --- | --- | --- |
| Vercel (Hobby) | 무료, 프리뷰 배포 포함. 월 데이터 전송 100GB, 함수 호출 100만 회 | **비상업 개인 용도만**. 광고·결제·제휴 사이트도 상업으로 봄. 상업은 Pro($20/개발자/월) | Next.js 등 프런트엔드·풀스택 |
| Netlify (Free) | 월 300 크레딧. 운영 배포 1회 15크레딧, 대역폭 GB당 20크레딧, 프리뷰 배포는 0 | 크레딧 소진 시 **모든 사이트 일시 중지**, 무료 플랜은 추가 구매 불가. 2025-09-04 이후 가입자 기준 | 정적 사이트, JAMstack |
| Cloudflare Workers / Pages | Workers 무료: 하루 10만 요청, 정적 자산 요청은 무제한 무료. Pages 무료: 월 500빌드 | Cloudflare가 새 프로젝트는 Workers로 시작하라고 안내. Workers는 Cloudflare 네임서버 도메인만 지원 | 정적 사이트, 엣지 함수 |
| GitHub Pages | 사이트 1GB, 대역폭 월 100GB(소프트 한도) | 온라인 비즈니스·상업 SaaS 용도 금지 | 문서, 블로그, 포트폴리오 |
| Render (Free) | 웹 서비스 월 750 인스턴스 시간 | 15분 무요청 시 슬립(재시작 약 1분). 무료 Postgres는 30일 후 만료. 운영 용도 비권장 | 백엔드 프로토타입 |
| Railway | 체험 $5 크레딧(30일), 이후 Free는 월 $1 크레딧 | Hobby $5/월(사용량 $5 포함) | 컨테이너·DB를 빠르게 묶어 배포 |
| Fly.io | 신규 조직은 무료 한도 없음, 사용량 과금 | 가장 작은 머신(shared-cpu-1x, 256MB) 30일 약 $2.19 | 여러 리전에 컨테이너 배포 |
| Heroku | 무료 다이노 없음(2022-11 종료) | Eco $5/월(슬립 있음), Basic $7/월 | 기존 Heroku 생태계 |

### VPS + 자체 호스팅 PaaS

월 몇 달러짜리 VPS 한 대에 여러 앱을 올리고 싶을 때 씁니다. 대부분 Docker 기반이며 Git 푸시 또는 이미지 푸시로 배포하고, HTTPS 인증서를 자동으로 발급합니다.

| 도구 | 방식 | 라이선스·버전 | 특징 |
| --- | --- | --- | --- |
| Coolify | 웹 UI PaaS, Vercel·Heroku·Netlify 대안 | Apache-2.0, v4 | 원클릭 서비스 360개 이상. 자체 호스팅 무료, Cloud는 서버 2대 $5/월 |
| Dokploy | 웹 UI PaaS, Docker + Traefik | Apache-2.0(일부 디렉터리 별도), 0.x | Docker Compose 지원. RAM 2GB, 디스크 30GB 이상 필요 |
| CapRover | 웹 UI PaaS, Docker + nginx | Apache-2.0 + 부속 조항 | 와일드카드 DNS 필요. RAM 1GB 권장 |
| Dokku | CLI 기반 미니 Heroku, `git push dokku main` | MIT, 0.38.x | Dockerfile 또는 Buildpacks. RAM 1GB |
| Kamal | 서버에 상주 UI 없이 로컬 CLI가 SSH로 배포 | MIT, 2.x | kamal-proxy로 무중단 교체. `config/deploy.yml` 하나로 관리 |

```bash
# Kamal 기본 흐름
gem install kamal
kamal init        # config/deploy.yml 생성
kamal setup       # 서버에 Docker 설치, 이미지 빌드·푸시, /up 응답 확인 후 트래픽 전환
kamal deploy      # 이후 배포
kamal rollback <version>  # 서버에 남은 이전 이미지로 되돌리기
```

> Watchtower(`containrrr/watchtower`, 실행 중인 컨테이너를 새 이미지로 자동 교체)는 2025-12에 유지보수 종료가 공지되고 저장소가 보관(archive) 처리되었습니다. 새로 도입하지 않습니다.

### 선택 기준

| 상황 | 권장 |
| --- | --- |
| 정적 사이트·문서 | GitHub Pages 또는 Cloudflare. 비용 0, 운영 부담 거의 없음 |
| 개인 프런트엔드·풀스택(비상업) | Vercel Hobby 또는 Netlify Free |
| 수익이 나는 서비스 | 관리형 유료 플랜(월 $5~20) 또는 VPS + PaaS. 무료 플랜의 상업 이용 제한을 먼저 확인 |
| 백엔드 + DB 여러 개, 고정 비용 선호 | VPS + Coolify·Dokploy(UI 선호) 또는 Kamal·Dokku(CLI 선호) |
| 서버 관리를 전혀 하기 싫음 | Railway, Render, Fly.io 같은 관리형 컨테이너 플랫폼 |

## 이미지 레지스트리

| 레지스트리 | 무료 범위 | 비고 |
| --- | --- | --- |
| GHCR (`ghcr.io`) | 공개 패키지 무료. 비공개는 Free 기준 저장 500MB, 전송 월 1GB | Actions에서 `GITHUB_TOKEN` + `packages: write`로 푸시. 별도 시크릿 불필요 |
| Docker Hub (Personal) | 비공개 저장소 1개. 풀 한도는 6시간당 비로그인 100회, 로그인 200회(문서 기준) | 가격 페이지와 문서의 표기가 달라 확인 필요 |
| GitLab Container Registry | 프로젝트 저장 용량에 포함 | GitLab CI와 함께 쓸 때 |

## 로컬·보조 도구

| 도구 | 용도 | 비고 |
| --- | --- | --- |
| [act](https://nektosact.com) | GitHub Actions 워크플로를 로컬 Docker에서 실행 | `act`, `act pull_request`, `act -j test`. `concurrency`, `permissions`, `environment`, OIDC 등은 미지원 |
| Dagger | 파이프라인을 Go·Python·TypeScript 등 코드로 작성, 로컬과 CI에서 동일 실행 | 0.x. CI 서비스 종속을 줄이고 싶을 때 |
| Makefile·npm scripts | CI와 로컬에서 같은 명령 실행 | 가장 단순한 이식성 확보 방법. [Makefile](../../Utility/makefile.md) 참고 |
| Dependabot·Renovate | 의존성 업데이트 PR 자동 생성 | [릴리스·의존성 자동화](./release-automation.md) 참고 |

```bash
# act 설치와 실행
brew install act                                   # 또는 gh extension install https://github.com/nektos/gh-act
act -l                                             # 워크플로·잡 목록
act pull_request -j test --secret-file .secrets    # PR 이벤트로 test 잡만 실행
```

## 성장 단계별 추천 조합

1인 개발자가 처음부터 모든 것을 갖출 필요는 없습니다. 아래는 규모에 따라 단계를 올리는 예시입니다(경험칙).

| 단계 | CI | 배포 | 추가할 것 |
| --- | --- | --- | --- |
| 0. 아이디어 검증 | 없음 또는 린트·빌드만 | Vercel·Netlify·Cloudflare의 Git 연동(자체 빌드) | 프리뷰 URL로 확인 |
| 1. 첫 사용자 | GitHub Actions: PR마다 린트·테스트 | 관리형 플랫폼 자동 배포 | 브랜치 보호(main은 CI 통과 필수) |
| 2. 백엔드·DB 추가 | + Docker 이미지 빌드 → GHCR | VPS + Kamal 또는 Coolify | 헬스체크, 이전 이미지 보관, DB 백업 |
| 3. 유료 고객 | + 스테이징 환경, 배포 후 스모크 테스트 | 운영 배포에 environment 보호 | 알림, Dependabot, 릴리스 자동화, OIDC |

## 예시: GitHub Actions → GHCR → VPS(Docker Compose)

1인 개발에서 가장 흔한 구성입니다. PR에서는 테스트만, main 머지 시 이미지를 만들어 서버에 배포합니다.

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  pull_request:
  push:
    branches: [main]

# PR은 새 커밋이 오면 이전 실행 취소, main 배포는 중간에 끊지 않음
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build:
    if: github.event_name == 'push'
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write # GHCR 푸시
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          # 이미지 이름은 소문자여야 함. 저장소 이름에 대문자가 있으면 직접 적음
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: appleboy/ssh-action@v1
        env:
          IMAGE_TAG: ${{ github.sha }}
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            cd /app
            echo "IMAGE_TAG=$IMAGE_TAG" > .env.deploy
            docker compose --env-file .env.deploy pull
            docker compose --env-file .env.deploy up -d
            curl -fsS --retry 10 --retry-delay 3 --retry-all-errors http://localhost:3000/health
            docker image prune -f
```

```yaml
# 서버의 /app/compose.yaml
services:
  app:
    image: ghcr.io/<owner>/<repo>:${IMAGE_TAG:?IMAGE_TAG is required}
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000" # 앞단 Nginx·Caddy가 HTTPS 처리
    env_file: .env # 운영 비밀값은 서버에만 둠
```

| 포인트 | 이유 |
| --- | --- |
| 이미지 태그를 커밋 SHA로 | 롤백 시 `IMAGE_TAG=<이전 SHA>`로 다시 `up -d` 하면 됩니다 |
| `GITHUB_TOKEN`으로 GHCR 푸시 | 레지스트리용 시크릿을 따로 만들 필요가 없습니다 |
| 잡별 `permissions` | 푸시 권한은 build 잡에만 줍니다 |
| `environment: production` | 운영 서버 시크릿을 이 환경에만 등록합니다 |
| 배포 후 헬스체크 | 실패하면 잡이 실패로 끝나 알림을 받습니다 |

- 비공개 이미지라면 서버에서도 `docker login ghcr.io`가 필요합니다. `read:packages` 권한만 있는 토큰을 씁니다.
- 액션은 메이저 태그(`@v7`)로 적었습니다. 운영 저장소에서는 커밋 SHA 고정을 검토합니다. [파이프라인 보안](./pipeline-security.md) 참고.
- 액션 메이저 버전은 확인일 기준 최신입니다. 기존 [GitHub Actions](./github-action.md) 문서의 예시는 이전 버전을 쓰고 있습니다.

## 점검표

| 질문 |
| --- |
| 무료 플랜의 상업 이용 제한을 확인했는가 |
| 무료 한도 초과 시 동작(과금, 일시 중지, 슬립)을 알고 있는가 |
| CI가 코드 저장소와 같은 플랫폼에 있는가 |
| 배포 도구가 이전 버전으로 되돌리는 방법을 제공하는가 |
| 자체 호스팅 도구의 업데이트·백업을 누가 언제 하는지 정했는가 |

## 참고 자료

CI 서비스

- [GitHub Actions 과금](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [러너 가격](https://docs.github.com/en/billing/reference/actions-runner-pricing), [2026 가격 변경 공지](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/), [호스티드 러너(arm64)](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitLab 가격](https://about.gitlab.com/pricing/), [GitLab 컴퓨트 분](https://docs.gitlab.com/ci/pipelines/compute_minutes/)
- [CircleCI 가격](https://circleci.com/pricing/), [Bitbucket Pipelines 한도](https://support.atlassian.com/bitbucket-cloud/docs/limitations-of-bitbucket-pipelines/), [Buildkite 가격](https://buildkite.com/pricing/)
- [Woodpecker CI](https://woodpecker-ci.org/about), [Gitea Actions](https://docs.gitea.com/usage/actions/overview), [Gitea Actions 빠른 시작](https://docs.gitea.com/usage/actions/quickstart), [Forgejo Actions](https://forgejo.org/docs/latest/user/actions/overview/), [Codeberg CI](https://docs.codeberg.org/ci/), [Harness Open Source](https://github.com/harness/harness)
- [Jenkins Java 지원 정책](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)

배포 대상

- [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel 공정 사용 지침](https://vercel.com/docs/limits/fair-use-guidelines)
- [Netlify 가격](https://www.netlify.com/pricing/), [Netlify 크레딧 동작](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- [Cloudflare Workers 한도](https://developers.cloudflare.com/workers/platform/limits/), [Pages 한도](https://developers.cloudflare.com/pages/platform/limits/), [Pages → Workers 이전 가이드](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [GitHub Pages 한도](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Render Free](https://render.com/docs/free), [Railway 플랜](https://docs.railway.com/reference/pricing/plans), [Fly.io 가격](https://docs.fly.io/about/pricing), [Heroku 가격](https://www.heroku.com/pricing/)
- [Coolify](https://github.com/coollabsio/coolify), [Dokploy](https://docs.dokploy.com/docs/core/installation), [CapRover](https://caprover.com/docs/get-started.html), [Dokku](https://dokku.com/docs/getting-started/installation/), [Kamal](https://kamal-deploy.org/docs/upgrading/overview/), [Watchtower 종료 공지](https://github.com/containrrr/watchtower/discussions/2135)

레지스트리·도구

- [GitHub Packages 과금](https://docs.github.com/en/billing/concepts/product-billing/github-packages), [Docker 이미지 게시 튜토리얼](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Docker Hub 풀 한도](https://docs.docker.com/docker-hub/usage/pulls/)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)
- [act 사용법](https://nektosact.com/usage/index.html), [act 미지원 기능](https://nektosact.com/not_supported.html), [Dagger](https://docs.dagger.io/)

확인일: 2026-10-20 (가격·무료 한도·버전·도구 상태 항목. 6개월 후 재확인 대상)

관련: [GitHub Actions](./github-action.md), [Docker Compose](../docker/docker-compose.md), [SSL 자동화](../nginx/ssl.md)

다음: [릴리스·의존성 자동화](./release-automation.md)
