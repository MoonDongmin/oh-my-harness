# Skill Generation Guide

> **이 문서는 `harness-be`/`harness-fe` Phase 5 Step 1의 필독 문서다.** 두 스킬 빌더는 Phase 5 진입 시 이 파일과 `skill-writing-guide.md`를 반드시 Read한 뒤 후보 도출 단계로 진행한다. 이 가이드 없이 후보를 추정하면 제네릭 일반명사가 나오고, 사용자가 안 쓰는 스킬이 생성된다.

프로젝트 분석 결과를 기반으로 **이 프로젝트에서 반복될 작업**을 후보로 도출하고, **사용자 승인을 거쳐** 선택된 것만 스킬로 번들링하는 가이드.

> **핵심 원칙**: "NestJS면 X 스킬" 같은 프레임워크 매핑이 아니라, "이 프로젝트의 실제 모듈·도메인에서 반복되는 작업 패턴"을 후보로 만들고, **사용자가 OK한 것만** 생성한다. 0개 생성도 정상 흐름이다.

---

## 목차

1. [후보 도출 절차 (5단계 탐색)](#1-후보-도출-절차-5단계-탐색)
2. [스킬 생성 판단 기준](#2-스킬-생성-판단-기준)
3. [스킬 SKILL.md 작성 템플릿](#3-스킬-skillmd-작성-템플릿)
4. [프로젝트 컨벤션 적응 방법](#4-프로젝트-컨벤션-적응-방법)
5. [스킬-에이전트 연결](#5-스킬-에이전트-연결)
6. [Good vs Bad 스킬 예시 + 네이밍 금지 목록](#6-good-vs-bad-스킬-예시--네이밍-금지-목록)
7. [사용자 게이트 안내 (옵션 형식)](#7-사용자-게이트-안내-옵션-형식)
8. [본문 작성 — Why-First 원칙](#8-본문-작성--why-first-원칙)

---

## 1. 후보 도출 절차 (5단계 탐색)

매트릭스 룩업 금지. 다음 5단계를 순서대로 수행한다.

### Step A — 디렉토리 관찰

Phase 1 감지 결과(`module_pattern`, `existing_modules`, `domain_terms`, `notable_files`, `infra`)와 함께 프로젝트 루트의 실제 디렉토리 트리를 한 번 더 본다. 어떤 이름의 디렉토리가 몇 개씩 반복되는지, 어떤 파일 패턴이 매 모듈마다 등장하는지 머릿속에 그린다.

### Step B — 가설 (자유 서술)

"이 프로젝트의 사람이 앞으로 한 달 안에 같은 일을 3번 이상 할 가능성이 있는 작업은?"을 자유롭게 5-8개 서술한다. 표가 아니라 문장이다. **이 시점에 스킬 이름을 짓지 않는다.** 작업 자체만 묘사:

```
- "주문 도메인에 새 필드를 추가할 때, prisma 스키마 → migration → DTO → 컨트롤러 4곳을 동기화"
- "결제 웹훅을 새로 받을 때, controller/service/dto/test 4개 파일과 서명 검증 미들웨어를 항상 같은 순서로 추가"
- "사용자 권한이 바뀔 때 guard·decorator·테스트 fixture 3곳을 바꾸는데 누락이 잦음"
```

### Step C — 검증

각 가설이 정말로 이 프로젝트에 해당하는지 **실제 파일로 1-2개 확인**한다. 가설 1번이 "주문 도메인 4곳 동기화"라면, 실제로 `src/modules/order/` 안에 prisma·DTO·controller가 모두 있는지 직접 확인. 가설이 검증 안 되면 버린다.

검증 통과한 가설만 살린다. 보통 5-8개 중 3-5개가 살아남는다.

### Step D — 후보 도출 (이름 짓기)

살아남은 가설마다 스킬 이름과 한 줄 용도를 정한다. **이름은 반드시 프로젝트의 실제 모듈명·도메인 용어·디렉토리 이름에서 유도**한다. §6 네이밍 금지 목록을 먼저 읽고 위반하지 않는지 확인.

```
- "주문 도메인 4곳 동기화" → order-field-sync
  용도: src/modules/order/ 작업 시 prisma·DTO·controller·migration 4곳 자동 동기화
- "결제 웹훅 추가" → payment-webhook-scaffold
  용도: 새 결제 웹훅 라우트 + 서명 검증 미들웨어 골격 생성
```

### Step E — 자체 필터링 (4개 상한 강제)

§2 판단 기준으로 후보를 거른다. 그리고 **최대 4개로 줄인다**. 이유: Step F 사용자 게이트가 단일 `AskUserQuestion` 호출을 쓰는데, 옵션 4개 상한이 있다. 또한 4개 상한이 사용자 결정 피로를 줄인다.

5개 이상이 살아남았다면, **에이전트별 우선순위**로 자른다 — 코어 6 에이전트 중 어느 에이전트가 가장 자주 쓸 후보인지 따져 상위 4개만 남긴다.

---

## 2. 스킬 생성 판단 기준

모든 검증된 후보가 사용자 게이트로 가야 하는 건 아니다.

### 후보로 올릴 만한 경우

- 에이전트가 **3회 이상** 동일 패턴의 작업을 할 것으로 예상
- 작업에 **프로젝트 고유의 규칙**이 있어 매번 설명하기 번거로움
- 작업 절차가 **3단계 이상**이고 순서가 중요
- 위반 시 회귀 가능성 (예: 4곳 동기화 누락)

### 후보에서 제외할 경우

- 에이전트가 이미 잘 아는 범용 작업 (Git 커밋, 파일 읽기, 단순 grep)
- 1회성 작업 (마이그레이션 1번 하고 끝날 일)
- 프로젝트 고유 규칙이 없는 단순 반복 — Claude가 그냥 알아서 잘 함
- 너무 추상적이라 본문에 박을 실제 경로/도메인 용어가 1-2개 미만

### 0개 후보도 정상

판단 기준을 통과하는 후보가 0개면 후보를 0개로 가져간다. 게이트 단계에서 사용자에게 "이번 빌드에 자동 생성할 만한 반복 패턴을 못 찾았다"고 알리고 정상 종료. **억지로 채우지 않는다.**

### 적정 스킬 수 (사용자 게이트 통과 후)

| 프로젝트 규모 | 후보 수 | 사용자 선택 후 평균 |
|-------------|---------|-------------------|
| 소규모 (모듈 5 미만) | 0-2개 | 0-1개 |
| 중규모 (모듈 5-15) | 2-4개 | 1-3개 |
| 대규모 (모듈 15+) | 3-4개 | 2-4개 |

**최대 후보 4개**, 사용자 선택 후 평균 1-3개가 정상 분포. 5개+ 생성이 일어났다면 Step E 필터링이 부족했던 것.

---

## 3. 스킬 SKILL.md 작성 템플릿

게이트 통과 후 선택된 후보에 대해서만 작성.

```markdown
---
name: {project-derived-skill-name}
description: "{이 스킬이 하는 일의 구체적 설명}. {이 스킬을 사용해야 하는 상황 나열}. {트리거 키워드 나열}."
allowed-tools: {필요한 도구 목록}
---

# {Skill Name}

{이 스킬의 목적 한 줄 설명}

## 프로젝트 컨텍스트

{이 스킬이 알아야 하는 프로젝트 고유 정보 — 실제 경로/모듈명/도메인 용어 최소 3개}
- 소스 루트: `{실제 path}`
- 파일 패턴: `{실제 발견된 pattern}`
- 기존 모듈/컴포넌트: {실제 list}

## 워크플로우

### Step 1: {첫 번째 단계}
{구체적 행동 지시 — 실제 파일명 사용}

### Step 2: ...

## 출력 형식

{스킬의 산출물 규격}

## 주의사항

{이 프로젝트에서 흔히 발생하는 실수와 회피 방법}
```

### Description 작성 규칙

description은 스킬의 **유일한 트리거 메커니즘**이다. 적극적(pushy)으로 작성한다.

**나쁜 예 (제네릭):**
```yaml
description: "모듈을 생성하는 스킬"
```

**좋은 예 (도메인 유도 + pushy):**
```yaml
description: "src/modules/order/ 하위에 새 주문 관련 필드/엔드포인트를 추가할 때 prisma schema → migration → DTO → controller 4곳을 동기화한다. '주문 필드 추가', '주문 마이그레이션', 'order field' 같은 요청에 반드시 이 스킬을 사용. 단순 조회/디버깅에는 트리거하지 말 것."
```

---

## 4. 프로젝트 컨벤션 적응 방법

스킬 본문은 프로젝트의 **실제 컨벤션**을 반영해야 한다. 여기서 게이트 통과한 후보의 description에서 약속한 "주입될 컨텍스트"를 본문으로 펼친다.

### 디렉토리 구조 적응

기존 모듈 1개를 Read하여 실제 구조를 파악한 후 본문 "프로젝트 컨텍스트" 섹션에 그대로 복사:

```markdown
## 프로젝트 컨텍스트

기존 user 모듈의 구조를 기준으로 새 모듈을 생성한다:

src/modules/user/
├── user.controller.ts    ← @Controller 데코레이터, 라우트 정의
├── user.service.ts       ← @Injectable, 비즈니스 로직
├── user.repository.ts    ← DB 접근 레이어
├── user.module.ts        ← @Module 등록
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
└── user.spec.ts          ← 단위 테스트
```

### 네이밍 규칙 적응

코드에서 관찰된 네이밍 패턴을 명시:

```markdown
## 네이밍 규칙
- 파일명: kebab-case (`create-order.dto.ts`)
- 클래스: PascalCase (`CreateOrderDto`)
- 변수/함수: camelCase (`findByUserId`)
- 테이블/컬럼: snake_case (`user_id`)
```

### Import 패턴 적응

기존 파일의 import 구조를 분석:

```markdown
## Import 규칙
- 경로 alias: `@modules/user/user.service` (tsconfig paths 사용)
- 내부 모듈: `import { UserService } from './user.service'`
- 외부 모듈: `import { Injectable } from '@nestjs/common'`
```

---

## 5. 스킬-에이전트 연결

스킬은 "어떻게 하는가", 에이전트는 "누가 하는가". 1:1 또는 1:N.

### 연결 방식

| 방식 | 구현 | 적합한 경우 |
|------|------|-----------|
| **프롬프트 내 인라인** | 에이전트 정의에 스킬 내용 직접 포함 | 스킬이 짧고(50줄 이하) 이 에이전트 전용 |
| **Skill 도구 호출** | 에이전트 프롬프트에 "Skill 도구로 /skill-name 호출" 명시 | 스킬이 독립 워크플로우이고 여러 에이전트가 공유 |
| **레퍼런스 로드** | `Read`로 스킬의 references/ 파일을 필요 시 로드 | 스킬 내용이 크고 조건부로만 필요 |

### CLAUDE.md에 바인딩 기록

하네스 빌드 Phase 6에서 CLAUDE.md에 에이전트-스킬 바인딩을 기록한다:

```markdown
**스킬:**
| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| order-field-sync | 주문 도메인 4곳 동기화 | executor |
| payment-webhook-scaffold | 결제 웹훅 골격 생성 | executor |
```

---

## 6. Good vs Bad 스킬 예시 + 네이밍 금지 목록

### 네이밍 금지 목록 (제네릭 일반명사)

다음 이름들은 **후보 단계에서 제외**한다. 어떤 프로젝트에서도 트리거가 약하고, 사용자가 안 쓴다.

| 금지 이름 | 이유 | 도메인 유도 대안 |
|----------|------|------------------|
| `migration-check` | 어떤 마이그레이션? 어떤 ORM? | `prisma-order-migration`, `typeorm-user-migration` |
| `api-workflow` | 어떤 API? 무슨 워크플로우? | `payment-api-contract`, `notification-webhook-scaffold` |
| `bundle-budget` | 어떤 번들? 어떤 예산? | `checkout-page-bundle-audit` |
| `ui-workflow` | 무한 추상 | `product-card-design-sync` |
| `a11y-check` | 어디의 a11y? | `checkout-form-a11y-audit` |
| `test-scaffold` | 어떤 테스트 패턴? | `nest-controller-test-scaffold`, `rtl-component-test-gen` |
| `domain-check` | 어떤 도메인? | `order-aggregate-invariant-check` |
| `config-sync` | 어떤 config? | `env-prod-staging-diff` |
| `pipeline-check` | 어떤 파이프라인? | `gha-deploy-impact-audit` |

**규칙**: 스킬 이름이 동일 분야의 다른 프로젝트에서도 그대로 통한다면, 그 이름은 너무 제네릭이다. 이름만 봐도 "이거 우리 프로젝트 거구나"가 와닿아야 함.

### Good 예시

```yaml
name: order-field-sync
description: "src/modules/order/에 새 필드를 추가할 때 prisma schema, migration, dto, controller 4곳을 동기화한다. '주문 필드 추가', 'add order field', '주문 마이그레이션' 요청에 반드시 사용."
```

본문에는:
- `src/modules/order/` 실제 파일 구조 트리
- 실제 import 패턴 (`@modules/order/order.service`)
- 실제 네이밍 규칙 (kebab-case 파일, snake_case DB)
- prisma schema 변경 후 `bun prisma migrate dev --name {feature}` 단계

### Bad 예시

```yaml
name: nestjs-module-scaffold
description: "NestJS 모듈을 생성하는 스킬"
```

본문에는:
- NestJS 공식 문서의 일반적인 모듈 생성 가이드
- `nest g module` 명령어 안내
- 프로젝트의 실제 구조와 무관한 범용 템플릿

**왜 Bad인가**:
- 이름이 프레임워크 이름 + 일반명사 → 어떤 NestJS 프로젝트에나 적용 가능 → Claude가 이미 아는 것
- 본문에 실제 파일 경로·도메인 용어가 없음 → 주입할 컨텍스트가 없으니 트리거 후에도 가치 없음

### 정전 예시 인용 (참조 harness)

`/Users/dongmin/Developments/claude/harness/skills/harness/references/team-examples.md:98-105`의 SF 소설 팀 스킬 네이밍:

```
worldbuilder        → world-setting
character-designer  → character-profile
plot-architect      → outline
prose-stylist       → write-scene, review-chapter
science-consultant  → science-check
```

스킬 이름이 모두 **그 팀의 도메인 명사**다. `novel-worldbuilding-skill` 같은 제네릭이 없다. 우리도 같은 컨벤션을 따른다 — 백엔드면 모듈명·도메인 용어, 프론트면 컴포넌트명·라우트명에서 직접 유도.

---

## 7. 사용자 게이트 안내 (옵션 형식)

Step F에서 후보를 사용자에게 제시할 때, 각 옵션 description은 다음 3요소를 **모두** 포함해야 한다. 빠지면 사용자가 판단 못 함.

### 필수 3요소

1. **감지 증거** — 왜 이 후보를 만들 만하다고 봤는지 (어떤 디렉토리·파일·반복 패턴을 봤는지)
2. **트리거 키워드** — 사용자가 어떤 말을 했을 때 이 스킬이 호출될지, 2-3개
3. **주입될 컨텍스트** — 본문에 들어갈 실제 모듈명/경로 1-2개

### 형식 예시

```
label: order-field-sync
description: "src/modules/order/ 작업 시 prisma·migration·dto·controller 4곳 동기화.
              증거: 기존 order/invoice/subscription 3개 모듈이 같은 패턴 반복.
              트리거: '주문 필드 추가', '주문 마이그레이션', 'order schema'.
              주입 컨텍스트: src/modules/order/, prisma/schema.prisma."
```

### AskUserQuestion 호출 형식

```
question: "이 프로젝트에서 자동 생성할 보조 스킬을 선택해줘. 0개 선택도 OK."
header: "스킬 후보"
multiSelect: true
options: [최대 4개]
```

후보가 0개면 게이트를 건너뛰고 "이번 빌드에 자동 생성할 만한 반복 패턴 없음"을 사용자에게 알린 뒤 Phase 6으로 직진.

---

## 8. 본문 작성 — Why-First 원칙

> 출처: `/Users/dongmin/Developments/claude/harness/skills/harness/references/skill-writing-guide.md:57-88` (참조 harness)

LLM은 이유를 이해하면 엣지 케이스에서도 올바르게 판단한다. 강압적 규칙보다 맥락 전달이 효과적.

**나쁜 예 (강압적):**
```markdown
ALWAYS use prisma migrate dev. NEVER use prisma db push.
```

**좋은 예 (Why-First):**
```markdown
스키마 변경 후에는 `bun prisma migrate dev --name {feature}`를 사용한다.
`prisma db push`는 마이그레이션 파일을 만들지 않아 prod 환경에서
변경 이력 추적이 불가능하기 때문이다. dev에서 빠르게 실험할 때는
`db push`를 써도 되지만, 결과를 commit하기 전 반드시 `migrate dev`로
변환한다.
```

### 일반화 원칙

특정 예시에만 맞는 좁은 규칙 대신 **원리 수준**으로 일반화.

**오버피팅:**
```markdown
"order_amount" 컬럼이 추가되면 dto에 amount: number를 추가하라.
```

**일반화:**
```markdown
prisma 모델에 새 컬럼이 추가되면 같은 이름·타입을 dto/{create,update}-{module}.dto.ts에 매핑한다. 컬럼 타입 → ts 타입 매핑 표는 prisma docs를 따른다.
```

### 명령형 어조

"~합니다"/"~할 수 있습니다" 대신 "~한다"/"~하라". 스킬은 지시서이므로 명확한 명령형이 효과적.

### 컨텍스트 절약

모든 문장이 토큰 비용을 정당화하는지 자문:
- "Claude가 이미 알고 있는 내용인가?" → 삭제
- "이 설명이 없으면 Claude가 실수하는가?" → 유지
- "구체적 예시 1개가 긴 설명보다 효과적인가?" → 예시로 대체

상세 작성 패턴은 자매 문서 `skill-writing-guide.md`를 참고.

---

## 부록 — 후보 도출 시드 카탈로그 (영감용, 매트릭스 아님)

> ⚠️ **경고**: 아래는 "이런 패턴이 자주 보인다"는 예시일 뿐, 후보 리스트가 아니다. Step A-B에서 직접 발견한 패턴이 우선이며, 시드 없이 후보를 만들어도 OK. 시드 이름을 그대로 후보에 올리는 건 §6 네이밍 금지 위반이다.

### 백엔드 시드

| 관찰된 패턴 | 후보 작업 | 도메인 유도 이름 예시 |
|------------|----------|---------------------|
| 같은 모듈 구조 3+ 반복 | 새 모듈 스캐폴딩 | `{도메인}-module-scaffold` |
| 마이그레이션 디렉토리 + ORM | 스키마 변경 → 동기화 | `{ORM}-{도메인}-migration` |
| 라우터 5+ 파일 | API 계약 변경 검증 | `{서비스}-api-contract` |
| 모노레포 워크스페이스 | 크로스 패키지 영향도 | `{워크스페이스}-impact` |
| 일관된 테스트 파일 패턴 | 테스트 골격 생성 | `{프레임워크}-{레이어}-test-gen` |
| 환경별 .env 3+ | 환경 설정 diff | `env-{stage1}-{stage2}-diff` |
| `.github/workflows/` 존재 | CI 영향도 사전 검사 | `gha-{워크플로우명}-impact` |
| Hexagonal/Clean + 도메인 5+ | 도메인 불변 검증 | `{aggregate}-invariant-check` |

### 프론트엔드 시드

| 관찰된 패턴 | 후보 작업 | 도메인 유도 이름 예시 |
|------------|----------|---------------------|
| 컴포넌트 디렉토리 패턴 반복 | 새 컴포넌트 스캐폴딩 | `{컴포넌트유형}-scaffold` |
| Storybook 존재 | 스토리 동기화 | `{컴포넌트}-story-sync` |
| Playwright 존재 | 시각 회귀 테스트 | `{페이지}-visual-regression` |
| 폼 컴포넌트 다수 | 폼 a11y 감사 | `{폼이름}-a11y-audit` |
| 디자인 토큰 시스템 | 토큰 동기화 검증 | `{토큰패키지}-token-sync` |
| i18n 라이브러리 + locale 다수 | 번역 누락 검증 | `{locale}-translation-check` |

> 다시 강조: 위 표의 "이름 예시" 컬럼의 `{...}` 자리는 반드시 **이 프로젝트의 실제 용어**로 채운다. `{도메인}`을 그대로 두거나 `domain`으로 채우면 §6 위반이다.
