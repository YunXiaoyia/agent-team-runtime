# agent-team-runtime 后端核心新项目计划

## Summary

新建 `/home/yunyi/Desktop/Bytedance_cmp/agent-team-runtime`，作为干净独立项目，不合并进 `agent-im`，也不整块复制 `clowder-ai`。首版只做后端核心：成员注册、Codex/Claude CLI 接入、@mention 路由、A2A 协同、MCP/HTTP 回调桥、四条铁律、Git 项目管理。

## Key Changes

- 项目结构采用 pnpm workspace：
  - `apps/api`: Fastify API + Socket.IO 事件流，默认端口 `3104`。
  - `packages/shared`: 公共类型、事件、DTO。
  - `packages/runtime`: AgentService、Provider、Router、A2A、四铁律 guards。
  - `packages/mcp-server`: 最小 MCP 回调桥。
- 存储用 SQLite + Prisma，默认 `data/runtime.db`；不使用 Redis。
- Codex 接入：spawn `codex exec --json ...`，按当前本机 CLI 能力在 prompt payload 中注入 `developer_instructions`，解析 JSONL 为统一 `AgentMessage`。
- Claude 接入：spawn `claude -p ... --output-format stream-json --verbose`，按当前本机 CLI 能力用 `--system-prompt` 注入 L0/铁律 prompt。
- 协同层支持 `@codex`、`@claude`、多 mention 串行/并行、A2A handoff，默认最大 depth 为 `2`。

## Git Management

- 新项目创建后立即 `git init`，生成 `.gitignore`，并做一次初始提交。
- 执行过程中每完成一个阶段性任务都做一次中文 commit，commit message 使用简短中文动宾短语，便于回溯阶段进展。
- `.gitignore` 至少排除：
  - `node_modules/`
  - `.env`
  - `.env.*`
  - `data/*.db`
  - `data/*.db-*`
  - `dist/`
  - `.turbo/`
  - `.cache/`
  - `coverage/`
  - `*.log`
- 保留可追踪模板：
  - `.env.example`
  - `data/.gitkeep`
  - `docs/architecture.md`
  - `docs/runbook.md`
- Runtime guard 禁止 Agent 未经人类确认执行危险 Git 操作：
  - `git reset --hard`
  - `git clean -fd`
  - `git checkout -- <path>`
  - 删除 `.git`
  - 强推 `git push --force`
- API 提供只读 Git 状态能力：
  - `GET /git/status`
  - `GET /git/diff`
  - `GET /git/log`
- 首版不让 Agent 自动 commit；commit 由人类或显式 API 操作触发。

## Public Interfaces

- API:
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
- Core types:
  - `AgentService`
  - `AgentMessage`
  - `AgentConfig`
  - `Invocation`
  - `RuntimeGuardPolicy`

## Test Plan

- Unit tests:
  - Codex JSONL transformer。
  - Claude stream-json transformer。
  - mention resolver、A2A depth、serial/parallel router。
  - 四铁律 guard 和 Git destructive command guard。
- Integration tests:
  - mock provider 完整 invocation。
  - stub spawnFn 验证 Codex/Claude CLI 参数。
  - callback token 校验、线程上下文读取、post-message 写回。
  - Git status/diff/log 只读接口。
- Manual smoke:
  - `@codex` 真 CLI。
  - `@claude` 真 CLI。
  - Codex 通过 callback handoff 给 Claude。

## Assumptions

- 首版只做后端核心，不做 Web UI。
- 使用 Node.js + pnpm，不创建 Python 虚拟环境。
- 自动化测试不调用真实 Codex/Claude。
- 选择性移植 Clowder 的 Provider/Router/MCP 思路和必要代码。
- 新项目独立 git 管理，不修改 `agent-im` 和 `clowder-ai`。
