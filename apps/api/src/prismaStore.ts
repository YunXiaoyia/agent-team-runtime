import { PrismaClient, type Agent as PrismaAgent, type Invocation as PrismaInvocation, type Message as PrismaMessage, type Thread as PrismaThread } from "@prisma/client";
import type { AgentConfig, AgentMessage, Invocation, ThreadRecord } from "@agent-team-runtime/shared";
import type { RuntimeStore } from "@agent-team-runtime/runtime";
import { createId, nowIso, normalizeMention } from "@agent-team-runtime/runtime";

export class PrismaRuntimeStore implements RuntimeStore {
  constructor(private readonly prisma: PrismaClient) {}

  async listAgents(): Promise<AgentConfig[]> {
    const agents = await this.prisma.agent.findMany({ orderBy: { createdAt: "asc" } });
    return agents.map(toAgent);
  }

  async getAgent(id: string): Promise<AgentConfig | undefined> {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    return agent ? toAgent(agent) : undefined;
  }

  async getAgentByMention(mention: string): Promise<AgentConfig | undefined> {
    const agents = await this.listAgents();
    return agents.find((agent) => normalizeMention(agent.mention) === normalizeMention(mention));
  }

  async saveAgent(agent: AgentConfig): Promise<AgentConfig> {
    const saved = await this.prisma.agent.upsert({
      where: { id: agent.id },
      create: {
        id: agent.id,
        name: agent.name,
        provider: agent.provider,
        mention: normalizeMention(agent.mention),
        capabilities: JSON.stringify(agent.capabilities),
        model: agent.model,
        workingDirectory: agent.workingDirectory,
        systemPrompt: agent.systemPrompt
      },
      update: {
        name: agent.name,
        provider: agent.provider,
        mention: normalizeMention(agent.mention),
        capabilities: JSON.stringify(agent.capabilities),
        model: agent.model,
        workingDirectory: agent.workingDirectory,
        systemPrompt: agent.systemPrompt
      }
    });
    return toAgent(saved);
  }

  async createThread(input: { title?: string } = {}): Promise<ThreadRecord> {
    const thread = await this.prisma.thread.create({
      data: { id: createId("thread"), title: input.title },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });
    return toThread(thread);
  }

  async getThread(threadId: string): Promise<ThreadRecord | undefined> {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });
    return thread ? toThread(thread) : undefined;
  }

  async addMessage(message: AgentMessage): Promise<AgentMessage> {
    const saved = await this.prisma.message.create({
      data: {
        id: message.id,
        threadId: message.threadId,
        invocationId: message.invocationId,
        sender: message.agentId ?? message.role,
        role: message.role,
        content: message.content,
        metadata: message.metadata ? JSON.stringify(message.metadata) : undefined
      }
    });
    await this.prisma.thread.update({ where: { id: message.threadId }, data: { updatedAt: new Date() } });
    return toMessage(saved);
  }

  async createInvocation(input: {
    threadId: string;
    agentId: string;
    depth: number;
    input: string;
  }): Promise<Invocation> {
    const invocation = await this.prisma.invocation.create({
      data: {
        id: createId("inv"),
        threadId: input.threadId,
        agentId: input.agentId,
        status: "queued",
        depth: input.depth,
        input: input.input
      }
    });
    return toInvocation(invocation);
  }

  async updateInvocation(
    id: string,
    patch: Partial<Pick<Invocation, "status" | "output" | "error">>
  ): Promise<Invocation | undefined> {
    try {
      const invocation = await this.prisma.invocation.update({
        where: { id },
        data: patch
      });
      return toInvocation(invocation);
    } catch {
      return undefined;
    }
  }

  async getInvocation(id: string): Promise<Invocation | undefined> {
    const invocation = await this.prisma.invocation.findUnique({ where: { id } });
    return invocation ? toInvocation(invocation) : undefined;
  }
}

function toAgent(agent: PrismaAgent): AgentConfig {
  return {
    id: agent.id,
    name: agent.name,
    provider: agent.provider as AgentConfig["provider"],
    mention: agent.mention,
    capabilities: JSON.parse(agent.capabilities) as string[],
    model: agent.model ?? undefined,
    workingDirectory: agent.workingDirectory ?? undefined,
    systemPrompt: agent.systemPrompt ?? undefined
  };
}

function toThread(thread: PrismaThread & { messages?: PrismaMessage[] }): ThreadRecord {
  return {
    id: thread.id,
    title: thread.title ?? undefined,
    messages: (thread.messages ?? []).map(toMessage),
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString()
  };
}

function toMessage(message: PrismaMessage): AgentMessage {
  return {
    id: message.id,
    threadId: message.threadId,
    invocationId: message.invocationId ?? undefined,
    agentId: message.sender,
    role: message.role as AgentMessage["role"],
    content: message.content,
    metadata: message.metadata ? (JSON.parse(message.metadata) as Record<string, unknown>) : undefined,
    createdAt: message.createdAt.toISOString()
  };
}

function toInvocation(invocation: PrismaInvocation): Invocation {
  return {
    id: invocation.id,
    threadId: invocation.threadId,
    agentId: invocation.agentId,
    status: invocation.status as Invocation["status"],
    depth: invocation.depth,
    input: invocation.input,
    output: invocation.output ?? undefined,
    error: invocation.error ?? undefined,
    createdAt: invocation.createdAt?.toISOString?.() ?? nowIso(),
    updatedAt: invocation.updatedAt?.toISOString?.() ?? nowIso()
  };
}
