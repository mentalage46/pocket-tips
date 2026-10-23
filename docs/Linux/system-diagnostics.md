# 시스템 진단: CPU, 메모리, 디스크, 로그

> 서버가 **느리거나 죽었을 때**, 어느 자원이 문제인지 좁혀 가는 순서와 숫자 읽는 법

[네트워크 진단 명령](../Network/diagnostics.md)이 "연결이 어디서 끊겼나"를 다뤘다면, 이 문서는 **호스트 안의 자원**을 봅니다. [메트릭](../Observability/metrics-and-tracing.md)이 평소의 추세를 알려 준다면, 여기 명령들은 **지금 그 서버에 들어가서** 확인하는 도구입니다.

> **이 문서는 Linux 맨페이지(man7.org, freedesktop.org)로 확인했습니다.** 개발 환경이 macOS라 `free`, `ss`, `journalctl`, `dmesg`는 실행하지 못했습니다. macOS에서 직접 실행한 것은 `uptime`과 `ps`뿐이며 표시했습니다.

---

## 개념: 자원마다 "사용량, 포화, 에러"를 본다

문제를 추측하지 않고 **자원별로** 같은 질문을 합니다. SRE의 골든 시그널 중 **포화도(saturation)** 가 특히 중요합니다([메트릭: 무엇을 측정할 것인가](../Observability/metrics-and-tracing.md#무엇을-측정할-것인가)).

| 자원 | 사용량 | 포화(대기) | 에러 |
| --- | --- | --- | --- |
| **CPU** | 사용률 | 실행 대기 중인 작업 수 (load average) | |
| **메모리** | 사용량, `available` | 스왑 사용, **OOM 종료** | OOM 로그 |
| **디스크** | 사용률, inode | I/O 대기 | 디스크 오류 로그 |
| **네트워크** | 포트·연결 수 | 큐 적체 | 재전송·드롭 |

---

## CPU: load average를 읽는 법

```bash
uptime
13:03  up 31 days,  8:57, 3 users, load averages: 2.12 3.56 3.59      # macOS에서 실행한 출력
```

세 숫자가 **1분, 5분, 15분 평균 load average**입니다. Linux 맨페이지(`/proc/loadavg`)의 정의는 다음과 같습니다.

> 실행 대기열(상태 `R`)에 있거나 **디스크 I/O를 기다리는(상태 `D`)** 작업 수를 1·5·15분으로 평균한 값

| 읽는 법 | 해석 |
| --- | --- |
| 숫자 ≈ **CPU 코어 수** | 코어가 거의 가득 참 (4코어에서 4.0이면 포화 직전. 코어 수와 비교하는 규칙은 일반 개념) |
| 숫자가 코어 수보다 **훨씬 큼** | 실행을 기다리는 작업이 쌓임 (포화) |
| **1분 > 15분** | 부하가 **증가 중** |
| **1분 < 15분** | 부하가 **줄어드는 중** (위 출력의 `2.12 < 3.59`) |

- **load에는 디스크 I/O를 기다리는 작업(`D` 상태)도 포함**됩니다. 그래서 **load는 높은데 CPU 사용률은 낮다면 I/O 대기**를 의심합니다. "CPU가 바쁘다"와 "load가 높다"는 같은 말이 아닙니다.
- macOS의 load average 정의가 Linux와 같은지는 이 문서에서 확인하지 않았습니다(미확인). 위 해석은 Linux 기준입니다.

### 어느 프로세스가 CPU를 쓰는가

```bash
top                              # 실시간 (정렬 키 변경은 top 안에서)
ps -o pid,stat,%cpu,%mem,rss,comm -p <PID>   # 특정 프로세스의 상태 (BSD 계열 형태, macOS에서 실행해 확인)
```

`ps`의 `STAT` 열은 프로세스 상태로, `R`(실행 가능), `S`(대기), `D`(디스크 I/O 대기)가 위 load average의 `R`·`D`와 연결됩니다. 위 출력의 `Ss`는 자는 중(`S`)인 세션 리더(`s`)라는 뜻입니다(플래그 세부 의미는 `ps` 매뉴얼 참고, 미확인).

---

## 메모리: `free`가 아니라 `available`을 본다

```bash
free -h
              total   used   free   shared  buff/cache   available
Mem:           ...     ...    ...     ...        ...          ...
```

`free(1)` 맨페이지의 열 정의입니다.

| 열 | 의미 |
| --- | --- |
| `free` | **전혀 쓰이지 않는** 메모리 |
| `buff/cache` | 커널 버퍼 + **페이지 캐시** (파일 읽기를 빠르게 하려고 쓰는 메모리) |
| **`available`** | **스왑 없이 새 애플리케이션을 시작할 수 있는** 메모리의 추정치. 페이지 캐시 중 회수 가능한 부분을 고려함 |

- **`free`가 작은 것은 정상**입니다. Linux는 남는 메모리를 캐시로 쓰기 때문입니다. 판단은 **`available`** 로 합니다(`available`은 `total - used`와 다릅니다).
- `available`이 줄어드는 추세이거나 **스왑을 쓰기 시작**하면 포화입니다.

### OOM killer: 메모리가 바닥나면 커널이 프로세스를 죽인다

시스템(또는 cgroup/컨테이너)의 메모리가 한계에 닿으면 커널의 **OOM killer**가 프로세스를 골라 강제 종료합니다.

- 각 프로세스에는 **`oom_score`** (0~1000)가 있고, **높을수록 죽을 가능성이 큽니다.** 기준은 프로세스가 쓰는 메모리 비율이며 root 프로세스는 3%의 여유를 얻습니다(맨페이지). `/proc/<PID>/oom_score_adj`로 가중치를 조정할 수 있습니다.
- "허용된 메모리"의 기준은 상황에 따라 달라집니다. 설정된 **메모리(또는 스왑) 한도에 도달했다면 그 한도가 기준**이므로, 컨테이너에 메모리 제한을 걸었다면 호스트에 메모리가 남아도 **컨테이너 안에서 OOM 종료**가 일어날 수 있습니다.
- OOM으로 죽은 프로세스는 `SIGKILL`을 받으므로 종료 코드가 **137**입니다([시그널과 종료 코드](./permissions-and-processes.md#정상-종료sigterm와-강제-종료sigkill), [Docker의 유예 시간](../Infrastructure/docker/docker-command.md#개념-명령어-뒤의-객체와-생명주기)). 서비스가 "아무 로그 없이" 사라졌다면 OOM을 먼저 확인합니다.
- 커널 메시지에서 확인합니다: `journalctl -k`(커널 메시지만 표시, `--dmesg`와 같음) 또는 `dmesg`. OOM 관련 메시지 문구는 이 문서에서 확인하지 않았습니다(미확인).

---

## 디스크

디스크가 찼는지, 어느 디렉터리가 큰지, inode가 모자란지는 [파일 시스템과 링크](./filesystem-and-links.md#디스크가-찼을-때-df-du)를 참고합니다(`df -h` → `df -i` → `du -d 1 -h`). 로그를 지웠는데 공간이 안 돌아오면 **삭제됐지만 열려 있는 파일**(`lsof +L1`)을 의심합니다.

---

## 네트워크 소켓: 누가 어느 포트를 듣고 있는가

```bash
ss -tlnp
```

`ss(8)` 맨페이지의 옵션입니다.

| 옵션 | 의미 |
| --- | --- |
| `-t` | TCP 소켓 |
| `-l` | **듣고 있는(LISTEN)** 소켓만 (기본 출력에서는 생략됨) |
| `-n` | 서비스 이름으로 바꾸지 않고 **숫자** 포트 표시 |
| `-p` | 소켓을 쓰는 **프로세스** 표시 |

- 포트 충돌(`EADDRINUSE`)이나 "서비스가 떠 있는데 접속이 안 된다"의 확인에 씁니다. `127.0.0.1`로만 듣고 있는지 `0.0.0.0`(전체)인지가 중요합니다([네트워크 진단: 서버에서 듣고 있는가](../Network/diagnostics.md#6-서버에서-듣고-있는가)).
- macOS에서는 `ss`가 없고 `lsof -i :포트`를 씁니다(같은 문서).

---

## 로그: journalctl

systemd가 관리하는 서비스의 로그는 **journal**에 모이고 `journalctl`로 봅니다([systemd 서비스](./services-and-scheduling.md)).

```bash
journalctl -u myapp -f                  # myapp 서비스 로그를 실시간으로 (--unit, --follow)
journalctl -u myapp -p err              # 우선순위 err 이상만
journalctl -u myapp --since "2026-10-22 09:00:00"
journalctl -k                           # 커널 메시지만 (OOM 등)
journalctl -u myapp -n 100              # 마지막 100줄
```

맨페이지에서 확인한 내용입니다.

- `-p`(`--priority=`)는 단일 수준 또는 **범위 `FROM..TO`** 를 받으며, 수준은 syslog의 `emerg`(0)부터 `debug`(7)까지입니다.
- `--since=`/`--until=`의 날짜 형식은 `2012-10-30 18:17:16`이고 시간 부분을 생략하면 `00:00:00`으로 봅니다.
- 여러 필터(`--boot`, `--unit=` 등)는 **논리 AND**로 결합됩니다.
- `-k`/`--dmesg`는 커널 메시지만 보여 주며 별도 지정이 없으면 현재 부팅(`--boot=0`)으로 한정됩니다.

---

## 증상별 첫 확인

| 증상 | 먼저 볼 것 |
| --- | --- |
| 서버가 **느리다** | `uptime`(load), `top`, `free -h`(`available`), 디스크 I/O |
| 서비스가 **아무 로그 없이 사라졌다** | `journalctl -k` / `dmesg`로 **OOM**, 종료 코드 137 |
| **접속이 안 된다** | `ss -tlnp`로 리스닝 여부와 바인딩 주소, 방화벽 |
| **디스크가 찼다** | `df -h`, `df -i`, `du`, 삭제됐지만 열린 파일(`lsof +L1`) |
| **배포 후 서비스가 계속 재시작** | `journalctl -u 서비스 -f`, `Restart=` 정책과 시작 직후 종료 여부 |
| **`Too many open files`** | fd 누수, `ulimit -n` ([파일 디스크립터](./filesystem-and-links.md#개념-3-모든-것은-파일과-파일-디스크립터)) |

---

## 🎯 체크리스트

- [ ] load average는 **코어 수와 비교**하고, **D 상태(I/O 대기)** 가 섞여 있음을 기억
- [ ] 메모리는 `free`가 아니라 **`available`**, 스왑 사용을 포화 신호로
- [ ] 이유 없이 사라진 프로세스는 **OOM**(종료 코드 137, `journalctl -k`) 먼저 확인
- [ ] 컨테이너는 호스트가 아니라 **컨테이너 메모리 한도** 기준으로 OOM 판단
- [ ] 포트 문제는 `ss -tlnp`로 리스닝 주소와 프로세스 확인
- [ ] 서비스 로그는 `journalctl -u 서비스 -f`, 우선순위·기간 필터 활용
- [ ] 진단은 한 자원씩 좁히고 추측으로 재시작하지 않기

## 참고 자료

- [proc_loadavg(5) (man7.org)](https://man7.org/linux/man-pages/man5/proc_loadavg.5.html) - load average의 정의(`R`과 `D` 상태 작업의 평균)
- [free(1) (man7.org)](https://man7.org/linux/man-pages/man1/free.1.html) - `free`, `buff/cache`, `available` 열의 정의
- [proc_pid_oom_score(5)](https://man7.org/linux/man-pages/man5/proc_pid_oom_score.5.html), [proc_pid_oom_score_adj(5)](https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html) - OOM 점수 0~1000, root의 3%, 메모리 한도 기준
- [ss(8) (man7.org)](https://man7.org/linux/man-pages/man8/ss.8.html) - `-t`, `-l`, `-n`, `-p`
- [journalctl(1) (freedesktop.org)](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html) - `-p`, `--since`, `-k`, 필터의 AND 결합

확인일: 2026-10-23 (위 맨페이지에서 확인한 정의와 옵션. `uptime`의 load average 출력과 `ps -o pid,stat,%cpu,%mem,rss,comm` 출력은 macOS 26.5에서 직접 실행해 확인. 그 외 `free`, `ss`, `journalctl`, `dmesg`, `top`은 Linux가 없어 실행하지 못했고 모든 동작은 맨페이지 근거. "load와 코어 수 비교", "load 높고 CPU 낮으면 I/O 대기", `free`가 작아도 정상이라는 설명, 컨테이너 OOM과 종료 코드 137의 연결, 증상별 첫 확인 표는 일반 개념·경험칙. macOS의 load average 정의, `dmesg`의 OOM 메시지 문구, `top`의 CPU 상태 열(`us`·`sy`·`wa` 등), `strace`·`vmstat`·`iostat`, `ulimit -n` 값은 다루지 못함)
