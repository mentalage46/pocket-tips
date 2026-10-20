# CI/CD

코드 변경을 자동으로 검증하고 배포하는 방법을 정리합니다. 개념 → 배포 → 보안 → 도구 → 자동화 순서로 읽고, 마지막에 GitHub Actions 실전 예시로 확인합니다.

1인 개발자·소규모 팀이라면 [1인·소규모 도구 선택](./solo-dev-tools.md)부터 읽어도 됩니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [CI/CD 기초와 파이프라인 설계](./cicd-basics.md) | CI·Continuous Delivery·Deployment 구분, 파이프라인 단계, 브랜치 전략, 속도 개선, DORA 지표 |
| 2 | [배포 전략과 롤백](./deployment-strategies.md) | 재생성·롤링·블루-그린·카나리·기능 플래그, DB 마이그레이션, 배포 후 확인 |
| 3 | [파이프라인 보안](./pipeline-security.md) | 최소 권한, OIDC, 액션 SHA 고정, 스크립트 인젝션, 포크 PR, 아티팩트 증명 |
| 4 | [1인·소규모 도구 선택](./solo-dev-tools.md) | CI 서비스 무료 한도, 관리형 배포 플랫폼, 자체 호스팅 PaaS, act, 단계별 추천 조합 |
| 5 | [릴리스·의존성 자동화](./release-automation.md) | Conventional Commits, release-please·semantic-release·Changesets, Dependabot·Renovate |
| 6 | [GitHub Actions 실전 예시](./github-action.md) | Secrets, 환경별 배포, Docker 이미지 빌드·배포 워크플로 |

가격·무료 한도·버전 정보는 2026-10-20 기준입니다. 6개월이 지나면 각 문서의 참고 자료로 다시 확인합니다.

## 관련 지식

- [Docker](../docker/docker.md), [Docker Compose](../docker/docker-compose.md)
- [Nginx](../nginx/nginx.md), [SSL 자동화](../nginx/ssl.md)
- [캐시와 재현 가능한 빌드](../../Build/reproducibility.md), [테스트 전략](../../Backend/testing/testing-strategy.md)
