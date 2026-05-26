import type {
  AgentConfig,
  AgentMessage,
  AgentProviderKind,
  Invocation,
  RouteMessageRequest,
  RouteMessageResult,
  RuntimeGuardPolicy
} from "@agent-team-runtime/shared";
import { RuntimeEvents } from "@agent-team-runtime/shared";
import { createId, nowIso } from "../id.js";
import type { AgentProvider } from "../providers/types.js";
import { resolveMentions } from "./mentions.js";
import type { RuntimeStore } from "../store.js";
import { assertA2ADepthAllowed } from "../guards/a2a.js";
import { defaultRuntimeGuardPolicy } from "../guards/policy.js";

export type RuntimeEventEmitter = (event: string, payload: unknown) => void;

export class AgentRouter {
  constructor(
    private readonly store: RuntimeStore,
    private readonly providers: Map<AgentProviderKind, AgentProvider>,
    private readonly emit: RuntimeEventEmitter = () => undefined,
    private readonly policy: RuntimeGuardPolicy = defaultRuntimeGuardPolicy
  ) {}

  async routeMessage(request: RouteMessageRequest): Promise<RouteMessageResult> {
    const thread = await this.store.getThread(request.threadId);
    if (!thread) throw new Error(`thread not found: ${request.threadId}`);

    assertA2ADepthAllowed(request.depth ?? 0, this.policy);

    const humanMessage: AgentMessage = {
      id: createId("msg"),
      threadId: request.threadId,
      role: "human",
      content: request.content,
      createdAt: nowIso()
    };
    await this.store.addMessage(humanMessage);
    this.emit(RuntimeEvents.MessageCreated, humanMessage);

    const agents = await this.store.listAgents();
    const resolutions = resolveMentions(request.content, agents);
    if (resolutions.length === 0) {
      return { invocations: [], messages: [humanMessage] };
    }

    const runOne = async (agent: AgentConfig): Promise<{ invocation: Invocation; messages: AgentMessage[] }> => {
      const provider = this.providers.get(agent.provider);
      if (!provider) throw new Error(`provider not registered: ${agent.provider}`);

      const invocation = await this.store.createInvocation({
        threadId: request.threadId,
        agentId: agent.id,
        depth: request.depth ?? 0,
        input: request.content
      });
      this.emit(RuntimeEvents.InvocationQueued, invocation);
      await this.store.updateInvocation(invocation.id, { status: "running" });
      this.emit(RuntimeEvents.InvocationStarted, { ...invocation, status: "running" });

      try {
        const result = await provider.run({
          agent,
          threadId: request.threadId,
          invocationId: invocation.id,
          prompt: request.content,
          depth: request.depth ?? 0,
          context: request.context ?? thread.messages
        });

        for (const message of result.messages) {
          await this.store.addMessage(message);
          this.emit(RuntimeEvents.MessageCreated, message);
        }

        const completed = await this.store.updateInvocation(invocation.id, {
          status: "completed",
          output: result.messages.map((message) => message.content).join("\n")
        });
        this.emit(RuntimeEvents.InvocationCompleted, completed);

        return { invocation: completed ?? invocation, messages: result.messages };
      } catch (error) {
        const failed = await this.store.updateInvocation(invocation.id, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        });
        this.emit(RuntimeEvents.InvocationFailed, failed);
        return { invocation: failed ?? invocation, messages: [] };
      }
    };

    const mode = request.mode ?? "serial";
    const routed =
      mode === "parallel"
        ? await Promise.all(resolutions.map(({ agent }) => runOne(agent)))
        : await runSerial(resolutions.map(({ agent }) => agent), runOne);

    return {
      invocations: routed.map((item) => item.invocation),
      messages: [humanMessage, ...routed.flatMap((item) => item.messages)]
    };
  }
}

async function runSerial<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (const item of items) {
    results.push(await fn(item));
  }
  return results;
}
