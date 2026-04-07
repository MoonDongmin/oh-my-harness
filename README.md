# oh-my-harness

**Say "harness", get a team.** One command turns Claude Code into a coordinated multi-agent engineering team.

```
> harness build for my NestJS project

Analyzing project... NestJS + DDD/Hexagonal detected.

 # Agent              Role              Model
 1 architect          Design & Analysis  Opus
 2 test-engineer      TDD Tests          Codex
 3 executor           Implementation     Codex
 4 code-reviewer      Code Review        Opus
 5 security-reviewer  Security Audit     Opus
 6 debugger           Root Cause Fix     Codex
 + domain-expert      DDD Validation     Opus  (auto-generated)

Harness ready. Ask me anything.
```

## Why

Claude Code is powerful, but one agent doing design, implementation, testing, review, security, and debugging at once leads to bloated context and inconsistent quality.

**oh-my-harness** fixes this:

- **Separation of concerns** — each agent has a single responsibility and enforced boundaries
- **Multi-model orchestration** — Claude Opus for reasoning, Codex (GPT-5.4) for coding, or your own choice
- **Project-aware generation** — analyzes your stack and auto-generates additional agents (e.g., `domain-expert` for DDD projects)
- **One-time setup, persistent team** — harness config lives in `.claude/`, survives across sessions

## Agents

oh-my-harness creates 6 core agents, each with distinct permissions and specialization:

### architect

> *"Every claim must be traceable to specific code."*

The strategic advisor. Analyzes architecture, diagnoses root causes, and provides DDD/Hexagonal guidance. **READ-ONLY** — never touches your code, only reads and recommends with `file:line` evidence.

- Evaluates domain layer purity, port/adapter boundaries, aggregate consistency
- 3-failure circuit breaker: if 3+ fix attempts fail, questions the architecture instead of trying variations
- **Model: Opus** (deep reasoning)

### test-engineer

> *"No production code without a failing test first."*

The TDD enforcer. Writes failing tests *before* any implementation exists. Tests become the executable specification that the executor must satisfy.

- RED phase specialist — writes tests, runs them, confirms they all FAIL
- One test per behavior, descriptive names: `"returns empty array when no users match filter"`
- **Model: Codex** (code generation)

### executor

> *"A small correct change beats a large clever one."*

The implementer. Writes the minimum code to pass tests. No over-engineering, no scope creep, no "while I'm here" refactors.

- Classifies tasks as Trivial / Scoped / Complex, adjusts effort accordingly
- Matches existing codebase patterns (naming, error handling, imports)
- Runs build + test verification before claiming completion
- **Model: Codex** (code generation)

### code-reviewer

> *"Spec compliance first, style nitpicks second."*

The quality gate. Performs severity-rated review (CRITICAL / HIGH / MEDIUM / LOW) with concrete fix suggestions. Checks spec compliance *before* code quality.

- Evaluates logic correctness, SOLID principles, error handling, anti-patterns
- Clear verdicts: APPROVE, REQUEST CHANGES, or COMMENT
- Also notes positive observations to reinforce good practices
- **READ-ONLY** | **Model: Opus** (deep reasoning)

### security-reviewer

> *"One vulnerability can cause real financial losses."*

The security specialist. Evaluates all OWASP Top 10 categories, scans for hardcoded secrets, and audits dependencies.

- Prioritizes by: severity x exploitability x blast radius
- Provides secure code examples in the same language
- Covers: injection, auth/authz, XSS, SSRF, sensitive data exposure
- **READ-ONLY** | **Model: Opus** (deep reasoning)

### debugger

> *"Fix the root cause, not the symptom."*

The minimal-fix specialist. Traces bugs to their root cause and applies the smallest possible change.

- Reproduces before investigating, reads error messages completely
- One hypothesis at a time, one fix at a time (< 5% of affected file)
- 3-failure circuit breaker: after 3 failed hypotheses, escalates instead of guessing
- **Model: Codex** (code generation)

### Auto-generated agents

Beyond the core 6, harness analyzes your project and creates additional agents as needed:

| Condition | Agent | Role |
|-----------|-------|------|
| 5+ modules | `planner` | Task decomposition & planning |
| Complex requirements | `analyst` | Requirements & gap analysis |
| Multi-agent output | `critic` | Cross-validation & quality gates |
| Frontend included | `ui-reviewer` | UI/UX review |
| DDD/Hexagonal project | `domain-expert` | Domain model validation |

## How it works

```
User: "harness"
  |
  v
[1] Keyword Detection
    UserPromptSubmit hook detects "harness" keyword
  |
  v
[2] Project Analysis
    Scans tech stack, directory structure, existing patterns
    Detects NestJS/DDD/Hexagonal automatically
  |
  v
[3] Model Selection
    User picks model per agent (Opus / Sonnet / Codex / Custom)
  |
  v
[4] Agent Team Generation
    Core 6 + auto-generated agents -> .claude/agents/
    Orchestrator skill -> .claude/skills/
    Harness context -> CLAUDE.md
  |
  v
[5] Ready
    "API endpoints for UserService" -> orchestrator routes to
    architect -> test-engineer -> executor -> code-reviewer -> security-reviewer
```

### Output structure

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── architect.md
│   │   ├── test-engineer.md
│   │   ├── executor.md
│   │   ├── code-reviewer.md
│   │   ├── security-reviewer.md
│   │   ├── debugger.md
│   │   └── {auto-generated}.md
│   └── skills/
│       └── {orchestrator}/
│           └── SKILL.md
└── CLAUDE.md  # harness context registered
```

## Installation

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [Codex CLI](https://github.com/openai/codex) (optional — falls back to Claude Sonnet if not installed)

### From GitHub

```bash
/plugin marketplace add MoonDongmin/oh-my-harness
/plugin install oh-my-harness
```

### Local (development)

```bash
git clone https://github.com/MoonDongmin/oh-my-harness.git
cd oh-my-harness
bun install

# Install plugin in Claude Code
claude plugins:install /path/to/oh-my-harness
```

## Usage

### Build a harness

Open Claude Code in **any project** and type:

```
harness                                          # Korean/English keyword
/oh-my-harness:harness                           # slash command
/oh-my-harness:harness UserService CRUD          # build + start working
```

### Verify changes

```
verify                                           # keyword
/oh-my-harness:verify                            # slash command
```

### All commands

| Command | Description |
|---------|-------------|
| `/oh-my-harness:harness` | Build agent team for project |
| `/oh-my-harness:verify` | Verify changes (test, build, typecheck) |
| `/oh-my-harness:help` | Show help |

### Korean keywords

| Keyword | Skill |
|---------|-------|
| harness, build harness | harness |
| verify, check | verify |

## Model options

Each agent's model is chosen during harness build:

| Option | Model | Best for |
|--------|-------|----------|
| **[O] Opus** | Claude Opus 4.6 | Deep reasoning, analysis, review |
| **[S] Sonnet** | Claude Sonnet 4.6 | Fast responses, balanced |
| **[C] Codex** | GPT-5.4 via Codex CLI | Code generation, implementation |
| **[X] Custom** | Your choice | Any provider/model |

## Project structure

```
oh-my-harness/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest
│   └── marketplace.json         # Marketplace registry
├── agents/                      # Core 6 agent templates
│   ├── architect.md
│   ├── test-engineer.md
│   ├── executor.md
│   ├── code-reviewer.md
│   ├── security-reviewer.md
│   └── debugger.md
├── skills/
│   ├── harness/                 # Harness builder skill
│   │   ├── SKILL.md
│   │   └── references/
│   └── verify/                  # Verification skill
│       └── SKILL.md
├── hooks/
│   └── hooks.json               # Keyword detection hook
├── scripts/
│   ├── keyword-detector.mjs     # KR/EN keyword -> skill trigger
│   └── lib/stdin.mjs
├── commands/
│   ├── harness.md
│   ├── verify.md
│   └── help.md
└── CLAUDE.md
```

## Credits

Built on ideas from two open-source projects:

- **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)** — Core 6 agent definitions, keyword detection hooks, verify skill
- **[harness](https://github.com/revfactory/harness)** — Harness meta-skill, reference documents (agent design patterns, orchestrator templates)

## License

MIT
