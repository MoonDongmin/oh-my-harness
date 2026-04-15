# Skill Generation Guide

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

> **This document is required reading for `harness-be`/`harness-fe` Phase 5 Step 1.** Both skill builders MUST Read this file and `skill-writing-guide.md` upon entering Phase 5 before proceeding to candidate derivation. Without this guide, candidates degenerate into generic nouns and the user never invokes the generated skill.

A guide for deriving **work likely to repeat in this project** as candidates from project analysis results, then bundling only the **user-approved** ones into skills.

> **Core principle**: Not framework mapping like "if NestJS, then skill X". Instead, build candidates from the "actual repeated work patterns in this project's modules and domains", and **only generate the ones the user OKs**. Generating 0 skills is a normal flow.

---

## Table of contents

1. [Candidate derivation procedure (5-step exploration)](#1-candidate-derivation-procedure-5-step-exploration)
2. [Skill creation criteria](#2-skill-creation-criteria)
3. [SKILL.md authoring template](#3-skillmd-authoring-template)
4. [Adapting to project conventions](#4-adapting-to-project-conventions)
5. [Skill-agent linkage](#5-skill-agent-linkage)
6. [Good vs Bad skill examples + naming blacklist](#6-good-vs-bad-skill-examples--naming-blacklist)
7. [User gate prompt (option format)](#7-user-gate-prompt-option-format)
8. [Body authoring — Why-First principle](#8-body-authoring--why-first-principle)

---

## 1. Candidate derivation procedure (5-step exploration)

No matrix lookup. Run the 5 steps below in order.

### Step A — Directory observation

Together with Phase 1 detection results (`module_pattern`, `existing_modules`, `domain_terms`, `notable_files`, `infra`), look once more at the actual directory tree at the project root. Form a mental picture of which directory names repeat and how often, and which file patterns appear in every module.

### Step B — Hypotheses (free-form)

Free-write 5-8 answers to: "What work is a person on this project likely to do 3+ times in the next month?" Sentences, not tables. **Do not name skills at this point.** Describe only the work itself:

<!-- user-facing (Korean, do not translate) -->
```
- "주문 도메인에 새 필드를 추가할 때, prisma 스키마 → migration → DTO → 컨트롤러 4곳을 동기화"
- "결제 웹훅을 새로 받을 때, controller/service/dto/test 4개 파일과 서명 검증 미들웨어를 항상 같은 순서로 추가"
- "사용자 권한이 바뀔 때 guard·decorator·테스트 fixture 3곳을 바꾸는데 누락이 잦음"
```
<!-- /user-facing -->

### Step C — Verification

For each hypothesis, **confirm with 1-2 actual files** that it really applies to this project. If hypothesis #1 is "sync the 4 places in the order domain", check directly that `src/modules/order/` actually contains prisma, DTO, and controller. Drop hypotheses that fail verification.

Keep only hypotheses that pass verification. Typically 3-5 of the 5-8 survive.

### Step D — Candidate derivation (naming)

For each surviving hypothesis, choose a skill name and a one-line purpose. **Names MUST be derived from this project's actual module names, domain terms, and directory names.** Read §6 (naming blacklist) first and check that you don't violate it.

<!-- user-facing (Korean, do not translate) -->
```
- "주문 도메인 4곳 동기화" → order-field-sync
  용도: src/modules/order/ 작업 시 prisma·DTO·controller·migration 4곳 자동 동기화
- "결제 웹훅 추가" → payment-webhook-scaffold
  용도: 새 결제 웹훅 라우트 + 서명 검증 미들웨어 골격 생성
```
<!-- /user-facing -->

### Step E — Self-filtering (enforce 4-candidate cap)

Filter candidates with the criteria in §2. Then **cut the list down to a maximum of 4**. Reason: the user gate in Step F uses a single `AskUserQuestion` call, which has a 4-option cap. The 4-cap also reduces user decision fatigue.

If 5+ survive, cut by **per-agent priority** — among the core 6 agents, decide which agent would use each candidate most often, and keep the top 4.

---

## 2. Skill creation criteria

Not every verified candidate has to go to the user gate.

### Cases worth raising as a candidate

- The agent is expected to do the same pattern of work **3+ times**
- The work has **project-specific rules** that are tedious to re-explain each time
- The work has **3+ steps** and the order matters
- Skipping it could cause regression (e.g. missing 1 of the 4 sync points)

### Cases to exclude

- Generic work the agent already knows well (git commits, file reads, plain grep)
- One-off work (one migration that's done once)
- Plain repetition with no project-specific rules — Claude handles it fine
- Too abstract to anchor with even 1-2 real paths/domain terms in the body

### 0 candidates is also normal

If 0 candidates pass the criteria, take 0 candidates forward. At the gate step, tell the user "no repeating patterns found worth auto-generating in this build" and end normally. **Do not pad.**

### Reasonable skill counts (after the user gate)

| Project size | Candidate count | Avg after user picks |
|--------------|-----------------|---------------------|
| Small (<5 modules) | 0-2 | 0-1 |
| Mid (5-15 modules) | 2-4 | 1-3 |
| Large (15+ modules) | 3-4 | 2-4 |

**Max 4 candidates**, average 1-3 after user selection — this is the normal distribution. If 5+ skills got generated, Step E filtering was insufficient.

---

## 3. SKILL.md authoring template

Only authored for candidates that pass the gate.

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: {project-derived-skill-name}
description: "{이 스킬이 하는 일의 구체적 설명}. {이 스킬을 사용해야 하는 상황 나열}. {트리거 키워드 나열}."
allowed-tools: {필요한 도구 목록}
---

# {Skill Name}

{이 스킬의 목적 한 줄 설명}

## 프로젝트 컨텍스트

{이 스킬이 알아야 하는 프로젝트 고유 정보 — 실제 경로/모듈명/도메인 용어 최소 3개}
- 소스 루트: `{실제 path}`
- 파일 패턴: `{실제 발견된 pattern}`
- 기존 모듈/컴포넌트: {실제 list}

## 워크플로우

### Step 1: {첫 번째 단계}
{구체적 행동 지시 — 실제 파일명 사용}

### Step 2: ...

## 출력 형식

{스킬의 산출물 규격}

## 주의사항

{이 프로젝트에서 흔히 발생하는 실수와 회피 방법}
```
<!-- /user-facing -->

### Description authoring rules

The description is the **only trigger mechanism** for the skill. Write it pushy.

**Bad (generic):**
<!-- user-facing (Korean, do not translate) -->
```yaml
description: "모듈을 생성하는 스킬"
```
<!-- /user-facing -->

**Good (domain-derived + pushy):**
<!-- user-facing (Korean, do not translate) -->
```yaml
description: "src/modules/order/ 하위에 새 주문 관련 필드/엔드포인트를 추가할 때 prisma schema → migration → DTO → controller 4곳을 동기화한다. '주문 필드 추가', '주문 마이그레이션', 'order field' 같은 요청에 반드시 이 스킬을 사용. 단순 조회/디버깅에는 트리거하지 말 것."
```
<!-- /user-facing -->

---

## 4. Adapting to project conventions

The skill body must reflect the project's **actual conventions**. This is where you expand the "context to be injected" promised in the gated candidate's description.

### Adapting directory structure

Read one existing module to capture the actual structure, then copy it verbatim into the body's "Project Context" section:

<!-- user-facing (Korean, do not translate) -->
```markdown
## 프로젝트 컨텍스트

기존 user 모듈의 구조를 기준으로 새 모듈을 생성한다:

src/modules/user/
├── user.controller.ts    ← @Controller 데코레이터, 라우트 정의
├── user.service.ts       ← @Injectable, 비즈니스 로직
├── user.repository.ts    ← DB 접근 레이어
├── user.module.ts        ← @Module 등록
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
└── user.spec.ts          ← 단위 테스트
```
<!-- /user-facing -->

### Adapting naming conventions

State the naming patterns observed in the code:

<!-- user-facing (Korean, do not translate) -->
```markdown
## 네이밍 규칙
- 파일명: kebab-case (`create-order.dto.ts`)
- 클래스: PascalCase (`CreateOrderDto`)
- 변수/함수: camelCase (`findByUserId`)
- 테이블/컬럼: snake_case (`user_id`)
```
<!-- /user-facing -->

### Adapting import patterns

Analyze import structure of existing files:

<!-- user-facing (Korean, do not translate) -->
```markdown
## Import 규칙
- 경로 alias: `@modules/user/user.service` (tsconfig paths 사용)
- 내부 모듈: `import { UserService } from './user.service'`
- 외부 모듈: `import { Injectable } from '@nestjs/common'`
```
<!-- /user-facing -->

---

## 5. Skill-agent linkage

Skills are "how to do it"; agents are "who does it". 1:1 or 1:N.

### Linkage methods

| Method | Implementation | When suitable |
|--------|----------------|---------------|
| **Inline in prompt** | Embed the skill content directly in the agent definition | Skill is short (≤50 lines) and exclusive to this agent |
| **Skill tool call** | The agent prompt states "use the Skill tool to call /skill-name" | Skill is an independent workflow shared by multiple agents |
| **Reference load** | `Read` the skill's references/ files on demand | Skill is large and only conditionally needed |

### Record bindings in CLAUDE.md

In Phase 6 of the harness build, record agent-skill bindings in CLAUDE.md:

<!-- user-facing (Korean, do not translate) -->
```markdown
**스킬:**
| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| order-field-sync | 주문 도메인 4곳 동기화 | executor |
| payment-webhook-scaffold | 결제 웹훅 골격 생성 | executor |
```
<!-- /user-facing -->

---

## 6. Good vs Bad skill examples + naming blacklist

### Naming blacklist (generic nouns)

The names below **must be excluded at the candidate stage**. They have weak triggers in any project and the user never invokes them.

| Forbidden name | Why | Domain-derived alternative |
|----------------|-----|----------------------------|
| `migration-check` | Which migration? Which ORM? | `prisma-order-migration`, `typeorm-user-migration` |
| `api-workflow` | Which API? Which workflow? | `payment-api-contract`, `notification-webhook-scaffold` |
| `bundle-budget` | Which bundle? Which budget? | `checkout-page-bundle-audit` |
| `ui-workflow` | Infinitely abstract | `product-card-design-sync` |
| `a11y-check` | a11y where? | `checkout-form-a11y-audit` |
| `test-scaffold` | Which test pattern? | `nest-controller-test-scaffold`, `rtl-component-test-gen` |
| `domain-check` | Which domain? | `order-aggregate-invariant-check` |
| `config-sync` | Which config? | `env-prod-staging-diff` |
| `pipeline-check` | Which pipeline? | `gha-deploy-impact-audit` |

**Rule**: If the skill name would work as-is for any other project in the same field, the name is too generic. The name alone should make a reader think "ah, that's ours".

### Good example

<!-- user-facing (Korean, do not translate) -->
```yaml
name: order-field-sync
description: "src/modules/order/에 새 필드를 추가할 때 prisma schema, migration, dto, controller 4곳을 동기화한다. '주문 필드 추가', 'add order field', '주문 마이그레이션' 요청에 반드시 사용."
```
<!-- /user-facing -->

The body contains:
- The actual file structure tree of `src/modules/order/`
- The actual import pattern (`@modules/order/order.service`)
- The actual naming convention (kebab-case files, snake_case DB)
- A `bun prisma migrate dev --name {feature}` step after schema changes

### Bad example

<!-- user-facing (Korean, do not translate) -->
```yaml
name: nestjs-module-scaffold
description: "NestJS 모듈을 생성하는 스킬"
```
<!-- /user-facing -->

The body contains:
- A generic NestJS module guide from official docs
- `nest g module` command guidance
- A generic template unrelated to the project's actual structure

**Why it's Bad**:
- Name is "framework name + generic noun" → applies to any NestJS project → Claude already knows this
- Body has no actual file paths or domain terms → no context to inject, so triggering it adds zero value

### Reference example (companion harness)

`/Users/dongmin/Developments/claude/harness/skills/harness/references/team-examples.md:98-105` shows the SF novel team's skill names:

```
worldbuilder        → world-setting
character-designer  → character-profile
plot-architect      → outline
prose-stylist       → write-scene, review-chapter
science-consultant  → science-check
```

Every skill name is a **noun from that team's domain**. None of them look like `novel-worldbuilding-skill`. Follow the same convention — backend → derive from module names and domain terms; frontend → derive from component names and route names.

---

## 7. User gate prompt (option format)

When presenting candidates to the user in Step F, each option's description must contain **all three** of the following. Missing any of them prevents the user from making a decision.

### Required 3 elements

1. **Detection evidence** — why you thought this was worth proposing (which directories/files/repeated patterns you saw)
2. **Trigger keywords** — 2-3 phrases the user might say that should invoke this skill
3. **Context to be injected** — 1-2 actual module names/paths that will go into the body

### Format example

<!-- user-facing (Korean, do not translate) -->
```
label: order-field-sync
description: "src/modules/order/ 작업 시 prisma·migration·dto·controller 4곳 동기화.
              증거: 기존 order/invoice/subscription 3개 모듈이 같은 패턴 반복.
              트리거: '주문 필드 추가', '주문 마이그레이션', 'order schema'.
              주입 컨텍스트: src/modules/order/, prisma/schema.prisma."
```
<!-- /user-facing -->

### AskUserQuestion call format

<!-- user-facing (Korean, do not translate) -->
```
question: "이 프로젝트에서 자동 생성할 보조 스킬을 선택해줘. 0개 선택도 OK."
header: "스킬 후보"
multiSelect: true
options: [최대 4개]
```
<!-- /user-facing -->

If candidates are 0, skip the gate, tell the user "no repeating patterns found worth auto-generating in this build", and proceed straight to Phase 6.

---

## 8. Body authoring — Why-First principle

> Source: `/Users/dongmin/Developments/claude/harness/skills/harness/references/skill-writing-guide.md:57-88` (companion harness)

LLMs make correct edge-case judgments when they understand the why. Conveying context beats coercive rules.

**Bad (coercive):**
```markdown
ALWAYS use prisma migrate dev. NEVER use prisma db push.
```

**Good (Why-First):**
<!-- user-facing (Korean, do not translate) -->
```markdown
스키마 변경 후에는 `bun prisma migrate dev --name {feature}`를 사용한다.
`prisma db push`는 마이그레이션 파일을 만들지 않아 prod 환경에서
변경 이력 추적이 불가능하기 때문이다. dev에서 빠르게 실험할 때는
`db push`를 써도 되지만, 결과를 commit하기 전 반드시 `migrate dev`로
변환한다.
```
<!-- /user-facing -->

### Generalization principle

Generalize to **principle level** instead of writing narrow rules that only fit a specific example.

**Overfit:**
<!-- user-facing (Korean, do not translate) -->
```markdown
"order_amount" 컬럼이 추가되면 dto에 amount: number를 추가하라.
```
<!-- /user-facing -->

**Generalized:**
<!-- user-facing (Korean, do not translate) -->
```markdown
prisma 모델에 새 컬럼이 추가되면 같은 이름·타입을 dto/{create,update}-{module}.dto.ts에 매핑한다. 컬럼 타입 → ts 타입 매핑 표는 prisma docs를 따른다.
```
<!-- /user-facing -->

### Imperative tone

Use "~한다"/"~하라" instead of "~합니다"/"~할 수 있습니다". A skill is a directive — clear imperative is more effective.

### Save context

Ask if every sentence justifies its token cost:
- "Does Claude already know this?" → delete
- "Without this, would Claude make a mistake?" → keep
- "Is one concrete example more effective than a long explanation?" → replace with the example

For detailed authoring patterns, see the sibling document `skill-writing-guide.md`.

---

## Appendix — Candidate seed catalog (for inspiration, not a matrix)

> ⚠️ **Warning**: The lists below are examples of "patterns we often see", not a candidate list. Patterns you discover yourself in Step A-B take priority, and it's fine to derive candidates without any seed. Putting the seed name straight into a candidate violates §6 naming rules.

### Backend seeds

| Observed pattern | Candidate work | Domain-derived name example |
|------------------|----------------|-----------------------------|
| Same module structure 3+ times | New module scaffold | `{domain}-module-scaffold` |
| Migration directory + ORM | Schema change → sync | `{ORM}-{domain}-migration` |
| 5+ router files | API contract change check | `{service}-api-contract` |
| Monorepo workspace | Cross-package impact | `{workspace}-impact` |
| Consistent test file pattern | Test skeleton generation | `{framework}-{layer}-test-gen` |
| 3+ env files | Env diff | `env-{stage1}-{stage2}-diff` |
| `.github/workflows/` present | CI impact precheck | `gha-{workflow}-impact` |
| Hexagonal/Clean + 5+ domains | Domain invariant check | `{aggregate}-invariant-check` |

### Frontend seeds

| Observed pattern | Candidate work | Domain-derived name example |
|------------------|----------------|-----------------------------|
| Repeated component directory pattern | New component scaffold | `{component-type}-scaffold` |
| Storybook present | Story sync | `{component}-story-sync` |
| Playwright present | Visual regression test | `{page}-visual-regression` |
| Many form components | Form a11y audit | `{form-name}-a11y-audit` |
| Design token system | Token sync verification | `{token-package}-token-sync` |
| i18n library + many locales | Translation gap check | `{locale}-translation-check` |

> Reiterating: the `{...}` placeholders in the "name example" column above MUST be filled with **this project's actual terms**. Leaving `{도메인}` literal or filling it with `domain` violates §6.
