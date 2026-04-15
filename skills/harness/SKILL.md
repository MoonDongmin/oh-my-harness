---
name: harness
description: "Router that auto-detects project type and delegates to the backend or frontend harness. Actual agent team construction is performed by harness-be (backend) or harness-fe (frontend). Triggers: '하네스 만들어줘', '하네스 구성해줘', '하네스 구축해줘', '하네스 설계', '하네스 엔지니어링', '에이전트 팀 구성해줘', '팀 세팅해줘', 'harness 만들어줘', 'build harness', 'oh-my-harness', and — when a project already has a harness — '구현해줘', '개발해줘', '작업 시작'."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness — Router (BE / FE)

This skill is a **thin router**. It scans the project to decide whether it is a backend or a frontend, then delegates the actual harness build to the `harness-be` (backend) or `harness-fe` (frontend) sub-skill.

**Previously this skill produced the core 6 agents directly, but that baked backend assumptions like NestJS/DDD/Hex into the core agent prompts.** Detection now happens first, and the detected project type plus concrete evidence (framework / architecture / ORM / test stack) is injected into the agent prompts.

## Language Policy

**All user-facing output must be in Korean.** This file is written in English for token efficiency (Claude reads it as instructions), but anything the end user sees — `AskUserQuestion` text, progress messages, error messages, final summaries, CLAUDE.md blocks written into the project — must be rendered in natural Korean.

- Claude-directed instructions in this file: English.
- Embedded Korean strings marked `<!-- user-facing -->`: literal templates, never translate.
- Frontmatter `description` Korean triggers: literal, never translate.
- When you narrate progress to the user or write a summary, translate to natural Korean first — do not surface English reasoning text directly.

## Core Principles

1. **Detect project type first** — read backend / frontend signals from package.json or other manifest files.
2. **Ask the user when ambiguous** — full-stack projects require the user to declare intent.
3. **Delegate to a sub-skill once detected** — actual harness build is owned by `harness-be` or `harness-fe`.
4. **Both paths can be offered** — for full-stack projects, run BE first, then FE in sequence.

## Invocation Patterns

| Input | Behavior |
|------|------|
| `/oh-my-harness:harness` | Auto-detect → delegate to sub-skill |
| `/oh-my-harness:harness {feature}` | Detect + delegate + work on the feature |
| `/oh-my-harness:harness-be` / `/oh-my-harness:harness-fe` (direct invocation) | Bypass router, run the sub-skill directly |

## Workflow

### Phase 0: Check for existing harness

Read the project's `.claude/agents/` and `CLAUDE.md`. If a `<!-- harness-fingerprint v1 -->` block exists, you can already tell which side it is:

- `skill: harness-be` present → re-invoke `harness-be` (maintenance mode)
- `skill: harness-fe` present → re-invoke `harness-fe` (maintenance mode)
- Both present → ask the user which one to maintain and call the matching sub-skill

If no fingerprint is found, proceed to Phase 1.

### Phase 1: Project type detection

Collect backend and frontend signals from the project root.

**Backend signals:**

| Signal | Weight |
|---|---|
| `package.json` contains `@nestjs/*`, `express`, `fastify`, `koa`, `hono`, `@trpc/server` | +3 |
| `pyproject.toml` / `requirements.txt` contains `fastapi`, `flask`, `django`, `starlette` | +3 |
| `go.mod` exists + `gin` / `echo` / `fiber` import | +3 |
| `build.gradle(.kts)` / `pom.xml` contains `spring-boot`, `micronaut`, `quarkus` | +3 |
| `Gemfile` contains `rails` | +3 |
| `composer.json` contains `laravel/framework` | +3 |
| `nest-cli.json` exists | +2 |
| `migrations/`, `prisma/schema.prisma`, `ormconfig.*` exist | +1 |
| `controller/` / `service/` / `repository/` directories repeat | +1 |

**Frontend signals:**

| Signal | Weight |
|---|---|
| `package.json` contains `react` + `react-dom` (without `next`, `remix`, `gatsby`) | +3 |
| `package.json` contains `vue` (and no Nuxt) | +3 |
| `package.json` contains `@angular/core` + `angular.json` | +3 |
| `package.json` contains `svelte` (and no SvelteKit) | +3 |
| `package.json` contains `solid-js` | +3 |
| `next` + `next.config.*` | +4 (full-stack signal) |
| `nuxt` + `nuxt.config.*` | +4 (full-stack signal) |
| `@sveltejs/kit` + `svelte.config.*` | +4 (full-stack signal) |
| `@remix-run/*` | +4 (full-stack signal) |
| `vite.config.*` configures a React/Vue/Svelte plugin | +2 |
| `src/components/`, `components/`, `app/pages/` etc. component directories | +1 |
| `.storybook/` exists | +1 |

### Phase 2: Branch decision

Sum the scores and decide.

| Situation | Action |
|---|---|
| BE score ≥ 3 AND FE score < 3 | **Delegate to harness-be** |
| FE score ≥ 3 AND BE score < 3 | **Delegate to harness-fe** |
| BE score ≥ 3 AND FE score ≥ 3 (full-stack) | Confirm via AskUserQuestion (see below) |
| BE score < 3 AND FE score < 3 (insufficient signal) | Empty project — ask the user about intent |

**Full-stack confirmation prompt:**

<!-- user-facing (Korean, do not translate) -->
```
이 프로젝트는 백엔드와 프론트엔드 시그널이 모두 감지되었습니다.
어떤 관점으로 하네스를 구축할까요?

[1] Backend 먼저 (harness-be) — 이후 harness-fe로 확장 가능
[2] Frontend 먼저 (harness-fe) — 이후 harness-be로 확장 가능
[3] 둘 다 순차 실행 — harness-be → harness-fe 연달아 (권장: 진짜 풀스택 모노레포)
[4] 이 번에는 {하나만} — 나머지는 나중에
```
<!-- /user-facing -->

### Phase 3: Sub-skill delegation

Run the sub-skill matching the chosen path. Use the Skill tool to invoke one of:

- `skill: "oh-my-harness:harness-be"` (forward the user's feature argument if any)
- `skill: "oh-my-harness:harness-fe"` (same)

**When the user picks "both" in full-stack**: run harness-be first. After harness-be completes, run harness-fe. harness-fe's Phase 0 will detect the existing harness-be fingerprint and operate in "second-harness extension mode" — it will not overwrite the existing core 6 agents and leaders, and will only add frontend-specific agents (ui-reviewer, a11y-auditor, etc.) and skills. The fingerprint block records both skills.

```markdown
<!-- harness-fingerprint v1 -->
skill: harness-be, harness-fe  # when both have been run
...
<!-- /harness-fingerprint -->
```

### Phase 4: Empty project handling

If BE score < 3 AND FE score < 3 AND there are almost no source files, treat it as a brand-new project. AskUserQuestion:

<!-- user-facing (Korean, do not translate) -->
```
프로젝트가 비어있거나 시그널이 부족합니다. 어떤 종류의 프로젝트를 만들고 싶으신가요?

[1] Backend (NestJS, FastAPI, Spring, Go 등) → harness-be
[2] Frontend (React SPA, Next.js, Vue/Nuxt 등) → harness-fe
[3] 풀스택 (둘 다) → harness-be + harness-fe 순차
[4] 나중에 — 지금은 하네스 빌드 안 함
```
<!-- /user-facing -->

Run the chosen sub-skill based on the answer. In an empty project the sub-skill may follow up with a tech-stack question to the user (e.g., "NestJS / Express / Fastify?").

---

## Execution constraints

- This router skill **must not generate the core 6 agents or the leaders directly**. Agent generation belongs entirely to the sub-skills.
- `<Project_Context>` injection logic, detection trees, and prompt templates all live under the sub-skills' references/.
- The router's decision logic only chooses which sub-skill receives control — the criteria are defined here, but detailed detection is repeated by the sub-skill itself.

## Routing matrix summary

| Detection result | Delegate to |
|---|---|
| Backend signals dominant | `harness-be` |
| Frontend signals dominant | `harness-fe` |
| Full-stack — user picks "BE first" | `harness-be` → optional follow-up `harness-fe` |
| Full-stack — user picks "FE first" | `harness-fe` → optional follow-up `harness-be` |
| Full-stack — user picks "both" | `harness-be` → `harness-fe` in sequence |
| Empty project — user picks "Backend" | `harness-be` |
| Empty project — user picks "Frontend" | `harness-fe` |
| Empty project — user picks "later" | Exit (no harness build) |

## References

- Backend harness builder: `../harness-be/SKILL.md`
- Frontend harness builder: `../harness-fe/SKILL.md`
- Shared references (repeated module detection, domain term extraction, agent design patterns): `references/` in this directory

### State of the references/ directory

The existing reference documents in this directory are still imported and used by the sub-skills:

- `references/model-selection-protocol.md` — **sequential model-selection flow for the core 6 agents** — must be Read by harness-be / harness-fe in Phase 2
- `references/project-analysis-protocol.md` — repeated module detection, domain term extraction (§3) — reused by harness-be / harness-fe detection protocols
- `references/agent-design-patterns.md` — agent design principles
- `references/skill-generation-guide.md`, `references/skill-writing-guide.md` — skill authoring guides
- `references/orchestrator-template.md` — orchestrator template
- `references/harness-examples.md` — harness examples
- `references/qa-agent-guide.md` — QA agent guide

These files are not used directly by this router skill, but harness-be and harness-fe import them, so they must not be deleted.
