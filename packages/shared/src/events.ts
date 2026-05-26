export const RuntimeEvents = {
  AgentRegistered: "agent.registered",
  ThreadCreated: "thread.created",
  MessageCreated: "message.created",
  InvocationQueued: "invocation.queued",
  InvocationStarted: "invocation.started",
  InvocationCompleted: "invocation.completed",
  InvocationFailed: "invocation.failed",
  InvocationCancelled: "invocation.cancelled",
  A2AHandoffRequested: "a2a.handoff.requested"
} as const;

export type RuntimeEventName = (typeof RuntimeEvents)[keyof typeof RuntimeEvents];
