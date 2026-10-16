# 하드웨어 배경지식

기존 가이드에서 연결·사용 방법을 익히다가 “왜 그런가?”가 궁금할 때 읽는 문서입니다. 처음부터 모두 읽을 필요는 없습니다. 짧은 뜻은 [용어집](../glossary/README.md)에서 찾을 수 있습니다.

| 궁금한 점 | 배경 설명 | 먼저 읽으면 좋은 문서 |
| --- | --- | --- |
| 왜 입력에 저항을 달고, I2C는 HIGH를 직접 출력하지 않을까? | [풀업과 출력 구동](./pullups-and-drive.md) | [GPIO](../interfaces/gpio.md) |
| 왜 배선이 길어지거나 풀업 저항이 커지면 통신이 불안정할까? | [정전용량과 신호 타이밍](./capacitance-and-timing.md) | [전기 기초](../basics/electrical-basics.md) |
| 왜 모터를 켜면 보드가 재부팅하거나 센서 값이 흔들릴까? | [전원과 노이즈](./power-and-noise.md) | [전원과 배선](../basics/power-and-wiring.md) |
| 왜 ADC 비트 수가 높아도 측정이 부정확할까? | [샘플링과 측정 오차](./sampling-and-error.md) | [아날로그와 PWM](../interfaces/analog-and-pwm.md) |
| 왜 레지스터를 읽거나 비트 하나를 바꾸는 것만으로 문제가 생길까? | [레지스터 접근의 부작용](./register-side-effects.md) | [레지스터와 비트 연산](../firmware/registers-and-bitwise.md) |

숫자 예시는 원리를 설명하기 위한 가정입니다. 실제 부품의 허용 범위와 동작 규칙은 해당 데이터시트로 확인합니다.

[Hardware 학습 안내](../README.md)
