# Frontend Detection Protocol

`harness-fe` Phase 1에서 사용하는 프론트엔드 감지 프로토콜. 프로젝트 루트를 스캔해 구조화된 감지 객체를 산출한다.

> **원칙**: 증거 기반. `react` in package.json은 `framework: react`의 필요조건일 뿐 충분조건이 아니다. meta-framework(`next`·`remix` 등) 여부와 rendering 모델은 반드시 설정 파일 존재로 확인한다.

---

## 1. 감지 대상 필드

| 필드 | 가능한 값 | 기본값 |
|---|---|---|
| `language` | `typescript`, `javascript`, `unknown` | `unknown` |
| `framework` | `react`, `vue`, `angular`, `svelte`, `solid`, `preact`, `qwik`, `unknown` | `unknown` |
| `meta_framework` | `next`, `nuxt`, `sveltekit`, `remix`, `astro`, `gatsby`, `vite-spa`, `cra`, `angular-cli`, `none` | `none` |
| `rendering_model` | `spa`, `ssr`, `ssg`, `rsc-app-router`, `islands`, `hybrid`, `unknown` | `unknown` |
| `state_mgmt` | `redux`, `zustand`, `jotai`, `pinia`, `vuex`, `mobx`, `signals`, `context-only`, `none` | `none` |
| `styling` | `tailwind`, `styled-components`, `emotion`, `css-modules`, `vanilla-extract`, `sass`, `css`, `mixed` | `css` |
| `test_stack` | 배열. 요소: `vitest`, `jest`, `rtl`, `playwright`, `cypress`, `storybook-test-runner` | `[]` |
| `has_storybook` | boolean | `false` |
| `has_i18n` | boolean | `false` |
| `has_design_system` | boolean | `false` |
| `component_directory` | 경로 배열 | `[]` |
| `component_count` | 정수 | `0` |
| `component_naming_pattern` | 문자열 | `""` |
| `build_tool` | `vite`, `webpack`, `turbopack`, `esbuild`, `rollup`, `next-internal`, `unknown` | `unknown` |
| `notable_files` | 문자열 배열 | `[]` |
| `test_source_ratio` | float | `0.0` |

---

## 2. 감지 순서

```
Step 1: Language (tsconfig 여부)
Step 2: Framework (deps)
Step 3: Meta-framework (설정 파일 존재)
Step 4: Rendering model (meta + 설정 플래그)
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

## 3. 영역별 감지 방법

### Step 1 — Language

- `tsconfig.json` 존재 → `typescript`
- `package.json`만 존재 → `javascript`
- 매니페스트 없음 → `unknown`

### Step 2 — Framework

**우선순위**: 위에서부터 검사, 처음 매칭되는 것을 선택.

| dep (package.json) | framework |
|---|---|
| `react` + `react-dom` | `react` |
| `vue` (3.x) | `vue` |
| `@angular/core` + `angular.json` 존재 | `angular` |
| `svelte` | `svelte` |
| `solid-js` | `solid` |
| `preact` (단독) | `preact` |
| `@builder.io/qwik` | `qwik` |

### Step 3 — Meta-framework

Framework가 결정된 뒤, 메타 프레임워크를 설정 파일 존재로 확인.

| 시그널 | meta_framework |
|---|---|
| `next` in deps AND (`next.config.js` OR `next.config.ts` OR `next.config.mjs`) | `next` |
| `nuxt` in deps AND (`nuxt.config.js` OR `nuxt.config.ts`) | `nuxt` |
| `@sveltejs/kit` in deps AND `svelte.config.js` | `sveltekit` |
| `@remix-run/*` in deps | `remix` |
| `astro` in deps AND `astro.config.*` | `astro` |
| `gatsby` in deps AND `gatsby-config.*` | `gatsby` |
| `vite` in devDeps AND `vite.config.*` AND `react`/`vue`/`svelte`/`solid` plugin 설정 존재 AND 위 어느 것도 아님 | `vite-spa` |
| `react-scripts` in deps | `cra` |
| `@angular/cli` + `angular.json` | `angular-cli` |
| 위 어느 것도 아님 | `none` |

### Step 4 — Rendering model

meta_framework에 따라 rendering_model이 결정되거나, 추가 설정 확인.

| meta_framework | 추가 조건 | rendering_model |
|---|---|---|
| `next` | `app/` 디렉토리 존재 | `rsc-app-router` |
| `next` | `app/` 없고 `pages/`만 존재 | `ssr` |
| `nuxt` | 기본 | `ssr` |
| `nuxt` | `nuxt.config.ts`에 `ssr: false` | `spa` |
| `sveltekit` | 기본 | `ssr` |
| `sveltekit` | 모든 `+page.*`가 `prerender = true` | `ssg` |
| `remix` | 기본 | `ssr` |
| `astro` | 기본(`output: 'static'`) | `ssg` |
| `astro` | `output: 'server'` or `'hybrid'` | `islands` |
| `gatsby` | 기본 | `ssg` |
| `vite-spa` | 기본 | `spa` |
| `cra` | 기본 | `spa` |
| `angular-cli` | 기본 | `spa` |
| `none` | — | `unknown` |

### Step 5 — Build tool

| 시그널 | build_tool |
|---|---|
| `next` meta_framework, `turbo: true` in config | `turbopack` |
| `next` meta_framework, turbo 없음 | `next-internal` (webpack 기반) |
| `vite` in devDeps + `vite.config.*` | `vite` |
| `webpack` in devDeps + `webpack.config.*` | `webpack` |
| `rollup.config.*` 존재 | `rollup` |
| `esbuild` in devDeps | `esbuild` |
| 매칭 없음 | `unknown` |

### Step 6 — Component directory, count, naming

1. 우선순위 경로 후보: `src/components/`, `components/`, `app/`, `src/views/`, `src/pages/`, `pages/`.
2. 각 후보를 `Glob`으로 확인. 존재하고 컴포넌트 파일(`.tsx`/`.jsx`/`.vue`/`.svelte`)이 있으면 `component_directory`에 추가.
3. `component_count` = 감지된 모든 컴포넌트 파일 수.
4. `component_naming_pattern`:
   - `{Name}.tsx` 형태가 대부분 → `"PascalCase.tsx per component"`
   - `{name}/index.tsx` 형태 → `"directory-per-component (index.tsx)"`
   - `{Name}/{Name}.tsx` → `"directory + component file"`
   - 혼재 → `"mixed"`

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
| 위 없음, `React.createContext` 사용 grep 결과 ≥ 3 | `context-only` |
| 전혀 없음 | `none` |

### Step 8 — Styling

| 시그널 | styling |
|---|---|
| `tailwindcss` in devDeps + `tailwind.config.*` | `tailwind` |
| `styled-components` in deps | `styled-components` |
| `@emotion/react` in deps | `emotion` |
| `*.module.css` OR `*.module.scss` 파일 다수 | `css-modules` |
| `@vanilla-extract/css` in deps | `vanilla-extract` |
| `sass` OR `*.scss` 파일 다수 | `sass` |
| 플레인 `*.css` 파일만 존재 | `css` |
| 위 중 2개 이상 | `mixed` |

### Step 9 — Test stack

**배열로 수집** — 조합 가능. 순서대로 검사.

| 시그널 | 추가 요소 |
|---|---|
| `vitest` in devDeps + `vitest.config.*` | `vitest` |
| `jest` in devDeps + `jest.config.*` | `jest` |
| `@testing-library/react` OR `@testing-library/vue` OR `@testing-library/svelte` in devDeps | `rtl` |
| `@playwright/test` in devDeps + `playwright.config.*` | `playwright` |
| `cypress` in devDeps + `cypress.config.*` | `cypress` |
| `@storybook/test-runner` in devDeps | `storybook-test-runner` |

예시 결과: `[vitest, rtl, playwright]`

### Step 10 — 플래그

| 플래그 | 판정 |
|---|---|
| `has_storybook` | `.storybook/` 디렉토리 존재 OR `storybook` in devDeps |
| `has_i18n` | `next-intl`, `react-i18next`, `i18next`, `vue-i18n`, `react-intl`, `@lingui/*` 중 하나라도 in deps |
| `has_design_system` | `packages/ui/` 존재 OR `design-system/` 디렉토리 OR `@{org}/ui-*` 내부 패키지 감지 |

### Step 11 — Notable files

1. 엔트리포인트 (`app/layout.tsx`, `pages/_app.tsx`, `src/main.tsx`, `src/App.tsx`, `app/page.tsx` 등)
2. 가장 많이 import되는 상위 3개 컴포넌트
3. 가장 큰 컴포넌트 파일 1개 (보통 core UI)

### Step 12 — Test-to-source ratio

```
test_source_ratio = count(Glob "**/*.{spec,test}.{ts,tsx,js,jsx,vue,svelte}") / count(소스 컴포넌트/유틸 파일)
```

---

## 4. 애매한 경우 사용자 확인

- **framework == unknown이고 dep에 multiple 프레임워크 시그널**: 예) `react` + `vue` 둘 다 있음. AskUserQuestion으로 주 프레임워크 확인.
- **rendering_model == unknown**: meta_framework가 `none`이고 `ssr`/`ssg`/`spa` 힌트가 부족할 때. 사용자에게 질문.
- **meta_framework == vite-spa이지만 SSR 플러그인 존재** (`vite-plugin-ssr`, `@vitejs/plugin-ssr` 등): SSR vs SPA 확인.

질문 예시:
```
이 프로젝트의 렌더링 방식은?
[1] SPA (순수 클라이언트)
[2] SSR (서버 사이드 렌더링)
[3] SSG (정적 사이트 생성)
[4] RSC (React Server Components)
[5] Islands (부분 hydration)
[6] Hybrid (페이지별 선택)
```

---

## 5. 출력 예시

**Next.js 15 App Router (RSC) + Tailwind + Zustand 프로젝트:**
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

**순수 React SPA (Vite) + CSS Modules + context-only state:**
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

이 구조체가 Phase 3의 Project_Context 주입에 그대로 사용된다.
