---
name: tdd
description: "Agent team orchestrator that implements features via TDD (Test-Driven Development). The tdd-leader coordinates an architect→test-engineer→executor→code-reviewer→security-reviewer→debugger team to drive Red-Green-Refactor cycles automatically. Triggers: 'TDD로 구현해줘', 'tdd', '테스트 먼저 작성하고 구현해줘', '테스트 주도로 개발해줘', 'Red-Green-Refactor', '레드 그린 리팩터', '기능 구현해줘', '이거 만들어줘', 'tdd로 작업', 'TDD 워크플로우', 'test-first', '테스트 퍼스트'. Use aggressively when the project has a harness in place and the user requests new feature implementation."
allowed-tools: Read Glob Grep Bash Agent
---

# TDD Orchestrator

A TDD (Red-Green-Refactor) pipeline orchestrator powered by an agent team.

The tdd-leader agent assembles the team and spawns specialized agents appropriate to each TDD phase, performing test-driven development automatically.

## Language Policy

**All user-facing output must be in Korean.** This file is written in English for token efficiency (Claude reads it as instructions), but anything the end user sees — `AskUserQuestion` text, progress messages, final summaries, reports — must be rendered in natural Korean.

- Claude-directed instructions in this file: English.
- Embedded Korean strings marked `<!-- user-facing -->`: literal templates, never translate.
- Frontmatter `description` Korean triggers: literal, never translate.
- When you narrate progress to the user, translate to natural Korean first.

## CRITICAL RULES — DO NOT VIOLATE

1. **This skill is a DISPATCHER only.** Gather project information, spawn tdd-leader via the Agent tool, and report results. That is all.
2. **Do not perform TDD phases yourself.** Do not write tests, implement code, conduct code review, or run security checks directly.
3. **You MUST invoke the Agent tool to spawn tdd-leader.** Do not read the prompt and execute it yourself.
4. If the tdd-leader agent definition is missing, instruct the user to first build the agent team via `/oh-my-harness:harness`.

## Invocation Patterns

| Input | Action |
|-------|--------|
| `/oh-my-harness:tdd {feature}` | Run the TDD pipeline |
| "TDD로 {feature} 구현해줘" | Run the TDD pipeline |
| "이거 구현해줘" (when harness exists) | Run the TDD pipeline |

## Execution Mode: Agent Team

tdd-leader creates a team via TeamCreate, then spawns specialized agents individually via the Agent tool at each stage and runs them sequentially.

```
                    ┌─────────────┐
                    │ 🎯 tdd-leader │  ← creates the team, observes, coordinates, decides
                    └──────┬──────┘
           ┌───────┬───────┼───────┬────────┬─────────┐
           │       │       │       │        │         │
      🏛 architect  🧪 test-   ⚡ executor 🔍 code-  🛡 security- 🐛 debugger
                engineer         reviewer reviewer
```

## Staged Pipeline

```
tdd-analyze → tdd-red → tdd-green → tdd-refactor → tdd-verify
                                         ↑                |
                                         └── tdd-fix ←────┘
```

| Stage | Agent | Role | Gate |
|-------|-------|------|------|
| tdd-analyze | 🏛 architect | Design analysis, identify impacted files | Interface/file list exists |
| tdd-red | 🧪 test-engineer | Write failing tests | All tests FAIL |
| tdd-green | ⚡ executor | Minimal code to pass tests | All tests PASS |
| tdd-refactor | 🔍 code-reviewer → ⚡ executor | Code review then refactor | Tests still PASS |
| tdd-verify | 🛡 security-reviewer + 🐛 debugger | Security check + full verification | Build/test/typecheck PASS |
| tdd-fix | 🐛 debugger + ⚡ executor | Repair loop on failure | Max 3 iterations |

## Workflow

### Phase 0: Pre-flight Check

1. Confirm harness exists — verify the core agents are present in `.claude/agents/`.
2. If the harness is absent, instruct the user:
   <!-- user-facing (Korean, do not translate) -->
   먼저 `/oh-my-harness:harness`로 에이전트 팀을 구축해주세요.
   <!-- /user-facing -->
3. Parse the feature request — extract the feature description from user input.
4. Check for an existing `.tdd/` workspace:
   - Absent → fresh run
   - Present + same feature → re-run (referencing existing handoffs)
   - Present + different feature → move `.tdd/` to `.tdd_{timestamp}/`, then start fresh

### Phase 1: Project Information Gathering

The skill collects project information before spawning tdd-leader.

**Step 1: Read the harness fingerprint first**

First, locate the `<!-- harness-fingerprint v1 -->` block in `CLAUDE.md` and Read it. If the block exists, extract the following fields:

| Field | Source |
|-------|--------|
| `skill` | `skill: harness-be` or `skill: harness-fe` |
| `framework` | `framework:` line |
| `architecture_style` (backend) | `architecture_style:` line |
| `meta_framework` / `rendering_model` (frontend) | each line |
| `test_stack` | `test_stack:` line |
| `build_tool` (frontend) | `build_tool:` line |
| `extra_agents` | `extra_agents:` line (comma-separated) |

This information is required by tdd-leader to make spawn decisions (e.g., which specialists to launch in the RED phase).

**Step 2: Detection fallback when fingerprint is absent**

If the fingerprint block is missing (legacy harness or hand-built project), detect minimal information using:

| Information | Detection Method |
|-------------|------------------|
| Tech stack | `package.json` dependencies, `tsconfig.json`, `nest-cli.json`, etc. |
| Test framework | `vitest.config.*`, `jest.config.*`, `package.json` scripts |
| Build command | `package.json` scripts.build |
| Test command | `package.json` scripts.test |
| Existing test patterns | `__tests__/`, `*.spec.ts`, `*.test.ts` glob |
| Available agents | Agent listing in `.claude/agents/` |

In this case, inform tdd-leader with "fingerprint missing, running backend-default pipeline" and you may advise the user to upgrade the harness via `/oh-my-harness:harness-be` or `/oh-my-harness:harness-fe`.

### Phase 2: Spawn tdd-leader

**You MUST invoke the Agent tool to spawn tdd-leader. Do not read the prompt and execute it yourself.**

Agent tool call parameters:

| Parameter | Value |
|-----------|-------|
| subagent_type | `"tdd-leader"` |
| model | `"opus"` |
| prompt | Fill in the template below |

Prompt template:
```
다음 기능을 TDD 파이프라인으로 구현해주세요.

## 기능 요청
{user's feature description}

## Harness Fingerprint (from CLAUDE.md)
- Pipeline category: {frontend | backend} (derived from skill)
- Skill: {harness-be | harness-fe | missing}
- Framework: {framework}
- Architecture style: {architecture_style}  # backend only
- Meta-framework: {meta_framework}           # frontend only
- Rendering model: {rendering_model}         # frontend only
- Test stack: {test_stack}
- Build tool: {build_tool}                   # frontend only
- Extra agents available: {extra_agents joined}

## 프로젝트 정보
- 작업 디렉토리: {cwd}
- 빌드 명령: {detected build command}
- 테스트 명령: {detected test command}

## 사용 가능한 에이전트
{listing of agents in .claude/agents/ along with each agent's model}

## 파이프라인 지시
TDD 파이프라인 프로토콜에 따라 실행하세요. 각 Phase에서 반드시 Agent 도구로 전문 에이전트를 개별 스폰하세요.

**tdd-red Phase 스폰 집합 결정** (Pipeline category에 따라):
- category=backend → test-engineer만 스폰
- category=frontend AND extra_agents에 component-test-engineer 포함 → test-engineer + component-test-engineer 병렬 스폰
- category=frontend AND component-test-engineer 없음 → test-engineer만 스폰하고 컴포넌트 레이어도 커버하라고 지시

**tdd-refactor Phase 리뷰어 집합**:
- category=frontend → code-reviewer와 함께 ui-reviewer/a11y-auditor/perf-auditor (및 rsc-boundary-inspector가 있으면) 병렬 스폰
- category=backend → code-reviewer 단독
```

### Phase 3: Receive Result & Report

Once tdd-leader completes the full pipeline, it returns a final report. Relay it to the user.

## Error Handling

Handled inside tdd-leader. Skill-level error handling:

| Situation | Action |
|-----------|--------|
| Harness missing | Direct the user to `/oh-my-harness:harness` |
| tdd-leader spawn failure | Emit error, verify `agents/tdd-leader.md` exists |
| tdd-leader returns CIRCUIT_BREAKER | Relay failure report to user, point at `.tdd/handoffs/` |

## Output Format

Pass through tdd-leader's final report as-is:

<!-- user-facing (Korean, do not translate) -->
```
## TDD Pipeline Report

### Feature
{기능 설명}

### Result: [PASS / FAIL / CIRCUIT_BREAKER]

### Phase Summary
| Phase | Agent | Status |
|-------|-------|--------|
| Analyze | 🏛 architect | ✅ |
| Red | 🧪 test-engineer | ✅ |
| Green | ⚡ executor | ✅ |
| Refactor | 🔍 code-reviewer | ✅ |
| Security | 🛡 security-reviewer | ✅ |
| Verify | 🐛 debugger | ✅ |

### Tests: N passed, 0 failed
### Files Changed: [list]
### Review: [findings]
### Security: [findings]
```
<!-- /user-facing -->

## Follow-up Actions

After TDD completes, the user may request:
- "다시 실행해줘" → re-run referencing the existing `.tdd/` handoff
- "리팩터 더 해줘" → re-run only the tdd-refactor stage
- "테스트 추가해줘" → re-run only the tdd-red stage
- "보안 다시 확인해줘" → re-run only the tdd-security stage
