# PLC 기초

PLC가 무엇이고 어떻게 동작하며, 현장 신호를 어떻게 연결하는지 정리합니다. 하드웨어 구조 → 실행 모델 → 결선 순서로 읽으면 프로그래밍 문서의 래더 동작과 듀얼 코일 규칙이 왜 그런지 이해할 수 있습니다.

전압·전류·옴의 법칙이 낯설다면 [전기 기초](../../Hardware/basics/electrical-basics.md)부터 읽습니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [PLC 구조와 형태](./plc-architecture.md) | 릴레이 반에서 PLC로 넘어온 역사, 구성 요소와 메모리, 일체형·모듈형·안전 PLC·PAC·소프트/가상 PLC·이중화, PLC vs MCU vs 산업용 PC, 선정 점검표, 가상 PLC 등 최신 동향 |
| 2 | [스캔 사이클과 응답 시간](./scan-cycle.md) | 입력 리프레시·실행·출력 리프레시, 프로세스 이미지와 비동기 I/O, 최악 응답 시간 계산, 워치독, 태스크 종류, 직접 I/O 접근, 듀얼 코일 등 순서 버그 |
| 3 | [I/O 결선과 신호](./io-wiring.md) | IEC 61131-2 입력 Type 1/2/3, 싱크·소스 용어 혼동, NPN/PNP와 2선·3선 센서, 릴레이·트랜지스터·트라이액 출력, 서지 보호, 4–20mA와 NE 43, a/b접점과 페일세이프, 노이즈 대책, 배선 점검 순서 |

제품·표준 정보는 2026-10-21 기준입니다. 각 문서의 참고 자료로 다시 확인합니다.

## 다음 단계

- [프로그래밍](../programming/README.md) - IEC 61131-3 언어, 래더 기본 회로, 시퀀스 패턴
- [산업 통신](../communication/README.md) - 필드버스, Modbus, 산업용 이더넷

## 관련 지식

- [기본 부품](../../Hardware/basics/components.md), [전원과 배선](../../Hardware/basics/power-and-wiring.md)
- [GPIO](../../Hardware/interfaces/gpio.md), [아날로그와 PWM](../../Hardware/interfaces/analog-and-pwm.md)
- [출력 장치 기초](../../Hardware/modules/actuator-basics.md), [센서 기초](../../Hardware/modules/sensor-basics.md)
