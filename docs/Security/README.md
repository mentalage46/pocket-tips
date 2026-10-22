# Security

웹 애플리케이션 보안 기준과 체크리스트입니다. AI 서비스 보안은 [AI 보안](../AI/security/README.md), CI/CD 보안은 [파이프라인 보안](../Infrastructure/cicd/pipeline-security.md)을 참고합니다.

## 기준

- [OWASP Top 10](./owasp-top-10.md) - 2025판 10가지 위험과 2021판 대비 변경점

## 주제별

- [인증과 비밀번호 저장](./auth-and-passwords.md) - NIST 비밀번호 기준, Argon2id, 세션 vs 토큰, OAuth/OIDC + PKCE, MFA
- [웹 공격과 방어](./web-attacks.md) - XSS, CSRF, 보안 응답 헤더, CSP 도입 순서
- [공급망 보안](./supply-chain.md) - lockfile, 새 버전 설치 지연, 설치 스크립트 제한, SBOM, provenance
- [CORS](./cors.md) - 크로스 오리진 설정
- [환경변수 관리](./env-management.md) - dotenv, Secret Manager
