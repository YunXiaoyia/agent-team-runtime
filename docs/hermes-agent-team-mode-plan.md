# Hermes Agent Team 模式改造计划

## Summary

把当前默认“三只猫”协作方式改成 `hermes-agent-team` 风格的团队模式：一个协调者接收用户任务、拆解目标、派发给多个 worker、审查回流结果，并由协调者向用户交付最终答案。

第一阶段只做配置、默认路由和 prompt 约束，不引入 Hermes Kanban、Python 后端、SQLite 状态机或额外任务队列。现有 Clowder 运行时、Web/API、A2A `@mention` 能力继续保留，作为协调者和 worker 之间的派工通道。

## Target Model

默认团队由 3 个活跃 agent 组成：

- `opus`: `Coordinator / 协调者`
  - 底层仍调用 Claude CLI。
  - 默认接收所有无显式 `@mention` 的用户消息。
  - 负责理解用户目标、拆解任务、判断是否需要 worker、派发任务、审查结果和最终合成。
- `codex`: `Engineering Worker / 工程 Worker`
  - 底层仍调用 Codex CLI。
  - 负责代码实现、测试、修复、命令验证和工程判断。
  - 不默认直接接收普通用户消息，除非用户显式 `@codex` 或协调者派发。
- `gemini`: `Design/Research Worker / 设计研究 Worker`
  - 底层仍调用 Gemini 相关配置。
  - 负责 UI/UX、方案对比、研究、产品判断和非代码型分析。
  - 默认不写代码，除非后续明确扩展权限。

其他已导入 agent 继续保留在 catalog 中，但默认设为不可用，避免进入默认团队调度。

## Routing Semantics

默认入口改成协调者优先：

- 用户普通消息，没有显式 `@mention`、`@all`、`@thread` 时，始终路由到 `opus` 协调者。
- 即使上一轮最近回复者是 `codex` 或 `gemini`，下一条无 `@mention` 的用户消息仍回到协调者。
- 用户显式 `@codex`、`@gemini` 时，仍直达对应 worker。
- 协调者输出行首 `@codex`、`@gemini` 时，继续使用现有 A2A 机制派工。
- worker 完成子任务后，应回报协调者，而不是横向调度其他 worker。

这个模式会替换当前“无 `@mention` 时优先延续最近 agent”的默认行为。

## Key Changes

### 1. 更新默认团队配置

修改 `cat-template.json`：

- 将默认活跃 roster 收敛到 `opus`、`codex`、`gemini`。
- `opus` 的角色改为：
  - `coordinator`
  - `planner`
  - `reviewer`
  - `lead`
- `codex` 的角色改为：
  - `worker`
  - `engineering`
  - `implementation`
  - `testing`
- `gemini` 的角色改为：
  - `worker`
  - `design`
  - `research`
  - `ux`
- 给三个 agent 增加 Hermes Team 语义的描述字段：
  - `roleDescription`
  - `personality`
  - `teamStrengths`
  - `caution`
  - `restrictions`
- 保留旧别名，新增团队别名：
  - `opus`: `@coordinator`、`@leader`、`@协调者`、`@队长`
  - `codex`: `@engineer`、`@code-worker`、`@worker-codex`、`@工程worker`
  - `gemini`: `@designer`、`@researcher`、`@design-worker`、`@设计worker`

### 2. 更新默认路由

修改 `packages/api/src/services/AgentRouter.ts`：

- `peekTargets` 和 `resolveTargets` 在没有显式 mention 时，直接返回 `getDefaultCatId()`。
- 保留显式 mention、group mention、A2A handoff 的现有解析。
- 删除或降级“最近发言 agent 优先”的默认入口策略。
- 更新相关注释，明确当前模式是 coordinator-first。

### 3. 更新系统 Prompt

修改 `packages/api/src/services/SystemPromptBuilder.ts`：

- 增加 `Hermes Agent Team Mode` 段落。
- 对协调者注入职责：
  - 先理解用户目标。
  - 判断是否需要拆解。
  - 必要时用 `@codex`、`@gemini` 派发清晰子任务。
  - 收到 worker 回流后进行审查、去重、补洞和最终合成。
  - 最终答复由协调者面向用户交付。
- 对 worker 注入职责：
  - 只处理被分配的子任务或用户显式点名任务。
  - 输出应聚焦可交付结果、风险、验证信息和下一步。
  - 被协调者召唤时，默认回报协调者。
  - 不主动横向派发给其他 worker。
  - 范围不清、权限不足或需要用户判断时，退回协调者。
- 将旧的猫猫协作文案弱化为 team roster 文案，保留底层 agent id/provider 信息。

### 4. 更新工作流触发规则

调整 `WORKFLOW_TRIGGERS`：

- `opus`:
  - 复杂工程任务派给 `@codex`。
  - 设计、研究、方案对比派给 `@gemini`。
  - 多 worker 回流后由 `opus` 合成最终答案。
- `codex`:
  - 完成工程任务后回报 `@coordinator`。
  - 不主动把任务派给 `@gemini`，除非协调者要求。
- `gemini`:
  - 完成设计/研究任务后回报 `@coordinator`。
  - 不主动把任务派给 `@codex`，除非协调者要求。

## Implementation Steps

1. 配置阶段：
   - 更新 `cat-template.json` 的默认 roster。
   - 增加 coordinator/worker 相关 mention patterns。
   - 将非默认 agent 设为 `available:false`。

2. 路由阶段：
   - 修改无 mention 用户消息的默认目标为 `getDefaultCatId()`。
   - 保留显式 `@agent`、`@all`、`@thread` 和 A2A 路由。
   - 增加或更新 router tests。

3. Prompt 阶段：
   - 增加 Hermes Team Mode prompt section。
   - 区分 coordinator 与 worker 的职责约束。
   - 更新旧 workflow trigger。
   - 增加 prompt builder tests。

4. 验证阶段：
   - 验证配置加载。
   - 验证 mention 解析。
   - 验证无 mention 默认进入协调者。
   - 验证显式 worker 调用仍可用。
   - 验证 A2A 派工链路仍可用。

## Test Plan

### Config Tests

- `cat-template.json` 能通过现有 zod schema。
- 默认 active roster 只包含 `opus`、`codex`、`gemini`。
- `@coordinator`、`@leader`、`@engineer`、`@code-worker`、`@designer`、`@researcher` 能解析到正确 agent。
- 非默认 agent 保留在 catalog 中，但不进入默认可用 roster。

### Routing Tests

- 新 thread 中用户发送无 `@mention` 消息，目标是 `opus`。
- thread 最近回复者是 `codex` 后，用户继续发送无 `@mention` 消息，目标仍是 `opus`。
- 用户发送 `@codex` 时，目标是 `codex`。
- 用户发送 `@gemini` 时，目标是 `gemini`。
- 协调者消息行首 `@codex` 或 `@gemini` 时，仍触发现有 A2A。

### Prompt Tests

- `opus` prompt 包含协调者职责、派工、审查和最终合成要求。
- `codex` prompt 包含 worker 职责、工程任务边界、回报协调者要求。
- `gemini` prompt 包含 worker 职责、设计/研究任务边界、回报协调者要求。
- direct-message dynamic prompt 仍能显示 sender 和 thread context。

### Build And Smoke

建议验证命令：

```bash
pnpm --filter @agent-team-runtime/shared build
pnpm --filter @agent-team-runtime/api build
pnpm build
pnpm start:direct -- --memory --quick
```

启动后验证：

```bash
curl http://localhost:3004/health
curl http://localhost:3004/api/health
```

Web 入口：

```text
http://localhost:3003
```

## Non-Goals

- 不引入 Hermes Kanban UI。
- 不复制 `hermes-agent-team` Python 后端。
- 不新增独立 worker task database。
- 不改变底层 Claude/Codex/Gemini CLI provider 的调用方式。
- 不一次性重命名所有猫猫 UI 资产。
- 不移除已导入的其他 agent，只是默认不启用。

## Assumptions

- “默认进协调者”指所有普通用户消息先交给 `opus`。
- worker 的主要入口是协调者派工或用户显式 `@mention`。
- 第一阶段目标是行为模式切换，不追求完整 Hermes Kanban 状态机。
- 现有 Clowder A2A 能力足够支撑 coordinator-to-worker 派工。
- 后续如果需要更强任务状态管理，再进入第二阶段引入 Kanban/task state。

## Follow-Up Phases

### Phase 2: Lightweight Task State

在不引入完整 Hermes Kanban 的前提下，为协调者派发的 worker 子任务增加轻量状态：

- `planned`
- `dispatched`
- `running`
- `reported`
- `accepted`
- `needs_revision`

### Phase 3: Hermes Kanban Compatibility

如果需要更接近 `hermes-agent-team`，再考虑：

- 引入 worker task board。
- 增加 task id 和 parent invocation id。
- 支持协调者 review/redo。
- 提供 UI 中的任务列视图。
- 对齐 Hermes MCP agent bus 的部分语义。
