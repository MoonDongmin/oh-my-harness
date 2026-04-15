---
name: harness
description: "프로젝트 타입을 자동 감지해 백엔드 또는 프론트엔드 하네스로 위임하는 라우터. 실제 에이전트 팀 구축은 harness-be (백엔드) 또는 harness-fe (프론트엔드)가 수행한다. (1) '하네스 만들어줘', '하네스 구성해줘', '하네스 구축해줘' 요청 시, (2) '하네스 설계', '하네스 엔지니어링' 요청 시, (3) 새 프로젝트에 에이전트 팀을 세팅할 때, (4) 'harness 만들어줘', 'build harness', 'oh-my-harness' 등 영문 트리거에도 반응, (5) '에이전트 팀 구성해줘', '팀 세팅해줘' 요청 시, (6) 기존 하네스가 있는 프로젝트에서 '구현해줘', '개발해줘', '작업 시작' 등 작업 위임 요청 시."
allowed-tools: Read Glob Grep "Bash(git *)" "Bash(ls *)"
---

# Harness — Router (BE / FE)

이 스킬은 **얇은 라우터**다. 프로젝트를 스캔해 백엔드인지 프론트엔드인지 판단하고, 실제 하네스 빌드는 `harness-be`(백엔드) 또는 `harness-fe`(프론트엔드) 서브 스킬로 위임한다.

**이전에는 이 스킬이 직접 코어 6 에이전트를 만들었지만, 코어 에이전트 프롬프트에 NestJS/DDD/Hex 같은 백엔드 전제를 박아두는 구조적 문제가 있었다.** 지금은 감지가 먼저 일어나고, 감지된 프로젝트 타입과 실제 증거(framework/architecture/ORM/test stack)가 에이전트 프롬프트에 주입된다.

## 핵심 원칙

1. **프로젝트 타입을 먼저 감지** — package.json/manifest 파일에서 백엔드·프론트엔드 시그널을 읽는다.
2. **애매하면 사용자에게 질문** — 풀스택 프로젝트는 사용자가 의도를 명시해야 한다.
3. **감지되면 서브 스킬로 위임** — 실제 하네스 빌드는 `harness-be` 또는 `harness-fe`가 담당.
4. **두 경로 모두 제공 가능** — 풀스택 프로젝트라면 BE 먼저, 그다음 FE 순차 실행.

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:harness` | 자동 감지 → 서브 스킬 위임 |
| `/oh-my-harness:harness {기능}` | 감지 + 위임 + 기능 작업 |
| `/oh-my-harness:harness-be` / `/oh-my-harness:harness-fe` (직접 호출) | 라우터 우회, 해당 서브 스킬 직접 실행 |

## 워크플로우

### Phase 0: 기존 하네스 확인

프로젝트의 `.claude/agents/`와 `CLAUDE.md`를 읽는다. `<!-- harness-fingerprint v1 -->` 블록이 있으면 이미 어느 쪽인지 알 수 있다:

- `skill: harness-be`가 있으면 → `harness-be`를 재호출 (유지보수 모드)
- `skill: harness-fe`가 있으면 → `harness-fe`를 재호출 (유지보수 모드)
- 둘 다 있으면 → 사용자에게 "어느 쪽 유지보수?"를 물어보고 해당 서브 스킬 호출

Fingerprint가 없으면 Phase 1으로.

### Phase 1: 프로젝트 타입 감지

프로젝트 루트에서 백엔드·프론트엔드 시그널을 수집한다.

**백엔드 시그널:**

| 감지 | 점수 가중 |
|---|---|
| `package.json`에 `@nestjs/*`, `express`, `fastify`, `koa`, `hono`, `@trpc/server` | +3 |
| `pyproject.toml`·`requirements.txt`에 `fastapi`, `flask`, `django`, `starlette` | +3 |
| `go.mod` 존재 + `gin`/`echo`/`fiber` import | +3 |
| `build.gradle(.kts)` / `pom.xml`에 `spring-boot`, `micronaut`, `quarkus` | +3 |
| `Gemfile`에 `rails` | +3 |
| `composer.json`에 `laravel/framework` | +3 |
| `nest-cli.json` 존재 | +2 |
| `migrations/`, `prisma/schema.prisma`, `ormconfig.*` 존재 | +1 |
| `controller/`·`service/`·`repository/` 디렉토리 반복 | +1 |

**프론트엔드 시그널:**

| 감지 | 점수 가중 |
|---|---|
| `package.json`에 `react` + `react-dom` (없이: `next`, `remix`, `gatsby`) | +3 |
| `package.json`에 `vue` (+ Nuxt 부재) | +3 |
| `package.json`에 `@angular/core` + `angular.json` | +3 |
| `package.json`에 `svelte` (+ SvelteKit 부재) | +3 |
| `package.json`에 `solid-js` | +3 |
| `next` + `next.config.*` | +4 (풀스택 시그널) |
| `nuxt` + `nuxt.config.*` | +4 (풀스택 시그널) |
| `@sveltejs/kit` + `svelte.config.*` | +4 (풀스택 시그널) |
| `@remix-run/*` | +4 (풀스택 시그널) |
| `vite.config.*`에 React/Vue/Svelte plugin 설정 | +2 |
| `src/components/`, `components/`, `app/pages/` 등 컴포넌트 디렉토리 | +1 |
| `.storybook/` 존재 | +1 |

### Phase 2: 분기 판정

점수를 합산하고 판정한다.

| 상황 | 동작 |
|---|---|
| BE 점수 ≥ 3 AND FE 점수 < 3 | **harness-be 스킬로 위임** |
| FE 점수 ≥ 3 AND BE 점수 < 3 | **harness-fe 스킬로 위임** |
| BE 점수 ≥ 3 AND FE 점수 ≥ 3 (풀스택) | AskUserQuestion으로 확인 (아래 §3) |
| BE 점수 < 3 AND FE 점수 < 3 (신호 부족) | 빈 프로젝트 — 사용자에게 의도 질문 |

**풀스택 분기 확인 질문:**
```
이 프로젝트는 백엔드와 프론트엔드 시그널이 모두 감지되었습니다.
어떤 관점으로 하네스를 구축할까요?

[1] Backend 먼저 (harness-be) — 이후 harness-fe로 확장 가능
[2] Frontend 먼저 (harness-fe) — 이후 harness-be로 확장 가능
[3] 둘 다 순차 실행 — harness-be → harness-fe 연달아 (권장: 진짜 풀스택 모노레포)
[4] 이 번에는 {하나만} — 나머지는 나중에
```

### Phase 3: 서브 스킬 위임

선택된 경로에 따라 서브 스킬을 실행한다. Skill tool로 다음 중 하나를 호출:

- `skill: "oh-my-harness:harness-be"` (+ 사용자 기능 인자가 있으면 함께 전달)
- `skill: "oh-my-harness:harness-fe"` (+ 동일)

**풀스택 "둘 다" 선택 시**: harness-be를 먼저 실행한다. harness-be가 완료되면 이어서 harness-fe를 실행한다. harness-fe는 Phase 0에서 기존 harness-be fingerprint를 감지하고 "두 번째 하네스 증축 모드"로 동작한다 — 이미 존재하는 코어 6 에이전트와 리더는 덮어쓰지 않고, 프론트엔드 전용 에이전트(ui-reviewer, a11y-auditor 등)와 스킬만 추가한다. fingerprint 블록은 두 스킬을 모두 기록한다.

```markdown
<!-- harness-fingerprint v1 -->
skill: harness-be, harness-fe  # 둘 다 실행된 경우
...
<!-- /harness-fingerprint -->
```

### Phase 4: 빈 프로젝트 처리

BE 점수 < 3 AND FE 점수 < 3 AND 소스 파일이 거의 없는 경우 — 새 프로젝트를 시작하려는 상황으로 판단한다. AskUserQuestion:

```
프로젝트가 비어있거나 시그널이 부족합니다. 어떤 종류의 프로젝트를 만들고 싶으신가요?

[1] Backend (NestJS, FastAPI, Spring, Go 등) → harness-be
[2] Frontend (React SPA, Next.js, Vue/Nuxt 등) → harness-fe
[3] 풀스택 (둘 다) → harness-be + harness-fe 순차
[4] 나중에 — 지금은 하네스 빌드 안 함
```

사용자 선택에 따라 해당 서브 스킬을 호출한다. 빈 프로젝트에서 서브 스킬은 사용자에게 기술 스택 선택을 물어볼 수 있다 (예: "NestJS / Express / Fastify 중 어떤 거요?").

---

## 실행 제약

- 이 라우터 스킬은 **코어 6 에이전트나 리더를 직접 생성하지 않는다**. 실제 에이전트 생성은 전적으로 서브 스킬의 책임이다.
- `<Project_Context>` 주입 로직, 감지 트리, 프롬프트 템플릿은 모두 서브 스킬의 references/에 있다.
- 라우터의 판정 로직은 "어느 서브 스킬에게 넘길지"만 결정한다 — 판정 기준 자체는 여기서 정의되지만, 세부 감지는 서브 스킬이 다시 자체적으로 수행한다.

## 라우팅 매트릭스 요약

| 감지 결과 | 위임 대상 |
|---|---|
| 백엔드 시그널 우세 | `harness-be` |
| 프론트엔드 시그널 우세 | `harness-fe` |
| 풀스택 (둘 다 우세) — 사용자 "BE 먼저" | `harness-be` → 선택 시 후속 `harness-fe` |
| 풀스택 — 사용자 "FE 먼저" | `harness-fe` → 선택 시 후속 `harness-be` |
| 풀스택 — 사용자 "둘 다" | `harness-be` → `harness-fe` 순차 |
| 빈 프로젝트 — 사용자 "Backend" | `harness-be` |
| 빈 프로젝트 — 사용자 "Frontend" | `harness-fe` |
| 빈 프로젝트 — 사용자 "나중에" | 종료 (하네스 빌드 안 함) |

## 참고

- 백엔드 하네스 빌더: `../harness-be/SKILL.md`
- 프론트엔드 하네스 빌더: `../harness-fe/SKILL.md`
- 공통 references (반복 모듈 감지, 도메인 용어 추출, 에이전트 설계 패턴): 현재 디렉토리의 `references/`

### references/ 디렉토리 상태

이 디렉토리에 있는 기존 참조 문서는 서브 스킬에서 여전히 임포트해서 사용한다:

- `references/project-analysis-protocol.md` — 반복 모듈 감지, 도메인 용어 추출 (§3) — harness-be/harness-fe의 detection-protocol에서 재사용
- `references/agent-design-patterns.md` — 에이전트 설계 원칙
- `references/skill-generation-guide.md`, `references/skill-writing-guide.md` — 스킬 작성 가이드
- `references/orchestrator-template.md` — 오케스트레이터 템플릿
- `references/harness-examples.md` — 하네스 예시
- `references/qa-agent-guide.md` — QA 에이전트 가이드

이 파일들은 이 라우터 스킬에서 직접 쓰지 않지만, harness-be/harness-fe가 import하므로 삭제하면 안 된다.
