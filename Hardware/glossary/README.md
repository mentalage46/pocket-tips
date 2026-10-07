# 하드웨어 용어 색인

뜻이 궁금한 용어를 한글·영문·약어로 찾는 색인입니다. 링크를 누르면 해당 용어가 있는 표로 이동합니다. 페이지 검색으로 `ESR`, `싱크`, `W1C`처럼 찾을 수도 있습니다.

| 분야 | 주요 내용 |
| --- | --- |
| [전기·전자](./electrical.md) | 전원, 정전용량, 부품, 전류 구동 |
| [신호와 측정](./signals.md) | 논리 레벨, 타이밍, ADC, 샘플링 |
| [통신](./communication.md) | UART, I2C, SPI의 신호와 전송 규칙 |
| [보드와 펌웨어](./firmware.md) | 보드, 데이터 표현, 레지스터, 동시성 |

긴 원리 설명은 [배경지식](../background/README.md), 전체 학습 순서는 [Hardware 안내](../README.md)를 참고합니다.

## 전기·전자

| 용어 / 영문·약어 | 분류 |
| --- | --- |
| [DC 바이어스 / DC bias](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [H-브리지 / H-bridge](./electrical.md#전류와-구동) | 전류와 구동 |
| [기동·스톨 전류 / Startup, Stall current](./electrical.md#전류와-구동) | 전류와 구동 |
| [기생 정전용량 / Parasitic capacitance](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [누설 전류 / Leakage current](./electrical.md#전류와-구동) | 전류와 구동 |
| [단락·도통 / Short circuit, Continuity](./electrical.md#전압과-전원) | 전압과 전원 |
| [등가 직렬 저항 / Equivalent Series Resistance, ESR](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [디커플링·벌크 커패시터 / Decoupling, Bulk capacitor](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [레귤레이터 / Regulator](./electrical.md#전압과-전원) | 전압과 전원 |
| [로우사이드 스위칭 / Low-side switching](./electrical.md#전류와-구동) | 전류와 구동 |
| [리턴 경로 / Return path](./electrical.md#전압과-전원) | 전압과 전원 |
| [문턱 전압·온저항 / VGS(th), RDS(on)](./electrical.md#전류와-구동) | 전류와 구동 |
| [버스 정전용량 / Bus capacitance](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [부하 / Load](./electrical.md#전압과-전원) | 전압과 전원 |
| [소스 저항 / Source resistance](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [소스·싱크 전류 / Source, Sink current](./electrical.md#전류와-구동) | 전류와 구동 |
| [순방향·역방향 바이어스 / Forward, Reverse bias](./electrical.md#전류와-구동) | 전류와 구동 |
| [시정수 / Time constant, τ](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [애노드·캐소드 / Anode, Cathode](./electrical.md#전류와-구동) | 전류와 구동 |
| [역급전 / Backfeeding](./electrical.md#전압과-전원) | 전압과 전원 |
| [유도성 부하 / Inductive load](./electrical.md#전류와-구동) | 전류와 구동 |
| [임피던스 / Impedance, Z](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [전압 강하 / Voltage drop](./electrical.md#전압과-전원) | 전압과 전원 |
| [전위·전위차 / Potential](./electrical.md#전압과-전원) | 전압과 전원 |
| [절대 최대 정격 / Absolute Maximum Ratings](./electrical.md#전압과-전원) | 전압과 전원 |
| [접지 / Ground, GND](./electrical.md#전압과-전원) | 전압과 전원 |
| [정격 / Rating](./electrical.md#전압과-전원) | 전압과 전원 |
| [정전용량 / Capacitance, C](./electrical.md#저항과-정전용량) | 저항과 정전용량 |
| [탈조 / Missed steps](./electrical.md#전류와-구동) | 전류와 구동 |
| [플라이백 다이오드 / Flyback diode](./electrical.md#전류와-구동) | 전류와 구동 |
| [회생 / Regeneration](./electrical.md#전류와-구동) | 전류와 구동 |

## 신호와 측정

| 용어 / 영문·약어 | 분류 |
| --- | --- |
| [ADC / Analog-to-Digital Converter](./signals.md#변환과-측정) | 변환과 측정 |
| [DAC / Digital-to-Analog Converter](./signals.md#변환과-측정) | 변환과 측정 |
| [PWM / Pulse-Width Modulation](./signals.md#변환과-측정) | 변환과 측정 |
| [감쇠 / Attenuation](./signals.md#변환과-측정) | 변환과 측정 |
| [고임피던스 / High impedance, Hi-Z](./signals.md#논리-신호) | 논리 신호 |
| [기준 전압 / Reference voltage, Vref](./signals.md#변환과-측정) | 변환과 측정 |
| [노이즈 여유 / Noise margin](./signals.md#논리-신호) | 논리 신호 |
| [논리 레벨 / Logic level, HIGH·LOW](./signals.md#논리-신호) | 논리 신호 |
| [디바운싱 / Debouncing](./signals.md#시간과-파형) | 시간과 파형 |
| [레벨 시프터 / Level shifter](./signals.md#논리-신호) | 논리 신호 |
| [리플·정착 시간 / Ripple, Settling time](./signals.md#시간과-파형) | 시간과 파형 |
| [상승 시간 / Rise time](./signals.md#시간과-파형) | 시간과 파형 |
| [샘플링 / Sampling](./signals.md#변환과-측정) | 변환과 측정 |
| [셋업·홀드 시간 / Setup, Hold time](./signals.md#시간과-파형) | 시간과 파형 |
| [안티앨리어싱 필터 / Anti-aliasing filter](./signals.md#변환과-측정) | 변환과 측정 |
| [앨리어싱 / Aliasing](./signals.md#변환과-측정) | 변환과 측정 |
| [양자화 / Quantization](./signals.md#변환과-측정) | 변환과 측정 |
| [에지 / Edge](./signals.md#시간과-파형) | 시간과 파형 |
| [오프셋·게인 / Offset, Gain](./signals.md#변환과-측정) | 변환과 측정 |
| [임계값 / Threshold](./signals.md#논리-신호) | 논리 신호 |
| [입력·출력 전압 규격 / VIH, VIL, VOH, VOL](./signals.md#논리-신호) | 논리 신호 |
| [전달 함수 / Transfer function](./signals.md#변환과-측정) | 변환과 측정 |
| [주기·주파수 / Period, Frequency](./signals.md#시간과-파형) | 시간과 파형 |
| [차동 신호 / Differential signal](./signals.md#논리-신호) | 논리 신호 |
| [클록 / Clock](./signals.md#시간과-파형) | 시간과 파형 |
| [펄스 폭·듀티비 / Pulse width, Duty cycle](./signals.md#시간과-파형) | 시간과 파형 |
| [푸시풀·오픈드레인 / Push-pull, Open-drain](./signals.md#논리-신호) | 논리 신호 |
| [풀업·풀다운 / Pull-up, Pull-down](./signals.md#논리-신호) | 논리 신호 |
| [플로팅 / Floating](./signals.md#논리-신호) | 논리 신호 |
| [해상도·정확도 / Resolution, Accuracy](./signals.md#변환과-측정) | 변환과 측정 |
| [활성 레벨 / Active-high, Active-low](./signals.md#논리-신호) | 논리 신호 |

## 통신

| 용어 / 영문·약어 | 분류 |
| --- | --- |
| [ACK·NACK / Acknowledge, Not Acknowledge](./communication.md#i2c) | I2C |
| [CPOL·CPHA / Clock Polarity, Clock Phase](./communication.md#spi) | SPI |
| [CR·LF / Carriage Return, Line Feed](./communication.md#uart) | UART |
| [CS·SS / Chip Select, Slave Select](./communication.md#spi) | SPI |
| [I2C / Inter-Integrated Circuit](./communication.md#i2c) | I2C |
| [MISO·CIPO / Controller In Peripheral Out](./communication.md#spi) | SPI |
| [MOSI·COPI / Controller Out Peripheral In](./communication.md#spi) | SPI |
| [R/W / Read·Write](./communication.md#i2c) | I2C |
| [SCLK·SCK / Serial Clock](./communication.md#spi) | SPI |
| [SDA·SCL / Serial Data, Serial Clock](./communication.md#i2c) | I2C |
| [SPI / Serial Peripheral Interface](./communication.md#spi) | SPI |
| [TX·RX / Transmit, Receive](./communication.md#uart) | UART |
| [UART / Universal Asynchronous Receiver/Transmitter](./communication.md#uart) | UART |
| [더미 바이트·클록 / Dummy byte, Dummy clock](./communication.md#spi) | SPI |
| [동기식·비동기식 / Synchronous, Asynchronous](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [멀티플렉서 / Multiplexer, MUX](./communication.md#i2c) | I2C |
| [반복 시작 / Repeated START](./communication.md#i2c) | I2C |
| [버스 / Bus](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [보율 / Baud](./communication.md#uart) | UART |
| [체크섬·CRC / Checksum, Cyclic Redundancy Check](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [컨트롤러·주변장치 / Controller, Peripheral](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [클록 스트레칭 / Clock stretching](./communication.md#i2c) | I2C |
| [트랜시버 / Transceiver](./communication.md#uart) | UART |
| [트랜잭션 / Transaction](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [패리티 / Parity](./communication.md#uart) | UART |
| [프레임 / Frame](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [프로토콜 / Protocol](./communication.md#연결과-데이터-단위) | 연결과 데이터 단위 |
| [흐름 제어 / Flow control, RTS·CTS](./communication.md#uart) | UART |

## 보드와 펌웨어

| 용어 / 영문·약어 | 분류 |
| --- | --- |
| [2의 보수·부호 확장 / Two's complement, Sign extension](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [GPIO / General-Purpose Input/Output](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
| [MCU / Microcontroller Unit](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
| [MSB·LSB / Most·Least Significant Bit](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [RO·WO·RW / Read Only, Write Only, Read/Write](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [RTOS / Real-Time Operating System](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
| [SBC / Single-Board Computer](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
| [volatile](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [W1C / Write One to Clear](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [경쟁 상태 / Race condition](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [단조 시간 / Monotonic time](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [래핑 / Wraparound](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [레지스터 / Register](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [블로킹 / Blocking](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [비트 마스크·필드 / Bit mask, Bit field](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [상태 머신 / State machine](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [엔디언 / Endianness](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [예약 비트 / Reserved bit](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [워치독 / Watchdog](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [원시 값 / Raw value](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [원자성 / Atomicity](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [인터럽트·ISR / Interrupt, Interrupt Service Routine](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [읽기-수정-쓰기 / Read-modify-write, RMW](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [읽으면 지워짐 / Read-to-clear](./firmware.md#데이터와-레지스터) | 데이터와 레지스터 |
| [임계 구역·상호 배제 / Critical section, Mutual exclusion](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [출력 래치 / Output latch](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
| [타임아웃 / Timeout](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [펌웨어 / Firmware](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
| [폴링 / Polling](./firmware.md#시간과-동시성) | 시간과 동시성 |
| [핀 멀티플렉싱 / Pin multiplexing, Pin mux](./firmware.md#보드와-실행-환경) | 보드와 실행 환경 |
