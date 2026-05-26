import type { ProviderRunInput, ProviderRunResult } from "@agent-team-runtime/shared";
import { transformCodexJsonl } from "./transforms.js";
import type { AgentProvider, SpawnFn } from "./types.js";
import { nodeSpawnFn } from "./spawn.js";

const DEFAULT_DEVELOPER_INSTRUCTIONS = [
  "You are running inside agent-team-runtime.",
  "Follow the four iron rules: protect user intent, keep actions auditable, avoid destructive operations, and ask for human confirmation before risky changes.",
  "Use callback endpoints for handoff or posting runtime-visible messages."
].join("\n");

export class CodexProvider implements AgentProvider {
  readonly kind = "codex";

  constructor(private readonly spawnFn: SpawnFn = nodeSpawnFn) {}

  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const developerInstructions = input.agent.systemPrompt ?? DEFAULT_DEVELOPER_INSTRUCTIONS;
    const args = [
      "exec",
      "--json",
      "--developer-instructions",
      developerInstructions,
      input.prompt
    ];

    const result = await this.spawnFn("codex", args, {
      cwd: input.agent.workingDirectory
    });

    if (result.exitCode !== 0) {
      throw new Error(`codex exited with ${result.exitCode}: ${result.stderr}`);
    }

    return {
      raw: result.stdout,
      messages: transformCodexJsonl(result.stdout, {
        threadId: input.threadId,
        invocationId: input.invocationId,
        agentId: input.agent.id
      })
    };
  }
}
