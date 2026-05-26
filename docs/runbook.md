# Runbook

## Setup

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm start:direct
```

The Web UI listens on `http://localhost:3003`.
The API listens on `http://localhost:3004`.

For a Redis-free smoke run, use:

```bash
pnpm start:direct -- --memory
```

`CAT_CAFE_*` environment variables and `.cat-cafe/` local state paths are intentionally retained as first-phase compatibility names from the imported Clowder runtime.

## Test

```bash
pnpm build
pnpm --filter @agent-team-runtime/shared build
pnpm --filter @agent-team-runtime/mcp-server build
pnpm --filter @agent-team-runtime/api build
```

## Core Endpoints

- `GET /health`
- `GET /api/health`
- `GET /api/ready`
- `GET /api/messages`
- `POST /api/messages`
- `GET /api/threads`
- `POST /api/threads`
- `GET /api/config`
- `GET /api/cats`
- `POST /api/callbacks/post-message`
- `POST /api/callbacks/a2a-handoff`
- `GET /api/workspace/git-status`

## Manual Smoke

Real provider smoke tests require the target CLI installed and authenticated in `PATH`, for example `codex` and/or `claude`.

1. Start with `pnpm start:direct`.
2. Open `http://localhost:3003`.
3. Configure accounts in Hub / System Settings.
4. Create or open a thread.
5. Send a message mentioning a Codex-backed or Claude-backed agent.
6. Verify the API receives the invocation and the UI streams the response.
