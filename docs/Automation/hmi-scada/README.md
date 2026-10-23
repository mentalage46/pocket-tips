# HMI·SCADA

운전자가 설비를 보고 조작하는 화면(HMI), 여러 설비를 모아 감시·기록하는 시스템(SCADA)을 정리합니다. 화면 설계 → 알람 관리 → 태그와 시스템 구성 순서로 읽습니다.

화면을 만들어 본 적이 없다면 [HMI 화면 설계](./hmi-design.md)부터, 이미 운영 중인 시스템의 알람이 너무 많다면 [알람 관리](./alarm-management.md)부터 읽어도 됩니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [HMI 화면 설계](./hmi-design.md) | HMI·SCADA·MES 구분, ISA-101·IEC 63303, 고성능 HMI 원칙, 화면 계층 Level 1~4, 조작·권한 설계, 터치·색각 이상·다국어, 안티패턴 |
| 2 | [알람 관리](./alarm-management.md) | ISA-18.2·IEC 62682·EEMUA 191, 생애주기, 알람 철학, 우선순위, 성능 지표, 알람 상태와 셸빙·억제, 합리화, PLC 측 데드밴드·지연·1차 원인 |
| 3 | [태그와 SCADA 구성](./tags-and-architecture.md) | 태그 명명(ISA-5.1·UNS), UDT, 스케일링, OPC UA 품질 코드, 서버·이중화, 히스토리안 압축, 웹 HMI, 플랫폼 현황과 선택 기준 |

표준 판·제품 버전·라이선스 정보는 2026-10-21 기준입니다. 6개월이 지나면 각 문서의 참고 자료로 다시 확인합니다.

## 관련 지식

- [PLC 기초](../basics/README.md), [통신](../communication/README.md), [안전](../safety/README.md)
- [색상](../../UX/visual/color.md), [피드백과 상태](../../UX/components/feedback-and-states.md), [디자인 시스템](../../UX/systems/design-system.md)
- [로깅](../../Observability/logging.md), [메시지 큐](../../Data/messaging/message-queue.md)
