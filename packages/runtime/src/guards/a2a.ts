import type { RuntimeGuardPolicy } from "@agent-team-runtime/shared";
import { defaultRuntimeGuardPolicy } from "./policy.js";

export function assertA2ADepthAllowed(depth: number, policy: RuntimeGuardPolicy = defaultRuntimeGuardPolicy): void {
  if (depth > policy.maxA2ADepth) {
    throw new Error(`A2A handoff depth ${depth} exceeds max depth ${policy.maxA2ADepth}`);
  }
}
