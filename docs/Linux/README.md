# Linux

서버와 개발 환경에서 쓰는 **Linux·셸의 기본 개념**입니다. 이 노트의 실행 확인은 macOS에서 했으므로, BSD와 GNU의 차이는 각 문서에 따로 표시했습니다.

- [셸 스크립트의 기본과 함정](./shell-basics.md) - 종료 코드, `set -e`의 예외, 따옴표와 단어 분리, 리다이렉션 순서, `xargs`, macOS(BSD)와 Linux(GNU) 도구 차이
- [파일 권한과 프로세스](./permissions-and-processes.md) - rwx와 8진수, 디렉터리의 `r`·`x`, `umask`, SIGTERM·SIGKILL과 종료 코드 143·137
- [서비스 관리와 예약 실행](./services-and-scheduling.md) - systemd 서비스 유닛(`Type=`, `Restart=`), cron의 함정(`%`, 환경, 일·요일 규칙), systemd timer(`Persistent=`)
- [파일 시스템과 링크](./filesystem-and-links.md) - inode, 하드·심볼릭 링크, `mv`와 `cp`, 삭제됐지만 열린 파일, `df`/`du`, 파일 디스크립터, 디렉터리 구조
- [텍스트 처리 레시피](./text-processing.md) - grep·awk·sed·sort·uniq·cut·jq로 로그 분석, 로케일에 따른 정렬 차이, BSD·GNU 차이
- [시스템 진단](./system-diagnostics.md) - load average, `free`의 available, OOM killer, `ss`, `journalctl`, 증상별 확인 순서
- [SSH와 원격 작업](./ssh-and-remote.md) - 호스트 키 경고, 원격 명령의 따옴표, 포트 포워딩(`-L`/`-R`/`-D`), `scp`·`rsync`, `~/.ssh/config`

관련: [네트워크 진단 명령](../Network/diagnostics.md), [Docker 명령어](../Infrastructure/docker/docker-command.md), [Makefile](../Utility/makefile.md)
