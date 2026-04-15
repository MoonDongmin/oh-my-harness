---
name: harness-be
description: "백엔드 프로젝트 전용 하네스 빌더. 프로젝트 루트를 스캔해 language/framework/architecture_style/data_layer/api_style/test_stack을 감지한 뒤, 코어 6 에이전트 + 리더 2 + 조건부 전문가를 프로젝트 증거와 함께 생성한다. (1) '백엔드 하네스 만들어줘', 'harness-be', 'backend harness' 요청 시, (2) NestJS/Express/Fastify/FastAPI/Django/Spring/Go 등 서버 프로젝트에서 팀 세팅 요청 시, (3) 기존 하네스를 백엔드 관점으로 재구성할 때, (4) 라우터 스킬(harness)이 BE로 분기했을 때 자동 호출."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness-BE — Backend Agent Team Builder

백엔드 프로젝트에 맞는 에이전트 팀을 구축한다. **핵심 원칙**: DDD/Hexagonal/NestJS 같은 특정 프레임워크·아키텍처를 전제하지 않는다. 프로젝트를 먼저 스캔해 사실을 감지하고, 감지된 증거를 에이전트 프롬프트에 주입한다.

**이 스킬의 주요 책임:**
1. 백엔드 프로젝트를 스캔해 구조화된 감지 객체 생성 (language/framework/architecture_style/data_layer/api_style/test_stack/module_pattern/domain_terms)
2. 코어 6 에이전트 + 리더 2를 `<Project_Context>` 주입과 함께 생성
3. 감지 결과에 조건부로 매칭되는 전문가 에이전트(domain-expert/api-specialist/data-engineer/infra-reviewer/monorepo-coordinator/qa-agent) 합성
4. 프로젝트 반복 패턴 기반 스킬 후보 도출 → 사용자 승인 게이트 → 선택된 것만 도메인 용어 유도 이름으로 생성 (0개도 정상)
5. CLAUDE.md에 `harness-fingerprint` 블록 등록 — tdd/implement 스킬이 나중에 읽어서 재사용

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:harness-be` | 백엔드 감지 → 하네스 빌드 |
| `/oh-my-harness:harness-be {기능}` | 빌드 + 해당 기능 작업 시작 |
| 라우터가 호출 (`/oh-my-harness:harness` → BE 분기) | 동일 |

## 워크플로우

### Phase 0: 기존 하네스 확인

프로젝트의 `.claude/agents/`, `.claude/skills/`, `CLAUDE.md`를 읽는다.

- **신규 구축**: 하네스 디렉토리가 비어있음 → Phase 1부터 전체 실행
- **기존 확장**: 기존 하네스가 있고 추가 요청 → 필요한 Phase만 선택 실행
- **유지보수**: 점검·동기화 요청 → Phase 7

CLAUDE.md에 `<!-- harness-fingerprint v1 -->` 블록이 있으면 읽어서 기존 감지 결과를 확인한다. 같은 fingerprint로 재실행 시 불필요한 재스캔을 피한다.

### Phase 1: Backend Detection (핵심 신규 로직)

`references/backend-detection-protocol.md`에 정의된 감지 트리를 실행한다. 결과는 다음 구조체로 메모리에 저장한다.

```yaml
language: typescript | javascript | python | java | kotlin | go | rust | ruby | php | unknown
framework: nestjs | express | fastify | koa | hono | fastapi | flask | django | spring-boot | micronaut | quarkus | gin | echo | fiber | rails | laravel | unknown
architecture_style: hexagonal | clean | layered | mvc | modular-monolith | feature-sliced | simple | unknown
data_layer: prisma | typeorm | drizzle | sequelize | mikro-orm | sqlalchemy | gorm | hibernate | raw-sql | none
api_style: rest | graphql | grpc | trpc | hybrid | none
test_stack: jest | vitest | mocha | pytest | go-test | junit | rspec | none
infra: [docker, k8s, terraform, github-actions, ...]  # 감지된 태그 배열
module_pattern: "src/modules/{name}/{name}.controller.ts, .service.ts, .repository.ts"  # 실제 발견된 패턴 문자열
existing_modules: [user, order, payment, ...]
domain_terms: [Order, Invoice, Subscription, ...]
notable_files: [top 3 entry points — src/main.ts, etc.]
test_source_ratio: 0.42
```

**감지 원칙:**

- **증거 우선**: 의존성 이름만 보고 판단하지 않는다. 예를 들어 `@nestjs/*`가 있더라도 `domain/ports/adapters` 디렉토리가 실제로 있어야 `architecture_style: hexagonal`이다.
- **중립성 우선**: 매칭이 안 되면 `unknown`을 선택하고, 사용자에게 확인 질문을 하거나 Project_Context에 "architecture_style: unknown"을 그대로 주입한다. 추측하지 않는다.
- **복수 근거 수집**: architecture_style 감지는 반드시 3-step 증거(디렉토리 구조 + 파일 네이밍 + 샘플 import 패턴)를 모두 확인한다.

**감지 애매한 경우 (architecture_style == unknown):**

AskUserQuestion으로 사용자에게 묻는다:
```
이 프로젝트의 주요 아키텍처 스타일은?
[1] Hexagonal (Ports & Adapters)
[2] Clean Architecture (use-cases/entities)
[3] Layered (controller/service/repository)
[4] MVC
[5] 기타 / 해당 없음
```

사용자가 답하면 `architecture_style_user_declared: true` 플래그와 함께 저장한다.

### Phase 2: 모델 선택 질문

기존 `skills/harness/SKILL.md`의 Phase 1-1 로직을 그대로 재사용한다. 코어 6 에이전트(architect/test-engineer/executor/code-reviewer/security-reviewer/debugger)를 순차 AskUserQuestion으로 모델 선택받고, 마지막에 최종 확인 submit를 받는다.

리더 2(tdd-leader, team-leader)는 Opus 고정으로 생성한다.

### Phase 3: 에이전트 생성 (감지 주입)

각 코어 에이전트를 `{프로젝트}/.claude/agents/{name}.md`에 생성한다. 생성 단계:

1. **Read base**: `${CLAUDE_PLUGIN_ROOT}/agents/{name}.md`를 Read. 이 파일들은 중립화되어 있으며 `<Project_Context>` 우선 마커를 포함한다.
2. **Serialize context**: Phase 1 감지 객체를 다음 XML 블록으로 직렬화.

```xml
<Project_Context>
  <!-- injected by harness-be — authoritative over any generic assumption above -->
  Skill: harness-be
  Language: {language}
  Framework: {framework} ({detected version if known})
  Architecture style: {architecture_style} {"(user-declared)" if user-declared}
  Data layer: {data_layer}
  API style: {api_style}
  Test stack: {test_stack}
  Infrastructure: {infra joined}

  Repeated module pattern: {module_pattern}
  Existing modules: {existing_modules joined}
  Key domain terms: {domain_terms joined}
  Notable files: {notable_files joined}
  Test-to-source ratio: {test_source_ratio}

  Evidence that justified these detections:
    - {list of concrete files/directories/deps that supported the detection}
</Project_Context>
```

3. **Merge frontmatter**: 사용자가 선택한 provider/model로 프론트매터 작성. Codex 선택 시 Codex CLI 위임 템플릿 사용.
4. **Insert before closing tag**: base prompt의 `</Agent_Prompt>` 직전에 `<Project_Context>` 삽입.
5. **Write**: `{프로젝트}/.claude/agents/{name}.md`에 저장.

리더 2(tdd-leader, team-leader)는 원본(`${CLAUDE_PLUGIN_ROOT}/agents/{tdd-leader,team-leader}.md`)을 읽어 동일한 방식으로 `<Project_Context>`를 주입해 저장한다. 리더 레벨에는 architecture_style/framework/test_stack만 포함 — 세부 스폰 로직은 리더 본문에서 분기한다.

> 상세 주입 규칙: `references/backend-prompt-injection-guide.md` 참조.

### Phase 4: 동적 조건부 에이전트

감지 결과에 따라 아래 전문가 에이전트를 조건부로 생성한다. **프레임워크 이름이 아니라 감지된 사실이 판단 근거다.**

| 조건 | 생성 에이전트 | 주입 내용 |
|---|---|---|
| `architecture_style ∈ {hexagonal, clean, modular-monolith}` AND `domain/`·`entities/` 파일 ≥ 5개 | `domain-expert` | 실제 도메인 용어, 발견된 aggregate/entity 이름, 도메인 디렉토리 경로 |
| `api_style ∈ {rest, graphql, grpc, trpc}` AND 컨트롤러/라우터 파일 ≥ 5개 | `api-specialist` | 감지된 API 스타일, 라우팅 파일 경로, 스키마 위치 |
| `data_layer ≠ none` AND 마이그레이션 디렉토리 존재 | `data-engineer` | 감지된 ORM, 스키마 파일, 마이그레이션 경로 |
| `infra` 태그에 docker/k8s/terraform 포함 | `infra-reviewer` | 감지된 infra 태그, 설정 파일 경로 |
| 모노레포 도구 감지 (turbo/nx/lerna/workspaces) | `monorepo-coordinator` | 감지된 모노레포 도구, 패키지 목록 |
| `test_source_ratio < 0.3` | `qa-agent` | 현재 비율, 커버리지 갭 영역 |

**핵심 변화**: `domain-expert`는 `hexagonal`·`clean`·`modular-monolith`에서만 생성된다. 단순 Express CRUD (`architecture_style: simple`) 프로젝트에서는 생성되지 않는다. 이것이 "프레임워크 전제 제거 + 감지 기반 합성"의 구체적 실현이다.

각 전문가 에이전트의 프롬프트에는 Phase 1에서 수집한 **실제 경로, 파일명, 도메인 용어**를 최소 3개 이상 주입한다. 제네릭 전문가("DDD 전문가")는 생성하지 않는다.

### Phase 5: 스킬 생성 (사용자 승인 게이트)

> **핵심 변화**: 이전에는 고정된 "조건 → 스킬 이름" 매트릭스로 자동 생성했지만, 이 방식은 사용자가 안 쓰는 제네릭 스킬을 양산했다. 이제는 **후보 도출 → 사용자 승인 → 선택된 것만 생성** 흐름이다. **0개 생성도 정상 종료**다.

#### Step 1 — 가이드 로드 (필수)

다음 두 파일을 반드시 Read한다. 이 단계를 건너뛰면 LLM이 매트릭스 매칭 모드로 빠진다.

- `../harness/references/skill-generation-guide.md` — 후보 도출 5단계 절차 + 네이밍 금지 목록 + 사용자 게이트 형식
- `../harness/references/skill-writing-guide.md` — 스킬 본문 작성 원칙 (Description pushy, Why-First, 명령형)

#### Step 2 — 후보 도출 (3단계 유도, 4개 상한)

가이드 §1의 5단계 탐색(Step A-E)을 그대로 따른다. 요약:

1. **관찰**: Phase 1 감지 객체(`module_pattern`, `existing_modules`, `domain_terms`, `notable_files`)와 실제 디렉토리 트리를 다시 본다
2. **가설**: "이 프로젝트의 사람이 한 달 안에 같은 일을 3번+ 할 작업"을 자유 문장으로 5-8개 (이 단계에 이름 짓지 말 것)
3. **검증**: 각 가설이 실제 파일로 1-2개 확인되는지 체크. 검증 안 되면 버림
4. **이름 짓기**: 살아남은 가설마다 스킬 이름을 **프로젝트 모듈명·도메인 용어·실제 디렉토리 이름에서 직접 유도**
5. **필터링**: §2 판단 기준으로 거른 뒤 **최대 4개로 줄임** (단일 `AskUserQuestion` 옵션 4개 상한 + 결정 피로 완화)

> ⚠️ **네이밍 인라인 경고**: 후보 이름이 `migration-check`, `api-workflow`, `domain-check`, `cross-package`, `pipeline-check`, `config-sync`, `test-scaffold` 같은 제네릭 일반명사면 **즉시 reject하고 다시 명명**한다. 이 이름들은 가이드 §6 네이밍 금지 목록에 박혀있다. 어떤 NestJS 프로젝트에도 통하는 이름은 이 프로젝트에 통하지 않는다.

#### Step 3 — 사용자 승인 게이트 (필수)

후보가 1개 이상이면 `AskUserQuestion`(multiSelect=true)으로 사용자에게 묻는다. 후보가 0개면 이 단계를 건너뛰고 사용자에게 "이번 빌드에 자동 생성할 만한 반복 패턴을 못 찾았다"고 한 줄로 알린 뒤 Phase 6으로 직진.

```
question: "이 프로젝트에서 자동 생성할 보조 스킬을 선택해줘. 0개 선택도 OK."
header:   "스킬 후보"
multiSelect: true
options: [최대 4개]
```

각 옵션 description은 **3요소 필수** (가이드 §7):

```
label: order-field-sync
description: "src/modules/order/ 작업 시 prisma·migration·dto·controller 4곳 동기화.
              증거: 기존 order/invoice/subscription 3개 모듈이 같은 패턴 반복.
              트리거: '주문 필드 추가', '주문 마이그레이션', 'order schema'.
              주입 컨텍스트: src/modules/order/, prisma/schema.prisma."
```

사용자가 0개 선택해도 정상 — Step 4를 건너뛰고 Step 5로.

#### Step 4 — 선택된 스킬 본문 작성

사용자가 선택한 후보에 대해서만 `{프로젝트}/.claude/skills/{name}/SKILL.md`를 생성한다.

각 스킬 작성 시:
1. **Description**: 가이드 §3 + skill-writing-guide §1의 pushy 트리거 원칙. 트리거 키워드 3개 이상 + 경계 조건 명시
2. **본문 주입**: Phase 1 감지 객체에서 **실제 파일 경로·import 패턴·모듈명·도메인 용어를 최소 3개** 본문에 박는다. 어떤 필드를 어떻게 박는지는 `references/backend-prompt-injection-guide.md`의 "스킬 본문 주입 규칙" 섹션 참조
3. **본문 작성 원칙**: Why-First (ALWAYS/NEVER 금지) / Lean (500줄 이내) / 명령형 ("~한다"/"~하라")
4. **500줄 초과 시**: `references/`로 분리하고 본문에 포인터만 남김

#### Step 5 — CLAUDE.md 임시 동기화

생성된 스킬 디렉토리 트리만 CLAUDE.md에 즉시 기록한다 (Phase 6 fingerprint 확정과 분리). 세션 중단 대비 임시 동기화이며, 어디까지 갔는지 복구 가능하게 한다.

```markdown
## 하네스 (Backend) — 빌드 진행 중

**스킬 (Phase 5 완료):**
- order-field-sync
- payment-webhook-scaffold

(fingerprint는 Phase 6에서 확정)
```

스킬 0개면 이 섹션은 비워둔다.

#### Step 6 — 0개 케이스 정상 종료

사용자가 0개 선택했거나 후보가 0개였다면, `.claude/skills/` 디렉토리는 비어있는 상태로 Phase 6으로 진행한다. 빌드는 정상 완료. 코어 6 + 리더 2 + 조건부 전문가 에이전트는 이미 Phase 3-4에서 만들어졌으므로 하네스 자체는 작동한다.

fingerprint의 `skills_generated` 필드는 빈 배열 `[]`로 기록.

> ⚠️ **억지로 채우지 말 것**: "그래도 1개는 만들어야지"라는 본능을 차단한다. 사용자가 거부한 후보를 다시 만들거나, "내장 스킬"이라는 명목으로 자동 생성하지 않는다. 0은 0이다.

### Phase 6: CLAUDE.md 하네스 컨텍스트 + Fingerprint 등록 (최종 확정)

Phase 5 Step 5의 임시 동기화 섹션을 지우고, 최종 컨텍스트와 fingerprint 블록으로 교체한다. 이 블록은 tdd/implement 스킬이 파이프라인 실행 시 읽어서 재활용한다.

```markdown
## 하네스 (Backend)

**에이전트 팀:**
| 에이전트 | 역할 | 모델 |
|---------|------|------|
| architect | 설계·아키텍처 분석 | {선택} |
| test-engineer | 테스트 작성 | {선택} |
| ... |

**스킬:**
| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| ... |

**실행 규칙:**
- **TDD 작업** → `/oh-my-harness:tdd`
- **대규모 구현/리팩토링** → `/oh-my-harness:implement`
- **도메인 특화 작업** → 생성된 오케스트레이터 스킬

<!-- harness-fingerprint v1 -->
skill: harness-be
language: {language}
framework: {framework}
architecture_style: {architecture_style}
data_layer: {data_layer}
api_style: {api_style}
test_stack: {test_stack}
infra: {infra joined}
module_pattern: "{module_pattern}"
existing_modules: {existing_modules joined}
core6_agents: architect, test-engineer, executor, code-reviewer, security-reviewer, debugger
leaders: tdd-leader, team-leader
extra_agents: {list of conditional agents spawned}
skills_generated: {list}
<!-- /harness-fingerprint -->
```

### Phase 7: 기능 작업 (선택적)

`/oh-my-harness:harness-be {기능}`으로 호출된 경우, Phase 0에서 파싱한 기능 요청을 오케스트레이터 스킬이나 `implement`/`tdd` 스킬로 넘긴다.

### Phase 8: 유지보수

기존 하네스가 있을 때 Phase 0에서 "유지보수" 분기로 진입하면:

1. **현황 감사**: `.claude/agents/`와 CLAUDE.md 테이블 비교, 불일치 감지
2. **재감지**: Phase 1을 다시 실행해 최신 감지 결과를 만들고 기존 fingerprint와 비교
3. **차이 적용**: 차이가 있으면 사용자에게 설명하고 점진적으로 반영
4. **Fingerprint 갱신**

**스킬 게이트 idempotency**: 유지보수 모드에서는 Phase 5 게이트를 자동으로 다시 띄우지 않는다. 사용자가 "스킬 후보 다시 검토" 같은 명시 요청을 하지 않는 한, 기존 `skills_generated` 목록을 그대로 보존한다. 이전 빌드에서 0개 선택한 경우도 빈 배열을 유지 — "이번엔 만들어볼까"라고 자동 제안하지 않는다.

---

## 산출물 체크리스트

- [ ] `{프로젝트}/.claude/agents/architect.md` — 코어 6 에이전트 모두 `<Project_Context>` 블록 포함
- [ ] `{프로젝트}/.claude/agents/tdd-leader.md` 및 `team-leader.md` — Opus 고정, `<Project_Context>` 포함
- [ ] `{프로젝트}/.claude/agents/` — 감지 결과에 매칭되는 조건부 전문가만 생성 (제네릭 "DDD 전문가" 금지)
- [ ] 전문가 에이전트 프롬프트에 실제 파일 경로·모듈명·도메인 용어가 최소 3개 포함
- [ ] `{프로젝트}/.claude/skills/` — 사용자 게이트 통과한 후보만 (0개도 정상). 생성됐다면 이름이 프로젝트 모듈명/도메인 용어에서 유도됨 (`migration-check`/`api-workflow` 같은 제네릭 금지)
- [ ] 생성된 스킬 본문에 실제 파일 경로·import 패턴·모듈명/도메인 용어 최소 3개 주입
- [ ] `{프로젝트}/CLAUDE.md` — Phase 5 Step 5 임시 동기화 후 Phase 6에서 fingerprint 블록 최종 확정 (`skills_generated`는 빈 배열도 정상)
- [ ] 재실행 시 fingerprint idempotency 검증

## 참고

- 백엔드 감지 프로토콜: `references/backend-detection-protocol.md`
- 프롬프트 주입 가이드: `references/backend-prompt-injection-guide.md`
- 반복 모듈 감지 + 도메인 용어 추출: `../harness/references/project-analysis-protocol.md`의 §3 재사용
- 에이전트 설계 패턴: `../harness/references/agent-design-patterns.md`
- 스킬 작성 가이드: `../harness/references/skill-writing-guide.md`
