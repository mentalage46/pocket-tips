# 산업 통신 용어

[전체 용어 색인](./README.md)

## 통신 기본 개념

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| 결정성 / Determinism | 데이터가 최악의 경우에도 정해진 시간 안에 도착하는 성질입니다. 사무실 네트워크가 평균 처리량을 중시한다면 공장 네트워크는 "보통 빠름"이 아니라 "항상 늦지 않음"을 중시합니다. |
| 통신 주기·지터 / Cycle time, Jitter | 주기는 컨트롤러와 장치가 I/O 데이터를 한 번 교환하는 간격이고, 지터는 그 주기가 매번 흔들리는 정도입니다. 다축 모션에서는 평균 주기보다 지터가 품질을 좌우합니다. |
| Purdue 모델 / Purdue model, PERA | 공장 네트워크를 레벨 0(필드)부터 레벨 4(엔터프라이즈)까지 계층으로 나누는 참고 모델입니다. 레벨 번호와 묶는 방식은 문서마다 조금씩 다르며, 보안 설계에서는 IT와 OT 사이에 DMZ(레벨 3.5)를 둡니다. |
| ISA-95 / IEC 62264 | Purdue 모델을 바탕으로 기업 시스템과 제어 시스템의 경계를 정의한 표준입니다. MQTT 토픽이나 태그 경로를 기업/사이트/영역/라인/셀 순으로 짤 때도 기준으로 씁니다. |
| 장치 설명 파일 / Device description file | 장치의 데이터와 파라미터를 엔지니어링 도구에 알려 주는 파일로, PROFINET은 GSDML, EtherNet/IP는 EDS, EtherCAT은 ESI, IO-Link는 IODD, CC-Link IE는 CSP+, POWERLINK는 XDD를 씁니다. 파일 버전을 장치 펌웨어와 맞추고 인증 여부도 확인합니다. |
| 토폴로지 / Star, Line, Ring topology | 장치를 잇는 형태입니다. 라인은 중간 장치가 꺼지면 뒤쪽이 모두 끊기고, 링은 MRP·DLR 같은 링 관리 프로토콜 없이 닫으면 브로드캐스트 루프로 망 전체가 마비됩니다. |
| 관리형 스위치·IGMP 스누핑 / Managed switch, IGMP snooping | 포트별 오류 카운터, 미러링, VLAN, QoS, 멀티캐스트 제어를 지원하는 스위치와, 멀티캐스트를 필요한 포트에만 보내는 기능입니다. EtherNet/IP 멀티캐스트 I/O를 IGMP 스누핑이 없는 스위치에 물리면 모든 포트로 퍼져 망 전체가 느려집니다. |

관련 문서: [필드버스와 산업 통신 개요](../communication/fieldbus-overview.md), [산업 이더넷](../communication/industrial-ethernet.md)

## 필드버스와 IO-Link

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| 필드버스 / Fieldbus | 컨트롤러와 현장 장치를 잇는 산업용 디지털 통신으로, RS-485·CAN 기반 시리얼 방식에서 시작했습니다. Modbus RTU, PROFIBUS DP, CANopen, DeviceNet이 대표 예이며 IEC 61158·IEC 61784에 여러 방식이 "타입"으로 함께 들어 있습니다. |
| RS-485 | 시리얼 필드버스가 많이 쓰는 차동 신호 물리층입니다. Modbus 시리얼 명세는 데이지 체인 배선을 요구하고 긴 스터브·스타 배선을 금지하며, D0/D1(A/B) 표기가 제조사마다 반대인 경우가 있습니다. |
| PROFIBUS DP·PA | PI가 주관하는 RS-485 기반 필드버스(DP)와 공정 계측용 변형(PA)입니다. PA는 MBP 물리층의 31.25 kbit/s 고정 속도를 씁니다. |
| CANopen | CiA가 주관하는 CAN 기반 프로토콜로 객체 사전과 PDO·SDO·NMT를 씁니다. 후속은 CAN FD 기반 CANopen FD입니다. |
| IO-Link | 마스터 포트 하나와 센서·액추에이터 하나를 잇는 점대점 디지털 인터페이스로 IEC 61131-9로 표준화되었습니다. 필드버스가 아니며, IO-Link 마스터가 상위 산업 이더넷의 한 노드로 붙어 기존 센서 배선으로 값·파라미터·진단을 전달합니다. |
| 단일 쌍 이더넷 / Single Pair Ethernet, SPE | 한 쌍의 도선으로 10 Mbit/s 이더넷과 선택적 전원을 보내는 기술(IEEE 802.3cg)입니다. 10BASE-T1L은 약 1 km 장거리 점대점, 10BASE-T1S는 단거리 멀티드롭 구성용입니다. |
| Ethernet-APL | 10BASE-T1L 위의 공정 자동화용 응용 프로파일로, 2선 전원 공급과 방폭 지역용 본질 안전을 지원합니다. 모든 Ethernet-APL 장치는 10BASE-T1L 호환이지만 10BASE-T1L 장치가 곧 APL 장치는 아닙니다. |

관련 문서: [필드버스와 산업 통신 개요](../communication/fieldbus-overview.md), [Modbus](../communication/modbus.md)

## Modbus

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| Modbus RTU·ASCII·TCP | 같은 요청-응답 PDU를 시리얼 바이너리(RTU, CRC-16), 시리얼 16진수 문자(ASCII, LRC), TCP 포트 502(TCP)로 보내는 변형입니다. RTU는 3.5문자 이상의 무신호 구간으로 프레임을 나누므로 USB-RS485 변환기나 OS가 바이트를 모아 보내면 프레임이 잘리거나 붙습니다. |
| 클라이언트·서버 / Client, Server | 요청을 보내는 쪽(구 마스터)과 응답하는 장치(구 슬레이브)입니다. Modbus Organization은 2020년에 표현을 바꿨지만 시리얼 명세와 많은 장비 매뉴얼에는 master/slave, slave address가 남아 있습니다. |
| 코일·디스크리트 입력 / Coil, Discrete Input | 1비트 데이터 테이블입니다. 코일은 읽기·쓰기가 되고, 디스크리트 입력은 읽기 전용입니다. |
| 입력·홀딩 레지스터 / Input Register, Holding Register | 16비트 데이터 테이블입니다. 입력 레지스터는 읽기 전용 측정값에, 홀딩 레지스터는 읽기·쓰기 설정값·파라미터에 주로 씁니다. |
| Modicon식 주소 표기 / 0xxxx·1xxxx·3xxxx·4xxxx | 맨 앞 자리 숫자로 테이블을 나타내는 관례 표기로, 이 숫자는 프로토콜에 들어가지 않습니다. 40001은 홀딩 레지스터 1번이라 실제 요청은 FC 03, PDU 주소 0이며, 일부 매뉴얼은 6자리(400001)를 씁니다. |
| PDU 주소 / PDU address | 요청에 실제로 들어가는 0부터 시작하는 주소입니다. 값이 한 칸씩 밀려 보이면 매뉴얼 표기가 1-based인지 0-based인지와 도구의 기본값부터 확인합니다. |
| 함수 코드 / Function Code, FC | 읽기·쓰기 동작과 대상 테이블을 정하는 코드로 FC 03은 홀딩 레지스터 읽기, FC 16은 여러 레지스터 쓰기입니다. 한 번에 읽을 수 있는 레지스터는 125개이므로 연속 주소로 맵을 설계하면 폴링이 빨라집니다. |
| 예외 응답 / Exception response | 서버가 요청을 처리할 수 없을 때 함수 코드 + 0x80과 예외 코드로 보내는 응답입니다. 예외 코드 02(ILLEGAL DATA ADDRESS)는 오프셋 착오가 대표 원인이고, 응답이 아예 없으면 예외가 아니라 타임아웃입니다. |
| 워드 순서 / Word order, ABCD·CDAB | 32비트 정수·실수를 레지스터 2개로 보낼 때 어느 레지스터가 상위 워드인지의 순서입니다. 명세가 정하지 않아 장비마다 다르므로 알려진 값을 써 넣고 ABCD·CDAB·BADC·DCBA 네 가지로 해석해 맞는 것을 찾습니다. |
| MBAP 헤더·Unit ID / MBAP header, Unit ID | Modbus TCP의 7바이트 헤더와, 그 안에서 TCP-시리얼 게이트웨이 뒤의 RTU 장치를 지정하는 필드입니다. 게이트웨이 뒤 장치가 응답하지 않으면 Unit ID를 시리얼 장치 주소로 맞췄는지 확인합니다. |
| 종단·바이어스 저항 / Termination, Bias resistor | RS-485 트렁크 양 끝에 다는 종단 저항과 버스당 한 곳에 다는 편향 저항입니다. 빠지면 가끔 CRC 오류가 나는 식으로 간헐적인 증상이 생깁니다. |
| Modbus/TCP Security / mbaps | MBAP 프레임을 TLS로 감싼 보안 변형으로 TCP 802를 쓰고 인증서로 상호 인증합니다. 지원 장비가 적어 평문 Modbus TCP는 인증이 없다는 점을 전제로 제어망 안에만 두는 경우가 많습니다. |

관련 문서: [Modbus](../communication/modbus.md)

## 산업 이더넷

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| 산업 이더넷 / Industrial Ethernet | 표준 이더넷 케이블과 칩으로 PLC와 I/O·드라이브 사이의 주기적 데이터 교환을 보장하는 프로토콜 묶음입니다. 케이블이 같아도 실시간을 만드는 방법이 달라 프로토콜끼리 직접 통하지 않습니다. |
| EtherNet/IP·CIP / Common Industrial Protocol | ODVA가 주관하는 산업 이더넷과 그 상위 객체 모델입니다. 표준 TCP/IP 스택을 그대로 써서 IT 장비와 섞기 쉽지만, 방화벽에서 TCP 44818과 UDP 2222를 모두 열어야 I/O 연결이 성립합니다. |
| 암시적·명시적 메시징 / Implicit, Explicit messaging | EtherNet/IP의 주기 I/O 통신(UDP 2222)과 설정·진단용 요청-응답 통신(TCP 44818)입니다. 암시적 메시징은 유니캐스트 또는 멀티캐스트로 보냅니다. |
| RPI / Requested Packet Interval | EtherNet/IP 연결마다 지정하는 I/O 갱신 주기입니다. Rockwell Logix에서는 I/O 값이 이 주기로 프로그램과 비동기로 갱신됩니다. |
| PROFINET RT·IRT | PI가 주관하는 산업 이더넷의 주기 통신 방식입니다. RT는 IP를 건너뛰는 전용 프레임(EtherType 0x8892)을 쓰고, IRT는 전용 하드웨어로 예약 시간대에 전송합니다. |
| 적합성 클래스 / Conformance Class, CC-A·B·C·D | PROFINET 장치가 지원하는 기능 수준입니다. CC-C가 IRT, CC-D가 PROFINET over TSN이며, 같은 PROFINET이라도 기능이 다르므로 데이터시트에서 지원 클래스를 직접 확인합니다. |
| 장치 이름 / NameOfStation | PROFINET이 장치를 식별하는 이름입니다. 장치를 교체한 뒤 통신이 안 되면 이름 미할당을 먼저 의심하고, 토폴로지 기반 자동 할당이나 교체 절차를 문서로 남깁니다. |
| EtherCAT | ETG가 주관하는 산업 이더넷으로 프레임 하나가 모든 장치를 지나가며 통과 중에 데이터를 읽고 씁니다. 장치 사이에 일반 스위치를 넣을 수 없고 분산 클록(DC)으로 하드웨어 시간 동기를 하며, 현재 문서는 MainDevice·SubDevice라는 용어를 씁니다. |
| CC-Link IE TSN·Field | CLPA가 주관하는 산업 이더넷입니다. TSN은 IEEE 802.1AS 시간 동기와 시간 슬롯 전송을, Field는 토큰 패싱을 씁니다. |
| POWERLINK | 관리 노드가 제어 노드를 시간 슬롯 안에서 차례로 폴링하는 산업 이더넷입니다. 주관 단체 EPSG가 2023년에 해산하고 B&R이 승계했으므로 신규 프로젝트에서는 지원 제품군과 장기 지원을 먼저 확인합니다. |
| MRP·DLR / Media Redundancy Protocol, Device Level Ring | 링 이중화 프로토콜로 MRP는 IEC 62439-2(PROFINET, 범용 산업 스위치), DLR은 ODVA의 EtherNet/IP 장치 수준 링입니다. 링 매니저는 한 곳만 지정하고, 링을 끊어 우회되는지 시험합니다. |
| TSN / Time-Sensitive Networking | 시간 동기, 예약 전송, 프레임 선점 등을 담은 IEEE 802.1 표준 묶음입니다. PROFINET·EtherNet/IP·CC-Link IE·OPC UA FX가 공통 2층으로 쓰는 기반이며, 산업용 프로파일 IEC/IEEE 60802는 2026년 6월에 발행되었으므로 "아직 초안"이라는 오래된 자료에 주의합니다. |

관련 문서: [산업 이더넷](../communication/industrial-ethernet.md)

## OPC UA와 MQTT

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| OPC UA / Unified Architecture | OPC Foundation의 플랫폼 독립 통신 규격(IEC 62541)으로 기본 포트는 TCP 4840입니다. 정보 모델·보안·메서드·이력·알람을 내장해, Windows COM/DCOM에 묶여 있던 OPC Classic(DA·HDA·A&E)을 대체합니다. |
| 주소 공간·노드 / Address space, Node, NodeId | OPC UA 서버가 데이터를 노드와 참조로 된 그래프로 보여 주는 구조와 그 구성 요소입니다. 노드는 `ns=2;s=Line1.Motor1.Speed` 같은 NodeId로 식별하고, 타입을 정의하면 같은 종류 설비가 같은 구조를 가집니다. |
| 보안 모드·보안 정책 / Security mode, Security policy | OPC UA 엔드포인트의 보호 수준(None, Sign, SignAndEncrypt)과 암호 알고리즘 묶음입니다. 운영에서는 None과 익명 로그인을 끄고 SignAndEncrypt만 남기며, Basic128Rsa15·Basic256 정책은 폐기되었습니다. |
| 애플리케이션 인스턴스 인증서 / Application instance certificate | OPC UA 애플리케이션을 식별하는 X.509 인증서입니다. 서로의 인증서를 신뢰 목록에 등록해야 연결되고, "모두 자동 수락"으로 두면 중간자 공격에 무방비가 되며 만료일도 관리해야 합니다. |
| PubSub | 발행자가 구독자를 모른 채 메시지를 내보내는 OPC UA 통신 모델(Part 14)입니다. UDP·Ethernet 매핑은 제어망 안의 주기 통신에, MQTT 매핑은 브로커를 통한 상위 전송에 씁니다. |
| OPC UA FX / Field eXchange | OPC UA를 컨트롤러·필드 장치 사이 실시간 통신까지 넓히는 규격입니다. 컨트롤러 간(C2C) 명세는 완료됐지만 제품이 적어 신규 설계에서 FX를 전제로 삼지 않습니다. |
| MQTT | 브로커를 중심으로 한 경량 발행-구독 프로토콜로 TCP 1883, TLS 8883을 씁니다. 클라이언트가 브로커로 나가는 연결만 만들면 되므로 OT 쪽에 인바운드 포트를 열지 않아도 되며, 평문 1883은 테스트 외에는 쓰지 않습니다. |
| 브로커·토픽 / Broker, Topic | 메시지를 중계하는 서버와 `/`로 구분한 메시지 주소입니다. 구독할 때 `+`는 한 단계, `#`는 하위 전체를 뜻하는 와일드카드이며, `#` 구독 권한은 ACL로 제한합니다. |
| MQTT QoS / Quality of Service 0·1·2 | 최대 한 번, 최소 한 번, 정확히 한 번 전달을 보장하는 수준입니다. 클라이언트와 브로커 사이 한 구간의 보장이라 발행자에서 구독자까지 전체 경로는 양쪽 중 낮은 QoS를 따릅니다. |
| Retained 메시지 / Retained message | 브로커가 토픽의 마지막 메시지를 보관했다가 새 구독자에게 즉시 전달하는 기능입니다. 현재 상태·설정값에 쓰고, 모든 값을 retain으로 고정 주기 발행하면 브로커 부하가 커집니다. |
| LWT / Last Will | 클라이언트가 비정상 종료하면 브로커가 대신 발행하는 메시지입니다. 없으면 게이트웨이가 죽어도 마지막 값이 정상처럼 보이므로 오프라인 감지에 씁니다. |
| Sparkplug B | 산업용 MQTT의 토픽·페이로드·상태 관리 규칙을 정한 Eclipse 명세로 ISO/IEC 20237:2023으로 표준화되었습니다. 페이로드는 Google Protocol Buffers이고 토픽은 `spBv1.0/그룹/메시지 유형/엣지 노드/[장치]` 구조로 고정되어 있습니다. |
| BIRTH·DEATH 메시지 / NBIRTH, DBIRTH, NDEATH, DDEATH | Sparkplug에서 노드·장치가 온라인이 될 때 모든 메트릭 이름·타입·현재값을 보내고, 오프라인이 되면 알리는 메시지입니다. 이후 DATA 메시지는 바뀐 값만 보내며(Report by Exception), NDEATH가 MQTT Will로 등록되어 있어 SCADA가 값을 즉시 통신 불량(stale)으로 표시할 수 있습니다. |
| UNS / Unified Namespace | 공장의 현재 상태를 하나의 브로커에 계층형 토픽으로 모으고 모든 시스템이 점대점 연결 대신 그곳에 발행·구독하게 하는 아키텍처 개념입니다. 표준이 아니라 업계 용어이며, Sparkplug의 고정 3단계 토픽은 ISA-95식 깊은 계층과 그대로 맞지 않습니다. |

관련 문서: [OPC UA와 MQTT](../communication/opc-ua-and-mqtt.md), [태그와 SCADA 구성](../hmi-scada/tags-and-architecture.md)
