# 微信被动扫描修复：本机安装记录

日期：2026-09-20。来源：用户要求合并 main 后打包覆盖桌面应用。

## 构建来源与边界

- 桌面 main：`a2af8b43c6ab104716984579b3b63dc2ade6427b`，构建时干净且与 `fork/main` 一致。
- 插件：`@opc/DSH-ai-customer-service` `0.1.15`；源码提交 `3373696` 已合入插件 main。
- 使用桌面仓库的完整测试、类型检查、品牌契约及 `package:mac:arm64` 门禁。此前对 Web/API 过渡仓库运行的 preflight 不适用于本机桌面安装；不通过清理其无关改动解决桌面打包。
- 无有效 Developer ID 证书，未进行公开签名发布、服务器部署或远程自动更新。

## 自动化与安装

- `npm ci` 完成。首轮并行测试 901/902：上传测试使用 30 毫秒 idle deadline，出现 socket 超时；不改源码，降低并发重跑后完整 902/902 通过。类型检查、品牌和打包校验通过。
- 源码、构建包与安装后 AI 客服 artifact 哈希一致：`e387f55d93fc0188f3b3a86e93e18767cd6587e682936276ad175810ed56ca91`。
- 所有内置插件文件与 main 文件一致；发现既存 `@opc/dsh-realtime-voice` release-manifest 哈希陈旧，源码与包内实际文件一致，本轮未改变语音插件。这项清单问题仍待单独处理。
- 已停止旧应用并覆盖 `/Applications/Evan超级管家.app`；未删除账号、会话或插件状态。已刷新 LaunchServices 和 Dock。
- 安装后登录页、图标资源与源码 SHA-256 一致。实际启动进程来自 `/Applications/Evan超级管家.app/Contents/MacOS/Evan超级管家`。
- 真实界面成功恢复已有会话，AI 客服标签加载；状态接口 HTTP 200，`WECHAT_ACCOUNT_UNVERIFIED`，全局监听关闭。此状态表示被动检查不再自动打开账号弹窗，显式操作时才确认账号。
- 本轮不启用监听、不发送消息；完整未读生成草稿链路未重新验收。登录页为资源校验，未退出已有账号进行登录操作。
- 冷重启通过：新进程再次进入对话界面，Evan 品牌、AI 客服及 Codex 任务看板标签可见；界面截图已在本任务中展示。Finder/Dock 的单独截图未记录。

## 产物与 SHA-256

- App：`/Applications/Evan超级管家.app`；主可执行文件 SHA-256：`1af684f056a8eb13e49fbd677072e437316086b076e3b9b92de3ddb343edc5b1`（不代表整个目录哈希）。
- DMG：`/Users/mac/opc-dsh-desktop-release-main/dist/Evan超级管家-mac-arm64.dmg`；`8c9c42e3b7537b016e684b05233d3347e239d69d6e295a84b664753e59d892f0`。
- ZIP：`/Users/mac/opc-dsh-desktop-release-main/dist/Evan超级管家-mac-arm64.zip`；`7305dae8370eb9e313622cda532db9575cded22d249b4b5204240f856beb3d8f`。
