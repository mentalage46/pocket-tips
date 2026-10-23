# SSH로 원격 작업하기

> 서버에 **안전하게 접속하고, 명령을 실행하고, 파일을 옮기고, 터널을 뚫는** 방법

키 만들기와 GitHub 연동은 [다중 SSH 키 설정](../Version%20Control%20System/git/public-key.md)에 있습니다. 이 문서는 **접속한 뒤** 쓰는 기능을 다룹니다.

> **이 문서의 SSH 동작은 모두 직접 실행해서 확인했습니다.** 실행 방법: 127.0.0.1에서만 듣는 **임시 sshd**(OpenSSH 10.2p1, 임시 키, 비밀번호 인증 끔)를 띄워 같은 PC에서 접속했고, 끝난 뒤 sshd와 모든 임시 프로세스를 종료했습니다. 서버가 같은 기기라서 네트워크 지연이나 방화벽은 재현하지 못했습니다.

---

## 개념: SSH는 하나의 암호화된 채널 위에 여러 기능을 올린다

| 기능 | 명령 | 용도 |
| --- | --- | --- |
| 원격 셸/명령 | `ssh user@host`, `ssh host '명령'` | 서버 관리, 배포 스크립트 |
| 파일 전송 | `scp`, `sftp`, `rsync -e ssh` | 업로드/다운로드, 동기화 |
| **포트 포워딩(터널)** | `-L`, `-R`, `-D` | 방화벽 뒤의 DB·내부 서비스 접근 |

SSH는 **두 방향의 신뢰**를 확인합니다.

| 방향 | 무엇을 확인 | 어디에 저장 |
| --- | --- | --- |
| **서버 → 나** (사용자 인증) | 내가 그 계정의 주인인가 | 서버의 `authorized_keys` (공개키) |
| **나 → 서버** (호스트 인증) | 지금 접속한 서버가 진짜인가 | 내 PC의 **`~/.ssh/known_hosts`** (호스트 공개키 지문) |

앞의 문서가 첫 번째(내 키)였다면, 아래 "호스트 키" 절이 두 번째입니다.

---

## 호스트 키: "서버가 진짜인가"를 확인하는 장치

처음 접속하면 서버의 **호스트 키 지문**을 보여 주고 `known_hosts`에 저장합니다. 다음 접속부터는 저장된 키와 서버가 내놓는 키를 비교합니다. 서버의 호스트 키를 바꾸고 접속하면 이렇게 됩니다.

```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
Someone could be eavesdropping on you right now (man-in-the-middle attack)!
It is also possible that a host key has just been changed.
The fingerprint for the ED25519 key sent by the remote host is
SHA256:lJ6J8yBib6SEyZwKhY7HMqJtg1OvLa2ocSm+D2ud0ks.
```

| 원인 | 판단 |
| --- | --- |
| 서버를 **재설치**했거나 호스트 키를 재생성 | 정상 (관리자에게 확인) |
| **같은 IP를 다른 서버가 재사용** (클라우드에서 흔함) | 정상 |
| 누군가 중간에서 가로챔(MITM) | **위험** |

- **경고를 습관적으로 넘기지 않습니다.** 새 지문이 맞는지 **다른 경로**(서버 콘솔, 클라우드 콘솔, 관리자)로 확인한 뒤에 옛 항목을 지웁니다.
- 지문은 `ssh-keygen -lf 호스트키.pub`로 계산합니다(`SHA256:…` 형태).
- 옛 항목 삭제와 재접속(실행 결과):

```bash
ssh-keygen -R '[127.0.0.1]:2222'      # known_hosts에서 해당 호스트 항목 제거 (비표준 포트는 [호스트]:포트 형식)
# Host [127.0.0.1]:2222 found: line 1
# known_hosts updated.
ssh -o StrictHostKeyChecking=accept-new ...   # 처음 보는 호스트는 자동 등록, 이미 있는 호스트의 키 변경은 계속 거부
```

- 자동화 스크립트에서 `StrictHostKeyChecking=no`로 경고를 끄는 것은 MITM에 무방비가 됩니다. 처음 한 번만 등록하고 이후 변경은 거부하는 **`accept-new`** 가 안전한 절충입니다(옵션 이름과 동작은 위 실행에서 확인).

---

## 원격 명령 실행

```bash
ssh -p 2222 user@host 'uptime'
```

### 종료 코드는 그대로 전달된다

```bash
ssh host 'exit 3'; echo $?        # 3   ← 원격 명령의 종료 코드가 ssh의 종료 코드가 됨
```

스크립트에서 `ssh host '배포 스크립트' && 다음 단계`처럼 **성공/실패 판단**에 쓸 수 있습니다([종료 코드](./shell-basics.md#개념-1-모든-명령은-종료-코드로-말한다)).

### 따옴표가 바뀌면 "어느 쪽 셸이 확장하는가"가 바뀐다

`DEMO_VAR=local-value`를 로컬에 설정하고 실행한 결과입니다.

```bash
ssh host 'echo "remote:${DEMO_VAR}:end"'     # remote::end            ← 작은따옴표: 원격 셸이 확장 (원격에는 변수가 없어 빈 값)
ssh host "echo \"local:${DEMO_VAR}:end\""    # local:local-value:end  ← 큰따옴표: 로컬 셸이 먼저 확장해서 보냄
```

- **작은따옴표** 안의 `$변수`와 `$(명령)`은 **원격에서** 평가되고, **큰따옴표**는 **로컬에서** 먼저 평가되어 값이 치환된 문자열이 전송됩니다([따옴표와 확장](./shell-basics.md#개념-2-변수는-텍스트로-치환된-뒤-공백으로-쪼개진다)).
- 원격 명령은 **원격 계정의 로그인 셸**이 해석합니다(`echo $SHELL` → `/bin/zsh`였음). 로컬이 bash여도 원격이 다른 셸이면 글롭·확장 규칙이 달라, 대괄호(`[…]`)가 든 문자열이 `no matches found` 오류를 낸 적도 있었습니다.
- 복잡한 작업은 한 줄로 쓰지 말고 **스크립트 파일을 보내서 실행**(`ssh host 'bash -s' < script.sh`, 이 문서에서 실행하지 않음, 미확인)하는 편이 안전합니다.

---

## 포트 포워딩(터널): 세 가지 방향

SSH 연결을 **터널**로 삼아 다른 포트의 트래픽을 실어 나릅니다. 실제로 로컬 웹 서버(`127.0.0.1:18097`)를 두고 세 방식을 모두 시험해 응답을 받았습니다.

```
-L (Local)   내 PC의 포트  ──터널──▶  서버가 접근할 수 있는 목적지
-R (Remote)  서버의 포트   ◀──터널──  내 PC가 접근할 수 있는 목적지
-D (Dynamic) 내 PC의 SOCKS 프록시 ──터널──▶ 서버를 통해 임의의 목적지
```

| 옵션 | 명령 | 동작 | 용도 |
| --- | --- | --- | --- |
| **`-L`** | `ssh -N -L 18098:127.0.0.1:18097 host` | `localhost:18098`로 접속하면 **서버를 거쳐** `127.0.0.1:18097`에 도달 | **방화벽 뒤 DB·관리 콘솔 접속**(예: `-L 5433:db.internal:5432`) |
| **`-R`** | `ssh -N -R 19000:127.0.0.1:18097 host` | **서버의 `19000`** 으로 접속하면 **내 PC의 `18097`** 에 도달 | 로컬 개발 서버를 외부에 잠시 노출 |
| **`-D`** | `ssh -N -D 11080 host` | 내 PC에 **SOCKS 프록시** 생성 (`curl --socks5-hostname`) | 서버를 출구로 삼아 여러 목적지 접속 |

- `-N`은 원격 명령을 실행하지 않고 **터널만** 유지한다는 뜻입니다.
- 세 방식 모두 `curl`로 `hello from the private service`를 받는 것을 확인했습니다.

### 터널은 기본적으로 "내 PC에서만" 열린다

`-L 18099:…`처럼 바인드 주소를 생략하고 열었을 때, 리스닝 소켓은 `127.0.0.1:18099`와 `[::1]:18099`(루프백)였습니다(`lsof`로 확인). 같은 네트워크의 다른 기기는 접근할 수 없습니다. 매뉴얼은 `bind_address`를 **빈 값이나 `*`** 로 주면 모든 인터페이스에서 열린다고 설명합니다.

- **`-L 0.0.0.0:…`** 또는 `*`로 열면 터널이 LAN의 다른 사람에게 노출됩니다. DB를 터널로 열어 놓고 이렇게 하면 인증 없는 DB가 사내망에 공개되는 셈이니 필요할 때만, 짧게 씁니다(이 설정은 안전상 실행하지 않았음).
- 터널이 이미 쓰는 포트에서 충돌하면 `Address already in use`와 `Could not request local forwarding`이 나옵니다(실제로 이전 시험의 프로세스가 남았을 때 확인). 터널을 백그라운드로 두었다면 끝난 뒤 반드시 종료합니다. 스크립트에는 **`-o ExitOnForwardFailure=yes`** 를 줘서 포워딩 실패 시 ssh가 종료되게 합니다.

---

## 파일 전송

### scp: 포트 옵션이 대문자다

```bash
ssh  -p 2222 host        # 소문자 -p : 포트
scp  -P 2222 f host:/dst # 대문자 -P : 포트  (scp의 소문자 -p는 "시간·권한 보존")
```

`scp -p 2222 …`처럼 쓰면 `2222`를 **로컬 파일 이름**으로 해석해 `scp: stat local "2222": No such file or directory` 오류가 납니다(실행 확인).

### scp는 이제 SFTP 위에서 동작한다

OpenSSH 10.2의 `scp`는 서버에 **`sftp` 서브시스템**이 있어야 동작했습니다. 임시 sshd에 `Subsystem sftp`를 설정하지 않았을 때 다음과 같이 실패했고, 추가하자 성공했습니다.

```
subsystem request failed on channel 0
scp: Connection closed
```

- 서버 설정(`sshd_config`)에 `Subsystem sftp …`가 없거나 **SFTP를 막은 서버**에서는 `scp`가 실패합니다. 그런 서버에는 **레거시 SCP 프로토콜을 쓰는 `-O`** 옵션이 대안입니다(`scp -O`로 전송 성공을 확인).
- 현재 `scp`가 SFTP를 기본으로 쓰는 시작 버전은 이 문서에서 확인하지 않았습니다(미확인).

### rsync: 변경분만, 그리고 끝의 슬래시

대량 파일이나 반복 동기화는 `rsync`가 `scp`보다 낫습니다. 이미 있는 파일을 건너뛰고 **바뀐 것만** 보냅니다.

```bash
rsync -a -e "ssh -p 2222" src/ host:/dst1/      # src 안의 "내용"을 dst1에   → dst1/a.txt, dst1/sub
rsync -a -e "ssh -p 2222" src  host:/dst2/      # src "디렉터리 자체"를 dst2에 → dst2/src/…
```

- **원본 경로 끝의 `/` 유무로 결과가 달라집니다.** `src/`는 내용물, `src`는 디렉터리 자체를 복사합니다(실행 확인). 가장 흔한 실수입니다.
- 한 번 동기화한 뒤 다시 실행하면 **전송할 것이 없습니다**. `-n`(dry-run)과 `-i`(변경 항목 출력)로 확인하면 아무것도 나오지 않았습니다.
- `--delete`는 원본에 없는 파일을 **대상에서 삭제**합니다. 먼저 `-n`으로 확인하면 `*deleting extra.txt`처럼 지울 항목이 나열됩니다. **`--delete`는 항상 `-n`으로 먼저 점검**합니다.
- 이 macOS의 `rsync`는 **openrsync(프로토콜 29)** 였습니다. 서버의 GNU rsync와 지원하는 옵션이 다를 수 있습니다(차이의 구체 목록은 확인하지 않음, 미확인).

---

## 설정 파일(~/.ssh/config)로 줄이기

```
# ~/.ssh/config
Host prod
    HostName 203.0.113.10
    User deploy
    Port 2222
    IdentityFile ~/.ssh/id_ed25519_work
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3

Host db-tunnel
    HostName bastion.example.com
    LocalForward 5433 db.internal:5432

Host *
    ServerAliveInterval 60
```

`ssh prod`만으로 위 설정이 모두 적용됩니다. 매뉴얼에서 확인한 규칙입니다.

| 항목 | 내용 |
| --- | --- |
| **우선순위** | ① 명령행 옵션 ② `~/.ssh/config` ③ `/etc/ssh/ssh_config`. **각 매개변수는 처음 얻은 값이 사용됨** |
| `Host` 블록 | 호스트 이름이 패턴과 맞을 때만 적용 |
| `ServerAliveInterval` | 서버로부터 **데이터를 받지 못한 채 이 시간(초)이 지나면** 응답을 요청하는 메시지를 보냄. **기본값 0 = 보내지 않음** |
| `ServerAliveCountMax` | 응답 없이 보낼 수 있는 확인 메시지 수. 한도에 닿으면 **연결 종료** |
| **`ProxyJump`** (`-J`) | 점프 호스트를 먼저 거쳐 최종 대상에 접속. 쉼표로 여러 개 연결 가능 (`user@host:port` 또는 ssh URI) |
| `ControlMaster`/`ControlPersist` | 하나의 네트워크 연결을 **여러 세션이 공유**. `ControlPersist`를 주면 첫 세션이 닫혀도 마스터 연결을 백그라운드에 유지 |

- **"처음 얻은 값이 우선"** 이므로 `Host *` 같은 **넓은 패턴은 파일 맨 끝**에 두고, 구체적인 `Host` 블록을 앞에 둡니다. 순서를 뒤집으면 넓은 설정이 구체적 설정을 덮어쓰게 됩니다.
- `ServerAliveInterval`이 기본 0이라 **유휴 연결이 NAT/방화벽에서 조용히 끊기는** 문제가 흔합니다. 터널이나 오래 켜 둔 세션에는 30~60초 정도를 줍니다(적정값은 환경에 따라 다름).
- `ProxyJump`·`ControlMaster`는 매뉴얼로 동작을 확인했지만 이번에 직접 실행하지 않았습니다(같은 호스트 하나뿐이라 점프 구성 재현 불가).

---

## 🎯 체크리스트

- [ ] `known_hosts` 경고(`REMOTE HOST IDENTIFICATION HAS CHANGED`)는 지문을 **다른 경로로 확인**하고 처리
- [ ] 자동화에서도 `StrictHostKeyChecking=no` 대신 `accept-new`
- [ ] 원격 명령의 따옴표: 작은따옴표 = 원격 확장, 큰따옴표 = 로컬 확장
- [ ] 스크립트에서는 `ssh host '…' && …`처럼 종료 코드 활용
- [ ] 터널은 `-N`, `-o ExitOnForwardFailure=yes`, 바인드 주소는 기본(루프백) 유지, 끝나면 종료
- [ ] `ssh -p`와 `scp -P` 구분, `scp`가 실패하면 SFTP 서브시스템 확인 또는 `-O`
- [ ] `rsync`는 끝의 `/` 확인, `--delete` 전에 `-n`
- [ ] `~/.ssh/config`에 호스트별 설정, `Host *`는 맨 아래, 유휴 연결에 `ServerAliveInterval`

## 참고 자료

- ssh_config(5) 매뉴얼 (macOS 설치본) - 설정 우선순위와 "처음 얻은 값 사용", `ServerAliveInterval`(기본 0), `ServerAliveCountMax`, `ProxyJump`, `ControlMaster`/`ControlPersist`, `LocalForward`/바인드 주소와 `GatewayPorts`
- [OpenSSH](https://www.openssh.com/manual.html) - `ssh(1)`, `scp(1)`, `sshd_config(5)` (위 항목 외에는 이번에 열어서 대조하지 않았음, 참고용)

확인일: 2026-10-23 (OpenSSH 10.2p1·LibreSSL 3.3.6이 설치된 macOS 26.5에서, 127.0.0.1에서만 수신하는 임시 sshd와 임시 키로 직접 실행해 확인. 종료 코드 전달, 작은따옴표·큰따옴표 확장 차이와 원격 로그인 셸, `-L`·`-R`·`-D` 터널, `-L`의 기본 루프백 바인드, 포트 충돌 메시지, `scp -P`와 `-p` 혼동 오류, sftp 서브시스템이 없을 때 scp 실패와 추가 후 성공, `scp -O`, `rsync`의 끝 슬래시 차이·재실행 시 무전송·`--delete` 드라이런(openrsync 프로토콜 29), 호스트 키 변경 경고와 `ssh-keygen -R`·`accept-new`. `ssh_config` 우선순위와 옵션 설명은 로컬 매뉴얼에서 확인. 시험 후 임시 sshd와 웹 서버를 종료함. 다른 기기 간 지연·방화벽·NAT, `ProxyJump`·`ControlMaster`·`-J` 실제 동작, 에이전트 포워딩(`-A`)의 위험, `scp`가 SFTP를 기본으로 쓰기 시작한 버전, GNU rsync와의 옵션 차이, `ssh host 'bash -s' < script.sh`는 실행하지 못함)
