# oh-my-harness

프로젝트 맞춤형 에이전트 팀을 자동 구축하는 Claude Code 플러그인.

## 코어 에이전트 (6)

| Agent | 역할 | 기본 권장 |
|-------|------|----------|
| architect | 설계, 아키텍처 분석, DDD/Hex 가이드 | opus |
| test-engineer | TDD 테스트 작성, 커버리지 | codex |
| executor | 코드 구현, 최소 diff | codex |
| code-reviewer | 코드 리뷰, SOLID, 품질 | opus |
| security-reviewer | OWASP Top 10, 시크릿 스캔 | opus |
| debugger | 루트 원인 분석, 빌드 에러 | codex |

에이전트별 모델은 harness 빌드 시 사용자가 선택 (Opus/Sonnet/Codex/Custom).

**모델 매핑:**
- Opus → `provider: claude`, `model: claude-opus-4-6` (깊은 사고·추론)
- Sonnet → `provider: claude`, `model: claude-sonnet-4-6` (빠른 응답·균형 성능)
- Codex → `provider: claude`, `model: claude-sonnet-4-6` (Codex CLI 위임: `Bash(codex exec --full-auto)`)
- Custom → 사용자 지정 provider/model

추가 에이전트 (planner, analyst, critic 등)는 프로젝트 분석 후 harness가 자동 생성.

## 스킬

| Skill | 트리거 | 용도 |
|-------|--------|------|
| harness | "하네스 만들어줘", "harness" | 프로젝트 에이전트 팀 구축 (코어 6 필수 + 추가 자동 생성) |
| tdd | "TDD로 구현해줘", "tdd", "구현해줘" | TDD 에이전트 팀으로 Red-Green-Refactor 자동 수행 |
| verify | "검증해줘", "verify" | 변경사항 실제 동작 검증 |

## 한국어 트리거

| 키워드 | 스킬 |
|--------|------|
| 하네스 만들어줘, 하네스 구성, 하네스 설계 | harness |
| oh-my-harness, 에이전트 팀 구성/세팅/빌드 | harness |
| 구현해줘, 개발해줘, 작업 시작 (하네스 존재 시) | tdd (에이전트 팀 TDD) |
| TDD, 테스트 주도, Red-Green-Refactor | tdd |
| 검증해줘, 확인해봐 | verify |
