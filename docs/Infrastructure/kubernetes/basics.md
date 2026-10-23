# Kubernetes 기초: Pod, Deployment, Service

> "컨테이너를 원하는 상태로 계속 유지해 주는 시스템"을 이해하고, 첫 매니페스트를 안전하게 쓰는 법

Kubernetes(K8s)는 여러 서버(노드)에 컨테이너를 배치하고, 죽으면 다시 띄우고, 트래픽을 나눠 주고, 배포를 단계적으로 바꿔 줍니다. 컨테이너 자체는 [Docker](../docker/docker.md)와 같은 컨테이너 런타임이 실행하고, K8s는 그 **위에서 여러 대를 관리**합니다. 서버 1~2대와 [Docker Compose](../docker/docker-compose.md)로 충분한 서비스에는 과할 수 있습니다.

> **검증 범위를 먼저 밝힙니다.** 이 기기에는 Docker 데몬이 꺼져 있고 클러스터가 없어서 **클러스터에서 실행해 보지 못했습니다.** 직접 확인한 것은 다음 두 가지입니다.
> - `kubectl` v1.34.1의 `--dry-run=client`로 **매니페스트 생성**
> - `kubeconform` v0.8.0(체크섬 확인)으로 Kubernetes 1.34 스키마 **검증**
>
> 롤링 업데이트, 프로브, 스케줄링 같은 **클러스터 동작은 kubernetes.io 공식 문서 본문**을 근거로 적었고 실행 결과가 아닙니다.

---

## 개념: 선언형과 컨트롤 루프

K8s에서는 "컨테이너를 실행해라"라고 명령하지 않고 **원하는 상태(desired state)** 를 YAML로 선언합니다. 컨트롤러가 현재 상태를 계속 관찰해서 원하는 상태와 다르면 맞춥니다.

```
매니페스트(원하는 상태: replicas 3)
          │ kubectl apply
          ▼
   API Server (저장) ──▶ 컨트롤러가 현재 상태와 비교
                                  │ 다르면 Pod 생성/삭제
                                  ▼
                        스케줄러가 노드 선택 ─▶ kubelet이 컨테이너 실행
```

- Pod 하나가 죽으면 사람이 아니라 **컨트롤러가 새 Pod를 만듭니다.** 그래서 Pod는 "고치는 것"이 아니라 "교체하는 것"으로 다룹니다.
- 서비스가 **상태를 가지면** 안 됩니다. Pod는 언제든 다른 노드에서 새 IP로 다시 뜰 수 있어서 로컬 디스크, 메모리 세션, 고정 IP에 의존하면 깨집니다.

### 세 가지 핵심 오브젝트

| 오브젝트 | 역할 | 비유 |
| --- | --- | --- |
| **Pod** | 하나 이상의 컨테이너 묶음. 같은 IP와 볼륨을 공유. 일회용 | 프로세스 |
| **Deployment** | "이 Pod를 N개 유지하고, 이미지가 바뀌면 단계적으로 교체" | 실행 관리자 |
| **Service** | Pod 집합 앞의 **고정 이름·IP**. 라벨로 대상 Pod를 고름 | 로드 밸런서 + DNS 이름 |

Pod를 직접 만들지 않고 보통 Deployment를 통해 만듭니다. Deployment가 ReplicaSet을 만들고, ReplicaSet이 Pod 개수를 유지합니다.

---

## 첫 매니페스트

`kubectl create deployment web --image=nginx:1.27 --replicas=3 --port=80 --dry-run=client -o yaml`로 뼈대를 만들 수 있습니다(실행해서 확인). 아래는 프로브·리소스를 더해 직접 정리한 예이며 kubeconform으로 검증했습니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: {app: web}
spec:
  replicas: 3
  selector:
    matchLabels: {app: web}          # 이 라벨의 Pod를 관리한다
  strategy:
    type: RollingUpdate
    rollingUpdate: {maxSurge: 1, maxUnavailable: 0}
  template:                          # Pod 템플릿
    metadata:
      labels: {app: web}             # selector와 반드시 맞아야 함
    spec:
      containers:
        - name: web
          image: nginx:1.27          # :latest 쓰지 않기
          ports: [{containerPort: 80}]
          resources:
            requests: {cpu: 100m, memory: 128Mi}
            limits: {memory: 256Mi}
          readinessProbe:
            httpGet: {path: /, port: 80}
            periodSeconds: 5
          livenessProbe:
            httpGet: {path: /, port: 80}
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata: {name: web}
spec:
  selector: {app: web}               # 이 라벨의 Pod로 트래픽을 보낸다
  ports: [{port: 80, targetPort: 80}]
```

```bash
kubectl apply -f app.yaml            # 원하는 상태를 선언
kubectl get deploy,pods,svc          # 상태 확인
kubectl rollout status deploy/web    # 롤아웃 진행 확인
```

### 라벨과 셀렉터가 모든 것을 연결한다

Deployment의 `selector`, Pod의 `labels`, Service의 `selector`가 **문자열로 정확히 맞아야** 연결됩니다.

- **Deployment `selector`는 생성 후 바꿀 수 없습니다**(immutable). `kubectl apply`, `patch`, `helm upgrade`로도 안 되고, 바꾸려면 삭제 후 재생성해야 합니다(공식 문서). 처음에 라벨을 신중히 정합니다.
- `apps/v1`에서는 `selector`가 Pod 템플릿 라벨에서 **자동으로 채워지지 않아** 반드시 명시해야 합니다(공식 문서).
- **Service의 selector가 틀려도 스키마 검증은 통과합니다.** 위 파일에서 Service의 selector를 `app: webb`로 바꿔 kubeconform에 넣었더니 `Valid: 2, Invalid: 0`이었습니다. 대상 Pod가 0개인 Service는 에러가 아니라 **조용히 연결이 안 되는** 상태가 됩니다. `kubectl get endpointslices`로 Service가 실제로 Pod를 잡았는지 확인하는 습관이 필요합니다(이 명령은 클러스터가 없어 실행하지 못함).

---

## 매니페스트 검증: 직접 돌려 본 결과

kubeconform(`-strict`, Kubernetes 1.34.0 스키마)으로 정상 파일과 일부러 깨뜨린 파일을 검사했습니다.

| 파일 | 결과 |
| --- | --- |
| 위 정상 매니페스트 | `Valid: 2, Invalid: 0` |
| `replicas: "3"` (문자열) | `got string, want null or integer` |
| `maxSurg: 1` (오타) | `additional properties 'maxSurg' not allowed` — **`-strict`에서만** 검출 |
| `requests`의 키를 `memry`로 오타 | **검출되지 않음** (자원 이름은 임의의 키를 허용하는 맵이라 스키마가 막지 못함) |
| Service selector `webb` | 검출되지 않음 (스키마상 유효) |

- 오타를 잡으려면 **`-strict`** 옵션을 씁니다. 기본(non-strict)에서는 `maxSurg` 오타가 통과하고 `replicas` 타입 오류만 잡혔습니다.
- 스키마 검증은 **구조만** 봅니다. 라벨이 맞는지, 리소스 이름이 맞는지는 클러스터에 넣거나 별도 정책 도구로 확인해야 합니다. 이 문서에서 정책 도구는 실행하지 않았습니다.
- CI에서 `kubeconform`을 돌리면 클러스터 없이도 기본적인 오류를 걸러낼 수 있습니다(스키마를 내려받으려면 네트워크 필요).

---

## 배포와 롤링 업데이트

이미지(또는 템플릿)를 바꾸고 `apply`하면 Deployment가 **새 ReplicaSet을 만들어 Pod를 단계적으로 교체**합니다(공식 문서).

| 설정 | 의미 | 기본값 |
| --- | --- | --- |
| `maxUnavailable` | 업데이트 중 **줄어들 수 있는** Pod 수 | 25% (희망 개수의 최소 75%는 가동) |
| `maxSurge` | 업데이트 중 희망 개수를 **초과해서** 띄울 수 있는 Pod 수 | 25% (최대 125%) |

- 위 예제처럼 `maxUnavailable: 0, maxSurge: 1`로 두면 **먼저 새 Pod를 하나 띄우고 Ready가 된 뒤 옛 Pod를 내립니다.** 서비스 용량이 줄지 않는 대신 일시적으로 자원이 더 필요합니다. 이 동작은 공식 문서의 설명이며 직접 실행하지 못했습니다.
- 새 버전이 Ready가 되지 않으면 롤아웃이 **진행을 멈춥니다.** 이때 `readinessProbe`가 없으면 K8s는 컨테이너가 시작만 되면 "준비됨"으로 보고 깨진 버전으로 계속 교체할 수 있습니다. **프로브가 롤링 업데이트의 안전장치**입니다.
- 되돌리기는 `kubectl rollout undo deploy/web`입니다([배포 전략과 롤백](../cicd/deployment-strategies.md)의 일반 원칙을 K8s에 적용한 것).
- **이미지 태그를 고정**합니다. 공식 문서는 운영에서 `:latest`를 피하라고 권하며(어떤 버전이 도는지 추적하기 어렵고 롤백이 힘듦), 태그가 없거나 `:latest`이면 `imagePullPolicy`가 `Always`로, 그 외 태그면 `IfNotPresent`로 **생성 시점에** 정해진다고 설명합니다. 같은 태그에 다른 이미지를 덮어쓰면 노드마다 다른 버전이 돌 수 있으니 태그를 바꾸거나 **다이제스트**를 씁니다.

---

## 프로브: K8s가 컨테이너 상태를 아는 방법

공식 문서의 정의입니다. 앱 쪽 엔드포인트 설계는 [헬스체크](../../Observability/metrics-and-tracing.md#헬스체크-liveness-readiness-startup)에 있습니다.

| 프로브 | 실패하면 | 용도 |
| --- | --- | --- |
| **liveness** | kubelet이 컨테이너를 **재시작** | 교착처럼 "실행 중이지만 진행 못 하는" 상태 복구 |
| **readiness** | Pod를 **Service의 엔드포인트에서 제외**(재시작 안 함) | 아직 준비 안 됐거나 일시적으로 과부하일 때 트래픽 차단 |
| **startup** | 컨테이너를 죽이고 재시작 정책 적용 | 시작이 느린 앱. 성공할 때까지 **liveness/readiness를 실행하지 않음** |

- readiness는 컨테이너의 **전체 수명 동안** 실행됩니다.
- liveness는 readiness 성공을 기다리지 않습니다. 시작이 느린 앱에 liveness만 두면 **시작 중에 죽이고 재시작하는 반복**에 빠질 수 있으므로 `initialDelaySeconds`를 주거나 startup 프로브를 둡니다(공식 문서).
- **liveness에 외부 의존성(DB)을 넣지 않습니다.** DB가 잠시 느릴 때 모든 Pod가 동시에 재시작해 상황이 악화됩니다. 의존성 상태는 readiness 쪽에 두거나 아예 프로브에서 뺍니다(공식 문서의 주의와 같은 방향의 일반 원칙).

---

## 리소스: requests와 limits

```yaml
resources:
  requests: {cpu: 100m, memory: 128Mi}   # 스케줄링 기준(최소 보장)
  limits:   {memory: 256Mi}              # 상한
```

- **requests**는 스케줄러가 노드를 고르는 기준입니다. 너무 크면 Pod가 `Pending`으로 남고, 너무 작으면 노드가 과밀해집니다.
- **CPU limit은 쓰로틀링**으로 강제됩니다(한도에 다가가면 커널이 CPU 접근을 제한, 공식 문서). 지연이 늘 뿐 죽지는 않습니다.
- **메모리 limit은 OOM kill**로 강제됩니다. 한도를 넘기면 커널이 컨테이너를 **죽일 수 있고**, 종료 코드는 보통 137입니다([OOM killer와 137](../../Linux/system-diagnostics.md)). 메모리 limit은 반응적으로 적용되어 즉시 죽지 않을 수도 있습니다(공식 문서).
- **QoS 클래스**: `Guaranteed`(모든 컨테이너의 requests = limits), `Burstable`, `BestEffort`(requests/limits 없음). 노드 자원이 부족하면 `BestEffort` → `Burstable` → `Guaranteed` 순으로 퇴출 대상이 됩니다(공식 문서). 아무것도 안 적으면 가장 먼저 쫓겨납니다.
- 자원 단위: CPU `100m` = 0.1 코어, 메모리 `128Mi` = 128 mebibyte.

---

## Service: 고정된 접점

Pod IP는 바뀌므로 Service가 **고정 이름과 가상 IP**를 제공하고 라벨로 Pod를 고릅니다. 같은 네임스페이스에서는 이름(`web`)으로, 다른 네임스페이스에서는 `web.<네임스페이스>`로 DNS 조회가 됩니다(공식 문서의 서비스 디스커버리 설명, 직접 실행하지 못함).

| 타입 | 접근 범위 |
| --- | --- |
| **ClusterIP** (기본) | 클러스터 **내부**에서만 |
| **NodePort** | 모든 노드의 특정 포트로 외부 노출 |
| **LoadBalancer** | 클라우드 로드 밸런서를 만들어 외부 노출 |
| **ExternalName** | 외부 DNS 이름으로 CNAME |

HTTP를 외부에 노출할 때는 보통 Service를 여러 개 두고 앞에 **Ingress/Gateway**를 놓습니다(이 문서에서는 다루지 않음). 로드 밸런싱 개념은 [로드 밸런싱](../../Network/load-balancing.md)과 같습니다.

---

## 종료와 상태: 컨테이너 쪽에서 맞춰야 할 것

- Pod를 내릴 때 컨테이너에 **SIGTERM**을 보내고, 유예 시간 뒤 **SIGKILL**로 강제 종료하는 것이 일반적입니다. 앱은 SIGTERM에서 새 요청을 멈추고 진행 중인 요청을 끝낸 뒤 종료해야 합니다([SIGTERM과 SIGKILL](../../Linux/permissions-and-processes.md#정상-종료sigterm와-강제-종료sigkill)). 이 흐름의 세부(유예 시간 기본값, Service에서 제거되는 시점과의 경쟁)는 이 문서에서 확인하지 않았습니다.
- 로그는 **stdout/stderr**로 내보내면 `kubectl logs`와 수집기가 읽습니다([로깅](../../Observability/logging.md)).
- 설정과 비밀값은 이미지에 굽지 않고 ConfigMap·Secret으로 주입합니다. 다만 Secret은 기본적으로 **base64 인코딩일 뿐 암호화가 아닙니다**(일반적인 설명이며 이번에 공식 문서로 확인하지 않음, [환경변수 관리](../../Security/env-management.md)).
- 데이터베이스처럼 **상태를 가진** 워크로드는 StatefulSet과 영구 볼륨이 필요합니다. 이 문서에서는 다루지 않았습니다. 관리형 DB를 쓰는 편이 단순한 경우가 많습니다.

---

## 🎯 체크리스트

- [ ] Pod를 직접 만들지 않고 Deployment로 만든다
- [ ] `selector`, Pod 라벨, Service `selector`를 정확히 맞추고, Deployment `selector`는 바꿀 수 없음을 안다
- [ ] 이미지는 **고정 태그**(또는 다이제스트)를 쓴다 (`:latest` 금지)
- [ ] `readinessProbe`를 둔다 (롤링 업데이트의 안전장치). 느린 앱은 `startupProbe`
- [ ] liveness 프로브에 외부 의존성을 넣지 않는다
- [ ] `requests`와 메모리 `limits`를 설정한다 (아무것도 없으면 BestEffort)
- [ ] 앱이 SIGTERM을 처리해 정상 종료한다
- [ ] 로그는 stdout/stderr로 보낸다
- [ ] 매니페스트를 CI에서 `kubeconform -strict`로 검증한다
- [ ] Service가 실제 Pod를 잡았는지 확인한다 (`kubectl get endpointslices`)
- [ ] 서버 1~2대로 충분한지 먼저 검토한다 (Compose로 충분한 규모에 K8s는 과할 수 있음)

## 참고 자료

- [Kubernetes - Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) - 롤링 업데이트 기본값(25%/25%), selector 불변, `apps/v1` selector 명시
- [Kubernetes - Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/) - 프로브별 동작
- [Kubernetes - Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) - CPU 쓰로틀링, 메모리 OOM kill
- [Kubernetes - Pod Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes - Images](https://kubernetes.io/docs/concepts/containers/images/) - `imagePullPolicy` 기본값, `:latest` 권고
- [Kubernetes - Service](https://kubernetes.io/docs/concepts/services-networking/service/) - 서비스 타입
- [kubeconform](https://github.com/yannh/kubeconform) - 매니페스트 스키마 검증

확인일: 2026-10-23 (kubectl v1.34.1의 `create --dry-run=client -o yaml`로 Deployment·Service 생성 확인, kubeconform v0.8.0(SHA-256 체크섬 일치)을 `-kubernetes-version 1.34.0`로 실행: 정상 파일 통과, 문자열 replicas·`maxSurg` 오타(strict) 검출, `memry` 오타·Service selector 불일치는 미검출. 롤링 업데이트 기본값·selector 불변·프로브 동작·CPU 쓰로틀링/메모리 OOM·QoS·imagePullPolicy 기본값은 kubernetes/website 문서 본문에서 확인. 클러스터가 없어 실제 apply·롤아웃·프로브·스케줄링·Service 엔드포인트는 실행하지 못함. 종료 유예 시간과 Service 제거 경쟁, Secret의 암호화 여부, Ingress/Gateway, StatefulSet, 네임스페이스·RBAC, 실제 DNS 이름 규칙은 확인하지 않음)
