# 上游基线与 OPC 改造边界

本仓库 fork 自 `dataelement/dsh-desktop`，上游基线 commit 为 `d58a3def924e387a9d7faea41bd83b3cd908d0ea`。上游使用 MIT License，本 fork 保留根目录 `LICENSE`、版权声明和上游 remote。

## 保留的上游能力

- Electron Main 与受沙箱保护的 DSH Web Renderer 分离。
- 随机 `127.0.0.1` Runtime、launch token、启动稳定窗口与超时诊断。
- DSH Profile 一致性检查、插件恢复和非破坏性 Safe Mode。
- GPU fallback、单实例锁、窗口恢复和本地目录选择。
- Desktop Runtime 与 Web Renderer 的 Node 权限隔离。

## OPC 替换边界

- 应用标识：生产版 `cc.ohmycode.opc.desktop`，开发版 `cc.ohmycode.opc.desktop.dev`。
- 用户数据根：`opc-dsh-desktop` 与 `opc-dsh-desktop-dev`，不复用上游目录。
- 发行文件命名：`opc-desktop-*`。
- 上游更新服务已关闭。签名的 OPC 更新源在内部预览验收完成后单独接入。
- DataElement 品牌、插件市场、Kimi PPT 和原手机隧道能力不会自动带入 OPC 发行 Profile。

## 升级规则

升级上游 DSH 或 DataElement 前，必须先执行：

```bash
npm test -- --run test/runtime.test.ts test/safe-mode.test.ts test/plugin-recovery.test.ts
npm run typecheck
```

再检查本 fork 的账号隔离、Broker、OPC Profile 和插件兼容矩阵。不得通过替换 `node_modules`、复制旧 `lib` 或删除用户账号目录来解决升级问题。
