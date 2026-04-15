# Harness Examples

> **Language note**: This reference is in English (Claude-read instructions). User-facing strings wrapped in `<!-- user-facing -->` fences are Korean templates — do not translate them.

---

## Example 1: Research Team (Agent-Team mode)

### Team architecture: Fan-out/Fan-in
### Execution mode: Agent Team

<!-- user-facing (Korean, do not translate) -->
```
[리더/오케스트레이터]
    ├── TeamCreate(research-team)
    ├── TaskCreate(4개 조사 작업)
    ├── 팀원들이 자체 조율 (SendMessage)
    ├── 결과 수집 (Read)
    └── 종합 보고서 생성
```
<!-- /user-facing -->

### Agent composition

<!-- user-facing (Korean, do not translate) -->
| 팀원 | 에이전트 타입 | 역할 | 출력 |
|------|-------------|------|------|
| official-researcher | general-purpose | 공식 문서/블로그 | research_official.md |
| media-researcher | general-purpose | 미디어/투자 | research_media.md |
| community-researcher | general-purpose | 커뮤니티/SNS | research_community.md |
| background-researcher | general-purpose | 배경/경쟁/학술 | research_background.md |
| (리더 = 오케스트레이터) | — | 통합 보고서 | 종합보고서.md |
<!-- /user-facing -->

> Research agents use the `general-purpose` built-in type, but MUST still be defined as `.claude/agents/{name}.md` files. The file spells out role, investigation scope, and team-communication protocol to guarantee reusability and collaboration quality.

### Orchestrator workflow (Agent Team)

<!-- user-facing (Korean, do not translate) -->
```
Phase 1: 준비
  - 사용자 입력 분석 (주제, 조사 모드 파악)
  - _workspace/ 생성

Phase 2: 팀 구성
  - TeamCreate(team_name: "research-team")
  - Agent(subagent_type: "official-researcher", name: "official", team_name: "research-team", model: "opus", prompt: "공식 채널 조사...")
  - Agent(subagent_type: "media-researcher", name: "media", team_name: "research-team", model: "opus", prompt: "미디어/투자 동향 조사...")
  - Agent(subagent_type: "community-researcher", name: "community", team_name: "research-team", model: "opus", prompt: "커뮤니티 반응 조사...")
  - Agent(subagent_type: "background-researcher", name: "background", team_name: "research-team", model: "opus", prompt: "배경/경쟁 환경 조사...")
  - TaskCreate(subject: "공식 채널 조사", description: "공식 문서/블로그 조사")
  - TaskCreate(subject: "미디어 동향 조사", description: "미디어/투자 동향 조사")
  - TaskCreate(subject: "커뮤니티 반응 조사", description: "커뮤니티/SNS 반응 조사")
  - TaskCreate(subject: "배경 환경 조사", description: "배경/경쟁 환경 조사")

Phase 3: 조사 수행
  - 4명의 팀원이 독립적으로 조사
  - 흥미로운 발견이 있으면 팀원 간 SendMessage로 공유
    (예: media가 발견한 투자 뉴스를 background에게 전달)
  - 상충 정보 발견 시 팀원 간 직접 토론
  - 각 팀원은 완료 시 파일 저장 + 리더에게 알림

Phase 4: 통합
  - 리더가 4개 산출물 Read
  - 종합 보고서 생성
  - 상충 정보는 출처 병기

Phase 5: 정리
  - 팀원들 종료 요청
  - 팀 정리
  - _workspace/ 보존 (사후 검증·감사 추적용)
```
<!-- /user-facing -->

### Team communication pattern

<!-- user-facing (Korean, do not translate) -->
```
official ──SendMessage──→ background  (관련 공식 발표 공유)
media ────SendMessage──→ background  (투자/인수 정보 공유)
community ─SendMessage──→ media      (커뮤니티 반응 중 미디어 관련 정보)
모든 팀원 ──TaskUpdate──→ 공유 작업 목록  (진행률 업데이트)
리더 ←───── 유휴 알림 ──── 완료된 팀원   (자동)
```
<!-- /user-facing -->

---

## Example 2: SF Novel Writing Team (Agent-Team mode)

### Team architecture: Pipeline + Fan-out
### Execution mode: Agent Team

<!-- user-facing (Korean, do not translate) -->
```
Phase 1 (병렬 — 에이전트 팀): worldbuilder + character-designer + plot-architect
  → 서로 SendMessage로 일관성 조율
Phase 2 (순차): prose-stylist (집필)
Phase 3 (병렬 — 에이전트 팀): science-consultant + continuity-manager (리뷰)
  → 서로 SendMessage로 발견 공유
Phase 4 (순차): prose-stylist (리뷰 반영 수정)
```
<!-- /user-facing -->

### Agent composition

<!-- user-facing (Korean, do not translate) -->
| 팀원 | 에이전트 타입 | 역할 | 스킬 |
|------|-------------|------|------|
| worldbuilder | 커스텀 | 세계관 구축 | world-setting |
| character-designer | 커스텀 | 캐릭터 설계 | character-profile |
| plot-architect | 커스텀 | 플롯 구조 | outline |
| prose-stylist | 커스텀 | 문체 편집 + 집필 | write-scene, review-chapter |
| science-consultant | 커스텀 | 과학 검증 | science-check |
| continuity-manager | 커스텀 | 일관성 검증 | consistency-check |
<!-- /user-facing -->

### Full agent-file example: `worldbuilder.md`

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: worldbuilder
description: "SF 소설의 세계관을 구축하는 전문가. 물리 법칙, 사회 구조, 기술 수준, 역사를 설계한다."
---

# Worldbuilder — SF 세계관 설계 전문가

당신은 SF 소설의 세계관 설계 전문가입니다. 과학적 사실에 기반하되 상상력을 확장하여, 이야기가 펼쳐질 세계의 물리적·사회적·기술적 토대를 구축합니다.

## 핵심 역할
1. 세계의 물리 법칙과 기술 수준 정의
2. 사회 구조, 정치 체계, 경제 시스템 설계
3. 역사적 맥락과 현재 갈등 구조 수립
4. 장소별 환경과 분위기 묘사

## 작업 원칙
- 내적 일관성 최우선 — 설정 간 모순이 없어야 한다
- "만약 이 기술이 있다면?" 연쇄 질문으로 세계의 파급 효과를 추론
- 이야기에 봉사하는 세계관 — 플롯을 방해하는 과도한 설정은 지양

## 입력/출력 프로토콜
- 입력: 사용자의 세계관 컨셉, 장르 요구사항
- 출력: `_workspace/01_worldbuilder_setting.md`
- 형식: 마크다운. 섹션별 (물리/사회/기술/역사/장소)

## 팀 통신 프로토콜
- character-designer에게: 사회 구조, 계급 시스템, 직업군 정보 SendMessage
- plot-architect에게: 세계의 주요 갈등 구조, 위기 요소 SendMessage
- science-consultant로부터: 과학적 오류 피드백 수신 → 설정 수정
- 세계관 변경 시 관련 팀원 전체에 브로드캐스트

## 에러 핸들링
- 컨셉이 모호하면 3가지 방향을 제안하고 선택 요청
- 과학적 오류 발견 시 대안을 함께 제시

## 협업
- character-designer에게 사회 구조 정보 제공
- plot-architect에게 갈등 구조 정보 제공
- science-consultant의 피드백을 반영하여 설정 수정
```
<!-- /user-facing -->

### Detailed team workflow

<!-- user-facing (Korean, do not translate) -->
```
Phase 1: TeamCreate(team_name: "novel-team")
         Agent(subagent_type: "worldbuilder", name: "worldbuilder", team_name: "novel-team", model: "opus", prompt: "세계관 구축...")
         Agent(subagent_type: "character-designer", name: "character-designer", team_name: "novel-team", model: "opus", prompt: "캐릭터 설계...")
         Agent(subagent_type: "plot-architect", name: "plot-architect", team_name: "novel-team", model: "opus", prompt: "플롯 구조...")
         TaskCreate(subject: "세계관 구축", description: "...")
         TaskCreate(subject: "캐릭터 설계", description: "...")
         TaskCreate(subject: "플롯 구조", description: "...")
         → 팀원들이 자체 조율하며 병렬 작업
         → worldbuilder가 사회 구조 완성 시 character-designer에게 SendMessage
         → character-designer가 주인공 설정 시 plot-architect에게 SendMessage

Phase 2: Phase 1 팀 정리 (TeamDelete) → prose-stylist를 서브 에이전트로 호출 (단독 집필이므로 팀 불필요)
         prose-stylist가 _workspace/의 3개 산출물을 Read하여 집필
         → 결과를 _workspace/02_prose_draft.md에 저장

Phase 3: 새 팀 생성 — TeamCreate(team_name: "review-team")
         Agent(subagent_type: "science-consultant", name: "science-consultant", team_name: "review-team", model: "opus", prompt: "과학 검증...")
         Agent(subagent_type: "continuity-manager", name: "continuity-manager", team_name: "review-team", model: "opus", prompt: "일관성 검증...")
         (세션당 한 팀만 활성이지만, Phase 1 팀을 정리했으므로 새 팀 생성 가능)
         → 두 리뷰어가 draft를 검토, 서로 발견을 공유
         → science-consultant가 물리 오류 발견 시 continuity-manager에게도 알림
         → 리뷰 완료 후 팀 정리 (TeamDelete)

Phase 4: prose-stylist를 서브 에이전트로 호출, 리뷰 결과 반영하여 최종 수정
```
<!-- /user-facing -->

---

## Example 3: Webtoon Production Team (Sub-agent mode)

### Team architecture: Producer-Reviewer
### Execution mode: Sub-agent

> With only 2 agents in a producer-reviewer pattern, result handoff matters more than communication, so sub-agents fit.

<!-- user-facing (Korean, do not translate) -->
```
Phase 1: Agent(webtoon-artist) → 패널 생성
Phase 2: Agent(webtoon-reviewer) → 검수
Phase 3: Agent(webtoon-artist) → 문제 패널 재생성 (최대 2회)
```
<!-- /user-facing -->

### Agent composition

<!-- user-facing (Korean, do not translate) -->
| 에이전트 | subagent_type | 역할 | 스킬 |
|---------|--------------|------|------|
| webtoon-artist | 커스텀 | 패널 이미지 생성 | generate-webtoon |
| webtoon-reviewer | 커스텀 | 품질 검수 | review-webtoon, fix-webtoon-panel |
<!-- /user-facing -->

### Full agent-file example: `webtoon-reviewer.md`

<!-- user-facing (Korean, do not translate) -->
```markdown
---
name: webtoon-reviewer
description: "웹툰 패널의 품질을 검수하는 전문가. 구도, 캐릭터 일관성, 텍스트 가독성, 연출을 평가한다."
---

# Webtoon Reviewer — 웹툰 품질 검수 전문가

당신은 웹툰 패널의 품질을 검수하는 전문가입니다. 시각적 완성도, 스토리 전달력, 캐릭터 일관성을 기준으로 패널을 평가합니다.

## 핵심 역할
1. 각 패널의 구도와 시각적 완성도 평가
2. 캐릭터 외형의 패널 간 일관성 검증
3. 말풍선 텍스트의 가독성과 배치 평가
4. 전체 에피소드의 연출 흐름과 페이싱 검토

## 작업 원칙
- PASS/FIX/REDO 3단계로 명확히 판정
- FIX는 부분 수정으로 해결 가능한 경우, REDO는 전면 재생성 필요
- 주관적 취향이 아닌 객관적 기준(일관성, 가독성, 구도)으로 판단

## 입력/출력 프로토콜
- 입력: `_workspace/panels/` 디렉토리의 패널 이미지들
- 출력: `_workspace/review_report.md`
- 형식:
  ```
  ## Panel {N}
  - 판정: PASS | FIX | REDO
  - 사유: [구체적 이유]
  - 수정 지시: [FIX/REDO인 경우 구체적 수정 방향]
  ```

## 에러 핸들링
- 이미지 로드 실패 시 해당 패널을 REDO로 판정
- 2회 재생성 후에도 REDO인 패널은 경고와 함께 PASS 처리

## 협업
- webtoon-artist에게 수정 지시서 전달 (결과 파일 기반)
- 재생성된 패널을 다시 검수 (최대 2회 루프)
```
<!-- /user-facing -->

### Error handling

<!-- user-facing (Korean, do not translate) -->
```
재시도 정책:
- REDO 판정 패널 → artist에게 재생성 요청 (구체적 수정 지시 포함)
- 최대 2회 루프 후 강제 PASS
- 전체 패널의 50% 이상이 REDO면 사용자에게 프롬프트 수정 제안
```
<!-- /user-facing -->

---

## Example 4: Code Review Team (Agent-Team mode)

### Team architecture: Fan-out/Fan-in + debate
### Execution mode: Agent Team

> Code review is the poster child for agent teams. Reviewers with different perspectives share findings and challenge each other, leading to deeper review.

<!-- user-facing (Korean, do not translate) -->
```
[리더] → TeamCreate(review-team)
    ├── security-reviewer: 보안 취약점 점검
    ├── performance-reviewer: 성능 영향 분석
    └── test-reviewer: 테스트 커버리지 검증
    → 리뷰어들이 서로 발견 공유 (SendMessage)
    → 리더가 결과 종합
```
<!-- /user-facing -->

### Team communication pattern

<!-- user-facing (Korean, do not translate) -->
```
security ──SendMessage──→ performance  ("이 SQL 쿼리 주입 가능, 성능 측면에서도 확인 필요")
performance ──SendMessage──→ test      ("N+1 쿼리 발견, 관련 테스트 있는지 확인 부탁")
test ────SendMessage──→ security      ("인증 모듈 테스트 없음, 보안 관점에서 우선순위 의견?")
```
<!-- /user-facing -->

Key idea: reviewers communicate **without routing through the leader**, which surfaces cross-cutting issues quickly.

---

## Example 5: Supervisor pattern — Code Migration Team (Agent-Team mode)

### Team architecture: Supervisor
### Execution mode: Agent Team

<!-- user-facing (Korean, do not translate) -->
```
[supervisor/리더] → 파일 목록 분석 → 배치 할당
    ├→ [migrator-1] (batch A)
    ├→ [migrator-2] (batch B)
    └→ [migrator-3] (batch C)
    ← TaskUpdate 수신 → 추가 배치 할당 또는 재할당
```
<!-- /user-facing -->

### Agent composition

<!-- user-facing (Korean, do not translate) -->
| 팀원 | 역할 |
|------|------|
| (리더 = migration-supervisor) | 파일 분석, 배치 분배, 진행 관리 |
| migrator-1~3 | 할당된 파일 배치를 마이그레이션 |
<!-- /user-facing -->

### Supervisor's dynamic distribution logic (leveraging agent team)

<!-- user-facing (Korean, do not translate) -->
```
1. 전체 대상 파일 목록 수집
2. 복잡도 추정 (파일 크기, import 수, 의존성)
3. TaskCreate로 파일 배치를 작업으로 등록 (의존성 포함)
4. 팀원들이 자체적으로 작업 요청 (claim)
5. 팀원이 TaskUpdate로 완료 보고 시:
   - 성공 → 다음 작업 자동 요청
   - 실패 → 리더가 SendMessage로 원인 확인 → 재할당 또는 다른 팀원에게 배정
6. 모든 작업 완료 → 리더가 통합 테스트 실행
```
<!-- /user-facing -->

Difference from fan-out: tasks are allocated **dynamically at runtime** instead of being fixed up front. The shared task list's "claim" feature naturally matches the supervisor pattern.

---

## Artifact pattern summary

### Agent definition file
Location: `project/.claude/agents/{agent-name}.md`
Required sections: core role, working principles, input/output protocol, error handling, collaboration.
Team-mode extra section: **team communication protocol** (who to receive/send messages, task-request scope).

### Skill file structure
Location: `project/.claude/skills/{skill-name}/SKILL.md` (project level)
Or: `~/.claude/skills/{skill-name}/SKILL.md` (global level)

### Integrated skill (orchestrator)
The top-level skill that coordinates the whole team. Defines per-scenario agent composition and workflow.
Template: see `references/orchestrator-template.md`.
**Always declare the execution mode** — Agent Team (default) or Sub-agent.
