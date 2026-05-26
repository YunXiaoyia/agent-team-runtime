import { describe, expect, it } from "vitest";
import { ClaudeProvider, CodexProvider, transformClaudeStreamJson, transformCodexJsonl, type SpawnFn } from "@agent-team-runtime/runtime";

const context = {
  threadId: "thread_1",
  invocationId: "inv_1",
  agentId: "codex"
};

describe("provider transforms", () => {
  it("transforms Codex JSONL into AgentMessage", () => {
    const messages = transformCodexJsonl('{"type":"message","content":"hello"}\n{"type":"message","content":" world"}', context);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("hello world");
    expect(messages[0].threadId).toBe("thread_1");
  });

  it("transforms Claude stream-json into AgentMessage", () => {
    const messages = transformClaudeStreamJson(
      '{"type":"content_block_delta","delta":{"text":"hello"}}\n{"type":"content_block_delta","delta":{"text":" claude"}}',
      { ...context, agentId: "claude" }
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("hello claude");
    expect(messages[0].agentId).toBe("claude");
  });
});

describe("provider CLI adapters", () => {
  it("spawns codex exec with json output and injected developer instructions", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawnFn: SpawnFn = async (command, args) => {
      calls.push({ command, args });
      return { stdout: '{"content":"ok"}\n', stderr: "", exitCode: 0 };
    };

    const provider = new CodexProvider(spawnFn);
    const result = await provider.run({
      agent: { id: "codex", name: "Codex", provider: "codex", mention: "@codex", capabilities: [] },
      threadId: "thread_1",
      invocationId: "inv_1",
      prompt: "do work",
      depth: 0,
      context: []
    });

    expect(calls[0].command).toBe("codex");
    expect(calls[0].args).toContain("exec");
    expect(calls[0].args).toContain("--json");
    expect(calls[0].args.at(-1)).toContain("<developer_instructions>");
    expect(calls[0].args.at(-1)).toContain("do work");
    expect(result.messages[0].content).toBe("ok");
  });

  it("spawns claude with stream-json verbose and injected system prompt", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawnFn: SpawnFn = async (command, args) => {
      calls.push({ command, args });
      return { stdout: '{"delta":{"text":"ok"}}\n', stderr: "", exitCode: 0 };
    };

    const provider = new ClaudeProvider(spawnFn);
    const result = await provider.run({
      agent: { id: "claude", name: "Claude", provider: "claude", mention: "@claude", capabilities: [] },
      threadId: "thread_1",
      invocationId: "inv_1",
      prompt: "do work",
      depth: 0,
      context: []
    });

    expect(calls[0].command).toBe("claude");
    expect(calls[0].args).toEqual(expect.arrayContaining(["-p", "--output-format", "stream-json", "--verbose", "--system-prompt", "do work"]));
    expect(result.messages[0].content).toBe("ok");
  });
});
