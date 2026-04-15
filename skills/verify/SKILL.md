---
name: verify
description: "Verifies that changes actually work. Triggers: 'verify', '검증해줘', '확인해봐', '테스트 돌려봐'."
allowed-tools: Read Glob Grep Bash
---

# Verify

Use this skill when the user wants confidence that a feature, fix, or refactor actually works.

## Language Policy

**All user-facing output must be in Korean.** This file is written in English for token efficiency (Claude reads it as instructions), but anything the end user sees — `AskUserQuestion` text, progress messages, final summaries, reports — must be rendered in natural Korean.

- Claude-directed instructions in this file: English.
- Embedded Korean strings marked `<!-- user-facing -->`: literal templates, never translate.
- Frontmatter `description` Korean triggers: literal, never translate.
- When you narrate progress to the user, translate to natural Korean first.

## Goal
Turn vague "it should work" claims into concrete evidence.

## Workflow
1. Identify the exact behavior that must be proven.
2. Prefer existing tests first.
3. If coverage is missing, run the narrowest direct verification commands available.
4. If direct automation is not enough, describe the manual validation steps and gather concrete observable evidence.
5. Report only what was actually verified.

## Verification order
1. Existing tests
2. Typecheck / build
3. Narrow direct command checks
4. Manual or interactive validation

## Rules
- Do not say a change is complete without evidence.
- If a check fails, include the failure clearly.
- If no realistic verification path exists, say that explicitly instead of bluffing.
- Prefer concise evidence summaries over noisy logs.

## Output
- What was verified
- Which commands/tests were run
- What passed
- What failed or remains unverified
