# oh-my-harness

프로젝트 맞춤형 에이전트 팀을 자동 구축하는 Claude Code 플러그인.

"하네스 만들어줘"라고 말하면, 프로젝트를 분석하고 코어 6 에이전트를 포함한 에이전트 팀을 자동으로 생성합니다.

## 배경

Claude Code에서 복잡한 프로젝트를 다룰 때, 설계·구현·테스트·리뷰·보안·디버깅을 한 에이전트가 모두 처리하면 컨텍스트가 비대해지고 품질이 떨어집니다.

**oh-my-harness**는 이 문제를 해결합니다:
- 역할별 전문 에이전트를 자동 생성하여 **관심사를 분리**합니다
- 에이전트별로 **Claude(opus) 또는 Codex CLI(gpt-5.4)** 중 적합한 모델을 선택할 수 있습니다
- 프로젝트 특성을 분석해 **추가 에이전트와 오케스트레이터**를 자동으로 생성합니다

## 설치

### 사전 요구사항

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 설치
- [Codex CLI](https://github.com/openai/codex) 설치 (선택 — 없으면 Claude로 대체)

### GitHub에서 설치

```bash
/plugin marketplace add MoonDongmin/oh-my-harness
/plugin install oh-my-harness
```

### 로컬 설치 (개발용)

```bash
git clone https://github.com/MoonDongmin/oh-my-harness.git
cd oh-my-harness
bun install

# Claude Code에서 플러그인 설치
claude plugins:install /path/to/oh-my-harness
```

## 사용법

### 하네스 만들기

플러그인 설치 후, **아무 프로젝트에서** Claude Code를 열고 다음 중 하나를 입력합니다:

```
하네스 만들어줘                    # 한국어 키워드
/oh-my-harness:harness            # 슬래시 커맨드
```

기능과 함께 호출하면 하네스 빌드 후 바로 작업을 시작합니다:

```
/oh-my-harness:harness UserService CRUD 만들어줘
```

### 검증하기

변경사항이 실제로 동작하는지 테스트·빌드·타입체크로 검증합니다:

```
검증해줘
/oh-my-harness:verify
```

### 전체 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/oh-my-harness:harness` | 프로젝트 에이전트 팀 구축 |
| `/oh-my-harness:verify` | 변경사항 동작 검증 |
| `/oh-my-harness:help` | 도움말 표시 |

### 한국어 키워드

| 키워드 | 실행되는 스킬 |
|--------|-------------|
| 하네스 만들어줘, 하네스 구성, 하네스 설계 | harness |
| 검증해줘, 확인해봐 | verify |

## 동작 과정

### 1. 키워드 감지

사용자가 프롬프트를 입력하면 `UserPromptSubmit` 훅이 한국어/영어 키워드를 감지합니다.

```
사용자: "하네스 만들어줘"
  → keyword-detector.mjs가 "하네스" 감지
  → harness 스킬의 SKILL.md를 Claude 컨텍스트에 주입
```

### 2. 프로젝트 분석

harness 스킬이 대상 프로젝트를 분석합니다:
- 기술 스택 (package.json, tsconfig 등)
- 디렉토리 구조와 기존 패턴
- NestJS/DDD 프로젝트는 Hexagonal Architecture 자동 감지

### 3. 에이전트 팀 생성

분석 결과를 바탕으로 에이전트 팀을 구축합니다:

```
Phase 1  코어 6 에이전트 생성 (에이전트별 모델 선택)
Phase 2  추가 에이전트/스킬 자동 생성 (프로젝트 특성에 따라)
Phase 3  오케스트레이터 생성 (에이전트 간 협업 워크플로우)
Phase 4  CLAUDE.md에 하네스 컨텍스트 등록
```

### 4. 결과물

대상 프로젝트에 다음이 생성됩니다:

```
my-project/
├── .claude/
│   ├── agents/
│   │   ├── architect.md         # 설계/분석 (opus)
│   │   ├── test-engineer.md     # TDD 테스트 작성 (codex)
│   │   ├── executor.md          # 코드 구현 (codex)
│   │   ├── code-reviewer.md     # 코드 리뷰 (opus)
│   │   ├── security-reviewer.md # 보안 리뷰 (opus)
│   │   ├── debugger.md          # 디버깅 (codex)
│   │   └── ...                  # 프로젝트별 추가 에이전트
│   └── skills/
│       └── {orchestrator}/      # 에이전트 팀 오케스트레이터
│           └── SKILL.md
└── CLAUDE.md                    # 하네스 컨텍스트 등록
```

이후 해당 프로젝트에서 작업을 요청하면 오케스트레이터가 에이전트 팀에 작업을 분배합니다.

## 코어 6 에이전트

| Agent | 역할 | 기본 권장 모델 |
|-------|------|---------------|
| **architect** | 설계, 아키텍처 분석, DDD/Hex 가이드 | opus (사고/추론) |
| **test-engineer** | TDD 테스트 작성, 커버리지 | codex (코딩) |
| **executor** | 코드 구현, 최소 diff | codex (코딩) |
| **code-reviewer** | 코드 리뷰, SOLID, 품질 | opus (사고/추론) |
| **security-reviewer** | OWASP Top 10, 시크릿 스캔 | opus (사고/추론) |
| **debugger** | 루트 원인 분석, 빌드 에러 해결 | codex (코딩) |

**모델 매핑:**
- **opus** → Claude CLI (`claude-opus-4-6`) — 사고/추론에 강함
- **codex** → Codex CLI (`codex exec --full-auto`, `gpt-5.4`) — 코딩/구현에 강함

에이전트별 모델은 harness 빌드 시 사용자가 직접 선택합니다.

## 프로젝트 구조

```
oh-my-harness/
├── .claude-plugin/
│   └── plugin.json              # 플러그인 매니페스트
├── agents/                      # 코어 6 에이전트 템플릿
│   ├── architect.md
│   ├── test-engineer.md
│   ├── executor.md
│   ├── code-reviewer.md
│   ├── security-reviewer.md
│   └── debugger.md
├── skills/
│   ├── harness/                 # 하네스 빌더 스킬
│   │   ├── SKILL.md
│   │   └── references/          # 참조 문서
│   └── verify/                  # 검증 스킬
│       └── SKILL.md
├── hooks/
│   └── hooks.json               # 키워드 감지 훅 설정
├── scripts/
│   ├── keyword-detector.mjs     # 한/영 키워드 → 스킬 트리거
│   └── lib/stdin.mjs
├── commands/                    # 슬래시 커맨드 정의
│   ├── harness.md
│   ├── verify.md
│   └── help.md
├── CLAUDE.md
└── package.json
```

## 참조 프로젝트

이 플러그인은 두 개의 오픈소스 프로젝트에서 핵심 기능을 가져왔습니다.

- **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)**: 6개 코어 에이전트 정의, 키워드 감지 훅 시스템, verify 스킬
- **[harness](https://github.com/revfactory/harness)**: 하네스 메타스킬, 참조 문서 (에이전트 설계 패턴, 오케스트레이터 템플릿 등)

## Codex 없이 사용

Codex CLI가 설치되어 있지 않아도 동작합니다. codex 모델을 선택한 에이전트는 Claude Sonnet으로 자동 대체됩니다.

## 라이선스

MIT
