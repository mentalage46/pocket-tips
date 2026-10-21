# 산업 이더넷

산업 이더넷은 표준 이더넷 케이블과 칩을 쓰면서 PLC와 I/O·드라이브 사이의 주기적 데이터 교환을 보장하는 프로토콜 묶음입니다. 케이블은 같아도 **실시간을 만드는 방법**이 프로토콜마다 달라서 서로 직접 통하지 않습니다. 이 문서는 주요 5가지 방식을 비교하고, 토폴로지·스위치·TSN·진단을 정리합니다.

## 실시간을 만드는 세 가지 방법

| 방식 | 원리 | 예 |
| --- | --- | --- |
| 표준 TCP/UDP 위에서 | 일반 스위치를 쓰고 UDP로 주기 데이터를 보냄. 스위치 품질·트래픽 관리에 의존 | EtherNet/IP, Modbus TCP |
| 전용 이더넷 프레임 + 우선순위 | IP 계층을 건너뛰는 전용 EtherType 프레임, VLAN 우선순위 사용. 등시성은 전용 하드웨어 | PROFINET RT/IRT, CC-Link IE |
| 프레임 통과 중 처리 | 마스터가 보낸 프레임 하나가 모든 장치를 지나가며 각자 데이터를 읽고 씀 | EtherCAT |

여기에 IEEE 802.1 **TSN**(시간 민감형 네트워킹)이 더해지면서, 표준 스위치 수준에서 시간 동기와 예약 전송을 제공하는 방향으로 수렴하고 있습니다.

## EtherNet/IP

| 항목 | 내용 |
| --- | --- |
| 주관 | ODVA |
| 상위 프로토콜 | CIP(Common Industrial Protocol). DeviceNet·ControlNet과 같은 객체 모델 |
| 명시적 메시징(Explicit) | 요청-응답. 설정·진단·비주기 데이터. TCP 44818(IANA `EtherNet-IP-2`, UDP 44818도 등록) |
| 암시적 메시징(Implicit) | 주기적 I/O. UDP 2222(IANA `EtherNet-IP-1`, "EtherNet/IP I/O"). 유니캐스트 또는 멀티캐스트 |
| 주기 설정 | 연결마다 RPI(Requested Packet Interval)를 지정 |
| 장치 설명 파일 | EDS(Electronic Data Sheet) |
| 확장 | CIP Safety, CIP Motion, CIP Security(IEC 62443 대응), DLR 링 |

- 표준 TCP/IP 스택을 그대로 쓰므로 IT 장비·도구와 섞기 쉽습니다. 대신 멀티캐스트 I/O가 많으면 **IGMP 스누핑이 없는 스위치에서 모든 포트로 퍼져** 망 전체가 느려집니다.
- 방화벽에서 TCP 44818과 UDP 2222를 모두 열어야 I/O 연결이 성립합니다.

## PROFINET

| 항목 | 내용 |
| --- | --- |
| 주관 | PI(PROFIBUS & PROFINET International) |
| 통신 | 설정·비주기는 UDP/IP, 주기 I/O(RT)는 IP를 건너뛰는 전용 프레임(EtherType `0x8892`) |
| IRT | 전용 하드웨어(ASIC)로 예약 시간대 전송. PI 공개 값: 주기 31.25 µs, 지터 1 µs |
| 장치 설명 파일 | GSD 파일. PROFINET은 XML 기반 GSDML |
| 이중화 | MRP(IEC 62439-2) 링 |
| 안전 | PROFIsafe |

**적합성 클래스(Conformance Class)**:

| 클래스 | 추가 기능 | 쓰임 |
| --- | --- | --- |
| CC-A | RT 데이터 교환, 표준 알람·진단, 토폴로지 지원 | 기본 I/O, 빌딩·공정 |
| CC-B | SNMP로 토폴로지·네트워크 통계 조회(진단 강화) | 일반 공장 자동화 |
| CC-C | IRT(등시성 실시간) | 모션 제어 |
| CC-D | PROFINET over TSN | TSN 기반 차세대 |

CC-D는 PI의 PROFINET 명세 V2.4에 TSN 통합과 함께 들어갔고, 2층 동작은 IEC/IEEE 60802 TSN 프로파일을 기반으로 합니다. PI의 일부 소개 페이지는 아직 A~C 세 클래스만 설명하므로 장치 데이터시트에서 지원 클래스를 직접 확인합니다.

## EtherCAT

| 항목 | 내용 |
| --- | --- |
| 주관 | ETG(EtherCAT Technology Group). 현재 문서는 MainDevice/SubDevice 용어 사용 |
| 원리 | 프레임 하나가 모든 SubDevice를 지나가며 통과 중(on the fly) 자기 데이터를 읽고 입력을 끼워 넣음. 마지막 장치에서 되돌아옴 |
| 성능(ETG 공개) | 설계 목표 주기 100 µs 이하, 동기 지터 1 µs 이하, 유효 데이터율 90% 이상 |
| 분산 클록(DC) | 전파 지연을 측정·보정하는 하드웨어 시간 동기. 지터 1 µs보다 훨씬 작음 |
| 토폴로지 | 라인, 트리, 스타, 데이지 체인. 세그먼트당 최대 65,535대, 노드 간 100 m(100BASE-TX) |
| 장치 설명 파일 | ESI(EtherCAT SubDevice Information), XML |
| 표준 | IEC 61158, IEC 61784 |
| 안전 | Safety over EtherCAT(FSoE), IEC 61784-3, SIL 3까지 |
| 파생 | EtherCAT P(통신 + 24V 전원을 4선 케이블 하나로) |

일반 스위치를 중간에 넣을 수 없고, 전용 ASIC(ESC)이 있는 장치끼리 연결합니다. 마스터는 표준 이더넷 포트로 구현할 수 있어 PC 기반 제어에 많이 씁니다.

## CC-Link IE (TSN / Field)

| 항목 | CC-Link IE TSN | CC-Link IE Field |
| --- | --- | --- |
| 주관 | CLPA(CC-Link Partner Association) | CLPA |
| 속도 | 1 Gbps, 100 Mbps | 1 Gbps(1000BASE-T) |
| 실시간 방식 | IEEE 802.1AS 시간 동기(±1 µs), 802.1Qbv 시간 슬롯 | 토큰 패싱 |
| 규모 | (제품별 확인) | 최대 254국(마스터 + 디바이스) |
| 토폴로지 | 라인, 스타, 링 등 | 라인, 스타, 링 |

CC-Link IE TSN은 산업 네트워크 중 처음으로 TSN을 채택했다고 CLPA가 소개합니다. Mitsubishi 계열 PLC와 함께 아시아 지역에서 많이 보입니다(경험칙).

## POWERLINK

| 항목 | 내용 |
| --- | --- |
| 방식 | 관리 노드(MN)가 제어 노드(CN)를 시간 슬롯 안에서 차례로 폴링 |
| 상위 프로토콜 | CANopen 기반 객체 사전. 장치 설명 파일 XDD(EPSG DS 311, CiA 311에서 파생) |
| 안전 | openSAFETY |
| 주관 | EPSG(Ethernet POWERLINK Standardization Group)는 2023-03-31 해산. B&R이 권리·문서·인증 업무를 승계하고 명세를 오픈 소스로 공개 |

신규 프로젝트에서는 지원 제품군과 장기 지원 여부를 먼저 확인합니다.

## 비교표

| 항목 | EtherNet/IP | PROFINET | EtherCAT | CC-Link IE TSN | POWERLINK |
| --- | --- | --- | --- | --- | --- |
| 주관 | ODVA | PI | ETG | CLPA | B&R(구 EPSG) |
| 주기 데이터 전송 | UDP 2222 | 전용 프레임 0x8892 | 전용 프레임(통과 중 처리) | TSN 시간 슬롯 | 폴링 + 시간 슬롯 |
| 일반 스위치 사용 | 가능(관리형 권장) | RT 가능, IRT는 전용 | 장치 사이 불가 | TSN 지원 스위치 | (제품별 확인) |
| 시간 동기 | CIP Sync(IEEE 1588 PTP 기반) | IRT, TSN | 분산 클록 | 802.1AS | MN 기준 |
| 장치 설명 파일 | EDS | GSDML | ESI | CSP+ | XDD |
| 링 이중화 | DLR | MRP | 케이블 이중화 | 링 지원 | (제품별) |
| 안전 | CIP Safety | PROFIsafe | FSoE | (제품별 확인) | openSAFETY |

## 토폴로지와 스위치 선택

| 토폴로지 | 장점 | 주의 |
| --- | --- | --- |
| 스타 | 한 장치 고장이 다른 장치에 영향 없음, 진단 쉬움 | 스위치 고장이 단일 장애점 |
| 라인(데이지 체인) | 배선 짧음. 장치 내장 2포트 스위치 사용 | 중간 장치 전원 차단·고장 시 뒤쪽 전부 끊김 |
| 링 | 한 곳이 끊겨도 반대 방향으로 우회 | 링 관리 프로토콜(MRP·DLR) 필수. 없으면 브로드캐스트 루프 |

**링 이중화 프로토콜**:

| 프로토콜 | 표준·주관 | 쓰는 곳 |
| --- | --- | --- |
| MRP(Media Redundancy Protocol) | IEC 62439-2 | PROFINET, 범용 산업 스위치 |
| DLR(Device Level Ring) | ODVA | EtherNet/IP 장치 수준 링 |
| RSTP | IEEE 802.1D/Q | 범용. 수렴 시간이 길어 실시간 I/O 링에는 부적합한 경우가 많음(경험칙) |

**산업용 스위치 선택 기준**:

| 기능 | 왜 필요한가 |
| --- | --- |
| 관리형(Managed) | 포트별 오류 카운터, 미러링, VLAN, 펌웨어 관리 |
| IGMP 스누핑·쿼리어 | EtherNet/IP 멀티캐스트 I/O가 전 포트로 퍼지는 것을 막음 |
| QoS(802.1p 우선순위) | 실시간 프레임을 일반 트래픽보다 먼저 보냄 |
| LLDP·SNMP | PROFINET 토폴로지 진단(CC-B 이상), 장치 교체 시 이름 자동 할당 |
| 프로토콜 인증 | PROFINET·EtherNet/IP 적합성 인증 스위치 |
| 링 프로토콜 | MRP 매니저/클라이언트, DLR 지원 여부 |
| 환경 사양 | DIN 레일, 넓은 온도 범위, 이중 전원 입력 |

## TSN(Time-Sensitive Networking)

TSN은 하나의 표준이 아니라 IEEE 802.1 작업 그룹이 만든 표준 묶음입니다.

| 표준 | 기능 |
| --- | --- |
| IEEE 802.1AS | 시간 동기(gPTP). 최신판 802.1AS-2025 |
| IEEE 802.1Qbv | 시간 인지 셰이퍼(예약 전송 시간대). 802.1Q-2018에 통합 |
| IEEE 802.1Qbu (+ 802.3br) | 프레임 선점. 긴 일반 프레임을 끊고 급한 프레임 먼저 |
| IEEE 802.1CB | 프레임 복제·제거(무손실 이중화) |
| IEEE 802.1Qcc | 스트림 예약·중앙 설정 강화 |
| IEEE 802.1Qci | 스트림별 필터링·폴리싱 |

**IEC/IEEE 60802(산업 자동화용 TSN 프로파일)**: 위 기능 중 공장에서 쓸 기능·기본값·설정 방식을 정한 공동 표준입니다. IEEE 802.1 TSN 페이지 기준 IEC/IEEE 60802-2026이 2026년 6월 발행되었고, 2026년 9월 개정 프로젝트(PAR)가 새로 승인되었습니다. "아직 초안"이라는 오래된 자료가 많으니 주의합니다.

TSN은 PROFINET·EtherNet/IP·CC-Link IE·OPC UA FX가 **공통 2층으로 함께 쓰는 기반**입니다. TSN만으로 장치끼리 대화하는 것은 아니며, 응용 프로토콜은 여전히 따로 필요합니다.

## 설계·진단 점검표

| 질문 |
| --- |
| 컨트롤러가 지원하는 프로토콜·적합성 클래스와 장치의 지원 범위를 맞춰 보았는가 |
| 장치 설명 파일(EDS·GSDML·ESI) 버전을 장치 펌웨어와 맞췄는가 |
| IP 주소·장치 이름(PROFINET) 할당 규칙과 교체 절차를 문서로 남겼는가 |
| 제어망을 별도 VLAN·서브넷으로 분리했는가 |
| 멀티캐스트 I/O가 있으면 IGMP 스누핑·쿼리어를 켰는가 |
| 링 구성이면 링 매니저를 한 곳만 지정하고, 링을 끊어 우회되는지 시험했는가 |
| 스위치 포트 오류 카운터(CRC, 충돌, 드롭)를 주기적으로 확인하는가 |
| 케이블 등급(Cat5e 이상, 차폐)·커넥터(RJ45·M12)·최대 길이(100 m)를 지켰는가 |
| 문제 발생 시 미러링 포트로 Wireshark 캡처를 할 수 있는가 |

## 흔한 실수

| 증상 | 원인 | 대응 |
| --- | --- | --- |
| I/O가 가끔 끊기고 망 전체가 느림 | EtherNet/IP 멀티캐스트 + 비관리형 스위치 | IGMP 스누핑, 유니캐스트 연결로 변경 |
| PROFINET 장치 교체 후 통신 안 됨 | 장치 이름(NameOfStation) 미할당 | 토폴로지 기반 자동 이름 할당 설정 또는 교체 절차 문서화 |
| 링을 만들었더니 망 전체가 마비 | 링 관리 프로토콜 없이 루프 형성 | MRP·DLR 설정 후 링을 닫음 |
| EtherCAT 중간에 일반 스위치 넣음 | 통과 중 처리 구조와 맞지 않음 | EtherCAT 전용 junction 장치 사용 |
| 사무 PC를 제어망에 직접 연결 | 브로드캐스트·업데이트 트래픽·보안 위험 | 엔지니어링 PC 전용 포트·VLAN, 방화벽 |

## 참고 자료

- [ODVA - EtherNet/IP](https://www.odva.org/technology-standards/key-technologies/ethernet-ip/) - CIP, UDP 주기 전송, DLR, CIP Safety/Motion/Security
- [IANA - port 44818](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=44818), [port 2222](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=2222) - `EtherNet-IP-2` 메시징, `EtherNet-IP-1` I/O
- [PI - PROFINET Conformance Classes](https://us.profinet.com/profinet-conformance-classes/) - CC-A/B/C, IRT 31.25 µs·지터 1 µs
- [PI - PROFINET over TSN](https://www.profibus.com/technologies/profinet-over-tsn) - V2.4 TSN 통합 명세 발행, IEC/IEEE 60802 기반
- [PI - GSDML Specification](https://www.profibus.com/download/gsdml-gsdx-specification-for-profinet) - GSD/GSDML
- [RFC 8519 - ietf-ethertypes YANG 모듈](https://www.rfc-editor.org/rfc/rfc8519) - PROFINET 0x8892 (2차 확인)
- [ETG - EtherCAT Technology](https://www.ethercat.org/en/technology.html) - 통과 중 처리, 성능 목표, DC, 65,535대, ESI, IEC 61158/61784, FSoE, EtherCAT P
- [CLPA - CC-Link IE TSN](https://www.cc-link.org/en/cclink/cclinkie/cclinkie_tsn.html) - 1 Gbps/100 Mbps, 802.1AS ±1 µs, 802.1Qbv
- [CLPA - CC-Link IE Field 사양](https://in.cc-link.org/en/cclink/cclinkie/cclinkie_f_spec.html) - 1 Gbps, 토큰 패싱, 254국
- [CLPA - CSP+](https://am.cc-link.org/en/cclink/cspplus/index) - CC-Link 계열 XML 장치 프로파일
- [B&R - EPSG DS 311 XML Device Description](https://no-cdn.br-automation.com/fileadmin/EPSG_311_V-1-2-1_DS-3cb4f6a7.pdf) - XDD
- [Automation.com - Application of IEEE 1588 to Industrial Automation](https://www.automation.com/article/application-of-ieee-1588-to-industrial-automation) - CIP Sync가 IEEE 1588 기반(2차 출처)
- [B&R - POWERLINK Service & Downloads](https://www.br-automation.com/en/technologies/powerlink/service-downloads/) - EPSG 2023-03-31 해산, B&R 승계
- [IEEE 802.1 TSN Task Group](https://1.ieee802.org/tsn/) - 802.1AS-2025, Qbv·Qbu·Qci의 802.1Q 통합, CB, Qcc
- [IEC/IEEE 60802 프로젝트 페이지](https://1.ieee802.org/tsn/iec-ieee-60802/), [IEEE SA P60802](https://standards.ieee.org/ieee/60802/12698) - 60802-2026 발행(2026-06), 2026-09-25 개정 PAR

확인일: 2026-10-21 (단체·포트·EtherType·성능 수치·표준 상태·장치 설명 파일을 확인. CIP Sync는 2차 출처로 확인. 스위치 선택·토폴로지 권장은 경험칙)

관련: [필드버스 개요](./fieldbus-overview.md), [서브넷](../../Network/subnet.md), [OT 보안](../safety/ot-security.md)

다음: [OPC UA와 MQTT](./opc-ua-and-mqtt.md)
