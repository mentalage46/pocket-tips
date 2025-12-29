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

## 🎯 상태 관리 선택 체크리스트

**Context API 선택**

- [ ] 단순한 전역 상태 (테마, 언어)
- [ ] 상태 변경 빈도 낮음
- [ ] 추가 라이브러리 없이 해결

**Zustand 선택**

- [ ] 간단한 API 선호
- [ ] 보일러플레이트 최소화
- [ ] 중소규모 프로젝트

**Redux Toolkit 선택**

- [ ] 대규모 프로젝트
- [ ] 복잡한 상태 로직
- [ ] DevTools, 미들웨어 필요
- [ ] 팀이 이미 Redux 숙련

**React Query 선택**

- [ ] 서버 상태 관리 (API 캐시)
- [ ] 자동 리페칭 필요
- [ ] 로딩/에러 상태 관리

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
