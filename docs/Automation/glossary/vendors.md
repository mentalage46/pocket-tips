# 제조사·도구 용어

[전체 용어 색인](./README.md)

제품 라인과 툴 버전은 2026-10-21 기준입니다. 바뀌는 정보는 [제조사·플랫폼](../vendors/README.md) 문서의 참고 자료로 다시 확인합니다.

## 주소 체계

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| 디바이스 방식 / Device addressing | 제조사가 정한 문자 + 번호로 고정 메모리를 직접 가리키는 주소 방식입니다. Mitsubishi `X0`·`D200`, LS XGK `P00000`, Omron CJ `CIO 0.00`이 예이며, 같은 문자라도 제조사마다 뜻이 다릅니다. |
| X·Y 진법 / X, Y numbering | Mitsubishi 입력(X)·출력(Y) 번호의 진법으로 iQ-R은 16진수, iQ-F·FX는 8진수입니다. 그래서 9번째 입력이 iQ-R에서는 `X8`, iQ-F에서는 `X10`이며, iQ-R 경험으로 iQ-F 도면을 읽으면 번호가 어긋납니다. |
| MELSEC 디바이스 / M, L, F, B·W, SM·SD, D | Mitsubishi의 내부 릴레이(M), 래치(보존) 릴레이(L), 어넌시에이터(F), 링크 릴레이·레지스터(B·W), 특수 릴레이·레지스터(SM·SD), 데이터 레지스터(D)입니다. B·W는 16진수 번호, M·L·F·SM·SD·D는 10진수 번호를 씁니다. |
| XGK 디바이스 / P, M, K, L, F, D, U | LS XGK·XBM·XBC의 입출력 릴레이(P), 보조 릴레이(M), 킵(정전 유지) 릴레이(K), 링크 릴레이(L), 특수 릴레이(F), 데이터 레지스터(D), 특수 모듈 레지스터(U)입니다. LS의 L·F는 Mitsubishi의 래치 릴레이·어넌시에이터와 뜻이 다르므로 도면과 주석에 제조사를 적습니다. |
| XGK 비트 주소 / Word + bit address | 10진수 워드 번호 뒤에 16진수 비트 번호 1자리를 붙이는 LS 디바이스 비트 표기입니다. `P0000F`는 P 워드 0의 15번 비트이고, 그다음 `P00010`은 워드 1의 0번 비트입니다. |
| XGI IEC 주소 / %IX0.0.0 | LS XGI·XGR·XEC가 쓰는 IEC 방식 주소로, `%IX0.0.0`은 베이스 0, 슬롯 0, 0번 접점입니다. 같은 XG5000이라도 XGK(디바이스 방식)와 주소 체계가 다르므로 CPU 계열부터 확인합니다. |
| Siemens 절대 주소 / I0.0, IW0, MW10, DB1.DBW2 | 바이트.비트 또는 영역·크기·바이트 번호로 쓰는 Siemens 주소입니다. 비트 번호는 0–7이라 `I0.7` 다음이 `I1.0`이고, `MW10`은 `MB10`·`MB11`을 차지해 `MW11`과 겹치므로 워드는 짝수 번호로만 씁니다. |
| 최적화 블록 액세스 / Optimized block access | S7-1200/1500에서 새로 만든 블록의 기본값으로, 심볼릭 접근만 있어 `DB1.DBW2` 같은 절대 주소를 쓸 수 없습니다. 외부 장치가 절대 오프셋을 요구하면 해당 DB만 표준 액세스로 바꿉니다. |
| Logix I/O 태그 / Local:Slot:Type.Member | Rockwell Logix에서 I/O 모듈을 추가하면 자동으로 생기는 `위치:슬롯:타입.멤버.비트` 형식의 태그입니다. Logix에는 사용자가 고르는 메모리 주소가 없고, 타입 문자는 I 입력, O 출력, C 구성, S 상태입니다. |
| 별칭 태그 / Alias tag | `conveyor_on`처럼 의미 있는 이름을 붙여 I/O 태그에 연결한 Rockwell 태그입니다. 모듈 위치가 바뀌어도 별칭 대상만 바꾸면 되므로 로직에서는 I/O 태그를 직접 쓰지 않습니다. |
| Omron 메모리 영역 / CIO, W, H, D | Omron CJ·CP의 I/O 할당 영역(CIO), 워크 영역(W), 정전 시 유지되는 홀딩 영역(H), 데이터 워드 영역(D)입니다. `CIO 0001.03`은 워드 1의 3번 비트이며 비트 번호는 00–15입니다. |
| AT 지정 / AT specification | 변수를 특정 메모리 주소에 묶는 선언으로 IEC에서는 `xStartPb AT %IX0.0 : BOOL`처럼 씁니다. Omron NJ·NX는 CJ 시리즈 유닛용 메모리를 AT 지정한 변수로만 접근합니다. |

관련 문서: [주소 체계와 엔지니어링 툴](../vendors/addressing-and-tools.md), [IEC 61131-3 개요](../programming/iec-61131-3.md)

## 제조사와 제품

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| XGT·XGB / LS ELECTRIC | LS ELECTRIC의 PLC 계열로 XGT에는 XGK·XGI·XGR(이중화), 소형 XGB에는 XBM·XBC·XEC가 있습니다. XGK·XBM·XBC는 디바이스 방식, XGI·XGR·XEC는 IEC 방식 주소를 씁니다. |
| MELSEC iQ-R·iQ-F / Mitsubishi Electric | Mitsubishi의 중대형 모듈형(iQ-R)과 소형 일체형(iQ-F, FX5) 계열로 둘 다 GX Works3로 프로그래밍합니다. Q·FX3 같은 이전 세대 설비에서는 GX Works2를 자주 만납니다. |
| SIMATIC S7-1200·S7-1500 / Siemens | Siemens의 PLC 계열로 S7-1200 G2는 S7-1200의 2세대입니다. S7-1500R/H는 이중화 CPU, S7-1500V는 Industrial Edge 앱으로 배포하는 가상 PLC이고, ET 200SP는 분산 I/O입니다. |
| ControlLogix·CompactLogix·Micro800 / Rockwell Automation | Rockwell의 PLC 계열입니다. Logix 계열은 Studio 5000 Logix Designer로, 소형 Micro800은 Connected Components Workbench(CCW)로 프로그래밍합니다. |
| NJ·NX·CJ / Omron | Omron의 변수 기반 머신 컨트롤러(NJ·NX)와 구형 PLC(CJ·CP)입니다. NJ·NX는 Sysmac Studio 하나로 시퀀스·모션·HMI를 다루고, CJ·CP는 CX-Programmer와 메모리 영역 주소를 씁니다. |
| TwinCAT 3 / Beckhoff | IPC에서 실시간 런타임을 돌리는 Beckhoff의 PC 기반 제어로, Visual Studio에 통합된 XAE에서 프로그래밍합니다. POU가 개별 파일로 저장되어 Git을 쓰기 쉽고, PLC 프로그래밍용 엔지니어링은 무료입니다. |
| CODESYS | 여러 하드웨어 제조사가 런타임을 탑재하는 제조사 독립 개발 환경입니다. 개발 환경은 무료이고 런타임은 장치별로 유료이며, 장치 설명 파일과 라이브러리는 하드웨어 제조사가 제공합니다. |
| Modicon M580·M262 / Schneider Electric | Schneider Electric의 PLC로 M580은 Control Expert(구 Unity Pro), M262는 Machine Expert로 프로그래밍합니다. EcoStruxure Automation Expert는 IEC 61499 기반 개발 환경입니다. |
| OpenPLC | 교육·연구용 오픈소스 PLC입니다. Runtime v3는 지원이 종료되어 후속인 v4를 쓰며, 산업 인증이 필요한 설비에는 쓰지 않습니다. |

관련 문서: [주요 제조사·플랫폼 비교](../vendors/vendor-comparison.md), [PLC 구조와 형태](../basics/plc-architecture.md)

## 엔지니어링 도구

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| XG5000·XG-SIM | LS ELECTRIC의 무료 엔지니어링 툴과 내장 시뮬레이터입니다. XG-SIM은 Windows 가상 PLC로 LD·ST·SFC 프로그램을 실행합니다. |
| GX Works3·GX Simulator3 | Mitsubishi의 엔지니어링 툴과 시뮬레이터입니다. 라벨(변수)도 지원하고, CPU별로 시뮬레이션을 지원하는 최소 GX Works3 버전이 다릅니다. |
| TIA Portal·STEP 7 | Siemens의 통합 엔지니어링 환경과 그 안의 PLC 프로그래밍 도구입니다. V21부터 온프레미스·구독·클라우드 중 선택할 수 있고, Git 같은 버전 관리 도구와 연동할 수 있는 내보내기 형식이 추가되었습니다. |
| LAD·FBD·SCL·GRAPH·STL | TIA Portal에서 쓰는 언어 이름으로 LAD는 래더, SCL은 ST, GRAPH는 SFC 계열, STL은 IL 계열입니다. STL은 S7-1500만 지원합니다. |
| S7-PLCSIM·S7-PLCSIM Advanced | TIA Portal용 PLC 시뮬레이터입니다. Advanced는 S7-1500 계열과 ET 200SP CPU를 지원하고 TCP/IP 통신·안전·웹 서버까지 모의합니다. |
| SIMATIC AX | VS Code 기반의 텍스트 중심 Siemens 개발 환경으로 Git, 패키지 관리, 단위 테스트, CI를 지원합니다. 확인 시점 기준 선정된 고객에게만 제공하는 얼리 액세스 단계입니다. |
| Studio 5000 Logix Designer | Rockwell Logix 컨트롤러의 엔지니어링 툴로 기본 프로젝트 파일 `.ACD`는 바이너리입니다. v38.00부터 RSLinx Classic이 설치되지 않고 FactoryTalk Linx가 포함되므로 업데이트 전에 릴리스 노트를 확인합니다. |
| FactoryTalk Logix Echo | ControlLogix·CompactLogix 등을 PC에서 에뮬레이션하는 Rockwell 도구입니다. Rockwell의 PLC CI/CD 예제에서도 쓰입니다. |
| FactoryTalk Design Studio | 버전 관리와 Copilot이 내장된 Rockwell의 클라우드 기반 Logix 설계 도구입니다. Copilot은 안전 관련 PLC 코드와 장치 구성은 설명만 하고 수정하지 않습니다. |
| Sysmac Studio·CX-Programmer | Omron NJ·NX용 통합 툴과 구형 CJ·CP용 툴입니다. |
| CODESYS Control Win SL·Virtual Control SL | CODESYS의 Windows 소프트 PLC와, Docker·Podman 컨테이너로 실행하는 가상 PLC 런타임입니다. Control Win SL은 라이선스가 없으면 2시간 데모 후 수동으로 다시 시작합니다. |

관련 문서: [주소 체계와 엔지니어링 툴](../vendors/addressing-and-tools.md), [주요 제조사·플랫폼 비교](../vendors/vendor-comparison.md), [최신 실무: 버전 관리·테스트·AI](../programming/modern-practices.md)
