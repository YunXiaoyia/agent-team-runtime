import type {
  AgentConfig,
  AgentMessage,
  AgentProviderKind,
  RouteMessageRequest,
  RouteMessageResult
} from "@agent-team-runtime/shared";
import { RuntimeEvents } from "@agent-team-runtime/shared";
import { createId, nowIso } from "./id.js";
import { ClaudeProvider, CodexProvider, MockProvider } from "./providers/index.js";
import type { AgentProvider } from "./providers/types.js";
import { AgentRouter, type RuntimeEventEmitter } from "./router/router.js";
import type { RuntimeStore } from "./store.js";
import { normalizeMention } from "./store.js";

export class AgentService {
  private readonly router: AgentRouter;

  constructor(
    private readonly store: RuntimeStore,
    providers?: Map<AgentProviderKind, AgentProvider>,
    emit: RuntimeEventEmitter = () => undefined
  ) {
    this.router = new AgentRouter(store, providers ?? defaultProviders(), emit);
  }

  async listAgents(): Promise<AgentConfig[]> {
    return this.store.listAgents();
  }

  async registerAgent(agent: AgentConfig): Promise<AgentConfig> {
    const saved = await this.store.saveAgent({
      ...agent,
      mention: normalizeMention(agent.mention)
    });
    return saved;
  }

  async createThread(input: { title?: string } = {}) {
    return this.store.createThread(input);
  }

  async getThread(threadId: string) {
    return this.store.getThread(threadId);
  }

  async postMessage(request: RouteMessageRequest): Promise<RouteMessageResult> {
    return this.router.routeMessage(request);
  }

  async postCallbackMessage(input: {
    threadId: string;
    sender: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: createId("msg"),
      threadId: input.threadId,
      agentId: input.sender,
      role: "agent",
      content: input.content,
      metadata: input.metadata,
      createdAt: nowIso()
    };
    return this.store.addMessage(message);
  }

  async cancelInvocation(id: string) {
    const updated = await this.store.updateInvocation(id, { status: "cancelled" });
    return updated;
  }

  async getInvocation(id: string) {
    return this.store.getInvocation(id);
  }
}

export function defaultProviders(): Map<AgentProviderKind, AgentProvider> {
  return new Map<AgentProviderKind, AgentProvider>([
    ["codex", new CodexProvider()],
    ["claude", new ClaudeProvider()],
    ["mock", new MockProvider()]
  ]);
}

export { RuntimeEvents };
