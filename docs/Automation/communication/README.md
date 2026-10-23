# 산업 통신

PLC가 센서·드라이브·HMI·상위 시스템과 데이터를 주고받는 방법을 정리합니다. 필드버스 전체 지도 → Modbus → 산업 이더넷 → OPC UA·MQTT 순서로 읽으면 현장 장비에서 클라우드까지 데이터가 흐르는 경로를 따라갈 수 있습니다.

PC에서 PLC 값을 처음 읽어 보는 것이 목표라면 [Modbus](./modbus.md)부터 읽어도 됩니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [필드버스와 산업 통신 개요](./fieldbus-overview.md) | 결정성·주기·지터, Purdue 계층, 시리얼 필드버스 → 산업 이더넷 → TSN 흐름, IO-Link, SPE·Ethernet-APL, 프로토콜 선택 기준 |
| 2 | [Modbus](./modbus.md) | RTU·ASCII·TCP, 데이터 모델, 함수·예외 코드, 주소 오프셋, 워드 순서, CRC·MBAP, Modbus/TCP Security, pymodbus 예제 |
| 3 | [산업 이더넷](./industrial-ethernet.md) | EtherNet/IP·PROFINET·EtherCAT·CC-Link IE·POWERLINK 비교, 링 이중화(MRP·DLR), TSN과 IEC/IEEE 60802, 설계·진단 점검표 |
| 4 | [OPC UA와 MQTT](./opc-ua-and-mqtt.md) | OPC UA 정보 모델·보안·PubSub·FX, MQTT QoS·retained·LWT, Sparkplug B, Unified Namespace, IT/OT 연결 구조 |

포트 번호·명세 버전·라이브러리 API는 2026-10-21 기준입니다. 6개월이 지나면 각 문서의 참고 자료로 다시 확인합니다.

## 한눈에 보는 위치

```text
엔터프라이즈 (ERP, 클라우드)        ← MQTT/Sparkplug, OPC UA, REST
수퍼바이저리 (SCADA, MES, 히스토리안) ← OPC UA, MQTT, Modbus TCP
컨트롤 (PLC, DCS)                  ← EtherNet/IP, PROFINET, EtherCAT, CC-Link IE
필드 (센서, 드라이브, 리모트 I/O)    ← IO-Link, Modbus RTU, PROFIBUS, CANopen
```

## 관련 지식

- [UART와 RS-232/485 전기 규격](../../Hardware/interfaces/uart.md)
- [네트워크 프로토콜(TCP/UDP)](../../Network/protocol.md), [서브넷](../../Network/subnet.md)
- [메시지 큐](../../Data/messaging/message-queue.md) - 브로커 기반 비동기 통신의 일반 개념
- [HMI·SCADA](../hmi-scada/README.md), [OT 보안](../safety/ot-security.md)
