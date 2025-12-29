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

# 초기화 (v9+)
npx husky init

# 또는 직접 설정
npx husky install
npm pkg set scripts.prepare="husky install"
```

### 생성되는 구조

```
.husky/
├── _/
│   └── husky.sh
├── pre-commit       # 커밋 전 실행
└── commit-msg       # 커밋 메시지 검증
```

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
    "prepare": "husky install",
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
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### .husky/commit-msg

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

### .husky/pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm test
```

---

## Hook 건너뛰기 (긴급 시)

```bash
# 특정 hook 건너뛰기
git commit --no-verify -m "emergency fix"
git push --no-verify

# 또는 환경변수
HUSKY=0 git commit -m "skip hooks"
```

---

## CI 환경에서 건너뛰기

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

```bash
# CI 환경에서 husky 설치 건너뛰기
# GitHub Actions 등에서 자동 감지됨

# 또는 명시적으로
npm ci --ignore-scripts
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

# husky 재설치
rm -rf .husky
npx husky install
```

### Windows에서 에러

```bash
# Git Bash 사용 권장
# 또는 package.json에서
{
  "scripts": {
    "prepare": "husky install || true"
  }
}
```

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
