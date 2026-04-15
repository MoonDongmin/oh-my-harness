<p align="center">
  <img src="assets/logo.png" alt="oh-my-harness" width="720"/>
</p>

<p align="center">
  <b>A Claude Code plugin that analyzes your project and auto-builds a tailored agent team</b><br/>
  <sub>프로젝트를 분석하고, 맞춤 에이전트 팀을 자동으로 구축하는 Claude Code 플러그인</sub>
</p>

<p align="center">
  <a href="#english">🇺🇸 English</a> ・ <a href="#한국어">🇰🇷 한국어</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license"/>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-purple.svg" alt="claude code plugin"/>
</p>

<br/>

---

<br/>

## English

<br/>

### In one line

> **Say "harness", get a team.**
>
> Scans your project to detect framework, architecture, and test stack, then **injects that evidence directly into agent prompts** to build a project-tailored agent team. No DDD/Hex/NestJS baked in — those lenses only activate when the actual code says so.

<br/>

### Why

Claude Code is powerful, but one agent doing design, implementation, testing, review, security, and debugging all at once leads to bloated context and inconsistent quality.

**oh-my-harness** fixes this:

- 🎯 **Separation of concerns** — each agent has a single responsibility and enforced boundaries
- 🤝 **Multi-model orchestration** — Claude Opus for reasoning, Codex (GPT-5.4) for coding, or your own choice
- 🔍 **Project-aware generation** — analyzes your stack and auto-generates conditional specialists (e.g., `domain-expert` only when Hexagonal is detected)
- 💾 **One-time setup, persistent team** — harness config lives in `.claude/`, survives across sessions
- 🎨 **Detection → Injection architecture** — framework and architecture style are not pre-baked; they are detected at runtime and injected via a `<Project_Context>` block *(new in v1.0.0)*

<br/>

### Quick Start

**1. Install the plugin**

```bash
/plugin marketplace add MoonDongmin/oh-my-harness
/plugin install oh-my-harness
```

<br/>

**2. Codex CLI (optional, recommended)**

```bash
npm install -g @openai/codex
codex login
```

Without Codex CLI, coding agents fall back to Claude Sonnet.

<br/>

**3. Build a harness in your project**

```
/oh-my-harness:harness
```

Auto-detects project type and delegates to `harness-be` (backend) or `harness-fe` (frontend). You can also invoke them directly:

```
/oh-my-harness:harness-be     # backend-only
/oh-my-harness:harness-fe     # frontend-only
```

<br/>

### Commands

| Command | Description |
|---------|-------------|
| `/oh-my-harness:harness` | **Router** — auto-detects BE/FE and delegates |
| `/oh-my-harness:harness-be` | Backend harness builder (framework/architecture/ORM detection) |
| `/oh-my-harness:harness-fe` | Frontend harness builder (framework/rendering/a11y/perf detection) |
| `/oh-my-harness:tdd` | TDD team pipeline (Red → Green → Refactor, category-aware) |
| `/oh-my-harness:implement` | General team implementation (refactoring, migration, structural change) |
| `/oh-my-harness:verify` | Verify changes (build, tests, typecheck) |
| `/oh-my-harness:help` | Help |

<br/>

### Core 6 Agents

Each agent has distinct permissions and specialization. **Their base prompts are framework-neutral; the harness injects actual project evidence via a `<Project_Context>` block at generation time.**

<br/>

#### 🏛 architect — *"Every claim must be traceable to specific code"*

Strategic advisor. Analyzes architecture and diagnoses root causes. **READ-ONLY** — never touches code, only reads and recommends with `file:line` evidence.

- Uses the lens matching the detected architecture style (hexagonal / clean / layered / mvc / modular-monolith / ...)
- 3-failure circuit breaker: if 3+ fix attempts fail, questions the architecture itself instead of trying variations
- **Model: Opus** (deep reasoning)

<br/>

#### 🧪 test-engineer — *"No production code without a failing test first"*

TDD enforcer. Writes failing tests **before** any implementation exists. Tests become the executable specification that the executor must satisfy.

- RED-phase specialist — writes tests, runs them, confirms they all FAIL
- Follows the detected `test_stack` (jest / vitest / pytest / RTL / Playwright / ...) exactly
- **Model: Codex** (code generation)

<br/>

#### ⚡ executor — *"A small correct change beats a large clever one"*

Implementer. Writes the **minimum code** to pass tests. No over-engineering, no scope creep, no "while I'm here" refactors.

- Classifies tasks as Trivial / Scoped / Complex, adjusts effort accordingly
- Matches existing codebase idioms (naming, error handling, imports)
- **Model: Codex** (code generation)

<br/>

#### 🔍 code-reviewer — *"Spec compliance first, style nitpicks second"*

Quality gate. Performs severity-rated review (CRITICAL / HIGH / MEDIUM / LOW) with concrete fix suggestions.

- Evaluates logic correctness, SOLID principles, error handling, anti-patterns
- Applies **backend criteria** (layer direction, transaction boundaries) or **frontend criteria** (component SRP, render cost, a11y) based on the injected Project_Context
- **READ-ONLY** | **Model: Opus**

<br/>

#### 🛡 security-reviewer — *"One vulnerability can cause real financial losses"*

Security specialist. Evaluates OWASP Top 10, scans for hardcoded secrets, audits dependencies.

- **Threat model weights adapt to the detected runtime** — server code prioritizes injection/SSRF/authorization; client code prioritizes XSS/CSP/DOM clobbering; RSC covers both plus Server Action validation
- Prioritizes by severity × exploitability × blast radius
- **READ-ONLY** | **Model: Opus**

<br/>

#### 🐛 debugger — *"Fix the root cause, not the symptom"*

Minimal-fix specialist. Reproduces first, hypothesizes second, fixes with the smallest possible change.

- Reproduction method auto-selected by runtime (API call / browser DevTools / test runner)
- One hypothesis at a time, one fix at a time (< 5% of affected file)
- 3-failure circuit breaker: after 3 failed hypotheses, escalates instead of guessing
- **Model: Codex**

<br/>

### Detection → Injection Architecture *(the core of v1.0.0)*

```
  /oh-my-harness:harness
          │
          ▼
  ┌───────────────────┐
  │   Router Skill    │  scan package.json → BE/FE signal scoring
  └─────────┬─────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
 harness-be   harness-fe
      │           │
      ▼           ▼
┌─────────────────────┐
│ Detection Protocol  │  framework / architecture / ORM / test stack /
│                     │  rendering model / state / a11y / bundle / ...
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Project_Context Injection        │  detected facts → <Project_Context>
│                                  │  XML block injected into each agent
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Core 6 + Conditional Specialists │  domain-expert only when Hexagonal;
│                                  │  rsc-boundary-inspector only when
│                                  │  RSC; etc.
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ CLAUDE.md Fingerprint            │  detection result recorded so that
│                                  │  tdd/implement skills can reuse it
└──────────────────────────────────┘
```

**Why?** In earlier versions, `architect.md` had "DDD/Hex/NestJS expertise" hardcoded, so a Fastify + Layered project would still be analyzed through a DDD lens. Now, `architecture_style: hexagonal` is only injected **when the `domain/ports/adapters/` directories actually exist**, and only then does the Hexagonal lens activate.

<br/>

### Auto-generated Specialist Agents

Synthesized conditionally based on detection results.

<br/>

**harness-be (backend):**

| Condition | Agent | Role |
|-----------|-------|------|
| `architecture_style ∈ {hexagonal, clean, modular-monolith}` AND domain files ≥ 5 | `domain-expert` | Domain model / invariant validation |
| `api_style ∈ {rest, graphql, grpc, trpc}` AND router files ≥ 5 | `api-specialist` | API design & contract validation |
| `data_layer ≠ none` AND migrations exist | `data-engineer` | Schema / query / migration validation |
| Docker / k8s / terraform detected | `infra-reviewer` | Infrastructure config review |
| Monorepo tooling (turbo / nx / lerna) | `monorepo-coordinator` | Cross-package impact |
| `test:source < 0.3` | `qa-agent` | Fill testing gaps |

<br/>

**harness-fe (frontend, based on 2026 quality gates):**

| Condition | Agent | Role |
|-----------|-------|------|
| **Always** | `ui-reviewer` | Component SRP, prop hygiene, state colocation |
| **Always** | `a11y-auditor` | WCAG 2.2 AA, keyboard, ARIA, semantic HTML |
| `build_tool ≠ unknown` | `perf-auditor` | Core Web Vitals, bundle budget |
| `test_stack` includes RTL / Playwright / Storybook | `component-test-engineer` | RTL / Playwright Component / Storybook play |
| `.storybook/` present | `storybook-guardian` | Story-as-spec sync |
| Redux / Zustand / Jotai / Pinia / MobX with ≥ 3 stores | `state-architect` | Store shape, selectors, re-renders |
| i18n library detected | `i18n-reviewer` | Translation keys, plurals, RTL |
| Design system detected | `design-system-guardian` | Token consistency, variant drift |
| `rendering_model ∈ {ssr, rsc-app-router, hybrid, islands}` | `rsc-boundary-inspector` | 'use client' hygiene, server module leaks |

<br/>

### Output Structure

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── architect.md               # Project_Context injected
│   │   ├── test-engineer.md
│   │   ├── executor.md
│   │   ├── code-reviewer.md
│   │   ├── security-reviewer.md
│   │   ├── debugger.md
│   │   ├── tdd-leader.md              # TDD pipeline leader
│   │   ├── team-leader.md             # General implementation leader
│   │   └── {detected specialists}.md  # conditional
│   └── skills/
│       └── {project-specific skills}/
│           └── SKILL.md
└── CLAUDE.md                          # contains <!-- harness-fingerprint v1 --> block
```

<br/>

### Model Options

Chosen per agent during harness build.

| Option | Model | Best for |
|--------|-------|----------|
| **[O] Opus** | Claude Opus 4.6 | Deep reasoning, analysis, review |
| **[S] Sonnet** | Claude Sonnet 4.6 | Fast responses, balanced |
| **[C] Codex** | GPT-5.4 via Codex CLI | Code generation, implementation |
| **[X] Custom** | Your choice | Any provider / model |

<br/>

<br/>

---

<br/>

## 한국어

<br/>

### 한마디로

> **"harness"라고 말하면 팀이 생긴다.**
>
> 프로젝트를 스캔해서 framework·architecture·test stack을 감지하고, 그 증거를 **에이전트 프롬프트에 직접 주입**해서 프로젝트 맞춤 에이전트 팀을 자동 구축한다. DDD/Hex/NestJS가 미리 박혀있지 않다 — 실제 코드가 그렇게 말할 때만 그 렌즈를 쓴다.

<br/>

### 왜 필요한가

Claude Code는 강력하지만, 에이전트 하나가 설계·구현·테스트·리뷰·보안·디버깅을 전부 하면 컨텍스트가 과부하되고 품질이 들쭉날쭉해진다.

**oh-my-harness**는 이 문제를 다음과 같이 해결한다.

- 🎯 **관심사 분리** — 각 에이전트는 단일 책임과 강제된 경계를 가진다
- 🤝 **멀티 모델 오케스트레이션** — Claude Opus는 추론, Codex(GPT-5.4)는 코딩, 또는 직접 선택
- 🔍 **프로젝트 인식 생성** — 스택을 분석해 필요한 추가 에이전트를 자동 생성 (예: 감지된 상태가 Hexagonal이면 `domain-expert`)
- 💾 **한 번 세팅, 영속 팀** — 하네스 설정은 `.claude/`에 저장되어 세션 간 유지
- 🎨 **감지 → 주입 아키텍처** — framework와 architecture style은 미리 박지 않고 런타임에 감지해서 `<Project_Context>` 블록으로 주입한다 *(v1.0.0 신규)*

<br/>

### 빠른 시작

**1. 플러그인 설치**

```bash
/plugin marketplace add MoonDongmin/oh-my-harness
/plugin install oh-my-harness
```

<br/>

**2. Codex CLI (선택, 권장)**

```bash
npm install -g @openai/codex
codex login
```

Codex CLI가 없으면 코딩 에이전트는 Claude Sonnet으로 대체된다.

<br/>

**3. 프로젝트에서 하네스 실행**

```
/oh-my-harness:harness
```

프로젝트 타입을 자동 감지해서 `harness-be`(백엔드) 또는 `harness-fe`(프론트엔드)로 위임한다. 원하면 직접 호출할 수도 있다.

```
/oh-my-harness:harness-be     # 백엔드 프로젝트 전용
/oh-my-harness:harness-fe     # 프론트엔드 프로젝트 전용
```

<br/>

### 명령어

| 명령어 | 설명 |
|--------|------|
| `/oh-my-harness:harness` | **라우터** — BE/FE 자동 감지 후 서브 스킬로 위임 |
| `/oh-my-harness:harness-be` | 백엔드 전용 하네스 빌더 (framework/architecture/ORM 감지) |
| `/oh-my-harness:harness-fe` | 프론트엔드 전용 하네스 빌더 (framework/rendering/a11y/perf 감지) |
| `/oh-my-harness:tdd` | TDD 팀 파이프라인 (Red → Green → Refactor, category-aware) |
| `/oh-my-harness:implement` | 범용 팀 구현 파이프라인 (리팩토링·마이그레이션·구조 변경) |
| `/oh-my-harness:verify` | 변경사항 검증 (빌드·테스트·타입체크) |
| `/oh-my-harness:help` | 도움말 |

<br/>

### 코어 6 에이전트

각 에이전트는 고유한 권한과 전문성을 가진다. **프롬프트는 프레임워크 중립이며, 실제 프로젝트의 증거는 하네스가 `<Project_Context>` 블록으로 주입한다.**

- **🏛 architect** — 전략 자문. 읽기 전용. 감지된 아키텍처 스타일에 맞는 렌즈 사용. Opus.
- **🧪 test-engineer** — TDD 집행자. RED 페이즈 전담. 감지된 test stack을 그대로 따른다. Codex.
- **⚡ executor** — 구현자. 최소 diff, 기존 패턴 준수. Codex.
- **🔍 code-reviewer** — 품질 게이트. 심각도 레벨. Project_Context에 따라 backend/frontend 기준 전환. READ-ONLY, Opus.
- **🛡 security-reviewer** — OWASP Top 10 + runtime 인식 위협 모델. READ-ONLY, Opus.
- **🐛 debugger** — 루트 원인 전문가. 재현 방법이 runtime에 맞춰 자동 선택. Codex.

<br/>

### 감지 → 주입 아키텍처 *(v1.0.0의 핵심)*

이전 버전에서는 `architect.md`에 "DDD/Hex/NestJS expertise"가 하드코딩되어 있어서, Fastify + Layered 프로젝트에서도 architect가 도메인 레이어를 찾아다녔다. 이제는 **실제로 `domain/ports/adapters/` 디렉토리가 있을 때만** `architecture_style: hexagonal`이 주입되고, 그 렌즈가 활성화된다.

파이프라인:

```
/oh-my-harness:harness
    → 라우터 (package.json 스캔 → BE/FE 시그널 점수)
        → harness-be 또는 harness-fe
            → Detection Protocol (framework, architecture, ORM, test stack, rendering, state, a11y 등 감지)
                → Project_Context Injection (감지된 사실을 각 에이전트의 XML 블록으로 주입)
                    → Core 6 + 조건부 전문가 (감지 조건이 매칭될 때만 생성)
                        → CLAUDE.md Fingerprint (tdd/implement 스킬이 이후 재활용)
```

<br/>

### 자동 생성 전문가 에이전트

프로젝트 감지 결과에 따라 조건부로 합성된다. 영어 섹션의 표를 참조하면 전체 조건 매트릭스를 볼 수 있다.

**harness-be**: `domain-expert`(hexagonal/clean/modular-monolith에서만), `api-specialist`, `data-engineer`, `infra-reviewer`, `monorepo-coordinator`, `qa-agent`.

**harness-fe**: 필수 4종(`ui-reviewer`, `a11y-auditor`, `perf-auditor`, `component-test-engineer`) + 조건부(`storybook-guardian`, `state-architect`, `i18n-reviewer`, `design-system-guardian`, `rsc-boundary-inspector`).

<br/>

### 모델 선택

하네스 빌드 시 각 에이전트의 모델을 사용자가 선택한다.

| 옵션 | 모델 | 적합 |
|------|------|------|
| **[O] Opus** | Claude Opus 4.6 | 깊은 추론·분석·리뷰 |
| **[S] Sonnet** | Claude Sonnet 4.6 | 빠른 응답·균형 |
| **[C] Codex** | GPT-5.4 (Codex CLI 경유) | 코드 생성·구현 |
| **[X] Custom** | 사용자 지정 | 임의 provider/model |

<br/>

<br/>

---

<br/>

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [Codex CLI](https://github.com/openai/codex) (optional — falls back to Claude Sonnet if not installed)

<br/>

## Credits

Built on ideas from two open-source projects:

- **[oh-my-claudecode](https://github.com/yeachan-heo/oh-my-claudecode)** — Core 6 agent definitions, keyword detection hooks, verify skill
- **[harness](https://github.com/revfactory/harness)** — Harness meta-skill, reference documents (agent design patterns, orchestrator templates)

<br/>

## License

MIT

<br/>
