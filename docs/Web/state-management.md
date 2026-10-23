# Frontend State Management

## 상태 관리란?

> 컴포넌트 간 데이터(상태)를 효율적으로 공유하고 관리하는 패턴

**왜 필요한가?**

- Props Drilling 방지
- 전역 상태 관리
- 상태 변화 예측 가능성
- 디버깅 용이성

---

## 상태의 종류

| 종류             | 설명               | 저장 위치        |
| ---------------- | ------------------ | ---------------- |
| **Local State**  | 컴포넌트 내부 상태 | useState, ref    |
| **Global State** | 앱 전체 공유 상태  | Redux, Zustand   |
| **Server State** | 서버 데이터 캐시   | React Query, SWR |
| **URL State**    | URL 파라미터       | Router           |
| **Form State**   | 폼 입력 상태       | React Hook Form  |

---

## 개념: 상태를 어디에 둘 것인가

상태 관리 문제의 본질은 라이브러리 선택이 아니라 **"이 데이터의 주인이 누구이고, 누가 읽고, 얼마나 자주 바뀌는가"**입니다. 아래 순서로 판단하면 대부분 라이브러리 없이 해결됩니다.

### 판단 순서

1. **상태로 저장해야 하는가?** 다른 값에서 계산할 수 있으면 저장하지 않고 계산합니다(파생 상태).
2. **한 컴포넌트만 쓰는가?** 로컬 상태(`useState`, Angular `signal`)로 충분합니다.
3. **형제나 가까운 자식과 공유하는가?** 가장 가까운 **공통 부모로 끌어올립니다**(lifting state up).
4. **서버에서 온 데이터인가?** 서버 상태 도구(React Query 등)로 다룹니다. 전역 스토어에 복사하지 않습니다.
5. **URL로 표현할 수 있는가?** 검색어, 필터, 페이지, 탭은 URL에 두면 새로고침·공유·뒤로 가기가 공짜입니다.
6. 그래도 앱 전반에서 자주 바뀌고 많은 곳에서 쓰는 **클라이언트 상태**만 전역 스토어를 씁니다.

### 파생 상태는 저장하지 않는다

```tsx
// ❌ 중복 저장: items와 total이 어긋날 수 있음
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);

// ✅ 한 곳에만 저장하고 계산
const [items, setItems] = useState([]);
const total = items.reduce((sum, i) => sum + i.price, 0);
```

저장된 값이 둘이면 **둘을 동기화하는 코드**가 생기고, 그 코드가 버그의 원천이 됩니다. Angular의 `computed`는 이 계산을 값처럼 선언하는 도구입니다.

### 서버 상태는 클라이언트 상태와 다르다

서버 데이터는 내가 소유한 값이 아니라 **원본이 서버에 있는 사본(캐시)**입니다. 그래서 "언제 오래된 것으로 볼지", "언제 다시 가져올지", "같은 요청을 합칠지"라는 클라이언트 상태에는 없는 문제가 생깁니다. React Query(TanStack Query)가 기본으로 처리하는 동작은 다음과 같습니다.

| 동작 | 기본값 |
| --- | --- |
| 캐시된 데이터를 오래된(stale) 것으로 취급 | 기본적으로 즉시 (`staleTime` 기본 0) |
| 비활성 쿼리를 캐시에서 제거 | **5분** 뒤 (`gcTime`) |
| 오래된 쿼리를 다시 가져오는 시점 | 새 인스턴스가 마운트될 때, 창이 다시 포커스될 때, 네트워크가 재연결될 때 |
| 실패한 쿼리 | 지수 백오프로 **3번** 조용히 재시도 |
| 결과 비교 | 구조적 공유: 내용이 같으면 같은 참조 유지(불필요한 리렌더링 방지) |

- 서버 데이터를 `useEffect` + `useState`로 직접 가져오면 로딩·에러·재시도·캐시·중복 요청·경쟁 상태(race condition)를 직접 구현해야 합니다.
- 서버 데이터를 Redux 같은 전역 스토어에 **복사**하면 사본이 둘이 되어 어느 쪽이 최신인지 알 수 없게 됩니다.
- 변경(`mutation`) 뒤에는 관련 쿼리를 **무효화(invalidate)**해 다시 가져오게 합니다. 아래 예시의 `invalidateQueries`가 그 역할입니다.

### 단방향 데이터 흐름과 불변성

```
상태 → 화면 → 사용자 이벤트 → 상태 변경 → 화면
```

- 상태를 **정해진 경로로만 바꾸면** "누가 이 값을 바꿨나"를 추적할 수 있고, 변경 이력·디버깅 도구(타임 트래블 등)가 가능해집니다.
- React는 이전 값과 새 값을 **참조로 비교**(`Object.is`)해 렌더링 여부를 정합니다. 객체를 제자리에서 수정(mutate)하면 참조가 같아 변경을 감지하지 못합니다. 그래서 `[...items, item]`처럼 **새 객체를 만들어** 교체합니다.
- Redux Toolkit의 `state.value += 1`처럼 직접 수정하는 듯한 문법은 내부에서 불변 업데이트로 변환해 주는 것입니다(변환 원리는 이 문서에서 확인하지 않음, 미확인).

### 전역 상태의 비용: 리렌더링 범위

전역으로 공유하면 **상태가 바뀔 때 구독한 컴포넌트가 다시 렌더링**됩니다. 도구마다 구독 단위가 다릅니다.

| 도구 | 구독 단위 | 주의할 점 |
| --- | --- | --- |
| Context API | Provider의 `value` 전체 | `value`가 바뀌면 `useContext`를 쓰는 **모든 하위 컴포넌트**가 다시 렌더링됨. `memo`로 막을 수 없음 |
| Zustand | 선택한(selector) 조각 | 선택 결과가 `Object.is`로 달라질 때만 렌더링 |
| Redux (`useSelector`) | 선택한 조각 | 위와 같은 원리 |

**Context의 함정**: `value={{ theme, setTheme }}`처럼 객체 리터럴을 넘기면 Provider가 렌더링될 때마다 새 객체가 만들어져, 내용이 같아도 모든 소비자가 다시 렌더링됩니다. 값이 자주 바뀌지 않는 경우(테마, 로그인 사용자, 로케일)에는 그대로 써도 되고, 자주 바뀌는 상태에는 부적합합니다. 줄이려면 `useMemo`/`useCallback`으로 `value`를 고정합니다.

```tsx
const value = useMemo(() => ({ theme, setTheme }), [theme]);
return <ThemeContext.Provider value={value}>...</ThemeContext.Provider>;
```

**Zustand의 함정**: selector가 매번 **새 배열/객체**를 돌려주면(`Object.keys(state)` 등) 내용이 같아도 `Object.is`가 달라서 리렌더링됩니다. 이때 `useShallow`로 얕은 비교를 합니다.

```tsx
import { useShallow } from "zustand/react/shallow";

const names = useStore(useShallow((s) => Object.keys(s.bears)));
// 값 하나만 필요하면 selector로 좁히는 편이 안전: const count = useStore((s) => s.count);
```

### 선택 기준 요약

| 상황 | 선택 |
| --- | --- |
| 한 컴포넌트 안 | `useState` / `signal` |
| 가까운 컴포넌트 공유 | 상태 끌어올리기, props |
| 거의 안 바뀌는 앱 전역 값(테마, 사용자) | Context / Angular Service |
| 자주 바뀌는 전역 클라이언트 상태 | Zustand, Redux Toolkit / Angular Signals, NgRx |
| 서버 데이터 | React Query, SWR / Angular `HttpClient` + RxJS |
| 필터·페이지·탭 | URL |
| 폼 | 폼 라이브러리 |

> 위 "선택 기준"은 일반적인 권장이며 정답은 아닙니다. 상태 라이브러리는 **복잡도를 옮기는 도구**입니다. 도입 비용(보일러플레이트, 학습, 디버깅)이 해결하는 문제보다 큰지 따져 봅니다.

---

## React 상태 관리

### 1. useState (로컬)

```tsx
const [count, setCount] = useState(0);
```

### 2. Context API (간단한 전역)

```tsx
// Context 생성
const ThemeContext = createContext();

// Provider
function App() {
  const [theme, setTheme] = useState("light");
  // 주의: value에 객체 리터럴을 넘기면 렌더링마다 모든 소비자가 다시 렌더링됨 (위 개념 참고)
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Main />
    </ThemeContext.Provider>
  );
}

// 사용
function Button() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme("dark")}>{theme}</button>;
}
```

### 3. Zustand (권장 ⭐)

```tsx
import { create } from "zustand";

// 스토어 생성
const useStore = create((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));

// 사용
function Counter() {
  // 필요한 조각만 선택하면 그 값이 바뀔 때만 렌더링됨
  const count = useStore((s) => s.count);
  const increase = useStore((s) => s.increase);
  return <button onClick={increase}>{count}</button>;
}
```

### 4. Redux Toolkit

```tsx
import { createSlice, configureStore } from "@reduxjs/toolkit";

// Slice
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  },
});

// Store
const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

// 사용
const count = useSelector((state) => state.counter.value);
const dispatch = useDispatch();
dispatch(increment());
```

---

## Server State (React Query)

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 조회
function Users() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((res) => res.json()),
  });
}

// 생성/수정
function CreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newUser) =>
      fetch("/api/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```

---

## Angular 상태 관리

### 1. Services (전통적 방식)

```typescript
import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUser = signal<User | null>(null);

  // 읽기 전용 노출
  user = this.currentUser.asReadonly();

  login(credentials: Credentials) {
    // API 호출 후
    this.currentUser.set(user);
  }

  logout() {
    this.currentUser.set(null);
  }
}

// 컴포넌트에서 사용
export class HeaderComponent {
  private auth = inject(AuthService);

  user = this.auth.user; // Signal
}
```

```html
<!-- Template에서 사용 -->
@if (user()) {
<p>Welcome, {{ user()!.name }}</p>
}
```

### 2. Signals ⭐

> **signal**은 "값을 감싸고, 값이 바뀌면 그 값을 읽은 곳에 알려 주는" 래퍼입니다. 값을 읽을 때 `items()`처럼 **함수로 호출**하기 때문에 Angular가 "어디서 쓰는지"를 추적합니다. `computed`는 **읽을 때 계산하고 결과를 캐시(lazy + memoized)**하며, `effect`는 시그널이 바뀔 때 부수 효과(로그, `localStorage` 저장 등)를 실행합니다. 상태를 `effect`로 다른 상태에 복사하기보다 `computed`로 파생합니다.

> 이 문서의 "Angular 16+" 표기는 도입 시점이며, 각 API의 안정(stable) 여부는 공식 문서에서 확인하지 못했습니다(미확인).

```typescript
import { signal, computed, effect } from "@angular/core";

@Injectable({ providedIn: "root" })
export class CartService {
  // 기본 시그널
  items = signal<Product[]>([]);

  // Computed Signal (자동 계산)
  total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price, 0)
  );

  itemCount = computed(() => this.items().length);

  // Effect (부수 효과)
  constructor() {
    effect(() => {
      console.log("장바구니 개수:", this.itemCount());
      localStorage.setItem("cart", JSON.stringify(this.items()));
    });
  }

  addItem(product: Product) {
    this.items.update((items) => [...items, product]);
  }

  removeItem(id: number) {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  clear() {
    this.items.set([]);
  }
}
```

### 3. NgRx (대규모 앱)

```typescript
// State
export interface AppState {
  counter: number;
}

// Actions
import { createAction, props } from "@ngrx/store";

export const increment = createAction("[Counter] Increment");
export const decrement = createAction("[Counter] Decrement");
export const reset = createAction("[Counter] Reset");

// Reducer
import { createReducer, on } from "@ngrx/store";

export const counterReducer = createReducer(
  0,
  on(increment, (state) => state + 1),
  on(decrement, (state) => state - 1),
  on(reset, () => 0)
);

// Selector
import { createFeatureSelector, createSelector } from "@ngrx/store";

export const selectCounter = createFeatureSelector<number>("counter");
export const selectDoubled = createSelector(
  selectCounter,
  (counter) => counter * 2
);

// Component
export class CounterComponent {
  private store = inject(Store);

  count$ = this.store.select(selectCounter);
  doubled$ = this.store.select(selectDoubled);

  increment() {
    this.store.dispatch(increment());
  }
}
```

```html
<!-- Template -->
<p>Count: {{ count$ | async }}</p>
<p>Doubled: {{ doubled$ | async }}</p>
<button (click)="increment()">+</button>
```

### 4. NgRx Component Store (로컬 상태)

```typescript
import { ComponentStore } from "@ngrx/component-store";

interface TodoState {
  todos: Todo[];
  filter: "all" | "active" | "completed";
}

@Injectable()
export class TodoStore extends ComponentStore<TodoState> {
  constructor() {
    super({ todos: [], filter: "all" });
  }

  // Selectors
  readonly todos$ = this.select((state) => state.todos);
  readonly filter$ = this.select((state) => state.filter);

  readonly filteredTodos$ = this.select(
    this.todos$,
    this.filter$,
    (todos, filter) => {
      if (filter === "active") return todos.filter((t) => !t.done);
      if (filter === "completed") return todos.filter((t) => t.done);
      return todos;
    }
  );

  // Updaters
  readonly addTodo = this.updater((state, todo: Todo) => ({
    ...state,
    todos: [...state.todos, todo],
  }));

  readonly setFilter = this.updater((state, filter: TodoState["filter"]) => ({
    ...state,
    filter,
  }));
}

// 컴포넌트에서 사용
@Component({
  providers: [TodoStore], // 컴포넌트 레벨 프로바이더
})
export class TodoListComponent {
  private todoStore = inject(TodoStore);

  todos$ = this.todoStore.filteredTodos$;

  addTodo(text: string) {
    this.todoStore.addTodo({ id: Date.now(), text, done: false });
  }
}
```

### 5. RxJS + BehaviorSubject

```typescript
import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class ThemeService {
  private themeSubject = new BehaviorSubject<"light" | "dark">("light");

  theme$: Observable<"light" | "dark"> = this.themeSubject.asObservable();
  isDark$ = this.theme$.pipe(map((theme) => theme === "dark"));

  toggleTheme() {
    const current = this.themeSubject.value;
    this.themeSubject.next(current === "light" ? "dark" : "light");
  }

  setTheme(theme: "light" | "dark") {
    this.themeSubject.next(theme);
  }
}
```

---

## 🎯 상태 관리 선택 체크리스트

**Angular Services + Signals 선택**

- [ ] Angular 16+ 사용
- [ ] 중소규모 프로젝트
- [ ] 간단한 반응형 상태 필요
- [ ] 최소한의 보일러플레이트

**NgRx Component Store 선택**

- [ ] 컴포넌트 로컬 복잡한 상태
- [ ] NgRx 장점 + 낮은 진입장벽
- [ ] 중간 규모 기능

**NgRx Store 선택**

- [ ] 대규모 엔터프라이즈 앱
- [ ] 복잡한 상태 로직
- [ ] 타임 트래블 디버깅 필요
- [ ] 팀이 RxJS/Redux 패턴 숙련

**RxJS + BehaviorSubject 선택**

- [ ] 레거시 Angular 프로젝트
- [ ] RxJS 스트림과 통합 필요
- [ ] Signals 마이그레이션 전

---

## React vs Angular 상태 관리 비교

| 항목                 | React                   | Angular                 |
| -------------------- | ----------------------- | ----------------------- |
| **로컬 상태**        | useState                | Signal, BehaviorSubject |
| **전역 상태 (간단)** | Context API             | Service + Signal        |
| **전역 상태 (복잡)** | Redux Toolkit / Zustand | NgRx Store              |
| **컴포넌트 상태**    | useState + useReducer   | ComponentStore          |
| **서버 상태**        | React Query / SWR       | RxJS + HttpClient       |
| **비동기 처리**      | useEffect + async       | RxJS Observables        |

---

## 성능 최적화

### 1. React.memo

```tsx
// props가 변경되지 않으면 리렌더링 방지
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* 복잡한 렌더링 */}</div>;
});
```

### 2. useMemo / useCallback

```tsx
// 계산 결과 메모이제이션
const sortedList = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// 함수 메모이제이션
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### 3. 가상화 (Virtualization)

```tsx
import { FixedSizeList } from "react-window";

// 10000개 항목도 빠르게 렌더링
<FixedSizeList height={400} itemCount={10000} itemSize={35}>
  {({ index, style }) => <div style={style}>Item {index}</div>}
</FixedSizeList>;
```

### 4. 코드 스플리팅

```tsx
// 동적 import
const HeavyComponent = lazy(() => import("./HeavyComponent"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 5. 이미지 최적화

```tsx
// Next.js Image
import Image from "next/image";

<Image
  src="/hero.jpg"
  width={800}
  height={400}
  loading="lazy"
  placeholder="blur"
/>;
```

---

## 🎯 성능 최적화 체크리스트

### 렌더링

- [ ] 불필요한 리렌더링 확인 (React DevTools)
- [ ] React.memo 적절히 사용
- [ ] 상태를 필요한 컴포넌트에만 배치

### 번들 크기

- [ ] 코드 스플리팅 적용
- [ ] 트리 쉐이킹 확인
- [ ] 번들 분석 (webpack-bundle-analyzer)

### 데이터

- [ ] 대량 리스트 가상화
- [ ] API 응답 캐싱 (React Query)
- [ ] 디바운스/쓰로틀 적용

### 에셋

- [ ] 이미지 lazy loading
- [ ] 적절한 이미지 포맷 (WebP)
- [ ] 폰트 최적화

---

## 주의사항

- ⚠️ 과도한 전역 상태 → 로컬 상태로 충분한지 확인
- ⚠️ 불필요한 메모이제이션 → 오히려 성능 저하
- ⚠️ Props Drilling 3단계 이하면 그냥 전달해도 됨
- ⚠️ 상태 라이브러리 과다 사용 금지

## 참고 자료

- [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) - stale 처리, `gcTime` 5분, 재조회 시점, 재시도 3회, 구조적 공유
- [React: useContext](https://react.dev/reference/react/useContext) - `Object.is` 비교, 모든 소비자 리렌더링, 객체 리터럴 `value`와 `useMemo`/`useCallback`
- [Zustand: Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow) - selector 결과 비교(`Object.is`), `useShallow`
- [Angular: Signals](https://angular.dev/guide/signals) - signal 정의, computed의 lazy·memoized 특성, effect

확인일: 2026-10-22 (React Query 기본값, Context 리렌더링 규칙, Zustand selector 비교와 `zustand/react/shallow` import 경로(zustand 5.0.16 패키지로 확인), Angular signals 정의. 상태 판단 순서·파생 상태·단방향 흐름은 일반 개념, Redux Toolkit의 불변 업데이트 내부 동작과 각 라이브러리의 현재 API·버전은 미확인)
