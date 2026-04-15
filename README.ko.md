<p align="center">
  <img src="assets/logo.png" alt="oh-my-harness" width="720"/>
</p>

<p align="center">
  <b>프로젝트를 분석하고, 맞춤 에이전트 팀을 자동으로 구축하는 Claude Code 플러그인</b><br/>
  <sub>A Claude Code plugin that analyzes your project and auto-builds a tailored agent team</sub>
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ・ <a href="README.ko.md">🇰🇷 한국어</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.1-blue.svg" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license"/>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-purple.svg" alt="claude code plugin"/>
</p>

<br/>

---

<br/>

### harness가 뭔가요?

원래 *harness*는 **말에 씌우는 마구(馬具)** — 고삐·굴레·안장끈처럼 말이라는 힘 센 동물을 붙잡고 원하는 방향으로 부릴 수 있게 해주는 장구를 말한다. 이 단어가 공학으로 넘어오면서 비유가 됐다. **test harness**는 단위 코드를 고립시켜 돌려보기 위해 입력·스텁·단언문을 엮어주는 틀이고, 같은 개념이 ML 모델을 위한 **evaluation harness**(`lm-evaluation-harness` 등)로 확장됐다. 그리고 LLM 시대에 와서는 **agent harness** — LLM이 제멋대로 달아나지 않고 실제 일을 하도록 붙잡아주는 프롬프트·툴·가드레일의 뼈대 — 로 다시 자리 잡았다.

**oh-my-harness**는 이 마지막 의미를 한 걸음 더 밀어붙인다. 범용 에이전트 뼈대를 그냥 깔아주는 대신, **먼저 프로젝트를 스캔**해서 스택과 아키텍처를 감지하고, 그 **증거에 맞춰진 뼈대**를 세운다 — 각자 필요한 맥락만 아는 전문 에이전트 팀의 형태로. 말(LLM)은 그대로지만, 마구(harness)는 이제 *당신 프로젝트의 형태*에 맞춰 재단된다.

<br/>

### 한마디로

> **"harness"라고 말하면 팀이 생긴다.**
>
> 프로젝트를 스캔해서 framework·architecture·test stack을 감지하고, 그 증거를 **에이전트 프롬프트에 직접 주입**해서 프로젝트 맞춤 에이전트 팀을 자동 구축한다. DDD/Hex/NestJS가 미리 박혀있지 않다 — 실제 코드가 그렇게 말할 때만 그 렌즈를 쓴다.

<br/>

### 왜 필요한가

Claude Code는 강력하지만, 에이전트 하나가 설계·구현·테스트·리뷰·보안·디버깅을 전부 하면 컨텍스트가 과부하되고 품질이 들쭉날쭉해진다.

**oh-my-harness**는 이 문제를 다음과 같이 해결한다.

- 🎯 **관심사 분리** — 각 에이전트는 단일 책임과 강제된 경계를 가진다
- 🤝 **멀티 모델 오케스트레이션** — Claude Opus는 추론, Codex(GPT-5.4)는 코딩, 또는 직접 선택
- 🔍 **프로젝트 인식 생성** — 스택을 분석해 필요한 추가 에이전트를 자동 생성 (예: 감지된 상태가 Hexagonal이면 `domain-expert`)
- 🚪 **사용자 승인 게이트 기반 스킬 합성** — 스킬은 고정 매트릭스로 미리 찍어내지 않는다. 하네스가 증거 기반으로 도메인 용어가 들어간 후보를 제시하고, **사용자가 승인한 것만** 생성된다 (0개도 정상) *(v1.0.1 신규)*
- 💾 **한 번 세팅, 영속 팀** — 하네스 설정은 `.claude/`에 저장되어 세션 간 유지
- 🎨 **감지 → 주입 아키텍처** — framework와 architecture style은 미리 박지 않고 런타임에 감지해서 `<Project_Context>` 블록으로 주입한다 *(v1.0.0 신규)*

<br/>

### 빠른 시작

**1. 플러그인 설치**

```bash
/plugin marketplace add MoonDongmin/oh-my-harness
/plugin install oh-my-harness
```

<br/>

**2. Codex CLI (선택, 권장)**

```bash
npm install -g @openai/codex
codex login
```

Codex CLI가 없으면 코딩 에이전트는 Claude Sonnet으로 대체된다.

<br/>

**3. 프로젝트에서 하네스 실행**

```
/oh-my-harness:harness
```

프로젝트 타입을 자동 감지해서 `harness-be`(백엔드) 또는 `harness-fe`(프론트엔드)로 위임한다. 원하면 직접 호출할 수도 있다.

```
/oh-my-harness:harness-be     # 백엔드 프로젝트 전용
/oh-my-harness:harness-fe     # 프론트엔드 프로젝트 전용
```

<br/>

### 명령어

| 명령어 | 설명 |
|--------|------|
| `/oh-my-harness:harness` | **라우터** — BE/FE 자동 감지 후 서브 스킬로 위임 |
| `/oh-my-harness:harness-be` | 백엔드 전용 하네스 빌더 (framework/architecture/ORM 감지) |
| `/oh-my-harness:harness-fe` | 프론트엔드 전용 하네스 빌더 (framework/rendering/a11y/perf 감지) |
| `/oh-my-harness:tdd` | TDD 팀 파이프라인 (Red → Green → Refactor, category-aware) |
| `/oh-my-harness:implement` | 범용 팀 구현 파이프라인 (리팩토링·마이그레이션·구조 변경) |
| `/oh-my-harness:verify` | 변경사항 검증 (빌드·테스트·타입체크) |
| `/oh-my-harness:help` | 도움말 |

<br/>

### 코어 6 에이전트

각 에이전트는 고유한 권한과 전문성을 가진다. **프롬프트는 프레임워크 중립이며, 실제 프로젝트의 증거는 하네스가 `<Project_Context>` 블록으로 주입한다.**

<br/>

#### 🏛 architect — *"모든 주장은 구체적인 코드로 추적 가능해야 한다"*

전략 자문. 아키텍처를 분석하고 루트 원인을 진단한다. **읽기 전용** — 절대 코드를 수정하지 않고, `file:line` 증거와 함께 권고만 한다.

- 감지된 아키텍처 스타일(hexagonal / clean / layered / mvc / modular-monolith / ...)에 맞는 렌즈 사용
- 3-failure 서킷 브레이커: 3회 이상 수정 시도가 실패하면 변주를 시도하지 않고 아키텍처 자체를 의심
- **모델: Opus** (깊은 추론)

<br/>

#### 🧪 test-engineer — *"실패하는 테스트 없이 프로덕션 코드 없음"*

TDD 집행자. 구현이 존재하기 **전에** 실패하는 테스트를 작성한다. 테스트는 executor가 만족시켜야 하는 실행 가능한 스펙이 된다.

- RED 페이즈 전담 — 테스트를 작성하고, 실행하고, 전부 FAIL임을 확인
- 감지된 `test_stack`(jest / vitest / pytest / RTL / Playwright / ...)을 정확히 따른다
- **모델: Codex** (코드 생성)

<br/>

#### ⚡ executor — *"작고 올바른 변경이 크고 영리한 변경을 이긴다"*

구현자. 테스트를 통과시키는 **최소 코드**를 작성한다. 오버 엔지니어링, 스코프 크립, "온 김에" 리팩토링 없음.

- 작업을 Trivial / Scoped / Complex로 분류해 노력을 조정
- 기존 코드베이스 관례(네이밍, 에러 처리, import)를 따른다
- **모델: Codex** (코드 생성)

<br/>

#### 🔍 code-reviewer — *"스펙 준수가 우선, 스타일 지적은 나중"*

품질 게이트. 심각도 기반(CRITICAL / HIGH / MEDIUM / LOW) 리뷰와 구체적인 수정 제안을 수행.

- 로직 정합성, SOLID 원칙, 에러 처리, 안티패턴 평가
- 주입된 Project_Context에 따라 **백엔드 기준**(레이어 방향, 트랜잭션 경계) 또는 **프론트엔드 기준**(컴포넌트 SRP, 렌더 비용, a11y) 적용
- **읽기 전용** | **모델: Opus**

<br/>

#### 🛡 security-reviewer — *"취약점 하나가 실제 금전적 손실을 일으킬 수 있다"*

보안 전문가. OWASP Top 10을 평가하고 하드코딩된 시크릿을 스캔하며 의존성을 감사한다.

- **위협 모델 가중치가 감지된 런타임에 적응** — 서버 코드는 injection/SSRF/authorization 우선, 클라이언트 코드는 XSS/CSP/DOM clobbering 우선, RSC는 둘 다 + Server Action 검증 포함
- 심각도 × 익스플로잇 가능성 × 영향 범위 기준으로 우선순위
- **읽기 전용** | **모델: Opus**

<br/>

#### 🐛 debugger — *"증상이 아니라 루트 원인을 고쳐라"*

최소 수정 전문가. 먼저 재현하고, 다음에 가설을 세우고, 가능한 가장 작은 변경으로 고친다.

- 재현 방법은 런타임에 따라 자동 선택(API 호출 / 브라우저 DevTools / 테스트 러너)
- 한 번에 하나의 가설, 한 번에 하나의 수정(영향 파일의 < 5%)
- 3-failure 서킷 브레이커: 가설 3개가 실패하면 추측하지 말고 에스컬레이션
- **모델: Codex**

<br/>

### Codex 위임은 어떻게 동작하나

하네스 빌드 시 어떤 에이전트의 모델로 "Codex"를 선택하면, 그 에이전트는 Claude를 완전히 대체하는 게 아니라 **`Bash(codex exec --full-auto)` 권한을 가진 Claude 오케스트레이터**가 된다. 운전대는 여전히 Claude가 잡는다 — 파일을 읽고, 변경을 계획하고, 프롬프트를 쓰고, 언제 코드 작성을 위임할지 결정하고, 돌아온 결과를 검토하는 것까지. 날것의 *"코드를 찍어내는"* 단계만 로컬 Codex CLI(GPT-5.4)에 위임되고, 이건 네 장비에서 같은 파일 시스템 위에서 돌아간다.

구체적으로는 이렇다:

- **추론은 Claude가 담당.** 아키텍처 판단, 테스트 해석, 제약 확인, 리뷰는 전부 Claude(Opus 또는 Sonnet, 하네스 빌드 시 선택)가 한다.
- **코드 생성은 Codex에 위임.** *"이 함수를 구현하라"* / *"이 실패한 테스트를 통과시켜라"* 같은 단계는 `codex exec --full-auto`로 디스패치되고, 그 diff가 대화로 돌아와 Claude가 받아 통합한다.
- **Codex가 없으면 폴백.** `codex`가 `PATH`에 없으면 에이전트는 조용히 순수 Claude Sonnet으로 내려간다 — 하네스는 그대로 동작하고, 전담 코더만 잃을 뿐이다.

이래서 위에서 `test-engineer`, `executor`, `debugger`가 *"모델: Codex"* 로 표기되는 거다. 이들은 Codex 네이티브 에이전트가 아니라, **생성 단계에서 Codex를 툴처럼 *호출*하는 Claude 주도 에이전트**다. 한쪽에서는 Claude의 추론이, 다른 쪽에서는 Codex의 코드 작성이 한 에이전트 턴 안에서 이어 붙는다.

<br/>

### 감지 → 주입 아키텍처 *(v1.0.0의 핵심)*

```
  /oh-my-harness:harness
          │
          ▼
  ┌───────────────────┐
  │   라우터 스킬        │  package.json 스캔 → BE/FE 시그널 점수
  └─────────┬─────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
 harness-be   harness-fe
      │           │
      ▼           ▼
┌─────────────────────┐
│ Detection Protocol  │  framework / architecture / ORM / test stack /
│                     │  rendering model / state / a11y / bundle / ...
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Project_Context Injection        │  감지된 사실 → <Project_Context>
│                                  │  XML 블록을 각 에이전트에 주입
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Core 6 + Conditional Specialists │  코어 6은 항상 생성,
│                                  │  전문가 에이전트는 감지 조건 충족 시에만 추가
│                                  │  (예: Hexagonal이면 domain-expert,
│                                  │   RSC이면 rsc-boundary-inspector)
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Skill Candidates → User Gate     │  도메인 용어가 들어간 스킬 후보 0~4개
│                                  │  제시 (예: `order-field-sync`,
│                                  │   `migration-check` 같은 제네릭은 금지).
│                                  │  사용자가 승인한 것만 생성. 0개도 정상.
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ CLAUDE.md Fingerprint            │  감지 결과를 기록하여
│                                  │  tdd/implement 스킬이 재활용
└──────────────────────────────────┘
```

<br/>

### 자동 생성 전문가 에이전트

감지 결과에 따라 조건부로 합성된다.

<br/>

**harness-be (백엔드):**

| 조건 | 에이전트 | 역할 |
|------|---------|------|
| `architecture_style ∈ {hexagonal, clean, modular-monolith}` AND domain 파일 ≥ 5 | `domain-expert` | 도메인 모델 / 불변식 검증 |
| `api_style ∈ {rest, graphql, grpc, trpc}` AND 라우터 파일 ≥ 5 | `api-specialist` | API 설계 & 계약 검증 |
| `data_layer ≠ none` AND 마이그레이션 존재 | `data-engineer` | 스키마 / 쿼리 / 마이그레이션 검증 |
| Docker / k8s / terraform 감지 | `infra-reviewer` | 인프라 설정 리뷰 |
| 모노레포 툴링(turbo / nx / lerna) | `monorepo-coordinator` | 크로스 패키지 영향 |
| `test:source < 0.3` | `qa-agent` | 테스트 공백 보강 |

<br/>

**harness-fe (프론트엔드, 2026 품질 게이트 기반):**

| 조건 | 에이전트 | 역할 |
|------|---------|------|
| **항상** | `ui-reviewer` | 컴포넌트 SRP, prop hygiene, 상태 colocation |
| **항상** | `a11y-auditor` | WCAG 2.2 AA, 키보드, ARIA, 의미론적 HTML |
| `build_tool ≠ unknown` | `perf-auditor` | Core Web Vitals, 번들 예산 |
| `test_stack`에 RTL / Playwright / Storybook 포함 | `component-test-engineer` | RTL / Playwright Component / Storybook play |
| `.storybook/` 존재 | `storybook-guardian` | Story-as-spec 동기화 |
| Redux / Zustand / Jotai / Pinia / MobX + store ≥ 3 | `state-architect` | Store shape, selectors, re-renders |
| i18n 라이브러리 감지 | `i18n-reviewer` | 번역 키, plurals, RTL |
| 디자인 시스템 감지 | `design-system-guardian` | 토큰 일관성, variant drift |
| `rendering_model ∈ {ssr, rsc-app-router, hybrid, islands}` | `rsc-boundary-inspector` | 'use client' hygiene, 서버 모듈 누수 |

<br/>

### 프로젝트 고유 스킬 (Opt-in) *(v1.0.1 신규)*

이전 버전은 어떤 프로젝트든 `migration-check`, `a11y-check`, `bundle-budget` 같은 고정 스킬 세트를 자동 생성했다. 문제는 이 이름들이 너무 제네릭해서 트리거가 잘 안 되고, 대부분의 사용자가 실제로 호출하지 않는다는 점이었다.

이제는 스킬 생성이 **사용자 승인 게이트**를 거친다.

1. 하네스가 프로젝트를 스캔해 **최대 4개의 후보**를 제시한다. 각 후보의 이름은 실제 모듈·컴포넌트·라우트에서 직접 유도된다 — 예: `order-field-sync`, `checkout-form-a11y-audit`, `payment-webhook-scaffold`.
2. 각 후보는 **왜 제안됐는지** (어떤 디렉토리 패턴이 트리거했는지), **트리거 키워드**, 그리고 본문에 **주입될 컨텍스트** (실제 파일 경로, 실제 import)를 함께 보여준다.
3. 사용자는 `AskUserQuestion`으로 0~N개를 선택한다. **0개 선택도 정상 흐름**이다 — 맞는 게 없으면 스킬을 만들지 않고도 빌드는 정상 완료. 코어 6 + 리더 + 조건부 전문가 에이전트는 어차피 항상 생성된다.
4. 승인된 후보만 SKILL.md로 작성되며, 본문에는 실제 파일 경로·import 패턴·이 프로젝트의 실제 도메인 어휘가 박힌다.

`migration-check`, `a11y-check` 같은 제네릭 이름은 **후보 단계에서 명시적으로 거부**된다 — 어떤 동일 스택 프로젝트에서도 통하는 이름은 이 프로젝트에는 너무 제네릭하다.

<br/>

### 출력 구조

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── architect.md               # Project_Context 주입됨
│   │   ├── test-engineer.md
│   │   ├── executor.md
│   │   ├── code-reviewer.md
│   │   ├── security-reviewer.md
│   │   ├── debugger.md
│   │   ├── tdd-leader.md              # TDD 파이프라인 리더
│   │   ├── team-leader.md             # 범용 구현 리더
│   │   └── {감지된 전문가}.md          # 조건부
│   └── skills/                        # 사용자 게이트 통과 시만, 비어있어도 정상
│       └── {도메인 유도 스킬}/         # 예: order-field-sync (승인된 경우만)
│           └── SKILL.md
└── CLAUDE.md                          # <!-- harness-fingerprint v1 --> 블록 포함
```

<br/>

### 모델 선택

하네스 빌드 시 각 에이전트의 모델을 사용자가 선택한다.

| 옵션 | 모델 | 적합 |
|------|------|------|
| **[O] Opus** | Claude Opus 4.6 | 깊은 추론·분석·리뷰 |
| **[S] Sonnet** | Claude Sonnet 4.6 | 빠른 응답·균형 |
| **[C] Codex** | GPT-5.4 (Codex CLI 경유) | 코드 생성·구현 |
| **[X] Custom** | 사용자 지정 | 임의 provider/model |

<br/>

---

<br/>

## 요구사항

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [Codex CLI](https://github.com/openai/codex) (선택 — 미설치 시 Claude Sonnet으로 대체)

<br/>

## 크레딧

두 오픈소스 프로젝트의 아이디어 위에 구축되었다.

- **[oh-my-claudecode](https://github.com/yeachan-heo/oh-my-claudecode)** — 코어 6 에이전트 정의, 키워드 감지 훅, verify 스킬
- **[harness](https://github.com/revfactory/harness)** — 하네스 메타 스킬, 레퍼런스 문서(에이전트 설계 패턴, 오케스트레이터 템플릿)

<br/>

## 라이선스

MIT

<br/>
