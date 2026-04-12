---
description: Show available oh-my-harness skills and usage
disable-model-invocation: true
---

Display the following help information to the user:

# oh-my-harness

프로젝트 맞춤형 에이전트 팀을 자동 구축하는 Claude Code 플러그인.

## Available Commands

| Command | Description |
|---------|-------------|
| `/oh-my-harness:harness` | 프로젝트 에이전트 팀 구축 (코어 6 + 리더 2 + 추가 자동 생성) |
| `/oh-my-harness:tdd` | TDD 파이프라인 실행 (tdd-leader가 Red-Green-Refactor 조율) |
| `/oh-my-harness:implement` | 범용 팀 구현 파이프라인 (team-leader가 analyze→plan→implement→review→security→verify 조율) |
| `/oh-my-harness:verify` | 변경사항 실제 동작 검증 |
| `/oh-my-harness:help` | 이 도움말 표시 |

## Quick Start

```
하네스 만들어줘                      → harness (프로젝트 분석 + 에이전트 팀 생성)
하네스 만들어줘 UserService 개발     → harness (에이전트 생성 + 기능 작업 시작)
TDD로 UserService 구현해줘           → tdd (Red-Green-Refactor)
팀으로 리팩토링해줘                  → implement (team-leader 구조 변경)
대규모 마이그레이션 해줘             → implement (team-leader 마이그레이션)
검증해줘                             → verify
```

## 언제 어떤 스킬을 쓸까?

| 상황 | 스킬 | 이유 |
|------|------|------|
| 신규 기능을 TDD로 개발 | `tdd` | Red-Green-Refactor 강제, 테스트 먼저 |
| 리팩토링, 마이그레이션, 아키텍처 변경 | `implement` | 유연한 테스트 전략, 변경 유형별 적응 |
| 테스트가 이미 있고 코드만 수정 | `implement` | RED 게이트 없이 진행 |
| 새 기능이지만 테스트를 나중에 | `implement` | 테스트 전략 선택 가능 |

## Core 6 Agents

| Agent | 역할 | 기본 권장 |
|-------|------|----------|
| architect | 설계/분석 | opus |
| test-engineer | 테스트 작성 | codex |
| executor | 구현 | codex |
| code-reviewer | 코드 리뷰 | opus |
| security-reviewer | 보안 리뷰 | opus |
| debugger | 디버깅 | codex |

에이전트별 모델(opus/codex)은 harness 빌드 시 사용자가 직접 선택합니다.
