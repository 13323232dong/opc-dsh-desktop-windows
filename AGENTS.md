# OPC 桌面仓库规则

## 单一正式包

- 桌面产品、App 和安装包的唯一正式名称统一为 `Evan超级管家`。后续不得再使用 `伟东 OPC`、`伟东 OPC Dev` 或 `Evan-AI管家` 作为新构建、安装、更新源或发布文件名。
- 桌面功能完成后只构建一次正式 App、DMG 和 ZIP，不再常规生成、安装或启动 Dev App。
- 正式包只能从干净、已同步且测试通过的 `main` 构建；功能分支和临时 Worktree 仅用于开发、测试和审查，不得直接打包。
- 固定正式产物为 `dist/mac-arm64/Evan超级管家.app`、`dist/Evan超级管家-mac-arm64.dmg` 和 `dist/Evan超级管家-mac-arm64.zip`；同平台后续构建直接覆盖这些路径，不创建带日期副本。
- 安装前停止所有 Evan/OPC 正式版和 Dev 版进程，直接覆盖 `/Applications/Evan超级管家.app`；不得创建备份 App 或第二个用户可见入口。
- 安装后不得从 `dist/`、`dist-dev/` 或临时目录启动，只从 `/Applications/Evan超级管家.app` 启动和验收。
- 不删除账号数据、工作区、会话、插件运行数据或钥匙串凭据。只清理明确识别的旧 App 副本、Dev App 和构建产物。

## 发布门禁

- 构建前记录 `main` commit，确认本地 `main` 与 `fork/main` 一致且工作树干净。
- 运行完整测试、typecheck、build 和正式平台打包；任一步失败都不得覆盖已安装 App。
- 包内必须核验登录页、Evan 品牌与 Logo、内测声明、Profile、所有启用插件和 Codex 任务看板。
- 对源码、正式构建产物和安装后 App 的关键资源比较 SHA-256；不一致时停止交付。
- 覆盖后使用真实界面验收并重启一次。Profile generation/migration 失败并恢复旧 Profile 时视为发布失败。
- 最终报告 commit、App/DMG/ZIP 的绝对路径与哈希、实际进程路径、界面验收结果和未解决风险。

## 插件加载故障复盘

- 任何插件导致或疑似导致的 Profile 启动失败、`Failed to load plugins`、Client Module 加载失败、Bundle 元数据不匹配、升级后仍加载旧插件，均必须在修复前后更新 `docs/plugin-load-incidents.zh.md`；不能只在对话或临时日志中说明。
- 每条记录至少包含：发现日期、受影响版本和范围、可复现症状、已验证根因、修复提交、阻断发布的门禁、验证证据与遗留风险。未知项必须明确标为“待验证”，不得把推测写成根因。
- 每个新插件、插件版本升级和 Profile artifact 修改，都必须先检查已有同类事故；若门禁无法覆盖本次故障形态，必须补充自动化校验和该台账记录后才能交付。
- 台账、测试输出和提交信息不得写入商户身份、会话内容、密码、Token、API Key、Cookie、HMAC 密钥或供应商原始鉴权错误。
