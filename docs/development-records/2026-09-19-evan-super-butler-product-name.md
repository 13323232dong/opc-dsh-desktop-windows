# Evan超级管家产品名统一

## 目标和背景

用户确认桌面端正式产品名应为“Evan超级管家”，禁止再把构建产物或安装后应用命名为“伟东 OPC”。

## 修改范围

- 将 Electron 正式 `productName` 和 author 统一为“Evan超级管家”。
- 将 macOS、Windows 和开发验收产物文件名统一为 `Evan超级管家-*`。
- 将开发验收应用名统一为“Evan超级管家 Dev”。
- 更新登录页标题和标题文案。
- 更新发布、应用边界、登录入口和 Profile 迁移测试。

## 用户可见变化

macOS 应用名、登录窗口和开发验收包将统一显示“Evan超级管家”，不再使用“伟东 OPC”或“Evan-AI管家”作为桌面产品名。

## 配置与兼容性

本次不修改 App ID、用户数据目录、账号、会话、Profile 或钥匙串边界。应用路径变化后，桌面 Profile bootstrap 会在启动时重写内置插件的 `file:` 路径。

## 验证

- 定向测试：4 个测试文件、39 项通过。
- 全量测试：119 个测试文件、900 项通过。
- TypeScript 类型检查通过。
- Evan 品牌完整性校验通过。

## 已知限制

本机没有有效 Developer ID 证书，macOS 产物为未签名本机验收包。

## 提交信息

- 分支：`codex/restore-second-brain-package`
- 提交标题：`fix: enforce Evan超级管家 product name`
- 提交 SHA：以本文档所在提交的 Git 记录为准。
- 日期：2026-09-19
