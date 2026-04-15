<p align="center">
  <img src="assets/logo.png" alt="oh-my-harness" width="720"/>
</p>

<p align="center">
  <b>A Claude Code plugin that analyzes your project and auto-builds a tailored agent team</b>
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ・ <a href="README.ko.md">🇰🇷 한국어</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.1-blue.svg" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license"/>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-purple.svg" alt="claude code plugin"/>
</p>

<br/>

---

<br/>

### What is a "harness"?

Originally, a *harness* is the set of **straps, reins, and gear you put on a horse** — the tack that lets a rider hold a powerful animal in place and steer it toward useful work. The word crossed into engineering as a metaphor: a **test harness** is the wiring of inputs, stubs, and assertions that lets a unit run in isolation. The same idea spread to **evaluation harnesses** for ML models (e.g. `lm-evaluation-harness`), and in the LLM era it reappeared as the **agent harness** — the prompts, tools, and guardrails that hold an LLM in place while it does real work.

**oh-my-harness** takes that last meaning one step further. Instead of dropping in a generic agent scaffold, it **scans your project first**, detects the stack and architecture, and then builds a scaffold **tailored to the evidence it found** — a team of specialized agents where each one only carries the context it actually needs. The horse is still the LLM; the harness is now cut to the shape of *your* project.

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
- 🚪 **User-gated skill synthesis** — skills are not pre-baked from a fixed matrix; the harness proposes evidence-based candidates with domain-derived names, and **only the ones you approve** get created (zero is a valid answer) *(new in v1.0.1)*
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

### How Codex delegation works

Picking "Codex" as an agent's model doesn't replace Claude outright — it turns the agent into a **Claude Sonnet orchestrator with a scoped `Bash(codex exec --full-auto)` permission**. Claude still drives: it reads the files, plans the change, writes the prompt, decides when to hand off, and reviews what comes back. Only the raw *"write the code"* step is delegated to the local Codex CLI (GPT-5.4), which runs on your machine against the same filesystem.

Concretely:

- **Reasoning stays with Claude.** Architecture judgment, test interpretation, constraint checks, and review are all handled by Claude (Opus or Sonnet, your choice at harness-build time).
- **Code generation is handed off to Codex.** Steps like *"implement this function"* or *"make this failing test pass"* are dispatched via `codex exec --full-auto`, and the diff flows back into the conversation for Claude to integrate.
- **No Codex installed? Graceful fallback.** If `codex` isn't on the `PATH`, the agent silently falls back to pure Claude Sonnet — the harness still works, you just lose the specialized coder.

That's why `test-engineer`, `executor`, and `debugger` are listed as *"Model: Codex"* above: they are **Claude-driven agents that call Codex as a tool** for the generation step, not Codex-native agents. You get Claude's reasoning on one side and Codex's code-writing on the other, stitched together inside a single agent turn.

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
│ Core 6 + Conditional Specialists │  Core 6 are always generated;
│                                  │  specialists are added only when
│                                  │  their detection condition fires
│                                  │  (e.g. Hexagonal → domain-expert,
│                                  │   RSC → rsc-boundary-inspector)
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Skill Candidates → User Gate     │  proposes 0–4 project-specific skill
│                                  │  candidates with domain-derived names
│                                  │  (e.g. `order-field-sync`, never
│                                  │   `migration-check`); only the ones
│                                  │  you approve are written. Zero is OK.
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ CLAUDE.md Fingerprint            │  detection result recorded so that
│                                  │  tdd/implement skills can reuse it
└──────────────────────────────────┘
```

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

### Project-Specific Skills (Opt-in) *(new in v1.0.1)*

Earlier versions auto-generated a fixed set of skills like `migration-check`, `a11y-check`, `bundle-budget` for every project. The problem: those names are too generic to actually trigger, and most users never called them.

Now skills go through a **user-approval gate**:

1. The harness scans your project and proposes **up to 4 candidates**, each with a domain-derived name pulled from your real modules, components, or routes — e.g. `order-field-sync`, `checkout-form-a11y-audit`, `payment-webhook-scaffold`.
2. Each candidate explains **why it was proposed** (which directory pattern triggered it), its **trigger keywords**, and the **context that will be injected** into its body (real file paths, real imports).
3. You select 0–N of them via `AskUserQuestion`. **Zero is a normal outcome** — if nothing fits, no skill is created and the build still succeeds. The Core 6 + leaders + conditional specialists are always there.
4. Only approved candidates get written, with their bodies populated by real file paths, real import patterns, and your project's actual domain vocabulary.

Generic names like `migration-check` or `a11y-check` are explicitly **rejected at the candidate stage** — if a name would work in any other project of the same stack, it's too generic for yours.

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
│   └── skills/                        # opt-in via user gate; may be empty
│       └── {your-domain-skill}/       # e.g. order-field-sync (only if approved)
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
