# 八卡追爆桌面验收包

日期：2026-09-19。状态：完成八卡真实桌面展示验收，未发布，未完成生产链路验收。

嵌入追爆插件 0.1.12，更新 Profile 固定版本及 bootstrap 测试。类型检查、Profile 定向测试 12/12 通过，生成未签名开发 DMG、ZIP 和 App。

并行任务正在占用默认 Dev 应用，故本分支的开发打包配置使用独立 bundle ID 和“Evan超级管家 八卡验收”名称。仅开发模式支持 OPC_DESKTOP_DEV_INSTANCE，以 1–48 位小写字母、数字、连字符限定实例目录后缀；正式数据路径不变。

当前开发包不代表正式安装或更新源发布，没有覆盖 `/Applications/Evan超级管家.app`。生产 Run 未启动，未调用付费生成。验收完成后补充截图与操作记录。

实际启动 `/tmp/evan-eight.app`，使用独立 `viral-eight` 开发实例；线上读取已有本人视频与授权状态成功。原 worktree 启动路径过长导致 pnpm 缓存文件名 ENAMETOOLONG，复制同一构建到短路径后初始化成功；这是验收绕行，尚未修复安装器的长路径兼容性。

截图 `/tmp/viral-eight-desktop-top.png`、`/tmp/viral-eight-desktop-lower.png`。已验证八卡、两列展示与未接入按钮禁用；四列、编辑成功态、失败恢复和付费流程仍待验收。正式应用未覆盖。
