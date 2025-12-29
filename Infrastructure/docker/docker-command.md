# Docker Commands

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
docker system prune -a --volumes      # 모든 것 정리

# 네트워크
docker network ls
docker network create mynetwork
docker network connect mynetwork mycontainer

# 볼륨
docker volume ls
docker volume create myvolume
docker volume prune                   # 미사용 볼륨 정리
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

# 디스크 공간 부족
docker system prune -a --volumes
```
