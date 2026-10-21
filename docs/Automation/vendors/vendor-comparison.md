# 주요 PLC 제조사·플랫폼 비교

PLC는 한 번 정하면 엔지니어링 툴, 예비 부품, 유지보수 인력, 네트워크까지 함께 묶입니다. 이 문서는 국내 현장에서 만나는 제조사와 개방형 플랫폼을 같은 기준으로 비교합니다.

> 소프트웨어 버전과 체험판 조건은 자주 바뀝니다. 아래 내용은 확인일(2026-10-21) 기준이며, 도입 전에 제조사 페이지를 다시 확인합니다. 주력 지역·산업은 공식 통계가 아니라 현장 경험에 근거한 경향입니다(경험칙).

## 먼저 정할 것

```text
1. 기존 설비가 있는가?          → 같은 제조사·같은 계열이면 예비 부품과 프로그램을 공유
2. 누가 유지보수하는가?          → 우리 팀, 고객사 보전팀, 협력사가 다룰 줄 아는 툴
3. 고객 사양서가 있는가?         → 수출 설비·외국계 고객은 제조사를 지정하는 경우가 많음
4. 무엇을 연결하는가?            → 서보·인버터·리모트 I/O가 쓰는 네트워크(EtherCAT, PROFINET, EtherNet/IP, CC-Link IE)
5. 하드웨어 PLC인가, PC·가상 PLC인가? → 전용 CPU / IPC 소프트 PLC / 컨테이너형 가상 PLC
```

## 한눈에 보기

| 제조사 | 주요 제품 라인 | 엔지니어링 툴 | 주력 네트워크 | 주력 지역·산업(경험칙) |
| --- | --- | --- | --- | --- |
| LS ELECTRIC | XGT(XGK·XGI·XGR), 소형 XGB(XBM·XBC·XEC), 모션 XMC | XG5000 | RAPIEnet, EtherNet/IP, EtherCAT, Modbus | 국내 중소형 설비, 수처리·물류, 국내 장비 업체 |
| Mitsubishi Electric | MELSEC iQ-R, iQ-F(FX5), Q, MX Controller(MX-R·MX-F) | GX Works3(MELSOFT) | CC-Link IE TSN, CC-Link IE, CC-Link | 국내·일본계 설비, 반도체·디스플레이·2차전지 장비 |
| Siemens | S7-1200 G2, S7-1500, ET 200SP CPU, S7-1500V(가상) | TIA Portal(STEP 7), SIMATIC AX | PROFINET, PROFIBUS | 유럽 고객사, 자동차·공정·수출 설비 |
| Rockwell Automation | ControlLogix 5590·5580, CompactLogix 5380, Micro800 | Studio 5000 Logix Designer, FactoryTalk Design Studio, CCW | EtherNet/IP | 북미 고객사, 식음료·자동차 |
| Omron | NJ·NX 머신 컨트롤러, CJ·CP(구형) | Sysmac Studio, CX-Programmer(CJ·CP) | EtherCAT, EtherNet/IP | 모션·비전 중심 장비, 포장기 |
| Beckhoff | IPC + TwinCAT 3, EtherCAT I/O | TwinCAT 3 XAE | EtherCAT | PC 기반 고속 제어, 반도체·특수 장비 |
| CODESYS | 제조사 독립 개발 환경·런타임, 다수 OEM 하드웨어 | CODESYS Development System | 하드웨어에 따라 EtherCAT, PROFINET, EtherNet/IP 등 | 소형 컨트롤러 OEM, 모바일 장비 |
| Schneider Electric | Modicon M580, M262, M340 | Control Expert(M580), Machine Expert(M262), EcoStruxure Automation Expert | EtherNet/IP, Modbus TCP | 공정·인프라, 빌딩·에너지 |
| 오픈소스 | OpenPLC Runtime v4 | OpenPLC Editor v4 | Modbus 등 | 교육, 연구, 보안 실험 |

모든 제조사가 여러 네트워크를 지원합니다. "주력 네트워크"는 자사 서보·리모트 I/O와 가장 자연스럽게 묶이는 것을 적었습니다. 네트워크 자체는 [필드버스 개요](../communication/fieldbus-overview.md)를 참고합니다.

## 툴·언어·라이선스

| 툴 | IEC 61131-3 언어 지원 | 라이선스 | 학습용 무료·체험 |
| --- | --- | --- | --- |
| XG5000 | LD, ST, SFC, IL(XGB 기준 4개 언어) | 무료, 키 불필요 | 무료 다운로드. 내장 시뮬레이터 XG-SIM |
| GX Works3 | LD, ST, FBD/LD, SFC | 유료 | 일본 FA 사이트에 체험판 등재. 국내 제공 조건은 (미확인) |
| TIA Portal STEP 7 | LAD, FBD, SCL(ST), GRAPH(SFC 계열), STL(IL 계열, S7-1500만) | 유료. V21부터 온프레미스·구독·클라우드 중 선택 | 체험판 조건 (미확인) |
| Studio 5000 Logix Designer | LD, FBD, ST, SFC | 유료(에디션별) | Logix Echo 30일 체험. Micro800용 CCW Standard Edition은 무료 |
| FactoryTalk Design Studio | 클라우드 기반 Logix 설계 | 클라우드 서비스(가격 형태 미확인) | 90일 무료 체험 |
| Sysmac Studio | LD, ST(인라인 ST 포함) | 유료 | 30일 체험(설치형·브라우저형) |
| TwinCAT 3 | IL, LD, FBD, SFC, ST + CFC, 객체지향 확장 | PLC 프로그래밍용 엔지니어링은 무료, 런타임과 일부 기능은 유료 | 7일 체험 라이선스를 횟수 제한 없이 재발급 |
| CODESYS Development System | FBD, LD, IL, ST, SFC + CFC | 개발 환경 무료(라이선스 불필요), 런타임은 장치별 유료 | Control Win SL은 라이선스 없이 2시간 데모 실행 |
| EcoStruxure Machine Expert | LD, ST, FBD 등 IEC 61131-3 | 유료 | 42일 체험 |
| EcoStruxure Automation Expert | IEC 61499 기능 블록 | 유료, 배포용 런타임 라이선스 별도 | 설치 파일은 로그인 후 다운로드. 체험 조건 (미확인) |
| OpenPLC Editor v4 | LD, ST, FBD 등 | 오픈소스(Editor GPL-3.0, Runtime v4 MIT) | 무료 |

- "IEC 61131-3 지원"은 언어 이름이 같다는 뜻이지 프로젝트 파일이 호환된다는 뜻이 아닙니다. 제조사를 바꾸면 프로그램은 다시 작성하거나 변환 후 검증해야 합니다.
- CODESYS는 IL을 PLCopen이 폐기 예정으로 표시했다고 안내하며, 필요하면 켜서 쓰는 방식입니다. IEC 61131-3은 2025-05-22에 4판(IEC 61131-3:2025)이 나왔습니다. 언어 변화는 [IEC 61131-3](../programming/iec-61131-3.md)에서 다룹니다.
- 무료로 배우기 가장 쉬운 조합은 XG5000(시뮬레이터 포함), CODESYS Development System + Control Win SL 데모, TwinCAT 3 + 7일 체험 라이선스입니다(경험칙).

## 제조사별 메모

### LS ELECTRIC

- **계열 구분**: XGT 중 XGK는 디바이스(P·M·K·D 등) 방식, XGI·XGR은 IEC 방식(%IX 등)입니다. 소형 XGB도 XBM·XBC는 XGK 방식, XEC는 IEC 방식입니다. 같은 XG5000이라도 CPU 계열에 따라 주소 체계가 다르므로 [주소 체계](./addressing-and-tools.md)를 먼저 확인합니다.
- **XGR**은 이중화(redundancy) 계열입니다.
- **XG5000**은 무료이며 위치 결정 설정 툴 XG-PM이 함께 들어 있습니다(AutomationDirect 배포판 기준). 국내 LS ELECTRIC 자료실의 배포 조건은 (미확인)입니다.
- **신제품 보도**: 2026-03 AW 2026에서 고성능 PLC "SU-CM70"을 처음 공개했다는 보도가 있습니다. 엔지니어링 툴과 출시 일정은 (미확인)입니다. 2026-04에는 고속 제어와 안전 기능을 하나의 CPU에 통합한 "XGT Integrated Safety PLC"가 iF 디자인 어워드를 받았다는 보도가 있습니다.

### Mitsubishi Electric

- **iQ-R**은 중대형 모듈형, **iQ-F**(FX5)는 소형 일체형입니다. 둘 다 GX Works3로 프로그래밍합니다. Q·FX3 같은 이전 세대 설비에서는 GX Works2를 만나는 경우가 많습니다(지원 기종은 툴 사양에서 확인).
- **X/Y 번호 진법이 다릅니다**: iQ-R은 16진수, iQ-F·FX는 8진수입니다. 같은 `X10`이 iQ-R에서는 17번째 입력, iQ-F에서는 9번째 입력입니다.
- **MELSEC MX Controller**는 시퀀스·모션·네트워크 제어를 통합한 컨트롤러로 MX-R(최대 256축, iQ-R 모듈과 조합)과 MX-F가 있으며, GX Works3 지원 대상에 포함됩니다.

### Siemens

- **S7-1200 G2**는 S7-1200의 2세대로 모션·안전 기능과 NFC 진단을 강화했습니다. Siemens 교육 과정은 TIA Portal V20 기준으로 안내합니다.
- **S7-1500V**는 Industrial Edge 앱으로 배포하는 가상 PLC이며 TIA Portal과 호환됩니다. **ET 200SP**는 분산 I/O이며 CPU를 내장한 제품도 있습니다.
- **TIA Portal V21**(2025-11 발표)은 Git 같은 버전 관리 도구와 연동할 수 있는 새 내보내기 형식을 LAD·FBD·SCL·DB·PLC 데이터 타입 등에 제공합니다.
- **SIMATIC AX**는 VS Code 기반의 텍스트 중심 개발 환경으로, 확인 시점 기준 선정된 고객에게만 제공하는 얼리 액세스 단계입니다. 처음에는 ST 전용이었고, 2026-06 발표로 래더 언어 XLad와 S7-1200 G2 지원이 추가되었습니다.

### Rockwell Automation

- **태그 기반**이라 메모리 주소가 없습니다. I/O는 모듈을 추가하면 `Local:1:I.Data` 같은 태그가 자동 생성됩니다.
- **ControlLogix 5590**은 2025-10-07 발표되었고, 통합 안전 기능과 IEC 62443 기반 보안 기능을 내세웁니다. Studio 5000 Logix Designer v38.00(2025-09)부터 지원합니다.
- v38.00부터 **RSLinx Classic이 설치되지 않고 FactoryTalk Linx가 포함**되며, CompactLogix 5480은 지원하지 않습니다. 확인 시점 최신 릴리스 노트는 38.02(2026-07)입니다.
- Micro800 소형 PLC는 Studio 5000이 아니라 Connected Components Workbench(CCW)를 씁니다.

### Omron

- **NJ·NX**는 변수 기반이며 Sysmac Studio 하나로 시퀀스·모션·HMI(NA 시리즈)를 다룹니다. 구형 CJ·CP는 CX-Programmer와 CIO·W·H·D 메모리 영역을 씁니다.
- NJ·NX에서 CJ 유닛과 연결할 때는 "CJ 시리즈 유닛용 메모리"를 AT 지정한 변수로만 접근합니다.

### Beckhoff

- **TwinCAT 3**는 IPC(Windows 또는 TwinCAT/BSD)에서 실시간 런타임을 돌리는 PC 기반 제어입니다. Microsoft Visual Studio에 통합되어 소스 관리 도구와 연결하기 쉽습니다.
- **TwinCAT PLC++**는 SPS 2024에서 발표된 차세대 PLC 기술로, 기존 TwinCAT PLC와 병행 실행과 코드 변환기를 제공한다고 안내합니다. 2025-03 Beckhoff 인터뷰에서는 소프트웨어 출시를 2025년 말로 예정했으나 정식 출시 여부는 (미확인)입니다.

### CODESYS

- 제조사 독립 개발 환경입니다. 여러 하드웨어 제조사가 CODESYS 런타임을 탑재하므로, 한 번 익히면 여러 브랜드의 컨트롤러에 적용할 수 있습니다. 다만 장치 설명 파일과 라이브러리는 하드웨어 제조사가 제공합니다.
- 확인 시점 최신 Development System은 3.5.22.40(V3.5 SP22, 2026-09-30)입니다.
- **CODESYS Virtual Control SL**은 Docker·Podman 컨테이너로 실행하는 가상 PLC 런타임으로, x86·ARM 리눅스에서 여러 인스턴스를 돌릴 수 있습니다.

### Schneider Electric

- **Modicon M580**은 Control Expert(구 Unity Pro), **M262**는 Machine Expert(SoMachine 후속)로 프로그래밍합니다.
- **EcoStruxure Automation Expert**는 IEC 61499 기반 개발 환경으로, 애플리케이션을 하드웨어와 분리해 배포하는 방식을 지향합니다. 확인 시점 다운로드 페이지의 최신은 V24.1(2025-05)입니다.

### 오픈소스: OpenPLC

- **OpenPLC Runtime v3는 지원이 종료(EOL)되어 저장소가 보관(archive) 처리되었습니다.** 후속은 OpenPLC Runtime v4(v4.0.0, 2025-12-31)이며, 웹 UI 없이 OpenPLC Editor v4가 HTTPS REST API(포트 8443)로 제어합니다.
- 교육·연구용으로는 좋지만 산업 인증(안전, 내환경)이 필요한 설비에는 쓰지 않습니다(경험칙).

## 선택 기준

| 기준 | 확인할 질문 | 비고 |
| --- | --- | --- |
| 기존 설비 | 같은 공장에 이미 어떤 제조사·계열이 있는가 | 예비 CPU·I/O 공유, 프로그램 재사용. 섞을수록 예비품 재고가 늘어남(경험칙) |
| 유지보수 인력 | 고객사 보전팀이 툴을 갖고 있고 다룰 수 있는가 | 납품 후 야간 고장에 누가 접속하는지가 실제 비용을 좌우 |
| 부품 수급 | 국내 대리점 재고, 납기, 단종 일정 | 단종 예정 계열은 신규 설비에 쓰지 않음 |
| 고객 사양 | 사양서에 제조사·모델·툴 버전이 지정되어 있는가 | 수출 설비는 현지 서비스망까지 확인 |
| 연결 장비 | 서보·인버터·로봇·리모트 I/O의 네트워크 | 같은 제조사 서보와 묶으면 설정이 단순해짐(경험칙) |
| 안전 | 안전 PLC·안전 네트워크가 필요한가 | 통합 안전 CPU인지 별도 안전 컨트롤러인지 확인. [기능 안전](../safety/functional-safety.md) 참고 |
| 라이선스 비용 | 툴 라이선스 수, 구독 여부, 런타임 비용 | 엔지니어 수 × 툴 비용, PC 기반이면 런타임 라이선스 포함 |
| 개발 방식 | 텍스트 기반 버전 관리·자동 테스트가 필요한가 | TIA Portal V21 내보내기, SIMATIC AX, TwinCAT, CODESYS 파일 기반 저장 등. [최신 개발 관행](../programming/modern-practices.md) 참고 |

## 2025~2026 동향(확인한 항목만)

| 시기 | 내용 |
| --- | --- |
| 2025-05 | IEC 61131-3:2025(4판) 발행 |
| 2025 | Mitsubishi MELSEC MX Controller(MX-R·MX-F) 공개, GX Works3 지원 |
| 2025-09 | Studio 5000 Logix Designer v38.00: ControlLogix 5590 지원, RSLinx Classic 대신 FactoryTalk Linx |
| 2025-10 | Rockwell ControlLogix 5590 발표 |
| 2025-11 | Siemens TIA Portal V21 발표: Git 연동용 내보내기 형식, 구독·클라우드 배포 선택 |
| 2025-12 | OpenPLC Runtime v4.0.0 릴리스, v3 지원 종료 |
| 2026-03 | CODESYS V3.5 SP22 발표. LS ELECTRIC 고성능 PLC SU-CM70 공개 보도 |
| 2026-07 | Studio 5000 Logix Designer 38.02 릴리스 노트 |
| 지속 | 가상·소프트 PLC 확대: Siemens S7-1500V, CODESYS Virtual Control SL(4.22.0.0, 2026-08), Rockwell FactoryTalk Logix Echo(에뮬레이션) |

## 흔한 실수

| 실수 | 결과 | 대응 |
| --- | --- | --- |
| "IEC 61131-3 지원"이니 프로그램을 옮길 수 있다고 가정 | 이식 공수 과소 산정 | 언어가 같아도 라이브러리·주소·타이머 동작이 다름. 재작성으로 견적 |
| 툴 버전을 기록하지 않고 납품 | 나중에 프로젝트를 열 수 없음 | 납품 문서에 툴·펌웨어 버전과 설치 파일 보관 위치 기록 |
| 체험판으로 고객 설비 작업 | 체험 기간 만료 후 수정 불가, 라이선스 위반 | 상용 작업은 정식 라이선스로 |
| Mitsubishi iQ-R 경험으로 iQ-F 주소를 읽음 | X/Y 번호를 잘못 해석 | 진법을 먼저 확인([주소 체계](./addressing-and-tools.md)) |
| 같은 XG5000이니 XGK와 XGI가 같다고 가정 | 디바이스 주소와 IEC 주소 혼동 | CPU 계열부터 확인 |

## 점검표

| 질문 |
| --- |
| 기존 설비와 고객사 보전팀이 쓰는 제조사·툴을 확인했는가 |
| 연결할 서보·인버터·리모트 I/O의 네트워크와 맞는가 |
| 툴 라이선스 형태(영구·구독·런타임)와 필요한 수량을 계산했는가 |
| CPU 형명, 펌웨어, 툴 버전을 납품 문서에 남기는가 |
| 단종 예정이 아닌 계열인지, 국내 수급이 되는지 확인했는가 |

## 참고 자료

LS ELECTRIC

- [AutomationDirect XG5000 소프트웨어(무료, 언어, XG-SIM)](https://www.automationdirect.com/ls/software), [AutomationDirect XGB 신규 모델 보도자료](https://library.automationdirect.com/ls-electric-xem-plc-line-ext/)
- [Pro-face XGT/XGB FEnet 드라이버 매뉴얼(XGK·XBM·XBC / XGI·XGR·XEC 구분)](https://www.proface.com/en/download/exdriver/plc/ls_xgte)
- [아이뉴스24: AW 2026 SU-CM70 공개](https://www.inews24.com/view/1944556), [헤럴드경제: XGT Integrated Safety PLC iF 수상](https://www.heraldk.com/article/2026041418332449041)

Mitsubishi Electric

- [GX Works3 제품 페이지](https://www.mitsubishielectric.com/fa/products/cnt/plceng/smerit/gx_works3/index.html), [PLC 소프트웨어 업데이트(체험판 목록, 일본)](https://www.mitsubishielectric.co.jp/fa/products/software/plc/update_index.html)
- [MELSEC MX Controller 개념](https://www.mitsubishielectric.com/fa/products/cnt/mxc/pmerit/mxcr/concept/index.html)
- [FAQ 25000: FX 입력 번호는 8진수](https://fa-faq.mitsubishielectric.com/faq/show/25000)

Siemens

- [TIA Portal V21 보도자료(2025-11-11)](https://assets.new.siemens.com/siemens/assets/api/uuid:a9b038ad-86ce-4460-a411-ba5d812e0ac6/HQDIPR202511037269EN.pdf)
- [SIMATIC S7-1200 G2](https://www.siemens.com/global/en/products/automation/systems/industrial/plc/s7-1200.html), [S7-1500V](https://www.siemens.com/hr-hr/products/simatic/s7-1500v/), [SIMATIC AX 개요](https://developer.siemens.com/simatic-ax/overview.html), [SIMATIC STEP 7](https://www.siemens.com/en-us/products/tia-portal/step7/), [Simatic AX 확장 보도자료(2026-06-18)](https://press.siemens.com/global/en/pressrelease/siemens-expands-accessibility-software-defined-automation-simatic-ax)
- [SITRAIN: S7-1200 G2 in TIA Portal V20](https://www.sitrain-learning.siemens.com/BE/fr/rw62610/SIMATIC-S7-1200-G2-démarrage-en-toute-sécurité-sur-le-plan-cybernétique-et-fonctionnel-dans-le-TIA-Portal-V20)
- [Programming Guideline S7-1200/1500(언어별 지원, STL은 S7-1500만)](https://cache.industry.siemens.com/dl/files/040/90885040/att_861867/v1/81318674_Programming_guideline_DOCU_v14_en.pdf)

Rockwell Automation

- [Studio 5000 Logix Designer 38.02 릴리스 노트](https://www.rockwellautomation.com/en-ca/docs/studio-5000-logix-designer/38-02/releasenotesmainenu-ditamap/studio-5000-logix-designer-application-release-not.html), [38.00 기능 변경](https://www.rockwellautomation.com/en-gb/docs/studio-5000-logix-designer/38-00/releasenotesmainenu-ditamap/system/functional-changes.html)
- [ControlLogix 5590 출시 보도자료](https://www.rockwellautomation.com/en-se/company/news/press-releases/controllogix-5590-launch.html)
- [FactoryTalk Design Studio 무료 체험](https://www.rockwellautomation.com/en-us/products/software/factorytalk/design-studio/free-trial.html), [FactoryTalk Logix Echo](https://www.rockwellautomation.com/en-in/products/software/factorytalk/designsuite/logix-echo.html), [설계·구성 소프트웨어(CCW Standard 무료)](https://www.rockwellautomation.com/en-au/capabilities/industrial-automation-control/design-and-configuration-software.html)

Omron

- [Sysmac Studio(EU)](https://industrial.omron.eu/en/products/sysmac-studio), [Sysmac Studio 체험판 안내](https://omron.helpjuice.com/sysmac-studio/sysmac-studio-trial-software)
- [NJ/NX CPU Unit Software User's Manual (W501)](https://files.omron.eu/downloads/latest/manual/en/w501_nj_nx-series_cpu_unit_software_users_manual_en.pdf?v=3)

Beckhoff

- [TwinCAT 3 라이선스(엔지니어링 무료, 7일 체험)](https://www.beckhoff.com/en-en/products/automation/twincat/twincat-3-licensing/), [TC1200 TwinCAT 3 PLC(지원 언어)](https://www.beckhoff.com/en-en/products/automation/twincat/tc1xxx-twincat-3-base/tc1200.html), [TC1210 TwinCAT 3 PLC/C++(지원 OS)](https://beckhoff.com/en-au/products/automation/twincat/tc1xxx-twincat-3-base/tc1210.html)
- [TwinCAT PLC++ 발표(2024-10)](https://www.beckhoff.com/en-au/company/news/twincat-plc-next-generation-plc-technology.html), [TwinCAT PLC++ 인터뷰(2025-03)](https://www.beckhoff.com/ko-kr/company/news/decades-of-experience-incorporated-into-the-new-generation-of-plc-technology.html)

CODESYS

- [CODESYS Development System 3(스토어, 무료·버전·언어)](https://us.store.codesys.com/codesys.html), [V3.5 SP22 릴리스 소식](https://www.codesys.com/company/news-center/latest-news/codesys-v35-sp22-release/)
- [CODESYS Virtual Control SL](https://us.store.codesys.com/codesys-virtual-control.html), [CODESYS Control Win SL 데이터시트(2시간 데모)](https://store.codesys.com/media/n98_media_assets/files/2302000003/4/CODESYS%20Control%20Win%20SL_en.pdf)

Schneider Electric

- [M262 프로그래밍 가이드(Machine Expert)](https://product-help.schneider-electric.com/Machine%20Expert/V2.2/en/m262prg/m262prg/D-SE-0079480.3.html), [Machine Expert 체험 FAQ(42일)](https://www.se.com/us/en/faqs/FAQ000282563/)
- [EcoStruxure Automation Expert V24.1 다운로드](https://www.se.com/in/en/download/document/EAE_V24_1)

오픈소스·표준

- [OpenPLC Runtime v3(EOL 공지)](https://github.com/thiagoralves/OpenPLC_v3), [OpenPLC Runtime v4](https://github.com/Autonomy-Logic/openplc-runtime), [OpenPLC Editor 릴리스](https://github.com/Autonomy-Logic/openplc-editor/releases)
- [IEC 61131-3:2025](https://webstore.iec.ch/en/publication/68533)

확인일: 2026-10-21 (제품 라인·소프트웨어 버전·라이선스·체험판·신제품 항목. 6개월 후 재확인 대상. 주력 지역·산업은 경험칙이며 검증 대상 아님)

관련: [주소 체계와 엔지니어링 툴](./addressing-and-tools.md), [필드버스 개요](../communication/fieldbus-overview.md), [IEC 61131-3](../programming/iec-61131-3.md)

다음: [주소 체계와 엔지니어링 툴](./addressing-and-tools.md)
