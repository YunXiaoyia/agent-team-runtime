# Runbook

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm dev
```

The API listens on port `3104` by default.

## Test

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Core Endpoints

- `GET /health`
- `GET /agents`
- `POST /agents`
- `POST /threads`
- `GET /threads/:threadId`
- `POST /threads/:threadId/messages`
- `POST /invocations/:id/cancel`
- `GET /invocations/:id`
- `GET /callbacks/thread-context`
- `POST /callbacks/post-message`
- `POST /callbacks/a2a-handoff`
- `GET /git/status`
- `GET /git/diff`
- `GET /git/log`

Callback endpoints require the `x-callback-token` header when `CALLBACK_TOKEN` is configured.

## Manual Smoke

Real provider smoke tests require `codex` and/or `claude` installed in `PATH`.

1. Register a Codex agent with provider `codex`.
2. Register a Claude agent with provider `claude`.
3. Create a thread.
4. Post a message with `@codex`.
5. Post a callback handoff from Codex to Claude and verify a second invocation appears.
