# oh-my-harness

프로젝트 맞춤형 에이전트 팀을 자동 구축하는 Claude Code 플러그인.

## 코어 에이전트 (6)

| Agent | 역할 | 기본 권장 |
|-------|------|----------|
| architect | 설계, 아키텍처 분석 (framework-agnostic) | opus |
| test-engineer | 테스트 작성, 커버리지 (layer-adaptive) | codex |
| executor | 코드 구현, 최소 diff | codex |
| code-reviewer | 코드 리뷰, SOLID, 품질 (framework-aware via Project_Context) | opus |
| security-reviewer | OWASP Top 10, 시크릿 스캔 (runtime-aware via Project_Context) | opus |
| debugger | 루트 원인 분석, 빌드 에러 (reproduction-aware via Project_Context) | codex |

**중요**: 코어 6 에이전트의 base prompt는 **프레임워크 중립**이다. DDD/Hex/NestJS 같은 특정 스타일이 박혀있지 않다. 실제 프로젝트의 framework, architecture, test stack은 `harness-be` 또는 `harness-fe`가 감지해서 `<Project_Context>` 블록으로 주입한다. 에이전트는 이 블록을 authoritative로 취급한다.

에이전트별 모델은 harness 빌드 시 사용자가 선택 (Opus/Sonnet/Codex/Custom).

## 리더 에이전트 (2)

| Leader | 역할 | 모델 |
|--------|------|------|
| 🎯 tdd-leader | TDD Red-Green-Refactor 파이프라인 리더 | opus (고정) |
| 🚀 team-leader | 범용 팀 구현 파이프라인 리더 (analyze→plan→implement→review→security→verify) | opus (고정) |

리더 에이전트는 harness 빌드 시 필수 생성되며, 각각 `tdd` / `implement` 스킬에 의해 스폰된다.

**모델 매핑:**
- Opus → `provider: claude`, `model: claude-opus-4-6` (깊은 사고·추론)
- Sonnet → `provider: claude`, `model: claude-sonnet-4-6` (빠른 응답·균형 성능)
- Codex → `provider: claude`, `model: claude-sonnet-4-6` (Codex CLI 위임: `Bash(codex exec --full-auto)`)
- Custom → 사용자 지정 provider/model

## 추가 에이전트 (동적 생성)

프로젝트 분석 후 harness-be / harness-fe가 **감지된 사실에 근거하여** 자동 생성한다. 프레임워크 이름이 아니라 실제 디렉토리 구조·의존성·파일 패턴이 판단 근거다.

**harness-be (백엔드):**
- **domain-expert** — `architecture_style ∈ {hexagonal, clean, modular-monolith}` AND domain/entities 파일 ≥ 5개일 때만
- **api-specialist** — `api_style ∈ {rest, graphql, grpc, trpc}` AND 라우터/컨트롤러 파일 ≥ 5개
- **data-engineer** — `data_layer ≠ none` AND 마이그레이션 디렉토리 존재
- **infra-reviewer** — Docker/k8s/terraform 태그 감지
- **monorepo-coordinator** — turbo/nx/lerna/workspaces 감지
- **qa-agent** — test:source 비율 < 0.3

**harness-fe (프론트엔드 — 2026 표준 품질 게이트):**
- **ui-reviewer** (필수) — 컴포넌트 SRP, prop hygiene, 상태 colocation
- **a11y-auditor** (필수) — WCAG 2.2 AA, 키보드·ARIA·의미론적 HTML
- **perf-auditor** (필수, build_tool 감지 시) — Core Web Vitals, 번들 예산
- **component-test-engineer** — `test_stack`에 RTL/Playwright component/Storybook test-runner 포함 시
- **storybook-guardian** — `.storybook/` 존재 시
- **state-architect** — Redux/Zustand/Jotai/Pinia/MobX + store 파일 ≥ 3
- **i18n-reviewer** — i18n 라이브러리 감지 시
- **design-system-guardian** — `packages/ui` 또는 디자인 시스템 관례
- **rsc-boundary-inspector** — SSR/RSC/hybrid/islands 렌더링 모델

## 스킬

| Skill | 트리거 | 용도 |
|-------|--------|------|
| harness | "하네스 만들어줘", "harness" | **라우터** — 프로젝트 타입 감지 후 harness-be 또는 harness-fe로 위임 |
| harness-be | "백엔드 하네스", "harness-be", "backend harness" | 백엔드 전용 하네스 빌더 (framework/architecture/ORM 감지 + 주입) |
| harness-fe | "프론트엔드 하네스", "harness-fe", "frontend harness" | 프론트엔드 전용 하네스 빌더 (framework/rendering/state/a11y 감지 + 주입) |
| tdd | "TDD로 구현해줘", "tdd", "구현해줘" | TDD 에이전트 팀으로 Red-Green-Refactor 자동 수행 (category-aware) |
| implement | "팀으로 구현", "리팩토링", "구조 변경", "마이그레이션" | 범용 팀 구현 (analyze→plan→implement→review→security→verify, category-aware) |
| verify | "검증해줘", "verify" | 변경사항 실제 동작 검증 |

**category-aware**: tdd와 implement 스킬은 `CLAUDE.md`의 `<!-- harness-fingerprint v1 -->` 블록을 읽어서 파이프라인 카테고리(backend/frontend)를 결정하고, 해당 카테고리에 맞는 전문가(ui-reviewer, a11y-auditor, component-test-engineer 등)를 자동으로 스폰한다.

## 한국어 트리거

| 키워드 | 스킬 |
|--------|------|
| 하네스 만들어줘, 하네스 구성, 하네스 설계 | harness (라우터) |
| oh-my-harness, 에이전트 팀 구성/세팅/빌드 | harness (라우터) |
| 백엔드 하네스, 서버 하네스, harness-be, backend harness | harness-be |
| 프론트엔드 하네스, UI 하네스, harness-fe, frontend harness | harness-fe |
| TDD, 테스트 주도, Red-Green-Refactor | tdd |
| 구현해줘, 개발해줘, 작업 시작 (하네스 존재 시) | tdd (에이전트 팀 TDD) |
| 팀으로 구현/개발/작업, 에이전트 팀으로 | implement |
| 리팩토링해줘, 대규모 리팩토링, 구조 변경, 구조 개선 | implement |
| 대규모 변경, 아키텍처 변경, 마이그레이션해줘 | implement |
| 팀 워크, team work | implement |
| 검증해줘, 확인해봐 | verify |

## tdd vs implement — 언제 어떤 걸?

| 상황 | 스킬 |
|------|------|
| 신규 기능의 TDD 개발 (테스트 먼저) | tdd |
| 리팩토링 (테스트 이미 존재) | implement |
| 마이그레이션 (스키마 변경 등) | implement |
| 아키텍처 변경 (크로스커팅) | implement |
| 신규 기능이지만 테스트는 병행/나중 | implement |
