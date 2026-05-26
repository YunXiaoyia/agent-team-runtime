import type { AgentConfig, MentionResolution } from "@agent-team-runtime/shared";
import { normalizeMention } from "../store.js";

const mentionPattern = /@[a-zA-Z0-9_-]+/g;

export function extractMentions(content: string): string[] {
  const mentions = content.match(mentionPattern) ?? [];
  return [...new Set(mentions.map(normalizeMention))];
}

export function resolveMentions(content: string, agents: AgentConfig[]): MentionResolution[] {
  const mentions = extractMentions(content);
  return mentions.flatMap((mention) => {
    const agent = agents.find((candidate) => normalizeMention(candidate.mention) === mention);
    return agent ? [{ mention, agent }] : [];
  });
}
