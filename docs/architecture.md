# Architecture

`agent-team-runtime` is a standalone backend workspace. It does not merge into `agent-im` and does not copy `clowder-ai` wholesale.

## Packages

- `apps/api`: Fastify HTTP API, Socket.IO event stream, SQLite persistence through Prisma.
- `packages/shared`: public DTOs, event names, and common types.
- `packages/runtime`: agent registry, provider adapters, mention router, A2A handoff, and guard policies.
- `packages/mcp-server`: minimal callback bridge used by agent tools and MCP clients.

## Runtime Flow

1. A human creates a thread and posts a message containing one or more mentions such as `@codex` or `@claude`.
2. The router resolves mentions to registered agents.
3. Invocations run serially by default, or in parallel when requested.
4. Providers normalize CLI output into `AgentMessage` events.
5. A2A handoff is allowed up to depth `2`.
6. Runtime guards reject dangerous shell and Git operations unless explicit human confirmation is present.

## Storage

SQLite is the default storage engine at `data/runtime.db`. Redis is intentionally not required for the first version.

## Git Policy

The runtime exposes read-only Git status, diff, and log endpoints. Agents are not allowed to auto-commit in the first version. Destructive Git operations are rejected by runtime guards unless a future explicit human-confirmed operation path is added.
