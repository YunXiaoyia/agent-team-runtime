import { describe, expect, it } from "vitest";
import { CallbackAuthError, CallbackBridge } from "@agent-team-runtime/mcp-server";
import { AgentService, InMemoryRuntimeStore } from "@agent-team-runtime/runtime";

describe("callback bridge", () => {
  it("validates callback token", () => {
    const bridge = new CallbackBridge(new AgentService(new InMemoryRuntimeStore()), { token: "secret" });
    expect(() => bridge.verifyToken("bad")).toThrow(CallbackAuthError);
    expect(() => bridge.verifyToken("secret")).not.toThrow();
  });

  it("reads thread context and posts callback messages", async () => {
    const service = new AgentService(new InMemoryRuntimeStore());
    const thread = await service.createThread({ title: "work" });
    const bridge = new CallbackBridge(service);

    const message = await bridge.postMessage({ threadId: thread.id, sender: "codex", content: "done" });
    const context = await bridge.getThreadContext({ threadId: thread.id });

    expect(message.content).toBe("done");
    expect(context.messages).toHaveLength(1);
    expect(context.messages[0].agentId).toBe("codex");
  });

  it("performs A2A handoff through service routing", async () => {
    const store = new InMemoryRuntimeStore();
    const service = new AgentService(store);
    await service.registerAgent({ id: "claude", name: "Claude", provider: "mock", mention: "@claude", capabilities: [] });
    const thread = await service.createThread();
    const bridge = new CallbackBridge(service);

    const result = await bridge.handoff({
      threadId: thread.id,
      fromAgentId: "codex",
      toMention: "@claude",
      content: "take over",
      depth: 1
    });

    expect(result.invocations).toHaveLength(1);
    expect(result.invocations[0].depth).toBe(2);
  });
});
