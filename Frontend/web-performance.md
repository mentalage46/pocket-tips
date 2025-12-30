# Web Performance

## Core Web Vitals

| 지표    | 설명             |  좋음   | 개선 필요 |
| ------- | ---------------- | :-----: | :-------: |
| **LCP** | 최대 콘텐츠 로드 | ≤ 2.5s  |   > 4s    |
| **INP** | 상호작용 반응    | ≤ 200ms |  > 500ms  |
| **CLS** | 레이아웃 이동    |  ≤ 0.1  |  > 0.25   |

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

- [ ] LCP ≤ 2.5s
- [ ] CLS ≤ 0.1 (이미지 크기 명시)
- [ ] 코드 스플리팅
- [ ] 이미지 lazy loading + WebP
- [ ] gzip/brotli 압축
- [ ] CDN 활용
