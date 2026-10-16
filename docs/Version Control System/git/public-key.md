# Git Public Key - 다중 SSH 키 설정 가이드

GitHub에 여러 개의 SSH 키를 연동하고 로컬에서 프로젝트별로 다른 키를 사용하는 방법을 설명합니다.

## 1. SSH 키 생성 (RSA)

각 계정/용도별로 별도의 SSH 키를 생성합니다.

```bash
# 첫 번째 키 생성 (예: 개인 계정)
ssh-keygen -t rsa -b 4096 -C "personal@example.com" -f ~/.ssh/id_rsa_personal

# 두 번째 키 생성 (예: 회사 계정)
ssh-keygen -t rsa -b 4096 -C "work@company.com" -f ~/.ssh/id_rsa_work
```

> **참고**: ED25519 알고리즘을 사용하려면 `-t ed25519`로 변경하세요 (더 안전하고 빠름)

## 2. GitHub에 Public Key 등록

각 키의 공개키를 해당 GitHub 계정에 등록합니다.

```bash
# 공개키 내용 복사
cat ~/.ssh/id_rsa_personal.pub
cat ~/.ssh/id_rsa_work.pub
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
    IdentityFile ~/.ssh/id_rsa_personal
    IdentitiesOnly yes

# 회사 계정용
Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_work
    IdentitiesOnly yes
```

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
    sshCommand = ssh -i ~/.ssh/id_rsa_personal
```

```ini
# ~/.gitconfig-work
[user]
    name = Work Name
    email = work@company.com

[core]
    sshCommand = ssh -i ~/.ssh/id_rsa_work
```

## 6. SSH Agent에 키 등록 (선택)

매번 passphrase를 입력하지 않으려면 ssh-agent에 키를 등록합니다.

```bash
# ssh-agent 시작
eval "$(ssh-agent -s)"

# 키 추가
ssh-add ~/.ssh/id_rsa_personal
ssh-add ~/.ssh/id_rsa_work

# 등록된 키 확인
ssh-add -l
```

### Windows에서 ssh-agent 자동 시작

PowerShell 관리자 권한으로 실행:

```powershell
# ssh-agent 서비스 활성화
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
```

## 7. 문제 해결

### 잘못된 키가 사용되는 경우

```bash
# 어떤 키가 사용되는지 확인
ssh -vT git@github-personal 2>&1 | grep "Offering"
```

### Permission denied 오류

```bash
# 키 파일 권한 확인 (Linux/Mac)
chmod 600 ~/.ssh/id_rsa_*
chmod 644 ~/.ssh/id_rsa_*.pub
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
