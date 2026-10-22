# Web Performance

## 성능을 보는 관점

웹 성능은 "빠르다"는 느낌을 **사용자가 겪는 순간**으로 쪼개 측정합니다. 서버 응답이 빨라도 화면이 늦게 뜨거나, 눌렀는데 반응이 없거나, 읽다가 글이 밀리면 사용자는 느리다고 느낍니다.

| 사용자 질문 | 의미 | 지표 |
| --- | --- | --- |
| 뜨고 있나? | 로딩 | **LCP** (Largest Contentful Paint) |
| 눌렀는데 반응하나? | 상호작용 | **INP** (Interaction to Next Paint) |
| 읽는 중에 밀리지 않나? | 시각적 안정성 | **CLS** (Cumulative Layout Shift) |

### 각 지표가 재는 것과 원인

| 지표 | 재는 것 | 느려지는 주된 원인 | 방향 |
| --- | --- | --- | --- |
| LCP | 화면에서 가장 큰 콘텐츠(대개 히어로 이미지·큰 제목)가 그려진 시각 | 느린 서버 응답(TTFB), 렌더링을 막는 CSS/JS, 늦게 발견된 이미지, 큰 이미지 | 핵심 리소스를 **일찍 발견하고 먼저 받게** |
| INP | 방문 중 클릭·탭·키 입력에 대해 입력부터 **다음 화면 갱신까지**의 지연 | 메인 스레드를 오래 잡는 JS(긴 작업), 과한 리렌더링 | 긴 작업을 **쪼개고 일을 줄이기** |
| CLS | 예상치 못한 레이아웃 이동의 누적 정도 | 크기 없는 이미지·광고·iframe, 늦게 로드되는 폰트, 위쪽에 끼어드는 동적 콘텐츠 | 자리를 **미리 확보** |

핵심은 **브라우저의 메인 스레드는 하나**라는 점입니다. 같은 스레드에서 JS 실행, 스타일 계산, 레이아웃, 페인트, 입력 처리를 모두 하므로, JS가 오래 돌면 화면도 입력도 함께 멈춥니다.

### 로딩이 화면이 되기까지

```
HTML 다운로드 → 파싱하며 CSS·JS·이미지 발견 → DOM + CSSOM → 렌더 트리 → 레이아웃 → 페인트
                 └ CSS와 동기 JS는 렌더링을 막는다 (render-blocking)
```

- **발견 시점**이 곧 시작 시점입니다. CSS 안의 `background-image`나 JS가 나중에 만드는 이미지는 브라우저가 늦게 알아서 LCP가 밀립니다. `preload`·`fetchpriority`는 이 발견·우선순위를 앞당기는 도구입니다.
- 렌더링을 막는 리소스(CSS, 동기 `<script>`)는 줄이고, 나머지는 `defer`·`async`·지연 로딩으로 뒤로 미룹니다.

### 측정: 필드 데이터와 랩 데이터

| 구분 | 필드(Field, RUM) | 랩(Lab) |
| --- | --- | --- |
| 데이터 | 실제 사용자의 기기·네트워크에서 수집 | 정해진 조건에서 시뮬레이션 (Lighthouse 등) |
| 장점 | 실제 경험 반영 | 재현 가능, 배포 전 확인, 원인 분석 |
| 한계 | 원인 파악이 어렵고 데이터가 쌓여야 함 | 실제 사용자와 다를 수 있음 |
| 용도 | **목표 달성 여부 판단** | **원인 찾기, 회귀 방지** |

- 합격 기준은 **75번째 백분위수**입니다. 모바일과 데스크톱을 나눠, 세 지표 모두 이 지점에서 "좋음" 기준을 넘어야 합니다. 평균이 아니라 느린 쪽 사용자를 봅니다.
- INP는 사용자 입력이 있어야 생기므로 Lighthouse 같은 랩 도구가 직접 재지 못합니다. 랩에서는 **TBT(Total Blocking Time)**를 대리 지표로 봅니다.
- 개발 중에는 랩으로 고치고, 배포 후에는 필드 데이터(CrUX, 직접 수집한 RUM)로 확인합니다.

---

## Core Web Vitals

| 지표    | 설명             |  좋음   | 개선 필요 |
| ------- | ---------------- | :-----: | :-------: |
| **LCP** | 최대 콘텐츠 로드 | ≤ 2.5s  |   > 4s    |
| **INP** | 상호작용 반응    | ≤ 200ms |  > 500ms  |
| **CLS** | 레이아웃 이동    |  ≤ 0.1  |  > 0.25   |

> "좋음" 기준은 web.dev 문서로 확인했습니다. 오른쪽 열(나쁨 경계)은 이 문서에서 확인하지 못했습니다(미확인).

---

## LCP 최적화

```html
<!-- 히어로 이미지 사전 로드 -->
<link rel="preload" as="image" href="/hero.webp" />
<img src="/hero.webp" fetchpriority="high" loading="eager" />
```

## CLS 최적화

```html
<!-- 이미지 크기 명시 -->
<img src="photo.jpg" width="800" height="600" />

<!-- aspect-ratio 사용 -->
<style>
  .video {
    aspect-ratio: 16 / 9;
  }
</style>
```

## INP 최적화

```javascript
// 긴 작업 분할
async function processChunks(items) {
  for (let i = 0; i < items.length; i += 50) {
    items.slice(i, i + 50).forEach(process);
    await new Promise((r) => setTimeout(r, 0));
  }
}
```

---

## 로딩 최적화

```html
<!-- 리소스 힌트 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- 이미지 lazy loading -->
<img src="photo.jpg" loading="lazy" />

<!-- 반응형 이미지 -->
<picture>
  <source srcset="img.webp" type="image/webp" />
  <img src="img.jpg" />
</picture>
```

---

## Angular 성능 최적화

### 1. Lazy Loading (모듈 지연 로딩)

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.routes").then((m) => m.ADMIN_ROUTES),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent
      ),
  },
];
```

### 2. OnPush Change Detection

```typescript
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-user-list",
  changeDetection: ChangeDetectionStrategy.OnPush, // 성능 향상
  template: `
    <div *ngFor="let user of users">
      {{ user.name }}
    </div>
  `,
})
export class UserListComponent {
  @Input() users: User[] = [];
}
```

### 3. TrackBy 함수

```typescript
@Component({
  template: `
    <div *ngFor="let item of items; trackBy: trackById">
      {{ item.name }}
    </div>
  `,
})
export class ListComponent {
  // DOM 재사용으로 렌더링 최적화
  trackById(index: number, item: Item) {
    return item.id;
  }
}
```

### 4. Virtual Scrolling

```typescript
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";

@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="50" class="viewport">
      <div *cdkVirtualFor="let item of items">
        {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [".viewport { height: 400px; }"],
})
export class VirtualScrollComponent {
  items = Array(10000)
    .fill(0)
    .map((_, i) => ({ id: i, name: `Item ${i}` }));
}
```

### 5. 번들 최적화

```typescript
// angular.json
{
  "configurations": {
    "production": {
      "optimization": true,
      "buildOptimizer": true,
      "budgets": [
        {
          "type": "initial",
          "maximumWarning": "500kb",
          "maximumError": "1mb"
        }
      ]
    }
  }
}
```

### 6. Preloading Strategy

```typescript
import { PreloadAllModules, RouterModule } from "@angular/router";

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules, // 백그라운드에서 모든 모듈 미리 로드
    }),
  ],
})
export class AppModule {}

// 또는 커스텀 전략
export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.["preload"] ? load() : of(null);
  }
}
```

### 7. Pipe 메모이제이션

```typescript
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "expensiveCalc",
  pure: true, // 입력이 같으면 재계산 안 함 (기본값)
})
export class ExpensiveCalcPipe implements PipeTransform {
  transform(value: number): number {
    console.log("계산됨"); // 한 번만 실행됨
    return value * 2;
  }
}
```

### 8. Defer (Angular 17+)

```typescript
@Component({
  template: `
    <!-- 뷰포트에 들어올 때만 로드 -->
    @defer (on viewport) {
    <heavy-component />
    } @placeholder {
    <div>Loading...</div>
    }

    <!-- 유저 인터랙션 후 로드 -->
    @defer (on interaction) {
    <chart-component />
    }

    <!-- 타이머 -->
    @defer (on timer(2s)) {
    <analytics-widget />
    }
  `,
})
export class DashboardComponent {}
```

---

## 🎯 체크리스트

- [ ] 필드 데이터(75번째 백분위수)로 세 지표 확인
- [ ] LCP ≤ 2.5s
- [ ] CLS ≤ 0.1 (이미지 크기 명시)
- [ ] 코드 스플리팅
- [ ] 이미지 lazy loading + WebP
- [ ] gzip/brotli 압축
- [ ] CDN 활용

## 참고 자료

- [web.dev: Web Vitals](https://web.dev/articles/vitals) - LCP 2.5초, INP 200ms, CLS 0.1 기준, 75번째 백분위수, 필드 vs 랩, Lighthouse의 INP 한계와 TBT

확인일: 2026-10-22 (지표별 "좋음" 기준, 75번째 백분위수, 필드·랩 구분, TBT. 지표별 원인·메인 스레드 설명은 일반 개념, 나쁨 경계 수치와 Angular 섹션은 미확인)
