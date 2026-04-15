# Backend Prompt Injection Guide

`harness-be` Phase 3에서 감지 결과를 에이전트 프롬프트에 주입하는 규칙. 목표는 "백엔드 전용 appendix를 미리 작성해두지 않고, 감지된 실제 사실만 주입"하는 것.

---

## 1. Injection point

중립화된 base agent 파일(`${CLAUDE_PLUGIN_ROOT}/agents/{name}.md`)은 `<Agent_Prompt>` XML 블록으로 감싼 구조다. 주입은 이 블록의 **닫는 태그 `</Agent_Prompt>` 직전**에 `<Project_Context>` 섹션을 추가한다.

```xml
<Agent_Prompt>
  <Role>...</Role>
  <Why_This_Matters>...</Why_This_Matters>
  <Success_Criteria>...</Success_Criteria>
  <Constraints>...</Constraints>
  <Investigation_Protocol>...</Investigation_Protocol>
  ...
  <Project_Context>
    <!-- HERE: harness-be가 삽입하는 영역 -->
  </Project_Context>
</Agent_Prompt>
```

base prompt의 `<Role>`에는 "If a `<Project_Context>` block appears below, its contents are authoritative"라는 마커가 이미 존재하므로, 주입된 컨텍스트가 일반 가정을 오버라이드한다.

---

## 2. 공통 필드 직렬화

Phase 1의 감지 객체를 다음 형식으로 `<Project_Context>`에 기록한다. 모든 코어 6 에이전트가 같은 공통 필드를 받는다.

```xml
<Project_Context>
  <!-- injected by harness-be at {date} — authoritative -->
  Skill: harness-be
  Language: {language}
  Framework: {framework} {optional version}
  Architecture style: {architecture_style}{" (user-declared)" if declared by user}
  Data layer: {data_layer}
  API style: {api_style}
  Test stack: {test_stack}
  Infrastructure: {infra.join(", ")}

  Repeated module pattern: {module_pattern}
  Existing modules: {existing_modules.join(", ")}
  Key domain terms: {domain_terms.join(", ")}
  Notable files: {notable_files.join(", ")}
  Test-to-source ratio: {test_source_ratio}
</Project_Context>
```

값이 `none`/`unknown`/`[]`이면 그대로 기록한다 — 감지 실패를 숨기지 말 것. `unknown`이라고 기록된 필드를 보면 에이전트가 해당 영역을 직접 조사해야 한다는 신호다.

---

## 3. 에이전트별 추가 주입

공통 필드 외에 에이전트별로 필요한 추가 컨텍스트가 있다. 이는 공통 블록 다음에 에이전트별 `### {agent-name} specifics` 섹션으로 덧붙인다.

### architect

```xml
<Project_Context>
  {공통 필드}

  ### architect specifics
  Analytical lens for this project: {architecture_style}
  - hexagonal  → domain purity, port definitions, adapter isolation, aggregate boundaries
  - clean       → entity/use-case/interface-adapter layer direction, business rule purity
  - layered     → controller→service→repository direction, layer cohesion, no inverted deps
  - modular-monolith → module boundary enforcement, module-owned persistence, no cross-module internals
  - mvc         → model ownership, view purity, controller routing hygiene
  - simple/unknown → describe what is actually present; do not force a label

  When analyzing, cite file:line evidence from the detected modules: {existing_modules.join(", ")}
</Project_Context>
```

### test-engineer

```xml
<Project_Context>
  {공통 필드}

  ### test-engineer specifics
  Test runner: {test_stack}
  Existing test pattern (discovered from sampling): {discovered test file pattern, e.g. "src/**/*.spec.ts"}
  Test directory convention: {discovered — e.g., colocated or top-level __tests__}
  Assertion style: {discovered — e.g., expect().toEqual, unittest.TestCase, testify}

  When writing RED-phase tests, mirror the discovered pattern. Do not introduce a new test framework or directory convention.
</Project_Context>
```

샘플링 로직: Phase 1에서 `Glob`으로 기존 테스트 파일 3개를 Read해서 경로 패턴·네이밍·assertion 스타일을 추출한다.

### executor

```xml
<Project_Context>
  {공통 필드}

  ### executor specifics
  Build command: {discovered from package.json scripts or Makefile — e.g. "bun run build" or "gradle build"}
  Test command: {discovered — e.g., "bun test", "pytest", "go test ./..."}
  Lint/format: {discovered — e.g., "biome check", "eslint", "ruff"}
  Error-handling convention: {discovered — e.g., "throws HttpException", "returns Result<T, E>", "raises HTTPException"}
  Naming convention: {discovered — e.g., "PascalCase classes, camelCase methods, kebab-case files"}
</Project_Context>
```

Phase 1에서 `package.json` scripts와 가장 큰 모듈의 파일 3개를 Read해서 관용구를 추출한다.

### code-reviewer

```xml
<Project_Context>
  {공통 필드}

  ### code-reviewer specifics
  Architecture rules to enforce (based on {architecture_style}):
  - {rules derived from architecture_style — same list as architect lens above}

  Framework-specific anti-patterns to watch for:
  - nestjs    → circular module imports, provider scope leaks, raw SQL in services
  - express   → unhandled promise rejections, middleware order bugs
  - fastify   → missing schema validation, plugin encapsulation leaks
  - fastapi   → sync code in async handlers, missing Pydantic validation
  - django    → N+1 queries via ORM, missing select_related/prefetch_related
  - spring-boot → @Transactional scope misuse, missing DTO layer
  - (etc.)

  Select only the framework row that matches `framework: {framework}`.
</Project_Context>
```

### security-reviewer

```xml
<Project_Context>
  {공통 필드}

  ### security-reviewer specifics
  Threat model weight (server-side, runtime = {framework}):
  - Injection (SQL, NoSQL, command, template): HIGH
  - Broken access control / authorization: HIGH
  - Sensitive data exposure in responses, logs: HIGH
  - SSRF / request smuggling: MEDIUM-HIGH (elevate if outbound HTTP present)
  - XSS: LOW (only relevant if serving HTML or rendered templates)
  - CSRF: MEDIUM (only if cookie-based auth in use)

  Framework-specific checks:
  - nestjs    → @Guards used on sensitive routes? Pipes for input validation? 
  - express   → helmet installed? rate limiter? CORS configured?
  - fastapi   → pydantic models for all inputs? dependency-injection auth?
  - django    → CSRF middleware active? ORM parameterized queries everywhere?
  - spring-boot → Spring Security config? CSRF token handling? @PreAuthorize?

  Secrets scan targets: .env*, config/*.yml, src/**/config*, deployment manifests
</Project_Context>
```

### debugger

```xml
<Project_Context>
  {공통 필드}

  ### debugger specifics
  Reproduce via: {discovered — e.g., "curl against the local dev server (port from config)", "pytest -k {test_name}", "go test ./...", "bun run start:dev then HTTP call"}
  Log location: {discovered — e.g., "stdout", "logs/app.log", "docker logs"}
  Debug symbols: {language-specific — e.g., "source maps via tsc", "python -X dev", "go build -gcflags='-N -l'"}
  Common error pattern for {framework}: {framework-specific — e.g., for NestJS "Can't resolve dependencies" means missing provider registration}
</Project_Context>
```

---

## 4. 리더 에이전트 주입 (tdd-leader, team-leader)

리더는 세부 스폰 로직을 자체 본문에서 분기하므로, 주입 내용은 공통 필드만 포함한다 — 에이전트별 specifics는 주입하지 않는다.

```xml
<Project_Context>
  {공통 필드만 — Skill/Language/Framework/Architecture style/Data layer/API style/Test stack}

  ### leader specifics
  Extra agents available in this project: {list of conditional agents from Phase 4}
  Skills available in this project: {list from Phase 5}
</Project_Context>
```

리더는 이 정보를 보고 tdd-red/work-review 등 phase에서 어떤 전문가를 스폰할지 결정한다. harness-be가 생성한 프로젝트에서는 frontend 전문가(ui-reviewer, a11y-auditor, perf-auditor, component-test-engineer)가 "Extra agents available" 목록에 없으므로 리더가 스폰하지 않는다.

---

## 5. 전문가 에이전트 주입 (domain-expert, api-specialist, data-engineer 등)

전문가 에이전트는 base prompt가 존재하지 않는다 — harness-be가 직접 프롬프트를 **처음부터** 작성한다. 이 때 Phase 1 감지 결과의 **실제 파일 경로, 모듈명, 도메인 용어**를 최소 3개 이상 프롬프트 본문에 포함한다.

**domain-expert 예시 (생성된 프롬프트):**

```markdown
---
name: domain-expert
description: "{architecture_style} 프로젝트의 도메인 모델 검증 전문가. {existing_modules}의 비즈니스 규칙 무결성을 확인한다."
provider: claude
model: claude-opus-4-6
disallowedTools: Write, Edit
---

<Agent_Prompt>
  <Role>
    You are Domain Expert for THIS project.

    Observed architecture: {architecture_style}
    Observed modules (bounded contexts?): {existing_modules.join(", ")}
    Domain term inventory: {domain_terms.join(", ")}

    Key domain files you know about:
    - {notable domain files from Phase 1, e.g. "src/modules/order/domain/order.aggregate.ts"}
    - ...

    Your mission: verify that changes to this project respect the existing domain boundaries, invariants, and vocabulary. Do not use generic DDD theory — use the terms and files this project actually has.
  </Role>

  <Investigation_Protocol>
    1) Read the affected domain files to understand current state.
    2) Check whether any invariant of the listed aggregates is being violated.
    3) Check whether new types respect the existing domain vocabulary (do not introduce synonyms).
    4) Cite file:line evidence for every claim.
  </Investigation_Protocol>

  <Constraints>
    - READ-ONLY.
    - Never invent domain terms — only use those listed above or those discovered by reading the code.
    - Never advise a DDD refactor beyond what the project's current structure supports.
  </Constraints>
</Agent_Prompt>
```

**핵심**: "DDD 전문가" 같은 제네릭 프롬프트가 아니다. 이 프로젝트의 **실제 모듈명과 도메인 용어**가 프롬프트에 박혀 있어서, 에이전트가 해당 모듈에 특화된 전문가가 된다. 다른 프로젝트에 복사-붙여넣기가 안 된다 — 이것이 올바른 상태다.

동일한 원칙이 `api-specialist`, `data-engineer`, `infra-reviewer`, `monorepo-coordinator`, `qa-agent`에도 적용된다.

---

## 6. 주입 실패 처리

- **감지가 unknown**: 그 필드를 `unknown`으로 주입한다. 에이전트는 마커를 보고 "Project_Context가 불완전하니 직접 조사하라"는 신호로 해석.
- **파일 읽기 실패**: `notable_files`에 해당 파일을 빼고 기록. 주입 실패 사실을 CLAUDE.md의 harness-fingerprint 블록에 `detection_warnings: [...]`로 남김.
- **architecture_style == unknown이고 사용자가 "모르겠음" 선택**: Phase 4 조건부 에이전트 중 architecture_style에 의존하는 것들(domain-expert)은 생성하지 않음. 사용자에게 "아키텍처 스타일이 명확해지면 `/oh-my-harness:harness-be` 재실행해 domain-expert를 추가할 수 있습니다"라고 안내.

---

## 7. Idempotency

같은 프로젝트에서 harness-be를 재실행할 때:

1. 기존 CLAUDE.md의 `<!-- harness-fingerprint v1 -->` 블록을 Read.
2. Phase 1 감지를 다시 실행.
3. 새 감지 결과와 기존 fingerprint를 비교.
4. 차이가 없으면: 에이전트 파일을 재작성하지 않고 "하네스가 이미 최신 상태입니다" 보고.
5. 차이가 있으면: 차이를 사용자에게 요약해서 보여주고 확인 받은 뒤 재생성. 새 fingerprint로 블록 업데이트.

이 원칙으로 재실행이 안전하다.
