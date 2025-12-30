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
  const { count, increase } = useStore();
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

### 2. Signals (Angular 16+) ⭐

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
