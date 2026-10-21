# 주소 체계와 엔지니어링 툴

같은 "첫 번째 입력 접점"이 제조사에 따라 `X0`, `P00000`, `%IX0.0.0`, `I0.0`, `Local:1:I.Data.0`으로 적힙니다. 이 문서는 주요 제조사의 주소 체계를 비교하고, 어느 툴을 쓰든 반복되는 작업 흐름과 현장 주의점을 정리합니다.

> 디바이스 범위(최대 번호)는 CPU 형명마다 다릅니다. 아래 범위는 예시이며, 실제 설계는 해당 CPU 매뉴얼로 확인합니다.

## 주소를 정하는 세 가지 방식

| 방식 | 설명 | 예 |
| --- | --- | --- |
| 디바이스(메모리 영역) 방식 | 제조사가 정한 문자 + 번호로 고정 메모리를 직접 가리킴 | Mitsubishi `X0`, `M100`, `D200` / LS XGK `P00000`, `D00100` / Omron CJ `CIO 0.00` |
| IEC 직접 주소 | IEC 61131-3의 `%` 표기. 영역 문자 + 크기 문자 + 번호 | `%IX0.0`, `%QW10`, `%MD100` / LS XGI `%IX0.0.0` |
| 태그·변수(심볼) 방식 | 이름으로 접근하고 메모리 위치는 툴이 배치 | Rockwell 태그, Omron NJ·NX 변수, Siemens 최적화 블록, CODESYS·TwinCAT 변수 |

새 프로젝트는 대부분 이름(심볼)으로 프로그래밍하고, 주소는 I/O 연결이나 HMI·외부 통신처럼 꼭 필요한 곳에만 씁니다(경험칙). HMI가 PLC 데이터를 참조하는 방식은 [태그와 시스템 구성](../hmi-scada/tags-and-architecture.md)을 참고합니다.

## IEC 직접 주소

```text
%  I  X  0.0
│  │  │  └─ 번호: 점(.)으로 나눈 계층 구조는 제조사가 정함
│  │  └──── 크기: X=비트(생략 가능), B=8비트, W=16비트, D=32비트, L=64비트
│  └─────── 영역: I=입력, Q=출력, M=메모리
└────────── 직접 주소 표시
```

| 예 | 뜻 |
| --- | --- |
| `%IX0.0` | 입력 비트 |
| `%QW10` | 출력 워드 10 |
| `%MD100` | 메모리 더블워드 100 |

번호 뒤 계층의 의미는 제조사마다 다릅니다. LS XGI의 `%IX0.0.0`은 베이스.슬롯.접점이고, CODESYS 계열은 장치 매핑 화면에서 정한 번호를 씁니다.

## Mitsubishi Electric(MELSEC)

| 디바이스 | 이름 | 단위 | 번호 진법 |
| --- | --- | --- | --- |
| X / Y | 입력 / 출력 | 비트 | **iQ-R: 16진수, iQ-F·FX: 8진수** |
| M | 내부 릴레이 | 비트 | 10진수 |
| L | 래치(보존) 릴레이 | 비트 | 10진수 |
| F | 어넌시에이터(고장 표시) | 비트 | 10진수 |
| B / W | 링크 릴레이 / 링크 레지스터 | 비트 / 워드 | 16진수 |
| SM / SD | 특수 릴레이 / 특수 레지스터 | 비트 / 워드 | 10진수 |
| T / C | 타이머 / 카운터(접점 TS·CS, 현재값 TN·CN) | - | 10진수 |
| D | 데이터 레지스터 | 워드 | 10진수 |
| R | 파일 레지스터 | 워드 | 10진수 |

- iQ-R의 입력은 `X0`–`X2FFF`처럼 16진수이고, iQ-F는 `X0`–`X1777`처럼 8진수입니다(접속 매뉴얼의 디바이스 범위 기준). FX도 8진수라서 `X7` 다음은 `X10`, `X77` 다음은 `X100`입니다.
- 그래서 9번째 입력은 iQ-R에서 `X8`, iQ-F에서 `X10`입니다. iQ-R 경험으로 iQ-F 도면을 읽으면 번호가 어긋납니다.
- Q 시리즈의 X/Y 진법은 이번에 1차 출처로 확인하지 못했습니다(미확인). Q 설비는 해당 CPU 매뉴얼로 확인합니다.
- GX Works3는 라벨(변수)도 지원하므로, 디바이스는 I/O와 외부 통신에 쓰고 로직은 라벨로 작성하는 구성이 가능합니다.

## LS ELECTRIC

### XGK·XBM·XBC: 디바이스 방식

| 디바이스 | 이름 | 비고 |
| --- | --- | --- |
| P | 입출력 릴레이 | 슬롯의 I/O 모듈에 할당 |
| M | 보조 릴레이 | 내부 비트 |
| K | 킵 릴레이 | 정전 시 유지 |
| L | 링크 릴레이 | 통신(고속 링크) 영역 |
| F | 특수 릴레이 | 시스템 플래그, 쓰기 금지 |
| T / C | 타이머 / 카운터 | 접점과 현재값 |
| S | 스텝 제어 릴레이 | 순차 제어 |
| D | 데이터 레지스터 | 워드 |
| U | 특수 모듈 레지스터 | 아날로그 등 특수 모듈 데이터. `U베이스슬롯.워드` |
| Z | 인덱스 레지스터 | 간접 지정 |
| N | 통신 데이터 레지스터 | P2P 통신 설정 |
| R / ZR | 파일 레지스터 | CPU에 따라 지원 범위 다름 |

**비트 주소 읽는 법**: 워드 번호(10진수) 뒤에 비트 번호 1자리(16진수 0~F)를 붙입니다.

```text
P0000F  → P 워드 0000의 15번 비트
P00010  → P 워드 0001의 0번 비트
U02.05  → 베이스 0, 슬롯 2 특수 모듈의 5번 워드
```

같은 문자라도 Mitsubishi와 뜻이 다릅니다. LS의 `L`은 링크 릴레이, Mitsubishi의 `L`은 래치 릴레이입니다. LS의 `F`는 특수 릴레이, Mitsubishi의 `F`는 어넌시에이터입니다. 두 제조사 설비를 함께 다루면 도면에 제조사를 꼭 적습니다.

### XGI·XGR·XEC: IEC 방식

| 영역 | 뜻 | 예 |
| --- | --- | --- |
| `%IX` / `%IW` | 입력(베이스.슬롯.접점 / 워드) | `%IX0.0.0` = 베이스 0, 슬롯 0, 0번 접점 |
| `%QX` / `%QW` | 출력 | `%QX0.1.0` |
| `%MX` / `%MW` | 직접 변수(메모리) | `%MW100` |
| `%FX` / `%FW` | 시스템 플래그(쓰기 금지) | - |
| `%LX` / `%LW` | 고속 링크 플래그 | - |
| `%NX` / `%NW` | P2P 파라미터 플래그 | - |
| `%UX` / `%UW` | 아날로그 리프레시 플래그 | `%UW0.2.5` |

XGI 프로그램은 보통 이름 있는 변수를 선언하고, I/O 변수만 `%IX`·`%QX`에 연결합니다.

## Siemens(S7-1200·S7-1500)

| 표기 | 뜻 |
| --- | --- |
| `I0.0` | 입력 바이트 0의 0번 비트(비트는 0~7) |
| `IB0` / `IW0` / `ID0` | 입력 바이트 / 워드 / 더블워드 |
| `Q0.0` | 출력 비트 |
| `M10.0`, `MW10` | 비트 메모리 |
| `DB1.DBX0.0`, `DB1.DBW2` | 데이터 블록 1의 비트 / 워드(표준 액세스 블록만) |

- 비트 번호는 0~7이라 `I0.7` 다음은 `I1.0`입니다.
- `MW10`은 `MB10`과 `MB11` 두 바이트를 차지합니다. 그래서 `MW10`과 `MW11`은 겹칩니다. 워드는 짝수 번호로만 쓰는 규칙을 정해 둡니다(경험칙).
- **최적화 블록 액세스(Optimized block access)**: S7-1200/1500에서 새로 만든 블록의 기본값입니다. 최적화 블록에는 **심볼릭 접근만** 있으므로 `DB1.DBW2` 같은 절대 주소를 쓸 수 없습니다. 외부 장치가 절대 오프셋을 요구하면 해당 DB만 표준 액세스로 바꿉니다.
- 입출력(`I`·`Q`)과 비트 메모리(`M`)는 PLC 태그 테이블에서 이름을 붙여 심볼릭으로 씁니다.

## Rockwell Automation(Logix)

Logix 컨트롤러에는 사용자가 고르는 메모리 주소가 없습니다. 모든 데이터는 **태그**이고, I/O 모듈을 I/O 구성에 추가하면 툴이 컨트롤러 범위 태그를 자동으로 만듭니다.

```text
Location:Slot:Type.Member.SubMember.Bit

Local:2:I.Data.3
│     │ │ │    └─ 비트(디지털 모듈의 점 번호)
│     │ │ └────── 멤버: 디지털은 Data, 아날로그는 채널(Ch#)
│     │ └──────── 타입: I=입력, O=출력, C=구성, S=상태
│     └────────── 슬롯 번호
└──────────────── 위치: Local=컨트롤러와 같은 섀시·DIN 레일, 원격은 어댑터 이름
```

로직에서는 I/O 태그를 직접 쓰기보다 `stop`, `conveyor_on` 같은 **별칭(alias) 태그**를 만들어 `Local:2:I.Data.1` 등에 연결합니다. 모듈 위치가 바뀌어도 별칭 대상만 바꾸면 됩니다.

## Omron

### CJ·CP(CX-Programmer): 메모리 영역 방식

| 영역 | 이름 | 비고 |
| --- | --- | --- |
| CIO | CIO 영역 | I/O 유닛 할당. `CIO 0001.03` = 워드 1의 3번 비트(비트는 00~15) |
| W | 워크 영역 | 내부 비트. 전원 재투입·모드 변경 시 지워짐(W501의 CJ 유닛용 메모리 설명 기준) |
| H | 홀딩 영역 | 정전 시 유지 |
| D | DM 영역 | 데이터 워드 |

### NJ·NX(Sysmac Studio): 변수 방식

- 변수에 메모리를 자동 배치하므로 주소를 관리하지 않습니다. EtherCAT 슬레이브나 내장 I/O는 I/O 맵에서 **장치 변수**로 연결합니다.
- CJ 시리즈 유닛과 연결할 때만 "CJ 시리즈 유닛용 메모리"를 쓰고, 이 메모리는 **AT 지정**한 변수로만 접근합니다. 예: `%D100`(워드), `%W0.00`(비트).
- 값을 정전 후에도 유지하려면 변수에 Retain 속성을 줍니다.

## 대응표

같은 역할을 하는 영역을 나란히 놓았습니다. 정확히 1:1로 대응하지 않는 칸은 가장 가까운 것을 적었고, `-`는 해당 개념이 없거나 다른 방식으로 처리한다는 뜻입니다.

| 역할 | IEC 직접 | Mitsubishi iQ-R / iQ-F | LS XGK | LS XGI | Siemens | Rockwell | Omron CJ / NJ·NX |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 첫 입력 점 | `%IX0.0` | `X0` / `X0` | `P00000`(슬롯 할당 기준) | `%IX0.0.0` | `I0.0` | `Local:1:I.Data.0` | `CIO 0.00` / 장치 변수 |
| 9번째 입력 점 | 제조사 계층 | `X8` / `X10` | `P00008` | `%IX0.0.8` | `I1.0` | `Local:1:I.Data.8` | `CIO 0.08` / 장치 변수 |
| 내부 비트 | `%MX` | `M` | `M` | `%MX` | `M` | BOOL 태그 | `W` / 변수 |
| 정전 유지 비트 | RETAIN 변수 | `L` | `K` | RETAIN 변수 | 보존 설정한 `M`·DB | - | `H` / Retain 변수 |
| 데이터 워드 | `%MW` | `D` | `D` | `%MW` | `MW`, DB | INT·DINT 태그 | `D` / 변수(`%D` AT 지정) |
| 시스템 비트·워드 | - | `SM` / `SD` | `F` | `%FX` / `%FW` | - | - | - / 시스템 정의 변수 |
| 네트워크 공유 영역 | - | `B` / `W` | `L`, `N` | `%LX`, `%NX` | - | - | - |
| 특수 모듈 데이터 | - | 유닛 버퍼 메모리(`U`·`G` 지정) | `U` | `%UX` / `%UW` | - | 모듈 태그(`Ch#` 멤버) | - |

9번째 입력 행은 16점 이상 입력 모듈 하나가 첫 슬롯에 있다고 가정했습니다. 실제 번호는 I/O 할당 설정(고정·가변 할당, 시작 번호)에 따라 달라집니다.

## 툴 공통 작업 흐름

어느 툴이든 순서는 거의 같습니다. 메뉴 이름만 다릅니다.

| 단계 | 할 일 | 확인할 것 |
| --- | --- | --- |
| 1. 프로젝트 생성 | CPU 계열·형명 선택 | 실제 CPU 형명과 펌웨어 버전. 계열을 잘못 고르면 나중에 바꾸기 어려움 |
| 2. 하드웨어 구성 | 베이스·슬롯·모듈 배치, 네트워크 장치 등록 | I/O 번호(주소) 할당, IP 주소, 장치 설명 파일(GSDML·EDS·ESI) 버전 |
| 3. 프로그램 작성 | 변수·태그 선언, 로직 작성 | 명명 규칙, 주석, 이중 코일(같은 출력을 두 곳에서 쓰기) 여부 |
| 4. 컴파일·검사 | 오류·경고 확인 | 경고도 읽기. 미사용 변수와 중복 출력 경고는 실제 버그인 경우가 많음(경험칙) |
| 5. 시뮬레이션 | 하드웨어 없이 로직 실행 | 시뮬레이터가 지원하지 않는 기능(특수 모듈, 통신, 시간) 목록 |
| 6. 다운로드 | PLC에 쓰기 | 대상 PLC가 맞는지(IP·국번), STOP 필요 여부, 전체 쓰기인지 변경분 쓰기인지 |
| 7. 온라인 모니터링 | 값 확인, 강제·값 변경 | 강제 표시가 켜져 있는지, 끝나면 모두 해제했는지 |
| 8. 업로드·비교 | PLC 프로그램과 PC 프로젝트 비교 | 다운로드 전에 현재 PLC 내용을 먼저 백업 |
| 9. 백업 | 프로젝트 파일 보관, 변경 이력 기록 | 툴·펌웨어 버전, 날짜, 변경 사유 |

### 시뮬레이터·에뮬레이터

| 제조사 | 툴 | 시뮬레이터 | 알아 둘 점 |
| --- | --- | --- | --- |
| LS ELECTRIC | XG5000 | XG-SIM | Windows 가상 PLC. LD·ST·SFC 프로그램 실행, 필드 I/O 모의 |
| Mitsubishi | GX Works3 | GX Simulator3 | CPU별로 시뮬레이션을 지원하는 최소 GX Works3 버전이 다름(예: FX5S는 1.085P 이상) |
| Siemens | TIA Portal | S7-PLCSIM, S7-PLCSIM Advanced | Advanced는 S7-1500 계열(C·T·F·R·H·소프트·오픈·드라이브)과 ET 200SP CPU를 지원하고 TCP/IP 통신·안전·웹 서버까지 모의 |
| Rockwell | Studio 5000 | Studio 5000 Logix Emulate, FactoryTalk Logix Echo | Logix Echo는 ControlLogix 5590·5580, GuardLogix 5580, CompactLogix 5380, Compact GuardLogix 5380을 에뮬레이션. Emulate3D와 연동 가능 |
| Rockwell(Micro800) | CCW | Micro800 Simulator | Standard Edition에는 데모 버전, Developer Edition에는 전체 버전 |
| Omron | Sysmac Studio | 내장 시뮬레이션 | 64비트판의 3D 시뮬레이션은 별도 옵션 라이선스 |
| Beckhoff | TwinCAT 3 | 로컬 PC 런타임 | 개발 PC에서 런타임을 7일 체험 라이선스로 실행 가능 |
| CODESYS | Development System | CODESYS Control Win SL | Windows 소프트 PLC. 라이선스 없으면 2시간 데모 후 수동 재시작 |

시뮬레이션은 로직 검증용입니다. 실제 배선, 센서 채터링, 통신 지연, 스캔 시간은 시뮬레이터에서 드러나지 않습니다. 시운전 전에 실기 I/O 점검을 따로 합니다([I/O 배선](../basics/io-wiring.md) 참고).

## 현장 작업 시 주의

| 작업 | 위험 | 대응 |
| --- | --- | --- |
| 온라인 편집(RUN 중 변경) | 편집 반영 순간 출력이 바뀌어 설비가 예상치 않게 움직임. 편집 중 통신이 끊기면 PC와 PLC 내용이 어긋남 | 설비를 안전 상태로 두고 작업. 영향 범위를 미리 확인. 반영 후 즉시 업로드·비교(경험칙) |
| 강제(force) | 강제한 입출력은 로직과 무관하게 고정됨. 해제를 잊으면 다음 근무자가 원인을 못 찾음 | 강제 목록을 기록하고, 작업 종료 전 툴의 강제 표시가 꺼졌는지 확인. 인수인계에 남김 |
| 다운로드 | 다른 PLC에 쓰거나, PC의 오래된 프로젝트로 현장 수정본을 덮어씀 | 대상 IP·국번 확인, 다운로드 전에 업로드해서 비교·백업 |
| 펌웨어·툴 버전 | 새 툴로 저장한 프로젝트를 구 버전 툴에서 열 수 없거나, CPU 펌웨어가 기능을 지원하지 않음 | 프로젝트별로 툴·펌웨어 버전 고정. 업그레이드는 계획 정지 때 |
| 통신 드라이버 | 툴 업데이트로 통신 드라이버가 바뀜 | 예: Studio 5000 v38.00부터 RSLinx Classic이 설치되지 않고 FactoryTalk Linx가 포함됨. 업데이트 전에 릴리스 노트 확인 |
| 접근 통제 | 누구나 엔지니어링 PC로 PLC를 수정 | PLC 비밀번호·보호 기능 사용, 엔지니어링 PC 관리. [OT 보안](../safety/ot-security.md) 참고 |

안전 회로(비상 정지, 안전 인터록)는 PLC 프로그램 수정이나 강제로 무력화하지 않습니다. [비상 정지와 인터록](../safety/emergency-stop-and-interlock.md)을 참고합니다.

## 흔한 실수

| 실수 | 결과 | 대응 |
| --- | --- | --- |
| iQ-R과 iQ-F의 X/Y 진법을 같다고 봄 | 다른 입력을 보고 판단 | 시리즈부터 확인 |
| LS `L`·`F`를 Mitsubishi 의미로 읽음 | 통신 영역·시스템 플래그를 잘못 조작 | 도면과 주석에 제조사·계열 표기 |
| Siemens `MW10`과 `MW11`을 함께 사용 | 값이 서로 덮어씀 | 워드는 짝수 번호, 더블워드는 4 단위 |
| 최적화 DB를 외부 장치에서 절대 주소로 읽으려 함 | 통신 설정 불가 | 해당 DB만 표준 액세스로 두거나 심볼릭 통신 사용 |
| Rockwell I/O 태그를 로직 곳곳에서 직접 사용 | 모듈 이동 시 수정할 곳이 많음 | 별칭 태그 사용 |
| 강제 해제를 잊고 퇴근 | 다음 날 설비가 이상 동작 | 작업 종료 점검표에 강제 해제 확인 포함 |

## 점검표

| 질문 |
| --- |
| CPU 계열과 형명, 주소 체계(디바이스·IEC·태그)를 확인했는가 |
| X/Y 진법과 I/O 할당 시작 번호를 확인했는가 |
| 다운로드 전에 현재 PLC 프로그램을 업로드해 비교·백업했는가 |
| 온라인 편집의 영향 범위를 확인하고 설비를 안전 상태로 두었는가 |
| 작업 종료 시 강제 표시가 모두 해제되었는가 |
| 툴·펌웨어 버전과 변경 이력을 기록했는가 |

## 참고 자료

공통

- [IEC 61131-3:2025](https://webstore.iec.ch/en/publication/68533)

Mitsubishi Electric

- [Pro-face iQ-R/F 이더넷(SLMP Client) 드라이버 매뉴얼(일본어, iQ-R·iQ-F 디바이스 범위와 진법)](https://proface.com/media/48819)
- [FAQ 25000: FX 입력 번호는 8진수](https://fa-faq.mitsubishielectric.com/faq/show/25000), [FAQ 22327: FX5 시뮬레이션 지원 GX Works3 버전](https://fa-faq.mitsubishielectric.com/faq/show/22327)
- [ICONICS: GX Works3 시뮬레이션 설정(GX Simulator3)](https://documentation.iconics.com/v11/Content/Data-Connectivity/Mitsubishi%20Electric%20FA/setting-up-simulation-for-GX-works-3.htm)

LS ELECTRIC

- [Pro-face XGT/XGB FEnet 드라이버 매뉴얼(XGK·XBM·XBC 디바이스, XGI·XGR·XEC IEC 주소)](https://www.proface.com/en/download/exdriver/plc/ls_xgte)
- [AutomationDirect XG5000 소프트웨어(XG-SIM)](https://www.automationdirect.com/ls/software)

Siemens

- [Programming Guideline S7-1200/1500(최적화 블록 액세스, 심볼릭 접근)](https://cache.industry.siemens.com/dl/files/040/90885040/att_861867/v1/81318674_Programming_guideline_DOCU_v14_en.pdf)
- [S7-PLCSIM Advanced 개요](https://developer.siemens.com/s7-plcsim-advanced/overview.html)

Rockwell Automation

- [Logix 5000 Controllers I/O and Tag Data, 1756-PM004L(I/O 주소 형식, 별칭 태그)](https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm004_-en-p.pdf)
- [FactoryTalk Logix Echo](https://www.rockwellautomation.com/en-in/products/software/factorytalk/designsuite/logix-echo.html), [설계·구성 소프트웨어(CCW, Micro800 Simulator)](https://www.rockwellautomation.com/en-au/capabilities/industrial-automation-control/design-and-configuration-software.html)
- [Studio 5000 Logix Designer 38.00 기능 변경(FactoryTalk Linx)](https://www.rockwellautomation.com/en-gb/docs/studio-5000-logix-designer/38-00/releasenotesmainenu-ditamap/system/functional-changes.html)

Omron

- [NJ/NX CPU Unit Software User's Manual, W501-E1-49(AT 지정, CJ 유닛용 메모리, 워크·홀딩 영역)](https://files.omron.eu/downloads/latest/manual/en/w501_nj_nx-series_cpu_unit_software_users_manual_en.pdf?v=3)
- [CS/CJ 명령어 레퍼런스 매뉴얼 W474(CIO 주소 표기)](https://files.omron.eu/downloads/latest/manual/en/w474_cs_cj_nsj-series_plc,_sysmac_one_nsj_series_reference_manual_en.pdf?v=1789137185), [Sysmac Studio 체험판 안내(3D 시뮬레이션 옵션)](https://omron.helpjuice.com/sysmac-studio/sysmac-studio-trial-software)

Beckhoff·CODESYS

- [TwinCAT 3 라이선스(7일 체험)](https://www.beckhoff.com/en-en/products/automation/twincat/twincat-3-licensing/)
- [CODESYS Control Win SL 데이터시트(2시간 데모)](https://store.codesys.com/media/n98_media_assets/files/2302000003/4/CODESYS%20Control%20Win%20SL_en.pdf)

확인일: 2026-10-21 (디바이스 문자·진법·주소 형식·시뮬레이터 이름·체험 조건 항목. Mitsubishi·LS 디바이스 범위와 진법은 Pro-face 접속 매뉴얼 기준이며 Q 시리즈 진법은 미확인. 6개월 후 재확인 대상)

관련: [주요 제조사·플랫폼 비교](./vendor-comparison.md), [래더 기초](../programming/ladder-basics.md), [OT 보안](../safety/ot-security.md)

다음: [제조사·플랫폼 목차](./README.md)
