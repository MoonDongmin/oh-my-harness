<p align="center">
  <img src="assets/logo.png" alt="oh-my-harness" width="720"/>
</p>

<p align="center">
  <b>프로젝트를 분석하고, 맞춤 에이전트 팀을 자동으로 구축하는 Claude Code 플러그인</b><br/>
  <sub>A Claude Code plugin that analyzes your project and auto-builds a tailored agent team</sub>
</p>

<p align="center">
  <a href="#한국어">🇰🇷 한국어</a> ・ <a href="#english">🇺🇸 English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license"/>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-purple.svg" alt="claude code plugin"/>
</p>

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

<br/>

#### 🏛 architect — *"모든 주장은 특정 코드로 추적 가능해야 한다"*

전략 자문. 아키텍처 분석과 루트 원인 진단을 담당한다. **READ-ONLY** — 코드를 건드리지 않고 `file:line` 증거와 함께 분석·권고만 한다.

- 감지된 아키텍처 스타일(hexagonal / clean / layered / mvc / modular-monolith 등)에 맞는 렌즈를 사용
- 3-failure 서킷 브레이커: 수정 시도 3회 실패 시 변주 대신 아키텍처 자체를 의심
- **모델: Opus** (깊은 추론)

<br/>

#### 🧪 test-engineer — *"실패하는 테스트 없이는 프로덕션 코드 없다"*

TDD 집행자. 구현보다 **먼저** 실패하는 테스트를 작성해 실행 가능한 스펙을 만든다.

- RED 페이즈 전담 — 작성 후 실행해서 전부 FAIL 확인
- 감지된 test_stack(jest / vitest / pytest / RTL / Playwright 등)을 그대로 따른다
- **모델: Codex** (코드 생성)

<br/>

#### ⚡ executor — *"작고 정확한 변경이 크고 영리한 변경을 이긴다"*

구현자. 테스트를 통과시키는 **최소 코드**만 작성한다. 과설계도, 스코프 확장도, "여기 온 김에" 리팩토링도 없다.

- Trivial / Scoped / Complex로 작업 분류해 노력 조정
- 기존 코드베이스 관용구(네이밍·에러 핸들링·import)를 그대로 따른다
- **모델: Codex** (코드 생성)

<br/>

#### 🔍 code-reviewer — *"스펙 준수가 먼저, 스타일 지적은 나중"*

품질 게이트. 심각도 레벨(CRITICAL / HIGH / MEDIUM / LOW)로 리뷰하고 구체적 수정 제안을 남긴다.

- 로직 정확성, SOLID, 에러 핸들링, 안티패턴 평가
- Project_Context에 따라 **backend는 레이어 위생·트랜잭션, frontend는 컴포넌트 경계·렌더 비용** 기준 적용
- **READ-ONLY** | **모델: Opus**

<br/>

#### 🛡 security-reviewer — *"취약점 하나가 실제 금전 손실로 이어진다"*

보안 전문가. OWASP Top 10, 하드코딩 시크릿, 의존성 감사를 수행한다.

- **감지된 runtime에 따라** 위협 모델 가중치 변경 — 서버 코드는 injection·SSRF, 클라이언트 코드는 XSS·CSP·DOM clobbering, RSC는 양쪽 + Server Action 검증
- severity × exploitability × blast radius로 우선순위
- **READ-ONLY** | **모델: Opus**

<br/>

#### 🐛 debugger — *"증상이 아니라 루트 원인을 고쳐라"*

최소 수정 전문가. 재현이 먼저, 가설이 다음, 수정은 가능한 가장 작은 변경.

- 프로젝트 runtime에 따라 재현 방법 자동 선택 (API 호출 / 브라우저 DevTools / 테스트 러너)
- 하나의 가설, 하나의 수정 (영향 파일의 5% 미만)
- 3-failure 서킷 브레이커: 3회 실패 후 에스컬레이션
- **모델: Codex**

<br/>

### 감지 → 주입 아키텍처 *(v1.0.0의 핵심)*

```
  /oh-my-harness:harness
          │
          ▼
  ┌───────────────────┐
  │   Router Skill    │  package.json 스캔 → BE/FE 시그널 점수
  └─────────┬─────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
 harness-be   harness-fe
      │           │
      ▼           ▼
┌─────────────────────┐
│ Detection Protocol  │  framework / architecture / ORM / test stack /
│                     │  rendering model / state / a11y / bundle 등 감지
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Project_Context Injection        │  감지된 사실을 <Project_Context>
│                                  │  XML 블록으로 각 에이전트에 주입
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Core 6 + Conditional Specialists │  아키텍처가 Hexagonal일 때만
│                                  │  domain-expert 생성, RSC일 때만
│                                  │  rsc-boundary-inspector 생성 등
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ CLAUDE.md Fingerprint            │  tdd/implement 스킬이 이후
│                                  │  재활용할 수 있도록 감지 결과 기록
└──────────────────────────────────┘
```

**왜 이렇게?** 이전 버전에서는 `architect.md`에 "DDD/Hex/NestJS expertise"가 하드코딩되어 있어서, Fastify + Layered 프로젝트에서도 architect가 도메인 레이어를 찾아다녔다. 이제는 **실제로 `domain/ports/adapters/` 디렉토리가 있을 때만** `architecture_style: hexagonal`이 주입되고, 그 렌즈가 활성화된다.

<br/>

### 자동 생성 전문가 에이전트

프로젝트 감지 결과에 따라 조건부로 합성된다.

<br/>

**harness-be (백엔드):**

| 조건 | 에이전트 | 역할 |
|------|---------|------|
| `architecture_style ∈ {hexagonal, clean, modular-monolith}` AND domain 파일 ≥ 5 | `domain-expert` | 도메인 모델·불변식 검증 |
| `api_style ∈ {rest, graphql, grpc, trpc}` AND 라우터 파일 ≥ 5 | `api-specialist` | API 설계·계약 검증 |
| `data_layer ≠ none` AND 마이그레이션 존재 | `data-engineer` | 스키마·쿼리·마이그레이션 검증 |
| Docker/k8s/terraform 감지 | `infra-reviewer` | 인프라 설정 리뷰 |
| 모노레포 도구 감지 (turbo/nx/lerna) | `monorepo-coordinator` | 패키지 간 영향도 |
| `test:source < 0.3` | `qa-agent` | 테스트 갭 메꾸기 |

<br/>

**harness-fe (프론트엔드, 2026 품질 게이트 기준):**

| 조건 | 에이전트 | 역할 |
|------|---------|------|
| **항상** | `ui-reviewer` | 컴포넌트 SRP·prop hygiene·상태 colocation |
| **항상** | `a11y-auditor` | WCAG 2.2 AA·키보드·ARIA·의미론적 HTML |
| `build_tool ≠ unknown` | `perf-auditor` | Core Web Vitals·번들 예산 |
| `test_stack`에 RTL/Playwright/Storybook | `component-test-engineer` | RTL/Playwright Component/Storybook play |
| `.storybook/` 존재 | `storybook-guardian` | 스토리-as-spec 동기화 |
| Redux/Zustand/Jotai/Pinia/MobX + store ≥ 3 | `state-architect` | 스토어 shape·selector·re-render |
| i18n 라이브러리 감지 | `i18n-reviewer` | 번역 키·복수형·RTL |
| 디자인 시스템 감지 | `design-system-guardian` | 토큰 일관성·variant drift |
| `rendering_model ∈ {ssr, rsc-app-router, hybrid, islands}` | `rsc-boundary-inspector` | 'use client' hygiene·서버 모듈 유출 |

<br/>

### 출력 구조

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── architect.md               # Project_Context 주입됨
│   │   ├── test-engineer.md
│   │   ├── executor.md
│   │   ├── code-reviewer.md
│   │   ├── security-reviewer.md
│   │   ├── debugger.md
│   │   ├── tdd-leader.md              # TDD 파이프라인 리더
│   │   ├── team-leader.md             # 범용 구현 리더
│   │   └── {감지된 전문가}.md         # 조건부
│   └── skills/
│       └── {프로젝트 스킬}/
│           └── SKILL.md
└── CLAUDE.md                          # <!-- harness-fingerprint v1 --> 블록 포함
```

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

See the Korean section above for the full agent description — the same descriptions apply in English.

Summary:

- **🏛 architect** — Strategic advisor. Read-only. Adapts to detected architecture style. Opus.
- **🧪 test-engineer** — TDD enforcer. RED-phase specialist. Follows detected test stack. Codex.
- **⚡ executor** — Implementer. Smallest viable diff, matches existing patterns. Codex.
- **🔍 code-reviewer** — Quality gate. Severity-rated. Context-aware checklist. Read-only. Opus.
- **🛡 security-reviewer** — OWASP Top 10 + runtime-aware threat model. Read-only. Opus.
- **🐛 debugger** — Root-cause specialist. Reproduction method adapts to runtime. Codex.

<br/>

### Detection → Injection Architecture *(core of v1.0.0)*

Previously, `architect.md` had "DDD/Hex/NestJS expertise" hardcoded, so a Fastify + Layered project would still be analyzed through a DDD lens. Now, `architecture_style: hexagonal` is only injected when `domain/ports/adapters/` directories actually exist, and only then does the Hexagonal lens activate.

The pipeline:

```
/oh-my-harness:harness
    → Router (package.json scan → BE/FE signal scoring)
        → harness-be or harness-fe
            → Detection Protocol (framework, architecture, ORM, test stack, rendering, state, a11y, etc.)
                → Project_Context Injection (evidence → <Project_Context> XML block in each agent)
                    → Core 6 + Conditional Specialists (only those whose detection conditions match)
                        → CLAUDE.md Fingerprint (tdd/implement skills reuse this later)
```

<br/>

### Auto-generated Specialist Agents

Synthesized conditionally based on detection results. See the Korean section above for the full tables.

**harness-be** synthesizes: `domain-expert` (only for hexagonal/clean/modular-monolith), `api-specialist`, `data-engineer`, `infra-reviewer`, `monorepo-coordinator`, `qa-agent`.

**harness-fe** synthesizes 4 essentials (`ui-reviewer`, `a11y-auditor`, `perf-auditor`, `component-test-engineer`) plus conditional: `storybook-guardian`, `state-architect`, `i18n-reviewer`, `design-system-guardian`, `rsc-boundary-inspector`.

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
| **[X] Custom** | Your choice | Any provider/model |

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
