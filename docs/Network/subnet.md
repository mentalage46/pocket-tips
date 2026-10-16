# 서브넷 (Subnet) - 실무 가이드

서브넷은 하나의 네트워크를 더 작은 논리적 단위로 분할하는 기술입니다. 클라우드 환경에서 VPC 설계의 핵심입니다.

## 1. CIDR 표기법과 서브넷 마스크

### 1.1. CIDR (Classless Inter-Domain Routing)

IP 주소와 함께 사용 가능한 호스트 수를 표기합니다.

| CIDR  | 서브넷 마스크   | 사용 가능 호스트 | 용도 예시                           |
| :---- | :-------------- | :--------------: | :---------------------------------- |
| `/32` | 255.255.255.255 |        1         | 단일 호스트 (Bastion, NAT Instance) |
| `/28` | 255.255.255.240 |        14        | 소규모 서브넷 (AWS 최소 권장)       |
| `/24` | 255.255.255.0   |       254        | 일반적인 서브넷                     |
| `/16` | 255.255.0.0     |      65,534      | VPC 전체 대역                       |

> [!IMPORTANT] > **AWS 예약 IP**: AWS는 각 서브넷에서 처음 4개와 마지막 1개 IP를 예약합니다.
> 예: `10.0.0.0/24` -> `10.0.0.0`(네트워크), `10.0.0.1`(VPC 라우터), `10.0.0.2`(DNS), `10.0.0.3`(예비), `10.0.0.255`(브로드캐스트) 사용 불가.

### 1.2. 서브넷 계산 예시 (JavaScript)

```javascript
function calculateSubnet(cidr) {
  const [ip, prefix] = cidr.split("/");
  const prefixNum = parseInt(prefix);
  const totalHosts = Math.pow(2, 32 - prefixNum);
  const usableHosts = totalHosts - 2; // 네트워크 주소 & 브로드캐스트 제외

  console.log(`CIDR: ${cidr}`);
  console.log(`Total IPs: ${totalHosts}`);
  console.log(`Usable Hosts: ${usableHosts}`);
}

calculateSubnet("10.0.1.0/24");
// CIDR: 10.0.1.0/24
// Total IPs: 256
// Usable Hosts: 254
```

---

## 2. Public vs Private 서브넷

| 구분              | Public Subnet                     | Private Subnet                       |
| :---------------- | :-------------------------------- | :----------------------------------- |
| **인터넷 접근**   | Internet Gateway를 통해 직접 가능 | NAT Gateway를 통해 아웃바운드만 가능 |
| **배치 리소스**   | ALB, Bastion Host, NAT Gateway    | 애플리케이션 서버, DB, Lambda        |
| **라우팅 테이블** | `0.0.0.0/0 -> igw-xxx`            | `0.0.0.0/0 -> nat-xxx`               |

---

## 3. 실무 코드 예시

### 3.1. AWS CLI

```bash
# VPC 생성
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# Public 서브넷 생성
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone ap-northeast-2a

# Private 서브넷 생성
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.10.0/24 --availability-zone ap-northeast-2a
```

### 3.2. Terraform

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "my-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-northeast-2a"
  map_public_ip_on_launch = true # Public 서브넷의 핵심 설정
  tags = { Name = "public-subnet-1" }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "ap-northeast-2a"
  tags = { Name = "private-subnet-1" }
}
```

> [!TIP] > **가용 영역(AZ) 분산**: 고가용성을 위해 최소 2개 이상의 AZ에 서브넷을 분산 배치하세요.
