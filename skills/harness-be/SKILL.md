---
name: harness-be
description: "Backend-only harness builder. Scans the project root to detect language / framework / architecture_style / data_layer / api_style / test_stack, then generates the core 6 agents + 2 leaders + conditional specialists with concrete project evidence injected. Triggers: '백엔드 하네스 만들어줘', 'harness-be', 'backend harness', team setup on server projects (NestJS / Express / Fastify / FastAPI / Django / Spring / Go etc.), reconfiguring an existing harness from a backend perspective, and automatic invocation when the router skill (harness) branches to BE."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness-BE — Backend Agent Team Builder

Builds the agent team for a backend project. **Core principle**: do not assume any specific framework or architecture (DDD / Hexagonal / NestJS). Scan the project first, detect facts, and inject the detected evidence into the agent prompts.

## Language Policy

**All user-facing output must be in Korean.** This file is written in English for token efficiency (Claude reads it as instructions), but anything the end user sees — `AskUserQuestion` text, progress messages, error messages, final summaries, CLAUDE.md blocks written into the project — must be rendered in natural Korean.

- Claude-directed instructions in this file: English.
- Embedded Korean strings marked `<!-- user-facing -->`: literal templates, never translate.
- Frontmatter `description` Korean triggers: literal, never translate.
- When you narrate progress to the user or write a summary, translate to natural Korean first — do not surface English reasoning text directly.

**Primary responsibilities of this skill:**
1. Scan the backend project and produce a structured detection object (language / framework / architecture_style / data_layer / api_style / test_stack / module_pattern / domain_terms)
2. Generate the core 6 agents + 2 leaders with `<Project_Context>` injection
3. Conditionally compose specialist agents (domain-expert / api-specialist / data-engineer / infra-reviewer / monorepo-coordinator / qa-agent) that match the detection
4. Derive skill candidates from repeated project patterns → user approval gate → only generate the selected ones using domain-derived names (zero is a valid result)
5. Register a `harness-fingerprint` block in CLAUDE.md — the tdd / implement skills read it later for reuse

## Invocation Patterns

| Input | Behavior |
|------|------|
| `/oh-my-harness:harness-be` | Backend detection → harness build |
| `/oh-my-harness:harness-be {feature}` | Build + start working on the feature |
| Invoked by router (`/oh-my-harness:harness` → BE branch) | Same |

## Workflow

### Phase 0: Check for existing harness

Read the project's `.claude/agents/`, `.claude/skills/`, and `CLAUDE.md`.

- **New build**: harness directory empty → run from Phase 1 in full
- **Extension**: harness exists, additional request → run only the necessary phases
- **Maintenance**: audit / sync request → Phase 7

If `<!-- harness-fingerprint v1 -->` exists in CLAUDE.md, read it to recover the previous detection result. Re-running with the same fingerprint avoids unnecessary re-scanning.

### Phase 1: Backend Detection (the new core logic)

Run the detection tree defined in `references/backend-detection-protocol.md`. Store the result in memory using the following structure.

```yaml
language: typescript | javascript | python | java | kotlin | go | rust | ruby | php | unknown
framework: nestjs | express | fastify | koa | hono | fastapi | flask | django | spring-boot | micronaut | quarkus | gin | echo | fiber | rails | laravel | unknown
architecture_style: hexagonal | clean | layered | mvc | modular-monolith | feature-sliced | simple | unknown
data_layer: prisma | typeorm | drizzle | sequelize | mikro-orm | sqlalchemy | gorm | hibernate | raw-sql | none
api_style: rest | graphql | grpc | trpc | hybrid | none
test_stack: jest | vitest | mocha | pytest | go-test | junit | rspec | none
infra: [docker, k8s, terraform, github-actions, ...]  # array of detected tags
module_pattern: "src/modules/{name}/{name}.controller.ts, .service.ts, .repository.ts"  # actual pattern string discovered
existing_modules: [user, order, payment, ...]
domain_terms: [Order, Invoice, Subscription, ...]
notable_files: [top 3 entry points — src/main.ts, etc.]
test_source_ratio: 0.42
```

**Detection principles:**

- **Evidence first**: do not decide based on dependency names alone. For example, the presence of `@nestjs/*` is not enough — `domain/ports/adapters` directories must actually exist before declaring `architecture_style: hexagonal`.
- **Neutrality first**: when nothing matches, pick `unknown` and either ask the user or inject `architecture_style: unknown` into Project_Context as-is. Do not guess.
- **Multiple corroborating sources**: architecture_style detection must check all three evidence steps (directory structure + file naming + sample import patterns).

**When detection is ambiguous (architecture_style == unknown):**

Ask the user via AskUserQuestion:

<!-- user-facing (Korean, do not translate) -->
```
이 프로젝트의 주요 아키텍처 스타일은?
[1] Hexagonal (Ports & Adapters)
[2] Clean Architecture (use-cases/entities)
[3] Layered (controller/service/repository)
[4] MVC
[5] 기타 / 해당 없음
```
<!-- /user-facing -->

When the user answers, store it together with an `architecture_style_user_declared: true` flag.

### Phase 2: Model-selection question (mandatory — do not skip)

**Required**: Read `../harness/references/model-selection-protocol.md` and execute the procedure inside it exactly. That file defines the sequential `AskUserQuestion` flow for the core 6 agents, the option definitions, the response-interpretation rules, the final confirmation submit, and the fixed leader values.

The `model_selection` structure produced by the protocol is used in Phase 3 as each agent's frontmatter (provider/model). When Codex is selected, a `codex_delegate: true` flag is also recorded; Phase 3 reads that flag and generates the agent using the Codex CLI delegation template.

The two leaders (`tdd-leader`, `team-leader`) are pinned to **Opus without asking**, per protocol §6.

> ⚠️ **Regression guard**: an earlier version of this phase pointed to a Phase 1-1 block in `skills/harness/SKILL.md`, which became orphaned after the router refactor removed it. This phase now reads the shared reference file directly, so drift cannot recur.

### Phase 3: Agent generation (with detection injection)

Generate each core agent at `{project}/.claude/agents/{name}.md`. Generation steps:

1. **Read base**: Read `${CLAUDE_PLUGIN_ROOT}/agents/{name}.md`. These files are neutralized and contain a `<Project_Context>` priority marker.
2. **Serialize context**: Serialize the Phase 1 detection object into the following XML block.

```xml
<Project_Context>
  <!-- injected by harness-be — authoritative over any generic assumption above -->
  Skill: harness-be
  Language: {language}
  Framework: {framework} ({detected version if known})
  Architecture style: {architecture_style} {"(user-declared)" if user-declared}
  Data layer: {data_layer}
  API style: {api_style}
  Test stack: {test_stack}
  Infrastructure: {infra joined}

  Repeated module pattern: {module_pattern}
  Existing modules: {existing_modules joined}
  Key domain terms: {domain_terms joined}
  Notable files: {notable_files joined}
  Test-to-source ratio: {test_source_ratio}

  Evidence that justified these detections:
    - {list of concrete files/directories/deps that supported the detection}
</Project_Context>
```

3. **Merge frontmatter**: write the frontmatter using the user-selected provider/model. When Codex is selected, use the Codex CLI delegation template.
4. **Insert before closing tag**: insert `<Project_Context>` just before `</Agent_Prompt>` in the base prompt.
5. **Write**: save to `{project}/.claude/agents/{name}.md`.

The two leaders (tdd-leader, team-leader) are produced the same way — read the originals at `${CLAUDE_PLUGIN_ROOT}/agents/{tdd-leader,team-leader}.md` and inject `<Project_Context>` before saving. At the leader level, only architecture_style / framework / test_stack are included — detailed spawn logic branches inside the leader bodies themselves.

> Detailed injection rules: see `references/backend-prompt-injection-guide.md`.

### Phase 4: Dynamic conditional agents

Conditionally generate the specialist agents below based on the detection result. **The judgment is grounded in detected facts, not in framework names.**

| Condition | Agent generated | Injected content |
|---|---|---|
| `architecture_style ∈ {hexagonal, clean, modular-monolith}` AND `domain/` / `entities/` files ≥ 5 | `domain-expert` | actual domain terms, discovered aggregate / entity names, domain directory paths |
| `api_style ∈ {rest, graphql, grpc, trpc}` AND controller / router files ≥ 5 | `api-specialist` | detected API style, routing file paths, schema location |
| `data_layer ≠ none` AND a migrations directory exists | `data-engineer` | detected ORM, schema files, migrations path |
| `infra` tags include docker / k8s / terraform | `infra-reviewer` | detected infra tags, config file paths |
| Monorepo tooling detected (turbo / nx / lerna / workspaces) | `monorepo-coordinator` | detected monorepo tool, package list |
| `test_source_ratio < 0.3` | `qa-agent` | current ratio, areas with coverage gaps |

**Critical change**: `domain-expert` is only generated for `hexagonal` / `clean` / `modular-monolith`. It is **not** generated for a plain Express CRUD project (`architecture_style: simple`). This is the concrete realization of "remove framework assumptions + synthesize from detection".

Each specialist agent's prompt must inject **at least 3 actual paths, file names, and domain terms** collected in Phase 1. Do not generate generic specialists ("DDD expert").

### Phase 5: Skill generation (user approval gate)

> **Critical change**: previously skills were auto-generated from a fixed "condition → skill name" matrix, which spawned generic skills the user never used. The flow is now **derive candidates → user approval → generate only what was selected**. **Producing zero skills is a valid completion.**

#### Step 1 — Load the guides (mandatory)

Read both of the following files. Skipping this step causes the LLM to fall back to matrix-matching mode.

- `../harness/references/skill-generation-guide.md` — 5-step candidate derivation procedure + naming blocklist + user gate format
- `../harness/references/skill-writing-guide.md` — skill body authoring principles (pushy Description, Why-First, imperative)

#### Step 2 — Derive candidates (3-stage funnel, max 4)

Follow guide §1's 5-step exploration (Step A–E) exactly. Summary:

1. **Observe**: re-examine the Phase 1 detection object (`module_pattern`, `existing_modules`, `domain_terms`, `notable_files`) and the actual directory tree
2. **Hypothesize**: write 5–8 free-form sentences describing "tasks a person on this project would do 3+ times in a month" (do not name them yet at this stage)
3. **Validate**: confirm each hypothesis against 1–2 actual files. Drop anything unconfirmed
4. **Name**: for each surviving hypothesis, derive the skill name **directly from the project's module names, domain terms, and actual directory names**
5. **Filter**: apply the §2 judgment criteria, then **trim to a maximum of 4** (single `AskUserQuestion` option cap of 4 + decision-fatigue mitigation)

> ⚠️ **Inline naming warning**: if a candidate name is a generic noun like `migration-check`, `api-workflow`, `domain-check`, `cross-package`, `pipeline-check`, `config-sync`, or `test-scaffold`, **reject and rename immediately**. These names are pinned in guide §6's naming blocklist. A name that fits any NestJS project does not fit *this* project.

#### Step 3 — User approval gate (mandatory)

If there is at least one candidate, ask the user via `AskUserQuestion` (multiSelect=true). If there are zero candidates, skip this step, tell the user in one line that no auto-generatable repeated patterns were found for this build, and proceed straight to Phase 6.

<!-- user-facing (Korean, do not translate) -->
```
question: "이 프로젝트에서 자동 생성할 보조 스킬을 선택해줘. 0개 선택도 OK."
header:   "스킬 후보"
multiSelect: true
options: [최대 4개]
```
<!-- /user-facing -->

Each option's description must contain **all 3 elements** (guide §7):

<!-- user-facing (Korean, do not translate) -->
```
label: order-field-sync
description: "src/modules/order/ 작업 시 prisma·migration·dto·controller 4곳 동기화.
              증거: 기존 order/invoice/subscription 3개 모듈이 같은 패턴 반복.
              트리거: '주문 필드 추가', '주문 마이그레이션', 'order schema'.
              주입 컨텍스트: src/modules/order/, prisma/schema.prisma."
```
<!-- /user-facing -->

A zero-selection answer is fine — skip Step 4 and go to Step 5.

#### Step 4 — Write the selected skill bodies

For each candidate the user selected, generate `{project}/.claude/skills/{name}/SKILL.md`.

When writing each skill:
1. **Description**: pushy trigger principles from guide §3 + skill-writing-guide §1. At least 3 trigger keywords + explicit boundary conditions
2. **Body injection**: inject **at least 3 actual file paths, import patterns, module names, and domain terms** from the Phase 1 detection object into the body. See the "skill body injection rules" section of `references/backend-prompt-injection-guide.md` for exactly which fields go where
3. **Body authoring principles**: Why-First (no ALWAYS/NEVER) / Lean (under 500 lines) / imperative ("~한다" / "~하라")
4. **If over 500 lines**: split into `references/` and leave only a pointer in the body

#### Step 5 — Provisional CLAUDE.md sync

Record only the generated skill directory tree into CLAUDE.md immediately (separated from the Phase 6 fingerprint finalization). This is a provisional sync that protects against session interruption — it makes recovery possible by recording how far we got.

<!-- user-facing (Korean, do not translate) -->
```markdown
## 하네스 (Backend) — 빌드 진행 중

**스킬 (Phase 5 완료):**
- order-field-sync
- payment-webhook-scaffold

(fingerprint는 Phase 6에서 확정)
```
<!-- /user-facing -->

If zero skills were generated, leave this section blank.

#### Step 6 — Zero case is a normal exit

If the user picked zero or there were zero candidates, advance to Phase 6 with `.claude/skills/` left empty. The build completes normally. The core 6 + 2 leaders + conditional specialists were already created in Phases 3–4, so the harness itself is functional.

The fingerprint's `skills_generated` field is recorded as an empty array `[]`.

> ⚠️ **Do not force-fill**: suppress the instinct to "make at least one anyway". Do not regenerate candidates the user rejected, and do not auto-create things under the label of "built-in skills". Zero means zero.

### Phase 6: CLAUDE.md harness context + fingerprint registration (final)

Remove the provisional sync section from Phase 5 Step 5 and replace it with the final context and fingerprint block. The tdd / implement skills read this block at pipeline execution time and reuse it.

<!-- user-facing (Korean, do not translate) -->
```markdown
## 하네스 (Backend)

**에이전트 팀:**
| 에이전트 | 역할 | 모델 |
|---------|------|------|
| architect | 설계·아키텍처 분석 | {선택} |
| test-engineer | 테스트 작성 | {선택} |
| ... |

**스킬:**
| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| ... |

**실행 규칙:**
- **TDD 작업** → `/oh-my-harness:tdd`
- **대규모 구현/리팩토링** → `/oh-my-harness:implement`
- **도메인 특화 작업** → 생성된 오케스트레이터 스킬

<!-- harness-fingerprint v1 -->
skill: harness-be
language: {language}
framework: {framework}
architecture_style: {architecture_style}
data_layer: {data_layer}
api_style: {api_style}
test_stack: {test_stack}
infra: {infra joined}
module_pattern: "{module_pattern}"
existing_modules: {existing_modules joined}
core6_agents: architect, test-engineer, executor, code-reviewer, security-reviewer, debugger
leaders: tdd-leader, team-leader
extra_agents: {list of conditional agents spawned}
skills_generated: {list}
<!-- /harness-fingerprint -->
```
<!-- /user-facing -->

### Phase 7: Feature work (optional)

When invoked as `/oh-my-harness:harness-be {feature}`, hand off the feature request parsed in Phase 0 to an orchestrator skill or to the `implement` / `tdd` skill.

### Phase 8: Maintenance

When an existing harness is present and Phase 0 routes here for "maintenance":

1. **Audit current state**: compare `.claude/agents/` against the CLAUDE.md table and detect drift
2. **Re-detect**: re-run Phase 1 to produce a current detection result and compare to the existing fingerprint
3. **Apply differences**: if there are differences, explain them to the user and apply them incrementally
4. **Update fingerprint**

**Skill gate idempotency**: in maintenance mode, the Phase 5 gate is not raised again automatically. Unless the user explicitly requests "review skill candidates again", preserve the existing `skills_generated` list as-is. If a previous build chose zero, keep the empty array — do not auto-suggest "maybe try generating some this time".

---

## Output checklist

- [ ] `{project}/.claude/agents/architect.md` — all of the core 6 agents include a `<Project_Context>` block
- [ ] `{project}/.claude/agents/tdd-leader.md` and `team-leader.md` — pinned to Opus, with `<Project_Context>`
- [ ] `{project}/.claude/agents/` — only the conditional specialists matching detection are generated (no generic "DDD expert")
- [ ] Specialist agent prompts contain at least 3 actual file paths / module names / domain terms
- [ ] `{project}/.claude/skills/` — only the candidates that passed the user gate (zero is valid). If any were generated, the names are derived from project module names / domain terms (no generics like `migration-check` / `api-workflow`)
- [ ] Generated skill bodies inject at least 3 actual file paths / import patterns / module or domain terms
- [ ] `{project}/CLAUDE.md` — the Phase 5 Step 5 provisional sync is replaced by the final fingerprint block in Phase 6 (`skills_generated` may legitimately be an empty array)
- [ ] Re-run idempotency verified via fingerprint

## References

- Backend detection protocol: `references/backend-detection-protocol.md`
- Prompt injection guide: `references/backend-prompt-injection-guide.md`
- Repeated module detection + domain term extraction: reuse §3 of `../harness/references/project-analysis-protocol.md`
- Agent design patterns: `../harness/references/agent-design-patterns.md`
- Skill authoring guide: `../harness/references/skill-writing-guide.md`
