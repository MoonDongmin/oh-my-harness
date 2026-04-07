---
name: harness
description: "프로젝트에 에이전트 팀을 구축하는 하네스 빌더. 코어 6 에이전트(architect, test-engineer, executor, code-reviewer, security-reviewer, debugger)를 필수 생성하고, 프로젝트 분석 후 추가 에이전트/스킬을 자동 생성한다. (1) '하네스 만들어줘', '하네스 구성해줘', '하네스 구축해줘' 요청 시, (2) '하네스 설계', '하네스 엔지니어링' 요청 시, (3) 새 프로젝트에 에이전트 팀을 세팅할 때, (4) 기존 하네스를 확장하거나 유지보수할 때, (5) 'harness 만들어줘', 'build harness' 등 영문 트리거에도 반응."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness — Agent Team Builder

프로젝트에 맞는 에이전트 팀을 구축한다. 코어 6 에이전트를 필수로 생성하고, 프로젝트 특성에 따라 추가 에이전트·스킬·오케스트레이터를 자동 생성한다.

**핵심 원칙:**
1. **코어 6 에이전트는 필수** — architect, test-engineer, executor, code-reviewer, security-reviewer, debugger
2. **모델은 사용자가 선택** — 에이전트별로 opus(Claude) 또는 codex(Codex CLI) 중 택 1
3. **프로젝트 맞춤 확장** — 분석 후 필요한 추가 에이전트/스킬을 자동 생성
4. **CLAUDE.md에 하네스 컨텍스트 등록** — 새 세션에서도 에이전트 팀이 즉시 활성화
5. **하네스는 진화하는 시스템** — 피드백을 반영해 에이전트·스킬을 지속 갱신

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:harness` | 프로젝트 분석 → 하네스 빌드 |
| `/oh-my-harness:harness {기능}` | 하네스 빌드 + 해당 기능 작업 시작 |
| 빈 프로젝트에서 `/oh-my-harness:harness` | 사용자에게 목적 질문 후 빌드 |

## 코어 6 에이전트

| Agent | 역할 | 기본 권장 모델 |
|-------|------|---------------|
| architect | 설계, 아키텍처 분석, DDD/Hex 가이드 | Opus (사고/추론) |
| test-engineer | TDD 테스트 작성, 커버리지 | Codex (코딩) |
| executor | 코드 구현, 최소 diff | Codex (코딩) |
| code-reviewer | 코드 리뷰, SOLID, 품질 | Opus (사고/추론) |
| security-reviewer | OWASP Top 10, 시크릿 스캔 | Opus (사고/추론) |
| debugger | 루트 원인 분석, 빌드 에러 해결 | Codex (코딩) |

**모델 매핑:**
- **Opus** → `provider: claude`, `model: claude-opus-4-6` — 깊은 사고·추론
- **Sonnet** → `provider: claude`, `model: claude-sonnet-4-6` — 빠른 응답·균형 성능
- **Codex** → `provider: codex`, `model: gpt-5.4` — 코딩 특화 (`codex exec --full-auto`)
- **Custom** → 사용자가 직접 provider/model 지정

---

## 워크플로우

### Phase 0: 프로젝트 분석

하네스 스킬이 트리거되면 가장 먼저 현황을 파악한다.

1. **기존 하네스 확인**: `프로젝트/.claude/agents/`, `프로젝트/.claude/skills/`, `프로젝트/CLAUDE.md`를 읽는다
2. **현황에 따라 분기:**
   - **신규 구축**: 에이전트/스킬 디렉토리가 없거나 비어있음 → Phase 1부터 전체 실행
   - **기존 확장**: 기존 하네스가 있고 추가 요청 → 필요한 Phase만 선택 실행
   - **유지보수**: 점검·수정·동기화 요청 → Phase 6 유지보수 워크플로우로 이동
3. **프로젝트 코드베이스 탐색:**
   - 기술 스택 (package.json, nest-cli.json, tsconfig 등)
   - 디렉토리 구조, 기존 패턴
   - **NestJS/DDD 감지**: @nestjs 의존성 + domain/ports/adapters 구조 → Hexagonal 패턴 추천
4. **빈 프로젝트 감지**: 소스 코드가 없으면 사용자에게 "어떤 프로젝트를 만들고 싶은지" 질문
5. **기능 인자 파싱**: `/oh-my-harness:harness {기능}`으로 호출된 경우, 해당 기능을 기억하고 Phase 5에서 사용

### Phase 1: 코어 에이전트 생성

6개 코어 에이전트를 프로젝트의 `.claude/agents/` 디렉토리에 생성한다.

#### 1-1. 모델 선택 질문

에이전트별로 모델을 선택할 수 있도록 AskUserQuestion 도구로 질문한다. 사용자가 에이전트 성격에 맞는 모델을 직접 고를 수 있게 선택지를 제시한다.

**모델 선택지:**

| 선택 | 모델 | provider | model ID | 특성 |
|------|------|----------|----------|------|
| **[O] Opus** | Claude Opus 4.6 | claude | claude-opus-4-6 | 깊은 사고·추론·분석 |
| **[S] Sonnet** | Claude Sonnet 4.6 | claude | claude-sonnet-4-6 | 빠른 응답·균형 잡힌 성능 |
| **[C] Codex** | GPT-5.4 (Codex CLI) | codex | gpt-5.4 | 코딩 특화·자동 실행 |
| **[X] Custom** | 사용자 지정 | — | — | 사용자가 직접 provider/model 설명 |

**질문 형식 (AskUserQuestion 도구 사용):**
```
각 에이전트의 모델을 선택해주세요.
[O] Opus  [S] Sonnet  [C] Codex  [X] Custom

 #  에이전트             역할                추천
 1. architect           설계·아키텍처 분석    [O]
 2. test-engineer       TDD 테스트 작성      [C]
 3. executor            코드 구현            [C]
 4. code-reviewer       코드 리뷰·SOLID      [O]
 5. security-reviewer   보안 리뷰            [O]
 6. debugger            디버깅·에러 해결      [C]

예시 답변:
• "추천대로" → 모두 추천 모델 사용
• "전부 Opus" → 6개 모두 Opus
• "1O 2C 3C 4S 5O 6C" → 개별 지정
• "3번은 Custom: Gemini 2.5 Pro 사용" → Custom 설명
```

**사용자 응답 해석 규칙:**
- "기본값", "추천대로", "기본으로" → 추천 모델 그대로 사용
- "전부 X" → 6개 모두 해당 모델
- "N번 X" 또는 "NX" → 해당 에이전트만 변경, 나머지 추천값 유지
- Custom 선택 시 → 사용자가 추가 설명한 내용을 에이전트 정의의 provider/model 섹션에 반영

#### 1-2. 에이전트 정의 파일 생성

각 에이전트를 `프로젝트/.claude/agents/{name}.md`에 생성한다. 파일 구조:

```markdown
---
description: {역할 한 줄 설명}
provider: {claude 또는 codex}
model: {claude-opus-4-6 또는 claude-sonnet-4-6 또는 gpt-5.4}
---

# {Agent Name}

## 핵심 역할
{에이전트의 주요 책임}

## 작업 원칙
{에이전트가 따라야 할 원칙들}

## 도구 사용
{사용 가능한 도구와 제한 사항}
- Claude 에이전트 (Opus/Sonnet): Claude Code의 Read/Grep/Glob 등 사용
- Codex 에이전트: Codex CLI를 통해 코드 작성 (`codex exec --full-auto`)

## 출력 형식
{에이전트의 산출물 규격}
```

**에이전트 정의는 oh-my-harness 플러그인의 `agents/` 디렉토리에 있는 코어 에이전트를 기반으로 작성한다.** 해당 파일들을 Read 도구로 읽어 프로젝트에 맞게 적응한다:
- `${CLAUDE_PLUGIN_ROOT}/agents/architect.md`
- `${CLAUDE_PLUGIN_ROOT}/agents/test-engineer.md`
- `${CLAUDE_PLUGIN_ROOT}/agents/executor.md`
- `${CLAUDE_PLUGIN_ROOT}/agents/code-reviewer.md`
- `${CLAUDE_PLUGIN_ROOT}/agents/security-reviewer.md`
- `${CLAUDE_PLUGIN_ROOT}/agents/debugger.md`

사용자가 선택한 모델에 따라 provider와 model 필드를 설정하고, 도구 사용 섹션을 조정한다.

### Phase 2: 추가 에이전트/스킬 자동 생성

프로젝트 분석 결과와 사용자 대화를 기반으로 추가 구성요소가 필요한지 판단한다.

#### 2-1. 추가 에이전트 판단 기준

| 프로젝트 특성 | 추가 에이전트 |
|--------------|-------------|
| 대규모 프로젝트 (모듈 5+) | planner — 계획 수립, 작업 분해 |
| 요구사항이 복잡한 경우 | analyst — 요구사항 분석, 갭 분석 |
| 여러 에이전트의 산출물 품질 검수 필요 | critic — 품질 게이트, 교차 검증 |
| 프론트엔드 포함 | ui-reviewer — UI/UX 리뷰 |
| DDD/Hexagonal 프로젝트 | domain-expert — 도메인 모델 검증 |

이 외에도 프로젝트에 특화된 에이전트가 필요하면 자유롭게 생성한다.

#### 2-2. 추가 스킬/커맨드 생성

- 에이전트가 반복적으로 수행할 작업이 있으면 스킬로 번들링
- 스킬 작성 시 `references/skill-writing-guide.md` 참조
- description은 적극적("pushy")으로 작성하여 트리거 확률을 높인다

> 에이전트 설계 패턴: `references/agent-design-patterns.md` 참조
> 스킬 작성 가이드: `references/skill-writing-guide.md` 참조

### Phase 3: 오케스트레이터 생성

생성된 에이전트들을 하나의 워크플로우로 엮는 오케스트레이터 스킬을 생성한다.

#### 3-1. 실행 모드 선택

- **에이전트 팀 (기본)**: 2개 이상 에이전트가 협업할 때. TeamCreate + TaskCreate + SendMessage 사용.
- **서브 에이전트**: 에이전트 간 통신 불필요할 때. Agent 도구로 직접 호출.

> 비교표와 의사결정 트리: `references/agent-design-patterns.md`의 "실행 모드" 섹션 참조

#### 3-2. 오케스트레이터 스킬 구조

`프로젝트/.claude/skills/{orchestrator-name}/SKILL.md`에 생성:

- 에이전트 팀 구성 및 역할 배분
- 작업 흐름 (순차/병렬/조건부)
- 데이터 전달 프로토콜 (파일 기반 + 메시지 기반)
- 에러 핸들링 (1회 재시도 → 해당 결과 없이 진행)

> 오케스트레이터 템플릿: `references/orchestrator-template.md` 참조

#### 3-3. 후속 작업 지원

오케스트레이터 description에 후속 키워드를 포함:
- "다시 실행", "재실행", "업데이트", "수정", "보완"
- 첫 실행뿐 아니라 반복 사용에 대응

### Phase 4: CLAUDE.md 하네스 컨텍스트 등록

프로젝트의 `CLAUDE.md`에 하네스 정보를 등록한다. 새 세션에서도 에이전트 팀이 즉시 활성화되도록.

**등록할 내용:**
```markdown
## 하네스: {프로젝트/도메인명}

**에이전트 팀:**
| 에이전트 | 역할 | 모델 |
|---------|------|------|
| {name} | {역할} | {opus/codex} |

**스킬:**
| 스킬 | 용도 |
|------|------|
| {skill-name} | {한 줄 설명} |

**실행 규칙:**
- 작업 요청 시 오케스트레이터 스킬을 통해 에이전트 팀으로 처리
- 단순 질문/확인은 에이전트 팀 없이 직접 응답 가능

**디렉토리 구조:**
{.claude/agents/ 및 .claude/skills/ 트리}
```

CLAUDE.md는 "하네스가 있다, 언제 쓰라"만 담고, "어떻게 실행하는가"는 오케스트레이터에 위임한다.

### Phase 5: 기능 작업 (선택적)

`/oh-my-harness:harness {기능}`으로 호출된 경우에만 실행한다.

1. Phase 0에서 파싱한 기능 요청을 확인
2. 생성된 오케스트레이터 스킬을 사용하여 에이전트 팀에 작업 위임
3. 에이전트 팀이 작업을 분할하고 실행

### Phase 6: 하네스 유지보수

Phase 0에서 "유지보수" 분기로 진입했을 때 실행한다.

**Step 1: 현황 감사**
- `.claude/agents/` vs CLAUDE.md 에이전트 테이블 비교 → 불일치 감지
- `.claude/skills/` vs CLAUDE.md 스킬 테이블 비교 → 불일치 감지

**Step 2: 점진적 수정**
- 에이전트/스킬 추가·수정·삭제를 한 번에 하나씩
- 변경 후 즉시 CLAUDE.md 동기화

**Step 3: 진화 트리거**
다음 상황에서 하네스 개선을 제안:
- 같은 피드백이 2회 이상 반복될 때
- 에이전트가 반복적으로 실패할 때
- 사용자가 오케스트레이터를 우회하여 수동 작업할 때

---

## 산출물 체크리스트

- [ ] `프로젝트/.claude/agents/` — 코어 6 에이전트 + 추가 에이전트 정의 파일
- [ ] `프로젝트/.claude/skills/` — 추가 스킬 (필요 시)
- [ ] 오케스트레이터 스킬 1개
- [ ] 각 에이전트에 사용자가 선택한 모델(opus/codex) 반영
- [ ] CLAUDE.md에 하네스 컨텍스트 등록
- [ ] 스킬 description이 적극적으로 작성됨
- [ ] SKILL.md 본문 500줄 이내

## 참고

- 에이전트 설계 패턴: `references/agent-design-patterns.md`
- 오케스트레이터 템플릿: `references/orchestrator-template.md`
- 스킬 작성 가이드: `references/skill-writing-guide.md`
- 스킬 테스트 가이드: `references/skill-testing-guide.md`
- QA 에이전트 가이드: `references/qa-agent-guide.md`
- 하네스 예시: `references/harness-examples.md`
