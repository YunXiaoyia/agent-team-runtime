const destructiveGitPatterns: RegExp[] = [
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[^\n;&|]*f[^\n;&|]*d\b/i,
  /\bgit\s+checkout\s+--\s+\S+/i,
  /\brm\s+-[^\n;&|]*r[^\n;&|]*f[^\n;&|]*\s+\.git\b/i,
  /\bgit\s+push\b[^\n;&|]*\s--force(?:-with-lease)?\b/i
];

const commitPatterns: RegExp[] = [
  /\bgit\s+commit\b/i
];

export interface GuardDecision {
  allowed: boolean;
  reason?: string;
}

export function guardShellCommand(command: string, options: { humanConfirmed?: boolean } = {}): GuardDecision {
  if (destructiveGitPatterns.some((pattern) => pattern.test(command)) && !options.humanConfirmed) {
    return {
      allowed: false,
      reason: "危险 Git 操作需要人类确认"
    };
  }

  if (commitPatterns.some((pattern) => pattern.test(command)) && !options.humanConfirmed) {
    return {
      allowed: false,
      reason: "首版不允许 Agent 自动 commit"
    };
  }

  return { allowed: true };
}
