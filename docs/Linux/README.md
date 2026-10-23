# Linux

서버와 개발 환경에서 쓰는 **Linux·셸의 기본 개념**입니다. 이 노트의 실행 확인은 macOS에서 했으므로, BSD와 GNU의 차이는 각 문서에 따로 표시했습니다.

- [셸 스크립트의 기본과 함정](./shell-basics.md) - 종료 코드, `set -e`의 예외, 따옴표와 단어 분리, 리다이렉션 순서, `xargs`, macOS(BSD)와 Linux(GNU) 도구 차이
- [파일 권한과 프로세스](./permissions-and-processes.md) - rwx와 8진수, 디렉터리의 `r`·`x`, `umask`, SIGTERM·SIGKILL과 종료 코드 143·137
- [서비스 관리와 예약 실행](./services-and-scheduling.md) - systemd 서비스 유닛(`Type=`, `Restart=`), cron의 함정(`%`, 환경, 일·요일 규칙), systemd timer(`Persistent=`)

관련: [네트워크 진단 명령](../Network/diagnostics.md), [Docker 명령어](../Infrastructure/docker/docker-command.md), [Makefile](../Utility/makefile.md)
