# Project Analysis Protocol

프로젝트 코드베이스를 **아키텍처 비의존적으로** 탐색하여, 추가 에이전트와 스킬의 필요성을 판단하는 프로토콜.

> **원칙**: DDD, Hexagonal, MVC 등 특정 아키텍처를 가정하지 않는다. 코드가 보여주는 사실만으로 판단한다.

---

## 목차

1. [탐색 순서](#1-탐색-순서)
2. [영역별 탐색 방법](#2-영역별-탐색-방법)
3. [패턴 감지 기법](#3-패턴-감지-기법)
4. [에이전트 필요성 판단 트리](#4-에이전트-필요성-판단-트리)
5. [에이전트 프롬프트에 프로젝트 지식 주입](#5-에이전트-프롬프트에-프로젝트-지식-주입)
6. [Good vs Bad 에이전트 예시](#6-good-vs-bad-에이전트-예시)

---

## 1. 탐색 순서

아래 순서대로 탐색한다. 앞 단계의 결과가 뒷 단계의 탐색 범위를 좁혀준다.

```
Step 1: 프로젝트 구조 (뼈대 파악)
Step 2: 핵심 의존성 (기술 스택 파악)
Step 3: 소스 코드 샘플링 (코딩 패턴 파악)
Step 4: 테스트 현황 (품질 수준 파악)
Step 5: 인프라/배포 (운영 환경 파악)
Step 6: 종합 판단 (에이전트/스킬 필요성 결정)
```

---

## 2. 영역별 탐색 방법

### Step 1: 프로젝트 구조

**도구**: `Bash(ls -R)` depth 3 + `Glob(**/*.{ts,js,py,go,rs,java,kt,swift,rb})`

**파악하는 것:**
- 소스 코드의 주요 언어
- 최상위 디렉토리 구조 (src/, lib/, app/, packages/, apps/)
- 모듈 경계 (같은 depth에서 반복되는 디렉토리 패턴)
- 레이어 구분 (있다면 — controller/, service/, repository/ 등)

**판단 포인트:**
- `packages/` 또는 `apps/` + workspace 설정 → 모노레포
- 같은 구조가 3개 이상 반복 → "반복 모듈 패턴" (상세: 3. 패턴 감지 기법)
- 소스 파일 100개+ → 대규모 프로젝트

### Step 2: 핵심 의존성

**도구**: `Read(package.json)` / `Read(go.mod)` / `Read(requirements.txt)` / `Read(Cargo.toml)` / `Read(build.gradle)`

**파악하는 것:**
- 프레임워크 (NestJS, Express, FastAPI, Spring, Rails, Next.js, etc.)
- 데이터베이스 (TypeORM, Prisma, Drizzle, SQLAlchemy, GORM, etc.)
- 메시지 큐 (Bull, RabbitMQ, Kafka, etc.)
- 외부 API SDK (AWS SDK, Stripe, etc.)
- 테스트 프레임워크 (Jest, Vitest, pytest, etc.)

**판단 포인트:**
- DB 관련 의존성 + `migrations/` 디렉토리 → migration 스킬 후보
- 다수의 외부 서비스 SDK → infra-specialist 에이전트 후보
- 모노레포 도구 (lerna, nx, turbo, pnpm workspace) → cross-package-coordinator 후보

### Step 3: 소스 코드 샘플링

**도구**: `Read` — 가장 큰 모듈(파일 수 기준)의 대표 파일 3-5개

**선택 기준:**
1. 모듈의 "진입점" 파일 (index, module, main)
2. 가장 큰 파일 (보통 핵심 비즈니스 로직)
3. 가장 많이 import되는 파일 (`Grep`으로 import 횟수 확인)

**파악하는 것:**
- 코딩 패턴 (클래스 vs 함수, OOP vs FP)
- 네이밍 규칙 (camelCase, snake_case, PascalCase)
- 모듈 간 관계 (import 패턴)
- 비즈니스 로직 복잡도 (조건 분기, 상태 머신, 유효성 검증)
- 반복되는 보일러플레이트 코드

**판단 포인트:**
- 복잡한 비즈니스 로직 파일이 3개+ → domain-specialist 에이전트 후보
- 동일한 보일러플레이트가 여러 모듈에서 반복 → scaffold 스킬 후보
- 특정 도메인 용어가 반복 → 에이전트 프롬프트에 도메인 용어 포함

### Step 4: 테스트 현황

**도구**: `Glob(**/*.{spec,test}.*)`으로 테스트 파일 목록 + `Read`로 테스트 설정

**파악하는 것:**
- 테스트 파일 수 vs 소스 파일 수 (비율)
- 테스트 프레임워크와 러너
- 테스트 패턴 (단위/통합/E2E 비율)
- 테스트 디렉토리 구조 (__tests__/, *.spec.ts, test/)

**판단 포인트:**
- test:source 비율 < 0.3 → qa-agent 추가 권장
- 일관된 테스트 패턴 존재 → test-scaffold 스킬 후보
- E2E 테스트 존재 → 검증 강화 에이전트 고려

### Step 5: 인프라/배포

**도구**: `Glob({Dockerfile*,docker-compose*,.github/**,Makefile,*.yml,.gitlab-ci*,Jenkinsfile})`

**파악하는 것:**
- CI/CD 파이프라인 유무와 종류
- 컨테이너 설정
- 배포 대상 (cloud, on-premise)
- 환경 설정 파일 수와 다양성

**판단 포인트:**
- CI/CD 파이프라인 존재 → pipeline-guardian 에이전트 후보 + pipeline-check 스킬 후보
- Docker + docker-compose → infra-ops 에이전트 후보
- 환경 설정 파일 3개+ (.env.development, .env.staging, .env.production) → config-sync 스킬 후보

---

## 3. 패턴 감지 기법

### "반복 모듈" 감지

프로젝트에서 **같은 구조가 반복되는 디렉토리**를 찾는다. 이것이 scaffold 에이전트/스킬의 핵심 근거.

**방법:**
1. depth 2-3의 디렉토리를 나열
2. 각 디렉토리 내 파일 목록을 비교
3. 같은 파일명 패턴(확장자 제외)이 3개 이상 디렉토리에서 반복되면 → "반복 모듈"

**예시:**
```
src/
├── user/
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.repository.ts
│   └── user.module.ts
├── order/
│   ├── order.controller.ts
│   ├── order.service.ts
│   ├── order.repository.ts
│   └── order.module.ts
└── payment/
    ├── payment.controller.ts
    ├── payment.service.ts
    ├── payment.repository.ts
    └── payment.module.ts
```

→ `{name}.controller.ts`, `{name}.service.ts`, `{name}.repository.ts`, `{name}.module.ts` 패턴이 3회 반복 → scaffold 스킬 생성 대상.

### "도메인 용어" 감지

코드에서 반복적으로 등장하는 **비즈니스 도메인 용어**를 추출한다. 이것이 domain-specialist 에이전트의 프롬프트에 주입할 핵심 지식.

**방법:**
1. 클래스/함수/타입 이름에서 공통 접두어/접미어 추출
2. 파일명에서 도메인 용어 추출 (user, order, payment, invoice, product 등)
3. 주석이나 README에서 도메인 관련 설명 추출

### "복잡도 핫스팟" 감지

가장 큰 파일, 가장 많이 의존되는 파일, 가장 많은 조건 분기를 가진 파일을 찾는다.

**방법:**
1. 파일 크기 상위 10개 나열
2. `Grep(import.*from)` 결과에서 가장 많이 참조되는 파일
3. 해당 파일을 Read하여 복잡도 판단

---

## 4. 에이전트 필요성 판단 트리

탐색 결과를 종합하여 추가 에이전트 필요성을 판단한다:

```
프로젝트 규모를 파악했는가?
├── 모듈 5개 이상 → planner 에이전트 추가
├── 모노레포 (패키지 2개+) → cross-package-coordinator 추가
└── 작은 프로젝트 → 추가 에이전트 없이 코어 6으로 충분할 수 있음

코드 패턴을 파악했는가?
├── 반복 모듈 패턴 발견 → scaffold 에이전트 또는 스킬 후보
├── 복잡한 비즈니스 로직 발견 → domain-specialist 추가
│   (에이전트 프롬프트에 실제 도메인 용어, 파일 경로, 비즈니스 규칙 포함)
└── 특별한 패턴 없음 → 추가 불필요

인프라 복잡도를 파악했는가?
├── DB + MQ + 외부 API → infra-specialist 추가
├── CI/CD 파이프라인 → pipeline-guardian 추가
└── 단순 인프라 → 추가 불필요

테스트 현황을 파악했는가?
├── test:source < 0.3 → qa-agent 추가
├── 일관된 테스트 패턴 → test-scaffold 스킬 후보
└── 테스트 충분 → 추가 불필요

프론트엔드 컴포넌트가 있는가?
├── UI 컴포넌트 다수 → ui-reviewer 추가
└── 백엔드 only → 추가 불필요

위에 해당하지 않는 프로젝트 고유의 복잡성이 있는가?
├── 있음 → 사용자에게 설명하고 확인 후 커스텀 에이전트 생성
└── 없음 → 추가 에이전트 없음
```

**최대 추가 에이전트 수 가이드:**
- 소규모 프로젝트 (모듈 5개 미만): 0-1개 추가
- 중규모 프로젝트 (모듈 5-15개): 1-3개 추가
- 대규모 프로젝트 (모듈 15개+): 2-4개 추가

에이전트가 너무 많으면 조율 오버헤드가 커진다. 3명의 집중된 에이전트가 6명의 범용 에이전트보다 낫다.

---

## 5. 에이전트 프롬프트에 프로젝트 지식 주입

커스텀 에이전트의 프롬프트에는 **이 프로젝트에서만 유효한 구체적 정보**를 주입한다.

### 주입할 정보 유형

| 유형 | 예시 |
|------|------|
| 디렉토리 구조 | "src/modules/ 하위에 각 모듈이 위치" |
| 파일 패턴 | "각 모듈은 {name}.controller.ts, {name}.service.ts 구조" |
| 모듈 목록 | "현재 user, order, payment, notification 4개 모듈 존재" |
| 도메인 용어 | "Order 상태: PENDING → CONFIRMED → SHIPPED → DELIVERED" |
| 핵심 파일 | "결제 로직의 핵심: src/payment/payment.service.ts" |
| 네이밍 규칙 | "파일명: kebab-case, 클래스명: PascalCase, 변수: camelCase" |
| 테스트 패턴 | "테스트 파일: 같은 디렉토리에 {name}.spec.ts" |

### 주입 템플릿

```markdown
## 프로젝트 컨텍스트

이 프로젝트의 구조:
- 소스 루트: `{source_root}`
- 모듈 위치: `{module_path}/{name}/`
- 모듈 파일 구성: {file_pattern_list}
- 현재 모듈: {module_names}
- 핵심 도메인 용어: {domain_terms}
- 테스트 패턴: `{test_pattern}`

이 프로젝트에서 작업할 때 위 구조와 패턴을 따른다.
```

---

## 6. Good vs Bad 에이전트 예시

### Good: 프로젝트 맞춤 에이전트

```markdown
---
description: "이 프로젝트의 src/modules/ 하위 모듈 구조를 이해하고, 
  새 모듈 추가 시 기존 user/order/payment 모듈의 패턴
  (controller/service/repository/dto)을 재현하는 전문가."
---

# Module Scaffold Agent

## 프로젝트 컨텍스트
- 소스 루트: `src/modules/`
- 기존 모듈: user, order, payment, notification
- 각 모듈 구성:
  - `{name}.controller.ts` — HTTP 엔드포인트
  - `{name}.service.ts` — 비즈니스 로직
  - `{name}.repository.ts` — 데이터 접근
  - `{name}.module.ts` — 모듈 등록
  - `dto/` — 요청/응답 DTO
  - `{name}.spec.ts` — 단위 테스트

## 핵심 역할
새 모듈 생성 시 위 구조를 정확히 재현한다.
기존 모듈의 import 패턴과 네이밍 규칙을 따른다.
```

### Bad: 제네릭 에이전트

```markdown
---
description: "NestJS DDD 프로젝트의 도메인 전문가. Bounded Context와 
  Aggregate를 이해하고 도메인 모델을 검증한다."
---

# Domain Expert Agent

NestJS DDD 프로젝트의 도메인 모델을 검증하는 전문가입니다.
Bounded Context 경계를 지키고 Aggregate 불변식을 확인합니다.
```

**차이점:**
- Good: 프로젝트의 **실제** 경로, 모듈명, 파일 구성을 알고 있음
- Bad: 아키텍처 레이블만 언급, 어떤 프로젝트에나 붙일 수 있는 범용 설명
