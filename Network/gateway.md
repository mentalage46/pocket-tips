# 게이트웨이 (Gateway) - 실무 가이드

게이트웨이는 서로 다른 네트워크를 연결하는 관문입니다. 클라우드에서는 다양한 유형의 게이트웨이가 핵심 인프라 역할을 합니다.

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

API Gateway는 HTTP/REST/WebSocket API의 진입점으로, 마이크로서비스 아키텍처에서 필수입니다.

- **라우팅**: URL 경로에 따라 백엔드 서비스로 요청 분배
- **인증/인가**: JWT 토큰 검증, API Key 관리
- **스로틀링**: Rate Limiting으로 과부하 방지
- **변환**: 요청/응답 데이터 형식 변환

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

> [!TIP] > **비용 최적화**: NAT Gateway는 시간당 + 데이터 처리량 기반으로 과금됩니다. 비용이 부담되면 NAT Instance(EC2)나 VPC Endpoint로 대체를 고려하세요.
