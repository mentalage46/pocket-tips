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

## 🎯 체크리스트

- [ ] LCP ≤ 2.5s
- [ ] CLS ≤ 0.1 (이미지 크기 명시)
- [ ] 코드 스플리팅
- [ ] 이미지 lazy loading + WebP
- [ ] gzip/brotli 압축
- [ ] CDN 활용
