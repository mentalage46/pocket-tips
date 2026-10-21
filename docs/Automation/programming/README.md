# PLC 프로그래밍

IEC 61131-3 표준을 기준으로 PLC 프로그램을 작성하는 방법을 정리합니다. 표준 개요 → 래더 기본 회로 → 시퀀스·상태 머신 → 최신 실무(버전 관리·테스트·AI) 순서로 읽습니다.

소프트웨어 개발 경험이 있다면 [IEC 61131-3 개요](./iec-61131-3.md)의 ST 예제와 [시퀀스 패턴](./sequence-patterns.md)부터 읽고, 현장 래더는 [래더 기초](./ladder-basics.md)의 래더 ↔ ST 대응표로 익혀도 됩니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [IEC 61131-3 개요](./iec-61131-3.md) | 판 역사(2013 OOP, 2025 4판), 5개 언어 비교, POU, 태스크·리소스, 데이터 타입, 변수 섹션, 직접 주소, ST 예제 |
| 2 | [래더 기초](./ladder-basics.md) | 래더 읽는 법, a/b 접점, 자기유지, SET/RESET, 엣지, TON·TOF·TP, CTU·CTD·CTUD, 정역 인터록, 듀얼 코일, 래더 ↔ ST |
| 3 | [시퀀스 패턴](./sequence-patterns.md) | 스텝 시퀀스, `CASE` 상태 머신, SFC, 타임아웃, 인터록과 허가 조건, 운전 모드, 비상정지 후 복구, ISA-88, PackML |
| 4 | [최신 실무: 버전 관리·테스트·AI](./modern-practices.md) | PLC 코드 Git 관리, 제조사별 도구, 단위 테스트, 가상 시운전, PLC CI/CD, IEC 61499, 가상 PLC, AI 코파일럿 |

제품 이름·버전·상태 정보는 2026-10-21 기준입니다. 6개월이 지나면 각 문서의 참고 자료로 다시 확인합니다.

## 관련 지식

- [PLC 기초](../basics/README.md) - PLC 구조, 스캔 사이클, I/O 결선
- [안전과 보안](../safety/README.md) - 비상정지와 인터록, 기능 안전
- [제조사와 도구](../vendors/README.md) - 제조사별 주소 체계와 엔지니어링 도구
- [펌웨어의 시간과 상태 관리](../../Hardware/firmware/timing-and-state.md) - 임베디드 관점의 상태 머신과 타임아웃
- [CI/CD](../../Infrastructure/cicd/README.md), [Version Control System](../../Version%20Control%20System/README.md)
