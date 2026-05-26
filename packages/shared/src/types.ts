export type AgentProviderKind = "codex" | "claude" | "mock";

export type InvocationStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type MessageRole = "human" | "agent" | "system" | "tool";

export interface AgentConfig {
  id: string;
  name: string;
  provider: AgentProviderKind;
  mention: string;
  capabilities: string[];
  model?: string;
  workingDirectory?: string;
  systemPrompt?: string;
}

export interface AgentMessage {
  id: string;
  threadId: string;
  invocationId?: string;
  agentId?: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ThreadRecord {
  id: string;
  title?: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Invocation {
  id: string;
  threadId: string;
  agentId: string;
  status: InvocationStatus;
  depth: number;
  input: string;
  output?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeGuardPolicy {
  maxA2ADepth: number;
  requireHumanConfirmationForDangerousGit: boolean;
  disallowAgentAutoCommit: boolean;
}

export interface ProviderRunInput {
  agent: AgentConfig;
  threadId: string;
  invocationId: string;
  prompt: string;
  depth: number;
  context: AgentMessage[];
}

export interface ProviderRunResult {
  messages: AgentMessage[];
  raw?: string;
}

export interface MentionResolution {
  mention: string;
  agent: AgentConfig;
}

export interface RouteMessageRequest {
  threadId: string;
  content: string;
  mode?: "serial" | "parallel";
  depth?: number;
  context?: AgentMessage[];
}

export interface RouteMessageResult {
  invocations: Invocation[];
  messages: AgentMessage[];
}

export interface CallbackThreadContextQuery {
  threadId: string;
}

export interface CallbackPostMessageBody {
  threadId: string;
  sender: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CallbackA2AHandoffBody {
  threadId: string;
  fromAgentId: string;
  toMention: string;
  content: string;
  depth: number;
}
