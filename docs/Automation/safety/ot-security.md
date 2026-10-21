# OT 보안

OT(Operational Technology)는 PLC, HMI, SCADA, 드라이브처럼 **물리 공정을 제어하는 시스템**입니다. OT 보안 사고는 데이터 유출에서 끝나지 않고 설비 정지, 품질 사고, 인명 사고로 이어질 수 있습니다. 이 문서는 IT 보안과 다른 점, Purdue 모델과 IEC 62443의 구조, 실제 공격 사례, 현장에서 할 수 있는 대책과 규제 동향을 정리합니다.

일반 웹·애플리케이션 보안은 [Security](../../Security/README.md), AI 시스템 보안은 [AI 보안](../../AI/security/README.md)을 참고합니다.

## 1. IT와 OT의 우선순위 차이

| 항목 | IT | OT |
| --- | --- | --- |
| 우선순위 | 기밀성 → 무결성 → 가용성 | **안전·가용성** → 무결성 → 기밀성 |
| 수명 | 3–5년 | 10–20년 이상 (경험칙) |
| 패치 | 자동 업데이트, 정기 재부팅 | 정지 계획에 맞춰 검증 후 적용. 자동 업데이트가 운전을 방해할 수 있음 |
| 실시간성 | 지연 수백 ms도 허용 | ms 단위 주기 통신, 스캔 타임 영향 |
| 프로토콜 | 인증·암호화 기본 | Modbus, 구형 S7comm처럼 인증이 없거나 약한 프로토콜이 많음 |
| 보안 도구 | 에이전트 설치, 능동 스캔 | 에이전트 설치 어려움. 능동 스캔이 구형 장치를 멈추게 할 수 있음 |
| 장애 영향 | 서비스 중단, 데이터 손실 | 설비 손상, 환경 사고, 인명 피해 |

- OT에서 보안 조치는 **안전 기능을 해치지 않아야** 합니다. 예: 계정 잠금 정책 때문에 비상 시 운전자가 HMI에 로그인하지 못하면 안 됩니다.
- 반대로 보안 사고가 안전 기능을 무력화할 수 있습니다. ISO 13849-1:2023은 IT 보안을 다루지 않지만 안전 기능에 영향을 줄 수 있다고 적고 IEC TS 63074(안전 관련 제어 시스템의 보안 측면)를 안내합니다. 기능 안전은 [기능 안전 기초](./functional-safety.md)를 참고합니다.

## 2. Purdue 모델과 DMZ

Purdue 모델(PERA)과 ISA-95(IEC 62264) 레벨은 공장 네트워크를 계층으로 나누는 데 널리 쓰는 참고 모델입니다. 표준이 강제하는 구조는 아니지만 존(zone)을 나누는 출발점으로 좋습니다.

```text
Level 5  기업 네트워크, 클라우드          ┐
Level 4  사업장 IT (ERP, 메일)            ┘ IT
─────────────── 방화벽 ───────────────
Level 3.5  IT/OT DMZ                       ← 히스토리안 복제본, 패치 서버, 원격 접속 점프 호스트
─────────────── 방화벽 ───────────────
Level 3  사이트 운영 (MES, 히스토리안, 엔지니어링 서버)  ┐
Level 2  감시 제어 (HMI, SCADA, 엔지니어링 워크스테이션) │ OT
Level 1  기본 제어 (PLC, 안전 PLC, RTU, 드라이브)      │
Level 0  물리 공정 (센서, 액추에이터)                  ┘
```

- **IT와 OT 사이에는 직접 통신을 두지 않고** DMZ를 거칩니다. IT에서 OT로 들어오는 연결은 DMZ의 점프 호스트에서 끊고 다시 맺습니다.
- 데이터는 가능하면 OT → DMZ 방향으로 밀어냅니다(push). 히스토리안 복제, OPC UA 게이트웨이를 DMZ에 둡니다. 프로토콜은 [OPC UA와 MQTT](../communication/opc-ua-and-mqtt.md)를 참고합니다.
- 안전 시스템(SIS, 안전 PLC 네트워크)은 일반 제어망과 다시 분리하는 것이 좋습니다(경험칙). TRITON 사례가 이유를 보여 줍니다.
- IIoT·클라우드 연동으로 레벨 경계가 흐려지는 추세라, 레벨보다 **존과 콘딧**(IEC 62443)으로 설계하는 경우가 늘고 있습니다. 서브넷·라우팅 기초는 [서브넷](../../Network/subnet.md), [게이트웨이](../../Network/gateway.md)를 봅니다.

## 3. IEC 62443 시리즈

IEC 62443(ISA/IEC 62443)은 산업 자동화·제어 시스템(IACS) 보안 표준 시리즈입니다. 자산 소유자, 시스템 통합자, 제품 공급자, 서비스 공급자의 역할을 나눠 요구사항을 정합니다.

| 그룹 | 대상 | 주요 부(판) |
| --- | --- | --- |
| 1 일반 | 용어, 개념, 모델 | 1-1 용어·개념·모델 |
| 2 정책·절차 | 자산 소유자, 서비스 공급자 | **2-1:2024** 자산 소유자 보안 프로그램(2판, 성숙도 모델), 2-3 패치 관리(TR), **2-4:2023** 서비스 공급자 요구사항 |
| 3 시스템 | 시스템 통합자 | **3-2:2020** 시스템 설계를 위한 보안 리스크 평가(존·콘딧 분할), **3-3:2013** 시스템 보안 요구사항과 보안 레벨 |
| 4 컴포넌트 | 제품 공급자 | **4-1:2018** 보안 제품 개발 수명주기(SDL), **4-2:2019** 컴포넌트 기술 보안 요구사항 |

### 존과 콘딧

- **존(zone)**: 보안 요구가 비슷한 자산의 묶음. 예: 라인 1 제어 존, 안전 시스템 존, 엔지니어링 존.
- **콘딧(conduit)**: 존 사이의 통제된 통신 경로. 존 사이 연결은 모두 정의된 콘딧이어야 하고, 콘딧에도 보안 요구를 정합니다.
- 3-2는 대상 시스템(SuC)을 존·콘딧으로 나누고 각각의 목표 보안 레벨(SL-T)을 정하는 리스크 평가 절차입니다.

### 보안 레벨(SL)

| SL | 막아야 할 위협 |
| --- | --- |
| 1 | 우발적·우연한 오용 |
| 2 | 단순한 수단, 적은 자원, 일반 기술을 가진 고의적 공격 |
| 3 | IACS 전문 기술과 중간 수준 자원을 가진 정교한 공격 |
| 4 | IACS 전문 기술과 많은 자원을 가진 정교한 공격(국가 수준) |

- **SL-T**(목표), **SL-C**(제품·시스템이 낼 수 있는 능력), **SL-A**(실제 달성) 세 가지로 구분합니다.
- 3-3(시스템)과 4-2(컴포넌트)는 7가지 기본 요구사항(FR)별로 SL에 따른 요구를 정합니다: 식별·인증 제어(IAC), 사용 제어(UC), 시스템 무결성(SI), 데이터 기밀성(DC), 데이터 흐름 제한(RDF), 이벤트 적시 대응(TRE), 자원 가용성(RA).
- 4-1은 제품 공급자의 보안 개발 수명주기(보안 요구, 보안 설계, 시큐어 코딩, 시험, 결함·패치 관리)를 다룹니다. 소프트웨어 공급망 관점은 [파이프라인 보안](../../Infrastructure/cicd/pipeline-security.md)과도 통합니다.
- 장비 구매 시 "IEC 62443-4-2 SL 2 인증" 같은 표기는 **컴포넌트 능력(SL-C)** 입니다. 설치 후 시스템이 그 수준을 달성하는지는 별개입니다.

## 4. 주요 사례

| 사례 | 시기 | 대상 | 핵심 |
| --- | --- | --- | --- |
| Stuxnet | 2010년 발견 (일부 구성 요소는 2008-11부터) | Siemens S7-300 계열 CPU, STEP 7 프로젝트, WinCC | USB와 여러 제로데이로 전파. PLC 루트킷이 코드 블록을 숨기고 I/O 이미지를 조작해 운전자에게 정상 값을 보여 줌. ICS를 겨냥한 최초의 공개 악성코드 |
| TRITON / TRISIS | 2017-06~08 | 해외 석유화학·정유 시설의 Schneider Electric Triconex **안전 계장 시스템** | TriStation 프로토콜로 안전 컨트롤러에 프로그램을 내려받음. 악성코드 결함으로 안전 트립(자동 비상정지)이 일어나 발견됨. 미 법무부는 2021-06 러시아 국방부 연계 연구소 직원을 기소 |
| Industroyer2 | 2022-04 (배포 직전 발견) | 우크라이나 고압 변전소 | IEC-104(IEC 60870-5-104)로 직접 통신. MITRE는 Sandworm으로 귀속. ESET가 2022-04-12 분석 공개 |
| CyberAv3ngers / Unitronics | 2023-11~2024-01 | 미국 상하수도 등의 Unitronics Vision PLC·HMI | **기본 비밀번호**와 인터넷 노출이 원인. 래더 로직 삭제, HMI 화면 변조. 최소 75대, 미국 상하수도 34대 이상 |
| FrostyGoop | 2024-01 사고, 2024-07 공개 | 우크라이나 리비우 지역난방 컨트롤러 | 인터넷에 열린 **Modbus TCP 502** 포트로 레지스터를 조작. 600여 동 아파트 난방이 약 2일 중단 |
| AA26-097A | 2026-04 공개, 2026-07 갱신 | 미국 기반시설의 Rockwell CompactLogix·Micro850, Schneider M340, Siemens S7-1200 | 인터넷 노출 PLC의 프로젝트 파일을 빼내고 **정지·알람 로직을 지움**, HMI·SCADA 표시 값 조작 |
| AA26-231A | 2026-08 | 미국 내 Siemens S7 전 계열(F 안전 CPU 포함) | **AI로 생성한 스크립트**를 모니터링 도구로 위장해 S7comm(TCP 102)으로 메모리·로직 읽기·쓰기. 정찰과 향후 파괴 공격 준비로 평가 |
| 상하수도 PLC 공격 경보 | 2026-07 | 미국 상하수도, 셀룰러 모뎀 직결 PLC | 비밀번호 변경으로 운전자 잠금, IP 변경으로 통신 단절. 끓여 마시기 권고, 수동 운전 장기화 |

사례에서 반복되는 교훈:

- 2023년 이후 공격의 대부분은 고급 제로데이가 아니라 **인터넷 노출 + 기본·약한 비밀번호**에서 시작합니다.
- 공격자는 **안전·알람 로직**을 노립니다(TRITON, AA26-097A). 안전 시스템을 일반 제어망과 분리하고, 로직 변경을 감지해야 합니다.
- 화면에 보이는 값을 믿을 수 없을 수 있습니다(Stuxnet, AA26-097A). 중요한 값은 독립 계측이나 현장 확인으로 교차 검증합니다.
- 통합자가 몰래 단 셀룰러 모뎀처럼 **문서에 없는 외부 연결**이 반복해서 침입 경로가 됩니다.
- TRITON의 공격 대상 국가는 흔히 사우디아라비아로 알려져 있지만, MITRE와 미 법무부 자료는 "석유화학 조직", "해외 정유 시설"로만 적습니다.

## 5. 실무 대책

작은 공장에서도 할 수 있는 순서대로 정리했습니다.

| 대책 | 내용 |
| --- | --- |
| 1. 자산 목록 | PLC·HMI·스위치·모뎀·엔지니어링 PC의 모델, 펌웨어, IP, 위치, 담당자. **외부 연결(VPN, 원격 지원 도구, 셀룰러 모뎀)** 을 따로 목록화하고 통합자에게 설치한 외부 IP를 받습니다 |
| 2. 인터넷 노출 제거 | 공인 IP 대역을 스캔해 열린 포트를 확인합니다. PLC·HMI·RTU를 인터넷에 직접 연결하지 않습니다. CISA 경보는 44818(EtherNet/IP), 2222, 102(S7comm), 502(Modbus), 모뎀 22 포트를 점검 대상으로 듭니다 |
| 3. 네트워크 분리 | IT/OT 사이 방화벽과 DMZ, 라인·안전 시스템별 존 분리, 허용 목록(IP·MAC) 기반 규칙. 쓰지 않는 서비스(Telnet, FTP, 웹 서버, SNMP 기본 커뮤니티) 끄기 |
| 4. PLC 운전 모드 | 물리 키 스위치가 있으면 **RUN** 위치에 두고 키를 관리합니다. 프로그램 변경은 정해진 시간에만 PROG/REMOTE로 바꿉니다 |
| 5. 접근 보호 | PLC 비밀번호·보호 레벨(쓰기 보호, 읽기·쓰기 보호, know-how 보호)을 켭니다. 기본 비밀번호를 바꾸고 계정을 사람별로 나눕니다 |
| 6. 원격 접속 | VPN·보안 게이트웨이·점프 호스트를 거치고, **피싱 저항 MFA**, 접속 승인·기록·시간 제한을 둡니다. 원격으로 위험 상황을 만들 수 없게 설계합니다(ISO 13849-1:2023 5.2.4) |
| 7. 펌웨어와 패치 | 제조사 서명 펌웨어만 쓰고, 보안 권고(PSIRT, CISA ICS Advisory)를 구독합니다. 패치는 시험 환경이나 계획 정지 때 검증 후 적용합니다. 지원 종료(EOL) 제품은 교체 계획을 세웁니다 |
| 8. 백업 | PLC 프로그램·설정·HMI 프로젝트의 **오프라인 백업**과 정상본(gold copy)을 보관하고, 복원을 실제로 연습합니다. 공격자가 비밀번호를 바꿔도 복구할 수 있어야 합니다 |
| 9. 변경 감지 | 실행 중 프로그램을 정상본과 주기적으로 비교합니다. 안전 PLC는 서명값 변화를 감시합니다 |
| 10. 로그·모니터링 | 방화벽, 원격 접속, 엔지니어링 도구 사용 로그를 모읍니다. ICS 프로토콜을 이해하는 IDS로 비인가 쓰기·프로그램 다운로드·모드 변경을 알립니다 |
| 11. 엔지니어링 PC | OT 전용으로 쓰고, 애플리케이션 허용 목록, USB 통제, 정기 점검을 합니다. Stuxnet은 엔지니어링 PC와 USB로 들어왔습니다 |
| 12. 사고 대응 | 수동 운전 절차, 연락망(제조사, 통합자, 신고 기관), 격리 기준을 미리 정합니다 |

- 비밀번호·비밀값 관리 원칙은 [환경변수 관리](../../Security/env-management.md)와 같습니다. 공유 계정, 설정 파일 평문 저장을 피합니다.
- 통신 프로토콜별 보안 기능은 [Modbus](../communication/modbus.md), [산업용 이더넷](../communication/industrial-ethernet.md), [OPC UA와 MQTT](../communication/opc-ua-and-mqtt.md)에서 다룹니다.

## 6. 규제와 프레임워크 동향

### EU 사이버 복원력법 (CRA, Regulation (EU) 2024/2847)

디지털 요소가 있는 제품(하드웨어·소프트웨어)의 제조사에 보안 요구를 부과합니다. 네트워크에 연결되는 PLC, HMI, 게이트웨이, 엔지니어링 소프트웨어도 대상이 될 수 있습니다.

| 시점 | 적용 내용 |
| --- | --- |
| 2026-06-11 | 적합성 평가 기관 관련 조항(4장) |
| **2026-09-11** | 제조사 **보고 의무**(제14조). ENISA 단일 보고 플랫폼(SRP) 가동 |
| **2027-12-11** | 규정 전면 적용(보안 요구, 적합성 평가, CE 표시) |

- 실제 악용 중인 취약점과 심각한 사고는 인지 후 **24시간 내 조기 경보**, **72시간 내 통보**, 시정 조치 후 **14일 내 최종 보고**(취약점 기준)를 합니다.
- 지원 기간(보안 업데이트 제공)은 원칙적으로 **최소 5년**이며, 산업 제어 시스템처럼 오래 쓰는 제품은 더 긴 기간이 필요하다고 전문에 적혀 있습니다.
- 인터넷 연결용 라우터·모뎀·스위치는 부속서 III의 중요 제품(Class I)입니다.
- EU 기계 규정 부속서 III 1.1.9(손상에 대한 보호)도 기계의 사이버 보안을 요구합니다. [기능 안전 기초](./functional-safety.md)의 최신 동향을 참고합니다.

### NIS2 (Directive (EU) 2022/2555)

필수·중요 기관에 사이버 보안 위험 관리와 사고 보고를 요구하는 지침입니다. 회원국 국내법 전환 기한은 2024-10-17이었고, 집행위원회는 2024-11-28 전환을 끝내지 못한 23개 회원국에 공식 통지를 보냈습니다. 주요 제품 제조업도 적용 분야에 들어가므로 EU에 사업장이 있는 제조사는 해당 국가의 전환법을 확인합니다.

### 미국 CISA

- CISA는 ICS 보안 권고(ICS Advisory)와 합동 경보를 발행합니다. 2026년에는 PLC를 겨냥한 경보가 이어졌습니다(4장 표).
- **Internet Exposure Reduction Guidance**(2026-08-21 개정)는 노출 식별 → 불필요한 서비스 제거 → 통제된 원격 접속 경로 → 강한 인증 → 남겨야 하는 자산 보호 → 정기 재평가 순서를 권합니다.
- NIST SP 800-82 Rev. 3(OT 보안 가이드, 2023-09)이 현행이며, Rev. 4 초안이 공개 의견 수렴 중입니다(2026-11-30 마감).

### MITRE ATT&CK for ICS

ICS 공격 기법을 정리한 지식 베이스입니다. 확인 시점(ATT&CK v20) 기준 전술 12개: Initial Access, Execution, Persistence, Privilege Escalation, Evasion, Discovery, Lateral Movement, Collection, Command and Control, **Inhibit Response Function**(안전·보호 기능 방해), **Impair Process Control**(공정 제어 손상), Impact. 마지막 세 개가 OT 고유 전술입니다. 탐지 규칙과 훈련 시나리오를 만들 때 기준으로 씁니다.

### 한국

국내 법령·가이드(정보통신기반 보호법상 주요정보통신기반시설, 관련 부처의 제어시스템 보안 가이드 등)는 이 문서에서 검증하지 않았습니다(미확인). 해당 시설이면 소관 기관의 최신 기준을 확인합니다.

## 흔한 실수

| 실수 | 바로잡기 |
| --- | --- |
| "폐쇄망이라 안전하다" | 원격 지원 모뎀, 노트북, USB, 공급업체 VPN이 경로가 됩니다. 외부 연결 목록부터 만듭니다 |
| PLC·HMI를 포트 포워딩으로 인터넷에 직접 노출 | VPN·게이트웨이·점프 호스트 뒤에 둡니다 |
| 기본 비밀번호, 공용 계정 | 장비마다 바꾸고 사람별 계정·MFA를 씁니다 |
| OT 망에 IT용 능동 스캐너를 그대로 돌림 | 구형 장치가 멈출 수 있습니다. 수동(passive) 모니터링을 기본으로 하고 능동 점검은 계획 정지 때 합니다 |
| 백업이 온라인 공유 폴더에만 있음 | 오프라인·불변 백업과 복원 연습 |
| 키 스위치를 늘 REMOTE/PROG에 둠 | RUN에 두고 변경 시에만 바꿉니다 |
| 보안 조치가 비상 운전을 막음 | 비상 시 접근 절차(break-glass)와 안전 기능 독립성을 먼저 설계합니다 |

## 점검표

| 질문 |
| --- |
| OT 자산과 외부 연결(VPN, 원격 도구, 셀룰러 모뎀) 목록이 최신인가 |
| 공인 IP에서 PLC·HMI·OT 포트(102, 502, 44818, 2222 등)가 보이지 않는가 |
| IT와 OT 사이에 DMZ가 있고, 안전 시스템이 별도 존인가 |
| PLC 운전 모드 키가 RUN이고 보호 레벨·비밀번호가 켜져 있는가 |
| 원격 접속이 게이트웨이를 거치고 MFA, 승인, 기록이 있는가 |
| PLC·HMI 프로그램의 오프라인 정상본이 있고 복원을 연습했는가 |
| 실행 중 로직과 정상본을 비교하거나 안전 PLC 서명 변화를 감시하는가 |
| 제조사 PSIRT와 CISA ICS 권고를 구독하고 패치 절차가 있는가 |
| 제품을 EU에 출시한다면 CRA 보고 의무(2026-09-11)와 전면 적용(2027-12-11)을 준비했는가 |

## 참고 자료

- [ISA - ISA/IEC 62443 Series of Standards](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) - 부별 제목과 연도
- [IEC 62443-2-1:2024](https://webstore.iec.ch/en/publication/62883), [IEC 62443-2-4:2023](https://webstore.iec.ch/en/publication/67631), [IEC 62443-3-3:2013](https://webstore.iec.ch/en/publication/7033), [IEC 62443-4-2:2019](https://webstore.iec.ch/en/publication/34421)
- [Rockwell Automation - IEC 62443 security guide](https://www.rockwellautomation.com/en-au/company/news/blogs/iec-62443-security-guide.html) - 그룹 구조, SL 1~4, SL-T/C/A, 존·콘딧
- [MITRE ATT&CK - Stuxnet (S0603)](https://attack.mitre.org/software/S0603/), [Triton SIS Attack (C0030)](https://attack.mitre.org/campaigns/C0030/), [Industroyer2 (S1072)](https://attack.mitre.org/software/S1072/), [FrostyGoop (S1165)](https://attack.mitre.org/software/S1165)
- [MITRE ATT&CK for ICS Matrix](https://attack.mitre.org/matrices/ics/) - 전술 12개, v20
- [미 법무부 - Four Russian government employees charged](https://justice.gov/opa/pr/four-russian-government-employees-charged-two-historical-hacking-campaigns-targeting-critical) - TRITON 기소(2021-06), 해외 정유 시설, 자동 비상정지 2회
- [Dragos - FrostyGoop 인텔 브리프(PDF)](https://hub.dragos.com/hubfs/Reports/Dragos-FrostyGoop-ICS-Malware-Intel-Brief-0724_r2.pdf), [Dragos - How to protect against FrostyGoop](https://www.dragos.com/blog/protect-against-frostygoop-ics-malware-targeting-operational-technology) - ENCO 컨트롤러, 600여 동, 약 2일
- [CISA AA23-335A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-335a) - Unitronics PLC, 기본 비밀번호, 2024-12 갱신
- [CISA AA26-097A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa26-097a) - 2026-04-07, 2026-07-22 갱신, 대상 PLC, 점검 포트, 모드 스위치 RUN
- [CISA AA26-231A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa26-231a) - 2026-08-19, Siemens S7, AI 생성 스크립트, 보호 레벨
- [CISA - 상하수도 PLC 경보(2026-07-30)](https://www.cisa.gov/news-events/alerts/2026/07/30/cisa-urges-water-and-wastewater-systems-sector-protect-ot-against-activity-targeting-plcs)
- [CISA - Internet Exposure Reduction Guidance](https://www.cisa.gov/resources-tools/resources/exposure-reduction) - 2026-08-21 개정
- [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final) - OT 보안 가이드, Rev. 4 초안 의견 수렴
- [Regulation (EU) 2024/2847 (CRA)](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng) - 제71조 적용일, 제14조 보고 기한, 지원 기간 5년, 부속서 III
- [ENISA - The CRA Single Reporting Platform is launched](https://www.enisa.europa.eu/news/the-cra-single-reporting-platform-is-launched)
- [EU 집행위원회 - NIS2 전환 미완료 23개국 통지](https://digital-strategy.ec.europa.eu/en/news/commission-calls-23-member-states-fully-transpose-nis2-directive)
- [DGUV/IFA - Fourth edition of EN ISO 13849-1 (PDF)](https://publikationen.dguv.de/widgets/pdf/download/article/4894) - IT 보안 제외와 IEC TS 63074 안내, 원격 접속 제한(5.2.4)

확인일: 2026-10-21 (IEC 62443 부·판, SL·FR 정의, 사례별 날짜·대상·수치, CISA 경보 내용과 포트, CRA 적용일·보고 기한·지원 기간, NIS2 전환 기한, ATT&CK ICS 전술, NIST SP 800-82 판. Purdue 레벨은 참고 모델 설명, 한국 법령은 미확인)

관련: [기능 안전 기초](./functional-safety.md), [OWASP Top 10](../../Security/owasp-top-10.md), [라우터](../../Network/router.md), [제조사 비교](../vendors/vendor-comparison.md)

다음: [제조사 비교](../vendors/vendor-comparison.md)
