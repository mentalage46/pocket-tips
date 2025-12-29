# TypeScript Tips

## 타입 가드 (Type Guard)

> 런타임에 타입을 좁히는 기법

### typeof

```typescript
function process(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // string으로 좁혀짐
  }
  return value.toFixed(2); // number
}
```

### instanceof

```typescript
class Dog {
  bark() {}
}
class Cat {
  meow() {}
}

function speak(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark();
  } else {
    animal.meow();
  }
}
```

### in 연산자

```typescript
interface Bird {
  fly(): void;
}
interface Fish {
  swim(): void;
}

function move(animal: Bird | Fish) {
  if ("fly" in animal) {
    animal.fly();
  } else {
    animal.swim();
  }
}
```

### 커스텀 타입 가드 ⭐

```typescript
interface User {
  type: "user";
  name: string;
}
interface Admin {
  type: "admin";
  permissions: string[];
}

// 타입 가드 함수
function isAdmin(person: User | Admin): person is Admin {
  return person.type === "admin";
}

function greet(person: User | Admin) {
  if (isAdmin(person)) {
    console.log(`Admin with ${person.permissions.length} permissions`);
  } else {
    console.log(`Hello, ${person.name}`);
  }
}
```

### Discriminated Union

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rectangle"; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

---

## 유틸리티 타입

### Partial<T>

모든 속성을 선택적으로

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// 모든 필드 optional
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string }

// 업데이트 함수에서 유용
function updateUser(id: number, updates: Partial<User>) {
  // ...
}
updateUser(1, { name: "New Name" }); // OK
```

### Required<T>

모든 속성을 필수로

```typescript
type RequiredUser = Required<PartialUser>;
```

### Pick<T, K>

특정 속성만 선택

```typescript
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string }
```

### Omit<T, K>

특정 속성 제외

```typescript
type UserWithoutEmail = Omit<User, "email">;
// { id: number; name: string }
```

### Record<K, V>

키-값 매핑 타입

```typescript
type UserRoles = Record<string, "admin" | "user" | "guest">;

const roles: UserRoles = {
  alice: "admin",
  bob: "user",
};
```

### Readonly<T>

모든 속성 읽기 전용

```typescript
type ReadonlyUser = Readonly<User>;

const user: ReadonlyUser = { id: 1, name: "John", email: "a@b.com" };
user.name = "Jane"; // Error!
```

### ReturnType<T>

함수 반환 타입 추출

```typescript
function getUser() {
  return { id: 1, name: "John" };
}

type User = ReturnType<typeof getUser>;
// { id: number; name: string }
```

### Parameters<T>

함수 파라미터 타입 추출

```typescript
function createUser(name: string, age: number) {}

type CreateUserParams = Parameters<typeof createUser>;
// [string, number]
```

### NonNullable<T>

null, undefined 제거

```typescript
type MaybeString = string | null | undefined;
type DefinitelyString = NonNullable<MaybeString>;
// string
```

---

## 고급 타입

### 조건부 타입 (Conditional Types)

```typescript
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // 'yes'
type B = IsString<number>; // 'no'
```

### infer

```typescript
// 배열 요소 타입 추출
type ElementOf<T> = T extends (infer E)[] ? E : never;

type Nums = ElementOf<number[]>; // number

// Promise 내부 타입 추출
type Awaited<T> = T extends Promise<infer U> ? U : T;

type Result = Awaited<Promise<string>>; // string
```

### 템플릿 리터럴 타입

```typescript
type Color = "red" | "blue" | "green";
type Size = "sm" | "md" | "lg";

type ButtonVariant = `${Size}-${Color}`;
// 'sm-red' | 'sm-blue' | 'sm-green' | 'md-red' | ...

type EventName = `on${Capitalize<"click" | "focus" | "blur">}`;
// 'onClick' | 'onFocus' | 'onBlur'
```

### Mapped Types

```typescript
// 모든 속성을 getter로 변환
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

---

## 실전 패턴

### API 응답 타입

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function fetchUser(id: number): Promise<ApiResponse<User>> {
  try {
    const user = await api.get(`/users/${id}`);
    return { success: true, data: user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

### 객체 키 타입 안전하게 사용

```typescript
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
} as const;

type ConfigKey = keyof typeof config;

function getConfig(key: ConfigKey) {
  return config[key];
}
```

### Branded Types

```typescript
type UserId = number & { readonly brand: unique symbol };
type OrderId = number & { readonly brand: unique symbol };

function createUserId(id: number): UserId {
  return id as UserId;
}

function getUser(id: UserId) {}
function getOrder(id: OrderId) {}

const userId = createUserId(123);
getUser(userId); // OK
getOrder(userId); // Error! 타입이 다름
```

---

## 🎯 TypeScript 체크리스트

### 기본

- [ ] strict 모드 활성화
- [ ] any 사용 최소화
- [ ] unknown 우선 사용 (any 대신)

### 타입 정의

- [ ] interface vs type 일관되게 사용
- [ ] 유틸리티 타입 활용
- [ ] 타입 가드로 런타임 안전성

### 고급

- [ ] Discriminated Union 활용
- [ ] 제네릭으로 재사용성
- [ ] as const로 리터럴 타입

---

## 팁

```typescript
// ✅ null 체크
const value = obj?.prop ?? "default";

// ✅ 타입 단언보다 타입 가드
// ❌ (value as string).toUpperCase()
// ✅ typeof value === 'string' && value.toUpperCase()

// ✅ satisfies (TypeScript 4.9+)
const config = {
  apiUrl: "https://api.example.com",
} satisfies Record<string, string>;
// config.apiUrl은 string이 아닌 'https://...' 리터럴 타입 유지
```
