# 브랜치 전략과 커밋 규칙

> 혼자 또는 작은 팀이 **브랜치를 어떻게 쓰고, 커밋을 어떻게 남길지** 정하는 기준

명령어가 아니라 **규칙**에 관한 문서입니다. 명령의 동작은 [Git 기본 모델](./basics.md), 리뷰 방식은 [Code Review](../../Quality/code-review.md), 릴리스 자동화는 [릴리스 자동화](../../Infrastructure/cicd/release-automation.md)를 참고합니다.

---

## 개념: 브랜치 전략은 "얼마나 자주, 얼마나 크게 합치는가"의 선택이다

브랜치는 값이 싸지만, **오래 갈라져 있을수록 합칠 때 비용이 커집니다.** 두 브랜치가 서로 모르는 채 달라진 양만큼 충돌과 통합 버그가 쌓이기 때문입니다. 대부분의 전략은 이 비용과 **배포 방식**(지속 배포인가, 버전을 정해 릴리스하는가) 사이의 타협입니다.

| 전략 | 핵심 | 장기 브랜치 | 적합한 경우 |
| --- | --- | --- | --- |
| **Trunk-based** | 모두가 하나의 `trunk`(`main`)에 **자주** 합침 | 없음 | 지속 배포, CI가 잘 갖춰진 팀 |
| **GitHub flow** | `main`은 항상 배포 가능, **기능별 짧은 브랜치 → PR → 머지 → 배포** | `main` 하나 | 웹 서비스, 소규모 팀 (대부분의 경우) |
| **GitFlow** | `main` + `develop` + feature / release / hotfix 브랜치 | `main`, `develop` | **버전을 정해 릴리스**하고 여러 버전을 유지보수하는 소프트웨어 |

### Trunk-based development

정의: **개발자들이 `trunk`라는 하나의 브랜치에서 협업**하는 브랜칭 모델입니다. 오래 사는 브랜치를 피하고, 병합 문제와 빌드 깨짐을 막는 기법을 함께 씁니다.

- 기능 브랜치를 쓰더라도 **짧게** 살고 리뷰와 CI 확인용으로만 씁니다.
- 아직 완성되지 않은 기능은 **기능 플래그(feature flag)** 로 코드는 합치되 사용자에게는 감춥니다. 배포 시점과 기능 공개 시점을 분리하는 수단입니다.
- 사이트는 "모든 팀원이 **최소 24시간에 한 번 trunk에 커밋**"하는 것을 CI의 핵심 요건으로 제시하며, 이 방식을 지속적 통합(CI)의 핵심 enabler로 설명합니다.
- 기능 플래그와 CI가 없으면 미완성 코드가 그대로 배포되므로 **자동 테스트가 전제**입니다.

### GitHub flow

`main`은 **항상 배포 가능한 상태**로 두고, 작업마다 `main`에서 브랜치를 따서 → PR → 리뷰 → `main`에 병합 → 배포합니다. 장기 브랜치가 `main` 하나뿐이라 단순합니다. 이 저장소처럼 **혼자 또는 소수가 쓰는 프로젝트**에는 대개 이것으로 충분합니다.

### GitFlow가 맞는 곳과 아닌 곳

GitFlow는 `main`(릴리스된 코드), `develop`(다음 릴리스를 위한 통합), `feature`(`develop`에서 분기), `release`(릴리스 준비, `main`과 `develop`에 병합), `hotfix`(`main`에서 분기, 둘 다에 병합) 브랜치로 구성됩니다.

중요한 점은 **제안자 본인의 평가**입니다. Vincent Driessen은 2020년 회고에서, 이 모델은 약 10년 전에 **버전을 명시해 배포하는 소프트웨어**를 위해 만든 것이며 "웹 앱은 보통 지속적으로 배포되고 롤백하지 않는다"고 쓰고, **지속 배포를 하는 팀에는 훨씬 단순한 흐름(GitHub flow 같은)을 권했습니다.** GitFlow를 그런 팀에 억지로 끼워 맞추지 말라는 뜻입니다.

> 선택 기준: **언제든 배포하는 서비스**면 GitHub flow(또는 trunk-based), **번호가 붙은 버전을 여러 개 동시에 지원**해야 하면 GitFlow류(릴리스/핫픽스 브랜치)가 의미 있습니다.

### 브랜치 이름과 수명

- 이름은 **목적이 드러나게**: `feature/login`, `fix/null-user`, `docs/git-guide`, `chore/update-deps`.
- 브랜치는 **작게, 짧게**. 하루~며칠 안에 합칠 수 있는 크기로 쪼갭니다(trunk-based 사이트는 시간 한계를 명시하지 않으며, 며칠이라는 기준은 경험칙입니다). 작은 변경이 리뷰에도 유리한 이유는 [Code Review](../../Quality/code-review.md#작은-변경이-리뷰를-살린다)를 참고합니다.
- 합쳐진 브랜치는 **삭제**합니다.
- 오래 걸리는 브랜치는 정기적으로 `main`을 가져와(merge 또는 [rebase](./rebase.md)) 갈라진 거리를 줄입니다.

---

## GitHub PR의 세 가지 merge 방식

같은 PR도 **어떻게 합치느냐**에 따라 `main`의 이력이 달라집니다([Git 기본 모델의 merge 모양](./basics.md#합치기-merge의-세-가지-모양)과 대응).

| 방식 | GitHub 문서의 설명 | `main` 이력 |
| --- | --- | --- |
| **Create a merge commit** | PR 브랜치의 **모든 커밋을 보존**하고 명시적인 병합 지점을 추가 (`--no-ff`) | 갈라졌다 합쳐진 모양 |
| **Squash and merge** | PR의 모든 커밋을 **하나의 커밋으로** 합쳐 `main`에 추가 | 직선, PR당 커밋 1개 |
| **Rebase and merge** | 각 커밋을 병합 커밋 없이 **개별로** `main`에 추가 (선형 이력) | 직선, 커밋 여러 개. **committer 정보가 바뀌고 새 SHA가 생김** |

- **Squash**는 PR 중간의 "오타 수정", "리뷰 반영" 같은 잡음 커밋을 없애고 **PR 하나 = 커밋 하나**로 `main`을 읽기 쉽게 만듭니다. 대신 개별 커밋 단위의 `bisect`·`revert`는 PR 단위로 거칠어지고, GitHub 문서도 **"squash merge는 단명 브랜치에 가장 잘 맞는다"** 고 합니다. 같은 브랜치에서 작업을 이어 가면 이미 squash된 커밋이 다음 PR에 다시 들어와 충돌이 늘 수 있으므로, 장기 브랜치는 merge commit을 쓰거나 다음 PR 전에 rebase하라고 안내합니다.
- **Merge commit**은 가장 정직하지만(실제 이력 보존) 병합 커밋이 쌓입니다.
- **Rebase and merge**는 선형 이력과 개별 커밋을 모두 얻지만, SHA가 바뀌어 로컬 브랜치와 원격 이력이 어긋납니다.

**어떤 것을 기본으로?** 팀에서 하나로 정하는 것이 중요합니다. 혼자/소규모에서 PR이 작고 짧다면 **Squash**가 가장 단순하고, 개별 커밋을 의미 있게 정리해 둔다면 Rebase나 Merge commit이 맞습니다. 저장소 설정에서 허용하는 방식을 제한해 일관성을 강제할 수 있습니다.

---

## 커밋 메시지: Conventional Commits

커밋 메시지는 **미래의 나와 리뷰어, 그리고 도구**가 읽습니다. Conventional Commits 1.0.0은 형식을 정합니다.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

```
feat(auth): add refresh token rotation

액세스 토큰 재발급 시 refresh token을 교체하고, 재사용이 감지되면 해당 계열을 폐기한다.

Closes #42
```

### SemVer와의 연결

| 커밋 | 릴리스 | 근거 |
| --- | --- | --- |
| `fix:` | **PATCH** | 버그 수정 |
| `feat:` | **MINOR** | 기능 추가 |
| `!`를 `:` 앞에 붙임(`feat!:`) 또는 푸터 `BREAKING CHANGE:` | **MAJOR** | 호환성을 깨는 변경. **어떤 타입에도** 붙일 수 있음 |

- `feat`와 `fix` 외의 타입(`build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`)은 **명세가 요구하지 않는 선택 사항**입니다. 위 이름들은 예시이고, 호환성을 깨는 변경이 아니면 릴리스 번호에 영향이 없습니다.
- 명세의 필수 규칙은 조건부입니다: **기능을 추가하는 커밋은 `feat`, 버그를 고치는 커밋은 `fix`를 써야** 한다는 것이지, 모든 커밋이 둘 중 하나여야 한다는 뜻이 아닙니다.
- 이 규칙 덕분에 도구가 커밋 이력에서 **다음 버전 번호와 CHANGELOG를 자동 생성**할 수 있습니다([릴리스 자동화](../../Infrastructure/cicd/release-automation.md)). 형식을 강제하려면 `commitlint`를 [Husky](../../Utility/huskey.md)의 `commit-msg` hook에 겁니다.

### 좋은 커밋의 습관

| 습관 | 이유 |
| --- | --- |
| **하나의 논리적 변경 = 하나의 커밋** | 되돌리기(`revert`)·`bisect`·`cherry-pick`이 쉬워짐 |
| 제목은 **무엇을**, 본문은 **왜** | 코드가 보여 주는 "무엇"을 반복하지 말고 이유를 남김 |
| 리팩터링과 기능 변경을 **분리** | 리뷰어가 의미 있는 변경을 가려내기 쉬움 |
| 깨진 상태로 커밋하지 않기 | 모든 커밋이 빌드·테스트를 통과해야 `bisect`가 신뢰할 수 있음 |
| 공유 전에 `rebase -i`로 정리 | "wip", "fix typo" 같은 잡음 제거 ([rebase](./rebase.md)) |

### 이 저장소의 예

이 저장소의 커밋은 `docs:`, `refactor(docs):`, `chore:` 같은 Conventional Commits 형식을 따릅니다(`git log --oneline` 참고). `docs(security): ...`처럼 `scope`로 영향 범위를 적습니다.

---

## 🎯 체크리스트

- [ ] 배포 방식에 맞는 전략 선택 (지속 배포 → GitHub flow / trunk-based, 버전 릴리스 → GitFlow류)
- [ ] `main`은 항상 배포 가능하게 유지, 보호 브랜치와 CI 필수 통과
- [ ] 브랜치는 작게, 짧게, 합친 뒤 삭제
- [ ] PR의 merge 방식을 팀에서 하나로 정함 (Squash / Rebase / Merge commit)
- [ ] 커밋은 Conventional Commits (`feat`, `fix`, `!` / `BREAKING CHANGE`)
- [ ] 한 커밋 = 한 논리적 변경, 제목은 무엇을, 본문은 왜
- [ ] 공유 전 잡음 커밋 정리, 이미 공유한 이력은 다시 쓰지 않음

## 참고 자료

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) - 메시지 구조, `fix`→PATCH, `feat`→MINOR, `!`·`BREAKING CHANGE`→MAJOR, 그 밖의 타입은 선택
- [A successful Git branching model (Vincent Driessen)](https://nvie.com/posts/a-successful-git-branching-model/) - GitFlow의 브랜치 구성과 2020년 회고(지속 배포 팀에는 단순한 흐름 권장)
- [Trunk Based Development](https://trunkbaseddevelopment.com/) - 정의, 짧은 기능 브랜치, 기능 플래그, 24시간 내 커밋 요건
- [GitHub Docs: About pull request merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges) - 세 가지 merge 방식, rebase 시 새 SHA, squash와 단명 브랜치

확인일: 2026-10-23 (Conventional Commits 1.0.0, nvie.com 회고, trunkbaseddevelopment.com, GitHub Docs에서 확인한 내용. 전략 비교 표의 "적합한 경우", 브랜치 이름 예시, "하루~며칠" 크기 기준, 어떤 merge 방식을 기본으로 할지에 대한 의견, 좋은 커밋의 습관 표는 경험칙·의견이며 출처에서 확인한 것이 아님. GitHub flow의 공식 정의 문서와 저장소 설정으로 merge 방식을 제한하는 방법은 이번에 열어 보지 않아 미확인. `bisect`는 [Git 팁](./tips.md#4-git-bisect-버그-커밋-자동-탐색)에서 실행 확인)
