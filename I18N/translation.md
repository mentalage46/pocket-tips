# 글로벌 번역 (i18n)

## 번역 파일 관리

### 디렉토리 구조

```
src/
├── locales/           # 또는 i18n, assets/locales
│   ├── ko/
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   └── errors.json
│   ├── en/
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   └── errors.json
│   └── ja/
│       ├── common.json
│       ├── auth.json
│       ├── dashboard.json
│       └── errors.json
```

### 파일 분리 전략

#### ✅ 권장: 도메인/기능별 분리

```json
// common.json - 공통 UI
{
  "button": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제"
  },
  "message": {
    "loading": "로딩 중...",
    "noData": "데이터가 없습니다"
  }
}

// auth.json - 인증 관련
{
  "login": {
    "title": "로그인",
    "email": "이메일",
    "password": "비밀번호",
    "submit": "로그인"
  },
  "signup": {
    "title": "회원가입"
  }
}

// dashboard.json - 대시보드
{
  "overview": "개요",
  "statistics": "통계"
}
```

#### ❌ 비권장: 단일 파일

```json
// 모든 번역이 하나의 파일에 - 관리 어려움
{
  "common.button.save": "저장",
  "auth.login.title": "로그인",
  "dashboard.overview": "개요"
  // ... 수천 줄
}
```

### 네임스페이스 규칙

```typescript
// 계층 구조 사용
{
  "user": {
    "profile": {
      "title": "프로필",
      "edit": "수정",
      "settings": {
        "notifications": "알림 설정",
        "privacy": "개인정보 설정"
      }
    }
  }
}

// 사용
t('user.profile.title')
t('user.profile.settings.notifications')
```

---

## React 번역 구현

### 1. i18next + react-i18next

#### 설치

```bash
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector
```

#### 설정

```typescript
// i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpBackend) // 백엔드에서 로드
  .use(LanguageDetector) // 자동 언어 감지
  .use(initReactI18next)
  .init({
    fallbackLng: "ko",
    supportedLngs: ["ko", "en", "ja"],

    // 네임스페이스 설정
    ns: ["common", "auth", "dashboard"],
    defaultNS: "common",

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    interpolation: {
      escapeValue: false, // React가 이미 XSS 방지
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
```

#### 사용

```tsx
import { useTranslation } from "react-i18next";

function LoginPage() {
  const { t, i18n } = useTranslation("auth");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <h1>{t("login.title")}</h1>
      <input placeholder={t("login.email")} />
      <button>{t("login.submit")}</button>

      {/* 언어 전환 */}
      <select onChange={(e) => changeLanguage(e.target.value)}>
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </div>
  );
}
```

#### 동적 값 삽입

```typescript
// 번역 파일
{
  "welcome": "안녕하세요, {{name}}님!",
  "itemCount": "총 {{count}}개의 항목"
}

// 컴포넌트
t('welcome', { name: '홍길동' })
// → "안녕하세요, 홍길동님!"

t('itemCount', { count: 42 })
// → "총 42개의 항목"
```

#### Pluralization (복수형)

```typescript
// 번역 파일
{
  "item": "{{count}}개의 항목",
  "item_zero": "항목 없음",
  "item_one": "1개의 항목",
  "item_other": "{{count}}개의 항목"
}

// 사용
t('item', { count: 0 }) // → "항목 없음"
t('item', { count: 1 }) // → "1개의 항목"
t('item', { count: 5 }) // → "5개의 항목"
```

---

## Angular 번역 구현

### 1. ngx-translate

#### 설치

```bash
npm install @ngx-translate/core @ngx-translate/http-loader
```

#### 설정

```typescript
// app.config.ts
import { HttpClient } from "@angular/common/http";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, "./assets/i18n/", ".json");
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: "ko",
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      })
    ),
  ],
};
```

#### 사용

```typescript
// Component
import { TranslateService } from "@ngx-translate/core";

export class AppComponent {
  private translate = inject(TranslateService);

  constructor() {
    this.translate.setDefaultLang("ko");
    this.translate.use("ko");
  }

  changeLanguage(lang: string) {
    this.translate.use(lang);
  }

  // 즉시 번역
  getTranslation() {
    return this.translate.instant("auth.login.title");
  }
}
```

```html
<!-- Template -->
<h1>{{ 'auth.login.title' | translate }}</h1>
<p>{{ 'auth.login.subtitle' | translate }}</p>

<!-- 파라미터 전달 -->
<p>{{ 'welcome' | translate: {name: userName} }}</p>

<!-- 언어 전환 -->
<select (change)="changeLanguage($event.target.value)">
  <option value="ko">한국어</option>
  <option value="en">English</option>
  <option value="ja">日本語</option>
</select>
```

#### Signal 기반 동적 번역 (Angular 16+)

```typescript
import { toSignal } from "@angular/core/rxjs-interop";
import { TranslateService } from "@ngx-translate/core";

export class HeaderComponent {
  private translate = inject(TranslateService);

  // 언어 변경에 자동 반응
  private langChange$ = toSignal(this.translate.onLangChange);

  // Computed로 동적 번역
  title = computed(() => {
    this.langChange$(); // 언어 변경 감지
    return this.translate.instant("header.title");
  });
}
```

---

## UI 관리

### 1. 언어 전환 UI

#### 드롭다운

```tsx
// React
function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      <option value="ko">🇰🇷 한국어</option>
      <option value="en">🇺🇸 English</option>
      <option value="ja">🇯🇵 日本語</option>
    </select>
  );
}
```

```html
<!-- Angular -->
<select [value]="currentLang" (change)="changeLang($event.target.value)">
  <option value="ko">🇰🇷 한국어</option>
  <option value="en">🇺🇸 English</option>
  <option value="ja">🇯🇵 日本語</option>
</select>
```

#### 버튼 토글

```tsx
// React
function LanguageToggle() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);

  const languages = [
    { code: "ko", label: "한", flag: "🇰🇷" },
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "ja", label: "日", flag: "🇯🇵" },
  ];

  const handleChange = (code: string) => {
    setLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem("language", code);
  };

  return (
    <div className="language-toggle">
      {languages.map(({ code, label, flag }) => (
        <button
          key={code}
          className={lang === code ? "active" : ""}
          onClick={() => handleChange(code)}
        >
          {flag} {label}
        </button>
      ))}
    </div>
  );
}
```

### 2. 로딩 상태 처리

```tsx
// React - Suspense 사용
import { Suspense } from "react";

function App() {
  return (
    <Suspense fallback={<div>번역 파일 로딩 중...</div>}>
      <MainApp />
    </Suspense>
  );
}
```

```typescript
// Angular - APP_INITIALIZER
import { APP_INITIALIZER } from "@angular/core";

export function initializeApp(translate: TranslateService) {
  return () => {
    translate.setDefaultLang("ko");
    return translate.use("ko").toPromise();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [TranslateService],
      multi: true,
    },
  ],
};
```

### 3. 레이아웃 변경 대응

#### RTL (Right-to-Left) 지원

```tsx
// React
function App() {
  const { i18n } = useTranslation();
  const isRTL = ["ar", "he"].includes(i18n.language);

  useEffect(() => {
    document.dir = isRTL ? "rtl" : "ltr";
  }, [isRTL]);

  return <div className={isRTL ? "rtl-layout" : "ltr-layout"}>...</div>;
}
```

```css
/* CSS */
[dir="rtl"] .text-left {
  text-align: right;
}

[dir="rtl"] .ml-4 {
  margin-right: 1rem;
  margin-left: 0;
}
```

#### 텍스트 길이 대응

```css
/* 영어가 한국어보다 길 수 있음 */
.button {
  min-width: 120px; /* 최소 너비 설정 */
  padding: 0.5rem 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Flexbox로 유연하게 */
.header {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap; /* 텍스트 길면 줄바꿈 */
}
```

### 4. 날짜/숫자 포맷팅

```tsx
// React - Intl API
function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatNumber(num: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: locale === "ko" ? "KRW" : "USD",
  }).format(num);
}

// 사용
formatDate(new Date(), "ko"); // "2024년 1월 15일"
formatNumber(1234567, "ko"); // "₩1,234,567"
```

```typescript
// Angular - DatePipe, CurrencyPipe
@Component({
  template: `
    <p>{{ today | date : "longDate" : undefined : currentLang }}</p>
    <p>
      {{ price | currency : currencyCode : "symbol" : "1.0-0" : currentLang }}
    </p>
  `,
})
export class PriceComponent {
  today = new Date();
  price = 1234567;
  currentLang = "ko";
  currencyCode = "KRW";
}
```

---

## 번역 파일 관리 베스트 프랙티스

### 1. 키 네이밍 컨벤션

```typescript
// ✅ 좋은 예
{
  "user.profile.edit": "프로필 수정",
  "button.save": "저장",
  "error.network.timeout": "네트워크 타임아웃"
}

// ❌ 나쁜 예
{
  "btn1": "저장",
  "text123": "프로필 수정",
  "err": "오류"
}
```

### 2. 번역 누락 감지

```typescript
// React - i18next 설정
i18n.init({
  saveMissing: true,
  missingKeyHandler: (lng, ns, key) => {
    console.error(`Missing translation: ${lng} - ${ns} - ${key}`);
    // 서버에 리포트
  },
});
```

### 3. 타입 안전성 (TypeScript)

```typescript
// translations.type.ts
export type TranslationKeys =
  | "common.button.save"
  | "common.button.cancel"
  | "auth.login.title"
  | "auth.login.email";

// 타입 안전한 번역 함수
const t = (key: TranslationKeys, params?: object) => {
  return i18n.t(key, params);
};

t("common.button.save"); // ✅ OK
t("invalid.key"); // ❌ 타입 에러
```

### 4. 번역 자동화

```bash
# i18next-parser로 자동 추출
npm install -D i18next-parser

# i18next-parser.config.js
module.exports = {
  locales: ['ko', 'en', 'ja'],
  input: ['src/**/*.{ts,tsx}'],
  output: 'public/locales/$LOCALE/$NAMESPACE.json',
  defaultNamespace: 'common'
};

# 실행
npx i18next-parser
```

---

## 🎯 체크리스트

### 파일 관리

- [ ] 기능별로 번역 파일 분리
- [ ] 명확한 네임스페이스 규칙
- [ ] fallback 언어 설정
- [ ] 타입 정의 (TypeScript)

### UI 관리

- [ ] 언어 전환 UI 제공
- [ ] 번역 로딩 상태 처리
- [ ] RTL 언어 대응
- [ ] 텍스트 길이 변화 대응 (CSS)
- [ ] 날짜/숫자 로케일별 포맷팅

### 성능

- [ ] Lazy loading (필요한 번역만)
- [ ] 번역 파일 캐싱
- [ ] 번들 크기 최적화

### 개발 경험

- [ ] 번역 누락 감지
- [ ] 자동 번역 추출 도구
- [ ] 번역 관리 플랫폼 연동 (Lokalise, Phrase 등)

---

## 팁

```typescript
// ✅ 긴 텍스트는 별도 키로
{
  "terms.title": "이용약관",
  "terms.content": "매우 긴 약관 내용..."
}

// ✅ 재사용 가능한 메시지
{
  "validation.required": "{{field}}은(는) 필수입니다",
  "validation.minLength": "{{field}}은(는) 최소 {{min}}자 이상이어야 합니다"
}

t('validation.required', { field: '이메일' })
// → "이메일은(는) 필수입니다"

// ✅ HTML 포함 시
{
  "notice": "자세한 내용은 <a href='/help'>도움말</a>을 참고하세요"
}

// React
<Trans i18nKey="notice" components={{ a: <a href="/help" /> }} />

// Angular
<p [innerHTML]="'notice' | translate"></p>
```
