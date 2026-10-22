# Husky

## Husky란?

> Git Hooks를 쉽게 관리하는 도구

**용도**

- 커밋 전 린트/포맷 검사
- 커밋 메시지 규칙 강제
- 푸시 전 테스트 실행
- 코드 품질 자동화

---

## 설치 및 초기화

```bash
# 설치
npm install --save-dev husky

# 초기화: .husky/pre-commit 생성 + package.json에 "prepare": "husky" 추가
npx husky init
```

> v9부터 `husky install`과 `husky add`는 쓰지 않습니다. `prepare` 스크립트는 `"husky"`, hook은 `.husky/` 아래에 파일을 만들면 됩니다.
>
> ```bash
> echo "npm test" > .husky/pre-push
> ```

### 생성되는 구조

```
.husky/
├── _/               # husky가 관리 (자동 생성, Git에서 무시)
├── pre-commit       # 커밋 전 실행
└── commit-msg       # 커밋 메시지 검증
```

hook 파일에는 실행할 명령만 적습니다. v8까지 쓰던 shebang과 `. "$(dirname -- "$0")/_/husky.sh"` 줄은 필요 없습니다(hook은 shebang과 관계없이 `sh`로 실행됨).

---

## 주요 Git Hooks

| Hook         | 실행 시점           | 용도             |
| ------------ | ------------------- | ---------------- |
| `pre-commit` | 커밋 직전           | 린트, 포맷 검사  |
| `commit-msg` | 커밋 메시지 작성 후 | 메시지 규칙 검증 |
| `pre-push`   | 푸시 직전           | 테스트 실행      |
| `post-merge` | 머지 후             | 의존성 설치      |

---

## 기본 설정

### pre-commit (커밋 전 검사)

```bash
# .husky/pre-commit
npm run lint
npm run format:check
```

### lint-staged와 함께 (변경된 파일만)

```bash
npm install --save-dev lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

### commit-msg (커밋 메시지 규칙)

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
    ],
    "subject-max-length": [2, "always", 72],
  },
};
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

**커밋 메시지 형식**

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 리팩토링
test: 테스트 추가
chore: 빌드, 설정 변경
```

### pre-push (푸시 전 테스트)

```bash
# .husky/pre-push
npm test
npm run build
```

---

## 완전한 설정 예시

### package.json

```json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "build": "tsc"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "@commitlint/cli": "^18.0.0",
    "@commitlint/config-conventional": "^18.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### .husky/pre-commit

```bash
npx lint-staged
```

### .husky/commit-msg

```bash
npx --no -- commitlint --edit $1
```

### .husky/pre-push

```bash
npm test
```

---

## Hook 건너뛰기 (긴급 시)

```bash
# 특정 hook 건너뛰기
git commit --no-verify -m "emergency fix"
git push --no-verify

# --no-verify가 없는 명령은 환경변수로 (이번 명령만)
HUSKY=0 git pull

# 한동안 끄기
export HUSKY=0
# 다시 켜기
unset HUSKY
```

---

## CI·Docker에서 건너뛰기

CI 서버나 Docker 이미지에는 Git hook이 필요 없으므로 `HUSKY=0`으로 설치를 막습니다.

```yaml
# GitHub Actions
env:
  HUSKY: 0
```

운영 환경처럼 `dependencies`만 설치해 husky가 없으면 `prepare`가 실패합니다. 이때는 실패를 무시합니다.

```json
{
  "scripts": {
    "prepare": "husky || true"
  }
}
```

---

## 🎯 Husky 설정 체크리스트

### 초기 설정

- [ ] Husky 설치 및 초기화
- [ ] `prepare` 스크립트 추가
- [ ] `.husky` 디렉토리 Git에 포함

### pre-commit

- [ ] lint-staged 설치
- [ ] ESLint + Prettier 연동
- [ ] 변경 파일만 검사하도록 설정

### commit-msg

- [ ] commitlint 설치
- [ ] 커밋 메시지 규칙 정의
- [ ] 팀 내 규칙 공유

### 팀 협업

- [ ] README에 설정 방법 문서화
- [ ] 신규 팀원 온보딩 가이드
- [ ] 긴급 시 `--no-verify` 사용법 공유

---

## 트러블슈팅

### Hook 실행 안됨

```bash
# 권한 확인 (Mac/Linux)
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

# hook 경로 다시 설정 (prepare 실행)
npm run prepare

# Git이 husky hook 경로를 보고 있는지 확인
git config core.hooksPath   # .husky/_ 가 나와야 함
```

### Windows에서 에러

- Git Bash 사용을 권장합니다.
- `npx`를 찾지 못하면 Node 버전 관리자(nvm 등)의 PATH가 GUI Git 클라이언트에 잡히지 않은 경우가 많습니다.

---

## 요약

```
커밋 시 자동 흐름:
1. git commit
2. pre-commit → lint-staged (린트 + 포맷)
3. commit-msg → commitlint (메시지 검증)
4. 통과 시 커밋 완료

푸시 시:
1. git push
2. pre-push → 테스트 실행
3. 통과 시 푸시 완료
```

## 참고 자료

- [Husky Get started](https://typicode.github.io/husky/get-started.html) - 설치, `husky init`
- [Husky How To](https://typicode.github.io/husky/how-to.html) - `prepare` 값, hook 추가, `HUSKY=0`, CI·운영 환경
- [Husky v9.0.1 릴리스 노트](https://github.com/typicode/husky/releases/tag/v9.0.1) - `husky install` 제거, `husky.sh` 줄과 shebang 제거

확인일: 2026-10-22 (명령·스크립트 값·hook 파일 형식, `core.hooksPath` 값은 [husky 소스](https://github.com/typicode/husky/blob/main/index.js)로 확인)
