# 제조사·플랫폼

PLC의 스캔 사이클, 래더, 인터록 같은 개념은 제조사가 달라도 같습니다. 달라지는 것은 **주소 표기, 엔지니어링 툴, 라이선스, 주력 네트워크**입니다. 이 폴더는 주요 제조사를 비교하고, 어느 툴을 쓰든 반복되는 작업 흐름과 현장 주의점을 정리합니다.

국내 현장에서는 LS ELECTRIC과 Mitsubishi Electric을 자주 만나고, 수출 설비나 외국계 고객사는 Siemens·Rockwell Automation 사양을 요구하는 경우가 많습니다(경험칙). 처음이라면 비교 문서로 전체 지형을 보고, 실제로 맡은 설비의 제조사 행을 주소 체계 문서에서 찾아 읽습니다.

## 학습 순서

| 순서 | 문서 | 알 수 있는 것 |
| --- | --- | --- |
| 1 | [주요 제조사·플랫폼 비교](./vendor-comparison.md) | LS ELECTRIC·Mitsubishi·Siemens·Rockwell·Omron·Beckhoff·CODESYS·Schneider·OpenPLC의 제품 라인, 엔지니어링 툴, 언어 지원, 라이선스와 체험판, 선택 기준, 2025~2026 동향 |
| 2 | [주소 체계와 엔지니어링 툴](./addressing-and-tools.md) | IEC 직접 주소, Mitsubishi·LS 디바이스, Siemens 절대·심볼릭 주소, Rockwell 태그, Omron 변수와 AT 지정, 제조사 간 대응표, 공통 작업 흐름, 시뮬레이터, 온라인 편집·강제 주의 |

제품 라인·소프트웨어 버전·체험판 조건은 2026-10-21 기준입니다. 6개월이 지나면 각 문서의 참고 자료로 다시 확인합니다.

## 먼저 읽으면 좋은 문서

- [PLC 구조](../basics/plc-architecture.md), [스캔 사이클](../basics/scan-cycle.md): 제조사 문서를 읽기 전에 공통 동작 모델을 잡습니다.
- [IEC 61131-3](../programming/iec-61131-3.md): 툴마다 "LD·ST·SFC 지원"이라고 할 때 무엇을 뜻하는지 알 수 있습니다.
- [필드버스 개요](../communication/fieldbus-overview.md), [산업용 이더넷](../communication/industrial-ethernet.md): 제조사 선택이 네트워크 선택과 묶이는 이유를 이해합니다.

## 새 제조사 문서 작성 형식

특정 제조사·시리즈의 메모를 추가할 때는 이 폴더에 `제조사-시리즈.md` 형식으로 소문자와 하이픈을 써서 파일을 만듭니다. 예: `ls-xgk.md`, `mitsubishi-iq-r.md`, `siemens-s7-1500.md`.

1. **대상과 버전**: 제조사, 시리즈와 CPU 형명, 펌웨어 버전, 엔지니어링 툴 이름과 확인한 버전
2. **하드웨어 구성**: 베이스·랙·DIN 레일 구성, 전원, CPU, I/O·통신 모듈, 슬롯과 I/O 번호 할당 규칙
3. **주소·변수 체계**: 디바이스 문자와 진법, 비트·워드 표기, IEC·심볼릭 방식 지원 여부. [주소 체계 대응표](./addressing-and-tools.md)에 해당 열이나 행을 함께 추가합니다
4. **툴 작업 흐름**: 프로젝트 생성부터 업로드·비교까지 순서, 시뮬레이터 이름과 제약
5. **통신**: 지원하는 필드버스·산업용 이더넷 프로토콜, 설정 위치, 통신 드라이버
6. **현장 주의**: 온라인 편집 가능 범위, 강제(force) 표시와 해제 방법, 프로젝트 백업 파일 형식, 비밀번호·보안 설정
7. **참고 자료**: 매뉴얼 이름, 문서 번호와 개정판, 확인일

공통 개념은 [기초](../basics/README.md)와 [프로그래밍](../programming/README.md) 문서에 연결하고, 제조사 문서에는 해당 제품의 조건과 차이만 기록합니다. 버전·가격·체험판 조건처럼 바뀌는 정보에는 확인일을 붙입니다.

## 관련 지식

- [최신 PLC 개발 관행](../programming/modern-practices.md): 텍스트 내보내기, Git, 테스트
- [OT 보안](../safety/ot-security.md): 엔지니어링 PC와 PLC 접근 통제
- [태그와 시스템 구성](../hmi-scada/tags-and-architecture.md): HMI·SCADA에서 PLC 주소를 참조하는 방식
