# 공급망 보안 (의존성)

> 내가 쓰지 않은 코드가 내 앱 안에서 실행된다는 사실을 관리하는 방법

OWASP Top 10:2025에서 **A03 Software Supply Chain Failures**로 새로 묶인 영역입니다. CI 워크플로 쪽(액션 SHA 고정, 토큰 권한, 빌드 증명)은 [파이프라인 보안](../Infrastructure/cicd/pipeline-security.md)을 참고합니다.

---

## 위협 유형

| 위협 | 예 | 주요 방어 |
| --- | --- | --- |
| 알려진 취약점 | 오래된 라이브러리의 CVE | `npm audit`, Dependabot 보안 업데이트 |
| 탈취된 정상 패키지 | 관리자 계정 탈취 후 악성 버전 배포 | lockfile, 새 버전 설치 지연, 설치 스크립트 차단 |
| 타이포스쿼팅 | `lodash` 대신 `lodahs` | 설치 전 이름·다운로드 수·저장소 확인 |
| 의존성 혼동 | 사내 패키지 이름을 공개 레지스트리에 선점 | 스코프(`@company/`) + 레지스트리 고정 |
| 설치 스크립트 | `postinstall`에서 토큰·SSH 키 수집 | 스크립트 허용 목록 |

---

## 1. lockfile을 기준으로 설치

```bash
# 로컬: 의존성 추가·변경할 때만
npm install some-package

# CI·배포: lockfile 그대로 설치, package.json과 어긋나면 실패
npm ci
```

- `package-lock.json`(또는 `pnpm-lock.yaml`)은 반드시 커밋합니다.
- 리뷰 때 lockfile 변경도 봅니다. 의도하지 않은 패키지 추가·레지스트리 URL 변경이 단서입니다.

---

## 2. 새로 배포된 버전은 바로 설치하지 않기

탈취된 버전은 대개 몇 시간~며칠 안에 발견되어 내려갑니다. 배포 직후 버전을 피하는 것만으로 상당 부분을 피할 수 있습니다.

```ini
# .npmrc (npm): 배포 후 3일이 지난 버전만 설치
min-release-age=3
```

```yaml
# pnpm-workspace.yaml (pnpm): 단위는 분
minimumReleaseAge: 4320 # 3일
```

```yaml
# .github/dependabot.yml: 버전 업데이트 PR을 늦게 생성
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 3
      semver-major-days: 14
```

- Dependabot `cooldown`은 **버전 업데이트에만** 적용되고 보안 업데이트는 늦추지 않습니다.
- 긴급 보안 패치를 바로 받아야 하면 해당 패키지만 예외로 둡니다(npm `min-release-age-exclude`, pnpm `minimumReleaseAgeExclude`).

---

## 3. 설치 스크립트 제한

```yaml
# pnpm-workspace.yaml: 의존성의 빌드 스크립트는 허용한 것만 실행
allowBuilds:
  esbuild: true
  sharp: true
```

- 최신 pnpm은 허용 목록에 없는 의존성의 설치 스크립트를 기본으로 실행하지 않습니다. 허용 안 된 패키지가 빌드를 요구하면 설치가 실패합니다(`strictDepBuilds` 기본값 `true`).
- npm은 기본으로 실행합니다. `ignore-scripts=true`로 전부 끌 수 있지만 네이티브 모듈 빌드도 막히므로 영향을 확인한 뒤 씁니다.

---

## 4. 취약점 검사와 업데이트

```bash
# 알려진 취약점 확인
npm audit
npm audit --omit=dev        # 운영에 들어가는 의존성만

# 설치된 패키지의 레지스트리 서명·출처 증명(provenance) 확인
npm audit signatures
```

| 도구 | 역할 |
| --- | --- |
| Dependabot 보안 업데이트 | 취약 버전에 대한 수정 PR 자동 생성 |
| Dependabot 버전 업데이트 | 정기 업데이트 PR (`cooldown`과 함께) |
| `npm audit` / `pnpm audit` | 로컬·CI에서 취약점 목록 |

> `npm audit fix --force`는 메이저 버전을 올려 앱을 깨뜨릴 수 있습니다. 결과를 확인하고 씁니다.

---

## 5. SBOM (소프트웨어 구성 목록)

배포물에 무엇이 들어 있는지 기계가 읽을 수 있는 목록. 새 CVE가 나왔을 때 "우리 서비스에 이 버전이 있나?"에 바로 답하기 위해 만듭니다.

```bash
npm sbom --sbom-format cyclonedx > sbom.cdx.json
npm sbom --sbom-format spdx --omit dev > sbom.spdx.json
```

| 형식 | 특징 |
| --- | --- |
| CycloneDX | OWASP 주도, 보안 용도 중심 |
| SPDX | Linux Foundation 주도, 라이선스 정보에서 출발 |

---

## 6. 패키지를 배포한다면

```bash
# GitHub Actions·GitLab CI에서 출처 증명과 함께 배포 (npm 9.5.0+)
npm publish --provenance --access public
```

- GitHub Actions에서는 job에 `permissions: id-token: write`가 필요합니다.
- npm **trusted publishing**(OIDC)을 쓰면 장기 토큰 없이 배포하고, 출처 증명도 자동으로 만들어집니다.
- npm 계정에 2FA를 켭니다.

---

## 새 의존성 추가 전 확인

- [ ] 정말 필요한가? 몇 줄짜리 기능이면 직접 작성
- [ ] 이름 철자, 공식 저장소 링크, 주간 다운로드 수
- [ ] 최근 관리 여부(마지막 배포, 이슈 응답)
- [ ] 설치 스크립트 유무 (`npm view <pkg> scripts`)
- [ ] 끌고 오는 하위 의존성 수

## 🎯 체크리스트

- [ ] lockfile 커밋, CI는 `npm ci`
- [ ] 새 버전 설치 지연(`min-release-age` / `minimumReleaseAge` / Dependabot `cooldown`)
- [ ] 설치 스크립트 허용 목록(pnpm `allowBuilds`)
- [ ] Dependabot 보안 업데이트 켜기
- [ ] CI에서 `npm audit` 또는 동등한 검사
- [ ] 사내 패키지는 스코프와 레지스트리 고정

## 참고 자료

- [OWASP Top 10:2025](https://top10.owasp.org/2025/) - A03 Software Supply Chain Failures
- [npm config](https://docs.npmjs.com/cli/v11/using-npm/config) - `min-release-age`, `min-release-age-exclude`, `before`, `ignore-scripts`
- [npm sbom](https://docs.npmjs.com/cli/v11/commands/npm-sbom) - `--sbom-format`, `--omit`
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements) - `--provenance`, `id-token: write`, `npm audit signatures`, trusted publishing
- [pnpm 의존성 해석 설정](https://pnpm.io/settings/dependency-resolution) - `minimumReleaseAge`(분 단위)
- [pnpm 빌드 설정](https://pnpm.io/settings/build) - `allowBuilds`, `strictDepBuilds`
- [Dependabot 옵션](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) - `cooldown` 키, 보안 업데이트에는 미적용

확인일: 2026-10-22 (명령·설정 키·단위. `npm view <pkg> scripts` 출력 형식과 SBOM 형식의 주도 단체 설명은 미확인)
