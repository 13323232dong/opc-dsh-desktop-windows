# DSH 0.1.5-rc.2 候选兼容性审计

记录日期：2026-09-25。范围：桌面候选分支 `codex/dsh-015-resume-20260925`，基于此前的 `codex/dsh-upstream-0.1.5-compat`；官方底座为 `dsh-v0.1.5-rc.2`（`fb2c4b9`）。本记录只描述候选验证结果，不表示已合并 `main`、覆盖正式应用或部署生产环境。

## 已验证的候选迁移

- 将 20 个 `@deepseek-ai` 补丁从 `0.1.2-rc.1` 迁移到 `0.1.5-rc.2`。修正补丁审计脚本的执行目录后，迁移前对干净依赖树复核为 11 个可直接应用、9 个失配；原报告的“20/20 全部失配”是脚本路径错误导致的错误结论。
- Session V3 的永久删除适配了 handle 的写入归属、跨进程锁和多代日志。控制器拒绝删除运行中或非本进程拥有的会话；工作区保存待清理意图，在重启后补偿索引清理。删除流程保留 `session.lock` 的 inode，避免旧锁与新锁并存。
- 迁移了对话、预设、模型、布局、交付物和工作区等 UI 补丁。PPT 插件调用新版 `surfaceOp` 的 `startSeq`/`endSeq`，内置 core 和 adapter 均递增到 `0.1.1-rc.3` 并重建 artifact。
- 将 17 个 DSH 间接依赖固定为本仓库的官方打包 tarball，避免干净安装从 registry 解析到不同实现。
- 在干净依赖树上运行 `npm ci --ignore-scripts --offline`、`npm run audit:harness-patches` 和 `patch-package`：20 个补丁全部重放成功。全量测试 117 个文件、872 项通过；`tsc --noEmit -p tsconfig.node.json` 通过。
- 未签名开发验收包构建成功。包内 `@deepseek-ai/dsh` 为 `0.1.5-rc.2`，`js-yaml/package.json` 存在且从 App 目录可解析。真实开发 App 打开登录页并验证空表单校验；没有覆盖 `/Applications/Evan超级管家.app`。

## 尚未通过的合并门禁

登录后的真实 DSH 流程尚未验收，包括 OPC 插件加载、对话与会话恢复、Agent Teams、任务追踪、素材工作区、附件、语音和工具注册。静态检查仍发现 Agent Teams 使用 `child.session.events`、`sessionPersistence.inspect`，以及若干 OPC 插件使用旧的 `conversation.*` / `sidebar.*` 插槽。静态测试和登录页启动不能证明这些调用在 `0.1.5-rc.2` 中正常运行。

后续验收必须使用复制或隔离的 DSH home，避免 Session V3 对现有用户会话执行单向迁移。逐项修复不兼容的 OPC 插件、递增对应 artifact 版本、重新打包开发 App，并通过 Ego Lite 观察真实插件加载、成功和错误状态。上述门禁通过前，不合并 `main`，不从此候选分支生成正式安装包，也不部署生产环境。

## 历史审计要点

官方底座从旧会话服务改为 Session V3 `SessionHandle`，Agent 创建变为异步，客户端布局以 `main` 与 `sidebar.panellist` 为主。`peer` 版本范围接受 `0.1.5` 只表示可安装，不能作为运行时兼容证据。OPC 业务 API、租户数据、Agent Registry、Agent Memory 与生产 Linux 部署不在本次候选验证范围内。
