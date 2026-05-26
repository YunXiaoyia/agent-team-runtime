import { z } from "zod";

export const createAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.enum(["codex", "claude", "mock"]),
  mention: z.string().min(2).regex(/^@[a-zA-Z0-9_-]+$/),
  capabilities: z.array(z.string()).default([]),
  model: z.string().optional(),
  workingDirectory: z.string().optional(),
  systemPrompt: z.string().optional()
});

export const createThreadSchema = z.object({
  title: z.string().optional()
});

export const postThreadMessageSchema = z.object({
  content: z.string().min(1),
  mode: z.enum(["serial", "parallel"]).optional()
});

export const callbackThreadContextSchema = z.object({
  threadId: z.string().min(1)
});

export const callbackPostMessageSchema = z.object({
  threadId: z.string().min(1),
  sender: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

export const callbackA2AHandoffSchema = z.object({
  threadId: z.string().min(1),
  fromAgentId: z.string().min(1),
  toMention: z.string().min(2),
  content: z.string().min(1),
  depth: z.number().int().min(0).default(0)
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type CreateThreadDto = z.infer<typeof createThreadSchema>;
export type PostThreadMessageDto = z.infer<typeof postThreadMessageSchema>;
