# Skill Testing & Iterative Improvement Guide

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

A methodology for validating the quality of harness-generated skills and improving them iteratively. Supplemental reference for Phase 6 of SKILL.md.

---

## Table of contents

1. [Test framework overview](#1-test-framework-overview)
2. [Authoring test prompts](#2-authoring-test-prompts)
3. [Execution testing: With-skill vs Baseline](#3-execution-testing-with-skill-vs-baseline)
4. [Quantitative evaluation: assertion-based scoring](#4-quantitative-evaluation-assertion-based-scoring)
5. [Using specialized agents](#5-using-specialized-agents)
6. [Iterative improvement loop](#6-iterative-improvement-loop)
7. [Description trigger validation](#7-description-trigger-validation)
8. [Workspace structure](#8-workspace-structure)

---

## 1. Test framework overview

Skill quality verification combines **qualitative evaluation** and **quantitative evaluation**.

| Type | Method | Suitable for |
|------|--------|--------------|
| **Qualitative** | User reviews the artifact directly | Prose, design, creative works — subjective quality |
| **Quantitative** | Automated scoring via assertions | File generation, data extraction, code generation — objectively verifiable |

Core loop: **author → run test → evaluate → improve → re-test**

---

## 2. Authoring test prompts

### Principle

A test prompt must be **a concrete, natural sentence a real user would type**. Abstract or artificial prompts have little testing value.

### Bad examples

<!-- user-facing (Korean, do not translate) -->
```
"PDF를 처리하라"
"데이터를 추출하라"
"차트를 생성하라"
```
<!-- /user-facing -->

### Good examples

<!-- user-facing (Korean, do not translate) -->
```
"다운로드 폴더에 있는 'Q4_매출_최종_v2.xlsx'에서 C열(매출)과 D열(비용)을
사용해서 이익률(%) 열을 추가해줘. 그리고 이익률 기준으로 내림차순 정렬."
```
<!-- /user-facing -->

<!-- user-facing (Korean, do not translate) -->
```
"이 PDF에서 3페이지 표를 추출해서 CSV로 변환해줘. 표 헤더가 2줄로
되어 있어서 첫 번째 줄은 카테고리, 두 번째 줄이 실제 열 이름이야."
```
<!-- /user-facing -->

### Prompt diversity

- Mix **formal** and **casual** tones
- Mix **explicit** and **implicit** intents (file type stated outright vs inferred from context)
- Mix **simple** and **complex** tasks
- Include some with abbreviations, typos, and casual phrasing

### Coverage

Start with 2–3 prompts that cover:
- 1 core use case
- 1 edge case
- (Optional) 1 composite task

---

## 3. Execution testing: With-skill vs Baseline

### 3-1. Comparison run structure

For each test prompt, spawn two sub-agents **concurrently**:

**With-skill run:**
<!-- user-facing (Korean, do not translate) -->
```
프롬프트: "{테스트 프롬프트}"
스킬 경로: {스킬 경로}
출력 경로: _workspace/iteration-N/eval-{id}/with_skill/outputs/
```
<!-- /user-facing -->

**Baseline run:**
<!-- user-facing (Korean, do not translate) -->
```
프롬프트: "{테스트 프롬프트}"  (동일)
스킬: 없음
출력 경로: _workspace/iteration-N/eval-{id}/without_skill/outputs/
```
<!-- /user-facing -->

### 3-2. Baseline selection

| Situation | Baseline |
|-----------|----------|
| New skill | Same prompt run without the skill |
| Improving an existing skill | Pre-edit skill version (snapshot it) |

### 3-3. Capturing timing data

Save `total_tokens` and `duration_ms` **immediately** from the sub-agent completion notification. This data is only accessible at the notification moment and cannot be recovered later.

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

---

## 4. Quantitative evaluation: assertion-based scoring

### 4-1. Authoring assertions

When an artifact can be objectively verified, define assertions to enable automated scoring.

**Good assertions:**
- Objectively true/false
- Named descriptively — reading the result alone reveals what is being checked
- Verify the skill's core value

**Bad assertions:**
- Pass regardless of whether the skill is used (e.g. "the output exists")
- Require subjective judgment (e.g. "it is well written")

### 4-2. Programmatic verification

If an assertion is verifiable in code, write a script. Scripts are faster and more reliable than eyeballing and are reusable across iterations.

### 4-3. Watch for non-discriminating assertions

Assertions that pass "100% in both configurations" cannot measure the skill's differential value. Remove such assertions or replace them with more demanding ones.

### 4-4. Scoring result schema

<!-- user-facing (Korean, do not translate) -->
```json
{
  "expectations": [
    {
      "text": "이익률 열이 추가됨",
      "passed": true,
      "evidence": "E열에 'profit_margin_pct' 열 확인"
    },
    {
      "text": "이익률 기준 내림차순 정렬",
      "passed": false,
      "evidence": "정렬 없이 원본 순서 유지됨"
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 1,
    "total": 2,
    "pass_rate": 0.50
  }
}
```
<!-- /user-facing -->

---

## 5. Using specialized agents

Using role-specific agents during testing/evaluation raises quality.

### 5-1. Grader

Performs assertion-based scoring and extracts verifiable claims from the artifact for cross-verification.

**Role:**
- Per-assertion pass/fail ruling with evidence
- Extract and verify factual claims from the artifact
- Feedback on the eval's own quality (suggest when assertions are too easy or vague)

### 5-2. Comparator (blind comparison)

Anonymize two artifacts as A/B and judge their quality without knowing which one used the skill.

**When to use:** When you want to rigorously confirm "is the new version actually better?". Can be skipped during normal iterative improvement.

**Judgment criteria:**
- Content: accuracy, completeness
- Structure: organization, formatting, usability
- Overall score

### 5-3. Analyzer

Analyze statistical patterns in benchmark data:
- Non-discriminating assertions (both configurations pass → no discrimination)
- High-variance evals (results vary a lot between runs → unstable)
- Time/token tradeoffs (the skill improves quality but also increases cost)

---

## 6. Iterative improvement loop

### 6-1. Gather feedback

Show the artifact to the user and collect feedback. Interpret empty feedback as "no issues".

### 6-2. Improvement principles

1. **Generalize feedback** — a narrow fix that only matches the test example is overfitting. Fix at the principle level.
2. **Remove anything that doesn't earn its weight** — read the transcripts; if the skill is making the agent do unproductive work, delete that section.
3. **Explain the why** — even if user feedback is terse, understand why it matters and encode that understanding in the skill.
4. **Bundle repetitive work** — if every test run generates the same helper script, ship it in `scripts/` up front.

### 6-3. Iteration procedure

<!-- user-facing (Korean, do not translate) -->
```
1. 스킬 수정
2. 새 iteration-N+1/ 디렉토리에 모든 테스트 케이스 재실행
3. 사용자에게 결과 제시 (이전 iteration과 비교)
4. 피드백 수집
5. 다시 수정 → 반복
```
<!-- /user-facing -->

**Exit conditions:**
- User is satisfied
- All feedback is empty (every artifact fine)
- No meaningful improvement remaining

### 6-4. Draft → review pattern

When editing a skill, write a draft, then **re-read it with fresh eyes** and improve. Don't try to write it perfectly in one shot — go through a draft-and-review cycle.

---

## 7. Description trigger validation

### 7-1. Writing trigger eval queries

Write 20 eval queries — 10 should-trigger + 10 should-NOT-trigger.

**Query quality criteria:**
- Concrete, natural sentences a real user would type
- Include concrete details: file paths, personal context, column names, company names
- Mix length, tone, and format
- Focus on **edge cases** rather than clear-cut winners

**Should-trigger queries (8–10):**
- The same intent phrased in varied registers (formal / casual)
- Cases where the skill/file type is not stated outright but is clearly needed
- Non-mainstream use cases
- Cases that compete with another skill but this one should win

**Should-NOT-trigger queries (8–10):**
- **Near-misses are the point** — keyword-adjacent but a different tool/skill is the right fit
- Obviously unrelated queries ("write a Fibonacci function") have no test value
- Adjacent domains, ambiguous phrasing, keyword overlap but different context

### 7-2. Validate against existing skills

Check that the new skill's description does not collide with existing skills' trigger space:

1. Collect descriptions of the existing skill set
2. Verify the new skill's should-trigger queries don't accidentally trigger an existing skill
3. When a collision is found, tighten the new skill's description to spell out boundary conditions

### 7-3. Automatic optimization (optional, advanced)

If description optimization is needed:

1. Split the 20 eval queries into Train (60%) / Test (40%)
2. Measure trigger accuracy with the current description
3. Analyze failures and produce an improved description
4. Pick the best description by Test-set performance (not Train — avoids overfitting)
5. Up to 5 iterations

> Run this with an automation script that uses `claude -p`. Token cost is high, so only run it in the final stage once the skill is sufficiently stable.

---

## 8. Workspace structure

A directory layout for organizing test/evaluation results:

```
{skill-name}-workspace/
├── iteration-1/
│   ├── eval-descriptive-name-1/
│   │   ├── eval_metadata.json
│   │   ├── with_skill/
│   │   │   ├── outputs/
│   │   │   ├── timing.json
│   │   │   └── grading.json
│   │   └── without_skill/
│   │       ├── outputs/
│   │       ├── timing.json
│   │       └── grading.json
│   ├── eval-descriptive-name-2/
│   │   └── ...
│   └── benchmark.json
├── iteration-2/
│   └── ...
└── evals/
    └── evals.json
```

**Rules:**
- Eval directories use **descriptive names**, not numbers (e.g. `eval-multi-page-table-extraction`)
- Each iteration lives in its own directory (never overwrite prior iterations)
- Do not delete `_workspace/` — keep it for post-hoc verification and audit trail
