# DSH 0.1.5-rc.2 兼容性审计

状态：候选版本，尚未达到发布条件。本报告不授权桌面发布、合并 `main` 或服务器部署。

## 审计范围

- 候选分支：`codex/dsh-upstream-0.1.5-compat`
- 桌面基线：`main` 的提交 `3bac228`
- 当前内置底座：`0.1.2-rc.1`
- 候选底座：`dsh-v0.1.5-rc.2`，提交 `fb2c4b9`
- OPC 业务服务、租户数据、Agent Registry、Agent Memory 和生产 Linux 部署不在范围内。

桌面端使用固定版本、在本地打包的 DSH npm 包集合。它不是官方源码树的分支，不能通过 Git 合并 `deepseek-harness` 来升级；正确方式是构建并验证官方包后替换候选分支中的包集合。

## 已完成事项

1. 官方 `0.1.5-rc.2` 已构建，生成 265 个 DSH 包和 9 个 vendor 包。
2. 候选分支已导入包集合 `packages/harness-0.1.5-rc.2`。
3. 桌面端依赖、Profile、PPT 内置包的底座版本已更新到 `0.1.5-rc.2`。
4. 使用 npm 11 完成依赖安装，`npm ls --depth=0 --omit=optional` 通过。
5. 已增加 `npm run audit:harness-patches`，用于安装前检查历史补丁能否应用。

## 当前阻断：历史补丁全部失配

桌面基线有 20 个针对 `0.1.2-rc.1` 的 `patch-package` 补丁。2026-09-11 对 `0.1.5-rc.2` 依赖树进行 dry-run，结果为 20/20 全部无法应用。这是源码兼容性失败，不是 npm 依赖解析失败。

| 补丁范围 | 规模 | 处理要求 |
| --- | ---: | --- |
| 会话持久化、JSONL 后端、工作区注册表 | 3 个包补丁，涉及 9 个文件 | 按 Session V3 handle 重新设计后，才能恢复永久删除及会话/工作区操作。 |
| 会话控制器和工作区 UI | 2 个包补丁，涉及 23 个文件 | 按新版控制器、远程接口和 `main` 面板 API 重新实现。 |
| 对话、侧边栏、布局、聊天、交付物、轨迹 UI | 14 个包补丁 | 逐项映射到当前扩展点，不能复制旧生成代码。 |
| 模型、预设、DeepSeek/PI 路由、目录选择器 | 6 个包补丁 | 按新版契约重新验证后才能保留。 |
| 加载器和核心启动流程 | 2 个包补丁 | 每迁移一项能力后重新验证。 |

## 典型断裂：会话删除

旧测试调用服务级 `append(id, events)`、`load(id)` 和 `delete(id)`。新版 Session V3 改为由 `create`/`open` 返回 `SessionHandle`，写入必须通过 handle 完成；官方底座没有删除 API。当前测试还因此出现 5 个 TypeScript 错误。

不能只修改测试让它编译通过，否则会掩盖永久删除的安全边界。必须先决定并实现新版删除能力，再补充“只删除目标会话、不影响其他会话、运行中会话受保护、工作区索引同步清理”的测试。

候选分支在此问题解决前不得运行正常 `postinstall`，也不能删除、跳过或改名旧补丁来制造安装成功。

## 官方底座的主要变化

| 断裂面 | 官方变化 | OPC 影响 |
| --- | --- | --- |
| 会话持久化 | Session V3、生命周期范围的 `SessionHandle` | 直接读取事件和持久化数据的代码必须适配。 |
| Agent 生命周期 | 创建改为异步，调用方显式传入 Agent | Agent Teams 创建、恢复和停止流程必须重新验证。 |
| 客户端布局 | 全局面板使用 `main`、`sidebar.panellist`，旧对话视图迁移到 `main` | 工作区注册必须迁移。 |
| Persona 与 inbox | Persona 改为前后缀，inbox 类型化并归属 Agent | 不能模拟已删除 API，必须使用明确生命周期调用。 |
| 文件 UI | 增加官方上传器和多标签侧边栏 | 保留 OPC 附件语义，避免重复入口和重复提交。 |

Session V3 迁移是单向的。候选测试必须使用复制的桌面数据目录，绝不能打开现有用户会话数据。

## 启用插件静态审计

| 插件 | 发现 | 候选处理 |
| --- | --- | --- |
| `@nanmicoder/dsh-agent-teams` | 读取 `child.session.events`，调用 `sessionPersistence.inspect`，注册 `conversation.chat.node`。 | 阻断项：适配后重测团队创建、恢复、邮箱和聊天卡片。 |
| `@opc/dsh-task-tracker` | 使用 `sessionPersistence` 和 `session.events`。 | 阻断项：迁移到 SessionHandle 只读路径。 |
| `@opc/dsh-brand` | 注册 `sidebar.brand.*` 和 `conversation.hero.brand.mark`。 | 映射到当前 sidebar/main 插槽。 |
| `@opc/dsh-assets`、`@opc/dsh-viral-chase` | 注册 `conversation.view`。 | 迁移到 `main` 面板契约。 |
| `dsh-file-picker`、`@opc/dsh-session-context` | 使用 `conversation.input.left`。 | 执行客户端插槽和会话读取测试。 |
| `@opc/dsh-file-attachments` | 使用 `conversation.input.attachments`。 | 保留 OPC 附件归属，对照官方上传器检查重复处理器。 |
| `@opc/dsh-realtime-voice` | 使用对话、布局和插槽客户端包。 | 执行加载、卸载和插槽测试。 |
| `@omdsh-dev/dsh-genui` | peer 范围已包含 `>=0.1.1 <0.2.0`。 | 重新构建并加载测试。 |
| 仅提供工具的 OPC 插件 | 未发现直接使用已变化的会话或面板 API。 | 重新构建并做工具注册 smoke test。 |

peer 范围接受 `0.1.5` 只代表安装兼容，不代表运行时兼容。

## 兼容层边界

不要为了追随官方功能改变 OPC 业务行为，应增加小型运行时兼容模块：

1. `SessionReader`：旧底座使用旧接口，候选底座使用 `SessionHandle`，对外提供统一只读接口。
2. `PanelRegistry`：将 OPC 工作区映射到当前 `main` 和 `sidebar.panellist`，每项功能只保留一个入口。
3. `AgentLifecycle`：封装异步创建、恢复、停止和显式 Agent 归属。
4. `RuntimeCapabilities`：探测 API，不支持时显示兼容性错误并安全停止。

兼容层不得读取租户记录、绕过工具策略或改变 Agent Registry/Agent Memory。

## 合并前门禁

1. 完成历史补丁迁移或正式替代方案。
2. 通过 `typecheck`、单元测试和构建。
3. 对 `SessionReader`、`PanelRegistry`、`AgentLifecycle` 执行单元测试。
4. 使用复制的空 DSH home 做启动、登录、对话、会话恢复和插件加载测试。
5. 验证 Agent Teams、任务追踪、素材工作区、附件上传、语音和工具注册。
6. 只有全部通过后才能提交审查；未经单独批准，不能合并 `main`、打包或部署。
