import { describe, expect, it } from "vitest";
import {
  AgentRouter,
  assertA2ADepthAllowed,
  extractMentions,
  guardShellCommand,
  InMemoryRuntimeStore,
  MockProvider,
  resolveMentions
} from "@agent-team-runtime/runtime";
import type { AgentProviderKind } from "@agent-team-runtime/shared";

describe("mention resolver", () => {
  it("extracts and resolves unique mentions", () => {
    const agents = [
      { id: "codex", name: "Codex", provider: "codex" as const, mention: "@codex", capabilities: [] },
      { id: "claude", name: "Claude", provider: "claude" as const, mention: "@claude", capabilities: [] }
    ];

    expect(extractMentions("@codex please ask @claude and @codex")).toEqual(["@codex", "@claude"]);
    expect(resolveMentions("@codex @missing", agents).map((item) => item.agent.id)).toEqual(["codex"]);
  });
});

describe("runtime guards", () => {
  it("rejects dangerous git commands without human confirmation", () => {
    expect(guardShellCommand("git reset --hard HEAD").allowed).toBe(false);
    expect(guardShellCommand("git clean -fd").allowed).toBe(false);
    expect(guardShellCommand("git checkout -- src/file.ts").allowed).toBe(false);
    expect(guardShellCommand("rm -rf .git").allowed).toBe(false);
    expect(guardShellCommand("git push --force").allowed).toBe(false);
    expect(guardShellCommand("git reset --hard HEAD", { humanConfirmed: true }).allowed).toBe(true);
  });

  it("rejects agent auto commit without human confirmation", () => {
    expect(guardShellCommand("git commit -m test").allowed).toBe(false);
  });

  it("enforces A2A depth limit", () => {
    expect(() => assertA2ADepthAllowed(2)).not.toThrow();
    expect(() => assertA2ADepthAllowed(3)).toThrow(/exceeds max depth/);
  });
});

describe("agent router", () => {
  it("runs multiple mentions serially", async () => {
    const store = new InMemoryRuntimeStore();
    await store.saveAgent({ id: "a", name: "A", provider: "mock", mention: "@a", capabilities: [] });
    await store.saveAgent({ id: "b", name: "B", provider: "mock", mention: "@b", capabilities: [] });
    const thread = await store.createThread();
    const router = new AgentRouter(store, new Map<AgentProviderKind, MockProvider>([["mock", new MockProvider()]]));

    const result = await router.routeMessage({ threadId: thread.id, content: "@a then @b", mode: "serial" });

    expect(result.invocations).toHaveLength(2);
    expect(result.messages.map((message) => message.content)).toEqual([
      "@a then @b",
      "[mock:a] @a then @b",
      "[mock:b] @a then @b"
    ]);
  });

  it("runs multiple mentions in parallel", async () => {
    const store = new InMemoryRuntimeStore();
    await store.saveAgent({ id: "a", name: "A", provider: "mock", mention: "@a", capabilities: [] });
    await store.saveAgent({ id: "b", name: "B", provider: "mock", mention: "@b", capabilities: [] });
    const thread = await store.createThread();
    const router = new AgentRouter(store, new Map<AgentProviderKind, MockProvider>([["mock", new MockProvider()]]));

    const result = await router.routeMessage({ threadId: thread.id, content: "@a @b", mode: "parallel" });

    expect(result.invocations).toHaveLength(2);
    expect(result.invocations.every((invocation) => invocation.status === "completed")).toBe(true);
  });
});
