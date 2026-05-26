import type { ProviderRunInput, ProviderRunResult } from "@agent-team-runtime/shared";

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string }
) => Promise<SpawnResult>;

export interface AgentProvider {
  readonly kind: string;
  run(input: ProviderRunInput): Promise<ProviderRunResult>;
}
