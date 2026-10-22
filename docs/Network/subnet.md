# 서브넷 (Subnet) - 실무 가이드

서브넷은 하나의 네트워크를 더 작은 논리적 단위로 분할하는 기술입니다. 클라우드 환경에서 VPC 설계의 핵심입니다.

## 0. 개념: 주소는 어떻게 "네트워크"와 "호스트"로 나뉘는가

IPv4 주소는 32비트 숫자이고, 그 앞부분은 **네트워크 부분**, 나머지는 **호스트 부분**입니다. 어디까지가 네트워크인지를 알려 주는 것이 **프리픽스 길이**(`/24`)이며, 서브넷 마스크는 같은 정보를 `255.255.255.0`처럼 쓴 것입니다.

```
10.0.1.37/24

주소    : 00001010.00000000.00000001.00100101
마스크  : 11111111.11111111.11111111.00000000   (앞 24비트 = 네트워크)
          └──── 네트워크 부분 ────┘ └ 호스트 ┘
네트워크: 10.0.1.0     호스트 비트: 8개 → 2^8 = 256개 주소
```

| 질문 | 답 |
| --- | --- |
| 서브넷 안의 전체 주소 수 | `2^(32 − 프리픽스)` |
| 프리픽스를 1 늘리면 | 서브넷이 **절반**으로 나뉜다 (`/24` → `/25` 두 개) |
| 같은 서브넷인가? | 두 주소를 마스크로 AND했을 때 네트워크 주소가 같은가 |
| 다른 서브넷으로 가려면 | 목적지가 같은 서브넷이 아니면 **게이트웨이(라우터)로** 보낸다 ([Router](./router.md), [Gateway](./gateway.md)) |

### 왜 나누는가

- **격리**: 외부에 노출할 것(로드밸런서)과 숨길 것(DB)을 다른 서브넷에 두고 라우팅·방화벽 규칙을 다르게 건다
- **트래픽 범위 제한**: 같은 서브넷 안에서만 브로드캐스트가 퍼진다
- **관리 단위**: 용도·가용 영역·팀별로 주소 대역을 나눠 규칙을 단순하게 유지한다

### 사설 주소 대역 (RFC 1918)

인터넷에서 라우팅되지 않고 내부망에서만 쓰는 대역입니다.

| 대역 | 프리픽스 | 용도 예 |
| --- | --- | --- |
| `10.0.0.0` – `10.255.255.255` | `10/8` | 큰 VPC, 회사망 |
| `172.16.0.0` – `172.31.255.255` | `172.16/12` | Docker 기본 브리지 등이 이 안의 대역을 쓰기도 함 |
| `192.168.0.0` – `192.168.255.255` | `192.168/16` | 가정용 공유기 |

> 나중에 **VPN으로 회사망·다른 VPC와 연결**할 가능성이 있으면 대역이 겹치지 않게 처음부터 계획합니다. 겹치면 라우팅이 불가능해서 나중에 바꾸려면 VPC를 새로 만들어야 하는 일이 생깁니다.

### 설계 팁

- 서브넷은 **필요한 것보다 크게** 잡습니다. 줄이기는 어렵고 주소 고갈은 서비스 확장을 막습니다(오토스케일, 컨테이너·파드가 주소를 많이 씁니다).
- 용도별(public/private/db) × 가용 영역별로 같은 크기의 서브넷을 규칙적으로 배치하면 이해하기 쉽습니다.

예: VPC `10.0.0.0/16`

| 서브넷 | CIDR | 가용 영역 |
| --- | --- | --- |
| public-a | `10.0.0.0/24` | a |
| public-b | `10.0.1.0/24` | b |
| private-a | `10.0.10.0/24` | a |
| private-b | `10.0.11.0/24` | b |
| db-a / db-b | `10.0.20.0/24` / `10.0.21.0/24` | a / b |

---

## 1. CIDR 표기법과 서브넷 마스크

### 1.1. CIDR (Classless Inter-Domain Routing)

IP 주소와 함께 사용 가능한 호스트 수를 표기합니다.

| CIDR  | 서브넷 마스크   | 사용 가능 호스트 | 용도 예시                           |
| :---- | :-------------- | :--------------: | :---------------------------------- |
| `/32` | 255.255.255.255 |        1         | 단일 호스트 (보안 그룹·라우팅 규칙에서 특정 IP 하나를 가리킬 때) |
| `/28` | 255.255.255.240 |        14        | 소규모 서브넷 (AWS 서브넷의 최소 크기) |
| `/24` | 255.255.255.0   |       254        | 일반적인 서브넷                     |
| `/16` | 255.255.0.0     |      65,534      | VPC 전체 대역                       |

> "사용 가능 호스트" 열은 일반 규칙(전체 − 2: 네트워크 주소와 브로드캐스트 주소)입니다. `/31`은 두 장비를 잇는 링크용으로 예외(RFC 3021)가 있어 둘 다 쓸 수 있습니다.

> [!IMPORTANT] > **AWS 예약 IP**: AWS는 각 서브넷에서 처음 4개와 마지막 1개 IP를 예약합니다(AWS 서브넷 크기는 `/28`~`/16`). 그래서 `/28`은 16 − 5 = **11개**, `/24`는 256 − 5 = **251개**가 실제로 쓸 수 있는 주소입니다.
> 예: `10.0.0.0/24` -> `10.0.0.0`(네트워크), `10.0.0.1`(VPC 라우터), `10.0.0.2`(DNS), `10.0.0.3`(예비), `10.0.0.255`(브로드캐스트) 사용 불가.

### 1.2. 서브넷 계산 예시 (JavaScript)

```javascript
function calculateSubnet(cidr) {
  const [ip, prefix] = cidr.split("/");
  const prefixNum = parseInt(prefix);
  const totalHosts = Math.pow(2, 32 - prefixNum);
  const usableHosts = totalHosts - 2; // 일반 규칙. AWS 서브넷은 5개를 빼야 함

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

## 참고 자료

- [RFC 1918 Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918.html) - 사설 대역 `10/8`, `172.16/12`, `192.168/16`
- [RFC 3021 31-Bit Prefixes on IPv4 Point-to-Point Links](https://www.rfc-editor.org/rfc/rfc3021.html) - `/31` 예외
- [RFC 4632 CIDR Address Strategy](https://www.rfc-editor.org/rfc/rfc4632.html)
- [AWS VPC: Subnet CIDR blocks](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) - 서브넷 크기 `/28`~`/16`, 예약 IP 5개

확인일: 2026-10-22 (사설 대역, AWS 서브넷 크기·예약 IP, `/31` 예외. 비트 계산과 설계 팁은 일반 개념·경험칙. Docker 기본 브리지 대역 언급과 아래 AWS CLI·Terraform 예시는 미확인)
