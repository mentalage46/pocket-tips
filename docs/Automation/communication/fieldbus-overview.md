# 필드버스와 산업 통신 개요

산업 통신은 사무실 네트워크와 목표가 다릅니다. 사무실 네트워크는 **평균 처리량**을 중시하지만, 공장 네트워크는 **정해진 시간 안에 반드시 도착하는지**(결정성)를 중시합니다. 이 문서는 산업 통신의 계층, 기술 변천, 주요 프로토콜 비교와 선택 기준을 정리합니다.

## 왜 산업 통신이 따로 있나

| 개념 | 뜻 | 왜 중요한가 |
| --- | --- | --- |
| 결정성(Determinism) | 데이터가 최악의 경우에도 정해진 시간 안에 도착함 | 비상정지·인터록·모션 동기는 "보통 빠름"이 아니라 "항상 늦지 않음"이 필요 |
| 주기(Cycle time) | 컨트롤러와 장치가 I/O 데이터를 한 번 교환하는 간격 | PLC 스캔·드라이브 제어 루프와 맞물림 |
| 지터(Jitter) | 주기가 매번 얼마나 흔들리는지 | 다축 모션은 평균 주기보다 지터가 품질을 좌우 |
| 내환경성 | 노이즈, 진동, 온도, 긴 배선 | 차동 신호(RS-485), 차폐 케이블, M12 커넥터 사용 |
| 진단 | 단선·장치 고장을 어디서 났는지 알려 줌 | 생산 중단 시간을 줄임 |

일반 TCP/IP는 재전송·혼잡 제어로 지연이 들쭉날쭉합니다. 그래서 산업 이더넷은 UDP·전용 이더넷 프레임·하드웨어 처리·시간 동기 같은 방법으로 주기와 지터를 관리합니다. 자세한 방식은 [산업 이더넷](./industrial-ethernet.md)에서 다룹니다.

## 통신 계층과 Purdue 모델

공장 네트워크는 보통 Purdue 모델(PERA)의 계층으로 설명합니다. ISA-95(IEC 62264)가 이 모델을 바탕으로 기업 시스템과 제어 시스템의 경계를 정의하고, OT 보안에서는 IEC 62443의 영역(zone)·통로(conduit) 설계에 활용합니다.

| 레벨 | 이름 | 예 | 주로 쓰는 통신 |
| --- | --- | --- | --- |
| 4 | 엔터프라이즈 | ERP, 클라우드 분석 | IT 네트워크, MQTT, REST |
| 3 | 운영(수퍼바이저리 상단) | MES, 히스토리안 | OPC UA, MQTT, SQL |
| 2 | 수퍼바이저리 | SCADA, HMI | OPC UA, Modbus TCP, 벤더 프로토콜 |
| 1 | 컨트롤 | PLC, DCS 컨트롤러 | EtherNet/IP, PROFINET, EtherCAT, CC-Link IE |
| 0 | 필드·프로세스 | 센서, 액추에이터, 드라이브 | IO-Link, 4–20 mA, Modbus RTU, PROFIBUS |

레벨 번호와 묶는 방식은 문서마다 조금씩 다릅니다. 계층은 "어디까지 실시간이 필요한가, 어디서 보안 경계를 나누는가"를 정하는 도구로 쓰면 충분합니다. 보안 경계 설계는 [OT 보안](../safety/ot-security.md)을 참고합니다.

## 기술 흐름: 시리얼 필드버스 → 산업 이더넷 → TSN

```text
1980~1990년대  시리얼 필드버스    Modbus RTU, PROFIBUS DP, CANopen, DeviceNet
                                  RS-485·CAN, 수십 kbit/s ~ 수 Mbit/s, 장치 수·거리 제한
2000년대~      산업 이더넷        Modbus TCP, EtherNet/IP, PROFINET, EtherCAT, CC-Link IE, POWERLINK
                                  100 Mbit/s~1 Gbit/s, 표준 이더넷 케이블, 진단·IT 연계 쉬움
2020년대~      TSN·SPE           IEEE 802.1 TSN으로 실시간·일반 트래픽을 한 망에서 공존
                                  단일 쌍 이더넷(10BASE-T1L, Ethernet-APL)으로 필드 말단까지 이더넷
```

IEC 61158(필드버스 프로토콜 정의)과 IEC 61784(프로파일)는 여러 필드버스·산업 이더넷을 "타입"으로 함께 담고 있는 표준 묶음입니다. 하나의 통일 표준이 아니라 여러 방식이 공존한다는 뜻입니다.

### 대표 시리얼 필드버스

| 이름 | 주관 | 물리층 | 속도 | 비고 |
| --- | --- | --- | --- | --- |
| Modbus RTU | Modbus Organization | RS-485(또는 RS-232) | 9600·19200 bps 필수, 19200이 기본값 | 단순, 거의 모든 장비가 지원. [Modbus](./modbus.md) 참고 |
| PROFIBUS DP | PI(PROFIBUS & PROFINET International) | RS-485 | 9.6 kbit/s ~ 12 Mbit/s | IEC 61158/61784 Type 3. 공정용 PROFIBUS PA는 MBP 31.25 kbit/s 고정 |
| CANopen | CiA(CAN in Automation) | CAN(ISO 11898) | CANopen CC 10 kbit/s ~ 1 Mbit/s | 객체 사전, PDO·SDO·NMT. 후속은 CAN FD 기반 CANopen FD |
| DeviceNet | ODVA | CAN | (미확인) | 상위층은 CIP. EtherNet/IP와 같은 객체 모델 |

RS-485·RS-232의 전기적 차이는 [UART 문서](../../Hardware/interfaces/uart.md)를 참고합니다.

## IO-Link: 센서 레벨 점대점 통신

IO-Link는 필드버스가 아니라 **마스터 포트 하나와 장치 하나를 잇는 점대점(point-to-point) 디지털 인터페이스**입니다. IEC 61131-9로 표준화되었습니다.

```text
PLC ──(PROFINET/EtherNet/IP/EtherCAT 등)── IO-Link 마스터 ─┬─ 포트1: 근접 센서
                                                          ├─ 포트2: 압력 센서
                                                          └─ 포트3: 밸브 터미널
```

| 항목 | 내용 |
| --- | --- |
| 표준 | IEC 61131-9 |
| 속도 | 4.8 / 38.4 / 230.4 kBaud |
| 케이블 | 비차폐 표준 3선(포트 Class B는 5선), 최대 20 m |
| 장치 설명 파일 | IODD(IO Device Description) |
| 장점 | 기존 센서 배선 그대로 디지털 값·파라미터·진단 전달, 교체 시 파라미터 자동 복원 |
| 무선 | IO-Link Wireless가 IEC 61139-3:2023으로 표준화(2023년 11월) |
| 안전 | IO-Link Safety. 상위로는 PROFIsafe·CIP Safety·FSoE로 연결 |

IO-Link 마스터는 상위 필드버스의 한 노드로 붙기 때문에 "상위는 어떤 산업 이더넷을 쓰든 하위 센서 배선은 IO-Link로 통일"하는 구성이 흔합니다(경험칙).

## 최신 동향: 단일 쌍 이더넷(SPE)과 Ethernet-APL

| 기술 | 내용 |
| --- | --- |
| IEEE 802.3cg(2019) | 한 쌍의 도선으로 10 Mbit/s 이더넷과 선택적 전원 공급. 현재는 IEEE 802.3 본문에 통합 |
| 10BASE-T1L | 장거리 점대점, 약 1 km |
| 10BASE-T1S | 단거리, 멀티드롭(버스) 구성 가능 |
| Ethernet-APL | 10BASE-T1L 위의 공정 자동화용 응용 프로파일. 2선 전원 공급, 트렁크-스퍼 구조, 본질 안전(방폭 지역) 지원, 1000 m 케이블 |

Ethernet-APL은 FieldComm Group, ODVA, OPC Foundation, PI가 함께 추진합니다. 4–20 mA·HART·PROFIBUS PA가 쓰이던 공정 계측 말단까지 PROFINET·EtherNet/IP·OPC UA를 바로 가져가는 것이 목표입니다. 모든 Ethernet-APL 장치는 10BASE-T1L 호환이지만, 10BASE-T1L 장치가 곧 APL 장치는 아닙니다.

## 주요 프로토콜 비교

| 프로토콜 | 주관 단체 | 물리층 | 성능 지표(단체 공개 값) | 주로 보이는 곳(경험칙) |
| --- | --- | --- | --- | --- |
| Modbus RTU | Modbus Organization | RS-485 | 19200 bps 기본 | 계측기, 인버터, 전력량계 |
| Modbus TCP | Modbus Organization | 이더넷(TCP 502) | 규정 없음(요청-응답) | 범용 연동, SCADA |
| PROFIBUS DP | PI | RS-485 | 최대 12 Mbit/s | 유럽·Siemens 기반 기존 설비 |
| CANopen | CiA | CAN | 최대 1 Mbit/s | 소형 기계, 모션, 이동체 |
| EtherNet/IP | ODVA | 이더넷 | 규정 값 없음(RPI로 설정) | 북미·Rockwell 기반 |
| PROFINET | PI | 이더넷 | IRT 31.25 µs 주기, 지터 1 µs | 유럽·Siemens 기반 |
| EtherCAT | ETG | 이더넷(100BASE-TX 등) | 설계 목표 주기 100 µs 이하, 동기 지터 1 µs 이하 | 모션, 고속 I/O, Beckhoff |
| CC-Link IE TSN | CLPA | 이더넷 1 Gbps/100 Mbps | 시간 동기 ±1 µs | 아시아·Mitsubishi 기반 |
| IO-Link | IO-Link Community | 비차폐 3선 | 최대 230.4 kBaud | 센서·액추에이터 말단 |

성능 수치는 각 단체가 최적 조건에서 제시한 값입니다. 실제 주기는 장치 수, 데이터 크기, 스위치, 컨트롤러 성능에 따라 달라지므로 프로토콜끼리 숫자만으로 비교하지 않습니다.

## 선택 기준

| 질문 | 판단 |
| --- | --- |
| PLC 제조사가 무엇인가 | 가장 큰 결정 요인입니다. 컨트롤러의 기본 내장 프로토콜을 쓰면 도구·진단 지원이 가장 좋습니다(경험칙) |
| 모션 동기가 필요한가 | 다축 동기는 EtherCAT, PROFINET IRT, CC-Link IE TSN, EtherNet/IP(CIP Motion)처럼 시간 동기를 지원하는 방식이 필요 |
| 주기·지터 요구가 얼마인가 | 수십 ms면 Modbus TCP도 충분, 1 ms 이하·저지터면 전용 산업 이더넷 |
| 장치가 이미 무엇을 지원하는가 | 인버터·계측기는 Modbus RTU/TCP만 지원하는 경우가 많음 |
| 방폭·장거리 공정 계측인가 | PROFIBUS PA, HART, Ethernet-APL 검토 |
| 센서 말단 배선을 줄이고 싶은가 | IO-Link 마스터 + 상위 산업 이더넷 |
| 상위 시스템(IT)과 연결이 목적인가 | 제어망 프로토콜을 그대로 올리지 말고 OPC UA·MQTT 게이트웨이로 분리. [OPC UA와 MQTT](./opc-ua-and-mqtt.md) 참고 |

## 흔한 실수

| 실수 | 문제 | 대응 |
| --- | --- | --- |
| 산업 이더넷 장비를 사무실 비관리형 스위치에 연결 | 멀티캐스트 폭주, 진단 불가 | IGMP 스누핑·진단을 지원하는 산업용 관리형 스위치 사용 |
| 프로토콜 이름만 보고 호환된다고 판단 | 같은 PROFINET이라도 적합성 클래스·기능이 다름 | 장치 설명 파일(GSDML, EDS, ESI, IODD)과 인증 여부 확인 |
| 제어망과 IT망을 평면으로 연결 | 브로드캐스트·보안 사고가 제어망에 바로 영향 | 계층별로 분리하고 게이트웨이·방화벽을 둠 |
| 주기를 짧을수록 좋다고 설정 | CPU·네트워크 부하 증가, 다른 장치 지연 | 공정에 필요한 최소 주기로 설정 |

## 점검표

| 질문 |
| --- |
| 각 통신 구간의 필요한 주기와 허용 지터를 숫자로 정했는가 |
| PLC가 기본 지원하는 프로토콜과 장치가 지원하는 프로토콜을 표로 맞춰 보았는가 |
| 장치 설명 파일과 인증(적합성 시험) 여부를 확인했는가 |
| 제어망·정보망·외부망의 경계와 연결 지점을 그렸는가 |
| 케이블 길이·차폐·접지·종단 같은 물리층 조건을 확인했는가 |

## 참고 자료

- [Modbus Serial Line Protocol and Implementation Guide V1.02](https://www.modbus.org/file/secure/modbusoverserial.pdf) - 9600·19200 bps 필수, 19200 기본값
- [Wikipedia - PROFIBUS](https://en.wikipedia.org/wiki/Profibus) - DP 9.6 kbit/s~12 Mbit/s, PA MBP 31.25 kbit/s, IEC 61158/61784 Type 3 (PI 설치 가이드라인 인용, 2차 출처)
- [CiA - CANopen](https://www.can-cia.org/can-knowledge/canopen) - CiA 301, 10~1000 kbit/s, CANopen FD
- [ODVA - DeviceNet](https://www.odva.org/technology-standards/key-technologies/devicenet/) - CAN + CIP
- [IO-Link - Technology](https://io-link.com/technology) - IEC 61131-9, 4.8/38.4/230.4 kBaud, IODD, IO-Link Safety
- [Pepperl+Fuchs - IO-Link 기술 문서](https://files.pepperl-fuchs.com/webcat/navi/productInfo/doct/tdoct6495a_eng.pdf) - 비차폐 3/5선 최대 20 m, 포트 Class A/B
- [PI - IO-Link Wireless is now an international IEC standard](https://www.profibus.com/newsroom/press-news/io-link-wireless-is-now-an-international-iec-standard) - IEC 61139-3:2023
- [IEEE 802.3cg-2019](https://standards.ieee.org/ieee/802.3cg/7308/) - 단일 쌍 10 Mb/s, 2020-02 발행, 현재 superseded
- [Ethernet-APL - Technology](https://www.ethernet-apl.org/technology/) - 2선, 1000 m, 본질 안전, 참여 단체
- [ISA-95 Standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) - Purdue 모델 기반, IEC 62264
- [PI - PROFINET Conformance Classes](https://us.profinet.com/profinet-conformance-classes/) - IRT 31.25 µs, 지터 1 µs
- [ETG - EtherCAT Technology](https://www.ethercat.org/en/technology.html) - 주기 100 µs 이하·지터 1 µs 이하 설계 목표, IEC 61158/61784
- [CLPA - CC-Link IE TSN](https://www.cc-link.org/en/cclink/cclinkie/cclinkie_tsn.html) - 1 Gbps/100 Mbps, 802.1AS ±1 µs

확인일: 2026-10-21 (속도·표준 번호·단체·성능 수치를 확인. DeviceNet 속도는 1차 출처를 찾지 못해 미확인. 지역·벤더 분포와 선택 기준은 경험칙)

관련: [Modbus](./modbus.md), [산업 이더넷](./industrial-ethernet.md), [PLC 구조와 형태](../basics/plc-architecture.md)

다음: [Modbus](./modbus.md)
