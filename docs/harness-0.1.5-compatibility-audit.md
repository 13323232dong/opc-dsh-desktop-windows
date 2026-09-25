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
5. 已增加 `npm run audit:harness-patches`；2026-09-25 修正其路径错误并扩展为版本及正反向重放检查，见下文。

## 2026-09-25 续接核验与补丁迁移

来源任务：`01a0d89a-f803-74b3-a400-741e283be777`（跟上官方独立分支升级DSH）。续接工作树为 `/Users/mac/.codex/worktrees/dsh-015-compat-resume`，分支 `codex/dsh-015-compat-resume`，起点 `84f0dac`。原候选目录的锁文件备份及日常桌面目录既有改动均未纳入本任务。

### 对旧审计结论的更正

旧脚本对带有 `a/node_modules/...` 路径的补丁使用 `-p1`，却从 `node_modules` 内执行，形成重复路径。因此 2026-09-11 的“20/20 全部失配”结论无效，不能据此推断所有核心能力都需要重写。

在原始 `0.1.5-rc.2` tgz 的全新解包副本上，以正确目录、零 fuzz 重查后，原补丁有 **10 个文本可应用、10 个确实需要迁移**。文本可应用不代表版本标记正确或运行行为已验收。审计现在同时检查已安装包版本、正向或反向应用、空目录及无法识别的补丁文件，并输出实际失败原因；6 项回归测试已纳入 `npm test`。

### 本轮已实现的核心兼容

- 19 个 DSH 补丁的文件名与目标包统一为 `0.1.5-rc.2`；loader 保持实际 vendor 版本 `1.0.3`。
- 模型与预设：保留搜索、视觉能力、推理等级、目录编辑和导入导出，并适配新版 portal、提供方过滤和菜单锚点。
- 对话与布局：保留新版主面板和文件上传逻辑，恢复 macOS 侧栏宽度、PPT 插槽及本地路径链接。
- 工作区：迁移菜单、删除确认、未读标记、Finder 和搜索定位，保留新版就绪检查与面板导航。
- 会话控制器：保留创建/恢复返回的 `AgentHandle`，只释放自身拥有的空闲 Agent。删除前及等待创建/恢复后均复核运行状态，运行中的任务返回 `session/agent-busy`。
- JSONL 持久化：新增符合 Session V3 的 `delete(id)`，旧测试改用 `create/open` 返回的 handle；不再调用旧服务级 `append/load`。

### Session V3 删除的维护边界

删除必须同时取得本进程写入占用和跨进程写锁。所有 generation 完成身份、格式和路径预检后，按版本从旧到新删除并逐步同步目录，避免删除新版后回退旧版。`session.lock` 的稳定 inode、会话/工作区目录和未知文件必须保留；不得递归删除会话目录。

符号链接、非普通 generation、未来格式、混合压缩、身份被替换、已有本地或跨进程 writer 均拒绝删除。失败路径释放占用和锁。已有返回的读取结果及历史 handle 的只读快照可保留；删除后的新 `open` 必须回源失败。显式重新创建相同 ID 仍沿用官方允许复用身份的语义。

证据：`test/session-delete-v3.test.ts` 覆盖真实子进程 writer、generation 清理、锁 inode 保留、符号链接拒绝及失败释放；`test/session-delete-controller-v3.test.ts` 覆盖活动任务和 Agent 所有权边界。Windows 尚未实机验收，POSIX 专属检查在 Windows 上条件跳过。

独立审查仍发现未解决的路径竞态：具有同一存储目录写权限的进程若绕过写锁，在路径检查后直接重命名会话目录并替换为符号链接，基于路径的删除不能提供完整的目录隔离保证。静态符号链接拒绝测试不覆盖这种并发替换。该删除实现仍是候选，不得作为可用于不可信、共享可写目录的安全方案；正式交付前必须明确受管理目录的权限边界，或补充基于系统句柄的删除实现与回归测试。不能用增加一次普通路径检查宣称消除了竞态。

### 验证与未完成项

20 个补丁已从原始 tgz 解包后执行正向应用，并与安装目录逐字节核对一致；原始与已应用目录均通过审计。另以真正的 `patch-package --error-on-fail` 复核并修正旧行号上下文，20/20 成功。补丁中的空白上下文行属于 unified diff 格式，不应删除其前导空格；`.gitattributes` 仅针对补丁文件允许此格式空白，源码仍保留通常的空白检查。

最终使用 `npm ci --ignore-scripts` 创建干净依赖，随后显式执行 `patch-package --error-on-fail` 和 `scripts/install-brand-assets.mjs`，结果如下：

| 检查 | 2026-09-25 结果 |
| --- | --- |
| 单元与集成测试 | 117 个测试文件，879 项全部通过 |
| 补丁审计回归 | 6 项全部通过，已纳入 `npm test` |
| 类型检查及桌面编译 | `npm run typecheck`、`npm run build` 通过 |
| 补丁门禁及依赖闭包 | 20/20 通过；`npm ls --depth=0 --omit=optional` 通过 |
| 依赖安全检查 | `npm audit` 为 0 漏洞；不代表代码安全问题均已消除 |
| Git 空白检查 | `git diff --cached --check` 通过 |
| 正式安装包、真实桌面和 Windows | 本轮未执行，不能视为通过 |

原候选锁文件还有 17 个新版 DSH 间接依赖从 npm 下载；现已改为仓库现有 `harness-0.1.5-rc.2` 的固定 tgz，避免运行时包集合混用。

PPT 只迁移 Persona 前后缀及 V3 `surfaceOp.startSeq/endSeq` 契约，core/adapter 候选版本为 `0.1.1-rc.4`。构建脚本修正异步预览清单顺序，使用版本化文件名并禁止同名不同字节覆盖；模板源码未变时可显式使用 `--reuse-previews`。同源码连续两次构建字节一致，新 artifact 均已纳入本分支：

- `packages/ppt-bundles/dsh-ppt-0.1.1-rc.4-desktop.tgz`，SHA-256 `5e73635f100e8b1bcc9038d0ef20f036cc55ec760d46344d3bbd422a478ae2b6`。
- `packages/ppt-bundles/dsh-ppt-composer-0.1.1-rc.4-desktop.tgz`，SHA-256 `c52cc39e506839abd0c305e71b0c05238b1769e64a86dcfc5c996cd93ddbfa37`。

提交前发现的 `image-size` 解析器高危依赖已定向覆盖为 `2.0.4`，没有执行整体 `npm audit fix`。依据：[ICNS 公告](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)、[JXL/HEIF 公告](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)。修复范围由两条公告及本次重新安装后的 `npm audit` 结果共同确认。

这些验证只证明核心补丁可重放与被测行为正确，不能证明全部 OPC 插件已经兼容。Profile 的 Agent Teams、任务追踪、素材等旧 artifact 仍包含 `session.events` 或 `conversation.view` 调用，需继续从所属插件源码适配、使用新 artifact 并执行真实加载验收。会话迁移仍只能使用隔离数据目录，不能打开现有用户会话数据。

本次获取 `fork/main` 后，本地 `main=d86b366`、远程 `fork/main=0bff959`，双方分别有 2 和 29 个独有提交，尚未同步；这是本次时点记录，后续必须重新获取远程验证。当前桌面 `main` 已在历史候选起点之后有大量其他提交。本分支不能直接覆盖正式安装或上线，后续必须重新核对与当前 `main` 的重叠、插件版本及完整功能基线。此次未合并 `main`、未生成安装包、未覆盖 `/Applications/Evan超级管家.app`、未部署。

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
