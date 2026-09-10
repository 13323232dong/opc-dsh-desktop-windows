# Desktop Auth & Updater Validation — 2026-09-11

## 范围 / Scope

本记录覆盖 `codex/feature-desktop-auth-updater` 中的桌面登录、退出、账号凭据缓存、Runtime 切换、更新检查、版本选择、跳过版本和安装重启流程。

This record covers desktop sign-in, sign-out, credential caching, account Runtime switching, update checks, version selection, skipped releases, and restart installation on `codex/feature-desktop-auth-updater`.

## 验证 / Validation

命令：

```text
npm test -- --run test/accounts/desktop-auth-controller.test.ts test/accounts/credential-store.test.ts test/update.test.ts test/update-skip.test.ts test/version-catalog.test.ts
```

结果：5 个测试文件、29 项测试通过。

Result: 5 test files and 29 tests passed.

覆盖要点：

- 未验证身份时不会启动账号 Runtime；
- 登录身份与凭据不一致时拒绝激活；
- 有效凭据先保存再启动匹配账号 Runtime；
- 退出时停止 Runtime、删除账号凭据并调用云端退出；
- 更新检查、下载、安装、跳过版本和历史版本选择均保持现有行为；
- 版本目录解析和错误响应均有测试覆盖。

## 发布边界 / Release Boundary

本分支只属于桌面端仓库，不修改 OPC 平台仓库或平台 `main`。正式发布前仍需在桌面端集成分支完成合并、干净工作树检查、签名和安装包验收。

This branch belongs to the desktop repository only. It does not modify the OPC platform repository or platform `main`. Before production release, merge into the desktop integration branch and complete clean-tree, signing, and installer verification gates.
