import type { AgentMessage, ProviderRunInput, ProviderRunResult } from "@agent-team-runtime/shared";
import { createId, nowIso } from "../id.js";
import type { AgentProvider } from "./types.js";

export class MockProvider implements AgentProvider {
  readonly kind = "mock";

  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const response: AgentMessage = {
      id: createId("msg"),
      threadId: input.threadId,
      invocationId: input.invocationId,
      agentId: input.agent.id,
      role: "agent",
      content: `[mock:${input.agent.id}] ${input.prompt}`,
      metadata: { provider: "mock" },
      createdAt: nowIso()
    };

    return { messages: [response], raw: response.content };
  }
}
