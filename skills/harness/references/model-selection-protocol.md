# Model Selection Protocol

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

Shared protocol used during the "model selection question" step of Phase 2 in `harness-be` / `harness-fe`. Runs sequential `AskUserQuestion` calls over the core 6 agents to determine provider/model.

> **Invocation principle**: This protocol **must always run**. Right after harness-be/harness-fe finishes Phase 1 (detection) and before Phase 3 (agent generation), Read this file and execute the steps below verbatim. Do not skip.

---

## 1. Choice definitions

| Choice | Model | provider | model ID | Characteristics |
|--------|-------|----------|----------|-----------------|
| **[O] Opus** | Claude Opus 4.6 | `claude` | `claude-opus-4-6` | Deep thinking, reasoning, analysis |
| **[S] Sonnet** | Claude Sonnet 4.6 | `claude` | `claude-sonnet-4-6` | Fast response, balanced performance |
| **[C] Codex** | GPT-5.4 via Codex CLI | `claude` | `claude-sonnet-4-6` | Codex CLI delegation (`codex exec --full-auto`) |
| **[X] Custom** | User-specified | — | — | User directly enters provider/model |

## 2. Core 6 agents — order and recommendations

| Order | Agent | Role | Recommended |
|-------|-------|------|-------------|
| 1/6 | architect | Design, architecture analysis | **[O] Opus** |
| 2/6 | test-engineer | TDD test authoring | **[C] Codex** |
| 3/6 | executor | Code implementation | **[C] Codex** |
| 4/6 | code-reviewer | Code review, SOLID | **[O] Opus** |
| 5/6 | security-reviewer | Security review | **[O] Opus** |
| 6/6 | debugger | Debugging, error resolution | **[C] Codex** |

## 3. Sequential question flow

Call `AskUserQuestion` **once per agent**. One at a time — only proceed to the next question after the current one is answered.

**Question shape (one per agent):**

<!-- user-facing (Korean, do not translate) -->
```
[N/6] {이모지} {에이전트 이름} — {역할 한 줄}
추천: [{X}] {추천 모델명} ({추천 이유})

[O] Opus  [S] Sonnet  [C] Codex  [X] Custom

모델을 선택해주세요 (엔터 = 추천대로):
```
<!-- /user-facing -->

**Example AskUserQuestion options (architect):**

<!-- user-facing (Korean, do not translate) -->
```yaml
question: "[1/6] 🏛 architect — 설계·아키텍처 분석에 어떤 모델을 사용할까요?"
header: "architect 모델"
multiSelect: false
options:
  - label: "Opus (추천)"
    description: "Claude Opus 4.6 — 깊은 사고·추론·분석. 아키텍처 판단에 가장 적합."
  - label: "Sonnet"
    description: "Claude Sonnet 4.6 — 빠른 응답·균형 성능."
  - label: "Codex"
    description: "GPT-5.4 via Codex CLI — 코드 생성 중심 위임."
  - label: "Custom"
    description: "직접 provider/model 지정."
```
<!-- /user-facing -->

## 4. Rules for interpreting user response

| User input | Handling |
|---|---|
| Empty input, "추천", "추천대로", "엔터" | Use the **recommended model** for that agent |
| "O", "Opus", "opus" | Opus selected |
| "S", "Sonnet", "sonnet" | Sonnet selected |
| "C", "Codex", "codex" | Codex selected |
| "X", "Custom", "custom" | Run an extra AskUserQuestion to capture provider/model |
| Bulk patterns like "전부 O", "나머지 전부 Opus" | Apply that model to the current agent and all remaining ones, skipping the rest of the questions |

**Extra question when Custom is selected:**

<!-- user-facing (Korean, do not translate) -->
```yaml
question: "Custom 모델을 지정해주세요. provider와 model ID를 함께 입력해주세요."
header: "Custom 모델"
multiSelect: false
options:
  - label: "Gemini 2.5 Pro"
    description: "provider: gemini, model: gemini-2.5-pro"
  - label: "grok-3"
    description: "provider: xai, model: grok-3"
  - label: "직접 입력"
    description: "자유 형식으로 provider와 model ID를 설명"
```
<!-- /user-facing -->

## 5. Final confirmation submit

Once all selections for the core 6 agents are complete, summarize the final configuration and ask a **confirmation question**.

<!-- user-facing (Korean, do not translate) -->
```
✅ 에이전트 모델 구성 확인

 #  에이전트                  모델
 1. 🏛 architect             {선택}
 2. 🧪 test-engineer         {선택}
 3. ⚡ executor              {선택}
 4. 🔍 code-reviewer         {선택}
 5. 🛡 security-reviewer     {선택}
 6. 🐛 debugger              {선택}

이대로 진행할까요?
```
<!-- /user-facing -->

**AskUserQuestion options:**

<!-- user-facing (Korean, do not translate) -->
```yaml
question: "이 구성으로 에이전트를 생성할까요?"
header: "최종 확인"
multiSelect: false
options:
  - label: "진행"
    description: "이 구성으로 Phase 3(에이전트 생성)에 진입."
  - label: "특정 에이전트만 다시 선택"
    description: "변경할 에이전트 번호를 물어보고 해당 에이전트만 재질문."
  - label: "전부 다시"
    description: "코어 6 전체 순차 질문을 처음부터 다시."
```
<!-- /user-facing -->

## 6. Leader agents — fixed values

**Important**: `tdd-leader` and `team-leader` are **fixed to Opus without asking the user**. Their orchestration and judgment capacity is critical, so downgrades are not allowed.

```yaml
tdd-leader:
  provider: claude
  model: claude-opus-4-6
team-leader:
  provider: claude
  model: claude-opus-4-6
```

These two agents are created with fixed values during Phase 3 agent generation. They are not part of the sequential questioning in this protocol.

## 7. Output (the structure the caller must hold)

When the protocol completes, the calling skill must hold a selection result with this structure:

```yaml
model_selection:
  architect:        { provider: claude, model: claude-opus-4-6 }
  test-engineer:    { provider: claude, model: claude-sonnet-4-6, codex_delegate: true }
  executor:         { provider: claude, model: claude-sonnet-4-6, codex_delegate: true }
  code-reviewer:    { provider: claude, model: claude-opus-4-6 }
  security-reviewer:{ provider: claude, model: claude-opus-4-6 }
  debugger:         { provider: claude, model: claude-sonnet-4-6, codex_delegate: true }
  # leaders — auto-fixed, never asked
  tdd-leader:       { provider: claude, model: claude-opus-4-6 }
  team-leader:      { provider: claude, model: claude-opus-4-6 }
```

**When Codex is selected**: Record a `codex_delegate: true` flag so Phase 3 generates the agent with the Codex CLI delegation template (`Bash(codex exec --full-auto)`). The actual provider/model remains Claude Sonnet, but the agent body delegates all work to the Codex CLI.

**When Custom is selected**: Write the user's input straight into `provider`/`model`. If unknown, use `provider: custom, model: "{user description}"`.

## 8. Idempotency

Do not rerun this protocol in maintenance mode (existing fingerprint present). Read the frontmatter of the already-generated `.claude/agents/*.md` files to restore prior selections, and only run this protocol when the user explicitly asks to "reselect models".

---

## Caller checklist

- [ ] After Phase 1 (detection) and before entering Phase 3 (agent generation), did you Read this file?
- [ ] Did you call `AskUserQuestion` 6 times sequentially, one per core agent?
- [ ] Did you ask the follow-up question when Custom was selected?
- [ ] Did you receive the final confirmation submit?
- [ ] Did you add the 2 leaders (tdd-leader, team-leader) to the result structure with fixed Opus, without asking?
- [ ] Is the `model_selection` structure ready?

You must pass this entire checklist before proceeding to Phase 3 agent generation.
