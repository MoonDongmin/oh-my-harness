---
name: harness-fe
description: "프론트엔드 프로젝트 전용 하네스 빌더. React/Vue/Angular/Svelte 등 프로젝트를 스캔해 framework/meta_framework/rendering_model/state/styling/test_stack/has_storybook/has_i18n을 감지하고, 코어 6 + 리더 2 + 프론트엔드 필수 4종(ui-reviewer/a11y-auditor/perf-auditor/component-test-engineer) + 조건부 전문가를 생성한다. (1) '프론트엔드 하네스 만들어줘', 'harness-fe', 'frontend harness' 요청 시, (2) Next.js/Nuxt/SvelteKit/Remix/Vite SPA 등 프론트엔드 프로젝트에서 팀 세팅 요청 시, (3) 기존 하네스를 프론트엔드 관점으로 재구성할 때, (4) 라우터 스킬(harness)이 FE로 분기했을 때 자동 호출."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness-FE — Frontend Agent Team Builder

프론트엔드 프로젝트에 맞는 에이전트 팀을 구축한다. **핵심 원칙**: React/Vue/Next/Nuxt 같은 특정 프레임워크를 전제하지 않는다. 프로젝트를 먼저 스캔해 framework/meta_framework/rendering_model/state_mgmt/styling/test_stack/has_storybook 등을 감지하고, 감지된 증거를 에이전트 프롬프트에 주입한다.

**이 스킬의 주요 책임:**
1. 프론트엔드 프로젝트를 스캔해 구조화된 감지 객체 생성
2. 코어 6 에이전트 + 리더 2를 `<Project_Context>` 주입과 함께 생성
3. 프론트엔드 필수 4종 에이전트(ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer) 생성
4. 감지 결과에 따라 조건부 전문가(storybook-guardian, state-architect, i18n-reviewer, design-system-guardian, rsc-boundary-inspector) 합성
5. 프론트엔드 스킬 생성 (ui-workflow, a11y-check, bundle-budget, component-scaffold, story-sync)
6. CLAUDE.md에 `harness-fingerprint` 블록 등록

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:harness-fe` | 프론트엔드 감지 → 하네스 빌드 |
| `/oh-my-harness:harness-fe {기능}` | 빌드 + 해당 기능 작업 시작 |
| 라우터(`/oh-my-harness:harness`)에서 FE 분기 | 동일 |

## 2026 프론트엔드 품질 게이트

이 스킬이 생성하는 에이전트·스킬은 다음 2026 표준을 기본값으로 한다:

1. **Accessibility (a11y)는 배포 게이트** — WCAG 2.2 AA, axe 자동 검사, 키보드 네비게이션, 의미론적 HTML. 옵션이 아니다.
2. **Core Web Vitals** — LCP < 2.5s, INP < 200ms, CLS < 0.1. 실제 사용자 측정(RUM) 권장.
3. **번들 예산** — 초기 compressed payload ≤ 150KB, PR당 번들 증가 ≤ 5%가 일반적 게이트.
4. **테스팅 다이아몬드** — 단순 유닛 피라미드가 아니다. component/integration 레이어가 가장 두껍고, 유닛은 순수 로직·훅·유틸에 집중, E2E는 핵심 플로우에만 집중, 시각 회귀(Playwright screenshots, Storybook play)는 안정화된 UI에 적용.
5. **RSC/Client 경계 위생** (Next.js App Router, Nuxt 3, SvelteKit 등 SSR/RSC 환경) — `'use client'` 최소화, 서버 전용 모듈이 client bundle로 leak되지 않음, hydration mismatch 방지.

## 워크플로우

### Phase 0: 기존 하네스 확인

`harness-be`와 동일한 로직. `.claude/agents/`·`.claude/skills/`·`CLAUDE.md`를 읽는다. `<!-- harness-fingerprint v1 -->` 블록이 있으면 기존 감지 결과 확인.

### Phase 1: Frontend Detection

`references/frontend-detection-protocol.md`의 감지 트리 실행. 결과 구조:

```yaml
language: typescript | javascript | unknown
framework: react | vue | angular | svelte | solid | preact | qwik | unknown
meta_framework: next | nuxt | sveltekit | remix | astro | gatsby | vite-spa | cra | angular-cli | none
rendering_model: spa | ssr | ssg | rsc-app-router | islands | hybrid | unknown
state_mgmt: redux | zustand | jotai | pinia | vuex | mobx | signals | context-only | none
styling: tailwind | styled-components | emotion | css-modules | vanilla-extract | sass | css | mixed
test_stack: [vitest, rtl, playwright, cypress, storybook-test-runner]  # 배열 — 조합 가능
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

**감지 원칙**은 harness-be와 동일 — 증거 기반, 매칭 실패 시 `unknown`, 복수 근거 요구. 상세는 `references/frontend-detection-protocol.md`.

### Phase 2: 모델 선택 질문

기존 `skills/harness/SKILL.md`의 Phase 1-1 로직 재사용 (코어 6 순차 AskUserQuestion, 리더 2는 Opus 고정).

### Phase 3: 에이전트 생성 (감지 주입)

`harness-be`와 동일한 3단계 절차(Read base → Serialize context → Insert before `</Agent_Prompt>`). 공통 필드는 프론트엔드 감지 구조체를 그대로 직렬화한다.

주입된 `<Project_Context>` 예시 (architect.md):

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

상세 주입 규칙: `references/frontend-prompt-injection-guide.md`.

### Phase 4: 프론트엔드 조건부 에이전트

**필수 4종** (항상 또는 거의 항상 생성):

| 에이전트 | 조건 | 역할 |
|---|---|---|
| `ui-reviewer` | 항상 생성 | 컴포넌트 SRP·prop drilling·상태 leak·Server/Client 경계. 기존 `code-reviewer`가 놓치는 컴포넌트 아키텍처 전담. |
| `a11y-auditor` | 항상 생성 | WCAG 2.2 AA, ARIA 역할, 키보드 네비게이션, 포커스 관리, 의미론적 HTML, 색 대비. axe 활용. |
| `perf-auditor` | `build_tool ≠ unknown` | Core Web Vitals(LCP/INP/CLS), 번들 예산, 렌더 최적화, 과도한 client bundle 감지. |
| `component-test-engineer` | `test_stack`에 `rtl` 또는 `playwright` 또는 `storybook-test-runner` 포함 | RTL/Playwright Component/Storybook play 테스트 전담. 기존 `test-engineer`가 순수 로직·훅 담당. |

**동적 생성** (감지 결과 기반):

| 조건 | 에이전트 | 역할 |
|---|---|---|
| `has_storybook == true` | `storybook-guardian` | 스토리가 spec 역할을 하는지, play 함수 커버리지, 컴포넌트 변경 시 스토리 동기화 |
| `state_mgmt ∈ {redux, zustand, jotai, pinia, mobx}` AND store 파일 ≥ 3 | `state-architect` | 스토어 분할, selector 패턴, 불필요한 re-render 감지 |
| `has_i18n == true` | `i18n-reviewer` | 번역 키 누락, 복수형 처리, RTL 언어 지원 |
| `has_design_system == true` OR `packages/ui` 존재 | `design-system-guardian` | 토큰 일관성, 컴포넌트 재사용, variant 드리프트 |
| `rendering_model ∈ {ssr, rsc-app-router, hybrid, islands}` | `rsc-boundary-inspector` | RSC/Client 경계 위생, `'use client'` 최소화, 서버 전용 모듈 유출 감지, hydration mismatch 방지 |

각 에이전트의 프롬프트 템플릿은 `references/frontend-agents-catalog.md`에 정의. harness-fe는 카탈로그에서 템플릿을 Read하고 Phase 1 감지 결과를 주입해 최종 에이전트 파일을 생성한다.

### Phase 5: 프론트엔드 스킬 생성

| 조건 | 스킬 | 용도 |
|---|---|---|
| 항상 | `a11y-check` | 변경된 컴포넌트에 대한 a11y 감사 워크플로우 (axe + 수동 키보드 체크) |
| `build_tool ≠ unknown` | `bundle-budget` | 빌드 후 번들 사이즈 게이트 검사 (초기 payload, chunk 별 크기, PR 델타) |
| `component_directory` 존재 AND 반복 패턴 감지 | `component-scaffold` | 프로젝트 컨벤션 따라 새 컴포넌트 스캐폴딩 |
| 항상 | `ui-workflow` | 구현 → ui-reviewer → a11y-auditor → perf-auditor 파이프라인 오케스트레이터 |
| `has_storybook == true` | `story-sync` | 컴포넌트 변경 시 스토리 동기화 |
| `test_stack`에 `playwright` 포함 | `visual-regression` | Playwright screenshot 기반 시각 회귀 게이트 |

### Phase 6: CLAUDE.md + Fingerprint 등록

`harness-be`와 동일한 형식. fingerprint 블록:

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
skills_generated: a11y-check, bundle-budget, component-scaffold, ui-workflow, story-sync
<!-- /harness-fingerprint -->
```

### Phase 7: 기능 작업 (선택적)
### Phase 8: 유지보수

`harness-be`와 동일.

---

## 산출물 체크리스트

- [ ] `{프로젝트}/.claude/agents/` — 코어 6 + 리더 2 + 프론트엔드 필수 4 + 감지된 조건부 전문가
- [ ] 모든 에이전트에 `<Project_Context>` 블록이 주입됨
- [ ] 프론트엔드 전용 에이전트 프롬프트에 실제 컴포넌트 경로·파일명·디렉토리 구조 명시
- [ ] `{프로젝트}/.claude/skills/` — 프론트엔드 스킬 3-5개
- [ ] `{프로젝트}/CLAUDE.md` — 하네스 컨텍스트 + `<!-- harness-fingerprint v1 -->` 블록
- [ ] architect.md에 "DDD", "Hexagonal", "NestJS", "aggregate" 같은 백엔드 용어가 등장하지 않음 (회귀 검증)

## 참고

- 프론트엔드 감지 프로토콜: `references/frontend-detection-protocol.md`
- 프롬프트 주입 가이드: `references/frontend-prompt-injection-guide.md`
- 프론트엔드 에이전트 카탈로그: `references/frontend-agents-catalog.md`
- 반복 모듈 감지: `../harness/references/project-analysis-protocol.md` §3 재사용
- 에이전트 설계 패턴: `../harness/references/agent-design-patterns.md`
