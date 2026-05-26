import type {
  CallbackA2AHandoffBody,
  CallbackPostMessageBody,
  CallbackThreadContextQuery,
  RouteMessageResult,
  ThreadRecord
} from "@agent-team-runtime/shared";
import { RuntimeEvents } from "@agent-team-runtime/shared";
import type { AgentService } from "@agent-team-runtime/runtime";
import { assertA2ADepthAllowed } from "@agent-team-runtime/runtime";

export class CallbackAuthError extends Error {
  constructor() {
    super("invalid callback token");
  }
}

export class CallbackBridge {
  constructor(
    private readonly service: AgentService,
    private readonly options: { token?: string; emit?: (event: string, payload: unknown) => void } = {}
  ) {}

  verifyToken(token: string | undefined): void {
    if (this.options.token && token !== this.options.token) {
      throw new CallbackAuthError();
    }
  }

  async getThreadContext(query: CallbackThreadContextQuery): Promise<ThreadRecord> {
    const thread = await this.service.getThread(query.threadId);
    if (!thread) throw new Error(`thread not found: ${query.threadId}`);
    return thread;
  }

  async postMessage(body: CallbackPostMessageBody) {
    return this.service.postCallbackMessage(body);
  }

  async handoff(body: CallbackA2AHandoffBody): Promise<RouteMessageResult> {
    const nextDepth = body.depth + 1;
    assertA2ADepthAllowed(nextDepth);
    this.options.emit?.(RuntimeEvents.A2AHandoffRequested, body);
    return this.service.postMessage({
      threadId: body.threadId,
      content: `${body.toMention} ${body.content}`,
      depth: nextDepth,
      mode: "serial"
    });
  }
}
