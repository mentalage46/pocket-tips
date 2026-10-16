# 통신 용어

[전체 용어 색인](./README.md)

## 연결과 데이터 단위

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| 버스 / Bus | 여러 장치가 공유하는 통신 경로입니다. 함께 연결할 수 있는 장치와 선택 방법은 통신 방식에 따라 다릅니다. |
| 컨트롤러·주변장치 / Controller, Peripheral | 통신 진행을 제어하는 쪽과 연결된 장치를 가리킵니다. 역할 구분은 해당 인터페이스 문맥에서 확인합니다. |
| 동기식·비동기식 / Synchronous, Asynchronous | 여기서는 별도 클록 신호로 시점을 맞추는지 구분하는 말입니다. UART도 내부 시간 기준과 비트 타이밍은 필요합니다. |
| 프레임 / Frame | 통신 규칙에 따라 묶인 전송 단위입니다. UART의 한 문자 프레임과 애플리케이션의 메시지 프레임은 크기와 의미가 다릅니다. |
| 트랜잭션 / Transaction | 장치와 수행하는 한 묶음의 통신 작업입니다. 시작·주소·데이터·종료 같은 단계가 포함될 수 있습니다. |
| 프로토콜 / Protocol | 장치 사이에서 지켜야 하는 데이터 형식과 순서 등의 규칙입니다. 배선만 맞아도 통신 내용이 맞는 것은 아닙니다. |
| 체크섬·CRC / Checksum, Cyclic Redundancy Check | 전송 데이터로 계산한 검사값을 비교해 오류를 검출하는 방법입니다. 모든 오류 검출이나 보안상 진위를 보장하지는 않습니다. |

관련 문서: [UART](../interfaces/uart.md), [I2C](../interfaces/i2c.md), [SPI](../interfaces/spi.md)

## UART

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| UART / Universal Asynchronous Receiver/Transmitter | 비동기 직렬 송수신 기능입니다. 데이터 형식과 실제 선의 전압 규격은 구분해야 합니다. |
| TX·RX / Transmit, Receive | 장치 기준 송신·수신 신호입니다. 한 장치의 TX를 다른 장치의 RX에 연결합니다. |
| 보율 / Baud | 초당 심벌 수입니다. 일반적인 이진 UART에서는 초당 비트 수와 같지만 모든 통신 방식에서 같은 것은 아닙니다. |
| 패리티 / Parity | 데이터의 1 개수 등을 기준으로 덧붙이는 오류 검사 비트입니다. 단순한 검출 기능이며 오류를 수정하지 않습니다. |
| 흐름 제어 / Flow control, RTS·CTS | 수신 측이 처리할 수 있는 속도에 맞춰 송신을 조절하는 방법입니다. RTS/CTS는 이를 위한 제어 신호로 사용됩니다. |
| 트랜시버 / Transceiver | 송신기와 수신기를 합친 회로입니다. RS-232·RS-485에서는 MCU 논리 신호와 통신선의 전기 규격 사이를 연결합니다. |
| CR·LF / Carriage Return, Line Feed | 텍스트에서 줄 끝을 나타내는 데 쓰이는 제어 문자입니다. 한쪽이 CR+LF를 보내고 다른 쪽이 각각 처리하면 빈 줄이 생길 수 있습니다. |

관련 문서: [UART 배선과 설정](../interfaces/uart.md)

## I2C

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| I2C / Inter-Integrated Circuit | 데이터선과 클록선을 공유하고 주소로 장치를 선택하는 직렬 통신 방식입니다. I²C라고도 씁니다. |
| SDA·SCL / Serial Data, Serial Clock | I2C의 데이터선과 클록선입니다. 일반적인 구성에서는 각각 풀업이 필요합니다. |
| ACK·NACK / Acknowledge, Not Acknowledge | 수신자가 바이트 뒤에 보내는 응답입니다. NACK가 언제나 오류는 아니며, 컨트롤러는 읽기의 마지막 바이트 뒤에 NACK로 종료를 알립니다. |
| R/W / Read·Write | 읽기와 쓰기 방향을 구분하는 비트입니다. 7비트 장치 주소 자체와는 별개입니다. |
| 반복 시작 / Repeated START | STOP으로 버스를 해제하지 않고 다시 START 조건을 만드는 것입니다. 레지스터 주소 쓰기와 데이터 읽기를 이어갈 때 쓰입니다. |
| 클록 스트레칭 / Clock stretching | 장치가 SCL을 LOW로 유지해 통신 진행을 늦추는 동작입니다. 컨트롤러의 지원 여부와 타임아웃을 확인합니다. |
| 멀티플렉서 / Multiplexer, MUX | 여러 경로 중 하나 등을 선택해 연결하는 회로입니다. I2C에서는 주소가 같은 장치들을 다른 채널로 분리하는 데 쓸 수 있습니다. |

관련 문서: [I2C 배선과 통신](../interfaces/i2c.md), [풀업과 출력 구동](../background/pullups-and-drive.md)

## SPI

| 용어 / 영문·약어 | 뜻과 읽을 때 주의할 점 |
| --- | --- |
| SPI / Serial Peripheral Interface | 클록과 칩 선택 신호를 사용하는 동기식 직렬 통신 방식입니다. 명령 형식은 장치마다 다를 수 있습니다. |
| SCLK·SCK / Serial Clock | SPI의 클록 신호입니다. |
| MOSI·COPI / Controller Out Peripheral In | 컨트롤러에서 주변장치로 가는 데이터선입니다. MOSI는 Master Out Slave In이라는 기존 명칭입니다. |
| MISO·CIPO / Controller In Peripheral Out | 주변장치에서 컨트롤러로 오는 데이터선입니다. MISO는 Master In Slave Out이라는 기존 명칭입니다. |
| CS·SS / Chip Select, Slave Select | 통신할 장치를 선택하는 신호입니다. 흔히 LOW에서 활성화되지만 장치 사양이 기준입니다. |
| CPOL·CPHA / Clock Polarity, Clock Phase | 클록의 유휴 레벨과 데이터를 읽는 에지를 정하는 설정입니다. 두 설정의 조합이 SPI 모드 0~3을 만듭니다. |
| 더미 바이트·클록 / Dummy byte, Dummy clock | 유효한 명령·데이터 전달 외에 클록 제공이나 장치 대기를 위해 넣는 전송입니다. 개수와 전송값은 장치 사양을 따릅니다. |

관련 문서: [SPI 신호와 모드](../interfaces/spi.md), [에지와 타이밍 용어](./signals.md#시간과-파형)
