import type { AgentConfig, AgentMessage, Invocation, InvocationStatus, ThreadRecord } from "@agent-team-runtime/shared";
import { createId, nowIso } from "./id.js";

export interface RuntimeStore {
  listAgents(): Promise<AgentConfig[]>;
  getAgent(id: string): Promise<AgentConfig | undefined>;
  getAgentByMention(mention: string): Promise<AgentConfig | undefined>;
  saveAgent(agent: AgentConfig): Promise<AgentConfig>;
  createThread(input?: { title?: string }): Promise<ThreadRecord>;
  getThread(threadId: string): Promise<ThreadRecord | undefined>;
  addMessage(message: AgentMessage): Promise<AgentMessage>;
  createInvocation(input: {
    threadId: string;
    agentId: string;
    depth: number;
    input: string;
  }): Promise<Invocation>;
  updateInvocation(id: string, patch: Partial<Pick<Invocation, "status" | "output" | "error">>): Promise<Invocation | undefined>;
  getInvocation(id: string): Promise<Invocation | undefined>;
}

export class InMemoryRuntimeStore implements RuntimeStore {
  private readonly agents = new Map<string, AgentConfig>();
  private readonly threads = new Map<string, ThreadRecord>();
  private readonly invocations = new Map<string, Invocation>();

  async listAgents(): Promise<AgentConfig[]> {
    return [...this.agents.values()];
  }

  async getAgent(id: string): Promise<AgentConfig | undefined> {
    return this.agents.get(id);
  }

  async getAgentByMention(mention: string): Promise<AgentConfig | undefined> {
    const normalized = normalizeMention(mention);
    return [...this.agents.values()].find((agent) => normalizeMention(agent.mention) === normalized);
  }

  async saveAgent(agent: AgentConfig): Promise<AgentConfig> {
    this.agents.set(agent.id, { ...agent, mention: normalizeMention(agent.mention) });
    return this.agents.get(agent.id)!;
  }

  async createThread(input: { title?: string } = {}): Promise<ThreadRecord> {
    const now = nowIso();
    const thread: ThreadRecord = {
      id: createId("thread"),
      title: input.title,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    this.threads.set(thread.id, thread);
    return thread;
  }

  async getThread(threadId: string): Promise<ThreadRecord | undefined> {
    return this.threads.get(threadId);
  }

  async addMessage(message: AgentMessage): Promise<AgentMessage> {
    const thread = this.threads.get(message.threadId);
    if (!thread) throw new Error(`thread not found: ${message.threadId}`);
    thread.messages.push(message);
    thread.updatedAt = nowIso();
    return message;
  }

  async createInvocation(input: {
    threadId: string;
    agentId: string;
    depth: number;
    input: string;
  }): Promise<Invocation> {
    const now = nowIso();
    const invocation: Invocation = {
      id: createId("inv"),
      threadId: input.threadId,
      agentId: input.agentId,
      status: "queued",
      depth: input.depth,
      input: input.input,
      createdAt: now,
      updatedAt: now
    };
    this.invocations.set(invocation.id, invocation);
    return invocation;
  }

  async updateInvocation(
    id: string,
    patch: Partial<Pick<Invocation, "status" | "output" | "error">>
  ): Promise<Invocation | undefined> {
    const current = this.invocations.get(id);
    if (!current) return undefined;
    const updated = {
      ...current,
      ...patch,
      updatedAt: nowIso()
    };
    this.invocations.set(id, updated);
    return updated;
  }

  async getInvocation(id: string): Promise<Invocation | undefined> {
    return this.invocations.get(id);
  }
}

export function normalizeMention(mention: string): string {
  const trimmed = mention.trim();
  return trimmed.startsWith("@") ? trimmed.toLowerCase() : `@${trimmed.toLowerCase()}`;
}

export function isTerminalStatus(status: InvocationStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}
