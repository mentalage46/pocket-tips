# 서비스 관리와 예약 실행 (systemd, cron)

> 프로세스를 **계속 떠 있게** 하고(서비스), **정해진 시각에 실행**하는(스케줄) 표준 도구

[파일 권한과 프로세스](./permissions-and-processes.md)에서 서버를 `&`로 띄우면 안 되는 이유를 봤습니다. 그 대안이 서비스 관리자입니다.

> **이 문서는 공식 매뉴얼(systemd.service, systemd.timer, crontab(5))로만 확인했습니다.** 실행 환경이 macOS라 systemd와 cron을 직접 실행해 검증하지 못했습니다. 명령 예시는 `미확인` 표시를 확인하세요.

---

## 개념: 서비스 관리자는 "프로세스의 보호자"다

터미널에서 `node server.js &`로 띄운 프로세스는 터미널이 닫히면 함께 죽을 수 있고, 죽어도 아무도 다시 띄우지 않으며, 로그가 어디에 남는지도 정해져 있지 않습니다. **서비스 관리자**(Linux에서는 주로 **systemd**)는 이를 대신 맡습니다.

| 역할 | systemd가 하는 일 |
| --- | --- |
| 시작·종료 | 부팅 시 자동 시작, 정해진 순서(의존성)로 시작, 종료 시 `SIGTERM` 후 `SIGKILL` |
| **재시작** | 프로세스가 죽으면 정책에 따라 다시 실행 |
| 실행 환경 | 실행할 사용자, 환경변수, 작업 디렉터리, 자원 제한 |
| 로그 | 표준 출력을 journal로 수집 ([로깅: stdout 이벤트 스트림](../Observability/logging.md#로그는-이벤트-스트림이다-twelve-factor)) |

컨테이너를 쓴다면 이 역할은 Docker/오케스트레이터가 합니다(`restart` 정책). 컨테이너 없이 서버에서 직접 프로세스를 돌린다면 systemd를 씁니다.

---

## 서비스 유닛 파일

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My App
After=network.target

[Service]
Type=exec
User=myapp
WorkingDirectory=/srv/myapp
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload          # 유닛 파일 변경을 다시 읽기          (명령 동작은 미확인)
sudo systemctl enable --now myapp     # 부팅 시 자동 시작 + 지금 시작         (미확인)
systemctl status myapp                # 상태 확인                            (미확인)
journalctl -u myapp -f                # 로그 따라 보기                       (미확인)
```

### `Type=`: "시작이 끝났다"를 언제로 볼 것인가

| 값 | systemd가 "시작됨"으로 보는 시점 |
| --- | --- |
| `simple` (`ExecStart=`만 있을 때의 기본값) | 메인 프로세스가 **fork된 직후**, 실제 바이너리가 실행되기 **전** |
| **`exec`** | 메인 바이너리가 **실행(execve)된 뒤** |
| `oneshot` | 프로세스가 **끝난 뒤** (한 번 실행하고 끝나는 작업) |
| `notify` 등 | 서비스가 직접 "준비됐다"고 알릴 때 |

- 매뉴얼은 `simple`에서 **`systemctl start`가 바이너리를 실행하지 못해도(예: `User=`가 없거나 바이너리가 없어도) 성공을 보고**할 수 있다고 설명하고, 그래서 대개 **`exec`가 더 낫다**고 합니다. `exec`는 이런 경우 실패를 보고합니다.
- 일회성 작업(백업 스크립트)은 `oneshot`, 계속 떠 있는 서버는 `exec`(또는 `simple`)입니다.

### `Restart=`: 어떤 종료에 다시 띄울 것인가

매뉴얼의 정의입니다. 기본값은 `no`(재시작 안 함)입니다.

| 값 | 재시작하는 경우 |
| --- | --- |
| `no` (기본) | 재시작 안 함 |
| `on-success` | **정상 종료**(종료 코드 0, 또는 `SIGHUP`·`SIGINT`·`SIGTERM`·`SIGPIPE`)일 때만 |
| **`on-failure`** | **0이 아닌 종료 코드**, 위 네 신호를 제외한 **시그널로 죽었을 때**, 동작 시간 초과, 워치독 시간 초과 |
| `on-abnormal` | 시그널로 죽었을 때(위 네 신호 제외), 시간 초과, 워치독 시간 초과 |
| `always` | 어떤 경우에도 |

- **systemd 자신의 조작(서비스 중지·재시작)으로 죽은 경우에는 다시 띄우지 않습니다.** 그래서 `systemctl stop`이 재시작 루프를 만들지 않습니다.
- 서버에는 보통 **`on-failure`** 가 맞습니다. 종료 코드 0으로 끝난 정상 종료를 무한히 다시 띄울 이유가 없기 때문입니다([종료 코드와 시그널](./permissions-and-processes.md#정상-종료sigterm와-강제-종료sigkill)).
- `RestartSec=`은 재시작 전 대기 시간이며 **기본값이 100ms**입니다. 시작 즉시 죽는 프로그램은 거의 대기 없이 계속 재시작되어 **CPU와 로그를 소모**합니다. 몇 초 이상을 지정하고, `RestartSteps=`로 지수 백오프(값 3~5를 권장)를 줄 수도 있습니다.

---

## 예약 실행 1: cron

```
┌──────── 분 (0-59)
│ ┌────── 시 (0-23)
│ │ ┌──── 일 (1-31)
│ │ │ ┌── 월 (1-12)
│ │ │ │ ┌ 요일 (0-7, 일요일 = 0 또는 7)
│ │ │ │ │
* * * * *  실행할 명령
```

```cron
5 0 * * *    $HOME/bin/daily.job >> $HOME/tmp/out 2>&1     # 매일 00:05
15 14 1 * *  $HOME/bin/monthly                              # 매월 1일 14:15
0 22 * * 1-5 notify.sh                                      # 평일 22:00
23 0-23/2 * * * echo "..."                                  # 0시부터 2시간마다 23분에
@daily       $HOME/bin/daily.job                            # @reboot @hourly @daily @weekly @monthly @yearly
```

crontab(5) 매뉴얼이 알려 주는 함정들입니다.

### 1. `%`는 줄바꿈이 된다

명령에 `%`가 있으면 **백슬래시로 이스케이프하지 않는 한 줄바꿈으로 바뀌고, 첫 `%` 뒤의 모든 내용은 명령의 표준 입력**으로 전달됩니다. 그래서 `date +%Y-%m-%d`를 crontab에 그대로 쓰면 동작이 깨집니다.

```cron
# ❌ % 가 줄바꿈으로 해석되어 date 명령이 잘림
0 3 * * * tar czf backup-$(date +%Y%m%d).tgz /data

# ✅ 이스케이프
0 3 * * * tar czf backup-$(date +\%Y\%m\%d).tgz /data
```

(복잡해지면 스크립트 파일로 옮기는 것이 가장 안전합니다.)

### 2. 실행 환경이 최소한이다

cron이 실행하는 명령은 **로그인 셸이 아닙니다.** `SHELL`은 `/bin/sh`, `HOME`과 `LOGNAME`만 crontab 소유자의 `/etc/passwd` 줄에서 설정됩니다(`HOME`과 `SHELL`은 crontab에서 덮어쓸 수 있음). 터미널에서는 되는데 cron에서는 안 되는 대부분의 원인은 **PATH와 환경변수가 다르기 때문**입니다.

- 명령은 **절대 경로**로 씁니다. 필요한 환경변수는 crontab 맨 위에 `VAR=값`으로 선언하거나 스크립트 안에서 설정합니다.
- `/bin/sh`로 실행되므로 bash 전용 문법(`[[ ]]`, 배열)은 쓸 수 없을 수 있습니다([셸 스크립트의 기본](./shell-basics.md)).

### 3. 출력은 메일로 간다

명령의 출력이 있으면 `MAILTO`(비어 있지 않을 때) 주소로 **메일**이 전송됩니다. 메일 시스템이 없는 서버에서는 출력이 조용히 사라지므로, `>> 파일 2>&1`로 **로그 파일에 명시적으로 남기거나** 로깅 시스템으로 보냅니다.

### 4. 일(day of month)과 요일을 둘 다 지정하면 "또는"이다

두 필드가 모두 `*`가 아니면 **둘 중 하나만 맞아도** 실행됩니다. 매뉴얼의 예시 `30 4 1,15 * 5`는 "매월 1일과 15일 **그리고** 매주 금요일" 04:30에 실행됩니다(둘의 교집합이 아닙니다).

### 5. 그 밖에

- 실행한 시각에 시스템이 꺼져 있었다면 **그 실행은 건너뜁니다**(cron은 놓친 실행을 보충하지 않습니다, 일반 개념).
- crontab 파일은 소유자만 쓰기 가능한 일반 파일이어야 합니다(주의 사항).
- 시간대는 시스템 설정을 따르며, 서머타임 지역에서는 존재하지 않거나 두 번 있는 시각을 지정하지 않도록 주의합니다([시간과 타임존](../Programming/datetime.md#개념-3-서머타임dst이-있으면-하루와-24시간이-다르다)).
- 작업이 아직 실행 중일 때 다음 실행 시각이 오면 **겹쳐서 실행**될 수 있습니다. 겹치면 안 되는 작업은 잠금(예: Linux의 `flock`)으로 막습니다(`flock` 동작은 미확인).

---

## 예약 실행 2: systemd timer

타이머는 **타이머 유닛(`.timer`)이 서비스 유닛(`.service`)을 깨우는** 구조입니다. 같은 이름의 두 파일을 만듭니다.

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Run backup nightly

[Timer]
OnCalendar=daily          # 달력(벽시계) 기준
Persistent=true           # 꺼져 있던 동안 놓친 실행을 보충
RandomizedDelaySec=15min  # 실행을 무작위로 퍼뜨림

[Install]
WantedBy=timers.target
```

매뉴얼 기준의 핵심 설정입니다.

| 설정 | 의미 |
| --- | --- |
| `OnCalendar=` | **벽시계** 기준 일정(달력 이벤트 표현식) |
| `OnBootSec=`, `OnUnitActiveSec=` 등 | **단조(monotonic)** 타이머: 부팅 후 N분, 마지막 실행 후 N분처럼 **상대 시간** |
| **`Persistent=true`** | 서비스가 마지막으로 실행된 시각을 **디스크에 저장**하고, 타이머가 활성화될 때 **비활성 중에 놓친 실행이 있으면 즉시 실행**. 꺼져 있던 서버의 실행 보충에 유용 (`OnCalendar=` 타이머에만 효과) |
| `AccuracySec=` | 타이머는 설정한 시각에 **정확히** 만료되지는 않음 (이 값만큼의 오차 허용) |
| `RandomizedDelaySec=` | 0과 지정값 사이의 **무작위 시간만큼 지연**시켜 여러 서버의 부하 집중을 막음 (기본 0) |

---

## cron과 systemd timer 비교

| 항목 | cron | systemd timer |
| --- | --- | --- |
| 설정 | crontab 한 줄 | `.timer` + `.service` 두 파일 |
| **놓친 실행 보충** | 하지 않음 | **`Persistent=true`** |
| 부하 분산 | 직접 | `RandomizedDelaySec=` |
| 환경 | 최소 환경(`/bin/sh`, 제한된 PATH) | 서비스 유닛에서 사용자·환경 지정 |
| 로그 | 메일 또는 직접 리디렉션 | journal 수집 (`journalctl -u`, 미확인) |
| 어디에나 있음 | 거의 모든 Unix | systemd를 쓰는 Linux |

- 단순하고 이식성이 필요하면 cron, **놓친 실행 보충이나 서비스와 같은 방식의 실행 환경·로그**가 필요하면 systemd timer가 맞습니다.
- 컨테이너/오케스트레이터에서는 **Kubernetes CronJob** 같은 별도 수단을 씁니다(이 문서에서 다루지 않음, 미확인).

---

## 🎯 체크리스트

- [ ] 서버를 `&`/`nohup`으로 띄우지 않고 systemd 서비스(또는 컨테이너)로 실행
- [ ] `Type=exec`(계속 떠 있는 서버) / `oneshot`(일회성)
- [ ] `Restart=on-failure` + `RestartSec=` 몇 초 이상
- [ ] 실행 사용자는 root가 아닌 전용 사용자 (`User=`)
- [ ] cron 명령은 절대 경로, 필요한 환경변수 선언, `%`는 `\%`
- [ ] cron 출력은 파일이나 로깅 시스템으로 (메일에 의존하지 않기)
- [ ] 겹치면 안 되는 작업은 잠금으로 중복 실행 방지
- [ ] 놓친 실행을 보충해야 하면 `Persistent=true`
- [ ] 서머타임 경계 시각에 예약하지 않기

## 참고 자료

- [crontab(5) (man7.org)](https://man7.org/linux/man-pages/man5/crontab.5.html) - 필드, `%`의 의미, 기본 환경 변수(`SHELL`, `HOME`, `LOGNAME`), `MAILTO`, 일·요일 규칙, `@` 문자열
- [systemd.service(5)](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html) - `Type=`(`simple`·`exec`·`oneshot` 등), `Restart=`, `RestartSec=`
- [systemd.timer(5)](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html) - `OnCalendar=`, 단조 타이머, `Persistent=`, `AccuracySec=`, `RandomizedDelaySec=`

확인일: 2026-10-23 (crontab(5), systemd.service(5), systemd.timer(5) 매뉴얼에서 확인한 설정과 기본값. 이 환경이 macOS라 cron과 systemd는 실행하지 못했고 모든 동작은 문서 확인에 근거함. `systemctl`·`journalctl`·`crontab -T` 명령의 세부 동작, 유닛 파일 예시의 `After=`·`WantedBy=` 값과 전체 동작, `flock`, cron이 놓친 실행을 보충하지 않는다는 설명, cron과 timer 비교 표의 일부(로그, 환경), Kubernetes CronJob은 일반 개념이거나 미확인. `EnvironmentFile=`과 자원 제한 설정, 소켓 활성화는 다루지 않음)
