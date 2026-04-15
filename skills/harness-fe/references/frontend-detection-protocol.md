# Frontend Detection Protocol

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

Frontend detection protocol used by `harness-fe` Phase 1. Scans the project root and produces a structured detection object.

> **Principle**: Evidence-based. `react` in package.json is a necessary but not sufficient condition for `framework: react`. The presence of a meta-framework (`next`, `remix`, etc.) and the rendering model must be confirmed via config-file existence.

---

## 1. Detection fields

| Field | Possible values | Default |
|---|---|---|
| `language` | `typescript`, `javascript`, `unknown` | `unknown` |
| `framework` | `react`, `vue`, `angular`, `svelte`, `solid`, `preact`, `qwik`, `unknown` | `unknown` |
| `meta_framework` | `next`, `nuxt`, `sveltekit`, `remix`, `astro`, `gatsby`, `vite-spa`, `cra`, `angular-cli`, `none` | `none` |
| `rendering_model` | `spa`, `ssr`, `ssg`, `rsc-app-router`, `islands`, `hybrid`, `unknown` | `unknown` |
| `state_mgmt` | `redux`, `zustand`, `jotai`, `pinia`, `vuex`, `mobx`, `signals`, `context-only`, `none` | `none` |
| `styling` | `tailwind`, `styled-components`, `emotion`, `css-modules`, `vanilla-extract`, `sass`, `css`, `mixed` | `css` |
| `test_stack` | array. Elements: `vitest`, `jest`, `rtl`, `playwright`, `cypress`, `storybook-test-runner` | `[]` |
| `has_storybook` | boolean | `false` |
| `has_i18n` | boolean | `false` |
| `has_design_system` | boolean | `false` |
| `component_directory` | array of paths | `[]` |
| `component_count` | integer | `0` |
| `component_naming_pattern` | string | `""` |
| `build_tool` | `vite`, `webpack`, `turbopack`, `esbuild`, `rollup`, `next-internal`, `unknown` | `unknown` |
| `notable_files` | array of strings | `[]` |
| `test_source_ratio` | float | `0.0` |

---

## 2. Detection order

```
Step 1: Language (tsconfig presence)
Step 2: Framework (deps)
Step 3: Meta-framework (config file presence)
Step 4: Rendering model (meta + config flags)
Step 5: Build tool
Step 6: Component directory + naming + count
Step 7: State management
Step 8: Styling
Step 9: Test stack
Step 10: has_storybook / has_i18n / has_design_system flags
Step 11: Notable files
Step 12: Test-to-source ratio
```

---

## 3. Per-area detection methods

### Step 1 — Language

- `tsconfig.json` exists → `typescript`
- only `package.json` → `javascript`
- no manifest → `unknown`

### Step 2 — Framework

**Priority**: Check from top to bottom; pick the first match.

| dep (package.json) | framework |
|---|---|
| `react` + `react-dom` | `react` |
| `vue` (3.x) | `vue` |
| `@angular/core` + `angular.json` exists | `angular` |
| `svelte` | `svelte` |
| `solid-js` | `solid` |
| `preact` (alone) | `preact` |
| `@builder.io/qwik` | `qwik` |

### Step 3 — Meta-framework

After the framework is decided, confirm the meta-framework via the existence of its config file.

| Signal | meta_framework |
|---|---|
| `next` in deps AND (`next.config.js` OR `next.config.ts` OR `next.config.mjs`) | `next` |
| `nuxt` in deps AND (`nuxt.config.js` OR `nuxt.config.ts`) | `nuxt` |
| `@sveltejs/kit` in deps AND `svelte.config.js` | `sveltekit` |
| `@remix-run/*` in deps | `remix` |
| `astro` in deps AND `astro.config.*` | `astro` |
| `gatsby` in deps AND `gatsby-config.*` | `gatsby` |
| `vite` in devDeps AND `vite.config.*` AND `react`/`vue`/`svelte`/`solid` plugin config exists AND none of the above matched | `vite-spa` |
| `react-scripts` in deps | `cra` |
| `@angular/cli` + `angular.json` | `angular-cli` |
| None of the above | `none` |

### Step 4 — Rendering model

`rendering_model` is decided by `meta_framework` plus extra config checks.

| meta_framework | Extra condition | rendering_model |
|---|---|---|
| `next` | `app/` directory exists | `rsc-app-router` |
| `next` | no `app/`, only `pages/` | `ssr` |
| `nuxt` | default | `ssr` |
| `nuxt` | `ssr: false` in `nuxt.config.ts` | `spa` |
| `sveltekit` | default | `ssr` |
| `sveltekit` | every `+page.*` has `prerender = true` | `ssg` |
| `remix` | default | `ssr` |
| `astro` | default (`output: 'static'`) | `ssg` |
| `astro` | `output: 'server'` or `'hybrid'` | `islands` |
| `gatsby` | default | `ssg` |
| `vite-spa` | default | `spa` |
| `cra` | default | `spa` |
| `angular-cli` | default | `spa` |
| `none` | — | `unknown` |

### Step 5 — Build tool

| Signal | build_tool |
|---|---|
| `next` meta_framework + `turbo: true` in config | `turbopack` |
| `next` meta_framework, no turbo | `next-internal` (webpack-based) |
| `vite` in devDeps + `vite.config.*` | `vite` |
| `webpack` in devDeps + `webpack.config.*` | `webpack` |
| `rollup.config.*` exists | `rollup` |
| `esbuild` in devDeps | `esbuild` |
| No match | `unknown` |

### Step 6 — Component directory, count, naming

1. Priority candidate paths: `src/components/`, `components/`, `app/`, `src/views/`, `src/pages/`, `pages/`.
2. Check each candidate via `Glob`. If it exists and contains component files (`.tsx`/`.jsx`/`.vue`/`.svelte`), add it to `component_directory`.
3. `component_count` = total number of detected component files.
4. `component_naming_pattern`:
   - mostly `{Name}.tsx` form → `"PascalCase.tsx per component"`
   - `{name}/index.tsx` form → `"directory-per-component (index.tsx)"`
   - `{Name}/{Name}.tsx` → `"directory + component file"`
   - mixed → `"mixed"`

### Step 7 — State management

| dep | state_mgmt |
|---|---|
| `@reduxjs/toolkit` OR `redux` | `redux` |
| `zustand` | `zustand` |
| `jotai` | `jotai` |
| `pinia` | `pinia` |
| `vuex` | `vuex` |
| `mobx` OR `mobx-react` | `mobx` |
| `@preact/signals` OR `signals-react` | `signals` |
| None of the above and grep for `React.createContext` returns ≥ 3 | `context-only` |
| Nothing at all | `none` |

### Step 8 — Styling

| Signal | styling |
|---|---|
| `tailwindcss` in devDeps + `tailwind.config.*` | `tailwind` |
| `styled-components` in deps | `styled-components` |
| `@emotion/react` in deps | `emotion` |
| Many `*.module.css` or `*.module.scss` files | `css-modules` |
| `@vanilla-extract/css` in deps | `vanilla-extract` |
| `sass` OR many `*.scss` files | `sass` |
| Only plain `*.css` files | `css` |
| Two or more of the above | `mixed` |

### Step 9 — Test stack

**Collected as an array** — combinations are allowed. Check in order.

| Signal | Element to add |
|---|---|
| `vitest` in devDeps + `vitest.config.*` | `vitest` |
| `jest` in devDeps + `jest.config.*` | `jest` |
| `@testing-library/react` OR `@testing-library/vue` OR `@testing-library/svelte` in devDeps | `rtl` |
| `@playwright/test` in devDeps + `playwright.config.*` | `playwright` |
| `cypress` in devDeps + `cypress.config.*` | `cypress` |
| `@storybook/test-runner` in devDeps | `storybook-test-runner` |

Example result: `[vitest, rtl, playwright]`

### Step 10 — Flags

| Flag | Decision |
|---|---|
| `has_storybook` | `.storybook/` directory exists OR `storybook` in devDeps |
| `has_i18n` | one of `next-intl`, `react-i18next`, `i18next`, `vue-i18n`, `react-intl`, `@lingui/*` is in deps |
| `has_design_system` | `packages/ui/` exists OR `design-system/` directory OR an internal `@{org}/ui-*` package detected |

### Step 11 — Notable files

1. Entry points (`app/layout.tsx`, `pages/_app.tsx`, `src/main.tsx`, `src/App.tsx`, `app/page.tsx`, etc.)
2. Top 3 most-imported components
3. The single largest component file (usually core UI)

### Step 12 — Test-to-source ratio

```
test_source_ratio = count(Glob "**/*.{spec,test}.{ts,tsx,js,jsx,vue,svelte}") / count(source component/util files)
```

---

## 4. Asking the user when ambiguous

- **`framework == unknown` and multiple framework signals in deps**: e.g., both `react` and `vue` present. Use AskUserQuestion to confirm the primary framework.
- **`rendering_model == unknown`**: when `meta_framework` is `none` and there are not enough hints for `ssr`/`ssg`/`spa`. Ask the user.
- **`meta_framework == vite-spa` but an SSR plugin is present** (`vite-plugin-ssr`, `@vitejs/plugin-ssr`, etc.): confirm SSR vs SPA.

Example question:

<!-- user-facing (Korean, do not translate) -->
```
이 프로젝트의 렌더링 방식은?
[1] SPA (순수 클라이언트)
[2] SSR (서버 사이드 렌더링)
[3] SSG (정적 사이트 생성)
[4] RSC (React Server Components)
[5] Islands (부분 hydration)
[6] Hybrid (페이지별 선택)
```
<!-- /user-facing -->

---

## 5. Output examples

**Next.js 15 App Router (RSC) + Tailwind + Zustand project:**
```yaml
language: typescript
framework: react
meta_framework: next
rendering_model: rsc-app-router
state_mgmt: zustand
styling: tailwind
test_stack: [vitest, rtl, playwright]
has_storybook: true
has_i18n: false
has_design_system: false
component_directory: [app/, components/]
component_count: 47
component_naming_pattern: "PascalCase.tsx per component"
build_tool: turbopack
notable_files: [app/layout.tsx, app/(shop)/page.tsx, components/ui/Button.tsx]
test_source_ratio: 0.34
```

**Pure React SPA (Vite) + CSS Modules + context-only state:**
```yaml
language: typescript
framework: react
meta_framework: vite-spa
rendering_model: spa
state_mgmt: context-only
styling: css-modules
test_stack: [vitest, rtl]
has_storybook: false
has_i18n: false
has_design_system: false
component_directory: [src/components/]
component_count: 23
component_naming_pattern: "directory-per-component (index.tsx)"
build_tool: vite
notable_files: [src/main.tsx, src/App.tsx, src/components/layout/index.tsx]
test_source_ratio: 0.41
```

**Nuxt 3 + Pinia + Vue-i18n:**
```yaml
language: typescript
framework: vue
meta_framework: nuxt
rendering_model: ssr
state_mgmt: pinia
styling: tailwind
test_stack: [vitest]
has_storybook: false
has_i18n: true
has_design_system: false
component_directory: [components/, pages/]
component_count: 31
component_naming_pattern: "PascalCase.vue per component"
build_tool: vite
notable_files: [app.vue, pages/index.vue, components/TheHeader.vue]
test_source_ratio: 0.18
```

This struct is fed directly into Phase 3's Project_Context injection.
