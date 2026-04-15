# Frontend Prompt Injection Guide

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

Rules for `harness-fe` Phase 3, where detection results are injected into agent prompts. Same structure as the `harness-be` injection guide, but with frontend-specific fields.

---

## 1. Injection point

Insert a `<Project_Context>` section immediately before the closing `</Agent_Prompt>` tag of each neutralized base agent file. The base prompt's `<Role>` already contains the marker "If a `<Project_Context>` block appears below, its contents are authoritative".

---

## 2. Common field serialization

```xml
<Project_Context>
  <!-- injected by harness-fe at {date} — authoritative -->
  Skill: harness-fe
  Language: {language}
  Framework: {framework}
  Meta-framework: {meta_framework}{" (" + rendering_model + ")"}
  Rendering model: {rendering_model}
  State management: {state_mgmt}
  Styling: {styling}
  Test stack: {test_stack.join(", ")}
  Build tool: {build_tool}
  Has Storybook: {has_storybook}
  Has i18n: {has_i18n}
  Has design system: {has_design_system}

  Component directory: {component_directory.join(", ")}
  Component count: {component_count}
  Component naming pattern: {component_naming_pattern}
  Notable files: {notable_files.join(", ")}
  Test-to-source ratio: {test_source_ratio}

  Analytical lens for this project: component-based frontend{" with " + rendering_model if applicable}
</Project_Context>
```

---

## 3. Per-agent additional injection

### architect

```xml
  ### architect specifics
  Architectural concerns to prioritize:
  - Component boundaries and Single Responsibility per component
  - Prop contract stability and hygiene (no god-props, no prop drilling deeper than 2 levels without justification)
  - State colocation (state belongs as close to its consumer as possible)
  - {if rendering_model includes 'rsc' or 'ssr': "Server/Client Component boundary: minimize 'use client', keep data fetching on the server, prevent server-only modules from entering the client bundle"}
  - {if state_mgmt != 'none': "Store shape and slice boundaries: " + state_mgmt + " conventions"}
  - Accessibility as a first-class concern (WCAG 2.2 AA)
  - Core Web Vitals budget (LCP < 2.5s, INP < 200ms, CLS < 0.1)
  - Bundle budget: initial compressed payload ideally ≤ 150KB

  Do NOT analyze this project through a DDD/Hexagonal lens. It is a component-based UI project.
```

### test-engineer

```xml
  ### test-engineer specifics
  Test runner: {test_stack.includes('vitest') ? 'vitest' : test_stack.includes('jest') ? 'jest' : 'unknown'}
  Component test library: {test_stack.includes('rtl') ? '@testing-library/*' : 'unknown'}
  E2E: {test_stack.includes('playwright') ? 'playwright' : test_stack.includes('cypress') ? 'cypress' : 'none'}
  Story tests: {test_stack.includes('storybook-test-runner') ? 'storybook test-runner + play functions' : 'n/a'}

  Test layer strategy for a frontend project (testing diamond):
  - Pure functions, hooks, utils → unit tests (vitest/jest) — YOU own this layer
  - Component behavior, user interactions → component tests (RTL + vitest, or RTL + jest) — OWNED BY `component-test-engineer` if that agent exists; otherwise you own it
  - Critical user flows → E2E (playwright/cypress) — you may write these but keep them focused
  - Visual regression (Playwright screenshots, Storybook play) → optional, not a RED gate

  In the RED phase, write failing tests using the EXACT directory layout and naming that the existing tests use. Do NOT introduce a new test framework.
```

### executor

```xml
  ### executor specifics
  Dev command: {discovered — e.g., "bun run dev", "pnpm dev", "npm run dev"}
  Build command: {discovered — e.g., "bun run build", "next build", "vite build"}
  Test command: {discovered — e.g., "vitest", "playwright test"}
  Lint/format: {discovered — e.g., "biome check", "eslint + prettier"}
  Import alias: {discovered from tsconfig paths — e.g., "@/components/* → src/components/*"}

  Styling idiom: {styling}
  - tailwind → use utility classes; do not introduce new CSS files
  - styled-components / emotion → use existing styled helpers; don't mix with CSS Modules
  - css-modules → one .module.css per component; don't introduce global CSS
  - (etc.)

  When scaffolding a new component, match the existing naming pattern: {component_naming_pattern}
```

### code-reviewer

```xml
  ### code-reviewer specifics
  Frontend review priorities (on top of generic code quality):
  - Component SRP: each component has one reason to change
  - Prop hygiene: no god-props, explicit prop types, no boolean flag soup
  - State management: no duplicated state, no derived state stored in state, memoization only when measurably needed
  - Render cost: unnecessary re-renders, missing memoization for expensive children, inline object/array props
  - {if state_mgmt != 'none': "Store access patterns: " + state_mgmt + " selectors used correctly, no full-store subscriptions"}
  - {if rendering_model includes 'rsc': "'use client' directive is placed only where interactivity is required, server modules never imported into client components"}
  - Accessibility: semantic HTML, ARIA roles only where needed, keyboard navigability, focus management on route/dialog changes, color contrast
  - Bundle impact: no accidental large imports (date-fns whole library vs individual functions, moment vs dayjs, etc.)
  - a11y and perf are **blocking** issues if CRITICAL/HIGH severity, not "nice to have"

  Framework-specific anti-patterns:
  - react → useEffect chains that should be derived state; setState in render; missing dependency arrays
  - next (app router) → 'use client' at page level when a single leaf needs it; server data in client props
  - vue/nuxt → reactivity loss (destructuring refs); overuse of watch; missing key on v-for
  - svelte → reactive statements with side effects; missing {#each} keys
```

### security-reviewer

```xml
  ### security-reviewer specifics
  Threat model weight (client-side runtime = {framework}/{meta_framework}):
  - XSS (reflected, stored, DOM): HIGH — verify output escaping, `dangerouslySetInnerHTML` guards, URL-handling attrs
  - CSP misconfiguration: HIGH — check for inline scripts, unsafe-eval, missing nonce on inline
  - CSRF: MEDIUM — only relevant if cookie-based auth; check SameSite + Origin header
  - DOM clobbering: MEDIUM — id/name overrides leaking into globals
  - Supply-chain risk: MEDIUM-HIGH — npm audit, socket.dev, postinstall scripts in deps
  - Secrets in client bundle: HIGH — grep bundle/build output for env vars that leaked (NEXT_PUBLIC_* is intentional, others are bugs)
  - Clickjacking: LOW-MEDIUM — X-Frame-Options / CSP frame-ancestors
  - postMessage origin check: HIGH if iframe/window communication exists

  {if rendering_model includes 'rsc' or 'ssr': "Server Actions (Next.js): validate every input, authenticate every mutation, rate-limit. RSC → Client leaks: ensure server-only modules have 'server-only' import guard."}

  Secrets scan targets: .env*, next.config.*, nuxt.config.*, vite.config.*, public/* (no keys should live here)
```

### debugger

```xml
  ### debugger specifics
  Reproduce UI bugs via:
  1. Start dev server: {dev command}
  2. Open the affected page in a real browser (Chrome/Firefox)
  3. Open DevTools: Console, Network, React/Vue DevTools, Accessibility tree
  4. Capture the error message, network failures, and component state at the moment of failure

  Common error patterns for {framework}:
  - react → "Warning: Can't perform a React state update on an unmounted component" → missing cleanup in useEffect
  - react → "Hydration failed" → server/client render mismatch (date formatting, random IDs, conditional rendering based on window)
  - next app-router → "Functions cannot be passed directly to Client Components" → server-only data being serialized into client props
  - vue → "Extraneous non-props attributes" → missing `inheritAttrs: false` on multi-root components
  - svelte → "Element is not reactive" → destructured store without `$` prefix
```

---

## 4. Leader injection

Same as `harness-be`. Inject only common fields, no per-agent specifics. Instead, inject an "Extra agents available" list under `### leader specifics` so the leader can decide who to spawn.

```xml
  ### leader specifics
  Extra agents available in this project: ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer{", storybook-guardian" if has_storybook}{", state-architect" if state_mgmt in [redux,zustand,jotai,pinia,mobx]}{", i18n-reviewer" if has_i18n}{", design-system-guardian" if has_design_system}{", rsc-boundary-inspector" if rendering_model in [ssr, rsc-app-router, hybrid, islands]}
  Skills available in this project: a11y-check, bundle-budget, component-scaffold, ui-workflow{", story-sync" if has_storybook}{", visual-regression" if test_stack includes 'playwright'}
```

The leader uses this list to decide which specialists to spawn during `work-review`/`tdd-red` phases. In a project generated by `harness-fe`, backend specialists (`domain-expert`, `api-specialist`, `data-engineer`) are not in the list, so the leader does not spawn them.

---

## 5. Specialist agent injection

The 4 mandatory frontend specialists and the 5 conditional ones have templates defined in `references/frontend-agents-catalog.md`. `harness-fe` reads each template from the catalog, fills the template variables (`{framework}`, `{rendering_model}`, `{component_directory}`, `{notable_files}`) with Phase 1 detection results, and saves the file to `{project}/.claude/agents/{agent-name}.md`.

**Key principle**: inject **the actual component paths, the detected styling system, and the test_stack actually in use** into each specialist's prompt. Never generate a generic "React expert" prompt.

---

## 6. Handling injection failure and idempotency

Same as the `harness-be` injection guide. Do not hide `unknown` values — inject them as-is. The fingerprint block guarantees re-run idempotency.
