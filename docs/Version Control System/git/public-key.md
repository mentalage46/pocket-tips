# Git Public Key - 다중 SSH 키 설정 가이드

GitHub에 여러 개의 SSH 키를 연동하고 로컬에서 프로젝트별로 다른 키를 사용하는 방법을 설명합니다.

## 개념: 비밀번호 없이 "나임을 증명"하는 방법

SSH 키는 **한 쌍**입니다.

| | 개인키 (private key) | 공개키 (public key) |
| --- | --- | --- |
| 위치 | **내 컴퓨터에만** 있음 (`id_ed25519`) | GitHub 같은 서버에 등록 (`id_ed25519.pub`) |
| 공개 가능? | **절대 공유하지 않음** | 공유해도 안전 |
| 역할 | 서명을 만듦 | 서명을 검증 |

접속할 때 서버는 무작위 값을 보내고, 클라이언트는 개인키로 **서명**해서 돌려줍니다. 서버는 등록된 공개키로 서명이 맞는지 확인합니다. 개인키 자체는 네트워크로 전송되지 않습니다(GitHub 문서: 개인키는 내 컴퓨터에 두고 대응하는 공개키를 계정에 등록).

### 알아 두면 헷갈리지 않는 규칙

1. **인증(SSH 키)과 커밋 작성자(`user.name`·`user.email`)는 별개입니다.** SSH 키는 "이 저장소에 push할 권한이 있는 누구인가"를 정하고, `user.email`은 커밋에 **기록되는 작성자 정보**일 뿐입니다. 개인 키로 회사 저장소에 push하더라도 커밋 이메일은 설정한 값 그대로 남습니다. 그래서 키 설정(섹션 3~4)과 작성자 설정(섹션 5)을 **둘 다** 해야 합니다.
2. **공개키 하나는 GitHub의 한 계정에만 등록할 수 있습니다.** 이미 다른 계정(또는 deploy key라면 다른 저장소)에 등록된 키를 추가하면 `Key is already in use` 오류가 납니다. 계정마다 키가 따로 필요한 이유입니다.
3. **개인키에는 passphrase를 겁니다.** passphrase는 디스크에 있는 개인키 파일을 암호화합니다. 노트북을 분실하거나 파일이 유출돼도 바로 쓸 수 없게 하는 마지막 방어선입니다. 매번 입력하기 번거로우므로 `ssh-agent`(복호화한 키를 메모리에 잠시 보관)를 씁니다.
4. **SSH는 기본적으로 여러 키를 차례로 시도합니다.** `ssh-agent`에 키가 여러 개 있으면 SSH는 그 키들을 순서대로 서버에 제시하고, 서버가 처음 수락한 키로 로그인됩니다. 그 키가 **의도한 계정과 다른 계정의 키**일 수 있습니다. 이를 막는 설정이 `IdentitiesOnly yes`입니다.

### 어떤 알고리즘을 쓸까

GitHub 문서는 **Ed25519**를 기본으로 안내하고, Ed25519를 지원하지 않는 **레거시 시스템**에서만 `rsa -b 4096`을 쓰라고 합니다. 이 문서의 예시는 Ed25519를 기준으로 합니다.

---

## 1. SSH 키 생성 (Ed25519)

각 계정/용도별로 별도의 SSH 키를 생성합니다.

```bash
# 첫 번째 키 생성 (예: 개인 계정)
ssh-keygen -t ed25519 -C "personal@example.com" -f ~/.ssh/id_ed25519_personal

# 두 번째 키 생성 (예: 회사 계정)
ssh-keygen -t ed25519 -C "work@company.com" -f ~/.ssh/id_ed25519_work
```

프롬프트에서 **passphrase를 입력**합니다. `-C`는 키를 구분하는 **주석**일 뿐이고 인증에 쓰이지 않습니다. 생성된 파일 권한은 개인키 `-rw-------`(600), 공개키 `-rw-r--r--`(644)입니다.

> **Ed25519를 지원하지 않는 레거시 시스템**이라면 `ssh-keygen -t rsa -b 4096 -C "..." -f ~/.ssh/id_rsa_...`를 씁니다(GitHub 문서). 아래 파일명의 `id_ed25519_*`를 `id_ed25519_*`로 바꿔 읽으면 됩니다.

## 2. GitHub에 Public Key 등록

각 키의 공개키를 해당 GitHub 계정에 등록합니다.

```bash
# 공개키 내용 복사
cat ~/.ssh/id_ed25519_personal.pub
cat ~/.ssh/id_ed25519_work.pub
```

**GitHub 등록 경로**: Settings → SSH and GPG keys → New SSH key

## 3. SSH Config 설정

`~/.ssh/config` 파일을 생성/수정하여 호스트별로 다른 키를 사용하도록 설정합니다.

```bash
# ~/.ssh/config

# 개인 계정용
Host github-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal
    IdentitiesOnly yes

# 회사 계정용
Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work
    IdentitiesOnly yes
```

### 동작 원리: Host 별칭이 어떻게 풀리는가

`github-work`는 실제 도메인이 아니라 **`~/.ssh/config`의 별칭**입니다. `ssh -G`로 SSH가 최종적으로 사용할 값을 확인할 수 있습니다.

```bash
ssh -G github-work | grep -iE "^(hostname|user|identityfile|identitiesonly) "
user git
hostname github.com
identitiesonly yes
identityfile /Users/me/.ssh/id_ed25519_work
```

즉 `git@github-work:company/repo.git`에 접속하면 SSH가 별칭을 **`github.com`**으로 바꾸고 **지정한 키만** 제시합니다. `IdentitiesOnly yes`가 없으면 `ssh-agent`가 가진 다른 키를 먼저 제시해 **의도하지 않은 계정으로 인증**될 수 있습니다(`ssh_config` 매뉴얼: agent가 더 많은 식별자를 제공해도 설정된 것만 사용).

### SSH 연결 테스트

```bash
ssh -T git@github-personal
# Hi personal-username! You've successfully authenticated...

ssh -T git@github-work
# Hi work-username! You've successfully authenticated...
```

## 4. Git Repository 설정

### 방법 1: Clone 시 호스트 별칭 사용

```bash
# 개인 계정으로 클론
git clone git@github-personal:username/repo.git

# 회사 계정으로 클론
git clone git@github-work:company/repo.git
```

### 방법 2: 기존 저장소 remote URL 변경

```bash
# 현재 remote URL 확인
git remote -v

# remote URL 변경
git remote set-url origin git@github-personal:username/repo.git
```

### 방법 3: URL을 자동으로 바꾸기 (`insteadOf`)

기존 URL(`git@github.com:company/...`)을 그대로 쓰고 싶다면 Git 설정으로 **접두사를 치환**합니다.

```bash
git config --global url."git@github-work:company/".insteadOf "git@github.com:company/"
```

그러면 `git@github.com:company/repo.git`을 가리키는 모든 명령이 내부적으로 `git@github-work:company/repo.git`으로 바뀝니다(실행해서 확인). 회사 조직의 저장소만 회사 키를 쓰게 할 때 편리합니다.

## 5. Git Config 설정

### 저장소별 사용자 정보 설정 (권장)

각 저장소 디렉토리에서 로컬 설정을 합니다.

```bash
cd /path/to/personal-repo
git config user.name "Personal Name"
git config user.email "personal@example.com"

cd /path/to/work-repo
git config user.name "Work Name"
git config user.email "work@company.com"
```

### 디렉토리 기반 자동 설정 (고급)

`includeIf "gitdir:<패턴>"`은 **저장소의 `.git` 위치가 패턴과 맞을 때만** 설정 파일을 포함합니다. 패턴이 `/`로 끝나면 `**`가 자동으로 붙어 **그 디렉터리 아래 모든 저장소**에 적용되고, `~/`로 시작하면 홈 디렉터리로 치환됩니다(Git 문서). 한 번 설정해 두면 `user.email`을 저장소마다 직접 지정하지 않아도 실수로 잘못된 이메일로 커밋하는 일을 막아 줍니다.

`~/.gitconfig` 파일에 디렉토리별 조건부 설정을 추가합니다.

```ini
# ~/.gitconfig

[user]
    name = Default Name
    email = default@example.com

# 개인 프로젝트 디렉토리
[includeIf "gitdir:~/personal/"]
    path = ~/.gitconfig-personal

# 회사 프로젝트 디렉토리
[includeIf "gitdir:~/work/"]
    path = ~/.gitconfig-work
```

```ini
# ~/.gitconfig-personal
[user]
    name = Personal Name
    email = personal@example.com

[core]
    sshCommand = ssh -i ~/.ssh/id_ed25519_personal -o IdentitiesOnly=yes
```

```ini
# ~/.gitconfig-work
[user]
    name = Work Name
    email = work@company.com

[core]
    sshCommand = ssh -i ~/.ssh/id_ed25519_work -o IdentitiesOnly=yes
```

## 6. SSH Agent에 키 등록 (선택)

매번 passphrase를 입력하지 않으려면 ssh-agent에 키를 등록합니다.

```bash
# ssh-agent 시작
eval "$(ssh-agent -s)"

# 키 추가
ssh-add ~/.ssh/id_ed25519_personal
ssh-add ~/.ssh/id_ed25519_work

# 등록된 키 확인
ssh-add -l
```

### macOS: 키체인 연동

macOS(Sierra 10.12.2 이상)에서는 `~/.ssh/config`에 아래를 추가해 키를 에이전트에 자동 로드하고 passphrase를 키체인에 저장할 수 있습니다(GitHub 문서). passphrase가 없는 키라면 `UseKeychain` 줄은 뺍니다.

```text
Host github-personal
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_personal
```

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_personal
```

### Windows에서 ssh-agent 자동 시작

PowerShell 관리자 권한으로 실행:

```powershell
# ssh-agent 서비스 활성화
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
```

## 7. 문제 해결

### Permission denied (publickey)의 흔한 원인

GitHub 문서가 드는 원인입니다.

1. **사용자명이 `git`이 아님**: 모든 연결은 GitHub 사용자명이 아니라 **`git` 사용자**로 해야 합니다 (`git@github.com:...`).
2. **키가 `ssh-agent`에 로드되지 않음**: `ssh-add -l`이 아무것도 안 보이면 로드된 키가 없습니다.
3. **공개키가 계정에 등록되지 않음**.
4. 키 파일 권한이 넓어 SSH가 개인키를 거부함 (`chmod 600` 필요, 일반적으로 알려진 동작이며 이 문서에서 별도로 확인하지 않음).

`ssh -vT git@github.com`으로 어떤 키를 시도하는지 확인합니다.

### 잘못된 키가 사용되는 경우

```bash
# 어떤 키가 사용되는지 확인
ssh -vT git@github-personal 2>&1 | grep "Offering"
```

### 키 파일 권한 확인

```bash
# 키 파일 권한 확인 (Linux/Mac): 개인키 600, 공개키 644
chmod 600 ~/.ssh/id_ed25519_personal ~/.ssh/id_ed25519_work
chmod 644 ~/.ssh/id_ed25519_*.pub
chmod 700 ~/.ssh
```

### 현재 설정 확인

```bash
# 현재 저장소의 git 설정 확인
git config --list --show-origin

# SSH 설정 디버그
ssh -vvv git@github-personal
```

## 요약

| 설정 위치                | 용도                          |
| ------------------------ | ----------------------------- |
| `~/.ssh/config`          | SSH 호스트별 키 매핑          |
| `.git/config` (저장소별) | 저장소별 user/email 설정      |
| `~/.gitconfig`           | 글로벌 설정 및 조건부 include |

## 참고 자료

- [GitHub: SSH 키 생성과 ssh-agent 등록](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) - Ed25519 권장, RSA 4096은 레거시용, passphrase, macOS 키체인 설정
- [GitHub: SSH 정보](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/about-ssh) - 개인키는 로컬, 공개키는 계정에 등록
- [GitHub: Permission denied (publickey)](https://docs.github.com/en/authentication/troubleshooting-ssh/error-permission-denied-publickey) - `git` 사용자, 에이전트 미로드, 키 미등록, `ssh -vT`
- [GitHub: Key is already in use](https://docs.github.com/en/authentication/troubleshooting-ssh/error-key-already-in-use) - 키는 한 계정(deploy key는 한 저장소)에만 등록
- [ssh_config(5) `IdentitiesOnly`](https://man.openbsd.org/ssh_config), [git-config `includeIf`](https://git-scm.com/docs/git-config)

확인일: 2026-10-22 (GitHub 문서 4건, macOS에 설치된 `ssh_config` 매뉴얼의 `IdentitiesOnly`, Git 2.52.0 매뉴얼의 `includeIf "gitdir:"` 규칙. Ed25519 키 생성과 파일 권한, `ssh -G`의 별칭 해석, `url.<base>.insteadOf` 치환은 로컬에서 직접 실행해 확인. 서명 검증 흐름 설명과 passphrase·ssh-agent의 역할은 일반 개념. 실제 GitHub 접속(`ssh -T`)은 계정 정보가 필요해 실행하지 않음, Windows ssh-agent 설정과 키 파일 권한 거부 동작은 미확인)
