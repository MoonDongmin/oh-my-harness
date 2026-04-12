---
name: harness
description: "프로젝트에 에이전트 팀을 구축하는 하네스 빌더. 코어 6 에이전트(architect, test-engineer, executor, code-reviewer, security-reviewer, debugger)를 필수 생성하고, 프로젝트 분석 후 추가 에이전트/스킬을 자동 생성한다. (1) '하네스 만들어줘', '하네스 구성해줘', '하네스 구축해줘' 요청 시, (2) '하네스 설계', '하네스 엔지니어링' 요청 시, (3) 새 프로젝트에 에이전트 팀을 세팅할 때, (4) 기존 하네스를 확장하거나 유지보수할 때, (5) 'harness 만들어줘', 'build harness', 'oh-my-harness' 등 영문 트리거에도 반응, (6) '에이전트 팀 구성해줘', '팀 세팅해줘' 요청 시, (7) 기존 하네스가 있는 프로젝트에서 '구현해줘', '개발해줘', '작업 시작' 등 작업 위임 요청 시."
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
| 🏛 architect | 설계, 아키텍처 분석, DDD/Hex 가이드 | Opus (사고/추론) |
| 🧪 test-engineer | TDD 테스트 작성, 커버리지 | Codex (코딩) |
| ⚡ executor | 코드 구현, 최소 diff | Codex (코딩) |
| 🔍 code-reviewer | 코드 리뷰, SOLID, 품질 | Opus (사고/추론) |
| 🛡 security-reviewer | OWASP Top 10, 시크릿 스캔 | Opus (사고/추론) |
| 🐛 debugger | 루트 원인 분석, 빌드 에러 해결 | Codex (코딩) |

**모델 매핑:**
- **Opus** → `provider: claude`, `model: claude-opus-4-6` — 깊은 사고·추론
- **Sonnet** → `provider: claude`, `model: claude-sonnet-4-6` — 빠른 응답·균형 성능
- **Codex** → `provider: claude`, `model: claude-sonnet-4-6` — Codex CLI 위임 에이전트 (내부적으로 `Bash(codex exec --full-auto)` 호출)
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

에이전트를 **하나씩 순차적으로** 소개하고, 각각에 대해 모델을 선택받는다. AskUserQuestion 도구를 에이전트당 1회씩 호출한다.

**모델 선택지:**

| 선택 | 모델 | provider | model ID | 특성 |
|------|------|----------|----------|------|
| **[O] Opus** | Claude Opus 4.6 | claude | claude-opus-4-6 | 깊은 사고·추론·분석 |
| **[S] Sonnet** | Claude Sonnet 4.6 | claude | claude-sonnet-4-6 | 빠른 응답·균형 잡힌 성능 |
| **[C] Codex** | GPT-5.4 (Codex CLI) | claude | claude-sonnet-4-6 | Codex CLI 위임 (`codex exec --full-auto`) |
| **[X] Custom** | 사용자 지정 | — | — | 사용자가 직접 provider/model 설명 |

**순차 질문 플로우:**

코어 6 에이전트를 아래 순서대로, 한 번에 하나씩 AskUserQuestion으로 질문한다. 각 질문에서 해당 에이전트의 역할과 추천 모델을 설명하고, 사용자가 선택하면 다음 에이전트로 넘어간다.

**질문 형식 (에이전트당 1회):**
```
[1/6] 🏛 architect — 설계·아키텍처 분석
추천: [O] Opus (깊은 사고·추론)

[O] Opus  [S] Sonnet  [C] Codex  [X] Custom

모델을 선택해주세요 (엔터 = 추천대로):
```

**에이전트 순서와 추천값:**

| 순서 | 에이전트 | 역할 | 추천 |
|------|---------|------|------|
| 1/6 | 🏛 architect | 설계·아키텍처 분석 | [O] Opus |
| 2/6 | 🧪 test-engineer | TDD 테스트 작성 | [C] Codex |
| 3/6 | ⚡ executor | 코드 구현 | [C] Codex |
| 4/6 | 🔍 code-reviewer | 코드 리뷰·SOLID | [O] Opus |
| 5/6 | 🛡 security-reviewer | 보안 리뷰 | [O] Opus |
| 6/6 | 🐛 debugger | 디버깅·에러 해결 | [C] Codex |

**사용자 응답 해석 규칙:**
- 빈 입력 또는 "추천", "추천대로", "엔터" → 해당 에이전트의 추천 모델 사용
- "O", "Opus" → Opus 선택
- "S", "Sonnet" → Sonnet 선택
- "C", "Codex" → Codex 선택
- "X", "Custom" → 추가 질문으로 provider/model 정보를 입력받음
- "전부 X", "나머지 전부 X" → 현재 에이전트부터 남은 에이전트 모두 해당 모델 적용 (남은 질문 스킵)

**Custom 선택 시 추가 질문:**
```
Custom 모델을 지정해주세요.
예: "Gemini 2.5 Pro", "grok-3" 등
provider와 model ID를 알면 함께 입력해주세요:
```

**모든 선택 완료 후 확인:**

6개 에이전트의 모델 선택이 끝나면, 최종 구성을 요약하여 확인(submit)을 받는다.

```
✅ 에이전트 모델 구성 확인

 #  에이전트                  모델
 1. 🏛 architect             Opus
 2. 🧪 test-engineer         Codex
 3. ⚡ executor              Codex
 4. 🔍 code-reviewer         Opus
 5. 🛡 security-reviewer     Opus
 6. 🐛 debugger              Codex

이대로 진행할까요? (Y/n):
```

- "Y", "네", 빈 입력 → Phase 1-2로 진행
- "N", "아니오" → 변경할 에이전트 번호를 물어보고 해당 에이전트만 재선택

#### 1-2. 에이전트 정의 파일 생성

각 에이전트를 `프로젝트/.claude/agents/{name}.md`에 생성한다.

**Claude 에이전트 템플릿 (Opus/Sonnet 선택 시):**

```markdown
---
description: {역할 한 줄 설명}
provider: claude
model: {claude-opus-4-6 또는 claude-sonnet-4-6}
---

# {Agent Name}

## 핵심 역할
{에이전트의 주요 책임}

## 작업 원칙
{에이전트가 따라야 할 원칙들}

## 도구 사용
Claude Code의 Read/Grep/Glob/Edit/Write/Bash 등 사용

## 출력 형식
{에이전트의 산출물 규격}
```

**Codex CLI 위임 에이전트 템플릿 (Codex 선택 시):**

```markdown
---
description: {역할 한 줄 설명}
provider: claude
model: claude-sonnet-4-6
---

# {Agent Name} (Codex CLI)

## 핵심 역할
{에이전트의 주요 책임}

## 실행 방식
이 에이전트는 Codex CLI를 통해 작업을 수행한다.
모든 코드 작성/수정 작업은 반드시 아래 형식으로 Codex CLI에 위임한다:

\`\`\`bash
codex exec --full-auto "{구체적 작업 지시 — 파일 경로, 함수명, 기대 동작 포함}"
\`\`\`

### Codex CLI 호출 규칙
1. 작업 지시는 구체적이고 명확하게 작성한다 (파일 경로, 함수명, 기대 동작 포함)
2. 한 번에 하나의 명확한 작업만 위임한다
3. Codex CLI 실행 결과를 확인하고 검증한다
4. `codex` 명령어가 없으면 사용자에게 안내: "Codex CLI가 설치되어 있지 않습니다. `npm install -g @openai/codex`로 설치 후 `codex login`으로 로그인해주세요."

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

#### 1-3. 리더 에이전트 생성 (필수)

코어 6 에이전트에 더해, **두 개의 리더 에이전트**를 반드시 생성한다. 리더는 모델 선택 질문 없이 Opus로 고정(리더의 조율·판단 능력이 중요).

| 리더 | 역할 | 생성 파일 | 원본 |
|------|------|----------|------|
| 🎯 tdd-leader | TDD 파이프라인 리더 (Red-Green-Refactor 조율) | `프로젝트/.claude/agents/tdd-leader.md` | `${CLAUDE_PLUGIN_ROOT}/agents/tdd-leader.md` |
| 🚀 team-leader | 범용 팀 구현 리더 (analyze→plan→implement→review→security→verify 조율) | `프로젝트/.claude/agents/team-leader.md` | `${CLAUDE_PLUGIN_ROOT}/agents/team-leader.md` |

두 리더 에이전트는 원본을 그대로 복사하거나, 프로젝트의 언어/빌드 명령 등을 삽입하여 적응한다. tdd-leader는 `tdd` 스킬이, team-leader는 `implement` 스킬이 각각 스폰하므로, 두 파일이 모두 존재해야 두 스킬이 정상 동작한다.

### Phase 2: 딥 프로젝트 분석 + 동적 에이전트 생성

특정 아키텍처(DDD, MVC 등)를 가정하지 않고, **코드가 보여주는 사실**을 기반으로 추가 에이전트를 판단한다.

#### 2-1. 코드베이스 탐색

Phase 0에서 파악한 기술 스택을 넘어, 실제 코드를 읽어 프로젝트의 **구조적 특성**을 파악한다.

| 탐색 영역 | 방법 | 파악하는 것 |
|----------|------|-----------|
| 프로젝트 구조 | `Bash(ls)` depth 3 + Glob | 모듈 경계, 레이어 구분, 반복 패턴 |
| 소스 코드 샘플링 | 가장 큰 모듈의 대표 파일 3-5개 Read | 코딩 패턴, 네이밍, 모듈 간 관계 |
| 테스트 현황 | Glob `**/*.{spec,test}.*` | 테스트 비율, 테스트 패턴 |
| 인프라/배포 | Glob `{Dockerfile*,.github/**,Makefile}` | CI/CD, 컨테이너, 배포 환경 |
| 규모·복잡도 | 모듈 수, 소스 파일 수 | 프로젝트 규모 |

**핵심: "이 프로젝트가 어떤 아키텍처인가?"가 아니라 "이 프로젝트에서 반복되는 패턴은 무엇인가?"를 발견한다.**

> 상세 탐색 프로토콜: `references/project-analysis-protocol.md` 참조

#### 2-2. 동적 에이전트 합성

탐색 결과에서 **발견된 사실**을 근거로 추가 에이전트를 판단한다. 프레임워크 이름이 아니라 **실제로 발견된 구조적 특성**이 판단 근거다.

| 발견된 사실 (감지 방법) | 추가 에이전트 | 역할 |
|---------------------|-------------|------|
| 모듈 5개 이상 (디렉토리 카운트) | planner | 작업 분해·우선순위 결정 |
| 요구사항이 복잡한 경우 (사용자 입력) | analyst | 요구사항 분석, 갭 분석 |
| 여러 에이전트 산출물 검수 필요 (팀 규모) | critic | 품질 게이트, 교차 검증 |
| 프론트엔드 의존성 (`react`/`vue`/`angular` 등) | ui-reviewer | UI/UX 리뷰 |
| `domain/`/`ports/`/`adapters/` 디렉토리 존재 | domain-expert | 도메인 모델 검증 |
| 도메인 디렉토리 다수 (`src/{domain}/` 패턴, entity/aggregate 파일) | domain-expert (도메인별 특화) | 발견된 도메인의 비즈니스 로직 검증 |
| API 엔드포인트 다수 (controller/route 파일 수) | api-specialist | API 설계·계약 검증 |
| DB/ORM 의존성 (typeorm/prisma/sequelize/drizzle 등) | data-engineer | 스키마·쿼리·마이그레이션 검증 |
| 인프라 구성 파일 (Dockerfile/k8s/terraform) | infra-reviewer | 인프라 설정 리뷰 |
| 모노레포 (workspaces/lerna/nx/turbo) | monorepo-coordinator | 패키지 간 영향도 관리 |
| CI/CD 파이프라인 존재 (`.github/workflows/` 등) | pipeline-guardian | 파이프라인 검증 |
| test:source 비율 < 0.3 | qa-agent | 테스트 갭 메꾸기 |

**동적 도메인 분석 프로토콜** (domain-expert 생성 시):
1. `src/` 하위 디렉토리 스캔 → 바운디드 컨텍스트 후보 식별
2. `*.entity.*`, `*.aggregate.*`, `*.model.*` 패턴 탐색 → 도메인 개념 추출
3. 식별된 도메인 개념을 domain-expert 에이전트의 프롬프트에 **실제 이름으로** 주입
4. domain-expert는 해당 도메인의 비즈니스 로직 검증, 도메인 무결성 확인 담당

이 외에도 탐색 중 발견된 프로젝트 고유의 복잡성이 있으면 사용자에게 설명하고 확인 후 생성한다.

**핵심 품질 기준**: 각 커스텀 에이전트는 프로젝트의 **실제 파일 경로, 모듈명, 도메인 용어**를 최소 3개 이상 참조해야 한다. 특정 아키텍처를 가정한 제네릭 에이전트("DDD 전문가")는 생성하지 않는다.

#### 2-3. 추가 에이전트 모델 선택

추가 에이전트가 있으면 코어 6과 동일한 방식으로 모델 선택을 질문한다.

> 에이전트 설계 패턴: `references/agent-design-patterns.md` 참조
> Good vs Bad 에이전트 예시: `references/project-analysis-protocol.md` 참조

### Phase 3: 프로젝트별 스킬 생성

Phase 2-1 탐색에서 발견된 **반복 작업 패턴**을 스킬로 번들링한다. 프레임워크 매핑이 아니라, 프로젝트에서 실제로 반복될 작업을 자동화한다.

#### 3-1. 조건부 스킬 생성 매트릭스

탐색 결과에 따라 해당하는 스킬을 생성한다. 모든 프로젝트에 모든 스킬이 필요한 것은 아니다.

| 감지 조건 | 생성 스킬 | 용도 |
|----------|----------|------|
| 같은 구조의 디렉토리 3개+ 반복 | `{project}-scaffold` | 프로젝트 컨벤션에 맞는 새 모듈/컴포넌트 스캐폴딩 |
| DB 마이그레이션 디렉토리 존재 | `migration-check` | 마이그레이션 안전성 검증 워크플로우 |
| 일관된 테스트 파일 패턴 | `test-scaffold` | 기존 테스트 패턴대로 골격 생성 |
| API 엔드포인트 존재 | `api-workflow` | API 설계 → 구현 → 테스트 → 문서화 파이프라인 |
| 프론트엔드 컴포넌트 존재 | `ui-workflow` | UI 컴포넌트 구현 → 리뷰 → 접근성 체크 |
| 도메인 디렉토리 다수 | `domain-check` | 도메인 모델 무결성 검증 |
| 모노레포 | `cross-package` | 패키지 간 영향도 분석 + 변경 |
| CI/CD 파이프라인 존재 | `pipeline-check` | 변경 후 파이프라인 영향도 확인 |
| 환경별 설정 파일 다수 | `config-sync` | 환경별 설정 파일 간 일관성 검증 |

위 테이블도 예시일 뿐이다. 실제로는 탐색에서 발견된 "사람이 반복할 일"을 스킬로 만든다.

#### 3-2. 스킬 생성 원칙

각 스킬을 `프로젝트/.claude/skills/{skill-name}/SKILL.md`에 생성한다:
- 프로젝트의 **실제 디렉토리 컨벤션**을 따른다 (기존 모듈 파일을 Read하여 구조 파악 후 반영)
- description은 적극적("pushy")으로 작성 — 구체적 트리거 키워드 나열
- 500줄 이내, 대용량은 references/로 분리
- 스킬 개수 3-5개가 적정 (너무 많으면 컨텍스트 부담)

#### 3-3. 에이전트-스킬 바인딩

어떤 에이전트가 어떤 스킬을 사용하는지 명시:
- 에이전트 정의 파일에 사용 스킬 참조 추가
- CLAUDE.md의 스킬 테이블에 "사용 에이전트" 컬럼 포함

예시:
```markdown
| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| scaffold | 새 모듈 스캐폴딩 | executor |
| migration-check | 마이그레이션 검증 | data-engineer, debugger |
| domain-check | 도메인 무결성 | domain-expert |
```

> 스킬 작성 가이드: `references/skill-writing-guide.md` 참조
> 스킬 생성 가이드: `references/skill-generation-guide.md` 참조

### Phase 4: 오케스트레이터 생성

생성된 에이전트들을 하나의 워크플로우로 엮는 오케스트레이터 스킬을 생성한다.

#### 4-1. 실행 모드 선택

- **에이전트 팀 (기본)**: 2개 이상 에이전트가 협업할 때. TeamCreate + TaskCreate + SendMessage 사용.
- **서브 에이전트**: 에이전트 간 통신 불필요할 때. Agent 도구로 직접 호출.

> 비교표와 의사결정 트리: `references/agent-design-patterns.md`의 "실행 모드" 섹션 참조

#### 4-2. 오케스트레이터 스킬 구조

`프로젝트/.claude/skills/{orchestrator-name}/SKILL.md`에 생성:

- 에이전트 팀 구성 및 역할 배분
- 작업 흐름 (순차/병렬/조건부)
- 데이터 전달 프로토콜 (파일 기반 + 메시지 기반)
- 에러 핸들링 (1회 재시도 → 해당 결과 없이 진행)

**⚠️ 올바른 도구 호출 패턴 (필수 준수):**

에이전트 팀 모드에서의 올바른 패턴:
```
✅ 1. TeamCreate(team_name: "...") — team_name만 전달, members 파라미터 없음
✅ 2. Agent(subagent_type: "...", name: "...", team_name: "...", model: "opus", prompt: "...") — 각 팀원을 개별 Agent 호출로 스폰
✅ 3. TaskCreate(subject: "...", description: "...") — 작업을 하나씩 등록
```

잘못된 패턴 (사용 금지):
```
❌ TeamCreate(members: [...]) — members 파라미터는 존재하지 않음
❌ TaskCreate(tasks: [...]) — tasks 배열 파라미터는 존재하지 않음
```

> 오케스트레이터 템플릿: `references/orchestrator-template.md` 참조

#### 4-3. 후속 작업 지원

오케스트레이터 description에 후속 키워드를 포함:
- "다시 실행", "재실행", "업데이트", "수정", "보완"
- 첫 실행뿐 아니라 반복 사용에 대응

### Phase 5: CLAUDE.md 하네스 컨텍스트 등록

프로젝트의 `CLAUDE.md`에 하네스 정보를 등록한다. 새 세션에서도 에이전트 팀이 즉시 활성화되도록.

**등록할 내용:**
```markdown
## 하네스: {프로젝트/도메인명}

**에이전트 팀:**
| 에이전트 | 역할 | 모델 |
|---------|------|------|
| {name} | {역할} | {opus/codex} |

**스킬:**
| 스킬 | ��도 | 사용 에이전트 |
|------|------|-------------|
| {skill-name} | {한 줄 설명} | {agent-name} |

**팀 프리셋:**
| 프리셋 | 에이전트 | 사용 시점 |
|--------|---------|----------|
| full | 전원 | 크로스커팅 대규모 변경 |
| lightweight | architect, executor, code-reviewer | 단순 리팩토링 |
| feature | architect, test-engineer, executor, code-reviewer, security-reviewer | 신규 기능 |
| security | architect, executor, security-reviewer, debugger | 보안 민감 변경 |

**실행 규칙:**
- **TDD 작업** (Red-Green-Refactor) → `/oh-my-harness:tdd` (tdd-leader 경유)
- **대규모 구조적 작업** (리팩토링, 마이그레이션, 구조 변경, 아키텍처 변경, 신규 기능의 유연한 구현) → `/oh-my-harness:implement` (team-leader 경유)
- **오케스트레이터가 있으면** 도메인 작업 → 오케스트레이터 스킬 사용
- **단순 질문/확인** → 에이전트 팀 없이 직접 응답

**디렉토리 구조:**
{.claude/agents/ 및 .claude/skills/ 트리}
```

CLAUDE.md는 "하네스가 있다, 언제 쓰라"만 담고, "어떻게 실행하는가"는 오케스트레이터에 위임한다.

### Phase 6: 기능 작업 (선택적)

`/oh-my-harness:harness {기능}`으로 호출된 경우에만 실행한다.

1. Phase 0에서 파싱한 기능 요청을 확인
2. 생성된 오케스트레이터 스킬을 사용하여 에이전트 팀에 작업 위임
3. 에이전트 팀이 작업을 분할하고 실행

### Phase 7: 하네스 유지보수

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

- [ ] `프로젝트/.claude/agents/` — 코어 6 에이전트 + tdd-leader + team-leader + 추가 에이전트 정의 파일
- [ ] `프로젝트/.claude/skills/` — 프로젝트별 조건부 스킬 (Phase 3에서 생성)
- [ ] 오케스트레이터 스킬 1개 (필요 시, Phase 4에서 생성)
- [ ] 각 코어 에이전트에 사용자가 선택한 모델(opus/sonnet/codex) 반영
- [ ] tdd-leader와 team-leader는 Opus로 고정
- [ ] 추가 에이전트가 프로젝트의 실제 파일 경로/모듈명을 3개 이상 참조
- [ ] 스킬이 프로젝트의 실제 디렉토리 컨벤션을 따름
- [ ] 에이전트-스킬 바인딩이 명시됨
- [ ] CLAUDE.md에 하네스 컨텍스트 + 팀 프리셋 + 실행 규칙 등록
- [ ] 스킬 description이 적극적으로 작성됨
- [ ] SKILL.md 본문 500줄 이내

## 참고

- 에이전트 설계 패턴: `references/agent-design-patterns.md`
- 오케스트레이터 템플릿: `references/orchestrator-template.md`
- 스킬 작성 가이드: `references/skill-writing-guide.md`
- 스킬 테스트 가이드: `references/skill-testing-guide.md`
- QA 에이전트 가이드: `references/qa-agent-guide.md`
- 하네스 예시: `references/harness-examples.md`
