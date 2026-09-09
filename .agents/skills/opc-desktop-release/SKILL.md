---
name: opc-desktop-release
description: Build, test, publish, verify, and roll back OPC DSH desktop installers for macOS and Windows using repository release gates. Use when packaging releases, triggering Windows CI, uploading installers, updating download pages, diagnosing CI failures, or validating auto-update artifacts.
---

# OPC Desktop Release

将本地源码作为唯一真源，严格从 `main` 发布。发布前读取 `/Users/mac/OPC智能体团队/.codex/AGENTS.md` 和 `.codex/release-policy.json`；确认远程同步、工作树干净、源码已合入 `main`，执行 `node scripts/opc-release.mjs preflight`，失败立即停止。

统一构建与验证：

```bash
node scripts/opc-release.mjs build
node scripts/opc-release.mjs verify
```

本地至少运行 `npm ci`、`npm test`、`npm run typecheck`、`npm run build`。不把 `.env`、密钥、运行数据、`node_modules` 或开发机绝对路径放入发布包。

Windows 不在 macOS 本机构建，使用 GitHub Actions：

```bash
gh workflow run "Release desktop installers" --repo 13323232dong/opc-dsh-desktop-windows --ref main -f target=windows
gh run list --repo 13323232dong/opc-dsh-desktop-windows --workflow "Release desktop installers" --branch main --limit 3
```

只有 `npm ci`、全量测试、typecheck、electron-builder 和 artifact 上传全部成功，才报告 Windows 构建成功。手动开发构建只产生 Actions artifact，不等于官网发布或自动更新上线。

## 故障防护

- `patch-package` 失败：以仓库实际 `file:` vendor tgz 解包的 pristine 文件为基线，重生成标准 unified diff，并运行 `npx patch-package --error-on-fail`。
- Windows 测试失败：路径使用 `node:path`；不要断言 Unix `/`；权限位测试在 Windows 跳过；媒体组件按平台能力断言。
- smoke 找不到 exe：从 electron-builder 日志读取真实 `productName`，同步 smoke 路径和 `WorkingDirectory`。
- artifact 上传失败：使用构建日志中的真实文件名，核对 `dist/` 或 `dist-dev/`，不要沿用旧名称。
- Hosted runner 无交互桌面：开发 artifact 可跳过交互 smoke；正式 tag/prerelease 必须保留 smoke 门禁，跳过不得写成产品验收通过。
- 每次失败只修复最小范围，查看完整 job 日志后重新提交、推送、触发全流程。

## 发布与验收

正式发布必须从 `main` 创建版本 tag/prerelease tag，并通过签名、Release 资产和更新 feed 验证。部署使用 `node scripts/opc-release.mjs deploy` 后 `verify`，线上只通过 `/opt/opc-platform/current` 原子切换，失败按 rollback 恢复。

下载 Actions artifact：

```bash
gh api repos/13323232dong/opc-dsh-desktop-windows/actions/runs/<run-id>/artifacts
gh run download <run-id> --repo 13323232dong/opc-dsh-desktop-windows -n windows-x64-dev -D artifacts/windows-<run-id>
```

下载后检查安装包、`latest.yml`、blockmap、大小和 SHA-256。Artifact 需要 GitHub 登录，不能当官网公开链接。官网发布还要确认 Release 资产、下载页 URL、`latest.yml` 版本和自动更新端点。

使用最终安装包验收登录/退出、账号缓存、工作区、输入发送、品牌 Logo、插件库、Agent Teams、我的 Agent、轨迹、交付物、附件和自动更新。记录 commit、tag、CI run、产物名、哈希、门禁结果、部署时间、验收和回滚点；不得记录密钥。

## 发布成功后的固化

只有以下条件全部满足，才能把发布标记为成功：

1. 发布源码 commit 已合入 `main`，本地 `main` 与远程 `main` 一致。
2. `preflight`、构建、测试、签名和发布 workflow 均为成功。
3. GitHub Release 同时包含 macOS DMG、Windows 安装包及对应 `latest*.yml`、blockmap。
4. 官网下载页实际返回新版本链接，macOS 和 Windows 下载状态码正常。
5. 已安装旧版本能够检查到新版本；完成下载、安装、重启后，账号、会话和租户数据仍存在。
6. 至少完成一次 macOS 和 Windows 冷启动验收；登录、插件加载、工具库、Agent Teams 和退出功能均通过。

成功后立即生成发布记录，包含：版本号、tag、commit、GitHub Release URL、官网 URL、各平台文件名与 SHA-256、安装验证时间、自动更新验证结果和回滚目标。将记录写入项目既有发布记录目录；不要只写在聊天回复中。

如果只有 CI artifact 成功，状态必须写为“构建成功，未公开发布”；如果 GitHub Release 成功但官网或自动更新未验证，状态必须写为“Release 已发布，线上验收未完成”。任何一项回归失败都不得标记成功，应指向上一 Release 并记录原因。
