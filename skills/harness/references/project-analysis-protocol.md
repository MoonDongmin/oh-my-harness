# Project Analysis Protocol

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

A protocol for exploring the codebase **architecture-agnostically** to decide whether additional agents and skills are needed.

> **Principle**: Do not assume any specific architecture (DDD, Hexagonal, MVC, etc.). Decide only from facts the code reveals.

---

## Table of contents

1. [Exploration order](#1-exploration-order)
2. [Per-area exploration methods](#2-per-area-exploration-methods)
3. [Pattern detection techniques](#3-pattern-detection-techniques)
4. [Decision tree for agent necessity](#4-decision-tree-for-agent-necessity)
5. [Injecting project knowledge into agent prompts](#5-injecting-project-knowledge-into-agent-prompts)
6. [Good vs Bad agent examples](#6-good-vs-bad-agent-examples)

---

## 1. Exploration order

Explore in the following order. Each step's results narrow the search space for the next.

```
Step 1: Project structure (skeleton)
Step 2: Core dependencies (tech stack)
Step 3: Source code sampling (coding patterns)
Step 4: Test status (quality level)
Step 5: Infrastructure / deployment (operational environment)
Step 6: Synthesis (decide on agent / skill needs)
```

---

## 2. Per-area exploration methods

### Step 1: Project structure

**Tools**: `Bash(ls -R)` depth 3 + `Glob(**/*.{ts,js,py,go,rs,java,kt,swift,rb})`

**What to capture:**
- Primary source language
- Top-level directory layout (src/, lib/, app/, packages/, apps/)
- Module boundaries (directory patterns repeated at the same depth)
- Layer separation (if any — controller/, service/, repository/, etc.)

**Decision points:**
- `packages/` or `apps/` + workspace config → monorepo
- Same structure repeating 3+ times → "repeated module pattern" (details: §3 Pattern detection techniques)
- 100+ source files → large project

### Step 2: Core dependencies

**Tools**: `Read(package.json)` / `Read(go.mod)` / `Read(requirements.txt)` / `Read(Cargo.toml)` / `Read(build.gradle)`

**What to capture:**
- Frameworks (NestJS, Express, FastAPI, Spring, Rails, Next.js, etc.)
- Database (TypeORM, Prisma, Drizzle, SQLAlchemy, GORM, etc.)
- Message queues (Bull, RabbitMQ, Kafka, etc.)
- External API SDKs (AWS SDK, Stripe, etc.)
- Test frameworks (Jest, Vitest, pytest, etc.)

**Decision points:**
- DB-related dependencies + `migrations/` directory → migration skill candidate
- Multiple external service SDKs → infra-specialist agent candidate
- Monorepo tooling (lerna, nx, turbo, pnpm workspace) → cross-package-coordinator candidate

### Step 3: Source code sampling

**Tool**: `Read` — 3-5 representative files from the largest module (by file count)

**Selection criteria:**
1. The module's "entry point" file (index, module, main)
2. The largest file (usually core business logic)
3. The most-imported file (use `Grep` to count import occurrences)

**What to capture:**
- Coding patterns (class vs function, OOP vs FP)
- Naming conventions (camelCase, snake_case, PascalCase)
- Inter-module relationships (import patterns)
- Business logic complexity (branching, state machines, validation)
- Repeated boilerplate code

**Decision points:**
- 3+ files with complex business logic → domain-specialist agent candidate
- The same boilerplate repeated across multiple modules → scaffold skill candidate
- A specific domain term appearing repeatedly → include the domain term in the agent prompt

### Step 4: Test status

**Tools**: `Glob(**/*.{spec,test}.*)` for test file listing + `Read` for test config

**What to capture:**
- Test file count vs source file count (ratio)
- Test framework and runner
- Test patterns (unit / integration / E2E ratio)
- Test directory layout (__tests__/, *.spec.ts, test/)

**Decision points:**
- test:source ratio < 0.3 → recommend adding qa-agent
- Consistent test pattern present → test-scaffold skill candidate
- E2E tests present → consider a verification-strengthening agent

### Step 5: Infrastructure / deployment

**Tools**: `Glob({Dockerfile*,docker-compose*,.github/**,Makefile,*.yml,.gitlab-ci*,Jenkinsfile})`

**What to capture:**
- CI/CD pipeline presence and type
- Container configuration
- Deployment targets (cloud, on-premise)
- Number and variety of environment config files

**Decision points:**
- CI/CD pipeline present → pipeline-guardian agent candidate + pipeline-check skill candidate
- Docker + docker-compose → infra-ops agent candidate
- 3+ env config files (.env.development, .env.staging, .env.production) → config-sync skill candidate

---

## 3. Pattern detection techniques

### Detecting "repeated modules"

Look for **directories with the same structure repeated** in the project. This is the core evidence for scaffold agents/skills.

**How:**
1. List directories at depth 2-3
2. Compare the file lists inside each
3. If the same filename pattern (excluding extension) repeats across 3+ directories → "repeated module"

**Example:**
```
src/
├── user/
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.repository.ts
│   └── user.module.ts
├── order/
│   ├── order.controller.ts
│   ├── order.service.ts
│   ├── order.repository.ts
│   └── order.module.ts
└── payment/
    ├── payment.controller.ts
    ├── payment.service.ts
    ├── payment.repository.ts
    └── payment.module.ts
```

→ The pattern `{name}.controller.ts`, `{name}.service.ts`, `{name}.repository.ts`, `{name}.module.ts` repeats 3 times → target for a scaffold skill.

### Detecting "domain terms"

Extract **business domain terms** that appear repeatedly in the code. This is the core knowledge to inject into a domain-specialist agent's prompt.

**How:**
1. Extract common prefixes/suffixes from class/function/type names
2. Extract domain terms from filenames (user, order, payment, invoice, product, etc.)
3. Extract domain-related descriptions from comments or README

### Detecting "complexity hotspots"

Find the largest files, the most-depended-upon files, and the files with the most branching.

**How:**
1. List the top 10 files by size
2. Use `Grep(import.*from)` to find the most-referenced files
3. Read those files to assess complexity

---

## 4. Decision tree for agent necessity

Synthesize exploration results to decide whether to add agents:

```
Did you assess project size?
├── 5+ modules → add planner agent
├── Monorepo (2+ packages) → add cross-package-coordinator
└── Small project → core 6 may be enough; no extra agents

Did you assess code patterns?
├── Found repeated module pattern → scaffold agent or skill candidate
├── Found complex business logic → add domain-specialist
│   (include real domain terms, file paths, business rules in the agent prompt)
└── No special patterns → no addition needed

Did you assess infrastructure complexity?
├── DB + MQ + external APIs → add infra-specialist
├── CI/CD pipeline → add pipeline-guardian
└── Simple infra → no addition needed

Did you assess test status?
├── test:source < 0.3 → add qa-agent
├── Consistent test pattern → test-scaffold skill candidate
└── Tests sufficient → no addition needed

Are there frontend components?
├── Many UI components → add ui-reviewer
└── Backend only → no addition needed

Is there project-specific complexity not covered above?
├── Yes → explain to the user, confirm, then create a custom agent
└── No → no extra agents
```

**Maximum extra agents — guidance:**
- Small project (under 5 modules): 0-1 extra
- Mid-sized project (5-15 modules): 1-3 extra
- Large project (15+ modules): 2-4 extra

Too many agents create coordination overhead. 3 focused agents beat 6 generic ones.

---

## 5. Injecting project knowledge into agent prompts

A custom agent's prompt should contain **concrete information that is only valid in this project**.

### Types of information to inject

| Type | Example |
|------|---------|
| Directory structure | "Each module sits under src/modules/" |
| File pattern | "Each module has {name}.controller.ts, {name}.service.ts" |
| Module list | "Currently 4 modules: user, order, payment, notification" |
| Domain terms | "Order states: PENDING → CONFIRMED → SHIPPED → DELIVERED" |
| Key files | "Core payment logic: src/payment/payment.service.ts" |
| Naming conventions | "Filenames: kebab-case, classes: PascalCase, vars: camelCase" |
| Test pattern | "Test file: {name}.spec.ts in the same directory" |

### Injection template

<!-- user-facing (Korean, do not translate) -->
```markdown
## 프로젝트 컨텍스트

이 프로젝트의 구조:
- 소스 루트: `{source_root}`
- 모듈 위치: `{module_path}/{name}/`
- 모듈 파일 구성: {file_pattern_list}
- 현재 모듈: {module_names}
- 핵심 도메인 용어: {domain_terms}
- 테스트 패턴: `{test_pattern}`

이 프로젝트에서 작업할 때 위 구조와 패턴을 따른다.
```
<!-- /user-facing -->

---

## 6. Good vs Bad agent examples

### Good: project-tailored agent

<!-- user-facing (Korean, do not translate) -->
```markdown
---
description: "이 프로젝트의 src/modules/ 하위 모듈 구조를 이해하고, 
  새 모듈 추가 시 기존 user/order/payment 모듈의 패턴
  (controller/service/repository/dto)을 재현하는 전문가."
---

# Module Scaffold Agent

## 프로젝트 컨텍스트
- 소스 루트: `src/modules/`
- 기존 모듈: user, order, payment, notification
- 각 모듈 구성:
  - `{name}.controller.ts` — HTTP 엔드포인트
  - `{name}.service.ts` — 비즈니스 로직
  - `{name}.repository.ts` — 데이터 접근
  - `{name}.module.ts` — 모듈 등록
  - `dto/` — 요청/응답 DTO
  - `{name}.spec.ts` — 단위 테스트

## 핵심 역할
새 모듈 생성 시 위 구조를 정확히 재현한다.
기존 모듈의 import 패턴과 네이밍 규칙을 따른다.
```
<!-- /user-facing -->

### Bad: generic agent

<!-- user-facing (Korean, do not translate) -->
```markdown
---
description: "NestJS DDD 프로젝트의 도메인 전문가. Bounded Context와 
  Aggregate를 이해하고 도메인 모델을 검증한다."
---

# Domain Expert Agent

NestJS DDD 프로젝트의 도메인 모델을 검증하는 전문가입니다.
Bounded Context 경계를 지키고 Aggregate 불변식을 확인합니다.
```
<!-- /user-facing -->

**The difference:**
- Good: knows the **actual** paths, module names, and file layout of this project
- Bad: only mentions architecture labels — generic enough to slap on any project
