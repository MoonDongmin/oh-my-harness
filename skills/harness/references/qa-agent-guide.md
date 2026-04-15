# QA Agent Design Guide

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

A guide to consult when including a QA agent in a build harness. Drawing on bug patterns found in a real project (SatangSlide) and their root-cause analysis, it offers a systematic verification methodology for defects that QA tends to miss.

---

## Table of contents

1. Defect patterns QA agents miss
2. Integration Coherence Verification
3. QA agent design principles
4. Verification checklist template
5. QA agent definition template

---

## 1. Defect patterns QA agents miss

### 1-1. Boundary Mismatch

The most frequent class of defect. Two components are each "correctly" implemented, but the contract between them disagrees at the seam.

| Boundary | Example mismatch | Why it's missed |
|----------|------------------|-----------------|
| API response → frontend hook | API returns `{ projects: [...] }`, hook expects `SlideProject[]` | Each side verifies individually; they are never cross-compared |
| API response field → type definition | API returns `thumbnailUrl` (camelCase), type has `thumbnail_url` (snake_case) | TypeScript generic casts hide the mismatch from the compiler |
| File path → link href | Page is at `/dashboard/create` but the link points to `/create` | File tree and href are never cross-checked |
| State-transition map → actual status updates | Map defines `generating_template → template_approved`, but the code never makes that transition | Only the map's existence is checked; no trace of every update site |
| API endpoint → frontend hook | API exists but no corresponding hook (never called) | API list and hook list are never mapped 1:1 |
| Immediate response → asynchronous result | API immediately returns `{ status }`; frontend accesses `data.failedIndices` | No distinction between sync and async response shapes |

### 1-2. Why static code review misses these

- **TypeScript generics are limited**: `fetchJson<SlideProject[]>()` — if the runtime response is `{ projects: [...] }`, compilation still passes
- **`npm run build` passing ≠ working**: Type casts, `any`, or generics make the build succeed but fail at runtime
- **Existence check vs connection check**: "Does the API exist?" and "Does the API's response match what the caller expects?" are entirely different kinds of verification

---

## 2. Integration Coherence Verification

Cross-comparison checks that MUST be included in a QA agent.

### 2-1. API response ↔ frontend hook type cross-check

**Method**: Compare the `NextResponse.json()` call sites in each API route with the type parameter of `fetchJson<T>` in the corresponding hook.

<!-- user-facing (Korean, do not translate) -->
```
검증 단계:
1. API route에서 NextResponse.json()에 전달하는 객체의 shape 추출
2. 대응 훅에서 fetchJson<T>의 T 타입 확인
3. shape과 T가 일치하는지 비교
4. 래핑 여부 확인 (API가 { data: [...] }를 반환하면 훅이 .data를 꺼내는지)
```
<!-- /user-facing -->

**Watch for these patterns:**
- Paginated APIs: `{ items: [], total, page }` vs frontend expecting an array
- snake_case DB fields → camelCase API response → mismatch with frontend type definitions
- Immediate response (202 Accepted) vs final result shape differences

### 2-2. File path ↔ link/router path mapping

**Method**: Extract URL paths from `page` files under `src/app/` and compare with every `href`, `router.push()`, and `redirect()` value in the code.

<!-- user-facing (Korean, do not translate) -->
```
검증 단계:
1. src/app/ 하위 page.tsx 파일 경로에서 URL 패턴 추출
   - (group) → URL에서 제거
   - [param] → 동적 세그먼트
2. 코드 내 모든 href=, router.push(, redirect( 값 수집
3. 각 링크가 실제 존재하는 page 경로와 매칭되는지 확인
4. route group 내부 페이지의 URL 접두사 주의 (예: dashboard/ 하위)
```
<!-- /user-facing -->

### 2-3. State-transition completeness tracking

**Method**: Extract every `status:` update in the code and diff against the state-transition map.

<!-- user-facing (Korean, do not translate) -->
```
검증 단계:
1. 상태 전이 맵(STATE_TRANSITIONS)에서 허용된 전이 목록 추출
2. 모든 API route에서 .update({ status: "..." }) 패턴 검색
3. 각 전이가 맵에 정의되어 있는지 확인
4. 맵에 정의된 전이 중 코드에서 실행되지 않는 것 식별 (죽은 전이)
5. 특히: 중간 상태(예: generating_template)에서 최종 상태(template_approved)로의 전환이 누락되지 않았는지
```
<!-- /user-facing -->

### 2-4. API endpoint ↔ frontend hook 1:1 mapping

**Method**: Enumerate every API route and every frontend hook and check they are paired.

<!-- user-facing (Korean, do not translate) -->
```
검증 단계:
1. src/app/api/ 하위 route.ts에서 HTTP 메서드별 엔드포인트 목록 추출
2. src/hooks/ 하위 use*.ts에서 fetch 호출 URL 목록 추출
3. API 엔드포인트 중 훅에서 호출하지 않는 것 식별 → "사용 안 됨" 플래그
4. "사용 안 됨"이 의도적인지 (관리 API 등) 아닌지 (호출 누락) 판단
```
<!-- /user-facing -->

---

## 3. QA agent design principles

### 3-1. Use `general-purpose`, not `Explore`

If the QA agent uses `Explore`, it is read-only. Effective QA needs to:
- Grep for patterns (extract every `NextResponse.json()` call)
- Run scripts to cross-compare automatically (API shape vs hook type)
- Optionally fix what it finds

**Recommendation**: Use `general-purpose`, but spell out a "verify → report → request fixes" protocol in the agent definition.

### 3-2. Prefer cross-comparison over existence checks

| Weak checklist | Strong checklist |
|----------------|------------------|
| Does the API endpoint exist? | Does the API response shape match the corresponding hook's type? |
| Is the state-transition map defined? | Do all status-update sites match the transitions in the map? |
| Does the page file exist? | Does every link in the code point at an actual page? |
| Is TypeScript strict mode on? | Is there any type safety bypassed by generic casting? |

### 3-3. "Read both sides at once"

To catch boundary bugs, QA cannot read one side only. It must:
- Read the API route **and** its corresponding hook **together**
- Read the state-transition map **and** the actual update code **together**
- Read the file tree **and** the link paths **together**

State this principle explicitly in the agent definition.

### 3-4. Run QA right after each module is finished, not after the full build

If the orchestrator runs QA only at "Phase 4: after everything is built":
- Bugs accumulate, making fixes expensive
- Early boundary mismatches propagate into downstream modules

**Recommended pattern**: When each backend API is finished, immediately run the cross-check between that API and its hook (incremental QA).

---

## 4. Verification checklist template

An integration-coherence checklist for web applications, to embed in the QA agent definition.

<!-- user-facing (Korean, do not translate) -->
```markdown
### 통합 정합성 검증 (웹 앱)

#### API ↔ 프론트엔드 연결
- [ ] 모든 API route의 응답 shape과 대응 훅의 제네릭 타입이 일치
- [ ] 래핑된 응답({ items: [...] })은 훅에서 unwrap하는지 확인
- [ ] snake_case ↔ camelCase 변환이 일관되게 적용
- [ ] 즉시 응답(202)과 최종 결과의 shape이 프론트에서 구분되는지 확인
- [ ] 모든 API 엔드포인트에 대응하는 프론트 훅이 존재하고 실제로 호출됨

#### 라우팅 정합성
- [ ] 코드 내 모든 href/router.push 값이 실제 page 파일 경로와 매칭
- [ ] route group ((group))이 URL에서 제거되는 것을 고려한 경로 검증
- [ ] 동적 세그먼트([id])가 올바른 파라미터로 채워지는지 확인

#### 상태 머신 정합성
- [ ] 정의된 모든 상태 전이가 코드에서 실행됨 (죽은 전이 없음)
- [ ] 코드의 모든 status 업데이트가 전이 맵에 정의됨 (무단 전이 없음)
- [ ] 중간 상태에서 최종 상태로의 전환이 누락되지 않음
- [ ] 프론트에서 상태 기반 분기(if status === "X")의 X가 실제 도달 가능

#### 데이터 흐름 정합성
- [ ] DB 스키마 필드명과 API 응답 필드명의 매핑이 일관됨
- [ ] 프론트 타입 정의와 API 응답의 필드명이 일치
- [ ] 옵셔널 필드에 대한 null/undefined 처리가 양쪽에서 일관됨
```
<!-- /user-facing -->

---

## 5. QA agent definition template

Core sections to include in the harness's QA agent.

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: qa-inspector
description: "QA 검증 전문가. 스펙 준수, 통합 정합성, 디자인 품질을 검증."
---

# QA Inspector

## 핵심 역할
스펙 대비 구현 품질과 **모듈 간 통합 정합성**을 검증한다.

## 검증 우선순위

1. **통합 정합성** (가장 높음) — 경계면 불일치가 런타임 에러의 주요 원인
2. **기능 스펙 준수** — API/상태머신/데이터모델
3. **디자인 품질** — 색상/타이포/반응형
4. **코드 품질** — 미사용 코드, 명명 규칙

## 검증 방법: "양쪽 동시 읽기"

경계면 검증은 반드시 **양쪽 코드를 동시에 열어** 비교한다:

| 검증 대상 | 왼쪽 (생산자) | 오른쪽 (소비자) |
|----------|-------------|---------------|
| API 응답 shape | route.ts의 NextResponse.json() | hooks/의 fetchJson<T> |
| 라우팅 | src/app/ page 파일 경로 | href, router.push 값 |
| 상태 전이 | STATE_TRANSITIONS 맵 | .update({ status }) 코드 |
| DB → API → UI | 테이블 컬럼명 | API 응답 필드 → 타입 정의 |

## 팀 통신 프로토콜

- 발견 즉시 해당 에이전트에게 구체적 수정 요청 (파일:라인 + 수정 방법)
- 경계면 이슈는 양쪽 에이전트 **모두**에게 알림
- 리더에게: 검증 리포트 (통과/실패/미검증 항목 구분)
```
<!-- /user-facing -->

---

## Real case study: bugs found in SatangSlide

Every section of this guide is distilled from lessons learned in the bugs below:

| Bug | Boundary | Root cause |
|-----|----------|------------|
| `projects?.filter is not a function` | API → hook | API returns `{projects:[]}`, hook expects an array |
| All dashboard links 404 | File path → href | Missing `/dashboard/` prefix |
| Theme images invisible | API → component | `thumbnailUrl` vs `thumbnail_url` |
| Theme selection not saved | API → hook | `select-theme` API exists, hook missing |
| Generation page hangs forever | State transition → code | `template_approved` transition never executed |
| `data.failedIndices` crash | Immediate response → frontend | Background result accessed on the immediate response |
| "View slides" after completion 404 | File path → href | `/projects/` → `/dashboard/projects/` |
