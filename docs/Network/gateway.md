# 게이트웨이 (Gateway) - 실무 가이드

게이트웨이는 서로 다른 네트워크를 연결하는 관문입니다. 클라우드에서는 다양한 유형의 게이트웨이가 핵심 인프라 역할을 합니다.

## 0. 개념: "게이트웨이"가 가리키는 두 가지

| 의미 | 설명 | 예 |
| --- | --- | --- |
| **기본 게이트웨이** (네트워크 용어) | 호스트가 **다른 네트워크로 나가기 위해** 패킷을 넘기는 라우터의 주소 | 가정용 공유기 `192.168.0.1`, 서브넷의 `.1` 주소 |
| **클라우드 서비스 이름** | 네트워크의 **경계에 놓여 특정 방향의 연결을 맡는** 관리형 구성 요소 | Internet Gateway, NAT Gateway, API Gateway, Transit Gateway |

두 가지는 이름만 같고 역할의 층이 다릅니다. 호스트의 기본 게이트웨이는 보통 **라우터**이고, 클라우드의 IGW·NAT Gateway는 **라우트 테이블의 target**으로 지정되는 경계 구성 요소입니다. 클라우드에서 서브넷의 `.1` 주소는 VPC 라우터가 예약한 주소입니다([서브넷](./subnet.md#1-cidr-표기법과-서브넷-마스크) 참고). 이 문서는 클라우드 쪽을 다룹니다.

### 핵심 질문 두 개로 구분하기

게이트웨이를 고를 때는 **"누가 먼저 연결을 시작하는가"**와 **"어느 계층에서 보는가"**를 묻습니다.

| 필요한 것 | 선택 |
| --- | --- |
| 인터넷 ↔ 내 서버, **양방향** (밖에서도 접속) | Internet Gateway |
| private 서버가 **밖으로만** 나감 (업데이트, 외부 API) | NAT Gateway |
| IPv6로 **밖으로만** 나감 | Egress-only Internet Gateway |
| AWS 서비스(S3, DynamoDB)를 인터넷 없이 접근 | Gateway VPC Endpoint |
| 여러 VPC·온프레미스를 **허브로 연결** | Transit Gateway |
| 클라이언트의 **API 요청**을 받아 인증·제한·라우팅 | API Gateway (L7) |

---

## 1. 게이트웨이 유형 비교

| 유형                       | 계층 | 주요 역할                                 | AWS 서비스       |
| :------------------------- | :--: | :---------------------------------------- | :--------------- |
| **Internet Gateway (IGW)** |  L3  | VPC와 인터넷 간 양방향 통신               | Internet Gateway |
| **NAT Gateway**            |  L3  | Private 리소스의 아웃바운드 인터넷 접근   | NAT Gateway      |
| **API Gateway**            |  L7  | API 요청 라우팅, 인증, 스로틀링           | API Gateway      |
| **Transit Gateway**        |  L3  | 여러 VPC 및 온프레미스 네트워크 허브 연결 | Transit Gateway  |

---

## 2. Internet Gateway vs NAT Gateway

### 2.1. 주요 차이점

| 구분          | Internet Gateway (IGW)      | NAT Gateway              |
| :------------ | :-------------------------- | :----------------------- |
| **방향**      | 양방향 (Inbound + Outbound) | 아웃바운드 전용          |
| **Public IP** | 필요 (EIP 또는 Auto-assign) | 불필요 (NAT가 대신 변환) |
| **배치 위치** | VPC에 연결                  | Public 서브넷에 배치     |
| **비용**      | 무료                        | 사용량 기반 과금         |

### 동작 원리

**Internet Gateway**

- 수평 확장되고 중복 구성된 **고가용성 관리형 구성 요소**라서 가용성이나 대역폭 병목을 만들지 않습니다.
- IGW는 두 가지 일을 합니다. ① 라우트 테이블에서 **인터넷으로 가는 target**이 되고, ② IPv4에서는 인스턴스의 사설 IP와 공인 IP 사이의 **1:1 NAT**를 해 줍니다. 인스턴스는 자신의 사설 IP만 알고 있고, IGW가 나가는 패킷의 출발지를 공인 IP로 바꿉니다.
- 따라서 인터넷과 직접 통신하려면 **공인 IPv4(또는 Elastic IP)**나 IPv6 주소가 필요합니다.
- IGW 자체는 무료이고, 인터넷 데이터 전송 요금은 별도로 발생합니다.
- **기본 VPC**에는 IGW와 `0.0.0.0/0 → IGW` 경로가 이미 있지만, **직접 만든 VPC**에는 없어서 직접 만들고 연결해야 합니다.

**NAT Gateway**

- private 서브넷의 인스턴스가 **밖으로 나가는 연결만** 할 수 있게 합니다. 밖에서 먼저 시작하는 연결은 받을 수 없습니다.
- **Public NAT Gateway**(기본)는 **public 서브넷**에 만들고 **Elastic IP를 연결**해야 합니다. private 서브넷의 `0.0.0.0/0` 경로는 이 NAT Gateway를 가리키고, NAT Gateway의 서브넷은 IGW로 나가는 경로가 있어야 합니다.
- 변환은 두 단계입니다: NAT Gateway가 인스턴스의 사설 IP를 NAT Gateway의 사설 IP로 바꾸고, IGW가 그것을 NAT Gateway의 Elastic IP로 바꿉니다. 응답은 거꾸로 되돌아갑니다.
- **Private NAT Gateway**는 인터넷이 아니라 **다른 VPC나 온프레미스**로 나갈 때 쓰며 Elastic IP를 붙일 수 없습니다. 인터넷으로 가는 경로를 만들어도 IGW가 트래픽을 버립니다.
- IPv6는 NAT 대신 **Egress-only Internet Gateway**로 "밖으로만" 나가게 하는 방법이 있습니다.

> 표의 "Public IP: 불필요" 항목은 NAT 뒤의 **private 인스턴스**를 가리킵니다. NAT Gateway 자체는 Elastic IP가 필요합니다(Public 유형).

### 비용과 가용 영역(AZ)

- NAT Gateway는 **켜져 있는 시간**과 **처리한 데이터 양(GB)**에 대해 요금이 부과됩니다. 데이터 처리 요금 때문에 트래픽이 많으면 비용이 빠르게 커집니다.
- AZ를 넘나드는 트래픽에도 전송 요금이 붙으므로, 리소스와 **같은 AZ의 NAT Gateway**를 쓰거나 AZ마다 NAT Gateway를 두는 것이 AWS 권장 방법입니다. (AZ별로 두면 한 AZ 장애가 다른 AZ로 번지지 않는 효과도 있음, 일반 개념.)
- 트래픽 대부분이 **S3·DynamoDB** 같은 AWS 서비스로 가는 것이라면 **Gateway VPC Endpoint**로 NAT를 거치지 않게 할 수 있고, Gateway Endpoint는 추가 요금이 없습니다. 라우트 테이블에 서비스의 prefix list → endpoint 경로가 자동 추가되며, 이 경로는 `0.0.0.0/0 → IGW`보다 **더 구체적이어서 우선**합니다.

### 2.2. 아키텍처 다이어그램 (텍스트)

```
[Internet]
    |
[Internet Gateway (igw-xxx)]
    |
[Public Subnet: 10.0.1.0/24]
    |-- ALB
    |-- Bastion Host
    |-- [NAT Gateway (nat-xxx)]
                |
        [Private Subnet: 10.0.10.0/24]
            |-- EC2 App Server
            |-- RDS
```

---

## 3. API Gateway (L7) 실무 활용

IGW·NAT와 달리 API Gateway는 **패킷이 아니라 HTTP 요청**을 이해합니다(L7). 네트워크 경계가 아니라 **API의 공통 관심사**(인증, 요청 제한, 라우팅, 변환, 로깅)를 한곳에서 처리하는 **리버스 프록시의 확장**으로 이해하면 됩니다. [Nginx](../Infrastructure/nginx/nginx.md)나 로드 밸런서와 겹치는 부분이 많고, 차이는 **관리형이라 운영 부담이 적은 대신 요청당 비용이 들고 동작 방식이 서비스에 묶인다**는 점입니다(일반 개념).

API Gateway는 HTTP/REST/WebSocket API의 진입점으로, 마이크로서비스 아키텍처에서 필수입니다.

- **라우팅**: URL 경로에 따라 백엔드 서비스로 요청 분배
- **인증/인가**: JWT 토큰 검증, API Key 관리
- **스로틀링**: Rate Limiting으로 과부하 방지
- **변환**: 요청/응답 데이터 형식 변환

### Transit Gateway: 연결이 늘어날 때

VPC끼리 직접 잇는 **피어링**은 두 VPC를 일대일로 연결합니다. VPC가 N개이고 모두 서로 통신해야 하면 연결이 N(N−1)/2개로 늘어납니다.

| VPC 수 | 모두 연결하는 피어링 수 | Transit Gateway 연결(attachment) 수 |
| --- | --- | --- |
| 3 | 3 | 3 |
| 5 | 10 | 5 |
| 10 | 45 | 10 |

Transit Gateway는 **중앙 허브**에 각 VPC·온프레미스를 하나씩 연결하는 구조(hub-and-spoke)라서 연결 수가 N개로 늘고, 경로 정책도 한곳에서 관리합니다. 연결하려는 VPC는 **CIDR이 겹치지 않아야** 합니다([서브넷](./subnet.md#0-개념-주소는-어떻게-네트워크와-호스트로-나뉘는가)에서 대역 계획이 중요한 이유). VPC 피어링은 별도의 게이트웨이나 VPN이 아니라 기존 VPC 인프라를 쓰는 연결로, **같은 AZ 안의 전송은 무료이고 AZ·리전을 넘으면 요금**이 붙습니다(AWS 문서).

---

## 4. 실무 코드 예시

### 4.1. AWS CLI

```bash
# Internet Gateway 생성 및 VPC 연결
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=my-igw}]'
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxx --vpc-id vpc-xxx

# NAT Gateway 생성 (Elastic IP 필요)
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id subnet-public-xxx --allocation-id eipalloc-xxx
```

### 4.2. Terraform

```hcl
# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "my-igw" }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "nat-eip" }
}

# NAT Gateway (Public 서브넷에 배치)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  tags          = { Name = "my-nat-gw" }

  depends_on = [aws_internet_gateway.main] # IGW가 먼저 생성되어야 함
}
```

### 4.3. API Gateway (Terraform - REST API 예시)

```hcl
resource "aws_api_gateway_rest_api" "main" {
  name        = "my-api"
  description = "My REST API"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "users" # /users 경로
}

resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "NONE"
}
```

> [!TIP] > **비용 최적화**: NAT Gateway는 시간당 + 데이터 처리량 기반으로 과금됩니다. 트래픽 대부분이 S3·DynamoDB로 향하면 Gateway VPC Endpoint(추가 요금 없음)로 NAT를 우회하고, 그 밖의 AWS 서비스는 Interface Endpoint를 검토하세요. NAT Instance(EC2)는 직접 운영해야 하는 부담이 있습니다.

## 참고 자료

- [AWS VPC: Internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html) - 고가용성 관리형, 1:1 NAT, 공인 IP 요구, 기본 VPC와 직접 만든 VPC의 차이, 요금
- [AWS VPC: NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html) - Public/Private 유형, Elastic IP와 public 서브넷 요건, 변환 과정, egress-only IGW
- [AWS VPC: NAT gateway pricing](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html) - 시간당·GB당 과금, 같은 AZ 권장, 엔드포인트로 비용 절감
- [AWS PrivateLink: Gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html) - S3·DynamoDB 지원, 추가 요금 없음, prefix list 경로와 최장 prefix 우선
- [AWS VPC peering](https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html) - 피어링 정의, AZ·리전 간 요금

확인일: 2026-10-22 (IGW·NAT Gateway·Gateway Endpoint 동작과 요금 구조, 피어링 정의와 요금. "게이트웨이"의 두 의미, 선택 질문 표, 피어링 수 계산(N(N−1)/2), API Gateway와 리버스 프록시 비교, Transit Gateway의 허브 구조와 CIDR 비중복 요건, 피어링의 비전이성은 일반 개념·미확인이며 AWS 문서로 확인하지 못함. 요금 단가는 기재하지 않음. 아래 AWS CLI·Terraform 예시는 미확인)
