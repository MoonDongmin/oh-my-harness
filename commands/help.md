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
| `/oh-my-harness:harness` | 프로젝트 에이전트 팀 구축 (코어 6 필수 + 추가 자동 생성) |
| `/oh-my-harness:verify` | 변경사항 실제 동작 검증 |
| `/oh-my-harness:help` | 이 도움말 표시 |

## Quick Start

```
하네스 만들어줘                      → harness (프로젝트 분석 + 에이전트 팀 생성)
하네스 만들어줘 UserService 개발     → harness (에이전트 생성 + 기능 작업 시작)
검증해줘                             → verify
```

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
