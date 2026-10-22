# 글로벌 번역 (i18n)

## 개념: 번역 문자열 교체가 아니라 "문화권별 표현"

| 용어 | 의미 |
| --- | --- |
| i18n (국제화) | 코드를 **여러 언어·지역을 받을 수 있게 설계**하는 일. 문자열 분리, 포맷 처리, 레이아웃 대비 |
| l10n (현지화) | 실제 언어·지역에 **맞춰 채우는** 일. 번역, 날짜·통화 형식, 이미지·색 의미 |
| locale | 언어 + 지역 조합. `ko-KR`, `en-US`, `en-GB`, `pt-BR` (BCP 47 태그) |

- **언어와 로케일은 다릅니다.** `en-US`와 `en-GB`는 같은 영어지만 날짜(10/22 vs 22/10), 철자(color/colour), 단위가 다릅니다. `pt-BR`과 `pt-PT`도 다릅니다. 지역이 필요 없으면 `en`처럼 언어만 써도 됩니다.
- **번역은 문자열을 바꾸는 일이 아니라 문장 구조가 달라지는 일입니다.** 그래서 아래 규칙을 지켜야 합니다.

### 문자열을 이어 붙이지 않는다

```typescript
// ❌ 어순이 언어마다 다름
const msg = t("hello") + ", " + userName + t("님");
// 영어: "Hello, Kim"   한국어: "김 님, 안녕하세요" 처럼 어순이 달라 조립 불가

// ✅ 문장 전체를 하나의 키로 두고 자리표시자 사용
// ko: "{{name}}님, 안녕하세요"   en: "Hello, {{name}}"
t("greeting", { name: userName });
```

### 복수형은 언어마다 규칙이 다르다

영어는 `1개 / 여러 개` 둘이지만 언어에 따라 형태가 다릅니다. Unicode CLDR은 복수 범주를 `zero`, `one`, `two`, `few`, `many`, `other`로 정의하고, 언어마다 쓰는 범주가 다릅니다. `Intl.PluralRules`로 확인한 결과입니다.

| 언어 | 사용하는 범주 | 예 |
| --- | --- | --- |
| 한국어(`ko`), 일본어(`ja`) | `other` | 단·복수 구분 없음 |
| 영어(`en`) | `one`, `other` | 1 → one, 그 외 → other |
| 러시아어(`ru`) | `one`, `few`, `many`, `other` | 1·21 → one, 2 → few, 5 → many |
| 아랍어(`ar`) | `zero`, `one`, `two`, `few`, `many`, `other` | 6가지 모두 |

```json
// en/common.json — i18next v4 JSON 형식: 키 이름 뒤에 _범주
{
  "item_one": "{{count}} item",
  "item_other": "{{count}} items"
}
```

```typescript
t("item", { count: 5 }); // 변수 이름은 반드시 count
```

- `if (n === 1)`로 직접 분기하지 않습니다. 번역가가 언어별 범주를 채울 수 있도록 **라이브러리의 복수형 기능**을 씁니다.
- i18next는 `count`를 빼면 `key`로 되돌아가지(fallback) 않으므로 항상 넘깁니다. 복수형은 `Intl.PluralRules` 지원이 필요합니다.
- i18next v21부터 복수형 키 접미사가 바뀌었습니다(`_plural` → `_one`/`_other` 등). 오래된 예제를 그대로 쓰면 동작하지 않습니다.

### 날짜·숫자·통화·정렬은 직접 만들지 않고 `Intl`을 쓴다

같은 값도 로케일마다 표기가 다릅니다.

```typescript
new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(1234567);
// "₩1,234,567"
new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(1234567.5);
// "1.234.567,50 €"

new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date); // "Oct 22, 2026"
new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date); // "2026. 10. 22."

new Intl.ListFormat("ko", { type: "conjunction" }).format(["사과", "배", "귤"]); // "사과, 배 및 귤"
new Intl.ListFormat("en", { type: "conjunction" }).format(["a", "b", "c"]);     // "a, b, and c"

// 정렬도 로케일 규칙을 따름: 독일어는 a,ä,z / 스웨덴어는 a,z,ä
["ä", "z", "a"].sort(new Intl.Collator("de").compare);
```

- 서버에는 **UTC**로 저장하고, 표시할 때 사용자의 시간대와 로케일로 변환합니다.
- 통화는 **금액과 통화 코드를 함께** 저장합니다. 로케일이 통화를 정하는 것이 아닙니다(한국어 사용자가 달러를 볼 수 있음).

### 로케일을 정하고 대체(fallback)하는 순서

```
1. 사용자가 직접 선택한 언어 (저장된 설정)
2. 브라우저 설정 (Accept-Language, navigator.languages)
3. 서비스 기본 언어
번역이 없는 키: ko-KR → ko → 기본 언어(en) → 키 이름 그대로 (누락 경고)
```

### 번역과 UI 설계에서 놓치기 쉬운 것

| 항목 | 이유 |
| --- | --- |
| 텍스트 길이 변화 | 독일어 등은 영어보다 길어 버튼·메뉴가 넘칠 수 있음. 고정 너비를 피함 |
| RTL(오른쪽→왼쪽) 언어 | 아랍어·히브리어는 레이아웃 방향이 반대. `dir="rtl"`과 CSS 논리 속성(`margin-inline-start`) 사용 |
| 문맥 없는 키 | "Open"이 동사(열기)인지 형용사(열린)인지 번역가가 모름. 키 이름과 설명(context)을 남김 |
| 이미지 속 텍스트 | 번역할 수 없음. 텍스트는 이미지가 아니라 UI로 |
| 번역 값에 HTML 포함 | 아래 보안 주의 참고 |

### 보안: 번역 문자열을 `innerHTML`로 넣지 않는다

번역 파일은 외부 번역가·번역 플랫폼이 수정할 수 있고, 값에 사용자 입력이 섞이기도 합니다. `[innerHTML]`·`dangerouslySetInnerHTML`로 번역 문자열을 삽입하면 XSS 경로가 됩니다. 링크 같은 마크업이 필요하면 `<Trans components={...}>`처럼 **허용한 태그만 컴포넌트로 치환**하는 방식을 씁니다([웹 공격과 방어](../Security/web-attacks.md#xss-cross-site-scripting)).

---

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

## 참고 자료

- [Unicode CLDR: Plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules) - 복수 범주 `zero`, `one`, `two`, `few`, `many`, `other`
- [i18next: Plurals](https://www.i18next.com/translation-function/plurals) - `_one`/`_other` 접미사, `count` 필수, v21 형식 변경, `Intl.PluralRules` 요구
- [MDN: Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) - `NumberFormat`, `DateTimeFormat`, `PluralRules`, `ListFormat`, `Collator`

확인일: 2026-10-22 (CLDR 범주, i18next 복수형 규칙, 언어별 범주와 포맷 예시는 Node 24.13의 `Intl`로 실행 확인. i18n·l10n 정의, 어순·RTL·fallback 순서·보안 주의는 일반 개념·경험칙. 아래 React·Angular 구현 예시는 미확인)
