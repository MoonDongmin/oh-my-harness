# Agent Team Design Patterns

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

## Execution modes: Agent Team vs Sub-agents

Understand the two execution modes and pick the one that fits.

### Agent Teams — default mode

The team leader composes a team with `TeamCreate`, and each member runs as an independent Claude Code instance. Members talk to each other directly via `SendMessage` and self-coordinate through a shared task list (`TaskCreate`/`TaskUpdate`).

```
[Leader] ←→ [Member A] ←→ [Member B]
   ↕            ↕             ↕
   └────── shared task list ──┘
```

**Core tools (correct call order):**
1. `TeamCreate(team_name: "...")`: create the team (takes only `team_name`, no `members` param)
2. `Agent(subagent_type: "...", name: "...", team_name: "...", model: "opus", prompt: "...")`: spawn each member individually
3. `TaskCreate(subject: "...", description: "...")`: register one task at a time
4. `SendMessage({to: name})`: message a specific member
5. `SendMessage({to: "all"})`: broadcast (expensive, rare)
6. `TaskUpdate`: update task status, dependencies, assignee

**Incorrect patterns (do NOT use):**
- `TeamCreate(members: [...])` — the `members` parameter does not exist
- `TaskCreate(tasks: [...])` — the `tasks` array parameter does not exist

**Characteristics:**
- Members converse, challenge, and verify each other directly
- Members exchange information without routing through the leader
- Self-coordination via shared task list (members can request their own tasks)
- When a member becomes idle the leader is notified automatically
- Plan-approval mode allows review before risky operations

**Constraints:**
- Only one team can be **active** per session (but teams may be disbanded and rebuilt between phases)
- No nested teams (a member cannot create its own team)
- Leader is fixed (cannot be transferred)
- Higher token cost

**Team reconfiguration pattern:**
When different phases need different expert mixes, save the previous team's artifacts to files → tear down the team → create a new team. Prior-team artifacts remain in `_workspace/`, so the new team can reach them via `Read`.

### Sub-agents — lightweight mode

The main agent spawns sub-agents with the `Agent` tool. Sub-agents return their results only to the main agent and do not communicate with each other.

```
[Main] → [Sub A] → returns result
       → [Sub B] → returns result
       → [Sub C] → returns result
```

**Core tool:**
- `Agent(prompt, subagent_type, run_in_background)`: spawn a sub-agent

**Characteristics:**
- Lightweight and fast
- Results are summarized back into the main context
- Token efficient

**Constraints:**
- Sub-agents cannot talk to each other
- All coordination rests with the main agent
- No realtime collaboration or challenge

### Mode selection decision tree

```
Are there 2+ agents?
├── Yes → Do agents need to communicate?
│         ├── Yes → Agent Team (default)
│         │         Cross-verification, finding sharing, and realtime feedback raise quality.
│         │
│         └── No → Sub-agents are also fine
│                  Generator-verifier, expert pools, etc. where only result passing is needed.
│
└── No (1 agent) → Sub-agent
                   A single agent doesn't need a team.
```

> **Core principle:** Agent teams are the default. When picking sub-agents, ask yourself: "is inter-member communication truly unnecessary?"

---

## Agent team architecture types

### 1. Pipeline
Sequential work flow. One agent's output is the next agent's input.

```
[Analyze] → [Design] → [Implement] → [Verify]
```

**When to use:** Each stage strongly depends on the previous stage's artifact.
**Example:** Novel writing — worldbuilding → characters → plot → writing → editing.
**Caution:** A bottleneck stalls the whole pipeline. Design each stage to be as independent as possible.
**Team mode fit:** Strong sequential dependency limits the benefit of team mode. Team mode is useful if parallel sub-segments exist inside the pipeline.

### 2. Fan-out / Fan-in
Parallel work followed by result integration. Independent tasks run concurrently.

```
         ┌→ [Expert A] ─┐
[Split] →├→ [Expert B] ─┼→ [Integrate]
         └→ [Expert C] ─┘
```

**When to use:** The same input needs analysis from multiple perspectives or domains.
**Example:** Comprehensive research — official sources / media / community / background investigated in parallel → integrated report.
**Caution:** The integration stage determines overall quality.
**Team mode fit:** The most natural pattern for agent teams. **This pattern MUST use an agent team.** Members share findings, challenge each other, and one member's discovery can redirect another's investigation in realtime — dramatically better than solo research.

### 3. Expert Pool
Call the right expert per situation.

```
[Router] → { Expert A | Expert B | Expert C }
```

**When to use:** Input type determines the processing path.
**Example:** Code review — call only security/performance/architecture experts relevant to the changes.
**Caution:** Router classification accuracy is critical.
**Team mode fit:** Sub-agents are a better fit. Only the needed expert is called, so a standing team is unnecessary.

### 4. Producer-Reviewer
Producer and reviewer agents work as a pair.

```
[Produce] → [Review] → (on issue) → re-run [Produce]
```

**When to use:** Artifact quality matters and objective review criteria exist.
**Example:** Webtoon — artist generates → reviewer inspects → problematic panels regenerated.
**Caution:** Set a max retry count (2–3) to prevent infinite loops.
**Team mode fit:** Agent team helps. `SendMessage` lets producer and reviewer exchange realtime feedback.

### 5. Supervisor
A central agent manages task state and dynamically distributes work to workers.

```
         ┌→ [Worker A]
[Supervisor]─┼→ [Worker B]    ← Supervisor reads state and dispatches dynamically
         └→ [Worker C]
```

**When to use:** Workload is variable or distribution must be decided at runtime.
**Example:** Large-scale code migration — supervisor analyzes the file list and hands batches to workers.
**Difference from fan-out:** Fan-out partitions work up front and statically; a supervisor adjusts based on live progress.
**Caution:** Keep delegation units large enough that the supervisor does not become the bottleneck.
**Team mode fit:** The agent team's shared task list matches the supervisor pattern naturally. Use `TaskCreate` to enqueue work and let members claim it themselves.

### 6. Hierarchical Delegation
A top agent recursively delegates to lower agents. Breaks complex problems down step by step.

```
[Chief] → [Lead A] → [Worker A1]
                   → [Worker A2]
        → [Lead B] → [Worker B1]
```

**When to use:** The problem naturally decomposes into a hierarchy.
**Example:** Full-stack app development — chief → frontend lead → (UI/logic/test) + backend lead → (API/DB/test).
**Caution:** Depth of 3+ incurs latency and context loss. Keep it within 2 levels.
**Team mode fit:** Agent teams cannot nest (a member cannot create a team). Implement level 1 as a team and level 2 as sub-agents, or flatten into a single team.

## Composite patterns

Real work tends to combine patterns more than use a single one:

| Composite pattern | Composition | Example |
|-------------------|-------------|---------|
| **Fan-out + Producer-Reviewer** | Parallel produce, then review each | Multi-language translation — 4 languages in parallel → each reviewed by a native reviewer |
| **Pipeline + Fan-out** | Parallelize some stages of a pipeline | Analyze (sequential) → Implement (parallel) → Integration test (sequential) |
| **Supervisor + Expert Pool** | Supervisor dynamically calls experts | Customer-support triage — supervisor classifies and assigns the matching expert |

### Execution mode for composites

**Default to agent teams for every composite pattern.** Active member-to-member communication is the main driver of output quality.

| Scenario | Recommended mode | Why |
|----------|------------------|-----|
| **Research + Analysis** | Agent team | Researchers share findings and debate conflicts in realtime |
| **Design + Implement + Verify** | Agent team | Feedback loop between designer ↔ implementer ↔ verifier |
| **Supervisor + Workers** | Agent team | Shared task list for dynamic assignment and progress sharing |
| **Producer + Reviewer** | Agent team | Realtime feedback between producer and reviewer minimizes rework |

> Mixing in sub-agents is reserved for cases where a single agent performs a fully isolated, one-shot task.

## Choosing an agent type

Specify the type via the `subagent_type` parameter of the Agent tool. Team members can also use custom agent definitions.

### Built-in types

| Type | Tool access | Suitable for |
|------|-------------|--------------|
| `general-purpose` | Full (including WebSearch, WebFetch) | Web research, general work |
| `Explore` | Read-only (no Edit/Write) | Codebase exploration, analysis |
| `Plan` | Read-only (no Edit/Write) | Architecture design, planning |

### Custom types

Define an agent in `.claude/agents/{name}.md` and call it with `subagent_type: "{name}"`. Custom agents have full tool access.

### Selection criteria

| Situation | Recommended | Reason |
|-----------|-------------|--------|
| Complex role reused across sessions | **Custom type** (`.claude/agents/`) | Manage persona and principles as a file |
| Simple investigation/collection, prompt-only is enough | **`general-purpose`** + detailed prompt | No agent file needed, instructions inline in prompt |
| Read-only code work (analysis/review) | **`Explore`** | Prevents accidental file edits |
| Design/planning only | **`Plan`** | Focused on analysis, no code changes |
| Implementation work that requires editing files | **Custom type** | Full tool access + specialized instructions |

**Rule:** Every agent MUST be defined as a `.claude/agents/{name}.md` file. Even built-in types should have an agent definition file that spells out role, principles, and protocol. Files make the agent reusable across sessions and make team-communication protocols explicit, which guarantees collaboration quality.

**Model:** Every agent uses `model: "opus"`. Always pass `model: "opus"` when calling the Agent tool.

## Agent definition structure

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: agent-name
description: "1-2문장 역할 설명. 트리거 키워드 나열."
---

# Agent Name — 역할 한줄 요약

당신은 [도메인]의 [역할] 전문가입니다.

## 핵심 역할
1. 역할1
2. 역할2

## 작업 원칙
- 원칙1
- 원칙2

## 입력/출력 프로토콜
- 입력: [어디서 무엇을 받는지]
- 출력: [어디에 무엇을 쓰는지]
- 형식: [파일 포맷, 구조]

## 팀 통신 프로토콜 (에이전트 팀 모드)
- 메시지 수신: [누구로부터 어떤 메시지를 받는지]
- 메시지 발신: [누구에게 어떤 메시지를 보내는지]
- 작업 요청: [공유 작업 목록에서 어떤 유형의 작업을 요청하는지]

## 에러 핸들링
- [실패 시 행동]
- [타임아웃 시 행동]

## 협업
- 다른 에이전트와의 관계
```
<!-- /user-facing -->

## Agent separation criteria

| Criterion | Split | Merge |
|-----------|-------|-------|
| Expertise | Different areas → split | Overlapping areas → merge |
| Parallelism | Can run independently → split | Sequentially dependent → consider merging |
| Context | Heavy context burden → split | Light and fast → merge |
| Reusability | Used by other teams → split | Only used by this team → consider merging |

## Skill vs Agent

| Dimension | Skill | Agent |
|-----------|-------|-------|
| Definition | Procedural knowledge + tool bundle | Expert persona + behavioral principles |
| Location | `.claude/skills/` | `.claude/agents/` |
| Trigger | Matched from user-request keywords | Explicitly called via the Agent tool |
| Size | Small to large (a workflow) | Small (a role definition) |
| Purpose | "How to do it" | "Who does it" |

A skill is a **procedural guide** the agent consults while working.
An agent is an **expert role definition** that uses skills.

## Skill ↔ Agent linkage

Three ways an agent can use a skill:

| Method | Implementation | When suitable |
|--------|----------------|---------------|
| **Skill tool call** | The agent's prompt states "call /skill-name via the Skill tool" | Skill is an independent workflow that is also user-invokable |
| **Inline in prompt** | Embed the skill content directly in the agent definition | Skill is short (≤50 lines) and exclusive to this agent |
| **Reference load** | `Read` the skill's references/ files on demand | Skill content is large and only conditionally needed |

Recommendation: use the Skill tool when reuse is high, inline when dedicated, reference-load when large.
