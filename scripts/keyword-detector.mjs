#!/usr/bin/env node

/**
 * oh-my-harness Keyword Detector Hook
 *
 * Detects Korean/English trigger keywords and injects skill content.
 * Simplified from oh-my-claudecode's 690-line version to ~100 lines.
 *
 * Supported keywords:
 * 1. harness: 하네스 만들어줘, 하네스 구성, 하네스 설계, harness
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readStdin } from "./lib/stdin.mjs";

const pluginRoot =
  process.env.CLAUDE_PLUGIN_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");

/** Load skill content from SKILL.md on disk */
function loadSkillContent(skillName) {
  const skillPath = join(pluginRoot, "skills", skillName, "SKILL.md");
  if (existsSync(skillPath)) {
    try {
      return readFileSync(skillPath, "utf8");
    } catch {
      /* fall through */
    }
  }
  return null;
}

/** Extract prompt text from hook JSON input */
function extractPrompt(input) {
  try {
    const data = JSON.parse(input);
    if (data.prompt) return data.prompt;
    if (data.message?.content) return data.message.content;
    if (Array.isArray(data.parts)) {
      return data.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");
    }
    return "";
  } catch {
    return "";
  }
}

/** Sanitize text: strip code blocks, XML tags, URLs */
function sanitize(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/https?:\/\/[^\s)>\]]+/g, "")
    .replace(/<(\w[\w-]*)[\s>][\s\S]*?<\/\1>/g, "");
}

/** Check if keyword appears in non-informational context */
function isInformational(text, position) {
  const start = Math.max(0, position - 60);
  const end = Math.min(text.length, position + 60);
  const ctx = text.slice(start, end);
  return /(?:뭐야|무엇|어떻게|설명|알려\s?줘|what(?:'s|\s+is)|how\s+to|explain)/iu.test(ctx);
}

/** Create hook output with skill content injection */
function createOutput(additionalContext) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  };
}

/** Keyword definitions: pattern → skill name */
const KEYWORDS = [
  {
    name: "harness",
    pattern:
      /(?:하네스\s*(?:만들어|구성|구축|설계|점검|감사))|(?:\bharness\b)|(?:\bbuild\s+harness\b)/iu,
  },
];

async function main() {
  try {
    const input = await readStdin();
    if (!input.trim()) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const prompt = extractPrompt(input);
    if (!prompt) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const clean = sanitize(prompt).toLowerCase();

    // Find first matching keyword
    for (const kw of KEYWORDS) {
      const match = kw.pattern.exec(clean);
      if (match && !isInformational(clean, match.index)) {
        const content = loadSkillContent(kw.name);
        if (content) {
          const ctx = `[MAGIC KEYWORD: ${kw.name.toUpperCase()}]\n\n${content}\n\n---\nUser request:\n${prompt}`;
          console.log(JSON.stringify(createOutput(ctx)));
          return;
        }
        // Fallback to Skill tool invocation
        const ctx = `[MAGIC KEYWORD: ${kw.name.toUpperCase()}]\n\nYou MUST invoke the skill using the Skill tool:\n\nSkill: oh-my-harness:${kw.name}\n\nUser request:\n${prompt}\n\nIMPORTANT: Invoke the skill IMMEDIATELY.`;
        console.log(JSON.stringify(createOutput(ctx)));
        return;
      }
    }

    // No match
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
