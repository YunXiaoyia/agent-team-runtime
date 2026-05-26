import type { RuntimeGuardPolicy } from "@agent-team-runtime/shared";

export const defaultRuntimeGuardPolicy: RuntimeGuardPolicy = {
  maxA2ADepth: 2,
  requireHumanConfirmationForDangerousGit: true,
  disallowAgentAutoCommit: true
};
