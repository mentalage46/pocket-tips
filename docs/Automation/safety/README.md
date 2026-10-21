# 안전과 보안

PLC로 만드는 **안전 기능**(비상정지, 가드 인터록, 라이트 커튼, STO)과 **OT 보안**을 정리합니다. 개념 → 장치 → 보안 순서로 읽습니다.

> **면책**: 이 폴더의 문서는 학습용 정리입니다. 적용 표준의 원문, 법령, 자격을 갖춘 안전 기술자의 검토를 대신하지 않습니다. 한국에서는 산업안전보건법과 산업안전보건기준에 관한 규칙을 따르며, 안전인증대상기계등은 고용노동부 안전인증(KCs)을 받아야 하고 자율안전확인 신고 대상도 있습니다. 해외 수출 설비는 해당 지역 규정(예: EU 기계 규정)을 따릅니다. 문서의 공식·수치로 실제 설비의 안전 거리나 등급을 정하지 않습니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [기능 안전 기초](./functional-safety.md) | ISO 12100 리스크 평가, IEC 61508·IEC 62061·ISO 13849-1·IEC 61511 관계, PLr 결정, 카테고리·MTTFD·DCavg·CCF, SIL-PL 대응, SISTEMA, 안전 PLC 주의점, EU 기계 규정 |
| 2 | [비상정지와 인터록](./emergency-stop-and-interlock.md) | ISO 13850 원칙, 정지 카테고리 0/1/2, 안전 릴레이(듀얼 채널, EDM, 리셋), 안전 통신, ISO 14119 인터록 타입 1~5, ISO 13855 안전 거리, STO |
| 3 | [OT 보안](./ot-security.md) | IT와 OT의 차이, Purdue 모델과 DMZ, IEC 62443(존·콘딧, SL), Stuxnet~2026년 PLC 공격 사례, 실무 대책, CRA·NIS2·CISA·ATT&CK for ICS |

표준 판, 규제 적용일, 사례 정보는 2026-10-21 기준입니다. 표준 개정(ISO 12100, ISO 13850)과 EU 조화 표준 목록이 진행 중이므로 6개월이 지나면 각 문서의 참고 자료로 다시 확인합니다.

## 먼저 알면 좋은 것

- [I/O 결선과 신호](../basics/io-wiring.md) - 24V 입력, 접점, 출력 종류
- [스캔 사이클](../basics/scan-cycle.md) - 응답 시간이 안전 거리에 들어가는 이유
- [액추에이터 기초](../../Hardware/modules/actuator-basics.md) - 모터, 릴레이, 솔레노이드

## 관련 지식

- [산업 통신](../communication/README.md) - 안전 통신이 올라가는 네트워크
- [알람 관리](../hmi-scada/alarm-management.md) - 안전 이벤트 표시와 알람
- [Security](../../Security/README.md), [AI 보안](../../AI/security/README.md) - 일반 보안 원칙
- [Network](../../Network/README.md) - 서브넷, 라우터, 게이트웨이
