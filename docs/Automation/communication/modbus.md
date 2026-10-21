# Modbus

Modbus는 1979년부터 쓰인 단순한 요청-응답 프로토콜입니다. 명세가 공개되어 있고 구현이 쉬워 PLC, 인버터, 전력량계, 온도 조절기 등 거의 모든 산업 장비가 지원합니다. 대신 데이터 형식·주소 표기·보안은 장비마다 해석이 달라 연동 문제의 대부분이 여기서 생깁니다.

## 변형과 용어

| 변형 | 전송 | 프레임 경계 | 오류 검사 | 비고 |
| --- | --- | --- | --- | --- |
| Modbus RTU | 시리얼(RS-485/232) | 3.5문자 이상의 무신호 구간 | CRC-16 | 바이너리. 시리얼 장치의 기본값 |
| Modbus ASCII | 시리얼 | `:`로 시작, CR LF로 끝 | LRC | 16진수 문자로 전송. 드묾 |
| Modbus TCP | TCP/IP, 포트 502 | MBAP 헤더의 길이 필드 | TCP에 맡김 | 이더넷 장비 대부분 |
| Modbus/TCP Security | TLS over TCP, 포트 802 | MBAP + TLS 레코드 | TLS | 인증서 기반 상호 인증 |

**마스터·슬레이브 → 클라이언트·서버**: Modbus Organization은 2020년 7월 9일 "master-slave" 표현을 문서와 웹사이트에서 없애고 "client-server"로 부른다고 발표했습니다. 요청을 보내는 쪽이 클라이언트(구 마스터), 응답하는 장치가 서버(구 슬레이브)입니다. 단, 2006년 시리얼 명세(V1.02)와 많은 장비 매뉴얼에는 여전히 master/slave, slave address라는 표현이 남아 있습니다.

## 데이터 모델

| 테이블 | 단위 | 접근 | 예 | 관례 표기(Modicon식) |
| --- | --- | --- | --- | --- |
| Coil | 1비트 | 읽기·쓰기 | 출력 릴레이, 운전 명령 비트 | 0xxxx (00001~) |
| Discrete Input | 1비트 | 읽기 전용 | 입력 접점, 상태 비트 | 1xxxx (10001~) |
| Input Register | 16비트 | 읽기 전용 | 측정값 | 3xxxx (30001~) |
| Holding Register | 16비트 | 읽기·쓰기 | 설정값, 파라미터, 범용 데이터 | 4xxxx (40001~) |

- 각 테이블은 주소 0~65535를 가집니다. 네 테이블이 실제 메모리에서 겹쳐 있어도 명세상 문제가 없습니다.
- 맨 앞 자리 숫자(0·1·3·4)는 **프로토콜에 들어가지 않는 표기 관례**입니다. 테이블은 함수 코드로 구분합니다.
- 일부 매뉴얼은 6자리(400001~)를 씁니다. 같은 관례를 확장한 것입니다.

## 주소 오프셋: 가장 흔한 혼란

명세는 "데이터 모델에서 X번 요소는 PDU에서 X-1로 주소 지정한다"고 정합니다. PDU 주소는 0부터 시작합니다.

| 매뉴얼 표기 | 의미 | 실제 요청 |
| --- | --- | --- |
| 40001 | Holding Register 1번 | FC 03, 주소 0 |
| 40100 | Holding Register 100번 | FC 03, 주소 99 |
| 30005 | Input Register 5번 | FC 04, 주소 4 |
| `0x0064`(PDU 주소로 표기) | PDU 주소 100 | FC 03, 주소 100 |

도구마다 기본값도 다릅니다. mbpoll은 기본이 1부터(`-0` 옵션으로 0부터), pymodbus는 PDU 주소(0부터)를 그대로 받습니다. 값이 한 칸씩 밀려 보이면 오프셋부터 의심합니다.

## 함수 코드

| 코드 | 이름 | 대상 | 한 번에 다루는 최대 개수 |
| --- | --- | --- | --- |
| 01 (0x01) | Read Coils | Coil | 2000 |
| 02 (0x02) | Read Discrete Inputs | Discrete Input | 2000 |
| 03 (0x03) | Read Holding Registers | Holding Register | 125 |
| 04 (0x04) | Read Input Registers | Input Register | 125 |
| 05 (0x05) | Write Single Coil | Coil | 1 (`FF 00`=ON, `00 00`=OFF) |
| 06 (0x06) | Write Single Register | Holding Register | 1 |
| 15 (0x0F) | Write Multiple Coils | Coil | 1968 |
| 16 (0x10) | Write Multiple Registers | Holding Register | 123 |
| 23 (0x17) | Read/Write Multiple Registers | Holding Register | 읽기 125, 쓰기 121 |

최대 개수는 PDU 최대 크기 253바이트에서 나옵니다. 시리얼 ADU는 253 + 주소 1 + CRC 2 = 256바이트, TCP ADU는 253 + MBAP 7 = 260바이트입니다. 이 밖에 진단용 08, 장치 식별 43/14(0x2B/0x0E) 등이 있습니다.

### 예외 응답

요청을 처리할 수 없으면 서버는 **함수 코드 + 0x80**과 예외 코드 1바이트로 응답합니다. 예를 들어 FC 03 요청이 실패하면 `0x83`이 돌아옵니다.

| 코드 | 이름 | 흔한 원인 |
| --- | --- | --- |
| 01 | ILLEGAL FUNCTION | 장치가 그 함수 코드를 지원하지 않음 |
| 02 | ILLEGAL DATA ADDRESS | 시작 주소 + 개수가 범위를 넘음. 오프셋 착오가 대표 원인 |
| 03 | ILLEGAL DATA VALUE | 요청 구조·길이 값이 잘못됨(쓰는 값이 범위를 벗어났다는 뜻은 아님) |
| 04 | SERVER DEVICE FAILURE | 서버 내부에서 복구 불가능한 오류 |
| 05 | ACKNOWLEDGE | 오래 걸리는 처리를 받아들였음 |
| 06 | SERVER DEVICE BUSY | 바쁨, 나중에 재시도 |
| 08 | MEMORY PARITY ERROR | 파일 레코드(FC 20/21) 일관성 오류 |
| 0A | GATEWAY PATH UNAVAILABLE | 게이트웨이 경로 설정 오류·과부하 |
| 0B | GATEWAY TARGET DEVICE FAILED TO RESPOND | 게이트웨이 뒤 장치 무응답(주소·배선 확인) |

응답 자체가 없으면 예외가 아니라 타임아웃입니다. 주소(Unit ID)·배선·통신 설정을 먼저 봅니다.

## 32비트 정수·실수와 워드 순서

명세는 **레지스터 하나(16비트) 안에서는 빅엔디언**(상위 바이트 먼저)으로 정합니다. 하지만 레지스터 두 개로 32비트 값을 표현할 때 **어느 레지스터가 상위 워드인지는 정하지 않습니다**. 그래서 장비마다 순서가 다릅니다.

`123.456`(IEEE 754 float32 = `0x42F6E979`)을 레지스터 2개로 보낼 때:

| 표기 | 레지스터 n | 레지스터 n+1 | 설명 |
| --- | --- | --- | --- |
| ABCD | `0x42F6` | `0xE979` | 빅엔디언 워드 순서. 가장 흔함 |
| CDAB | `0xE979` | `0x42F6` | 워드 스왑(리틀엔디언 워드 순서) |
| BADC | `0xF642` | `0x79E9` | 바이트 스왑 |
| DCBA | `0x79E9` | `0xF642` | 완전 리틀엔디언 |

- 값이 `-1.2e-28` 같은 엉뚱한 수로 보이면 순서가 틀린 것입니다. 알려진 값(예: 설정값 100.0)을 써 넣고 네 가지 순서로 해석해 맞는 것을 찾습니다.
- 매뉴얼에 "Float(Inverse)", "Swapped" 같은 표현이 있으면 CDAB인 경우가 많습니다(경험칙).
- 스케일 정수(예: 값 × 10을 INT16으로)를 쓰는 장비도 많습니다. 단위와 배율을 함께 확인합니다.

## Modbus RTU 프레임

```text
| 주소 1B | 함수 1B | 데이터 0~252B | CRC 2B (하위 바이트 먼저) |

예: 장치 1의 Holding Register 주소 0부터 2개 읽기
요청  01 03 00 00 00 02 C4 0B
       │  │  └─┬─┘ └─┬─┘ └─┬─┘
       │  │   시작주소  개수   CRC (0x0BC4, 하위 C4 먼저)
       │  └ FC 03
       └ 장치 주소
응답  01 03 04 42 F6 E9 79 [CRC 2B]   ← 바이트 수 4 + 레지스터 2개
```

| 항목 | 규칙 |
| --- | --- |
| 장치 주소 | 1–247. 0은 브로드캐스트(쓰기 전용, 응답 없음), 248–255는 예약 |
| 문자 형식 | 1문자 = 11비트(시작 1 + 데이터 8 + 패리티 1 + 정지 1). 기본은 짝수(Even) 패리티, 패리티 없음이면 정지 비트 2개 |
| 전송 속도 | 9600·19200 bps 필수, 기본값 19200 |
| 프레임 간격 | 프레임 사이 3.5문자 이상 무신호. 프레임 안에서 1.5문자 넘게 끊기면 불완전 프레임 |
| 고속일 때 | 19200 bps 초과 시 고정값 권장: 문자 간 750 µs, 프레임 간 1.750 ms |
| CRC | CRC-16, 다항식 `0xA001`(반사형), 초기값 `0xFFFF` |

19200 bps에서 1문자는 11/19200 ≈ 0.573 ms이므로 3.5문자 ≈ 2.0 ms입니다. USB-RS485 변환기나 OS가 바이트를 모아서 보내면 이 간격이 깨져 프레임이 잘리거나 붙습니다.

ASCII 모드는 같은 요청을 `:010300000002FA` + CR LF처럼 16진수 문자로 보내고, 마지막 바이트 `FA`가 LRC입니다.

### RS-485 배선 요점

| 항목 | Modbus 시리얼 명세 |
| --- | --- |
| 리피터 없이 연결 가능한 장치 | 32대 |
| 최대 길이 | 9600 bps, AWG26 이상에서 1000 m |
| 종단 저항 | 트렁크 양 끝에 150 Ω(0.5 W), 또는 1 nF + 120 Ω 직렬 |
| 바이어스(편향) 저항 | 450~650 Ω, 버스당 한 곳 |
| 구성 | 데이지 체인. 긴 스터브·스타 배선 금지 |

D0/D1(A/B) 표기는 제조사마다 반대인 경우가 있습니다. 통신이 전혀 안 되면 두 선을 바꿔 보는 것도 정상적인 점검 절차입니다(경험칙). UART와 RS-485 전기 규격의 기본은 [UART 문서](../../Hardware/interfaces/uart.md)를 참고합니다.

## Modbus TCP: MBAP 헤더

```text
| Transaction ID 2B | Protocol ID 2B | Length 2B | Unit ID 1B | 함수 1B | 데이터 |
└──────────────────── MBAP 헤더 7B ─────────────────────┘└──── PDU ────┘

예: FC 03, 주소 0, 2개
00 01  00 00  00 06  FF  03 00 00 00 02
 │      │      │      │   └ PDU
 │      │      │      └ Unit ID
 │      │      └ 이후 바이트 수 (Unit ID + PDU = 6)
 │      └ 0 = Modbus
 └ 요청-응답 짝 맞추기용, 서버가 그대로 복사
```

- 포트는 TCP 502입니다.
- **Unit ID**는 TCP-시리얼 게이트웨이 뒤의 RTU 장치를 지정하는 데 씁니다. 게이트웨이를 거치지 않는 장비는 보통 무시하거나 `1`·`255`만 받는 등 장비마다 다르므로 매뉴얼을 확인합니다.
- 한 연결에서 여러 요청을 동시에 보낼 수 있지만, 장비가 동시 요청·동시 연결 수를 제한하는 경우가 많습니다. 연결을 매번 새로 열지 말고 유지합니다.

## Modbus/TCP Security

Modbus/TCP Security(mbaps)는 기존 MBAP 프레임을 TLS로 감쌉니다.

| 항목 | 내용 |
| --- | --- |
| 포트 | TCP 802 (IANA `mbap-s`) |
| TLS | TLS 1.2 이상 필수 |
| 인증 | X.509v3 인증서로 클라이언트·서버 상호 인증 |
| 권한 | 인증서 확장 필드에 역할(role)을 넣고 서버가 역할별로 함수 코드·주소 접근을 허용 |
| 명세 | MB-TCP-Security v36 (2021-07-30) |

지원 장비가 아직 적어서 실무에서는 **평문 Modbus TCP를 제어망 안에만 두고**, 외부 연결은 VPN·방화벽·OPC UA 게이트웨이로 분리하는 경우가 많습니다(경험칙). 평문 Modbus는 인증이 없어 같은 망의 누구나 쓰기 명령을 보낼 수 있습니다. 보안 설계는 [OT 보안](../safety/ot-security.md)을 참고합니다.

## 디버깅 도구

| 도구 | 용도 | 비고 |
| --- | --- | --- |
| pymodbus | Python 클라이언트·서버·시뮬레이터 | 확인 시점 최신 3.16.1, Python 3.10 이상 |
| mbpoll | 명령줄 클라이언트(RTU·TCP) | 오픈 소스(GPL-3.0), 확인 시점 최신 v1.5.4 |
| Modbus Poll / Modbus Slave | Windows GUI 클라이언트·서버 시뮬레이터 | Witte Software 상용 제품. RTU·ASCII·TCP·Security 지원 |
| Wireshark | 패킷 분석 | 표시 필터 `mbtcp`, `modbus` |

```bash
# Holding Register 1번(40001)부터 2개를 float로 읽기, 빅엔디언 워드 순서(ABCD)
mbpoll -a 1 -t 4:float -B -r 1 -c 1 -1 192.168.0.10

# RS-485: 19200 bps, 짝수 패리티, 장치 주소 3, PDU 주소 0부터 10개
mbpoll -m rtu -a 3 -b 19200 -P even -0 -r 0 -c 10 -1 /dev/ttyUSB0
```

mbpoll의 `-t 4:float`는 레지스터 2개를 하나의 값으로 읽고, `-B`가 없으면 리틀엔디언 워드 순서(CDAB)로 해석합니다.

## pymodbus 클라이언트 예제

pymodbus 3.x에서 API가 여러 번 바뀌었습니다. 3.8부터 클라이언트 함수의 선택 인자는 키워드 전용이고, 3.10에서 `slave=`가 `device_id=`로 바뀌었으며 `BinaryPayloadDecoder` 등 payload 모듈이 제거되고 `convert_from_registers`로 대체되었습니다. 인터넷의 오래된 예제(`slave=1`, `read_holding_registers(0, 2)`)는 현재 버전에서 동작하지 않을 수 있습니다.

```python
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

client = ModbusTcpClient("192.168.0.10", port=502, timeout=3)
if not client.connect():
    raise SystemExit("연결 실패")

try:
    # 40001(PDU 주소 0)부터 레지스터 2개 = float32 1개
    rr = client.read_holding_registers(0, count=2, device_id=1)
    if rr.isError():
        # 예외 응답(장치가 보낸 정상적인 Modbus 메시지)
        print("예외 응답:", rr)
    else:
        temp = client.convert_from_registers(
            rr.registers,
            data_type=client.DATATYPE.FLOAT32,
            word_order="big",  # CDAB 장비면 "little"
        )
        print(f"온도: {temp:.2f}")

    # 40011(PDU 주소 10)에 float32 쓰기
    regs = client.convert_to_registers(
        25.5, data_type=client.DATATYPE.FLOAT32, word_order="big"
    )
    wr = client.write_registers(10, regs, device_id=1)
    if wr.isError():
        print("쓰기 실패:", wr)
except ModbusException as exc:
    # 타임아웃·연결 끊김 등 라이브러리 오류
    print("통신 오류:", exc)
finally:
    client.close()
```

시리얼은 `ModbusSerialClient(port="/dev/ttyUSB0", baudrate=19200, parity="E", stopbits=1)`처럼 만들고 나머지 호출은 같습니다. `convert_from_registers`는 레지스터 안의 바이트 순서를 빅엔디언으로 가정하므로, BADC·DCBA 장비는 레지스터 값을 직접 바이트 스왑한 뒤 변환합니다.

## 흔한 실수

| 증상 | 원인 | 대응 |
| --- | --- | --- |
| 값이 한 칸 밀려 있음 | 40001 표기와 PDU 주소 0 혼동 | 매뉴얼이 1-based인지 0-based인지 확인, 알려진 값으로 검증 |
| 예외 코드 02 | 오프셋 착오, 범위 밖 주소, 블록 경계를 넘는 읽기 | 개수를 줄여 경계를 찾음 |
| 실수 값이 엉뚱함 | 워드 순서 불일치 | ABCD·CDAB·BADC·DCBA 네 가지로 해석 |
| RTU 응답 없음 | 속도·패리티·정지 비트 불일치, A/B 반대, 장치 주소 중복 | 설정 표를 만들어 양쪽 비교, 한 대씩 연결해 확인 |
| 가끔 CRC 오류 | 종단·바이어스 저항 누락, 접지·차폐 문제, 긴 스터브 | 양 끝 종단, 차폐 한쪽 접지, 데이지 체인 |
| 여러 클라이언트가 붙으면 끊김 | 장비의 동시 연결 수 제한 | 게이트웨이·SCADA 한 곳에서 읽고 재배포 |
| 폴링이 너무 느림 | 레지스터를 하나씩 따로 읽음 | 연속 주소로 맵을 설계하고 한 번에 최대 125개 읽기 |
| TCP는 되는데 게이트웨이 뒤 장치가 무응답 | Unit ID를 RTU 장치 주소로 설정하지 않음 | Unit ID = 시리얼 장치 주소 |

## 점검표

| 질문 |
| --- |
| 장비 매뉴얼의 주소 표기가 1-based인지 0-based인지 확인했는가 |
| 32비트 값의 워드 순서와 스케일·단위를 알려진 값으로 검증했는가 |
| RTU 설정(속도, 패리티, 정지 비트, 장치 주소)을 표로 정리해 양쪽을 맞췄는가 |
| RS-485 양 끝 종단과 바이어스를 확인했는가 |
| 폴링 주기와 타임아웃·재시도 횟수를 장치 수에 맞게 정했는가 |
| 평문 Modbus TCP가 제어망 밖에서 접근되지 않도록 막았는가 |

## 참고 자료

- [Modbus Organization - Specifications](https://modbus.org/modbus-specifications) - 명세 목록
- [MODBUS Application Protocol Specification V1.1b3](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf) - 데이터 모델, X → X-1 주소, 빅엔디언, 함수 코드·최대 개수, 예외 코드, PDU 253바이트
- [MODBUS over Serial Line V1.02](https://www.modbus.org/file/secure/modbusoverserial.pdf) - 주소 범위, 11비트 문자, 짝수 패리티 기본, 3.5/1.5문자·750 µs/1.750 ms, CRC 하위 바이트 먼저·0xA001, ASCII·LRC, 9600/19200, 32대·1000 m·150 Ω·450~650 Ω
- [MODBUS Messaging on TCP/IP Implementation Guide V1.0b](https://www.modbus.org/file/secure/messagingimplementationguide.pdf) - MBAP 7바이트, 포트 502, Unit ID
- [MODBUS/TCP Security Protocol Specification](https://www.modbus.org/file/secure/modbussecurityprotocol.pdf) - v36(2021-07-30), 포트 802, TLS 1.2 이상, X.509v3·역할
- [Modbus Organization Replaces Master-Slave with Client-Server](https://www.modbus.org/news/modbus-organization-replaces-master-slave-with-client-server) - 2020-07-09 발표
- [IANA Service Name and Port Number Registry - mbap](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=mbap) - 502 `mbap`, 802 `mbap-s`
- [pymodbus - Client API](https://pymodbus.readthedocs.io/en/latest/source/client.html), [API changes](https://pymodbus.readthedocs.io/en/latest/source/api_changes.html), [PyPI](https://pypi.org/project/pymodbus/) - 3.16.1, `device_id`·키워드 전용 인자·`convert_from_registers`·`DATATYPE.FLOAT32`
- [mbpoll (GitHub)](https://github.com/epsilonrt/mbpoll) - 옵션 `-0`, `-B`, `-t 4:float`, v1.5.4(2026-02-08)
- [Modbus Poll (Witte Software)](https://www.modbustools.com/modbus_poll.html)
- [Wireshark 표시 필터 - mbtcp](https://www.wireshark.org/docs/dfref/m/mbtcp.html), [modbus](https://www.wireshark.org/docs/dfref/m/modbus.html)

확인일: 2026-10-21 (명세 수치·포트·라이브러리 API를 확인. Modicon식 0x/4x 표기는 관례, 워드 순서 표기 해석·운영 권장은 경험칙)

관련: [필드버스 개요](./fieldbus-overview.md), [UART](../../Hardware/interfaces/uart.md), [제조사별 주소 체계](../vendors/addressing-and-tools.md)

다음: [산업 이더넷](./industrial-ethernet.md)
