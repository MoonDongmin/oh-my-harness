# Backend Detection Protocol

`harness-be` Phase 1에서 사용하는 감지 프로토콜. 프로젝트 루트를 스캔해 구조화된 감지 객체를 산출한다.

> **원칙**: 증거 기반. 의존성 이름만 보고 판단하지 않는다. 아키텍처 스타일은 디렉토리 구조 + 파일 네이밍 + import 패턴 3가지 근거가 모두 일치해야 확정된다.

---

## 1. 감지 대상 필드

| 필드 | 가능한 값 | 기본값 |
|---|---|---|
| `language` | `typescript`, `javascript`, `python`, `java`, `kotlin`, `go`, `rust`, `ruby`, `php`, `unknown` | `unknown` |
| `framework` | `nestjs`, `express`, `fastify`, `koa`, `hono`, `fastapi`, `flask`, `django`, `spring-boot`, `micronaut`, `quarkus`, `gin`, `echo`, `fiber`, `rails`, `laravel`, `unknown` | `unknown` |
| `architecture_style` | `hexagonal`, `clean`, `layered`, `mvc`, `modular-monolith`, `feature-sliced`, `simple`, `unknown` | `unknown` |
| `data_layer` | `prisma`, `typeorm`, `drizzle`, `sequelize`, `mikro-orm`, `sqlalchemy`, `gorm`, `hibernate`, `raw-sql`, `none` | `none` |
| `api_style` | `rest`, `graphql`, `grpc`, `trpc`, `hybrid`, `none` | `none` |
| `test_stack` | `jest`, `vitest`, `mocha`, `pytest`, `go-test`, `junit`, `rspec`, `none` | `none` |
| `infra` | `[docker, k8s, terraform, github-actions, gitlab-ci, circleci, ...]` | `[]` |
| `module_pattern` | 실제 발견된 파일 네이밍 패턴 문자열 | `""` |
| `existing_modules` | 감지된 모듈 이름 배열 | `[]` |
| `domain_terms` | 반복 등장하는 도메인 용어 배열 | `[]` |
| `notable_files` | 엔트리포인트 상위 3개 | `[]` |
| `test_source_ratio` | 테스트 파일 수 / 소스 파일 수 | `0.0` |

---

## 2. 감지 순서

```
Step 1: Language + Manifest  (Bash ls + Read)
Step 2: Framework            (Read manifest deps + 설정 파일 존재 확인)
Step 3: Data layer           (Read manifest deps + 마이그레이션 디렉토리)
Step 4: API style            (Glob 컨트롤러/라우터/스키마 파일)
Step 5: Test stack           (Read devDeps + Glob 테스트 파일)
Step 6: Infrastructure tags  (Glob Dockerfile/k8s/terraform/ci)
Step 7: Module pattern + domain terms  (Bash ls depth 3 + 반복 구조 분석)
Step 8: Architecture style   (최종 - 위 모든 증거를 종합해 판정)
Step 9: Notable files        (가장 많이 import되는 상위 3개 파일)
Step 10: Test-to-source ratio
```

Step 8(architecture_style)은 반드시 마지막. 앞선 증거가 모두 모여야 판정이 안정적이다.

---

## 3. 영역별 감지 방법

### Step 1 — Language

| 시그널 | 언어 |
|---|---|
| `package.json` + `tsconfig.json` | `typescript` |
| `package.json` only | `javascript` |
| `pyproject.toml` / `requirements.txt` / `setup.py` | `python` |
| `pom.xml` / `build.gradle` / `build.gradle.kts` | `java` or `kotlin` (build.gradle.kts면 kotlin) |
| `go.mod` | `go` |
| `Cargo.toml` | `rust` |
| `Gemfile` | `ruby` |
| `composer.json` | `php` |

여러 개가 동시에 존재하면 **소스 파일 수가 가장 많은 언어**를 우세로 선택.

### Step 2 — Framework

**TypeScript/JavaScript:**

| dep (package.json) | framework |
|---|---|
| `@nestjs/core` | `nestjs` |
| `express` (단독) | `express` |
| `fastify` | `fastify` |
| `koa` | `koa` |
| `hono` | `hono` |

**Python:**

| dep (pyproject.toml / requirements.txt) | framework |
|---|---|
| `fastapi` | `fastapi` |
| `flask` | `flask` |
| `django` | `django` |

**Java/Kotlin:**

| 시그널 | framework |
|---|---|
| `spring-boot-starter-*` in build file | `spring-boot` |
| `io.micronaut.*` | `micronaut` |
| `io.quarkus.*` | `quarkus` |

**Go:**

| import | framework |
|---|---|
| `github.com/gin-gonic/gin` | `gin` |
| `github.com/labstack/echo` | `echo` |
| `github.com/gofiber/fiber` | `fiber` |

**Ruby/PHP:**

| 시그널 | framework |
|---|---|
| `gem 'rails'` in Gemfile | `rails` |
| `laravel/framework` in composer | `laravel` |

매칭 없으면 `unknown`.

### Step 3 — Data layer

| 시그널 | data_layer |
|---|---|
| `prisma` dep + `prisma/schema.prisma` | `prisma` |
| `typeorm` dep + `ormconfig.*` 또는 `@Entity` import | `typeorm` |
| `drizzle-orm` dep + `drizzle.config.*` | `drizzle` |
| `sequelize` dep | `sequelize` |
| `@mikro-orm/*` dep | `mikro-orm` |
| `sqlalchemy` in pyproject | `sqlalchemy` |
| `gorm.io/gorm` in go.mod | `gorm` |
| Spring Boot + `spring-boot-starter-data-jpa` | `hibernate` |
| DB 드라이버(`pg`, `mysql2`, `sqlite3`)만 있고 ORM 없음 | `raw-sql` |
| 위 어느 것도 없음 | `none` |

### Step 4 — API style

| 시그널 | api_style |
|---|---|
| `*.controller.*` 파일 ≥ 3 OR 라우터 파일 (`routes.*`, `router.*`) ≥ 3 | `rest` |
| `schema.graphql` OR `@nestjs/graphql` OR `apollo-server` OR `graphql-yoga` | `graphql` |
| `*.proto` 파일 존재 OR `@grpc/grpc-js` dep | `grpc` |
| `@trpc/server` dep | `trpc` |
| 위 중 2개 이상 | `hybrid` |
| 전혀 없음 | `none` |

### Step 5 — Test stack

| 시그널 | test_stack |
|---|---|
| `jest` in devDeps + `jest.config.*` | `jest` |
| `vitest` in devDeps + `vitest.config.*` | `vitest` |
| `mocha` in devDeps | `mocha` |
| `pytest` in pyproject/requirements | `pytest` |
| Go 프로젝트 + `*_test.go` 파일 존재 | `go-test` |
| Java/Kotlin + `spring-boot-starter-test` OR `junit` | `junit` |
| Ruby + `rspec` | `rspec` |

### Step 6 — Infrastructure tags

단순 존재 확인(Glob) — 결과는 태그 배열로 누적:

| 파일/디렉토리 | 태그 |
|---|---|
| `Dockerfile*` | `docker` |
| `docker-compose*.yml` | `docker-compose` |
| `k8s/**` OR `kubernetes/**` OR `*.yaml` with `apiVersion:` | `k8s` |
| `*.tf` OR `terraform/**` | `terraform` |
| `.github/workflows/**` | `github-actions` |
| `.gitlab-ci.yml` | `gitlab-ci` |
| `.circleci/config.yml` | `circleci` |
| `Makefile` | `makefile` |

### Step 7 — Module pattern + domain terms

`skills/harness/references/project-analysis-protocol.md`의 §3 "반복 모듈 감지"와 "도메인 용어 감지"를 그대로 재사용. 산출물:

- `module_pattern`: 반복되는 파일 구조를 문자열로 표현. 예: `"src/modules/{name}/{name}.controller.ts, .service.ts, .repository.ts, .module.ts"`
- `existing_modules`: 배열. 예: `["user", "order", "payment"]`
- `domain_terms`: 파일/클래스명에서 추출한 명사. 예: `["Order", "OrderItem", "Invoice", "Subscription"]`

**주의**: domain_terms는 에이전트 프롬프트에 주입되므로 **실제로 등장하는 PascalCase 식별자만** 포함한다. 추측하지 않는다.

### Step 8 — Architecture style (마지막에 판정)

판정은 **우선순위 매칭**이다. 위에서부터 아래로 검사하고, 처음 매치된 것을 선택한다.

| 순위 | 스타일 | 판정 근거 (ALL 조건 만족해야 함) |
|---|---|---|
| 1 | `hexagonal` | `domain/` 디렉토리 존재 AND (`ports/` OR `adapters/` OR `infrastructure/`) 존재 AND 최소 3개 파일이 `*.port.*`/`*.adapter.*`/Port/Adapter 네이밍 |
| 2 | `clean` | `usecases/` 또는 `use-cases/` 디렉토리 존재 AND `entities/` 디렉토리 존재 |
| 3 | `modular-monolith` | `src/modules/{name}/` 3개+ 반복 AND 각 모듈 내부가 자체 컨트롤러+서비스+DAO 또는 자체 `domain/` 포함 |
| 4 | `feature-sliced` | `features/` + `entities/` + `shared/` + `widgets/` 중 최소 3개 디렉토리 (FSD 관례) |
| 5 | `layered` | 프로젝트 루트 또는 모듈 내에 `controller/`·`service/`·`repository/` (또는 동등한 이름) 3개가 모두 존재 |
| 6 | `mvc` | 루트에 `models/` + `views/` + `controllers/` (Rails/Laravel 스타일) OR 단일 `models/` + 단일 `controllers/` |
| 7 | `simple` | 위 어느 것도 매칭 안 됨 AND 소스 파일 수 < 30 |
| 8 | `unknown` | 위 어느 것도 매칭 안 됨 AND 소스 파일 수 ≥ 30 |

**주의사항:**
- `framework: nestjs`라고 자동으로 어떤 아키텍처가 되지 않는다. NestJS는 Hexagonal, Modular-monolith, Layered, Simple 모두 가능하다.
- `architecture_style: unknown`이 나오면 Phase 1이 AskUserQuestion을 띄워 사용자에게 직접 묻는다.

### Step 9 — Notable files

가장 많이 import되는 상위 3개 파일을 찾는다. 방법:

1. `Grep("from '([./][^']+)'", glob: "**/*.{ts,js}")` 또는 Python/Go 동등 패턴으로 모든 import를 수집.
2. 횟수 집계해 상위 3개 선택.
3. 추가로 엔트리포인트(`main.ts`, `app.ts`, `index.ts`, `manage.py`, `cmd/.../main.go` 등)도 포함.

### Step 10 — Test-to-source ratio

```
test_source_ratio = count(Glob "**/*.{spec,test}.*" 또는 "test_*.py" 등) / count(Glob 소스 파일)
```

소스 파일은 테스트 파일과 non-source 파일(dist, node_modules, vendor)을 제외한 실제 언어 파일.

---

## 4. 애매한 경우 사용자 확인

다음 상황에서는 AskUserQuestion으로 사용자에게 확인한다:

1. **architecture_style == unknown** 이고 소스 파일 ≥ 30 (큰 프로젝트인데 패턴 매칭 실패)
2. **framework 후보가 2개 이상** 동등하게 잡혔을 때 (예: express + fastify 둘 다 dep에 존재)
3. **하나 이상의 매니페스트 파일 존재** 하지만 소스 파일은 거의 없음 (빈 프로젝트 — 새 시작인가 미완성인가?)

질문 예시:
```
이 프로젝트의 주요 아키텍처 스타일은?
[1] Hexagonal (Ports & Adapters)
[2] Clean Architecture (use-cases/entities)
[3] Layered (controller/service/repository)
[4] Modular monolith (자체 완결된 모듈들)
[5] Feature-sliced / FSD
[6] MVC
[7] Simple / 단순 구조
[8] 모르겠음 — 일단 'unknown'으로 두고 진행
```

사용자 선택 시 결과 구조체에 `architecture_style_user_declared: true`를 함께 기록한다. Project_Context 주입 시 "(user-declared)" 주석을 남긴다.

---

## 5. 출력 예시

**NestJS + Hexagonal 프로젝트:**
```yaml
language: typescript
framework: nestjs
architecture_style: hexagonal
data_layer: typeorm
api_style: rest
test_stack: jest
infra: [docker, github-actions]
module_pattern: "src/modules/{name}/{domain,application,adapters}/..."
existing_modules: [auth, user, order, payment]
domain_terms: [User, Order, OrderItem, Payment, PaymentMethod]
notable_files: [src/main.ts, src/app.module.ts, src/modules/user/user.module.ts]
test_source_ratio: 0.38
```

**Fastify + Layered 프로젝트:**
```yaml
language: typescript
framework: fastify
architecture_style: layered
data_layer: prisma
api_style: rest
test_stack: vitest
infra: [docker]
module_pattern: "src/{controllers,services,repositories}/*.ts"
existing_modules: []  # 모듈 구조 아님
domain_terms: [User, Article, Comment]
notable_files: [src/app.ts, src/server.ts, src/routes/index.ts]
test_source_ratio: 0.22
```

**FastAPI + Clean 프로젝트:**
```yaml
language: python
framework: fastapi
architecture_style: clean
data_layer: sqlalchemy
api_style: rest
test_stack: pytest
infra: [docker, k8s]
module_pattern: "app/{entities,use_cases,interface_adapters,frameworks}/..."
existing_modules: [user, product, order]
domain_terms: [User, Product, Order]
notable_files: [app/main.py, app/use_cases/create_order.py, app/entities/order.py]
test_source_ratio: 0.51
```

이 구조체가 Phase 3의 Project_Context 주입에 그대로 사용된다.
