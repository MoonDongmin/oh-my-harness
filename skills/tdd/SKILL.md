---
name: tdd
description: "TDD(테스트 주도 개발)로 기능을 구현하는 에이전트 팀 오케스트레이터. tdd-leader가 architect→test-engineer→executor→code-reviewer→security-reviewer→debugger 팀을 조율하여 Red-Green-Refactor 사이클을 자동 수행한다. (1) 'TDD로 구현해줘', 'tdd' 요청 시, (2) '테스트 먼저 작성하고 구현해줘', '테스트 주도로 개발해줘' 요청 시, (3) 'Red-Green-Refactor', '레드 그린 리팩터' 요청 시, (4) 하네스가 있는 프로젝트에서 '기능 구현해줘', '이거 만들어줘' 요청 시에도 적극적으로 사용, (5) 'tdd로 작업', 'TDD 워크플로우', 'test-first', '테스트 퍼스트' 요청 시."
allowed-tools: Read Glob Grep Bash Agent
---

# TDD Orchestrator

에이전트 팀을 활용한 TDD(Red-Green-Refactor) 파이프라인 오케스트레이터.

tdd-leader 에이전트가 팀을 구성하고, 각 TDD Phase에 적합한 전문 에이전트를 스폰하여 테스트 주도 개발을 자동 수행한다.

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:tdd {feature}` | TDD 파이프라인 실행 |
| "TDD로 {feature} 구현해줘" | TDD 파이프라인 실행 |
| "이거 구현해줘" (하네스 존재 시) | TDD 파이프라인 실행 |

## 실행 모드: 에이전트 팀

tdd-leader가 TeamCreate로 팀을 만들고, 각 스테이지마다 전문 에이전트를 스폰하여 순차 실행한다. 에이전트들은 살아있는 상태로 SendMessage를 통해 통신한다.

```
                    ┌─────────────┐
                    │  tdd-leader  │  ← 팀 생성, 관찰, 조율, 판단
                    └──────┬──────┘
           ┌───────┬───────┼───────┬────────┬─────────┐
           │       │       │       │        │         │
      architect  test-   executor code-  security- debugger
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
| tdd-analyze | architect | 설계 분석, 영향 파일 식별 | 인터페이스/파일 목록 존재 |
| tdd-red | test-engineer | 실패하는 테스트 작성 | 모든 테스트 FAIL |
| tdd-green | executor | 최소 코드로 테스트 통과 | 모든 테스트 PASS |
| tdd-refactor | code-reviewer → executor | 코드 리뷰 후 리팩터 | 테스트 여전히 PASS |
| tdd-verify | security-reviewer + debugger | 보안 검사 + 전체 검증 | 빌드/테스트/타입체크 PASS |
| tdd-fix | debugger + executor | 실패 시 수정 루프 | 최대 3회 |

## 워크플로우

### Phase 0: 사전 확인

1. 하네스 존재 확인 — `.claude/agents/` 디렉토리에 코어 에이전트가 있는지 확인
2. 하네스가 없으면 사용자에게 안내: "먼저 `/oh-my-harness:harness`로 에이전트 팀을 구축해주세요."
3. 기능 요청 파싱 — 사용자 입력에서 구현할 기능 설명 추출
4. 기존 `.tdd/` 워크스페이스 확인:
   - 없으면 → 신규 실행
   - 있으면 + 같은 기능 → 재실행 (기존 handoff 참조)
   - 있으면 + 다른 기능 → `.tdd/`를 `.tdd_{timestamp}/`로 이동 후 신규 실행

### Phase 1: tdd-leader 스폰

tdd-leader 에이전트를 Agent 도구로 스폰한다. leader에게 전달할 프롬프트:

```
다음 기능을 TDD 파이프라인으로 구현해주세요.

## 기능 요청
{사용자의 기능 설명}

## 프로젝트 정보
- 작업 디렉토리: {cwd}
- 기술 스택: {감지된 스택 정보}
- 테스트 프레임워크: {감지된 테스트 프레임워크}
- 빌드 명령: {감지된 빌드 명령}
- 테스트 명령: {감지된 테스트 명령}

## 사용 가능한 에이전트
{.claude/agents/ 에 있는 에이전트 목록}

TDD 파이프라인 프로토콜에 따라 실행하세요.
```

### Phase 2: 결과 수신 & 보고

tdd-leader가 전체 파이프라인을 완료하면 최종 보고서를 반환한다. 이를 사용자에게 전달.

## 프로젝트 정보 감지

스킬이 tdd-leader를 스폰하기 전에 프로젝트 정보를 수집한다:

| 정보 | 감지 방법 |
|------|----------|
| 기술 스택 | `package.json` dependencies, `tsconfig.json`, `nest-cli.json` 등 |
| 테스트 프레임워크 | `vitest.config.*`, `jest.config.*`, `package.json` scripts |
| 빌드 명령 | `package.json` scripts.build |
| 테스트 명령 | `package.json` scripts.test |
| 기존 테스트 패턴 | `__tests__/`, `*.spec.ts`, `*.test.ts` glob |

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
| Analyze | architect | ✅ |
| Red | test-engineer | ✅ |
| Green | executor | ✅ |
| Refactor | code-reviewer | ✅ |
| Security | security-reviewer | ✅ |
| Verify | debugger | ✅ |

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
