---
name: implement
description: "에이전트 팀을 활용한 범용 구현 오케스트레이터. team-leader가 architect→executor→code-reviewer→security-reviewer→debugger 팀을 조율하여 대규모 구현/리팩토링/구조 변경/마이그레이션을 수행한다. (1) '팀으로 구현해줘', '에이전트 팀으로 작업' 요청 시, (2) '리팩토링해줘', '구조 변경해줘', '구조 개선' 요청 시, (3) '대규모 변경', '아키텍처 변경', '대규모 리팩토링' 요청 시, (4) '마이그레이션해줘', '모듈 추가', '새 기능 설계+구현' 요청 시, (5) 하네스가 있는 프로젝트에서 큰 규모의 변경을 요청할 때에도 적극적으로 사용, (6) '팀 워크', 'team work', '팀으로 개발' 요청 시."
allowed-tools: Read Glob Grep Bash Agent
---

# Implement Orchestrator

에이전트 팀을 활용한 범용 구현 파이프라인 오케스트레이터. TDD가 아닌 **유연한 구조적 작업**(리팩토링, 마이그레이션, 아키텍처 변경, 신규 기능 구현)을 team-leader가 조율한다.

team-leader 에이전트가 팀을 구성하고, 각 단계(analyze → plan → implement → review → security → verify)에 적합한 전문 에이전트를 스폰하여 작업을 자동 수행한다.

## CRITICAL RULES — DO NOT VIOLATE

1. **이 스킬은 DISPATCHER 역할만 한다.** 프로젝트 정보를 수집하고, Agent 도구로 team-leader를 스폰하고, 결과를 보고한다. 그것이 전부다.
2. **구현 Phase를 직접 수행하면 안 된다.** 분석, 계획, 구현, 리뷰, 보안 검사를 직접 하면 안 된다.
3. **반드시 Agent 도구를 호출하여 team-leader를 스폰해야 한다.** 프롬프트 내용을 읽고 직접 실행하지 말 것.
4. team-leader 에이전트 정의가 없으면 사용자에게 `/oh-my-harness:harness`로 에이전트 팀을 먼저 구축하라고 안내한다.

## TDD 스킬과의 차이

| 측면 | tdd | implement |
|------|-----|-----------|
| 리더 | tdd-leader | team-leader |
| 파이프라인 | analyze → red → green → refactor → verify | analyze → plan → implement → review → security → verify |
| RED 게이트 | 필수 (테스트 먼저 실패해야 함) | 없음 |
| 테스트 전략 | 무조건 먼저 | 유연 (기존 활용 / 병행 / 나중) |
| 핸드오프 | `.tdd/handoffs/` | `.work/handoffs/` |
| 적합한 작업 | 신규 기능의 TDD 개발 | 리팩토링, 마이그레이션, 구조 변경, 신규 기능 (유연) |

## 호출 패턴

| 입력 | 동작 |
|------|------|
| `/oh-my-harness:implement {작업}` | 팀 구현 파이프라인 실행 |
| "팀으로 {작업} 구현해줘" | 팀 구현 파이프라인 실행 |
| "리팩토링해줘" (하네스 존재 시) | 팀 구현 파이프라인 실행 |
| "구조 변경해줘" (하네스 존재 시) | 팀 구현 파이프라인 실행 |
| "대규모 마이그레이션" | 팀 구현 파이프라인 실행 |

## 실행 모드: 에이전트 팀

team-leader가 TeamCreate로 팀을 만들고, 각 스테이지마다 전문 에이전트를 Agent 도구로 개별 스폰하여 순차/병렬 실행한다.

```
                    ┌──────────────┐
                    │ 🚀 team-leader │  ← 팀 생성, 관찰, 조율, 판단
                    └──────┬──────┘
           ┌───────┬───────┼───────┬────────┬─────────┐
           │       │       │       │        │         │
      🏛 architect 🧪 test-  ⚡ executor 🔍 code-  🛡 security- 🐛 debugger
                engineer             reviewer reviewer
           │
           └── 👤 domain-expert, api-specialist, etc. (프로젝트별 추가 에이전트)
```

## Staged Pipeline

```
work-analyze → work-plan → work-implement → work-review → work-security → work-verify
                                                  ↑                          |
                                                  └──────── work-fix ────────┘
```

| Stage | Agent | Role | Gate |
|-------|-------|------|------|
| work-analyze | 🏛 architect | 영향 분석, 변경 유형 판단 | 영향 파일·변경 유형·위험도 |
| work-plan | 🏛 architect | 구체적 구현 계획 수립 | 서브태스크·에이전트 할당 |
| work-implement | ⚡ executor (+ 🧪 test-engineer 선택) | 코드 구현 (+ 테스트 선택) | 빌드 성공 + 테스트 PASS |
| work-review | 🔍 code-reviewer → ⚡ executor | 코드 리뷰 후 리팩터 | 리뷰 통과, 테스트 PASS |
| work-security | 🛡 security-reviewer | 보안 검사 (조건부) | OWASP 체크 통과 |
| work-verify | 🐛 debugger | 전체 검증 (빌드+테스트+타입) | 전부 PASS |
| work-fix | 🐛 debugger + ⚡ executor | 실패 시 수정 루프 | 최대 3회 |

**TDD와의 핵심 차이: RED gate가 없다.** 테스트가 이미 있으면 활용하고, 없으면 테스트 전략에 따라 유연하게 처리한다.

## 워크플로우

### Phase 0: 사전 확인

1. **하네스 존재 확인**: `.claude/agents/` 디렉토리에 코어 에이전트 + team-leader가 있는지 확인
2. 하네스가 없거나 team-leader가 없으면 사용자에게 안내:
   "먼저 `/oh-my-harness:harness`로 에이전트 팀을 구축해주세요. (team-leader 에이전트가 필요합니다.)"
3. **작업 요청 파싱** — 사용자 입력에서 수행할 작업 설명 추출
4. **기존 `.work/` 워크스페이스 확인:**
   - 없으면 → 신규 실행
   - 있으면 + 같은 작업 → 재실행 (기존 handoff 참조)
   - 있으면 + 다른 작업 → `.work/`를 `.work_{timestamp}/`로 이동 후 신규 실행

### Phase 1: 프로젝트 정보 수집

스킬이 team-leader를 스폰하기 전에 프로젝트 정보를 수집한다:

| 정보 | 감지 방법 |
|------|----------|
| 기술 스택 | `package.json` dependencies, `tsconfig.json`, `nest-cli.json`, `go.mod`, `requirements.txt` 등 |
| 테스트 프레임워크 | `vitest.config.*`, `jest.config.*`, `pytest.ini`, `package.json` scripts |
| 빌드 명령 | `package.json` scripts.build, `Makefile`, `go build` |
| 테스트 명령 | `package.json` scripts.test, `pytest`, `go test` |
| 기존 테스트 패턴 | `__tests__/`, `*.spec.ts`, `*.test.ts` glob |
| 사용 가능한 에이전트 | `.claude/agents/` 디렉토리의 에이전트 목록 (커스텀 에이전트 포함) |

**커스텀 에이전트 감지**: domain-expert, api-specialist, data-engineer, infra-reviewer, monorepo-coordinator 등 프로젝트별 에이전트가 있으면 목록에 포함하여 team-leader에게 전달한다.

### Phase 2: team-leader 스폰

**반드시 Agent 도구를 호출하여 team-leader를 스폰한다. 프롬프트를 읽고 직접 수행하지 말 것.**

Agent 도구 호출 파라미터:

| 파라미터 | 값 |
|---------|------|
| subagent_type | `"team-leader"` |
| model | `"opus"` |
| prompt | 아래 템플릿을 채워서 전달 |

프롬프트 템플릿:
```
다음 작업을 팀 구현 파이프라인으로 수행해주세요.

## 작업 요청
{사용자의 작업 설명}

## 프로젝트 정보
- 작업 디렉토리: {cwd}
- 기술 스택: {감지된 스택 정보}
- 테스트 프레임워크: {감지된 테스트 프레임워크}
- 빌드 명령: {감지된 빌드 명령}
- 테스트 명령: {감지된 테스트 명령}

## 사용 가능한 에이전트
{.claude/agents/ 에 있는 에이전트 목록과 각 에이전트의 model 정보}

코어 에이전트: architect, test-engineer, executor, code-reviewer, security-reviewer, debugger
커스텀 에이전트: {프로젝트별 에이전트 목록 (있다면)}

팀 구현 파이프라인 프로토콜에 따라 실행하세요.
각 Phase에서 반드시 Agent 도구로 전문 에이전트를 개별 스폰하세요.
커스텀 에이전트가 작업에 관련되면 해당 에이전트도 활용하세요.
```

### Phase 3: 결과 수신 & 보고

team-leader가 전체 파이프라인을 완료하면 최종 보고서를 반환한다. 이를 사용자에게 전달.

## 에러 핸들링

team-leader 내부에서 처리. 스킬 레벨의 에러 핸들링:

| 상황 | 처리 |
|------|------|
| 하네스 없음 | 사용자에게 `/oh-my-harness:harness` 안내 |
| team-leader 정의 없음 | `/oh-my-harness:harness` 재빌드 안내 |
| team-leader 스폰 실패 | 에러 메시지 출력, `agents/team-leader.md` 존재 확인 |
| team-leader가 CIRCUIT_BREAKER 반환 | 실패 보고서 사용자에게 전달, `.work/handoffs/` 참조 안내 |

## 출력 형식

team-leader의 최종 보고서를 그대로 전달:

```
## Team Work Pipeline Report

### Task
{작업 설명}

### Result: [PASS / FAIL / CIRCUIT_BREAKER]

### Phase Summary
| Phase | Agent | Status |
|-------|-------|--------|
| Analyze | 🏛 architect | ✅ |
| Plan | 🏛 architect | ✅ |
| Implement | ⚡ executor (+ 🧪 test-engineer) | ✅ |
| Review | 🔍 code-reviewer | ✅ |
| Security | 🛡 security-reviewer | ✅ / skipped |
| Verify | 🐛 debugger | ✅ |

### Change Type: [new-feature / refactor / migration / architecture]
### Files Changed: [count]
### Build: ✅ / ❌
### Tests: N passed, M failed
### Review: [findings]
### Security: [findings]
```

## 후속 작업

구현 완료 후 사용자가 다음을 요청할 수 있다:
- "다시 실행해줘" → 기존 `.work/` handoff 참조하여 재실행
- "리뷰만 다시 해줘" → work-review 스테이지만 재실행
- "검증해줘" → work-verify 스테이지만 재실행 또는 `/oh-my-harness:verify`로 위임
- "보안 다시 확인해줘" → work-security 스테이지만 재실행
- "이어서 해줘" → `.work/handoffs/` 읽고 미완료 스테이지부터 재개
