# 桌面 Agent Teams 样式来源

- 恢复日期：2026-09-25。
- 来源仓库：`OPC智能体团队`，已提交的 `main` 基线 `5cb8d1c66e2f756a68c4c3cb56dfd2b59a980708`。
- 来源目录：`dsh-plugins/opc-agent-teams/src/client/`。
- 文件：`ActivityPanel.module.css`、`AgentProfilesView.module.css`、`AgentTeamsCard.module.css`、`ToolLibraryView.module.css`。
- 恢复方式：通过 `git show <提交>:<路径>` 逐文件读取已提交内容，没有复制其他工作区的未提交修改。
- 原因：桌面维护目录已有 JavaScript，但缺少其导入的 CSS，导致实际客户端入口无法重建。
- 维护边界：这些文件随桌面源码提交并独立构建，运行与构建不再依赖跨仓相对路径。
- 验证：独立审查通过执行旧、新客户端 factory 捕获样式并规范化 CSS 哈希比对，旧规则全部保留；仅新增任务产物及工具库状态相关的 5 条规则。
