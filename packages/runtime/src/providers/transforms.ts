import type { AgentMessage } from "@agent-team-runtime/shared";
import { createId, nowIso } from "../id.js";

interface TransformContext {
  threadId: string;
  invocationId: string;
  agentId: string;
}

function message(content: string, context: TransformContext, metadata: Record<string, unknown> = {}): AgentMessage {
  return {
    id: createId("msg"),
    threadId: context.threadId,
    invocationId: context.invocationId,
    agentId: context.agentId,
    role: "agent",
    content,
    metadata,
    createdAt: nowIso()
  };
}

export function transformCodexJsonl(stdout: string, context: TransformContext): AgentMessage[] {
  const messages: AgentMessage[] = [];

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed) as Record<string, unknown>;
      const content = extractText(event, ["message", "content", "text", "delta", "output"]);
      if (content) {
        messages.push(message(content, context, { provider: "codex", rawType: event.type ?? event.event }));
      }
    } catch {
      messages.push(message(trimmed, context, { provider: "codex", parseError: true }));
    }
  }

  return coalesceMessages(messages, context, "codex");
}

export function transformClaudeStreamJson(stdout: string, context: TransformContext): AgentMessage[] {
  const messages: AgentMessage[] = [];

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed) as Record<string, unknown>;
      const content = extractClaudeText(event);
      if (content) {
        messages.push(message(content, context, { provider: "claude", rawType: event.type }));
      }
    } catch {
      messages.push(message(trimmed, context, { provider: "claude", parseError: true }));
    }
  }

  return coalesceMessages(messages, context, "claude");
}

function extractText(value: unknown, keys: string[]): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const nested = extractText(record[key], keys);
    if (nested) return nested;
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item, keys)).filter(Boolean).join("");
  }

  return undefined;
}

function extractClaudeText(event: Record<string, unknown>): string | undefined {
  const direct = extractText(event, ["text", "content", "delta"]);
  if (direct) return direct;

  const messageValue = event.message;
  if (messageValue && typeof messageValue === "object") {
    return extractText(messageValue, ["text", "content", "delta"]);
  }

  return undefined;
}

function coalesceMessages(messages: AgentMessage[], context: TransformContext, provider: string): AgentMessage[] {
  if (messages.length <= 1) return messages;

  const content = messages.map((item) => item.content).join("");
  return [
    message(content, context, {
      provider,
      coalesced: true,
      chunks: messages.length
    })
  ];
}
