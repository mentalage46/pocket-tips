# TypeScript Tips

## 개념: TypeScript가 보장하는 것과 보장하지 않는 것

TypeScript는 **컴파일할 때 코드의 모순을 찾아 주는 정적 검사기**입니다. 검사가 끝나면 타입은 지워지고(타입 소거) 일반 JavaScript만 실행됩니다. 이 한 가지를 이해하면 아래 규칙이 모두 설명됩니다.

### 1. 타입은 런타임에 존재하지 않는다

```typescript
interface User { id: number; name: string }

const u = JSON.parse('{"id":"abc"}') as User; // JSON.parse는 any를 반환
const id: number = u.id;                       // 컴파일 통과, 실제 값은 "abc"
```

- **API 응답, `JSON.parse`, 폼 입력, `localStorage`** 같은 외부 데이터는 타입이 "맞다고 선언"했을 뿐 검증된 것이 아닙니다.
- 경계(네트워크, 저장소, 사용자 입력)에서는 **런타임 검증**(스키마 검증 라이브러리, 직접 작성한 타입 가드)을 하고, 통과한 뒤에야 타입을 믿습니다.
- `as`(타입 단언)는 검사가 아니라 **컴파일러에게 "내가 책임진다"고 말하는 것**입니다. 틀려도 컴파일러는 모릅니다.

### 2. 구조적 타이핑: 이름이 아니라 모양으로 호환된다

```typescript
interface Point { x: number; y: number }
const p3 = { x: 1, y: 2, z: 3 };
const p: Point = p3; // OK: x, y가 있으면 호환 (변수로 넘긴 경우 여분의 속성은 허용)
```

- 같은 모양이면 서로 다른 이름의 타입도 대입됩니다. `UserId`와 `OrderId`가 둘 다 `number`면 서로 바꿔 넣어도 오류가 없습니다. 이를 막으려는 것이 아래 [Branded Types](#branded-types)입니다.

### 3. `any`, `unknown`, `never`

| 타입 | 의미 | 쓰는 곳 |
| --- | --- | --- |
| `any` | **검사를 끈다.** 무엇이든 대입, 호출, 접근 가능. 전염됨 | 가능하면 쓰지 않음 |
| `unknown` | 무엇이든 담을 수 있지만 **쓰기 전에 좁혀야** 함 | 외부 입력, `catch (e)` |
| `never` | 값이 존재할 수 없음 | 도달 불가 분기, 철저성 검사 |

### 4. 철저성 검사(exhaustiveness): 새 케이스를 빠뜨리면 컴파일 오류

```typescript
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; s: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.s ** 2;
    default: {
      const _exhaustive: never = s; // 모든 경우를 처리했다면 s는 never
      return _exhaustive;
    }
  }
}
// Shape에 { kind: "tri"; b: number }를 추가하면
// _exhaustive 줄에서 "'{ kind: "tri" ... }' is not assignable to type 'never'" 오류 → 처리 누락을 찾아 줌
```

[Discriminated Union](#discriminated-union)과 함께 쓰는 가장 실용적인 패턴입니다.

### 5. `strict`는 무엇을 켜는가

`strict`는 엄격한 검사 묶음을 한 번에 켭니다.

| 플래그 | 막아 주는 것 |
| --- | --- |
| `noImplicitAny` | 타입을 추론하지 못해 조용히 `any`가 되는 경우 |
| `strictNullChecks` | `null`/`undefined`를 값처럼 쓰는 실수 (`o.a`에서 `o`가 undefined일 수 있음) |
| `strictFunctionTypes` | 함수 매개변수 타입의 잘못된 호환 |
| `strictPropertyInitialization` | 클래스 속성을 생성자에서 초기화하지 않은 경우 |
| `useUnknownInCatchVariables` | `catch (e)`의 `e`를 `any` 대신 `unknown`으로 |
| `noImplicitThis`, `strictBindCallApply`, `alwaysStrict`, `strictBuiltinIteratorReturn` | 그 밖의 엄격 검사 |

- 공식 문서는 `strict`의 기본값을 `true`로 표기하며, 새 버전에서 엄격 검사가 추가될 수 있어 **업그레이드 시 새 오류가 생길 수 있다**고 경고합니다. TypeScript 7.0.2에서 `tsconfig` 없이 컴파일해도 암묵적 `any`와 `null` 대입이 오류로 잡히는 것을 확인했습니다.
- **기존 프로젝트는 `tsconfig.json`에 `"strict": true`를 명시**해 두는 편이 안전합니다(오래된 버전은 기본값이 `false`였음. 바뀐 버전은 미확인).
- 이미 느슨한 코드베이스는 `strict`를 한 번에 켜지 말고 `strictNullChecks`처럼 플래그 하나씩 켜 가며 오류를 줄입니다.

### 6. `interface` vs `type`

| | `interface` | `type` |
| --- | --- | --- |
| 객체 모양 | 가능 | 가능 |
| 유니언·조건부·매핑 타입 | 불가 | 가능 |
| 같은 이름 재선언(병합) | 가능 | 불가 |

객체 모양은 둘 중 하나를 프로젝트 안에서 **일관되게** 쓰면 충분합니다. 유니언이나 유틸리티 타입 조합이 필요하면 `type`입니다.

---

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

// Promise 내부 타입 추출 (내장 Awaited<T>가 이미 있음. 아래는 원리를 보여 주는 단순화 버전)
type MyAwaited<T> = T extends Promise<infer U> ? U : T;

type Result = MyAwaited<Promise<string>>; // string
// 내장 Awaited는 Promise<Promise<string>>도 string으로 풀지만, 위 단순화 버전은 Promise<string>이 됨
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

## Angular 특화 패턴

### Dependency Injection 타입

```typescript
import { InjectionToken } from "@angular/core";

// 인터페이스 토큰
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export const API_CONFIG = new InjectionToken<ApiConfig>("api.config");

// Provider
providers: [
  { provide: API_CONFIG, useValue: { baseUrl: "/api", timeout: 5000 } },
];

// 사용
export class ApiService {
  constructor(@Inject(API_CONFIG) private config: ApiConfig) {}
}
```

### RxJS 타입 안전성

```typescript
import { Observable } from "rxjs";
import { map, filter } from "rxjs/operators";

// 타입 추론 강화
function getUsers(): Observable<User[]> {
  return this.http.get<User[]>("/api/users");
}

// 타입 가드와 함께
function isActiveUser(user: User): user is ActiveUser {
  return user.status === "active";
}

getUsers().pipe(
  map((users) => users.filter(isActiveUser)), // ActiveUser[]
  map((activeUsers) => activeUsers[0].permissions) // TypeScript가 타입 알고 있음
);
```

### Signal 타입

```typescript
import { signal, computed, Signal } from "@angular/core";

interface User {
  id: number;
  name: string;
  role: "admin" | "user";
}

export class UserStore {
  // WritableSignal<User | null>
  private user = signal<User | null>(null);

  // Signal<User | null> (읽기 전용)
  readonly currentUser: Signal<User | null> = this.user.asReadonly();

  // Signal<boolean>
  readonly isAdmin = computed(() => this.user()?.role === "admin");

  setUser(user: User) {
    this.user.set(user);
  }
}
```

### Form 타입 (Typed Forms)

```typescript
import { FormControl, FormGroup } from "@angular/forms";

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

export class LoginComponent {
  // 타입 안전한 폼
  loginForm = new FormGroup<LoginForm>({
    email: new FormControl("", { nonNullable: true }),
    password: new FormControl("", { nonNullable: true }),
    rememberMe: new FormControl(false, { nonNullable: true }),
  });

  onSubmit() {
    // value가 정확한 타입을 가짐
    const { email, password, rememberMe } = this.loginForm.value;
    // email: string, password: string, rememberMe: boolean
  }
}
```

### Component Input/Output 타입

```typescript
import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "app-user-card",
  template: `...`,
})
export class UserCardComponent {
  // 타입 안전한 Input
  @Input({ required: true }) user!: User;
  @Input() editable: boolean = false;

  // 타입 안전한 Output
  @Output() userDeleted = new EventEmitter<number>(); // User ID
  @Output() userUpdated = new EventEmitter<User>();

  deleteUser() {
    this.userDeleted.emit(this.user.id); // number만 가능
  }
}

// 사용
@Component({
  template: `
    <app-user-card
      [user]="currentUser"
      (userDeleted)="handleDelete($event)"
      (userUpdated)="handleUpdate($event)"
    >
    </app-user-card>
  `,
})
export class ParentComponent {
  handleDelete(userId: number) {} // 타입이 명확
  handleUpdate(user: User) {}
}
```

### Directive 타입

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef } from "@angular/core";

@Directive({
  selector: "[appRepeat]",
})
export class RepeatDirective<T> {
  @Input() set appRepeat(items: T[]) {
    this.viewContainer.clear();
    items.forEach((item) => {
      this.viewContainer.createEmbeddedView(this.templateRef, {
        $implicit: item,
        index: items.indexOf(item),
      });
    });
  }

  constructor(
    private templateRef: TemplateRef<{ $implicit: T; index: number }>,
    private viewContainer: ViewContainerRef
  ) {}
}

// 사용 (타입 추론됨)
@Component({
  template: `
    <div *appRepeat="let user of users; let i = index">
      {{ i }}: {{ user.name }}
    </div>
  `,
})
export class UsersComponent {
  users: User[] = [];
}
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

// ✅ satisfies (TypeScript 4.9+): 타입을 "검사"하되 추론된 타입은 유지
const config = {
  mode: "dev",
} satisfies Record<string, "dev" | "prod">;
// config.mode의 타입은 "dev" (리터럴 유지). 제약이 Record<string, string>이면 string으로 넓혀짐
// 오타·잘못된 값(mode: "stg")은 컴파일 오류
```

## 참고 자료

- [TypeScript TSConfig Reference: strict](https://www.typescriptlang.org/tsconfig/#strict) - `strict`가 켜는 플래그 목록, 기본값 `true`, 업그레이드 시 새 오류 경고

확인일: 2026-10-22 (`strict` 플래그 목록·기본값은 공식 문서, 위 개념 섹션의 모든 코드 예시와 `satisfies`·`Awaited` 동작은 TypeScript 7.0.2 `tsc`로 컴파일해 확인. `interface`/`type` 비교, 타입 소거·구조적 타이핑 설명은 일반 개념. 아래 Angular 섹션 예시는 미확인)
