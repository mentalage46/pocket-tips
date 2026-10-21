# PLC 구조와 형태

PLC(Programmable Logic Controller)는 **공장 설비를 제어하려고 만든 산업용 컴퓨터**입니다. 센서·스위치 신호를 읽고, 프로그램에 따라 모터·밸브·램프를 켜고 끕니다. 일반 PC와 다른 점은 프로그램을 정해진 주기로 반복 실행하고, 전기 노이즈·진동·온도 변화가 큰 제어반에서 수년간 멈추지 않도록 설계했다는 것입니다.

먼저 알면 좋은 개념: [전기 기초](../../Hardware/basics/electrical-basics.md), [기본 부품](../../Hardware/basics/components.md)

## 릴레이 반에서 PLC로

PLC 이전에는 릴레이·타이머를 전선으로 연결한 **릴레이 반**으로 순서 제어를 했습니다. 동작을 바꾸려면 배선을 다시 해야 했고, 릴레이가 수백 개면 고장 위치를 찾기도 어려웠습니다.

| 시기 | 사건 |
| --- | --- |
| 1968 | GM 하이드라매틱(Hydra-Matic) 사업부가 배선식 릴레이 시스템을 대체할 전자식 제어기를 공모했고, Bedford Associates가 수주했습니다 |
| 1968–1969 | Bedford Associates가 만든 **Modicon 084**가 최초의 PLC로 꼽힙니다. 084는 회사의 84번째 프로젝트 번호에서 왔습니다. Dick Morley가 'PLC의 아버지'로 불립니다 |
| 이후 | Modicon(MOdular DIgital CONtroller)은 회사 이름이 됐고, 현재 Schneider Electric의 브랜드입니다 |

최초 PLC의 연도는 자료마다 1968(공모·개발)과 1969(GM 납품)로 갈립니다. 래더 다이어그램이 릴레이 회로도를 닮은 이유도 이 역사 때문입니다. 전기 기술자가 익숙한 회로도 형태로 프로그램을 쓸 수 있게 했습니다. 래더는 [래더 기초](../programming/ladder-basics.md)에서 다룹니다.

## 구성 요소

```text
   ┌──────────────────────── 랙 / 베이스(백플레인) ────────────────────────┐
   │ [전원] [CPU] [통신] [DI 16점] [DO 16점] [AI 4ch] [AO 2ch] [특수: 고속카운터] │
   └───────────────────────────────────────────────────────────────────────┘
       │      │      │        │         │         │        │
     AC/DC  프로그램  이더넷   버튼·센서  릴레이·밸브  4–20mA  인버터 속도지령
     입력   실행·메모리 필드버스
```

| 구성 요소 | 역할 | 확인할 것 |
| --- | --- | --- |
| 전원 모듈 | 백플레인과 모듈 내부 회로에 전원 공급 | 모듈 전체 소비 전류 합계, 필드(센서·부하)용 24V는 보통 별도 전원 |
| CPU | 프로그램 실행, 메모리, 진단, 통신 처리 | 처리 속도, 메모리 용량, 지원 언어, 내장 포트 |
| 디지털 입력(DI) | ON/OFF 신호 읽기 | 전압(24V DC 등), 싱크·소스, 입력 필터 시간 |
| 디지털 출력(DO) | ON/OFF 부하 구동 | 릴레이·트랜지스터·트라이액, 점당·공통당 전류 |
| 아날로그 입출력(AI/AO) | 전류·전압·온도 신호 변환 | 4–20mA/0–10V, 분해능, 채널 간 절연 |
| 통신 모듈 | 다른 PLC·HMI·드라이브·원격 I/O와 연결 | 프로토콜 지원, 포트 수 |
| 특수 모듈 | 고속 카운터, 위치 결정, 온도 조절 등 | 스캔과 독립적으로 동작하는지 |
| 랙/베이스 | 모듈을 꽂고 백플레인 버스로 연결 | 슬롯 수, 증설 가능 여부 |

### 메모리

| 영역 | 내용 | 주의 |
| --- | --- | --- |
| 프로그램 메모리 | 사용자 프로그램, 설정 | 다운로드한 프로그램과 PC 원본이 같은지 관리 |
| 데이터 메모리 | 입출력 이미지, 변수(태그), 타이머·카운터 값 | 용량이 프로그램 규모를 제한 |
| 정전 유지(리텐티브) 영역 | 전원이 꺼져도 값 유지 | 생산 수량·레시피는 유지, 운전 명령 비트는 유지하지 않는 편이 안전(경험칙) |

메모리 이름과 구분 방식은 제조사마다 다릅니다. 제조사별 주소 체계는 [주소 체계와 도구](../vendors/addressing-and-tools.md)를 참고합니다.

## 형태

| 형태 | 특징 | 적합한 상황 |
| --- | --- | --- |
| 일체형·컴팩트 | CPU·전원·I/O가 한 몸체. 증설 모듈을 옆에 붙이는 제품도 많음 | I/O 수십 점 이하 단독 기계 |
| 모듈형 | 랙에 필요한 모듈을 골라 꽂음 | I/O가 많거나 아날로그·통신 모듈이 다양한 라인 |
| 원격 I/O | I/O를 현장 근처에 두고 네트워크로 CPU와 연결 | 배선 거리 단축, 넓은 설비 |
| 안전 PLC | 이중화된 내부 구조와 자기 진단으로 안전 기능 수행. IEC 61508 SIL, ISO 13849-1 PL 인증 제품 | 비상정지·안전문·라이트 커튼 처리 |
| PAC | PLC에 PC급 처리 능력·데이터 처리·다중 언어를 더한 제어기. 경계는 마케팅 용어에 가까움 | 모션·데이터 처리가 많은 시스템 |
| 소프트 PLC | 산업용 PC의 실시간 OS·확장 위에서 PLC 런타임을 실행 | 비전·데이터 처리와 제어를 한 장비에서 |
| 가상 PLC | PLC 런타임을 서버·엣지 장비의 가상 머신이나 컨테이너로 실행 | IT 인프라로 여러 제어기를 집중 관리 |
| 이중화(리던던시) | CPU·전원·네트워크를 2벌 두고 고장 시 대기 측이 이어받음 | 정지 손실이 큰 공정(화학, 수처리, 발전) |

- **PAC** 용어는 ARC Advisory Group의 Craig Resnick이 2000년대 초에 처음 쓴 것으로 알려져 있습니다.
- **안전 PLC**는 일반 PLC에 안전 프로그램을 얹은 것이 아닙니다. 인증받은 하드웨어·펌웨어·안전 프로그램 작성 규칙을 함께 써야 합니다. 자세한 내용은 [기능 안전](../safety/functional-safety.md)에서 다룹니다.
- **이중화**는 CPU만 2개 두는 것으로 끝나지 않습니다. 전원, 네트워크 링, I/O 스테이션까지 단일 고장점이 남아 있는지 확인합니다. 예: Siemens S7-1500R/H는 두 CPU를 동기화 링크로 묶고 PROFINET 링(MRP)으로 I/O를 연결합니다.

## PLC vs MCU vs 산업용 PC

| 항목 | PLC | MCU 보드(Arduino, ESP32 등) | 산업용 PC(IPC) + 소프트 PLC |
| --- | --- | --- | --- |
| 입출력 | 24V DC·릴레이·4–20mA를 바로 연결, 절연 내장 | 3.3V/5V 로직. 산업 신호는 별도 회로 필요 | 별도 I/O 모듈이나 필드버스 I/O |
| 실행 모델 | 주기 스캔, 워치독, 정지 시 출력 안전 상태 | 직접 작성(루프·인터럽트) | 실시간 OS·확장 위 주기 태스크 |
| 프로그래밍 | IEC 61131-3 언어(래더·ST 등), 온라인 모니터링·수정 | C/C++ 등. 온라인 수정 개념 없음 | IEC 61131-3 + 일반 언어 연동 |
| 내환경·인증 | 산업 환경 시험(IEC 61131-2 등), 안전 인증 제품 존재 | 보드마다 다름. 대부분 산업 인증 없음 | 산업용 등급 제품은 팬리스·광온도 범위 |
| 유지보수 | 현장 정비 인력이 래더로 고장 진단 | 작성자 의존 | IT 지식(OS 업데이트·보안)도 필요 |
| 수명·공급 | 장기 공급·하위 호환을 중시하는 편(경험칙) | 짧은 편 | 중간 |
| 비용 | 높음 | 매우 낮음 | 중간–높음 |

MCU로 산업 설비를 제어하면 부품비는 줄지만 노이즈 대책, 입력 절연, 안전 정지, 정비 인력 교육 비용이 늘어납니다(경험칙). 시제품·교육·비안전 계측에는 MCU가, 생산 설비에는 PLC가 흔히 쓰입니다. MCU 쪽 입출력은 [GPIO](../../Hardware/interfaces/gpio.md)를 참고합니다.

## 선정 점검표

| 질문 | 설명 |
| --- | --- |
| I/O 점수와 종류를 셌는가 | DI·DO·AI·AO 점수에 20–30% 여유를 둡니다(경험칙) |
| 필요한 응답 시간은? | 스캔 타임·입력 필터·출력 지연을 합쳐 계산합니다. [스캔 사이클](./scan-cycle.md) 참고 |
| 고속 기능이 있는가 | 엔코더 카운트, 펄스 출력, 모션은 전용 모듈·내장 기능이 필요합니다 |
| 통신 상대는? | HMI, 인버터, 로봇, 상위 시스템이 쓰는 프로토콜을 지원하는지. [필드버스 개요](../communication/fieldbus-overview.md) 참고 |
| 안전 기능이 필요한가 | 안전 PLC·안전 릴레이 중 무엇을 쓸지, 요구 PL/SIL은 얼마인지 |
| 정지가 허용되는가 | 허용되지 않으면 이중화 제품군을 처음부터 고릅니다 |
| 현장 정비 인력이 다룰 수 있는가 | 지역·고객사에서 쓰는 제조사와 도구가 무엇인지. [제조사 비교](../vendors/vendor-comparison.md) 참고 |
| 설치 환경은? | 온도, 진동, 분진, 전원 품질, 제어반 공간 |
| 공급 기간과 단종 정책은? | 예비품 확보, 후속 기종 호환성 |
| 보안 요구가 있는가 | 접근 제어, 펌웨어 서명, 네트워크 분리. [OT 보안](../safety/ot-security.md) 참고 |

## 최신 동향 (2026년 기준)

제어 로직을 전용 하드웨어에서 떼어내 소프트웨어로 배포하는 **소프트웨어 정의 자동화(software-defined automation)** 흐름이 이어지고 있습니다. 아래는 확인한 사례입니다.

| 동향 | 확인한 사례 |
| --- | --- |
| 가상 PLC 상용화 | Siemens SIMATIC S7-1500V는 PLC 런타임을 소프트웨어로 제공합니다. Siemens는 Audi가 Neckarsulm Böllinger Höfe 공장의 e-tron GT 라인에서 이를 도입했다고 발표했고, S7-1500V를 "최초의 TÜV 인증 가상 페일세이프 제어 시스템"이라고 소개합니다(제조사 주장) |
| 컨테이너형 런타임 | CODESYS Virtual Control SL은 Linux(x86-64, ARM) 위 Docker·Podman 컨테이너로 PLC 런타임을 실행하고, Kubernetes 등으로 인스턴스를 관리할 수 있다고 안내합니다 |
| 개방형 공정 자동화 | The Open Group의 O-PAS 표준은 Version 2.1이 2023년 2월 정식 표준으로 발행됐습니다. ExxonMobil은 Baton Rouge 공장에서 100개 이상의 제어기·약 1,000 I/O 규모 O-PAS 기반 시스템을 운전 중이라고 2025년에 소개됐습니다 |
| IEC 61499 이식성 | UniversalAutomation.org(2021년 설립)는 Schneider Electric이 기증한 코드 기반의 IEC 61499 공유 소스 런타임을 관리하며, 제조사 간 애플리케이션 이식을 목표로 합니다 |

가상 PLC를 도입할 때는 실시간성(호스트 OS·하이퍼바이저의 지연), 네트워크 장애 시 동작, IT·OT 조직 간 운영 책임을 먼저 정해야 합니다(경험칙). 프로그래밍 측면의 변화는 [현대적 PLC 개발 방법](../programming/modern-practices.md)에서 다룹니다.

## 흔한 실수

| 실수 | 결과 | 대책 |
| --- | --- | --- |
| 전원 모듈 용량 계산 누락 | 모듈 증설 후 간헐적 리셋 | 모든 모듈 소비 전류 합계를 계산 |
| 필드 24V를 PLC 내장 서비스 전원에서 끌어씀 | 부하 증가 시 전압 강하, CPU까지 영향 | 센서·부하용 24V 전원을 별도로 둠(경험칙) |
| 안전 기능을 일반 PLC 프로그램으로만 구현 | 인증·법규 미충족, 고장 시 위험 | 안전 PLC·안전 릴레이와 정해진 절차 사용 |
| I/O 여유 없이 설계 | 개조 때 랙·제어반 교체 | 점수·슬롯·전원 여유 확보 |
| MCU로 생산 설비 제어 | 노이즈 오동작, 정비 불가 | 시제품 단계에서만 쓰거나 산업용 I/O 절연 설계 |

## 참고 자료

- [Programmable logic controller - Wikipedia](https://en.wikipedia.org/wiki/Programmable_logic_controller) - GM Hydra-Matic 1968 공모, Bedford Associates, 084 명칭 유래
- [Schneider Electric - A Year to Celebrate the Programmable Logic Controller (2018)](https://blog.se.com/industry/food-and-beverage/2018/04/10/a-year-to-celebrate-the-programmable-logic-controller/) - Modicon·Dick Morley
- [Schneider Electric - History](https://www.se.com/uk/en/about-us/company-profile/history/schneider-electric-history/) - 1968 GM Hydramatic 공모 수주
- [IEC 61131-2:2017](https://webstore.iec.ch/en/publication/31007) - PLC·PAC 장비 요구사항과 시험(4판)
- [Automation World - PACs Gain Momentum](https://www.automationworld.com/products/control/article/13301094/pacs-gain-momentum) - PAC 용어와 ARC Craig Resnick
- [Siemens - SIMATIC S7-1500R/H](https://www.siemens.com/en-gb/products/simatic/s7-1500-rh-cpus) - 이중화 CPU
- [Siemens - Virtual PLC at Audi](https://www.siemens.com/en-gb/company/insights/factory-automation-virtual-plc-audi) - S7-1500V, Audi 도입
- [CODESYS Virtual Control SL](https://codesys.com/products/codesys-runtime/codesys-virtual-control-sl.html) - 컨테이너형 가상 PLC
- [The Open Group - O-PAS Standard, Version 2.1](https://pubs.opengroup.org/open-process-automation/standard/opas2.1/) - 2023-02 정식 표준
- [ARC - OPAF & the Future of Process Automation @ ARC EIF 2025](https://www.arcweb.com/blog/opaf-future-process-automation-arc-eif-2025) - ExxonMobil O-PAS 운전 사례
- [Automation.com - UniversalAutomation.org launched](https://www.automation.com/article/universalautomation-org-multivendor-industrial) - IEC 61499 공유 소스 런타임

확인일: 2026-10-21 (역사, 표준 판, 제품·동향 사례를 확인. 구성 요소·형태 비교·선정 기준은 일반 개념)

관련: [스캔 사이클](./scan-cycle.md), [I/O 결선](./io-wiring.md), [제조사 비교](../vendors/vendor-comparison.md)

다음: [스캔 사이클과 응답 시간](./scan-cycle.md)
