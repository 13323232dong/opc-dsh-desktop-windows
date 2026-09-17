# OPC 桌面仓库规则

## 单一正式包

- 桌面功能完成后只构建一次正式 App、DMG 和 ZIP，不再常规生成、安装或启动 Dev App。
- 正式包只能从干净、已同步且测试通过的 `main` 构建；功能分支和临时 Worktree 仅用于开发、测试和审查，不得直接打包。
- 固定正式产物为 `dist/mac-arm64/Evan-AI管家.app`、`dist/opc-desktop-mac-arm64.dmg` 和 `dist/opc-desktop-mac-arm64.zip`；同平台后续构建直接覆盖这些路径，不创建带日期副本。
- 安装前停止所有 Evan/OPC 正式版和 Dev 版进程，直接覆盖 `/Applications/Evan-AI管家.app`；不得创建备份 App 或第二个用户可见入口。
- 安装后不得从 `dist/`、`dist-dev/` 或临时目录启动，只从 `/Applications/Evan-AI管家.app` 启动和验收。
- 不删除账号数据、工作区、会话、插件运行数据或钥匙串凭据。只清理明确识别的旧 App 副本、Dev App 和构建产物。

## 发布门禁

- 构建前记录 `main` commit，确认本地 `main` 与 `fork/main` 一致且工作树干净。
- 运行完整测试、typecheck、build 和正式平台打包；任一步失败都不得覆盖已安装 App。
- 包内必须核验登录页、Evan 品牌与 Logo、内测声明、Profile、所有启用插件和 Codex 任务看板。
- 对源码、正式构建产物和安装后 App 的关键资源比较 SHA-256；不一致时停止交付。
- 覆盖后使用真实界面验收并重启一次。Profile generation/migration 失败并恢复旧 Profile 时视为发布失败。
- 最终报告 commit、App/DMG/ZIP 的绝对路径与哈希、实际进程路径、界面验收结果和未解决风险。
