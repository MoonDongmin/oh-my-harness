# Backend Prompt Injection Guide

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

Rules for `harness-be` Phase 3, where detection results are injected into agent prompts. The goal is "do not pre-write backend-specific appendices; inject only the actual facts that were detected."

---

## 1. Injection point

The neutralized base agent file (`${CLAUDE_PLUGIN_ROOT}/agents/{name}.md`) is wrapped in an `<Agent_Prompt>` XML block. Injection adds a `<Project_Context>` section **immediately before the closing `</Agent_Prompt>` tag**.

```xml
<Agent_Prompt>
  <Role>...</Role>
  <Why_This_Matters>...</Why_This_Matters>
  <Success_Criteria>...</Success_Criteria>
  <Constraints>...</Constraints>
  <Investigation_Protocol>...</Investigation_Protocol>
  ...
  <Project_Context>
    <!-- HERE: the area harness-be inserts -->
  </Project_Context>
</Agent_Prompt>
```

The base prompt's `<Role>` already contains a marker that says "If a `<Project_Context>` block appears below, its contents are authoritative", so the injected context overrides any general assumption.

---

## 2. Common field serialization

Record the Phase 1 detection object in the following format inside `<Project_Context>`. All six core agents receive the same common fields.

```xml
<Project_Context>
  <!-- injected by harness-be at {date} — authoritative -->
  Skill: harness-be
  Language: {language}
  Framework: {framework} {optional version}
  Architecture style: {architecture_style}{" (user-declared)" if declared by user}
  Data layer: {data_layer}
  API style: {api_style}
  Test stack: {test_stack}
  Infrastructure: {infra.join(", ")}

  Repeated module pattern: {module_pattern}
  Existing modules: {existing_modules.join(", ")}
  Key domain terms: {domain_terms.join(", ")}
  Notable files: {notable_files.join(", ")}
  Test-to-source ratio: {test_source_ratio}
</Project_Context>
```

If a value is `none`/`unknown`/`[]`, record it as-is — do not hide a detection failure. A field marked `unknown` is the signal that tells the agent to investigate that area itself.

---

## 3. Per-agent additional injection

Beyond the common fields, each agent needs extra context. Append it after the common block as an `### {agent-name} specifics` section.

### architect

```xml
<Project_Context>
  {common fields}

  ### architect specifics
  Analytical lens for this project: {architecture_style}
  - hexagonal  → domain purity, port definitions, adapter isolation, aggregate boundaries
  - clean       → entity/use-case/interface-adapter layer direction, business rule purity
  - layered     → controller→service→repository direction, layer cohesion, no inverted deps
  - modular-monolith → module boundary enforcement, module-owned persistence, no cross-module internals
  - mvc         → model ownership, view purity, controller routing hygiene
  - simple/unknown → describe what is actually present; do not force a label

  When analyzing, cite file:line evidence from the detected modules: {existing_modules.join(", ")}
</Project_Context>
```

### test-engineer

```xml
<Project_Context>
  {common fields}

  ### test-engineer specifics
  Test runner: {test_stack}
  Existing test pattern (discovered from sampling): {discovered test file pattern, e.g. "src/**/*.spec.ts"}
  Test directory convention: {discovered — e.g., colocated or top-level __tests__}
  Assertion style: {discovered — e.g., expect().toEqual, unittest.TestCase, testify}

  When writing RED-phase tests, mirror the discovered pattern. Do not introduce a new test framework or directory convention.
</Project_Context>
```

Sampling logic: in Phase 1, Read 3 existing test files via `Glob` and extract path pattern, naming, and assertion style.

### executor

```xml
<Project_Context>
  {common fields}

  ### executor specifics
  Build command: {discovered from package.json scripts or Makefile — e.g. "bun run build" or "gradle build"}
  Test command: {discovered — e.g., "bun test", "pytest", "go test ./..."}
  Lint/format: {discovered — e.g., "biome check", "eslint", "ruff"}
  Error-handling convention: {discovered — e.g., "throws HttpException", "returns Result<T, E>", "raises HTTPException"}
  Naming convention: {discovered — e.g., "PascalCase classes, camelCase methods, kebab-case files"}
</Project_Context>
```

In Phase 1, Read `package.json` scripts and 3 files from the largest module to extract idioms.

### code-reviewer

```xml
<Project_Context>
  {common fields}

  ### code-reviewer specifics
  Architecture rules to enforce (based on {architecture_style}):
  - {rules derived from architecture_style — same list as architect lens above}

  Framework-specific anti-patterns to watch for:
  - nestjs    → circular module imports, provider scope leaks, raw SQL in services
  - express   → unhandled promise rejections, middleware order bugs
  - fastify   → missing schema validation, plugin encapsulation leaks
  - fastapi   → sync code in async handlers, missing Pydantic validation
  - django    → N+1 queries via ORM, missing select_related/prefetch_related
  - spring-boot → @Transactional scope misuse, missing DTO layer
  - (etc.)

  Select only the framework row that matches `framework: {framework}`.
</Project_Context>
```

### security-reviewer

```xml
<Project_Context>
  {common fields}

  ### security-reviewer specifics
  Threat model weight (server-side, runtime = {framework}):
  - Injection (SQL, NoSQL, command, template): HIGH
  - Broken access control / authorization: HIGH
  - Sensitive data exposure in responses, logs: HIGH
  - SSRF / request smuggling: MEDIUM-HIGH (elevate if outbound HTTP present)
  - XSS: LOW (only relevant if serving HTML or rendered templates)
  - CSRF: MEDIUM (only if cookie-based auth in use)

  Framework-specific checks:
  - nestjs    → @Guards used on sensitive routes? Pipes for input validation? 
  - express   → helmet installed? rate limiter? CORS configured?
  - fastapi   → pydantic models for all inputs? dependency-injection auth?
  - django    → CSRF middleware active? ORM parameterized queries everywhere?
  - spring-boot → Spring Security config? CSRF token handling? @PreAuthorize?

  Secrets scan targets: .env*, config/*.yml, src/**/config*, deployment manifests
</Project_Context>
```

### debugger

```xml
<Project_Context>
  {common fields}

  ### debugger specifics
  Reproduce via: {discovered — e.g., "curl against the local dev server (port from config)", "pytest -k {test_name}", "go test ./...", "bun run start:dev then HTTP call"}
  Log location: {discovered — e.g., "stdout", "logs/app.log", "docker logs"}
  Debug symbols: {language-specific — e.g., "source maps via tsc", "python -X dev", "go build -gcflags='-N -l'"}
  Common error pattern for {framework}: {framework-specific — e.g., for NestJS "Can't resolve dependencies" means missing provider registration}
</Project_Context>
```

---

## 4. Leader agent injection (tdd-leader, team-leader)

Leaders branch their detailed spawning logic in their own body, so the injection only includes common fields — no per-agent specifics are injected.

```xml
<Project_Context>
  {common fields only — Skill/Language/Framework/Architecture style/Data layer/API style/Test stack}

  ### leader specifics
  Extra agents available in this project: {list of conditional agents from Phase 4}
  Skills available in this project: {list from Phase 5}
</Project_Context>
```

The leader uses this information to decide which specialist to spawn during phases like tdd-red/work-review. In a project generated by harness-be, frontend specialists (ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer) are not in the "Extra agents available" list, so the leader does not spawn them.

---

## 5. Specialist agent injection (domain-expert, api-specialist, data-engineer, etc.)

Specialist agents have no base prompt — harness-be writes the prompt **from scratch**. When doing so, embed at least three actual file paths, module names, or domain terms from the Phase 1 detection result into the prompt body.

**domain-expert example (generated prompt):**

```markdown
---
name: domain-expert
description: "Domain model verification specialist for a {architecture_style} project. Verifies the business-rule integrity of {existing_modules}."
provider: claude
model: claude-opus-4-6
disallowedTools: Write, Edit
---

<Agent_Prompt>
  <Role>
    You are Domain Expert for THIS project.

    Observed architecture: {architecture_style}
    Observed modules (bounded contexts?): {existing_modules.join(", ")}
    Domain term inventory: {domain_terms.join(", ")}

    Key domain files you know about:
    - {notable domain files from Phase 1, e.g. "src/modules/order/domain/order.aggregate.ts"}
    - ...

    Your mission: verify that changes to this project respect the existing domain boundaries, invariants, and vocabulary. Do not use generic DDD theory — use the terms and files this project actually has.
  </Role>

  <Investigation_Protocol>
    1) Read the affected domain files to understand current state.
    2) Check whether any invariant of the listed aggregates is being violated.
    3) Check whether new types respect the existing domain vocabulary (do not introduce synonyms).
    4) Cite file:line evidence for every claim.
  </Investigation_Protocol>

  <Constraints>
    - READ-ONLY.
    - Never invent domain terms — only use those listed above or those discovered by reading the code.
    - Never advise a DDD refactor beyond what the project's current structure supports.
  </Constraints>
</Agent_Prompt>
```

**Key point**: this is not a generic "DDD expert" prompt. The actual module names and domain terms of this project are baked into the prompt, making the agent a specialist for these specific modules. It cannot be copy-pasted into another project — and that is the correct state.

The same principle applies to `api-specialist`, `data-engineer`, `infra-reviewer`, `monorepo-coordinator`, and `qa-agent`.

---

## 6. Handling injection failure

- **Detection is `unknown`**: inject the field as `unknown`. The agent reads the marker as the signal "Project_Context is incomplete — investigate directly".
- **File read failure**: drop the file from `notable_files`. Record the injection failure in CLAUDE.md's harness-fingerprint block as `detection_warnings: [...]`.
- **`architecture_style == unknown` and the user picked "I don't know"**: do not generate Phase 4 conditional agents that depend on `architecture_style` (e.g., domain-expert). Tell the user "Once the architecture style is clearer, re-run `/oh-my-harness:harness-be` to add domain-expert."

---

## 7. Idempotency

When `harness-be` is re-run on the same project:

1. Read the existing CLAUDE.md `<!-- harness-fingerprint v1 -->` block.
2. Re-run Phase 1 detection.
3. Compare the new detection result with the existing fingerprint.
4. If there is no difference: do not rewrite agent files; report "the harness is already up to date".
5. If there is a difference: summarize the diff for the user, get confirmation, then regenerate. Update the block with the new fingerprint.

The same applies to skills: do not re-open the Phase 5 gate. If the user wants to add new candidates, they must make an explicit request such as "add skills".

This principle keeps re-runs safe.

---

## 8. Skill body injection rules

After a candidate passes the Phase 5 gate, when writing the SKILL.md body, follow these rules for which Phase 1 detection fields to embed and how. Same philosophy as agent injection: **embed only actual facts, never generalizations or theory**.

### 8-1. Which fields go where in the body

| Body section | Fields to embed | How to embed |
|----------|---------|---------|
| Description (frontmatter) | `domain_terms`, the trigger keywords chosen at candidate-discovery time | Quote them directly in natural-language sentences. One real path like `"src/modules/{module}/"` plus 2-3 domain terms |
| Project context section | `module_pattern`, `existing_modules`, `notable_files` | A directory tree that copies one existing module verbatim. Pick one of the real modules (e.g., `user`, `order`) for the example |
| Workflow steps | Commands related to `data_layer` and `test_stack` | The actual commands of that ORM/test runner (`bun prisma migrate dev`, `bun test order.spec.ts`) |
| Naming rules | The case conventions extracted in Phase 1 | One real example each for files, classes, and variables |
| Import rules | The first import line of each top-3 file in `notable_files` | Use the alias notation if a tsconfig path alias exists; otherwise relative path |
| Cautions | `domain_terms` + known pitfalls | "In this project, {domain term} means {specific meaning} — do not confuse" |

### 8-2. Do NOT embed

- Quotes from the framework's official documentation (Claude already knows these)
- Generic DDD/Clean/Hex theory (handled by the architect agent)
- "Best practice" generalities
- Abstractions that work in any project

### 8-3. Before / After example

A comparison of the same candidate `order-field-sync` (assume the user selected it at the gate) written two ways.

#### Before (zero context injection — Bad)

```markdown
---
name: order-field-sync
description: "Synchronize related files when adding a new field to the order module."
---

# Order Field Sync

Use this skill when adding a field to the order module.

## Workflow

1. Add the field to the schema.
2. Generate a migration.
3. Update the DTO.
4. Reflect it in the controller.
5. Write a test.
```

**Problems**:
- Description has no trigger keywords and no boundary conditions → weak trigger
- Body has zero real file paths → Claude must browse the directory every time
- "schema" and "DTO" do not specify which ORM/pattern → Claude has to guess
- Copy-pastes into any other NestJS+Prisma project = zero value to this project

#### After (3+ context injections — Good)

<!-- user-facing (Korean, do not translate — this example is intentionally Korean because the skill body ships into the user's project) -->
```markdown
---
name: order-field-sync
description: "src/modules/order/에 새 필드를 추가할 때 prisma schema → migration → CreateOrderDto/UpdateOrderDto → OrderController → order.spec.ts 5곳을 동기화한다. '주문 필드 추가', '주문 마이그레이션', 'add order field', 'order schema change' 요청에 반드시 사용. 단순 조회/디버깅에는 트리거하지 말 것."
---

# Order Field Sync

src/modules/order/에 새 필드 1개를 추가할 때 5곳을 누락 없이 동기화하기 위한 스킬. 기존 user 모듈과 invoice 모듈도 동일 패턴이지만, 이 스킬은 order 전용이다 (다른 모듈은 별도 스킬 없음 — 직접 처리).

## 프로젝트 컨텍스트

기존 order 모듈 구조 (실제):

```
src/modules/order/
├── order.controller.ts        ← @Controller('orders'), CRUD 라우트
├── order.service.ts           ← @Injectable, OrderRepository 주입
├── order.repository.ts        ← Prisma 클라이언트 직접 사용
├── order.module.ts            ← @Module providers/exports
├── dto/
│   ├── create-order.dto.ts    ← class-validator 데코레이터 사용
│   └── update-order.dto.ts    ← PartialType(CreateOrderDto)
└── order.spec.ts              ← jest, OrderService 단위 테스트

prisma/schema.prisma            ← model Order { ... }
prisma/migrations/{timestamp}_*/ ← 각 마이그레이션 디렉토리
```

기존 모듈 패턴 import 규칙 (관찰됨):
- 내부: `import { OrderService } from './order.service'`
- alias: `import { PrismaService } from '@modules/prisma/prisma.service'`
- 외부: `import { Injectable } from '@nestjs/common'`

## 워크플로우

### Step 1 — Prisma schema에 필드 추가
`prisma/schema.prisma`의 `model Order` 블록에 새 필드 추가. 타입은 prisma scalar (`String`, `Int`, `DateTime` 등). nullable 결정 시 기존 데이터 마이그레이션 영향 고려.

### Step 2 — Migration 생성
```bash
bun prisma migrate dev --name add_order_{field_name}
```
이 명령은 prisma/migrations/ 하위에 SQL 파일을 자동 생성한다. `prisma db push`는 마이그레이션 파일을 만들지 않아 prod 추적 불가 — 사용 금지.

### Step 3 — DTO 업데이트
`src/modules/order/dto/create-order.dto.ts`와 `update-order.dto.ts`에 필드 추가. class-validator 데코레이터 필수 (`@IsString()`, `@IsNumber()` 등). UpdateOrderDto는 `PartialType(CreateOrderDto)`로 자동 상속되므로 별도 추가 불필요.

### Step 4 — Controller 반영
`src/modules/order/order.controller.ts`의 POST/PATCH 핸들러가 DTO를 받으므로 자동 반영. 단, 응답 매핑이나 별도 필터링이 필요하면 컨트롤러도 수정.

### Step 5 — 테스트 추가
`src/modules/order/order.spec.ts`에 새 필드를 포함한 mock 데이터 추가. 기존 `describe('OrderService')` 블록의 fixture 패턴 따름.

## 주의사항

- 이 프로젝트에서 "Order"는 **결제 완료 후 fulfillment 단위**다 (Cart != Order). 새 필드가 Cart 단계 정보면 Cart 모듈에 추가해야 함.
- prisma migration 후 `bun prisma generate`를 잊지 말 것 — 잊으면 ts 컴파일 에러.
- order.spec.ts는 OrderRepository를 mock하지 말 것 (이 프로젝트 컨벤션: 단위 테스트도 인메모리 prisma 사용).
```
<!-- /user-facing -->

**Why this is Good**:
- description: 5 trigger keywords + boundary condition ("do not trigger on simple lookups")
- 7 real file paths embedded (`src/modules/order/order.controller.ts` etc.)
- 3 real import patterns embedded
- Real commands (`bun prisma migrate dev --name ...`) + Why-First explanation (why `db push` is forbidden)
- Domain term distinction stated ("Order vs Cart")
- Cannot be copy-pasted into another project = max value to this project

Note: the After example body is intentionally Korean because it is the **user-facing skill content** that ends up in the user's project. The skill body is read by Claude inside the user's project but the user reads/owns it too.

### 8-4. Injection verification checklist

After writing the skill body, self-verify against:

- [ ] Description contains at least 1 real path and at least 3 trigger keywords
- [ ] Body contains at least 3 real file paths
- [ ] Body contains at least 1 real command (based on the project's build/test/migration tool)
- [ ] Body contains at least 2 domain terms (in this project's vocabulary)
- [ ] "Would copy-pasting into another project still work?" → if yes, the skill failed. The body lacks facts unique to this project.
