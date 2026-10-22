# Network

네트워크 프로토콜과 계층 구조에 대한 핵심 팁과 체크리스트입니다.

## 기초

- [Network Protocols](./protocol.md) - HTTP, HTTPS, TCP, UDP 등 주요 프로토콜 정리
- [Top-down Network](./topdown-network.md) - 애플리케이션 계층부터 시작하는 네트워크 계층 구조 이해

## 이름과 보안 연결

- [DNS 실무](./dns.md) - 조회 과정, 레코드 종류, CNAME 규칙, TTL과 변경 절차, 메일 인증 레코드
- [TLS와 인증서](./tls.md) - TLS 1.3 핸드셰이크, 인증서 체인, 짧아지는 유효 기간과 자동 갱신
- [HTTP/1.1, HTTP/2, HTTP/3](./http-versions.md) - 버전별 전송 방식, 협상, 예전 최적화 정리

## 주소와 경로

- [Subnet](./subnet.md) - CIDR 표기법, Public/Private 서브넷, AWS/Terraform 예시
- [Router](./router.md) - 라우팅 테이블 동작 원리, 정적/동적 라우팅
- [Gateway](./gateway.md) - IGW, NAT Gateway, API Gateway 비교 및 실무 예시
- [로드 밸런싱](./load-balancing.md) - L4/L7, 분산 알고리즘, 헬스체크, 세션 유지, 프록시 헤더

## 문제 진단

- [네트워크 진단 명령](./diagnostics.md) - dig, nc, curl, openssl, lsof/ss, tcpdump로 계층별 확인
