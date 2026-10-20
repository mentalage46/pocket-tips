# 릴리스·의존성 자동화

1인 개발에서 가장 먼저 밀리는 일이 **버전 올리기, 변경 기록(CHANGELOG) 작성, 의존성 업데이트**입니다. 커밋 규칙만 정해 두면 이 세 가지를 CI가 대신할 수 있습니다.

## Conventional Commits

커밋 메시지 형식을 정해 도구가 버전 변경 폭을 판단하게 합니다(명세 v1.0.0).

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

| 커밋 | 시맨틱 버전 변화 | 예 |
| --- | --- | --- |
| `fix:` | PATCH (1.2.3 → 1.2.4) | `fix(auth): 토큰 만료 시 무한 리다이렉트 수정` |
| `feat:` | MINOR (1.2.3 → 1.3.0) | `feat: CSV 내보내기 추가` |
| `!` 또는 `BREAKING CHANGE:` 푸터 | MAJOR (1.2.3 → 2.0.0) | `feat(api)!: v1 엔드포인트 제거` |
| `docs:`, `chore:`, `ci:`, `refactor:` 등 | 변화 없음(도구 설정에 따라 다름) | `ci: 캐시 키 수정` |

`BREAKING CHANGE`는 타입과 관계없이 MAJOR입니다. 커밋 메시지 검사는 commitlint + [Husky](../../Utility/huskey.md)로 로컬에서 걸 수 있습니다.

PR을 squash merge한다면 PR 제목만 규칙에 맞추면 됩니다. 개별 커밋까지 강제할 필요가 없어 1인 개발에 부담이 적습니다(경험칙).

## 릴리스 도구 비교

| 도구 | 동작 방식 | 잘 맞는 상황 | 확인 시점 버전 |
| --- | --- | --- | --- |
| release-please | 커밋을 모아 **릴리스 PR**을 계속 갱신, 그 PR을 머지하면 태그·GitHub Release 생성 | 릴리스 시점을 사람이 정하고 싶을 때. 언어 무관 | action v5 |
| semantic-release | main에 푸시될 때마다 **즉시** 버전 결정·태그·배포 | 완전 자동 배포, npm 패키지 | v25 (Node `^22.14.0 \|\| >=24.10.0`) |
| Changesets | PR마다 변경 설명 파일(`.changeset/*.md`)을 추가, 모아서 버전 PR 생성 | 모노레포, 여러 패키지를 따로 버전 관리 | `@changesets/cli` 3.x, action v2 |

1인 개발의 기본값으로는 release-please를 권합니다. 커밋 규칙만 지키면 되고, 릴리스 PR이 "다음 버전에 들어갈 변경 목록"을 보여 주므로 배포 전 검토가 쉽습니다(경험칙).

### release-please 예시

```yaml
# .github/workflows/release-please.yml
name: release-please

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.release.outputs.release_created }}
      tag: ${{ steps.release.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@v5
        id: release
        with:
          release-type: node # package.json 버전 갱신. 언어 무관이면 simple

  deploy:
    needs: release-please
    if: needs.release-please.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "배포할 태그 ${{ needs.release-please.outputs.tag }}"
```

```text
feat/fix 커밋이 main에 쌓임
  → release-please가 "chore(main): release 1.3.0" PR을 생성·갱신 (CHANGELOG 포함)
  → 그 PR을 머지
  → 태그 v1.3.0 + GitHub Release 생성 → deploy 잡 실행
```

- 릴리스 PR을 만들려면 저장소 Settings → Actions → General의 "Allow GitHub Actions to create and approve pull requests"를 켜야 할 수 있습니다.
- `GITHUB_TOKEN`이 일으킨 이벤트는 새 워크플로 실행을 만들지 않습니다(`workflow_dispatch`·`repository_dispatch` 예외). 그래서 release-please가 만든 태그로는 다른 워크플로가 시작되지 않으므로, 위 예시처럼 같은 워크플로 안에서 출력값으로 배포 잡을 이어 붙입니다.
- 여러 패키지가 있으면 `release-please-config.json`과 `.release-please-manifest.json`으로 설정합니다.

## 의존성 자동 업데이트

| 항목 | Dependabot | Renovate |
| --- | --- | --- |
| 제공 | GitHub 내장 | Mend Renovate 앱(Community Cloud 무료, 공개·비공개 저장소 무제한) 또는 자체 실행 |
| 설정 파일 | `.github/dependabot.yml` | `renovate.json` (온보딩 PR이 자동 생성) |
| 지원 플랫폼 | GitHub | GitHub, GitLab, Bitbucket, Gitea·Forgejo 등 |
| 그룹화 | `groups:` | `packageRules`, 프리셋 |
| 장점 | 설정이 짧고 보안 알림과 연동 | 규칙이 세밀하고 자동 머지·스케줄 설정이 풍부 |

GitHub만 쓰는 1인 개발이라면 Dependabot으로 시작하고, PR이 너무 많아지면 그룹화를 먼저 적용합니다. 규칙이 더 필요해지면 Renovate로 옮깁니다(경험칙).

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      minor-and-patch: # minor·patch는 PR 하나로 묶음
        update-types: ["minor", "patch"]

  - package-ecosystem: "github-actions" # 워크플로의 액션 버전도 갱신
    directory: "/"
    schedule:
      interval: "monthly"
```

- `schedule.interval` 값: `daily`, `weekly`, `monthly`, `quarterly`, `semiannually`, `yearly`, `cron`
- `cooldown:`을 설정하지 않으면 새 버전이 나온 뒤 기본 3일을 기다립니다. 막 배포된 악성 버전을 피하는 데 도움이 됩니다.
- 자동 머지를 켠다면 테스트가 충분할 때만, patch 업데이트에 한정하는 편이 안전합니다(경험칙).

## 점검표

| 질문 |
| --- |
| 커밋 또는 PR 제목이 Conventional Commits 형식인가 |
| 버전·태그·CHANGELOG를 손으로 만들지 않는가 |
| 릴리스 태그가 운영 배포 트리거와 연결되어 있는가 |
| 의존성 업데이트 PR이 CI를 통과해야 머지되는가 |
| 액션 버전도 Dependabot·Renovate가 관리하는가 |

## 참고 자료

- [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token) - 워크플로 재귀 실행 방지
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [release-please-action](https://github.com/googleapis/release-please-action) - 확인 시점 최신 v5.0.0(README 예시는 아직 `@v4`), 권한·출력 이름·PR 생성 설정
- [semantic-release releases](https://github.com/semantic-release/semantic-release/releases) - v25 Node 요구 사항
- [Changesets](https://github.com/changesets/changesets), [changesets/action](https://github.com/changesets/action)
- [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference), [dependabot.yml 개요](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file)
- [Renovate 설정 파일](https://docs.renovatebot.com/configuration-options/), [온보딩](https://docs.renovatebot.com/getting-started/installing-onboarding/), [Mend 호스팅 앱](https://docs.renovatebot.com/mend-hosted/overview/)

확인일: 2026-10-20 (명세 규칙, 도구 버전·Node 요구 사항, Dependabot·Renovate 설정 키, release-please 권한·출력, GITHUB_TOKEN 트리거 제한)

관련: [Husky](../../Utility/huskey.md), [파이프라인 보안](./pipeline-security.md)

다음: [GitHub Actions 실전 예시](./github-action.md)
