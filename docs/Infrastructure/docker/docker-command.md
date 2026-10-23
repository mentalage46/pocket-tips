# Docker Commands

> 이 문서는 명령어 모음입니다. 이미지·컨테이너·레이어의 개념은 [Docker & Dockerfile](./docker.md#개념-컨테이너는-무엇이고-이미지는-어떻게-만들어지는가)을 먼저 봅니다.

## 개념: 명령어 뒤의 객체와 생명주기

Docker 명령은 **네 가지 객체**를 다룹니다. 어떤 객체에 대한 명령인지 알면 이름을 외우지 않아도 추측할 수 있습니다.

| 객체 | 무엇인가 | 수명 | 대표 명령 |
| --- | --- | --- | --- |
| **이미지** | 읽기 전용 템플릿(레이어) | 지우기 전까지 | `build`, `pull`, `images`, `rmi` |
| **컨테이너** | 이미지를 실행한 프로세스 | **임시**(삭제하면 안의 쓰기 내용도 사라짐) | `run`, `ps`, `stop`, `rm`, `exec`, `logs` |
| **볼륨** | 컨테이너 밖에 두는 저장소 | 컨테이너와 **별개** | `volume ls/create/prune` |
| **네트워크** | 컨테이너 간 통신망 | 지우기 전까지 | `network ls/create` |

```
이미지 --docker run--> 컨테이너(실행 중) --docker stop--> 컨테이너(중지됨) --docker rm--> 삭제
                                          └ docker start 로 다시 실행 가능
```

- **중지된 컨테이너는 남아 있습니다.** `docker ps`에는 안 보이지만 `docker ps -a`에는 보입니다. 쌓이지 않게 일회성 실행은 `--rm`을 씁니다.
- **데이터를 남겨야 하면 볼륨(또는 바인드 마운트)** 을 씁니다. 컨테이너를 지우면 컨테이너 안에 쓴 파일도 함께 사라집니다.
- `docker stop`은 컨테이너의 메인 프로세스에 `SIGTERM`을 보내고, **유예 시간(Linux 기본 10초) 안에 끝나지 않으면 `SIGKILL`** 로 강제 종료합니다(`-t`로 조정, 이미지의 `STOPSIGNAL`로 신호 변경 가능). 앱이 `SIGTERM`을 처리하지 못하면 매번 10초를 기다린 뒤 강제 종료되고, 그 사이 요청과 연결이 끊깁니다([Dockerfile의 exec form](./docker.md#dockerfile-명령의-의미를-정확히)).

## 조심해야 하는 명령

| 명령 | 위험 | 안전하게 |
| --- | --- | --- |
| `docker run -p 3000:3000` | IP를 생략하면 **모든 호스트 인터페이스(`0.0.0.0`)에 공개**되어 외부에서 접근 가능 | 로컬에서만 쓰면 `-p 127.0.0.1:3000:3000` |
| `docker rm -f $(docker ps -aq)` | 실행 중인 것을 포함한 **모든 컨테이너** 강제 삭제 | 먼저 `docker ps -a`로 대상 확인 |
| `docker rmi $(docker images -q)` | 모든 이미지 삭제 (다시 받아야 함) | 필요한 이미지만 |
| `docker system prune -a` | **사용하지 않는 모든 이미지**까지 삭제. 기본 `prune`은 중지된 컨테이너, 미사용 네트워크, dangling 이미지, 미사용 빌드 캐시를 지움 | 먼저 `docker system df`로 확인 |
| `docker system prune --volumes` | 미사용 **익명 볼륨**도 삭제 (이름 있는 볼륨은 대상이 아니라고 문서화됨) | 익명 볼륨에 데이터가 있었는지 확인 |
| `docker volume prune` | 기본은 **익명 볼륨만** 삭제. `--all`/`-a`를 주면 **이름 있는 볼륨까지** 삭제 | `-a`는 데이터 손실 가능, 확인 후 사용 |

### 포트 공개는 방화벽을 우회할 수 있다

Docker는 컨테이너 트래픽을 `nat` 테이블에서 처리하므로 **패킷이 방화벽 규칙이 적용되기 전에 라우팅**됩니다. 그래서 `ufw`로 막아 두었어도 `-p`로 공개한 포트는 열릴 수 있습니다(Docker 공식 문서). 외부에 공개할 필요가 없는 DB·캐시는 `-p 127.0.0.1:5432:5432`처럼 바인딩 주소를 지정하거나 `-p` 없이 같은 네트워크 안에서만 연결합니다.

### 로그는 기본적으로 무한히 쌓인다

기본 로깅 드라이버 `json-file`은 `max-size`가 `-1`(무제한)이고 `max-file`은 `max-size`가 있어야만 의미가 있어서, **회전이 꺼진 상태**입니다. 오래 도는 컨테이너가 로그로 디스크를 채울 수 있으므로 크기 제한을 설정합니다.

```bash
docker run -d --log-opt max-size=10m --log-opt max-file=3 myapp
```

`docker logs`는 컨테이너의 **stdout/stderr**를 보여 줍니다. 앱이 파일에만 로그를 쓰면 보이지 않으므로 stdout으로 출력합니다([로깅: 이벤트 스트림](../../Observability/logging.md#로그는-이벤트-스트림이다-twelve-factor)).

### `--env-file`은 Compose의 `env_file`과 규칙이 다를 수 있다

`docker run --env-file`은 한 줄에 `VAR=값`을 쓰고 `#`로 시작하는 줄은 주석입니다. 줄 중간의 `#`은 **값의 일부**가 됩니다(`VAR=a#b` → `a#b`). 값을 따옴표로 감쌌을 때 따옴표를 어떻게 처리하는지는 이 문서에서 확인하지 못했으니(미확인) `.env` 파일을 여러 도구가 공유한다면 따옴표 없이 씁니다. 비밀을 이미지에 넣지 않고 실행 시 주입하는 방법은 [환경변수 관리](../../Security/env-management.md#docker-환경)를 참고합니다.

---

## 이미지 관련

```bash
# 이미지 빌드
docker build -t myapp:latest .
docker build -t myapp:v1.0 -f Dockerfile.prod .

# 이미지 목록
docker images
docker images -a  # 모든 이미지

# 이미지 삭제
docker rmi myapp:latest
docker rmi $(docker images -q)  # 모든 이미지 삭제

# 이미지 pull/push
docker pull nginx:alpine
docker push myrepo/myapp:latest

# 이미지 태그
docker tag myapp:latest myrepo/myapp:v1.0

# 이미지 히스토리 (레이어)
docker history myapp:latest

# 사용하지 않는 이미지 정리
docker image prune
docker image prune -a  # 사용하지 않는 모든 이미지
```

---

## 컨테이너 관련

```bash
# 컨테이너 실행
docker run myapp
docker run -d myapp                    # 백그라운드
docker run -p 3000:3000 myapp          # 포트 매핑
docker run -v $(pwd):/app myapp        # 볼륨 마운트
docker run --name mycontainer myapp    # 이름 지정
docker run --rm myapp                  # 종료 시 자동 삭제
docker run -it myapp /bin/sh           # 인터랙티브 쉘

# 환경변수
docker run -e NODE_ENV=production myapp
docker run --env-file .env myapp

# 컨테이너 목록
docker ps         # 실행 중
docker ps -a      # 모든 컨테이너

# 컨테이너 중지/시작/재시작
docker stop <container>
docker start <container>
docker restart <container>

# 컨테이너 삭제
docker rm <container>
docker rm -f <container>              # 강제 삭제
docker rm $(docker ps -aq)            # 모든 컨테이너 삭제

# 실행 중인 컨테이너 접속
docker exec -it <container> /bin/sh
docker exec -it <container> bash

# 로그 확인
docker logs <container>
docker logs -f <container>            # 실시간
docker logs --tail 100 <container>    # 마지막 100줄

# 컨테이너 정보
docker inspect <container>

# 리소스 사용량
docker stats
docker stats <container>
```

---

## 자주 쓰는 조합

```bash
# 빌드 + 실행 (개발)
docker build -t myapp . && docker run --rm -p 3000:3000 myapp

# 로그 확인하며 백그라운드 실행
docker run -d --name myapp -p 3000:3000 myapp && docker logs -f myapp

# 컨테이너 안에서 명령 실행
docker exec -it myapp npm run migrate

# 파일 복사
docker cp myapp:/app/logs ./logs      # 컨테이너 → 호스트
docker cp ./config myapp:/app/config  # 호스트 → 컨테이너
```

---

## 시스템 관리

```bash
# 전체 시스템 정보
docker system df

# 전체 정리 (미사용 리소스)
docker system prune
docker system prune -a --volumes      # 미사용 이미지 전체 + 익명 볼륨까지 (이름 있는 볼륨은 제외)

# 네트워크
docker network ls
docker network create mynetwork
docker network connect mynetwork mycontainer

# 볼륨
docker volume ls
docker volume create myvolume
docker volume prune                   # 미사용 익명 볼륨만 (이름 있는 볼륨까지는 --all)
```

---

## 🎯 자주 쓰는 명령어 Quick Reference

| 작업 | 명령어                                       |
| ---- | -------------------------------------------- |
| 빌드 | `docker build -t <name> .`                   |
| 실행 | `docker run -d -p <host>:<container> <name>` |
| 목록 | `docker ps -a`                               |
| 중지 | `docker stop <container>`                    |
| 삭제 | `docker rm <container>`                      |
| 로그 | `docker logs -f <container>`                 |
| 접속 | `docker exec -it <container> /bin/sh`        |
| 정리 | `docker system prune -a`                     |

---

## 트러블슈팅

```bash
# 컨테이너가 바로 종료될 때 - 로그 확인
docker logs <container>

# 컨테이너 내부 확인 (디버깅)
docker run -it --entrypoint /bin/sh myapp

# 포트 충돌 확인
docker ps --format "table {{.Names}}\t{{.Ports}}"

# 디스크 공간 부족 (먼저 docker system df 로 원인 확인. 로그가 큰 경우 --log-opt max-size 설정)
docker system prune -a --volumes
```

## 참고 자료

- [docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/) - `SIGTERM` 후 유예 시간(Linux 기본 10초) 뒤 `SIGKILL`, `--timeout`, `STOPSIGNAL`
- [docker system prune](https://docs.docker.com/reference/cli/docker/system/prune/) - 기본 삭제 대상, `-a`, `--volumes`(익명 볼륨)
- [docker volume prune](https://docs.docker.com/reference/cli/docker/volume/prune/) - 기본 익명 볼륨만, `--all`
- [docker container run](https://docs.docker.com/reference/cli/docker/container/run/) - `-p` 기본 바인딩(모든 인터페이스), `--rm`과 익명 볼륨, `--env-file` 형식
- [Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) - 방화벽 규칙보다 먼저 라우팅되는 Docker 트래픽
- [json-file logging driver](https://docs.docker.com/engine/logging/drivers/json-file/) - 기본 드라이버, `max-size` 기본 무제한

확인일: 2026-10-22 (위 Docker 공식 문서에서 확인한 명령 동작과 기본값. Docker 데몬이 이 환경에서 실행 중이 아니어서 명령을 실제로 실행해 검증하지는 못함. 객체 모델과 생명주기 설명, 컨테이너 쓰기 내용이 삭제와 함께 사라진다는 점은 일반 개념. `--env-file`의 따옴표 처리, `-p`로 공개한 포트가 `ufw`를 우회하는 구체적 조건, 이 문서 위쪽 명령 예시 전체는 미확인)
