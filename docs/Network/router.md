# 라우터 & 라우팅 테이블 (Router & Routing Table) - 실무 가이드

라우터는 네트워크 간 트래픽을 전달하는 L3(네트워크 계층) 장치입니다. 클라우드에서는 라우팅 테이블로 이를 제어합니다.

## 0. 개념: 패킷은 어떻게 목적지까지 가는가

### 호스트의 첫 판단: 같은 서브넷인가?

패킷을 보내려는 호스트는 목적지 IP를 자신의 서브넷 마스크와 비교합니다([서브넷](./subnet.md#0-개념-주소는-어떻게-네트워크와-호스트로-나뉘는가)).

```
목적지가 같은 서브넷  → 같은 링크에서 직접 전달 (이더넷에서는 ARP로 MAC 주소를 알아냄)
목적지가 다른 네트워크 → 기본 게이트웨이(default gateway, 라우터)로 보냄
```

호스트는 인터넷 전체의 경로를 모릅니다. **"내 네트워크 밖은 모두 이 출구로"**라는 규칙 하나(기본 경로)만 알면 됩니다.

### 라우터의 일: 다음 홉 결정

- 라우터는 패킷의 **목적지 IP**를 보고 **다음 홉(next hop)**을 정합니다. 경로 전체를 정하는 것이 아니라 **홉마다 각 라우터가 독립적으로** 정합니다.
- 결정의 근거가 **라우팅 테이블**입니다. 각 항목은 `목적지 대역(prefix) → 대상(target/next hop)`입니다.
- 라우터는 L3(IP) 장치이므로, 같은 서브넷 안의 전달(L2 스위칭)과 달리 **서로 다른 네트워크 사이**를 이어 줍니다.

### 어느 규칙을 쓸까: Longest Prefix Match

여러 규칙이 동시에 맞으면 **가장 구체적인(prefix가 가장 긴) 규칙**을 씁니다. `0.0.0.0/0`은 prefix 길이가 0이라 "그 외 모든 것"을 뜻하는 **기본 경로(default route)**이고, 맞는 규칙이 없을 때의 최후 수단입니다.

| 목적지 | 맞는 규칙 | 선택 |
| --- | --- | --- |
| `10.0.5.7` | `10.0.0.0/16`(local), `0.0.0.0/0`(igw) | `/16` (더 구체적) |
| `172.31.4.9` | `172.31.0.0/16`(pcx), `0.0.0.0/0`(igw) | `/16` → 피어링으로 감 |
| `8.8.8.8` | `0.0.0.0/0`(igw)만 | 기본 경로 |

### 라우팅은 양방향이다

요청이 도착해도 **응답이 돌아갈 경로가 없으면** 통신은 실패합니다. 한쪽 라우팅 테이블만 고치고 상대 쪽(예: 피어링한 VPC)을 빼먹는 것이 대표적인 실수입니다. 연결을 만들 때는 **양쪽 모두에 경로**가 있는지 확인합니다.

---

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

### AWS 라우트 테이블의 규칙

| 개념 | 설명 |
| --- | --- |
| **Main route table** | VPC를 만들 때 자동 생성됨. **다른 라우트 테이블에 명시적으로 연결되지 않은 모든 서브넷**의 라우팅을 담당 |
| **Custom route table** | 직접 만든 테이블. 서브넷에 연결해서 사용 |
| **Local route** | VPC 내부 통신을 위한 기본 경로 (IPv4, IPv6 각각) |
| **Destination / Target** | 목적지 CIDR / 보낼 곳(IGW, NAT, 피어링, VPN 등) |

- **Public/Private 서브넷의 정의는 라우트 테이블입니다.** 서브넷에 연결된 라우트 테이블에 **인터넷 게이트웨이로 가는 경로가 있으면 public, 없으면 private**입니다. private 서브넷의 인스턴스는 **공인 IP가 있어도** 인터넷과 통신할 수 없습니다. 경로가 없기 때문입니다.
- 인스턴스가 인터넷과 통신하려면 **① IGW 경로가 있는 라우트 테이블 + ② 공인 IPv4 주소(또는 IPv6)**가 모두 필요합니다.
- 새 서브넷은 명시적으로 연결하지 않으면 **main 테이블**을 씁니다. main에 IGW 경로를 넣어 두면 앞으로 만드는 모든 서브넷이 의도치 않게 public이 됩니다. **main은 최소한으로 두고, 용도별 custom 테이블을 서브넷에 명시적으로 연결**하는 편이 안전합니다(권장 사항).
- 같은 목적지에 여러 경로가 있으면 우선순위는 ① **가장 긴 prefix** → ② 정적 경로(IGW, NAT, 피어링 등) → ③ prefix list 경로 → ④ 전파(propagated) 경로(Direct Connect BGP → VPN 정적 → VPN BGP) 순입니다.

---

## 2. 정적 라우팅 vs 동적 라우팅

| 구분          | 정적 라우팅                       | 동적 라우팅                              |
| :------------ | :-------------------------------- | :--------------------------------------- |
| **설정 방식** | 관리자가 수동으로 경로 지정       | 프로토콜(BGP, OSPF)이 자동으로 경로 학습 |
| **유연성**    | 낮음 (변경 시 수동 업데이트 필요) | 높음 (네트워크 변경 자동 반영)           |
| **사용 사례** | 소규모 VPC, Site-to-Site VPN      | 대규모 네트워크, Transit Gateway         |

- **BGP**(RFC 4271)는 조직·네트워크 사이(자율 시스템 간)에서, **OSPF**(RFC 2328)는 한 조직 내부 라우터 사이에서 경로를 교환하는 프로토콜로 쓰입니다(일반 개념).
- 동적 라우팅의 장점은 장애 시 자동 우회이고, 단점은 설정이 복잡하고 잘못된 경로가 전파될 수 있다는 점입니다. 클라우드 VPC 안에서는 대부분 **정적 경로**로 충분합니다.

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

### 연결이 안 될 때 확인 순서

1. **목적지로 가는 경로**가 출발지 서브넷의 라우트 테이블에 있는가 (이 서브넷이 어느 테이블에 연결됐는지, 명시적 연결이 없어 main을 쓰는 건 아닌지)
2. **돌아오는 경로**가 상대 쪽 라우트 테이블에 있는가
3. 경로의 target이 `blackhole`(대상이 삭제됨)이거나 올바른 게이트웨이인가
4. 경로가 맞다면 **보안 그룹과 네트워크 ACL**이 해당 포트·방향을 허용하는가 (라우팅이 맞아도 막힐 수 있음)
5. 인스턴스에 공인 IP가 있는가 (public 서브넷에서 외부와 직접 통신할 때)

## 참고 자료

- [AWS VPC: Route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html) - main/custom 테이블, local route, 연결 규칙
- [AWS VPC: How route priority works](https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html) - 최장 prefix 일치, 정적·prefix list·전파 경로 우선순위
- [AWS VPC: Internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html) - public/private 서브넷의 정의
- [RFC 4271 BGP-4](https://www.rfc-editor.org/rfc/rfc4271.html), [RFC 2328 OSPF Version 2](https://www.rfc-editor.org/rfc/rfc2328.html)
- [RFC 826 ARP](https://www.rfc-editor.org/rfc/rfc826.html)

확인일: 2026-10-22 (AWS 라우트 테이블 개념·우선순위·public/private 정의, RFC 번호와 제목. 호스트·라우터의 동작 설명, BGP·OSPF 사용 범위, 트러블슈팅 순서, main 테이블 운영 권장은 일반 개념·경험칙. 아래 AWS CLI·Terraform 예시는 미확인)
