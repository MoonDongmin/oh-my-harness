# Backend Detection Protocol

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

Detection protocol used by `harness-be` Phase 1. Scans the project root and produces a structured detection object.

> **Principle**: Evidence-based. Do not judge by dependency names alone. An architecture style is only confirmed when all three sources of evidence — directory layout, file naming, and import patterns — agree.

---

## 1. Detection fields

| Field | Possible values | Default |
|---|---|---|
| `language` | `typescript`, `javascript`, `python`, `java`, `kotlin`, `go`, `rust`, `ruby`, `php`, `unknown` | `unknown` |
| `framework` | `nestjs`, `express`, `fastify`, `koa`, `hono`, `fastapi`, `flask`, `django`, `spring-boot`, `micronaut`, `quarkus`, `gin`, `echo`, `fiber`, `rails`, `laravel`, `unknown` | `unknown` |
| `architecture_style` | `hexagonal`, `clean`, `layered`, `mvc`, `modular-monolith`, `feature-sliced`, `simple`, `unknown` | `unknown` |
| `data_layer` | `prisma`, `typeorm`, `drizzle`, `sequelize`, `mikro-orm`, `sqlalchemy`, `gorm`, `hibernate`, `raw-sql`, `none` | `none` |
| `api_style` | `rest`, `graphql`, `grpc`, `trpc`, `hybrid`, `none` | `none` |
| `test_stack` | `jest`, `vitest`, `mocha`, `pytest`, `go-test`, `junit`, `rspec`, `none` | `none` |
| `infra` | `[docker, k8s, terraform, github-actions, gitlab-ci, circleci, ...]` | `[]` |
| `module_pattern` | String describing the actual file naming pattern observed | `""` |
| `existing_modules` | Array of detected module names | `[]` |
| `domain_terms` | Array of recurring domain terms | `[]` |
| `notable_files` | Top 3 entry-point files | `[]` |
| `test_source_ratio` | Number of test files / number of source files | `0.0` |

---

## 2. Detection order

```
Step 1: Language + Manifest  (Bash ls + Read)
Step 2: Framework            (Read manifest deps + check config files)
Step 3: Data layer           (Read manifest deps + migration directory)
Step 4: API style            (Glob controller/router/schema files)
Step 5: Test stack           (Read devDeps + Glob test files)
Step 6: Infrastructure tags  (Glob Dockerfile/k8s/terraform/ci)
Step 7: Module pattern + domain terms  (Bash ls depth 3 + recurring-structure analysis)
Step 8: Architecture style   (final — synthesize all preceding evidence)
Step 9: Notable files        (top 3 most-imported files)
Step 10: Test-to-source ratio
```

Step 8 (`architecture_style`) must be last. Its judgment is only stable after every other piece of evidence has been gathered.

---

## 3. Per-area detection methods

### Step 1 — Language

| Signal | Language |
|---|---|
| `package.json` + `tsconfig.json` | `typescript` |
| `package.json` only | `javascript` |
| `pyproject.toml` / `requirements.txt` / `setup.py` | `python` |
| `pom.xml` / `build.gradle` / `build.gradle.kts` | `java` or `kotlin` (kotlin if `build.gradle.kts`) |
| `go.mod` | `go` |
| `Cargo.toml` | `rust` |
| `Gemfile` | `ruby` |
| `composer.json` | `php` |

If multiple manifests coexist, choose the language with **the most source files** as dominant.

### Step 2 — Framework

**TypeScript/JavaScript:**

| dep (package.json) | framework |
|---|---|
| `@nestjs/core` | `nestjs` |
| `express` (alone) | `express` |
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

| Signal | framework |
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

| Signal | framework |
|---|---|
| `gem 'rails'` in Gemfile | `rails` |
| `laravel/framework` in composer | `laravel` |

If nothing matches, `unknown`.

### Step 3 — Data layer

| Signal | data_layer |
|---|---|
| `prisma` dep + `prisma/schema.prisma` | `prisma` |
| `typeorm` dep + `ormconfig.*` or `@Entity` import | `typeorm` |
| `drizzle-orm` dep + `drizzle.config.*` | `drizzle` |
| `sequelize` dep | `sequelize` |
| `@mikro-orm/*` dep | `mikro-orm` |
| `sqlalchemy` in pyproject | `sqlalchemy` |
| `gorm.io/gorm` in go.mod | `gorm` |
| Spring Boot + `spring-boot-starter-data-jpa` | `hibernate` |
| Only DB drivers (`pg`, `mysql2`, `sqlite3`) and no ORM | `raw-sql` |
| None of the above | `none` |

### Step 4 — API style

| Signal | api_style |
|---|---|
| `*.controller.*` files ≥ 3 OR router files (`routes.*`, `router.*`) ≥ 3 | `rest` |
| `schema.graphql` OR `@nestjs/graphql` OR `apollo-server` OR `graphql-yoga` | `graphql` |
| `*.proto` files present OR `@grpc/grpc-js` dep | `grpc` |
| `@trpc/server` dep | `trpc` |
| Two or more of the above | `hybrid` |
| None at all | `none` |

### Step 5 — Test stack

| Signal | test_stack |
|---|---|
| `jest` in devDeps + `jest.config.*` | `jest` |
| `vitest` in devDeps + `vitest.config.*` | `vitest` |
| `mocha` in devDeps | `mocha` |
| `pytest` in pyproject/requirements | `pytest` |
| Go project + `*_test.go` files present | `go-test` |
| Java/Kotlin + `spring-boot-starter-test` OR `junit` | `junit` |
| Ruby + `rspec` | `rspec` |

### Step 6 — Infrastructure tags

Simple existence checks (Glob) — accumulate results into a tag array:

| File/directory | Tag |
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

Reuse §3 "Repeated module detection" and "Domain term detection" from `skills/harness/references/project-analysis-protocol.md` verbatim. Outputs:

- `module_pattern`: a string describing the recurring file structure. Example: `"src/modules/{name}/{name}.controller.ts, .service.ts, .repository.ts, .module.ts"`
- `existing_modules`: array. Example: `["user", "order", "payment"]`
- `domain_terms`: nouns extracted from file/class names. Example: `["Order", "OrderItem", "Invoice", "Subscription"]`

**Important**: `domain_terms` is injected into agent prompts, so include **only PascalCase identifiers that actually appear**. Do not guess.

### Step 8 — Architecture style (judged last)

Judgment is **priority matching**. Check from top to bottom, and pick the first match.

| Priority | Style | Decision criteria (ALL must hold) |
|---|---|---|
| 1 | `hexagonal` | `domain/` directory exists AND (`ports/` OR `adapters/` OR `infrastructure/`) exists AND at least 3 files use `*.port.*`/`*.adapter.*`/Port/Adapter naming |
| 2 | `clean` | `usecases/` or `use-cases/` directory exists AND `entities/` directory exists |
| 3 | `modular-monolith` | `src/modules/{name}/` repeats 3+ times AND each module contains its own controller+service+DAO or its own `domain/` |
| 4 | `feature-sliced` | At least 3 of `features/` + `entities/` + `shared/` + `widgets/` (FSD convention) |
| 5 | `layered` | Project root or modules contain all three of `controller/`·`service/`·`repository/` (or equivalents) |
| 6 | `mvc` | Root has `models/` + `views/` + `controllers/` (Rails/Laravel style) OR a single `models/` + single `controllers/` |
| 7 | `simple` | None of the above match AND source file count < 30 |
| 8 | `unknown` | None of the above match AND source file count ≥ 30 |

**Notes:**
- `framework: nestjs` does not automatically imply any architecture. NestJS can be Hexagonal, Modular-monolith, Layered, or Simple.
- If `architecture_style: unknown` is produced, Phase 1 raises an AskUserQuestion and asks the user directly.

### Step 9 — Notable files

Find the top 3 most-imported files. Method:

1. `Grep("from '([./][^']+)'", glob: "**/*.{ts,js}")` or the Python/Go equivalent to collect every import.
2. Tally counts and pick the top 3.
3. Also include entry points (`main.ts`, `app.ts`, `index.ts`, `manage.py`, `cmd/.../main.go`, etc.).

### Step 10 — Test-to-source ratio

```
test_source_ratio = count(Glob "**/*.{spec,test}.*" or "test_*.py" etc.) / count(Glob source files)
```

Source files are actual language files, excluding test files and non-source files (dist, node_modules, vendor).

---

## 4. Asking the user when ambiguous

Use AskUserQuestion in the following situations:

1. **`architecture_style == unknown`** AND source files ≥ 30 (large project but pattern matching failed)
2. **Two or more framework candidates** tied (e.g., both `express` and `fastify` in deps)
3. **At least one manifest file exists** but barely any source files (empty project — fresh start or incomplete?)

Example question:

<!-- user-facing (Korean, do not translate) -->
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
<!-- /user-facing -->

When the user picks an answer, also record `architecture_style_user_declared: true` in the result struct. When injecting the Project_Context, leave a "(user-declared)" annotation.

---

## 5. Output examples

**NestJS + Hexagonal project:**
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

**Fastify + Layered project:**
```yaml
language: typescript
framework: fastify
architecture_style: layered
data_layer: prisma
api_style: rest
test_stack: vitest
infra: [docker]
module_pattern: "src/{controllers,services,repositories}/*.ts"
existing_modules: []  # not a module structure
domain_terms: [User, Article, Comment]
notable_files: [src/app.ts, src/server.ts, src/routes/index.ts]
test_source_ratio: 0.22
```

**FastAPI + Clean project:**
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

This struct is fed directly into Phase 3's Project_Context injection.
