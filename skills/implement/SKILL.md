---
name: implement
description: "General-purpose implementation orchestrator powered by an agent team. The team-leader coordinates an architect→executor→code-reviewer→security-reviewer→debugger team to perform large-scale construction/refactoring/structural changes/migrations. Triggers: '팀으로 구현해줘', '에이전트 팀으로 작업', '리팩토링해줘', '구조 변경해줘', '구조 개선', '대규모 변경', '아키텍처 변경', '대규모 리팩토링', '마이그레이션해줘', '모듈 추가', '새 기능 설계+구현', '팀 워크', 'team work', '팀으로 개발'. Use aggressively when the project has a harness in place and the user requests a sizable change."
allowed-tools: Read Glob Grep Bash Agent
---

# Implement Orchestrator

General-purpose implementation pipeline orchestrator powered by an agent team. Unlike TDD, this handles **flexible structural work** (refactoring, migrations, architectural changes, new feature implementation) coordinated by team-leader.

The team-leader agent assembles the team and spawns specialized agents appropriate to each stage (analyze → plan → implement → review → security → verify) to perform the work automatically.

## Language Policy

**All user-facing output must be in Korean.** This file is written in English for token efficiency (Claude reads it as instructions), but anything the end user sees — `AskUserQuestion` text, progress messages, final summaries, reports — must be rendered in natural Korean.

- Claude-directed instructions in this file: English.
- Embedded Korean strings marked `<!-- user-facing -->`: literal templates, never translate.
- Frontmatter `description` Korean triggers: literal, never translate.
- When you narrate progress to the user, translate to natural Korean first.

## CRITICAL RULES — DO NOT VIOLATE

1. **This skill is a DISPATCHER only.** Gather project information, spawn team-leader via the Agent tool, and report results. That is all.
2. **Do not perform implementation phases yourself.** Do not analyze, plan, implement, review, or run security checks directly.
3. **You MUST invoke the Agent tool to spawn team-leader.** Do not read the prompt and execute it yourself.
4. If the team-leader agent definition is missing, instruct the user to first build the agent team via `/oh-my-harness:harness`.

## Difference vs. the TDD Skill

| Aspect | tdd | implement |
|--------|-----|-----------|
| Leader | tdd-leader | team-leader |
| Pipeline | analyze → red → green → refactor → verify | analyze → plan → implement → review → security → verify |
| RED gate | Required (tests must fail first) | None |
| Test strategy | Always tests-first | Flexible (reuse existing / parallel / later) |
| Handoffs | `.tdd/handoffs/` | `.work/handoffs/` |
| Best fit | TDD development of new features | Refactoring, migrations, structural changes, new features (flexible) |

## Invocation Patterns

| Input | Action |
|-------|--------|
| `/oh-my-harness:implement {task}` | Run the team implementation pipeline |
| "팀으로 {task} 구현해줘" | Run the team implementation pipeline |
| "리팩토링해줘" (when harness exists) | Run the team implementation pipeline |
| "구조 변경해줘" (when harness exists) | Run the team implementation pipeline |
| "대규모 마이그레이션" | Run the team implementation pipeline |

## Execution Mode: Agent Team

team-leader creates a team via TeamCreate, then spawns specialized agents individually via the Agent tool at each stage and runs them sequentially or in parallel.

```
                    ┌──────────────┐
                    │ 🚀 team-leader │  ← creates the team, observes, coordinates, decides
                    └──────┬──────┘
           ┌───────┬───────┼───────┬────────┬─────────┐
           │       │       │       │        │         │
      🏛 architect 🧪 test-  ⚡ executor 🔍 code-  🛡 security- 🐛 debugger
                engineer             reviewer reviewer
           │
           └── 👤 domain-expert, api-specialist, etc. (project-specific extra agents)
```

## Staged Pipeline

```
work-analyze → work-plan → work-implement → work-review → work-security → work-verify
                                                  ↑                          |
                                                  └──────── work-fix ────────┘
```

| Stage | Agent | Role | Gate |
|-------|-------|------|------|
| work-analyze | 🏛 architect | Impact analysis, classify change type | Impacted files · change type · risk |
| work-plan | 🏛 architect | Concrete implementation plan | Sub-tasks · agent assignments |
| work-implement | ⚡ executor (+ 🧪 test-engineer optional) | Code implementation (+ tests optional) | Build success + tests PASS |
| work-review | 🔍 code-reviewer → ⚡ executor | Code review then refactor | Review passes, tests PASS |
| work-security | 🛡 security-reviewer | Security check (conditional) | OWASP checks pass |
| work-verify | 🐛 debugger | Full verification (build + tests + types) | All PASS |
| work-fix | 🐛 debugger + ⚡ executor | Repair loop on failure | Max 3 iterations |

**Key difference vs TDD: there is no RED gate.** Reuse existing tests when present; otherwise handle them flexibly per the test strategy.

## Workflow

### Phase 0: Pre-flight Check

1. **Confirm harness exists**: verify the core agents and team-leader are present in `.claude/agents/`.
2. If the harness or team-leader is missing, instruct the user:
   <!-- user-facing (Korean, do not translate) -->
   먼저 `/oh-my-harness:harness`로 에이전트 팀을 구축해주세요. (team-leader 에이전트가 필요합니다.)
   <!-- /user-facing -->
3. **Parse the task request** — extract the work description from user input.
4. **Check for an existing `.work/` workspace:**
   - Absent → fresh run
   - Present + same task → re-run (referencing existing handoffs)
   - Present + different task → move `.work/` to `.work_{timestamp}/`, then start fresh

### Phase 1: Project Information Gathering

**Step 1: Read the harness fingerprint first**

First, locate the `<!-- harness-fingerprint v1 -->` block in `CLAUDE.md` and Read it. Extract from the block:

| Field | Source |
|-------|--------|
| `skill` | `harness-be` or `harness-fe` → determines `pipeline_category` |
| `framework` | `framework:` |
| `architecture_style` (backend) | `architecture_style:` |
| `meta_framework` / `rendering_model` (frontend) | each line |
| `test_stack`, `build_tool` | each line |
| `extra_agents` | comma-separated list |

team-leader uses these values to make spawn decisions (parallel-spawning frontend reviewers, adding component-test-engineer, etc.).

**Step 2: Fallback when fingerprint is absent**

If the fingerprint is missing, detect using:

| Information | Detection Method |
|-------------|------------------|
| Tech stack | `package.json` dependencies, `tsconfig.json`, `nest-cli.json`, `go.mod`, `requirements.txt`, etc. |
| Test framework | `vitest.config.*`, `jest.config.*`, `pytest.ini`, `package.json` scripts |
| Build command | `package.json` scripts.build, `Makefile`, `go build` |
| Test command | `package.json` scripts.test, `pytest`, `go test` |
| Existing test patterns | `__tests__/`, `*.spec.ts`, `*.test.ts` glob |
| Available agents | Agent listing in `.claude/agents/` (including custom agents) |

**Custom agent detection**: If project-specific agents such as domain-expert, api-specialist, data-engineer, infra-reviewer, monorepo-coordinator, ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer, rsc-boundary-inspector, etc. are present, include them in the list passed to team-leader.

### Phase 2: Spawn team-leader

**You MUST invoke the Agent tool to spawn team-leader. Do not read the prompt and execute it yourself.**

Agent tool call parameters:

| Parameter | Value |
|-----------|-------|
| subagent_type | `"team-leader"` |
| model | `"opus"` |
| prompt | Fill in the template below |

Prompt template:
```
다음 작업을 팀 구현 파이프라인으로 수행해주세요.

## 작업 요청
{user's task description}

## Harness Fingerprint (from CLAUDE.md)
- Pipeline category: {frontend | backend}
- Skill: {harness-be | harness-fe | missing}
- Framework: {framework}
- Architecture style: {architecture_style}  # backend
- Meta-framework / Rendering model: {meta_framework} / {rendering_model}  # frontend
- Test stack: {test_stack}
- Build tool: {build_tool}                    # frontend
- Extra agents available: {extra_agents joined}

## 프로젝트 정보
- 작업 디렉토리: {cwd}
- 빌드 명령: {detected build command}
- 테스트 명령: {detected test command}

## 사용 가능한 에이전트
{listing of agents in .claude/agents/ along with each agent's model}

코어 에이전트: architect, test-engineer, executor, code-reviewer, security-reviewer, debugger
커스텀 에이전트: {project-specific agent list (if any)}

## 파이프라인 지시
팀 구현 파이프라인 프로토콜에 따라 실행하세요. 각 Phase에서 반드시 Agent 도구로 전문 에이전트를 개별 스폰하세요.

**work-review Phase 분기:**
- pipeline_category=frontend → code-reviewer와 함께 ui-reviewer/a11y-auditor/perf-auditor/rsc-boundary-inspector(있으면) 병렬 스폰
- pipeline_category=backend → code-reviewer 단독, 단 domain-expert/api-specialist 등 커스텀 에이전트가 있으면 관련성 판단 후 추가 스폰

**work-implement Phase 분기 (test strategy=before/during일 때):**
- pipeline_category=frontend AND component-test-engineer 존재 → test-engineer + component-test-engineer 병렬 스폰
- 그 외 → test-engineer 단독
```

### Phase 3: Receive Result & Report

Once team-leader completes the full pipeline, it returns a final report. Relay it to the user.

## Error Handling

Handled inside team-leader. Skill-level error handling:

| Situation | Action |
|-----------|--------|
| Harness missing | Direct the user to `/oh-my-harness:harness` |
| team-leader definition missing | Direct the user to rebuild via `/oh-my-harness:harness` |
| team-leader spawn failure | Emit error, verify `agents/team-leader.md` exists |
| team-leader returns CIRCUIT_BREAKER | Relay failure report to user, point at `.work/handoffs/` |

## Output Format

Pass through team-leader's final report as-is:

<!-- user-facing (Korean, do not translate) -->
```
## Team Work Pipeline Report

### Task
{작업 설명}

### Result: [PASS / FAIL / CIRCUIT_BREAKER]

### Phase Summary
| Phase | Agent | Status |
|-------|-------|--------|
| Analyze | 🏛 architect | ✅ |
| Plan | 🏛 architect | ✅ |
| Implement | ⚡ executor (+ 🧪 test-engineer) | ✅ |
| Review | 🔍 code-reviewer | ✅ |
| Security | 🛡 security-reviewer | ✅ / skipped |
| Verify | 🐛 debugger | ✅ |

### Change Type: [new-feature / refactor / migration / architecture]
### Files Changed: [count]
### Build: ✅ / ❌
### Tests: N passed, M failed
### Review: [findings]
### Security: [findings]
```
<!-- /user-facing -->

## Follow-up Actions

After implementation completes, the user may request:
- "다시 실행해줘" → re-run referencing the existing `.work/` handoff
- "리뷰만 다시 해줘" → re-run only the work-review stage
- "검증해줘" → re-run only the work-verify stage, or delegate to `/oh-my-harness:verify`
- "보안 다시 확인해줘" → re-run only the work-security stage
- "이어서 해줘" → read `.work/handoffs/` and resume from the unfinished stage
