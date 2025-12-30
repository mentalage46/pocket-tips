# 라우터 & 라우팅 테이블 (Router & Routing Table) - 실무 가이드

라우터는 네트워크 간 트래픽을 전달하는 L3(네트워크 계층) 장치입니다. 클라우드에서는 라우팅 테이블로 이를 제어합니다.

## 1. 라우팅 테이블 동작 원리

라우팅 테이블은 목적지 IP에 따라 트래픽을 어디로 보낼지 결정하는 규칙 모음입니다.

### 1.1. 라우팅 테이블 구조

| Destination     | Target  | 설명                              |
| :-------------- | :------ | :-------------------------------- |
| `10.0.0.0/16`   | local   | VPC 내부 통신 (자동 생성)         |
| `0.0.0.0/0`     | igw-xxx | 인터넷 게이트웨이 (Public 서브넷) |
| `0.0.0.0/0`     | nat-xxx | NAT 게이트웨이 (Private 서브넷)   |
| `172.16.0.0/16` | pcx-xxx | VPC Peering 연결                  |

> [!IMPORTANT] > **Longest Prefix Match**: 라우팅 테이블에서 가장 구체적인(CIDR가 긴) 규칙이 우선 적용됩니다.
> 예: `10.0.1.5`로 가는 트래픽은 `10.0.1.0/24` 규칙이 `10.0.0.0/16`보다 먼저 매칭됩니다.

---

## 2. 정적 라우팅 vs 동적 라우팅

| 구분          | 정적 라우팅                       | 동적 라우팅                              |
| :------------ | :-------------------------------- | :--------------------------------------- |
| **설정 방식** | 관리자가 수동으로 경로 지정       | 프로토콜(BGP, OSPF)이 자동으로 경로 학습 |
| **유연성**    | 낮음 (변경 시 수동 업데이트 필요) | 높음 (네트워크 변경 자동 반영)           |
| **사용 사례** | 소규모 VPC, Site-to-Site VPN      | 대규모 네트워크, Transit Gateway         |

---

## 3. 실무 코드 예시

### 3.1. AWS CLI

```bash
# 라우팅 테이블 생성
aws ec2 create-route-table --vpc-id vpc-xxx --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]'

# 인터넷 게이트웨이 라우트 추가 (Public 서브넷용)
aws ec2 create-route --route-table-id rtb-xxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxx

# 라우팅 테이블을 서브넷에 연결
aws ec2 associate-route-table --route-table-id rtb-xxx --subnet-id subnet-xxx
```

### 3.2. Terraform

```hcl
# Public 라우팅 테이블
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "public-rt" }

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

# Private 라우팅 테이블
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "private-rt" }

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

# 라우팅 테이블 <-> 서브넷 연결
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
```

> [!TIP] > **트러블슈팅**: EC2에서 인터넷 접속이 안 될 때, 가장 먼저 해당 서브넷에 연결된 라우팅 테이블의 `0.0.0.0/0` 경로를 확인하세요.
