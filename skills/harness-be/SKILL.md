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
4. 감지 결과 기반 스킬 생성 (test-scaffold/migration-check/api-workflow/cross-package/config-sync 등)
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

### Phase 5: 스킬 생성

감지 결과 기반 조건부 스킬 매트릭스:

| 감지 조건 | 생성 스킬 | 용도 |
|---|---|---|
| 같은 구조의 모듈 디렉토리 3개+ 반복 | `{project}-scaffold` | 프로젝트 컨벤션에 맞는 새 모듈 스캐폴딩 |
| `data_layer ≠ none` AND 마이그레이션 디렉토리 존재 | `migration-check` | 마이그레이션 안전성 검증 |
| 일관된 테스트 파일 패턴 | `test-scaffold` | 기존 테스트 패턴대로 골격 생성 |
| `api_style ≠ none` AND 라우터 파일 ≥ 3개 | `api-workflow` | API 설계 → 구현 → 테스트 → 문서화 파이프라인 |
| `architecture_style ∈ {hexagonal, clean, modular-monolith}` | `domain-check` | 도메인 모델 무결성 검증 |
| 모노레포 | `cross-package` | 패키지 간 영향도 분석 |
| `.github/workflows/` 존재 | `pipeline-check` | CI 파이프라인 영향도 확인 |
| `.env.*` 파일 3개+ | `config-sync` | 환경별 설정 일관성 검증 |

스킬 개수는 3-5개가 적정. 너무 많으면 컨텍스트 부담이 된다. 프론트엔드 전용 스킬(`ui-workflow`, `a11y-check`, `bundle-budget`)은 **harness-be에서 생성하지 않는다**.

### Phase 6: CLAUDE.md 하네스 컨텍스트 + Fingerprint 등록

프로젝트의 `CLAUDE.md`에 하네스 컨텍스트를 추가한다. **반드시 `<!-- harness-fingerprint v1 -->` 블록도 함께 작성**한다. 이 블록은 tdd/implement 스킬이 파이프라인 실행 시 읽어서 재활용한다.

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

---

## 산출물 체크리스트

- [ ] `{프로젝트}/.claude/agents/architect.md` — 코어 6 에이전트 모두 `<Project_Context>` 블록 포함
- [ ] `{프로젝트}/.claude/agents/tdd-leader.md` 및 `team-leader.md` — Opus 고정, `<Project_Context>` 포함
- [ ] `{프로젝트}/.claude/agents/` — 감지 결과에 매칭되는 조건부 전문가만 생성 (제네릭 "DDD 전문가" 금지)
- [ ] 전문가 에이전트 프롬프트에 실제 파일 경로·모듈명·도메인 용어가 최소 3개 포함
- [ ] `{프로젝트}/.claude/skills/` — 감지된 반복 패턴 기반 스킬 3-5개
- [ ] `{프로젝트}/CLAUDE.md` — 하네스 컨텍스트 + `<!-- harness-fingerprint v1 -->` 블록
- [ ] 재실행 시 fingerprint idempotency 검증

## 참고

- 백엔드 감지 프로토콜: `references/backend-detection-protocol.md`
- 프롬프트 주입 가이드: `references/backend-prompt-injection-guide.md`
- 반복 모듈 감지 + 도메인 용어 추출: `../harness/references/project-analysis-protocol.md`의 §3 재사용
- 에이전트 설계 패턴: `../harness/references/agent-design-patterns.md`
- 스킬 작성 가이드: `../harness/references/skill-writing-guide.md`
