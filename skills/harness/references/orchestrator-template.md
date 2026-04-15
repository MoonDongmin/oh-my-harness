# Orchestrator Skill Template

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

An orchestrator is the top-level skill that coordinates an entire team. Two templates are provided, one per execution mode.

---

## Template A: Agent-Team mode (default)

Agent teams compose with `TeamCreate` and coordinate via a shared task list and `SendMessage`.

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: {domain}-orchestrator
description: "{도메인} 에이전트 팀을 조율하는 오케스트레이터. {초기 실행 키워드}. 후속 작업: {도메인} 결과 수정, 부분 재실행, 업데이트, 보완, 다시 실행, 이전 결과 개선 요청 시에도 반드시 이 스킬을 사용."
---

# {Domain} Orchestrator

{도메인}의 에이전트 팀을 조율하여 {최종 산출물}을 생성하는 통합 스킬.

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|-------------|------|------|------|
| {teammate-1} | {커스텀 또는 빌트인} | {역할} | {skill} | {output-file} |
| {teammate-2} | {커스텀 또는 빌트인} | {역할} | {skill} | {output-file} |
| ... | | | | |

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

기존 산출물 존재 여부를 확인하여 실행 모드를 결정한다:

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. Phase 1로 진행
   - **`_workspace/` 존재 + 사용자가 부분 수정 요청** → 부분 재실행. 해당 에이전트만 재호출하고, 기존 산출물 중 수정 대상만 덮어쓴다
   - **`_workspace/` 존재 + 새 입력 제공** → 새 실행. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동한 뒤 Phase 1 진행
3. 부분 재실행 시: 이전 산출물 경로를 에이전트 프롬프트에 포함하여, 에이전트가 기존 결과를 읽고 피드백을 반영하도록 지시

### Phase 1: 준비
1. 사용자 입력 분석 — {무엇을 파악하는지}
2. 작업 디렉토리에 `_workspace/` 생성 (초기 실행 시)
3. 입력 데이터를 `_workspace/00_input/`에 저장

### Phase 2: 팀 구성

**⚠️ 올바른 API 패턴: TeamCreate는 team_name만 받는다. 팀원은 Agent 도구로 개별 스폰한다.**

1. 팀 생성 (team_name만 전달):
   ```
   TeamCreate(
     team_name: "{domain}-team",
     description: "{도메인 작업 설명}"
   )
   ```

2. 팀원 스폰 (Agent 도구로 각각 호출):
   ```
   Agent(
     subagent_type: "{agent-type-1}",
     name: "{teammate-1}",
     team_name: "{domain}-team",
     model: "opus",
     prompt: "{역할 설명 및 작업 지시}"
   )

   Agent(
     subagent_type: "{agent-type-2}",
     name: "{teammate-2}",
     team_name: "{domain}-team",
     model: "opus",
     prompt: "{역할 설명 및 작업 지시}"
   )
   ```

3. 작업 등록 (TaskCreate를 작업당 1회씩 호출):
   ```
   TaskCreate(subject: "{작업1}", description: "{상세}")
   TaskCreate(subject: "{작업2}", description: "{상세}")
   TaskCreate(subject: "{작업3}", description: "{상세}")
   ```
   > TaskUpdate로 의존성(blockedBy)과 담당자(assignee)를 설정한다.
   > 팀원당 5~6개 작업이 적정.

**❌ 사용 금지 패턴:**
- `TeamCreate(members: [...])` — members 파라미터는 존재하지 않음
- `TaskCreate(tasks: [...])` — tasks 배열 파라미터는 존재하지 않음

### Phase 3: {주요 작업 — 예: 조사/생성/분석}

**실행 방식:** 팀원들이 자체 조율

팀원들은 공유 작업 목록에서 작업을 요청(claim)하고 독립적으로 수행한다.
리더는 진행 상황을 모니터링하며 필요 시 개입한다.

**팀원 간 통신 규칙:**
- {teammate-1}은 {teammate-2}에게 {어떤 정보}를 SendMessage로 전달
- {teammate-2}는 작업 완료 시 결과를 파일로 저장하고 리더에게 알림
- 팀원이 다른 팀원의 결과가 필요하면 SendMessage로 요청

**산출물 저장:**

| 팀원 | 출력 경로 |
|------|----------|
| {teammate-1} | `_workspace/{phase}_{teammate-1}_{artifact}.md` |
| {teammate-2} | `_workspace/{phase}_{teammate-2}_{artifact}.md` |

**리더 모니터링:**
- 팀원이 유휴 상태가 되면 자동 알림 수신
- 특정 팀원이 막혔을 때 SendMessage로 지시 또는 작업 재할당
- 전체 진행률은 TaskGet으로 확인

### Phase 4: {후속 작업 — 예: 검증/통합}
1. 모든 팀원의 작업 완료 대기 (TaskGet으로 상태 확인)
2. 각 팀원의 산출물을 Read로 수집
3. {통합/검증 로직}
4. 최종 산출물 생성: `{output-path}/{filename}`

### Phase 5: 정리
1. 팀원들에게 종료 요청 (SendMessage)
2. 팀 정리 (TeamDelete)
3. `_workspace/` 디렉토리 보존 (중간 산출물은 삭제하지 않음 — 사후 검증·감사 추적용)
4. 사용자에게 결과 요약 보고

> **팀 재구성이 필요한 경우:** Phase별로 다른 전문가 조합이 필요하면, 현재 팀을 TeamDelete로 정리한 뒤 새 TeamCreate로 다음 Phase의 팀을 구성한다. 이전 팀의 산출물은 `_workspace/`에 보존되므로 새 팀이 Read로 접근 가능.

## 데이터 흐름

```
[리더] → TeamCreate → [teammate-1] ←SendMessage→ [teammate-2]
                          │                           │
                          ↓                           ↓
                    artifact-1.md              artifact-2.md
                          │                           │
                          └───────── Read ────────────┘
                                     ↓
                              [리더: 통합]
                                     ↓
                              최종 산출물
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 팀원 1명 실패/중지 | 리더가 감지 → SendMessage로 상태 확인 → 재시작 또는 대체 팀원 생성 |
| 팀원 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| 타임아웃 | 현재까지 수집된 부분 결과 사용, 미완료 팀원 종료 |
| 팀원 간 데이터 충돌 | 출처 명시 후 병기, 삭제하지 않음 |
| 작업 상태 지연 | 리더가 TaskGet으로 확인 후 수동으로 TaskUpdate |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 {입력}을 제공
2. Phase 1에서 {분석 결과} 도출
3. Phase 2에서 팀 구성 ({N}명 팀원 + {M}개 작업)
4. Phase 3에서 팀원들이 자체 조율하며 작업 수행
5. Phase 4에서 산출물 통합하여 최종 결과 생성
6. Phase 5에서 팀 정리
7. 예상 결과: `{output-path}/{filename}` 생성

### 에러 흐름
1. Phase 3에서 {teammate-2}가 에러로 중지
2. 리더가 유휴 알림 수신
3. SendMessage로 상태 확인 → 재시작 시도
4. 재시작 실패 시 {teammate-2} 작업을 {teammate-1}에게 재할당
5. 나머지 결과로 Phase 4 진행
6. 최종 보고서에 "{teammate-2} 영역 일부 미수집" 명시
```
<!-- /user-facing -->

---

## Template B: Sub-agent mode (lightweight)

Sub-agents are invoked directly with the `Agent` tool and return results only to the main agent.

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: {domain}-orchestrator
description: "{도메인} 에이전트를 조율하는 오케스트레이터. {초기 실행 키워드}. 후속 작업: {도메인} 결과 수정, 부분 재실행, 업데이트, 보완, 다시 실행, 이전 결과 개선 요청 시에도 반드시 이 스킬을 사용."
---

# {Domain} Orchestrator

{도메인}의 에이전트를 조율하여 {최종 산출물}을 생성하는 통합 스킬.

## 실행 모드: 서브 에이전트

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 스킬 | 출력 |
|---------|--------------|------|------|------|
| {agent-1} | {커스텀 또는 빌트인 타입} | {역할} | {skill} | {output-file} |
| {agent-2} | {커스텀 또는 빌트인 타입} | {역할} | {skill} | {output-file} |
| ... | | | | |

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

기존 산출물 존재 여부를 확인하여 실행 모드를 결정한다:

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. Phase 1로 진행
   - **`_workspace/` 존재 + 사용자가 부분 수정 요청** → 부분 재실행. 해당 에이전트만 재호출
   - **`_workspace/` 존재 + 새 입력 제공** → 새 실행. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동

### Phase 1: 준비
1. 사용자 입력 분석 — {무엇을 파악하는지}
2. 작업 디렉토리에 `_workspace/` 생성 (초기 실행 시)
3. 입력 데이터를 `_workspace/00_input/`에 저장

### Phase 2: {주요 작업 — 예: 조사/생성/분석}

**실행 방식:** {병렬 | 순차 | 조건부}

{병렬인 경우}
단일 메시지에서 N개 Agent 도구를 동시 호출:

| 에이전트 | 입력 | 출력 | model | run_in_background |
|---------|------|------|-------|-------------------|
| {agent-1} | {입력 소스} | `_workspace/{phase}_{agent}_{artifact}.md` | opus | true |
| {agent-2} | {입력 소스} | `_workspace/{phase}_{agent}_{artifact}.md` | opus | true |

{순차인 경우}
이전 에이전트의 출력을 다음 에이전트의 입력으로 전달:

1. {agent-1} 실행 → `_workspace/01_{artifact}.md` 생성
2. {agent-2} 실행 (입력: 01의 출력) → `_workspace/02_{artifact}.md` 생성

### Phase 3: {후속 작업 — 예: 검증/통합}
1. Phase 2의 산출물을 Read로 수집
2. {통합/검증 로직}
3. 최종 산출물 생성: `{output-path}/{filename}`

### Phase 4: 정리
1. `_workspace/` 디렉토리 보존 (중간 산출물은 삭제하지 않음 — 사후 검증·감사 추적용)
2. 사용자에게 결과 요약 보고

## 데이터 흐름

```
입력 → [agent-1] → artifact-1 ─┐
                                ├→ [통합] → 최종 산출물
입력 → [agent-2] → artifact-2 ─┘
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 에이전트 1개 실패 | 1회 재시도. 재실패 시 해당 결과 없이 진행, 보고서에 누락 명시 |
| 에이전트 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| 타임아웃 | 현재까지 수집된 부분 결과 사용 |
| 에이전트 간 데이터 충돌 | 출처 명시 후 병기, 삭제하지 않음 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 {입력}을 제공
2. Phase 1에서 {분석 결과} 도출
3. Phase 2에서 {N}개 에이전트가 병렬 실행, 각각 산출물 생성
4. Phase 3에서 산출물 통합하여 최종 보고서 생성
5. 예상 결과: `{output-path}/{filename}` 생성

### 에러 흐름
1. Phase 2에서 {agent-2}가 실패
2. 1회 재시도 후에도 실패
3. {agent-2} 결과 없이 나머지 결과로 Phase 3 진행
4. 최종 보고서에 "{agent-2} 영역 데이터 미수집" 명시
5. 사용자에게 부분 완료 알림
```
<!-- /user-facing -->

---

## Authoring principles

1. **Declare the execution mode first** — state "Agent Team" or "Sub-agent" at the top of the orchestrator
2. **In agent-team mode, follow the correct tool call order**:
   - `TeamCreate(team_name: "...")` — only pass `team_name` (no `members` param)
   - `Agent(subagent_type: "...", name: "...", team_name: "...", model: "opus", prompt: "...")` — spawn each member individually
   - `TaskCreate(subject: "...", description: "...")` — register tasks one at a time
   - `SendMessage(to: "...", message: "...")` — member-to-member communication
3. **In sub-agent mode, specify every Agent-tool parameter** — `name`, `subagent_type`, `prompt`, `run_in_background`
4. **Use absolute file paths** — no relative paths; always anchor on `_workspace/`
5. **Make inter-phase dependencies explicit** — state which phase depends on which
6. **Handle errors realistically** — never assume "everything succeeds"
7. **Test scenarios are mandatory** — at least 1 happy-path + 1 error-path scenario

## Follow-up-work keywords in the description

An orchestrator's `description` cannot rely only on initial-execution keywords. Always include follow-up expressions such as:

- 재실행 / 다시 실행 / 업데이트 / 수정 / 보완
- "{domain}의 {부분}만 다시"
- "이전 결과 기반으로", "결과 개선"
- Domain-related colloquial requests (for a launch-strategy harness: "런치", "홍보", "트렌딩", etc.)

Without follow-up keywords the harness becomes dead code after its first run.

## Real orchestrator reference

Base structure for a fan-out/fan-in orchestrator:
prep → Phase 0 (context check) → `TeamCreate` + `TaskCreate` → N members in parallel → `Read` + integrate → cleanup.
See the research-team example in `references/harness-examples.md`.
