# oh-my-harness

프로젝트 맞춤형 에이전트 팀을 자동 구축하는 Claude Code 플러그인.

## 코어 에이전트 (6)

| Agent | 역할 | 기본 권장 |
|-------|------|----------|
| architect | 설계, 아키텍처 분석 | opus |
| test-engineer | TDD 테스트 작성, 커버리지 | codex |
| executor | 코드 구현, 최소 diff | codex |
| code-reviewer | 코드 리뷰, SOLID, 품질 | opus |
| security-reviewer | OWASP Top 10, 시크릿 스캔 | opus |
| debugger | 루트 원인 분석, 빌드 에러 | codex |

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

프로젝트 분석 후 harness가 자동 생성:
- **planner** (모듈 5+), **analyst** (복잡한 요구사항), **critic** (교차 검증)
- **domain-expert** (도메인 디렉토리 다수), **api-specialist** (API 다수), **data-engineer** (DB/ORM)
- **infra-reviewer** (Docker/k8s/terraform), **monorepo-coordinator** (모노레포)
- **ui-reviewer** (프론트엔드), **pipeline-guardian** (CI/CD), **qa-agent** (테스트 부족)

## 스킬

| Skill | 트리거 | 용도 |
|-------|--------|------|
| harness | "하네스 만들어줘", "harness" | 프로젝트 에이전트 팀 구축 (코어 6 + 리더 2 + 추가 자동 생성) |
| tdd | "TDD로 구현해줘", "tdd", "구현해줘" | TDD 에이전트 팀으로 Red-Green-Refactor 자동 수행 |
| implement | "팀으로 구현", "리팩토링", "구조 변경", "마이그레이션" | 범용 팀 구현 (analyze→plan→implement→review→security→verify) |
| verify | "검증해줘", "verify" | 변경사항 실제 동작 검증 |

## 한국어 트리거

| 키워드 | 스킬 |
|--------|------|
| 하네스 만들어줘, 하네스 구성, 하네스 설계 | harness |
| oh-my-harness, 에이전트 팀 구성/세팅/빌드 | harness |
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
