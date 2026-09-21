# AI 客服微信账号识别 0.1.22

日期：2026-09-21。范围：`@opc/DSH-ai-customer-service`、桌面 Profile 与 macOS 本机正式应用。

## 已验证根因

旧 helper 只遍历微信应用的 `AXChildren` / `AXWindows`。真实微信账号卡片在点击“账户头像”后稳定暴露在 `AXFocusedWindow`，不一定出现在以上树中；因此即使页面已显示“微信号”，账号读取仍错误返回 `WECHAT_ACCOUNT_UNVERIFIED`。

## 修复

- helper 合并 `AXWindows` 与 `AXFocusedWindow`，在账号卡片出现后短轮询读取“微信号”。
- 对无障碍返回值增加 `AXUIElementGetTypeID()` 校验，避免非元素值的强制转换风险。
- 插件升至 `0.1.22`，强制桌面 Profile 替换已有的 `0.1.21` 缓存副本；`0.1.21` 同版本重新封包不能触发替换，这是本次发布中发现的升级链路约束。

## 验证与验收

- 插件：106 项测试、类型检查、构建、`npm audit` 均通过；最终 artifact SHA-256 为 `2c1f0fe700e4c5daa9bc4a1af1a88131f662193fa50a2e57b75fc02a20c2a39a`。
- 桌面：`npm ci`、120 个测试文件 / 903 项测试、类型检查、品牌门禁、发布契约和 macOS arm64 打包校验通过。
- 真实正式应用验收：从 `/Applications/Evan超级管家.app` 冷启动，打开“AI 客服”，点击“加载已学习联系人”；状态由 `WECHAT_ACCOUNT_UNVERIFIED` 变为“微信已连接”。全局监听保持关闭，未发送微信消息。
- macOS 产物为本机未签名验收包：未找到有效 Developer ID 证书；未部署服务器、未发布远程自动更新。

## 已知风险

`npm audit` 仍报告 4 个既有 high 漏洞，来自 `dsh-ppt` → `pptxgenjs` → `image-size` 的解析器依赖；本次没有新增该依赖，且当前无可用修复版本。发布后续需单独处置该供应链问题。
