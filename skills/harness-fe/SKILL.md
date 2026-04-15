---
name: harness-fe
description: "Frontend-only harness builder. Scans React / Vue / Angular / Svelte projects to detect framework / meta_framework / rendering_model / state / styling / test_stack / has_storybook / has_i18n, then generates the core 6 + 2 leaders + the 4 mandatory frontend agents (ui-reviewer / a11y-auditor / perf-auditor / component-test-engineer) + conditional specialists. Triggers: '프론트엔드 하네스 만들어줘', 'harness-fe', 'frontend harness', team setup on frontend projects (Next.js / Nuxt / SvelteKit / Remix / Vite SPA etc.), reconfiguring an existing harness from a frontend perspective, and automatic invocation when the router skill (harness) branches to FE."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness-FE — Frontend Agent Team Builder

Builds the agent team for a frontend project. **Core principle**: do not assume a specific framework like React / Vue / Next / Nuxt. Scan the project first to detect framework / meta_framework / rendering_model / state_mgmt / styling / test_stack / has_storybook etc., and inject the detected evidence into the agent prompts.

## Language Policy

**All user-facing output must be in Korean.** This file is written in English for token efficiency (Claude reads it as instructions), but anything the end user sees — `AskUserQuestion` text, progress messages, error messages, final summaries, CLAUDE.md blocks written into the project — must be rendered in natural Korean.

- Claude-directed instructions in this file: English.
- Embedded Korean strings marked `<!-- user-facing -->`: literal templates, never translate.
- Frontmatter `description` Korean triggers: literal, never translate.
- When you narrate progress to the user or write a summary, translate to natural Korean first — do not surface English reasoning text directly.

**Primary responsibilities of this skill:**
1. Scan the frontend project and produce a structured detection object
2. Generate the core 6 agents + 2 leaders with `<Project_Context>` injection
3. Generate the 4 mandatory frontend agents (ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer)
4. Conditionally compose specialists (storybook-guardian, state-architect, i18n-reviewer, design-system-guardian, rsc-boundary-inspector) based on detection
5. Derive frontend skill candidates → user approval gate → only generate the selected ones (zero is valid)
6. Register a `harness-fingerprint` block in CLAUDE.md

## Invocation Patterns

| Input | Behavior |
|------|------|
| `/oh-my-harness:harness-fe` | Frontend detection → harness build |
| `/oh-my-harness:harness-fe {feature}` | Build + start working on the feature |
| FE branch from router (`/oh-my-harness:harness`) | Same |

## 2026 Frontend Quality Gates

The agents and skills produced by this builder default to the following 2026 standards:

1. **Accessibility (a11y) is a release gate** — WCAG 2.2 AA, automated axe checks, keyboard navigation, semantic HTML. Not optional.
2. **Core Web Vitals** — LCP < 2.5s, INP < 200ms, CLS < 0.1. Real-user monitoring (RUM) recommended.
3. **Bundle budget** — initial compressed payload ≤ 150KB, bundle increase per PR ≤ 5% as a typical gate.
4. **Testing diamond** — not a plain unit-test pyramid. The component / integration layer is the thickest, units focus on pure logic / hooks / utilities, E2E focuses on critical flows only, and visual regression (Playwright screenshots, Storybook play) applies to stabilized UI.
5. **RSC / Client boundary hygiene** (Next.js App Router, Nuxt 3, SvelteKit, and other SSR / RSC environments) — minimize `'use client'`, prevent server-only modules from leaking into the client bundle, and prevent hydration mismatches.

## Workflow

### Phase 0: Check for existing harness

Same logic as `harness-be`. Read `.claude/agents/`, `.claude/skills/`, `CLAUDE.md`. If a `<!-- harness-fingerprint v1 -->` block exists, recover the previous detection result.

### Phase 1: Frontend Detection

Run the detection tree from `references/frontend-detection-protocol.md`. Result structure:

```yaml
language: typescript | javascript | unknown
framework: react | vue | angular | svelte | solid | preact | qwik | unknown
meta_framework: next | nuxt | sveltekit | remix | astro | gatsby | vite-spa | cra | angular-cli | none
rendering_model: spa | ssr | ssg | rsc-app-router | islands | hybrid | unknown
state_mgmt: redux | zustand | jotai | pinia | vuex | mobx | signals | context-only | none
styling: tailwind | styled-components | emotion | css-modules | vanilla-extract | sass | css | mixed
test_stack: [vitest, rtl, playwright, cypress, storybook-test-runner]  # array — combinations allowed
has_storybook: true | false
has_i18n: true | false
has_design_system: true | false
component_directory: "src/components/" | "app/" | "pages/" | ...
build_tool: vite | webpack | turbopack | esbuild | rollup | unknown
component_count: N
component_naming_pattern: "{Name}.tsx" | "{name}/index.tsx" | ...
notable_files: [top entry points + largest components]
test_source_ratio: 0.0
```

**Detection principles** are the same as harness-be — evidence-based, `unknown` on match failure, multiple corroborating sources required. Details in `references/frontend-detection-protocol.md`.

### Phase 2: Model-selection question (mandatory — do not skip)

**Required**: Read `../harness/references/model-selection-protocol.md` and execute the procedure inside it exactly. The sequential `AskUserQuestion` flow for the core 6 agents, the option definitions, the response-interpretation rules, the final confirmation submit, and the fixed leader values are all defined in that file.

The protocol's output `model_selection` is used in Phase 3 as each agent's frontmatter. The two leaders (`tdd-leader`, `team-leader`) are pinned to Opus without asking.

> ⚠️ **Regression guard**: an earlier version of this phase pointed to a Phase 1-1 block in `skills/harness/SKILL.md`, which became orphaned after the router refactor removed it. This phase now reads the shared reference file directly, so drift cannot recur.

### Phase 3: Agent generation (with detection injection)

Same 3-step procedure as `harness-be` (Read base → Serialize context → Insert before `</Agent_Prompt>`). Common fields are serialized straight from the frontend detection structure.

Example injected `<Project_Context>` (architect.md):

```xml
<Project_Context>
  <!-- injected by harness-fe — authoritative -->
  Skill: harness-fe
  Language: typescript
  Framework: react
  Meta-framework: next (App Router)
  Rendering model: rsc-app-router
  State management: zustand
  Styling: tailwind
  Test stack: vitest, rtl, playwright
  Build tool: turbopack
  Has Storybook: true
  Has i18n: false
  Component directory: app/, components/
  Component count: 47
  Component naming: PascalCase file per component ({Name}.tsx)

  Notable files: app/layout.tsx, app/(shop)/page.tsx, components/ui/Button.tsx

  Analytical lens for this project: component-based frontend with RSC
  - Evaluate component SRP and prop hygiene
  - Evaluate Server/Client Component boundary (minimize 'use client')
  - Evaluate server-only module leakage into client bundle
  - Evaluate a11y and Core Web Vitals as first-class concerns
</Project_Context>
```

Detailed injection rules: `references/frontend-prompt-injection-guide.md`.

### Phase 4: Frontend conditional agents

**4 mandatory agents** (always or almost-always generated):

| Agent | Condition | Role |
|---|---|---|
| `ui-reviewer` | Always | Component SRP, prop drilling, state leakage, Server/Client boundary. Owns the component-architecture concerns that the existing `code-reviewer` misses. |
| `a11y-auditor` | Always | WCAG 2.2 AA, ARIA roles, keyboard navigation, focus management, semantic HTML, color contrast. Uses axe. |
| `perf-auditor` | `build_tool ≠ unknown` | Core Web Vitals (LCP/INP/CLS), bundle budget, render optimization, detection of excessive client bundle. |
| `component-test-engineer` | `test_stack` includes `rtl` or `playwright` or `storybook-test-runner` | Owns RTL / Playwright Component / Storybook play tests. The existing `test-engineer` keeps pure logic / hooks. |

**Dynamic generation** (based on detection):

| Condition | Agent | Role |
|---|---|---|
| `has_storybook == true` | `storybook-guardian` | Whether stories act as specs, play-function coverage, story sync when components change |
| `state_mgmt ∈ {redux, zustand, jotai, pinia, mobx}` AND store files ≥ 3 | `state-architect` | Store partitioning, selector patterns, detection of unnecessary re-renders |
| `has_i18n == true` | `i18n-reviewer` | Missing translation keys, plural handling, RTL language support |
| `has_design_system == true` OR `packages/ui` exists | `design-system-guardian` | Token consistency, component reuse, variant drift |
| `rendering_model ∈ {ssr, rsc-app-router, hybrid, islands}` | `rsc-boundary-inspector` | RSC/Client boundary hygiene, minimize `'use client'`, detect server-only module leakage, prevent hydration mismatch |

Each agent's prompt template lives in `references/frontend-agents-catalog.md`. harness-fe reads templates from the catalog and injects the Phase 1 detection result to produce the final agent files.

### Phase 5: Skill generation (user approval gate)

> **Critical change**: previously `a11y-check` / `ui-workflow` were stamped out under an "always generate" policy and the rest came from a conditional matrix. That spawned generic skills the user never used. The flow is now **identical to the 6-step gate flow in harness-be Phase 5**. **Producing zero skills is a valid completion.** The "always" policy is retired.

#### Step 1 — Load the guides (mandatory)

Read both of the following files.

- `../harness/references/skill-generation-guide.md` — 5-step candidate derivation procedure + naming blocklist + user gate format (shared between backend and frontend)
- `../harness/references/skill-writing-guide.md` — body authoring principles

#### Step 2 — Derive candidates (3-stage funnel, max 4)

Follow guide §1's 5-step exploration. Frontend context:

1. **Observe**: examine the Phase 1 detection object (`component_directory`, `component_naming_pattern`, `notable_files`, `state_mgmt`, `has_storybook`, `has_i18n`, `test_stack`, `rendering_model`) and the actual component directory tree
2. **Hypothesize**: write 5–8 free-form sentences describing "tasks a person on this project would do 3+ times in a month". Example areas: adding a new component, auditing form a11y, checking a page bundle, syncing a design-token change, adding a locale, syncing story / play functions, etc.
3. **Validate**: confirm each hypothesis against 1–2 actual files. Example: the "Checkout form a11y audit" hypothesis is confirmed by checking that `app/(shop)/checkout/page.tsx` actually contains a form
4. **Name**: for each surviving hypothesis, derive the skill name **directly from component names / route names / design-token package names / page names**. Cross-check the guide §6 naming blocklist first
5. **Filter**: apply the §2 judgment criteria, then **trim to a maximum of 4**

> ⚠️ **Inline naming warning**: `a11y-check`, `ui-workflow`, `bundle-budget`, `component-scaffold`, `story-sync`, `visual-regression` — every one of these legacy matrix names is pinned in guide §6's **naming blocklist**. Reject on sight if they show up as candidates. Even if the work is the same, rename it using **this project's actual component or page names**, e.g., `checkout-form-a11y-audit`, `product-card-story-sync`, `landing-page-bundle-audit`.

#### Step 3 — User approval gate (mandatory)

Call `AskUserQuestion` (multiSelect=true). If there are zero candidates, skip this and tell the user in one line, then proceed to Phase 6.

<!-- user-facing (Korean, do not translate) -->
```
question: "이 프로젝트에서 자동 생성할 보조 스킬을 선택해줘. 0개 선택도 OK."
header:   "스킬 후보"
multiSelect: true
options: [최대 4개]
```
<!-- /user-facing -->

Each option's description must contain **all 3 elements** (guide §7) — detection evidence + trigger keywords + injected context.

<!-- user-facing (Korean, do not translate) -->
```
label: checkout-form-a11y-audit
description: "app/(shop)/checkout/ 폼 변경 시 axe 자동 감사 + 키보드 네비게이션 수동 체크.
              증거: app/(shop)/checkout/page.tsx에 6개 input, label 누락 패턴 발견.
              트리거: '체크아웃 a11y', 'checkout form 접근성', 'checkout 키보드 점검'.
              주입 컨텍스트: app/(shop)/checkout/page.tsx, components/forms/CheckoutForm.tsx."
```
<!-- /user-facing -->

#### Step 4 — Write the selected skill bodies

Generate SKILL.md only for the selected candidates. Inject the following into the body:

- At least 3 actual component file paths (`components/ui/Button.tsx`, `app/(shop)/checkout/page.tsx`, etc.)
- Actual import patterns (`import { Button } from '@/components/ui/button'`)
- Actual component naming convention (`{Name}.tsx` vs `{name}/index.tsx`)
- Actual names and roles of the relevant pages / components

Reference `references/frontend-prompt-injection-guide.md` (if present) and `../harness-be/references/backend-prompt-injection-guide.md` §8 "skill body injection rules" + §8-3 Before/After examples. The examples are backend, but the injection philosophy is identical — "if it copy-pastes into another project unchanged, it failed".

Body authoring principles: Why-First / Lean (under 500 lines) / imperative.

#### Step 5 — Provisional CLAUDE.md sync

Record only the generated skill directory tree into CLAUDE.md immediately (separate from Phase 6 fingerprint finalization). Leave it blank if zero skills were generated.

#### Step 6 — Zero case is a normal exit

If there were zero candidates or the user picked zero, advance to Phase 6 with `.claude/skills/` left empty. The build completes normally. The core 6 + 2 leaders + 4 mandatory frontend agents (ui-reviewer / a11y-auditor / perf-auditor / component-test-engineer) + conditional specialists were already created in Phases 3–4, so the harness itself is functional.

> ⚠️ **Do not force-fill**: suppress the instinct to "frontend should at least always have an a11y-check". A11y is owned by an **agent** (`a11y-auditor`), so a11y auditing is possible without a separate skill. Do not regenerate candidates the user rejected.

> **FE/BE asymmetry note**: the 4 mandatory frontend agents (ui-reviewer / a11y-auditor / perf-auditor / component-test-engineer) are a **guarantee at the agent layer**, not at the skill layer. Agents are always generated; skills are only generated after user approval. Do not conflate the two layers.

### Phase 6: CLAUDE.md + fingerprint registration (final)

Remove the provisional sync section from Phase 5 Step 5 and replace it with the final context and fingerprint block. Same shape as `harness-be`. Fingerprint block:

```markdown
<!-- harness-fingerprint v1 -->
skill: harness-fe
language: typescript
framework: react
meta_framework: next
rendering_model: rsc-app-router
state_mgmt: zustand
styling: tailwind
test_stack: vitest, rtl, playwright
build_tool: turbopack
has_storybook: true
has_i18n: false
has_design_system: false
component_directory: app/, components/
core6_agents: architect, test-engineer, executor, code-reviewer, security-reviewer, debugger
leaders: tdd-leader, team-leader
extra_agents: ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer, storybook-guardian, rsc-boundary-inspector
skills_generated: []  # only what passed the user gate. Zero is valid. Example: checkout-form-a11y-audit, product-card-story-sync
<!-- /harness-fingerprint -->
```

### Phase 7: Feature work (optional)
### Phase 8: Maintenance

Same as `harness-be`.

---

## Output checklist

- [ ] `{project}/.claude/agents/` — core 6 + 2 leaders + 4 mandatory frontend + detected conditional specialists
- [ ] Every agent contains an injected `<Project_Context>` block
- [ ] Frontend-specific agent prompts spell out actual component paths, file names, and directory structure
- [ ] `{project}/.claude/skills/` — only candidates that passed the user gate (zero is valid). If any were generated, names are derived from component / page / design-token names (no generics like `a11y-check` / `ui-workflow` / `bundle-budget`)
- [ ] Generated skill bodies inject at least 3 actual component paths / import patterns / page or component names
- [ ] `{project}/CLAUDE.md` — Phase 5 Step 5 provisional sync replaced by the final fingerprint block in Phase 6 (`skills_generated` may legitimately be an empty array)
- [ ] architect.md does not contain backend terms like "DDD", "Hexagonal", "NestJS", "aggregate" (regression check)

## References

- Frontend detection protocol: `references/frontend-detection-protocol.md`
- Prompt injection guide: `references/frontend-prompt-injection-guide.md`
- Frontend agent catalog: `references/frontend-agents-catalog.md`
- Repeated module detection: reuse §3 of `../harness/references/project-analysis-protocol.md`
- Agent design patterns: `../harness/references/agent-design-patterns.md`
