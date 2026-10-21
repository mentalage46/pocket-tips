# 최신 실무: 버전 관리·테스트·AI

PLC 개발은 오랫동안 "벤더 도구에서 프로젝트 파일을 열고, 날짜를 붙여 복사해 보관하는" 방식이었습니다. 최근에는 소프트웨어 개발의 버전 관리, 단위 테스트, 시뮬레이션, CI/CD, 생성형 AI 보조 도구가 PLC 도구에도 들어오고 있습니다. 이 문서는 각 흐름이 무엇을 해결하는지와 제조사별 현재 상태를 정리합니다.

제품 이름·버전·상태는 2026-10-21 기준입니다. 이 분야는 변화가 빠르므로 6개월이 지나면 참고 자료로 다시 확인합니다.

먼저 알면 좋은 개념: [CI/CD 기초](../../Infrastructure/cicd/cicd-basics.md), [Version Control System](../../Version%20Control%20System/README.md)

## 왜 PLC 코드 버전 관리가 어려운가

| 문제 | 설명 |
| --- | --- |
| 바이너리 프로젝트 파일 | 많은 벤더 도구가 프로젝트를 바이너리나 압축 파일 하나로 저장합니다. Git에 넣어도 diff·merge가 안 됩니다. 예: Rockwell Studio 5000의 `.ACD` |
| 그래픽 언어 | LD·FBD는 화면 배치 정보까지 들어 있어 텍스트로 바꿔도 diff가 읽기 어렵습니다 |
| 코드 밖의 설정 | 하드웨어 구성, I/O 매핑, 통신 설정, HMI가 같은 프로젝트에 섞여 있습니다 |
| 온라인 편집 | 현장에서 PLC에 직접 고친 내용이 저장소에 반영되지 않아 "PLC에 있는 것이 진짜"가 됩니다 |
| 벤더 종속 | 도구·버전마다 형식이 달라 범용 도구를 쓰기 어렵습니다 |

해결 방향은 세 가지입니다.

| 방식 | 설명 | 예 |
| --- | --- | --- |
| 텍스트 내보내기 | 프로젝트를 XML·텍스트로 내보내 Git에 저장 | PLCopen XML, Rockwell L5X, Siemens SIMATIC SD |
| 파일 분리 저장 | POU마다 별도 텍스트 파일로 저장하는 도구 사용 | Beckhoff TwinCAT 3, SIMATIC AX |
| 도구 내장 버전 관리 | 엔지니어링 도구에 Git 연동 내장 | CODESYS Git, TIA Portal Version Control Interface, FactoryTalk Design Studio |

### PLCopen XML (IEC 61131-10)

PLCopen TC6가 만든 IEC 61131-3 프로젝트 교환용 XML 형식입니다. 이후 IEC 61131-10:2019(PLC open XML exchange format, 2019-04-24)로 표준화되었고, 구성 요소·데이터 타입·5개 언어의 POU를 XML 스키마로 정의합니다. 도구 간 이식이나 코드 생성에 쓸 수 있지만, 도구마다 지원 범위가 달라 왕복(내보내기→가져오기)에서 정보가 빠질 수 있습니다.

## 제조사별 현재 상태

| 도구 | 버전 관리 방식 | 확인한 내용 |
| --- | --- | --- |
| Siemens TIA Portal | Version Control Interface(VCI)로 프로젝트 객체를 작업 공간 파일로 내보내고 Git 등 외부 도구가 이력 관리. TIA Portal Openness API로 내보내기·빌드 자동화 | V20 Update 4(2025-09)부터 SCL·FBD 블록과 F-DB를 텍스트 형식인 SIMATIC SD(`.s7dcl`, `.s7res`)로 내보내기·가져오기 가능. Openness와 VCI 모두 지원 |
| Siemens SIMATIC AX | VS Code 기반 엔지니어링 도구(Logic Control Engineering). 네이티브 Git, 패키지 관리, 단위 테스트, CI 파이프라인 | ST 전용 환경이었으나 2026-06 발표로 그래픽 래더 XLad와 S7-1200 G2 지원 추가. XLad도 텍스트 표현으로 Git 관리. 확인 시점 기준 선정된 사용 사례에만 제공하는 얼리 액세스 단계 |
| Beckhoff TwinCAT 3 | Visual Studio 기반 XAE. POU·DUT가 개별 파일로 저장되어 Git 사용이 쉬움 | Beckhoff Source Control 문서가 Build 4026 기준 Git 사용법 제공. 하드웨어 구성 등은 "Multiple Project Files" 옵션으로 파일 분리(서드파티 안내 기준) |
| CODESYS | CODESYS Git 애드온 | v1.7.0.0(2025-01-15), CODESYS V3.5.19.30 이상과 Professional Developer Edition 구독 필요. 프로젝트를 JSON 텍스트 형식으로 저장, GitHub·GitLab 사용 가능 |
| Rockwell Studio 5000 | 기본 `.ACD`는 바이너리. L5X(XML) 내보내기와 Logix Designer SDK로 Git 워크플로 구성 | Rockwell 문서는 SDK 기반 Git 워크플로를 예제·커뮤니티 지원으로 안내 |
| Rockwell FactoryTalk Design Studio | 클라우드 기반 도구에 프로젝트 버전 관리 내장(commit, push, pull, 충돌 병합, 이력 비교·복원) | Copilot이 버전 관리 동작도 프롬프트로 실행 |

어떤 방식이든 **PLC에 다운로드한 것과 저장소의 커밋이 같은지** 확인하는 절차가 핵심입니다. 다운로드 전 커밋 해시를 기록하고, 현장 온라인 편집 후에는 반드시 업로드·비교해서 커밋합니다(경험칙).

## 단위 테스트

PLC 단위 테스트는 기능 블록 하나에 입력을 넣고 출력을 확인하는 방식입니다. 실제 하드웨어 없이 사무실에서 로직 오류를 찾을 수 있습니다.

| 도구 | 대상 | 상태 |
| --- | --- | --- |
| TcUnit | Beckhoff TwinCAT 3. xUnit 스타일 오픈소스(MIT) | 최신 릴리스 1.3.1(2024-08). 저장소 README 기준 "Stable but resting"(동작하지만 활발한 개발 중단). CI 실행 도구 TcUnit-Runner 저장소는 보관(archived) 처리됨 |
| CODESYS Test Manager | CODESYS 애플리케이션·라이브러리 | Professional Developer Edition 포함. IEC 언어로 테스트 작성 또는 테스트 테이블에서 자동 생성. 명령줄 실행으로 CI 연동 |
| AxUnit | Siemens SIMATIC AX | SIMATIC AX의 단위 테스트 프레임워크. `AxUnit.Assert` 등 사용, Siemens SITRAIN 교육 과정에서 다룸 |

```text
(* 테스트 의도 예: FB_Motor 피드백 타임아웃 *)
1. xStartCmd 펄스, xStopOk := TRUE, xFeedback := FALSE
2. 시간을 tFbTimeout보다 길게 진행
3. 기대: xFault = TRUE, xRun = FALSE
4. xReset 펄스 후 기대: xFault = FALSE
```

무엇을 테스트할지 (경험칙):

| 우선순위 | 대상 |
| --- | --- |
| 높음 | 재사용 FB(모터·밸브·알람), 스케일 변환, 레시피 계산, 상태 머신 전이와 타임아웃 |
| 중간 | 모드 전환, 인터록 조건 조합 |
| 낮음 | I/O 매핑 자체, 벤더 표준 블록 |

시간이 들어가는 로직은 실제 시간을 기다리지 않도록 시간 입력을 주입하거나 테스트 프레임워크의 사이클 제어 기능을 씁니다. 안전 기능은 단위 테스트와 별도로 정해진 절차로 검증합니다.

## 시뮬레이션과 가상 시운전

| 단계 | 내용 | 예 |
| --- | --- | --- |
| PLC 시뮬레이션 | 실제 CPU 없이 PC에서 PLC 프로그램 실행 | Siemens S7-PLCSIM Advanced, Rockwell FactoryTalk Logix Echo(ControlLogix 5580 에뮬레이션) |
| 가상 시운전(Virtual Commissioning) | 시뮬레이션 PLC에 설비 모델(센서·액추에이터 동작)을 연결해 시퀀스 검증 | Siemens는 PLCSIM Advanced + SIMIT 조합 안내. TIA Portal V21은 S7-PLCSIM Advanced V8.0과 함께 지원 |
| 디지털 트윈 | 설비의 동작·물리 모델을 PLC와 연결해 설계·운영에 활용 | 3D 기구 모델과 연동 |

- 가상 시운전으로 현장 시운전 시간을 줄일 수 있지만, 모델이 실제와 다르면 잘못된 확신을 줍니다. 센서 지연, 실린더 속도, 고장 상황(센서 미입력)을 모델에 넣어야 쓸모가 있습니다(경험칙).
- 시뮬레이터가 실제 CPU의 모든 기능(타이밍, 통신, 안전 기능)을 같게 재현하지는 않습니다. 지원 범위를 매뉴얼로 확인합니다.

## PLC를 위한 CI/CD

일반 소프트웨어의 CI/CD([CI/CD 기초](../../Infrastructure/cicd/cicd-basics.md))를 PLC에 적용하면 아래 단계가 됩니다.

```mermaid
flowchart LR
    A[커밋·PR] --> B[텍스트 내보내기 확인]
    B --> C[빌드·컴파일<br/>헤드리스 실행]
    C --> D[정적 분석·코딩 규칙]
    D --> E[단위 테스트<br/>시뮬레이션 PLC]
    E --> F[빌드 결과물 보관<br/>버전 태그]
    F --> G{사람 승인}
    G --> H[시운전·현장 PLC 다운로드]
```

- 빌드 서버에 벤더 도구와 라이선스가 필요하고, 대부분 Windows 전용입니다. 이 점이 일반 CI보다 큰 제약입니다.
- Rockwell은 Jenkins, GitHub, Logix Designer SDK, Logix Echo SDK로 구성한 CI/CD 예제를 애플리케이션 기술 문서와 GitHub 저장소(`ra-logix-cicd`)로 공개했습니다.
- **운전 중인 설비로 자동 배포하지 않습니다.** PLC 다운로드는 설비 정지, 안전 확인, 담당자 승인이 필요한 작업입니다. CI는 "검증된 빌드 결과물"까지 만들고 다운로드는 사람이 합니다(경험칙).

## IEC 61499와 UniversalAutomation.org

IEC 61499(현재판 IEC 61499-1:2012)는 이벤트 구동 기능 블록을 여러 장치에 분산 배치하는 표준입니다. 애플리케이션을 먼저 설계하고 나중에 어느 장치에서 실행할지 배치하므로 하드웨어와 소프트웨어를 분리하는 방향과 맞습니다.

| 항목 | 내용 |
| --- | --- |
| UniversalAutomation.org(UAO) | 2021년 말 9개 회사가 설립한 독립 비영리 단체. IEC 61499 기반 공유 런타임을 관리. 2025년 3월 기준 회원사 100곳 이상(단체 발표) |
| 런타임 | Schneider Electric이 nxtControl의 IEC 61499 런타임 코드를 기증해 출발. 오픈소스가 아닌 회원 기반 공유 소스(shared source) 모델 |
| Eclipse 4diac | IEC 61499 오픈소스 구현(IDE와 FORTE 런타임). 학습·연구용으로 접근하기 쉬움 |

IEC 61499는 아직 IEC 61131-3만큼 널리 쓰이지 않습니다. 도입 전에 사용할 하드웨어의 런타임 지원, 현장 인력 교육, 기존 IEC 61131-3 자산과의 연동을 확인합니다.

## 가상 PLC

가상 PLC는 PLC 펌웨어를 전용 하드웨어가 아니라 산업용 PC·서버의 가상화 환경에서 실행하는 형태입니다.

| 제품 | 내용 |
| --- | --- |
| Siemens SIMATIC S7-1500V | 2023년 하노버 메세에서 처음 공개. S7-1500 기능 기반의 하드웨어 독립 가상 PLC로 Industrial Edge 앱 형태로 배포. TIA Portal 프로젝트와 호환. 기능 매뉴얼은 VMware ESXi 등에 설치한 Industrial Edge Virtual Device에서 실행하는 구성과 실시간 설정(CPU 예약 등)을 안내 |

- 가상 PLC는 IT 인프라(서버, 가상화, 네트워크) 운영 역량이 필요합니다. 하이퍼바이저 설정이 실시간성에 직접 영향을 줍니다.
- I/O는 여전히 현장에 있으므로 PROFINET 등 네트워크 설계와 [OT 보안](../safety/ot-security.md)이 더 중요해집니다.

## 생성형 AI 엔지니어링 코파일럿

| 제품 | 상태(확인 시점) | 할 수 있는 것 |
| --- | --- | --- |
| Siemens Engineering Copilot TIA | Standard 등급은 일부 파일럿 고객 대상 Preview, 생산용 사용 대상 아님 | SCL 코드 생성, 기존 SCL 블록의 테스트 케이스 생성, 코드 문서화, WinCC Unified 화면·JavaScript, 프로젝트 텍스트 번역. LAD 생성은 "coming soon" |
| Beckhoff TwinCAT CoAgent | 2023년 TwinCAT Chat 공개 → 2025-03 "TwinCAT Chat의 진화"로 CoAgent 발표 → 2026-06-23 TwinCAT 3 CoAgent for Engineering(TE1700) 발표 | XAE 안에서 코드 제안·최적화, I/O 구성, HMI, 문서화. MCP 클라이언트로 동작해 PLC·I/O·HMI용 MCP 서버와 연결, 사용자 MCP 서버 추가 가능, 여러 LLM과 로컬 모델 선택 가능 |
| Rockwell FactoryTalk Design Studio Copilot | 제품 문서에 기능 안내 | 코드 설명·생성, 버전 관리 동작 실행. 안전 관련 PLC 코드와 장치 구성은 설명만 하고 수정하지 않음 |

AI 코파일럿을 쓸 때 원칙 (경험칙):

- 생성된 코드는 사람이 읽고, 단위 테스트와 시뮬레이션을 통과한 뒤에만 다운로드합니다. 공통 원칙은 [AI 에이전트의 SDLC 역할](../../AI/agents/sdlc-roles.md)을 참고합니다.
- 안전 관련 코드(안전 PLC, 비상정지, 인터록)는 AI가 만든 코드를 그대로 쓰지 않습니다. Rockwell처럼 제품 차원에서 수정을 막는 경우도 있습니다.
- 프로젝트 파일·설비 정보가 외부 클라우드로 나가는지 확인합니다. 공장망 정책상 외부 연결이 안 되면 로컬 모델 지원 여부를 봅니다([로컬 모델](../../AI/local-models/README.md)).
- MCP 같은 도구 연결은 AI가 프로젝트를 직접 바꿀 수 있는 권한입니다. 승인 단계와 권한 범위를 확인합니다([MCP 개념](../../AI/mcp/concepts.md), [프롬프트 인젝션](../../AI/security/prompt-injection.md)).

## 실무 도입 순서 (경험칙)

| 순서 | 할 일 | 효과 |
| --- | --- | --- |
| 1 | 코딩 규칙 정하기: 이름 규칙, 언어 선택 기준, 출력 한 곳에서 쓰기, 알람 번호 체계 | 사람 간 리뷰가 가능해짐 |
| 2 | 저장소 만들기: 텍스트 내보내기 또는 Git 지원 도구, 다운로드 버전과 커밋 연결 | "어느 것이 최신인가" 문제 해결 |
| 3 | 재사용 FB 라이브러리화: 모터·밸브·알람 FB를 별도 라이브러리로 버전 관리 | 프로젝트 간 품질 통일 |
| 4 | 라이브러리 FB부터 단위 테스트 | 가장 많이 재사용되는 코드부터 검증 |
| 5 | 시뮬레이션·가상 시운전 | 현장 시운전 시간 단축 |
| 6 | CI 자동화: 빌드·테스트를 커밋마다 실행 | 회귀 오류 조기 발견 |
| 7 | AI 보조 도입: 문서화·설명·테스트 생성처럼 위험이 낮은 작업부터 | 검증 체계 위에서 생산성 향상 |

## 주의점

| 주의점 | 이유 |
| --- | --- |
| 도구 버전 고정 | 벤더 도구 버전이 다르면 프로젝트를 열 수 없거나 변환됩니다. 빌드 서버와 개발 PC의 버전·업데이트를 맞춥니다 |
| 온라인 편집 관리 | 현장 수정이 저장소에 반영되지 않으면 다음 다운로드에서 사라집니다 |
| 라이선스 | Git 연동, 테스트 도구, 시뮬레이터, 빌드 서버가 별도 라이선스인 경우가 많습니다 |
| 현장 인력 | ST·Git 중심으로 바꾸면 보전 인력이 못 읽을 수 있습니다. 래더 유지 영역을 남기거나 교육을 병행합니다 |
| 안전 검증 분리 | 버전 관리·테스트 자동화가 기능 안전 검증 절차를 대신하지 않습니다([기능 안전](../safety/functional-safety.md)) |

## 참고 자료

- [IEC 61131-10:2019 (IEC Webstore)](https://webstore.iec.ch/publication/33034) - PLC open XML exchange format, 2019-04-24
- [TIA Portal V20 Update 4 Readme (Siemens, 09/2025)](https://cache.industry.siemens.com/dl/files/851/109963851/att_1332651/v2/ReadMe_TIA_V20_UPD4_enUS.pdf) - SIMATIC SD 형식의 SCL·FBD·F-DB 내보내기, Openness·VCI
- [Using TIA Portal Version Control Interface (Siemens, V20)](https://docs.tia.siemens.cloud/r/en-us/v20/using-tia-portal-version-control-interface)
- [SIMATIC AX (Siemens)](https://www.siemens.com/en-us/products/simatic-ax/) - VS Code 기반, Git, 단위 테스트, CI
- [SIMATIC AX 개요 (Siemens Developer)](https://developer.siemens.com/simatic-ax/overview.html) - 얼리 액세스 단계
- [Siemens expands accessibility to Software-Defined Automation with Simatic AX (보도자료, 2026-06-18)](https://assets.new.siemens.com/siemens/assets/api/uuid:2c354e35-acfa-4aeb-b34d-1d6b373fb5cc/HQDIPR202606177407EN.pdf) - XLad, S7-1200 G2
- [simatic-ax/snippetscollection (GitHub)](https://github.com/simatic-ax/snippetscollection) - AxUnit, apax
- [TwinCAT 3 Source Control (Beckhoff)](https://download.beckhoff.com/download/Document/automation/twincat3/TC3_SourceControl_EN.pdf) - Build 4026 기준 Git 빠른 시작
- [CODESYS Git (CODESYS Store)](https://store.codesys.com/en/codesys-git.html) - 버전, 요구 사항, JSON 저장 형식
- [CODESYS Test Manager: Automating the Unit Tests](https://content.helpme-codesys.com/en/CODESYS%20Test%20Manager/_tm_f_automate_unit_tests.html)
- [TcUnit (GitHub)](https://github.com/tcunit/TcUnit) - 프로젝트 상태, 릴리스 1.3.1, MIT 라이선스
- [TcUnit-Runner (GitHub)](https://github.com/tcunit/TcUnit-Runner) - 보관(archived) 상태
- [Distributed Version Control for Studio 5000 Logix Designer (Rockwell)](https://literature.rockwellautomation.com/idc/groups/literature/documents/at/logix-at003_-en-p.pdf) - ACD와 L5X
- [Industrial DevOps: CI/CD for Logix Control Systems (Rockwell, 2024-11)](https://literature.rockwellautomation.com/idc/groups/literature/documents/at/logix-at002_-en-p.pdf) - Jenkins, Logix Echo, `ra-logix-cicd`
- [FactoryTalk Design Studio: Project version control](https://www.rockwellautomation.com/en-in/docs/factorytalk-design-studio/current/contents-ditamap/using-the-software/project-version-control.html)
- [FactoryTalk Design Studio Copilot](https://www.rockwellautomation.com/en-in/docs/factorytalk-design-studio/current/contents-ditamap/getting-started/factorytalk-design-studio-copilot.html) - 안전 코드 수정 불가
- [Engineering Copilot TIA Standard Preview (Siemens)](https://www.siemens.com/en-gb/products/tia-portal/engineering-copilot-tia-standard-preview/)
- [TwinCAT CoAgent for Engineering 보도자료 (Beckhoff, 2026-06)](https://www.beckhoff.com/en-us/company/press/open-model-independent-ai-assistance-for-automation-programming-and-controls-engineering-2026-06.html) - TE1700, MCP
- [TwinCAT PLC++ and TwinCAT CoAgent (Beckhoff, 2025-03)](https://www.beckhoff.com/en-us/company/press/twincat-plc-and-twincat-coagent-2025-03.html) - CoAgent는 TwinCAT Chat의 진화
- [SIMATIC S7-1500V (Siemens)](https://www.siemens.com/en-us/products/simatic/s7-1500v/)
- [S7-1500 Virtual Controller CPU 151xV 기능 매뉴얼 (Siemens)](https://support.industry.siemens.com/dl/files/319/109996319/att_1346141/v1/S7-1500_Virtual_Controller_CPU_151xV_en-US.pdf) - Industrial Edge Virtual Device, ESXi 설정
- [First virtual Simatic controller (Siemens 보도자료)](https://press.siemens.com/global/en/pressrelease/first-virtual-simatic-controller-enables-more-flexible-software-based-automation)
- [Installation Integrity Validator Release Notes (Siemens, 09/2026)](https://cache.industry.siemens.com/dl/files/559/110001559/att_1379058/v1/InstallationIntegrityValidator_ReleaseNotes_1.16.3_enUS.pdf) - TIA Portal V21과 S7-PLCSIM Advanced V8.0
- [UniversalAutomation.org](https://universalautomation.org/)
- [UniversalAutomation.org Launched (automation.com, 2021-12)](https://www.automation.com/en-US/Articles/December-2021/UniversalAutomation-org-multivendor-industrial) - 설립, nxtControl 런타임 기증
- [UniversalAutomation.org more than 100 members (automation.com, 2025-03)](https://www.automation.com/en-us/articles/march-2025/universalautomation-org-more-than-100-members)
- [Eclipse 4diac](https://eclipse.dev/4diac/)
- [IEC 61499-1:2012 (IEC Webstore)](https://webstore.iec.ch/en/publication/5506)

확인일: 2026-10-21 (각 제품의 이름·상태·버전 확인. TwinCAT "Multiple Project Files" 메뉴 위치와 PLCSIM Advanced V8.0의 가상 시운전 세부 절차는 미확인. 도입 순서·주의점은 경험칙)

관련: [IEC 61131-3 개요](./iec-61131-3.md), [CI/CD 기초](../../Infrastructure/cicd/cicd-basics.md), [제조사 비교](../vendors/vendor-comparison.md), [OT 보안](../safety/ot-security.md)

다음: [산업 통신](../communication/README.md)
