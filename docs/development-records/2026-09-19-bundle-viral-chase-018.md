# 桌面端内置追爆插件 0.1.8

日期：2026-09-19

## 目的

将 `@opc/dsh-viral-chase@0.1.8` 内置到桌面 Profile，使主人公视频上传、媒体预览、本人授权和费用确认统一通过桌面登录 Broker，不再要求浏览器持有平台密钥或展示本机路径。

## 变更

- Profile、启动引导和 Release manifest 固定到 `0.1.8`。
- 内置包 SHA-256：`95e1ab69ec5513eb465afac8e74751e938cf2900ba0ab4110fe4f128f8721572`。
- 旧 Profile 中的追爆插件会按桌面托管插件规则升级，用户管理的其他插件和会话数据不受影响。
- 源码同步到 `/Users/mac/dsh-community-plugins/dsh-viral-chase`，供项目插件集合维护。

## 验证范围

- Profile manifest 与启动 artifact map 一致性测试。
- 旧版追爆 generation 升级测试。
- 桌面全量测试、类型检查、品牌检查、构建与 macOS ARM64 打包。
- 最终以正式桌面应用中的主人公上传、授权、列表和媒体预览为真实验收标准。

## 边界

插件内置成功仅证明桌面具备媒体通道；MiniMax、OSS、Linux 媒体检查和真实生产仍必须通过线上 Release 与真实 DSH 流程分别验证。
