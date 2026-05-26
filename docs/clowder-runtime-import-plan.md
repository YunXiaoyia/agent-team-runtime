# agent-team-runtime 导入 Clowder 运行时计划

## Summary

将 `/home/yunyi/Desktop/Bytedance_cmp/agent-team-runtime` 从当前轻量 Fastify/Prisma 后端，改造成以 `/home/yunyi/Desktop/Bytedance_cmp/clowder-ai` 为主体的独立运行时项目。

本次方向不再是“选择性移植少量 Provider/Router/MCP 思路”，而是复制 Clowder 的大部分运行时代码，并把新项目保留为 `agent-team-runtime`。运行模型跟随 Clowder：Redis + API 3004 + Web 3003 + MCP server。

## Key Changes

- 复制范围采用“整仓运行时”：
  - 从 `clowder-ai` 复制 `packages/`、`scripts/`、`assets/`、`cat-cafe-skills/`、`sop-definitions/`、`guides/`、`docs/`、`desktop/`、根配置和根文档。
  - 不复制 `.git/`、`node_modules/`、`.pnpm-store/`、`.pnpm-home/`、`dist/`、`.next/`、`.env`、`.cat-cafe/`、SQLite/WAL runtime DB、日志和本机私有状态。
  - 保留 `LICENSE`、`TRADEMARKS.md`、`CLA*` 等许可和商标相关文件；项目名可以改为 `agent-team-runtime`，但版权和商标说明不删除。

- 替换当前轻量实现：
  - 当前 `apps/api`、`packages/runtime`、当前 Prisma schema 和旧测试不再作为主实现保留。
  - 导入 Clowder 的 `packages/api`、`packages/shared`、`packages/mcp-server`、`packages/web` 作为主 workspace。
  - 根 `package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json` 以 Clowder 版本为基准。

- 命名和启动调整：
  - 根包名改为 `agent-team-runtime`。
  - workspace 包名从 `@cat-cafe/*` 改为 `@agent-team-runtime/*`，并同步内部 import。
  - 环境变量先保留 `CAT_CAFE_*` 兼容名，新增文档说明这是从 Clowder 迁入的兼容命名；第一阶段不强行重命名所有 env，避免破坏大量脚本。
  - 默认启动方式改为 Clowder 模型：`pnpm start:direct` 或 `pnpm dev:direct`。
  - 访问入口改为 Web `http://localhost:3003`，API `http://localhost:3004`；不再承诺 `GET /` 是 API 首页。

- Git 和提交策略：
  - 实施前确认 `agent-team-runtime` 工作树干净。
  - 先打保护标签或分支：`pre-clowder-runtime-import`。
  - 每个阶段做中文 commit，建议顺序：
    - `导入 clowder 运行时代码`
    - `重命名运行时项目标识`
    - `清理本地状态与忽略规则`
    - `修复运行时构建启动`
    - `更新启动文档`

## Implementation Steps

1. 保护当前状态：
   - 确认 `git status --short` 为空。
   - 创建保护点：`git tag pre-clowder-runtime-import`。

2. 清理旧主实现：
   - 删除当前轻量后端主实现目录：`apps/`、`packages/`、`tests/`。
   - 保留 `.git/` 和必要历史文档，后续文档按新运行时更新。

3. 复制 Clowder 运行时：
   - 使用排除规则复制 `clowder-ai` 内容到 `agent-team-runtime`。
   - 必须排除运行状态和重资产缓存：`.git/`、`node_modules/`、`.pnpm-store/`、`.pnpm-home/`、`dist/`、`.next/`、`.env`、`.cat-cafe/`、`*.log`、`evidence.sqlite*`、`world.sqlite*`。
   - 按 Clowder `.gitignore` 合并当前 `.gitignore`，确保本机状态不会进入 git。

4. 项目标识迁移：
   - 根 `package.json` 的 `name` 改为 `agent-team-runtime`。
   - `@cat-cafe/api`、`@cat-cafe/shared`、`@cat-cafe/mcp-server`、`@cat-cafe/web` 改为 `@agent-team-runtime/api`、`@agent-team-runtime/shared`、`@agent-team-runtime/mcp-server`、`@agent-team-runtime/web`。
   - 同步 TypeScript imports、package scripts 中的 workspace filter。
   - 暂时保留 `CAT_CAFE_*` env、`.cat-cafe` 状态目录名、Redis key prefix 和脚本内部历史命名，作为第一阶段兼容层。

5. 文档更新：
   - 更新 `README.md`、`SETUP.md`、`docs/runbook.md`，明确当前项目是基于 Clowder 运行时导入的独立运行时。
   - 启动说明改为：
     - `pnpm install`
     - `cp .env.example .env`
     - `pnpm start:direct`
   - 明确浏览器入口是 `http://localhost:3003`，API 是 `http://localhost:3004`。

## Test Plan

- 基础验证：
  - `pnpm install`
  - `pnpm build`
  - `pnpm --filter @agent-team-runtime/shared build`
  - `pnpm --filter @agent-team-runtime/mcp-server build`
  - `pnpm --filter @agent-team-runtime/api build`

- 启动验证：
  - 启动 Redis + API + Web：`pnpm start:direct`
  - 验证 Web：打开 `http://localhost:3003`
  - 验证 API：请求 `http://localhost:3004/health` 或 Clowder API 现有健康检查路由。
  - 验证 Socket.IO/API 不因包名重命名失败。

- 代码一致性验证：
  - 全仓搜索确保没有路径指向旧的本地绝对路径 `/home/yunyi/Desktop/Bytedance_cmp/clowder-ai`。
  - 搜索 `@cat-cafe/`，除兼容文档或刻意保留说明外，代码 import 应改为 `@agent-team-runtime/`。
  - 搜索私有状态文件，确认 `.env`、`.cat-cafe/credentials.json`、runtime DB、日志、`node_modules/` 没有进入 git。

## Assumptions

- 目标是“复制 Clowder 运行时作为主体”，不是继续维护当前轻量 API。
- 接受 Redis、API 3004、Web 3003、Clowder 启动脚本和较重依赖。
- 第一阶段保留 `CAT_CAFE_*` env 兼容名，避免一次性重命名脚本、测试、配置导致启动不可控。
- 保留 MIT license 和商标说明；项目可以叫 `agent-team-runtime`，但不能把 Clowder 品牌资产改造成看似自有品牌。
