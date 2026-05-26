import type { ProviderRunInput, ProviderRunResult } from "@agent-team-runtime/shared";
import { transformClaudeStreamJson } from "./transforms.js";
import type { AgentProvider, SpawnFn } from "./types.js";
import { nodeSpawnFn } from "./spawn.js";

const DEFAULT_SYSTEM_PROMPT = [
  "You are running inside agent-team-runtime.",
  "L0: preserve human control and do not perform destructive Git operations without explicit human confirmation.",
  "Use runtime callbacks for thread context, post-message, and A2A handoff."
].join("\n");

export class ClaudeProvider implements AgentProvider {
  readonly kind = "claude";

  constructor(private readonly spawnFn: SpawnFn = nodeSpawnFn) {}

  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const systemPrompt = input.agent.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--system-prompt",
      systemPrompt,
      input.prompt
    ];

    const result = await this.spawnFn("claude", args, {
      cwd: input.agent.workingDirectory
    });

    if (result.exitCode !== 0) {
      throw new Error(`claude exited with ${result.exitCode}: ${result.stderr}`);
    }

    return {
      raw: result.stdout,
      messages: transformClaudeStreamJson(result.stdout, {
        threadId: input.threadId,
        invocationId: input.invocationId,
        agentId: input.agent.id
      })
    };
  }
}
