---
name: tdd
description: "TDD(테스트 주도 개발)로 기능을 구현하는 에이전트 팀 오케스트레이터. tdd-leader가 architect→test-engineer→executor→code-reviewer→security-reviewer→debugger 팀을 조율하여 Red-Green-Refactor 사이클을 자동 수행한다. (1) 'TDD로 구현해줘', 'tdd' 요청 시, (2) '테스트 먼저 작성하고 구현해줘', '테스트 주도로 개발해줘' 요청 시, (3) 'Red-Green-Refactor', '레드 그린 리팩터' 요청 시, (4) 하네스가 있는 프로젝트에서 '기능 구현해줘', '이거 만들어줘' 요청 시에도 적극적으로 사용, (5) 'tdd로 작업', 'TDD 워크플로우', 'test-first', '테스트 퍼스트' 요청 시."
allowed-tools: Read Glob Grep Bash Agent
---

# TDD Orchestrator

에이전트 팀을 활용한 TDD(Red-Green-Refactor) 파이프라인 오케스트레이터.

tdd-leader 에이전트가 팀을 구성하고, 각 TDD Phase에 적합한 전문 에이전트를 스폰하여 테스트 주도 개발을 자동 수행한다.

## CRITICAL RULES — DO NOT VIOLATE

1. **이 스킬은 DISPATCHER 역할만 한다.** 프로젝트 정보를 수집하고, Agent 도구로 tdd-leader를 스폰하고, 결과를 보고한다. 그것이 전부다.
2. **TDD Phase를 직접 수행하면 안 된다.** 테스트 작성, 코드 구현, 코드 리뷰, 보안 검사를 직접 하면 안 된다.
3. **반드시 Agent 도구를 호출하여 tdd-leader를 스폰해야 한다.** 프롬프트 내용을 읽고 직접 실행하지 말 것.
4. tdd-leader 에이전트 정의가 없으면 사용자에게 `/oh-my-harness:harness`로 에이전트 팀을 먼저 구축하라고 안내한다.

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:tdd {feature}` | TDD 파이프라인 실행 |
| "TDD로 {feature} 구현해줘" | TDD 파이프라인 실행 |
| "이거 구현해줘" (하네스 존재 시) | TDD 파이프라인 실행 |

## 실행 모드: 에이전트 팀

tdd-leader가 TeamCreate로 팀을 만들고, 각 스테이지마다 전문 에이전트를 Agent 도구로 개별 스폰하여 순차 실행한다.

```
                    ┌─────────────┐
                    │ 🎯 tdd-leader │  ← 팀 생성, 관찰, 조율, 판단
                    └──────┬──────┘
           ┌───────┬───────┼───────┬────────┬─────────┐
           │       │       │       │        │         │
      🏛 architect  🧪 test-   ⚡ executor 🔍 code-  🛡 security- 🐛 debugger
                engineer         reviewer reviewer
```

## Staged Pipeline

```
tdd-analyze → tdd-red → tdd-green → tdd-refactor → tdd-verify
                                         ↑                |
                                         └── tdd-fix ←────┘
```

| Stage | Agent | Role | Gate |
|-------|-------|------|------|
| tdd-analyze | 🏛 architect | 설계 분석, 영향 파일 식별 | 인터페이스/파일 목록 존재 |
| tdd-red | 🧪 test-engineer | 실패하는 테스트 작성 | 모든 테스트 FAIL |
| tdd-green | ⚡ executor | 최소 코드로 테스트 통과 | 모든 테스트 PASS |
| tdd-refactor | 🔍 code-reviewer → ⚡ executor | 코드 리뷰 후 리팩터 | 테스트 여전히 PASS |
| tdd-verify | 🛡 security-reviewer + 🐛 debugger | 보안 검사 + 전체 검증 | 빌드/테스트/타입체크 PASS |
| tdd-fix | 🐛 debugger + ⚡ executor | 실패 시 수정 루프 | 최대 3회 |

## 워크플로우

### Phase 0: 사전 확인

1. 하네스 존재 확인 — `.claude/agents/` 디렉토리에 코어 에이전트가 있는지 확인
2. 하네스가 없으면 사용자에게 안내: "먼저 `/oh-my-harness:harness`로 에이전트 팀을 구축해주세요."
3. 기능 요청 파싱 — 사용자 입력에서 구현할 기능 설명 추출
4. 기존 `.tdd/` 워크스페이스 확인:
   - 없으면 → 신규 실행
   - 있으면 + 같은 기능 → 재실행 (기존 handoff 참조)
   - 있으면 + 다른 기능 → `.tdd/`를 `.tdd_{timestamp}/`로 이동 후 신규 실행

### Phase 1: 프로젝트 정보 수집

스킬이 tdd-leader를 스폰하기 전에 프로젝트 정보를 수집한다.

**1단계: Harness Fingerprint 우선 읽기**

먼저 `CLAUDE.md`에서 `<!-- harness-fingerprint v1 -->` 블록을 찾아 Read한다. 블록이 존재하면 다음 필드를 추출한다:

| 필드 | 추출 위치 |
|------|----------|
| `skill` | `skill: harness-be` or `skill: harness-fe` |
| `framework` | `framework:` line |
| `architecture_style` (backend) | `architecture_style:` line |
| `meta_framework` / `rendering_model` (frontend) | 각 line |
| `test_stack` | `test_stack:` line |
| `build_tool` (frontend) | `build_tool:` line |
| `extra_agents` | `extra_agents:` line (comma-separated) |

이 정보는 tdd-leader가 스폰 결정(어떤 전문가를 RED phase에서 띄울지)에 필요하다.

**2단계: Fingerprint 부재 시 감지 폴백**

Fingerprint 블록이 없으면(구 하네스 또는 수작업 프로젝트), 아래 방법으로 최소 정보를 감지한다:

| 정보 | 감지 방법 |
|------|----------|
| 기술 스택 | `package.json` dependencies, `tsconfig.json`, `nest-cli.json` 등 |
| 테스트 프레임워크 | `vitest.config.*`, `jest.config.*`, `package.json` scripts |
| 빌드 명령 | `package.json` scripts.build |
| 테스트 명령 | `package.json` scripts.test |
| 기존 테스트 패턴 | `__tests__/`, `*.spec.ts`, `*.test.ts` glob |
| 사용 가능한 에이전트 | `.claude/agents/` 디렉토리의 에이전트 목록 |

이 경우 tdd-leader에게 "fingerprint missing, running backend-default pipeline"을 알리고, 사용자에게 `/oh-my-harness:harness-be` 또는 `/oh-my-harness:harness-fe`로 하네스를 업그레이드하라고 안내할 수 있다.

### Phase 2: tdd-leader 스폰

**반드시 Agent 도구를 호출하여 tdd-leader를 스폰한다. 프롬프트를 읽고 직접 수행하지 말 것.**

Agent 도구 호출 파라미터:

| 파라미터 | 값 |
|---------|------|
| subagent_type | `"tdd-leader"` |
| model | `"opus"` |
| prompt | 아래 템플릿을 채워서 전달 |

프롬프트 템플릿:
```
다음 기능을 TDD 파이프라인으로 구현해주세요.

## 기능 요청
{사용자의 기능 설명}

## Harness Fingerprint (from CLAUDE.md)
- Pipeline category: {frontend | backend} (derived from skill)
- Skill: {harness-be | harness-fe | missing}
- Framework: {framework}
- Architecture style: {architecture_style}  # backend only
- Meta-framework: {meta_framework}           # frontend only
- Rendering model: {rendering_model}         # frontend only
- Test stack: {test_stack}
- Build tool: {build_tool}                   # frontend only
- Extra agents available: {extra_agents joined}

## 프로젝트 정보
- 작업 디렉토리: {cwd}
- 빌드 명령: {감지된 빌드 명령}
- 테스트 명령: {감지된 테스트 명령}

## 사용 가능한 에이전트
{.claude/agents/ 에 있는 에이전트 목록과 각 에이전트의 model 정보}

## 파이프라인 지시
TDD 파이프라인 프로토콜에 따라 실행하세요. 각 Phase에서 반드시 Agent 도구로 전문 에이전트를 개별 스폰하세요.

**tdd-red Phase 스폰 집합 결정** (Pipeline category에 따라):
- category=backend → test-engineer만 스폰
- category=frontend AND extra_agents에 component-test-engineer 포함 → test-engineer + component-test-engineer 병렬 스폰
- category=frontend AND component-test-engineer 없음 → test-engineer만 스폰하고 컴포넌트 레이어도 커버하라고 지시

**tdd-refactor Phase 리뷰어 집합**:
- category=frontend → code-reviewer와 함께 ui-reviewer/a11y-auditor/perf-auditor (및 rsc-boundary-inspector가 있으면) 병렬 스폰
- category=backend → code-reviewer 단독
```

### Phase 3: 결과 수신 & 보고

tdd-leader가 전체 파이프라인을 완료하면 최종 보고서를 반환한다. 이를 사용자에게 전달.

## 에러 핸들링

tdd-leader 내부에서 처리. 스킬 레벨의 에러 핸들링:

| 상황 | 처리 |
|------|------|
| 하네스 없음 | 사용자에게 `/oh-my-harness:harness` 안내 |
| tdd-leader 스폰 실패 | 에러 메시지 출력, `agents/tdd-leader.md` 존재 확인 |
| tdd-leader가 CIRCUIT_BREAKER 반환 | 실패 보고서 사용자에게 전달, `.tdd/handoffs/` 참조 안내 |

## 출력 형식

tdd-leader의 최종 보고서를 그대로 전달:

```
## TDD Pipeline Report

### Feature
{기능 설명}

### Result: [PASS / FAIL / CIRCUIT_BREAKER]

### Phase Summary
| Phase | Agent | Status |
|-------|-------|--------|
| Analyze | 🏛 architect | ✅ |
| Red | 🧪 test-engineer | ✅ |
| Green | ⚡ executor | ✅ |
| Refactor | 🔍 code-reviewer | ✅ |
| Security | 🛡 security-reviewer | ✅ |
| Verify | 🐛 debugger | ✅ |

### Tests: N passed, 0 failed
### Files Changed: [list]
### Review: [findings]
### Security: [findings]
```

## 후속 작업

TDD 완료 후 사용자가 다음을 요청할 수 있다:
- "다시 실행해줘" → 기존 `.tdd/` handoff 참조하여 재실행
- "리팩터 더 해줘" → tdd-refactor 스테이지만 재실행
- "테스트 추가해줘" → tdd-red 스테이지만 재실행
- "보안 다시 확인해줘" → tdd-security 스테이지만 재실행
