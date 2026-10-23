# CI/CD 기초와 파이프라인 설계

CI/CD는 **코드 변경을 작게, 자주, 자동으로 검증하고 배포하는 방법**입니다. 도구는 수단이고, 핵심은 "main 브랜치는 언제나 배포 가능한 상태"를 유지하는 것입니다.

## 용어 구분

| 용어 | 의미 | 사람이 개입하는 지점 |
| --- | --- | --- |
| CI (Continuous Integration) | 변경을 자주 main에 통합하고, 통합할 때마다 빌드·테스트를 자동 실행 | 실패하면 즉시 수정 |
| Continuous Delivery | 모든 변경이 언제든 운영에 배포 **가능한** 상태로 준비됨 | 운영 배포 여부를 사람이 결정(버튼) |
| Continuous Deployment | 검증을 통과한 변경이 운영까지 **자동으로** 배포됨 | 없음(자동) |

Continuous Delivery와 Deployment의 차이는 운영 배포 직전의 승인 단계 유무입니다. 1인 개발에서는 승인할 사람이 자기 자신뿐이므로, 테스트가 충분하다면 Continuous Deployment로 가는 편이 오히려 단순합니다(경험칙).

## 파이프라인 단계

```text
commit → [lint·format] → [build] → [unit test] → [integration test]
       → [package·artifact] → [deploy: staging] → [smoke test] → [deploy: production]
```

| 단계 | 목적 | 실패 시 의미 |
| --- | --- | --- |
| 정적 검사 | 포맷, 린트, 타입 검사 | 가장 싸고 빠른 피드백 |
| 빌드 | 컴파일·번들 생성 | 의존성·설정 문제 |
| 테스트 | 단위 → 통합 → E2E 순으로 느려짐 | 동작 회귀 |
| 패키징 | 배포할 아티팩트 1개 생성(이미지, 번들) | 환경 차이 |
| 배포 | 같은 아티팩트를 환경별로 승격(Promote) | 설정·인프라 문제 |
| 배포 후 확인 | 헬스체크, 스모크 테스트 | 롤백 판단 |

### 설계 원칙

| 원칙 | 설명 |
| --- | --- |
| 빠른 실패(Fail Fast) | 싼 검사를 앞에 둡니다. 린트가 1분 안에 실패하면 10분짜리 E2E를 기다릴 필요가 없습니다 |
| 한 번 빌드, 여러 번 배포 | 스테이징과 운영에 **같은 아티팩트**를 배포합니다. 환경마다 다시 빌드하면 검증한 것과 배포한 것이 달라집니다 |
| 설정은 아티팩트 밖에 | 환경별 값은 환경변수·시크릿으로 주입합니다. [환경변수 관리](../../Security/env-management.md) 참고 |
| 재현 가능성 | lockfile, 고정된 런타임 버전, 고정된 베이스 이미지 태그를 씁니다. [캐시와 재현 가능한 빌드](../../Build/reproducibility.md) 참고 |
| 파이프라인도 코드 | 워크플로 파일을 저장소에 두고 리뷰합니다 |
| 10분 목표 | 커밋 후 피드백이 10분 안에 오도록 유지합니다(경험칙). 넘으면 캐시·병렬화·테스트 분리를 검토합니다 |

## 브랜치 전략과의 관계

| 전략 | 특징 | CI/CD 적합도 |
| --- | --- | --- |
| 트렁크 기반(Trunk-Based) | 하나의 trunk(main)에 최소 하루 한 번 통합. 브랜치를 쓰더라도 이틀 이내로 유지 | 높음. CI의 원래 의도에 가장 가깝습니다 |
| GitHub Flow | main + 기능 브랜치 + PR, main 머지 시 배포 | 높음. 1인·소규모의 기본값으로 무난합니다 |
| Git Flow | develop·release·hotfix 등 장기 브랜치 | 낮음. 릴리스 주기가 고정된 제품에 맞습니다 |

수명이 긴 브랜치는 통합을 미루는 것이므로 CI의 이점이 줄어듭니다. 미완성 기능은 브랜치 대신 [기능 플래그](./deployment-strategies.md#전략-비교)로 숨깁니다.

## 속도 개선 방법

| 방법 | 효과 | 예시 |
| --- | --- | --- |
| 의존성 캐시 | 설치 시간 단축 | `actions/setup-node`의 `cache: npm`, `actions/cache` |
| 빌드 캐시 | 변경된 부분만 다시 빌드 | Docker 레이어 캐시(`cache-from: type=gha`), Turborepo·Nx 원격 캐시 |
| 병렬화 | 독립 작업 동시 실행 | 잡 분리, 매트릭스, 테스트 샤딩 |
| 경로 필터 | 관련 없는 변경에는 실행 안 함 | `on.push.paths`, 모노레포의 affected 실행 |
| 중복 실행 취소 | 같은 브랜치의 이전 실행 중단 | `concurrency` + `cancel-in-progress` |

```yaml
# 같은 브랜치에 새 커밋이 올라오면 이전 실행을 취소
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## 측정: DORA 지표

DORA(DevOps Research and Assessment)는 소프트웨어 전달 성과를 아래 5개 지표로 측정합니다. 예전에 많이 알려진 "4대 지표"에 배포 재작업률이 추가되었습니다.

| 지표 | 질문 | 분류 |
| --- | --- | --- |
| 변경 리드 타임(Change lead time) | 커밋부터 운영 배포까지 얼마나 걸리는가 | 처리량 |
| 배포 빈도(Deployment frequency) | 얼마나 자주 운영에 배포하는가 | 처리량 |
| 실패 배포 복구 시간(Failed deployment recovery time) | 실패한 배포를 얼마나 빨리 복구하는가 | 처리량 |
| 변경 실패율(Change fail rate) | 배포 중 즉시 조치가 필요했던 비율 | 불안정성 |
| 배포 재작업률(Deployment rework rate) | 운영 장애 때문에 계획에 없던 배포를 한 비율 | 불안정성 |

1인 개발자라면 숫자를 대시보드로 만들 필요는 없습니다. "main에 머지한 뒤 운영 반영까지 몇 분인가", "배포가 무서워서 미룬 적이 있는가" 두 질문으로 충분합니다(경험칙).

## 점검표

| 질문 |
| --- |
| PR마다 린트·빌드·테스트가 자동 실행되는가 |
| main이 깨지면 다른 일보다 먼저 고치는가 |
| 스테이징과 운영에 같은 아티팩트를 배포하는가 |
| 비밀값이 저장소나 로그에 노출되지 않는가 |
| 피드백이 10분 안에 오는가 |
| 롤백 방법이 정해져 있는가 |

## 참고 자료

- [Martin Fowler - Continuous Delivery](https://martinfowler.com/bliki/ContinuousDelivery.html) - Delivery와 Deployment의 구분
- [DORA metrics](https://dora.dev/guides/dora-metrics/) - 5개 지표와 처리량·불안정성 분류
- [Trunk Based Development](https://trunkbaseddevelopment.com/), [Short-lived feature branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/)
- [GitHub Actions workflow syntax - concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)

확인일: 2026-10-20 (용어 정의, DORA 지표, 트렁크 기반 정의, concurrency 문법)

관련: [GitHub Actions](./github-action.md), [Make로 CI 명령 통일](../../Utility/makefile.md), [테스트 전략](../../Quality/testing-strategy.md)

다음: [배포 전략과 롤백](./deployment-strategies.md)
