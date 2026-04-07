#!/usr/bin/env node

/**
 * oh-my-harness Codex Monitor Hook (PostToolUse)
 *
 * Detects when Bash tool calls invoke `codex` CLI and logs the event.
 * Provides real-time visibility into Codex delegation by agents.
 *
 * Output:
 * - Logs to .tdd/codex-calls.log (append)
 * - Injects additionalContext so the user sees a confirmation
 */

import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readStdin } from "./lib/stdin.mjs";

const LOG_DIR = join(process.cwd(), ".tdd");
const LOG_FILE = join(LOG_DIR, "codex-calls.log");

/** Parse PostToolUse hook input */
function parseInput(raw) {
  try {
    const data = JSON.parse(raw);
    return {
      toolName: data.tool_name ?? "",
      toolInput: data.tool_input ?? {},
      toolOutput: data.tool_output ?? "",
    };
  } catch {
    return { toolName: "", toolInput: {}, toolOutput: "" };
  }
}

/** Check if a Bash command involves codex */
function isCodexCall(command) {
  return /\bcodex\b/.test(command);
}

/** Extract codex subcommand for readable logging */
function extractCodexInfo(command) {
  const match = command.match(/codex\s+([\w-]+)(?:\s+(.{0,120}))?/);
  if (match) {
    return { subcommand: match[1], args: match[2]?.trim() ?? "" };
  }
  return { subcommand: "unknown", args: "" };
}

/** Append to log file */
function logCodexCall(command, output) {
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    const info = extractCodexInfo(command);
    const timestamp = new Date().toISOString();
    const entry = [
      `[${timestamp}] codex ${info.subcommand}`,
      `  command: ${command.slice(0, 200)}`,
      `  output_preview: ${(output ?? "").slice(0, 150).replace(/\n/g, "\\n")}`,
      "---",
      "",
    ].join("\n");
    appendFileSync(LOG_FILE, entry, "utf-8");
  } catch {
    // Non-critical — don't block the pipeline
  }
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const { toolName, toolInput, toolOutput } = parseInput(raw);

    // Only monitor Bash tool calls
    if (toolName !== "Bash") {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const command = toolInput.command ?? "";
    if (!isCodexCall(command)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Codex call detected — log and notify
    logCodexCall(command, toolOutput);

    const info = extractCodexInfo(command);
    const succeeded = toolOutput && !toolOutput.includes("command not found");
    const status = succeeded ? "SUCCESS" : "FAILED";

    const context = [
      `[CODEX MONITOR] codex ${info.subcommand} — ${status}`,
      info.args ? `  task: ${info.args.slice(0, 100)}` : "",
      `  log: .tdd/codex-calls.log`,
    ]
      .filter(Boolean)
      .join("\n");

    console.log(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: context,
        },
      }),
    );
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
