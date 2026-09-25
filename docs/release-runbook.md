# Desktop release runbook

## Bundled plugin upgrades

The desktop Runtime keeps each account's installed profile dependencies between
launches. Replacing the contents of a `.tgz` while keeping its package version
and artifact filename unchanged does not reliably update an existing account.

For every bundled plugin code change, increment the plugin package version,
create the correspondingly named `.tgz`, and update all three release
references before packaging:

1. `packages/opc-profile/index.js` profile version and artifact map.
2. `src/main/state/opc-profile-bootstrap.ts` artifact list.
3. `packages/opc-profile/release-manifest.json` version, artifact and SHA-256.

After installing the application, verify the active account profile points at
the new artifact and that its installed `node_modules/<plugin>/package.json`
reports the new version. This forces a safe dependency refresh without removing
the account's sessions, workspace, or credentials.

Do not replace a bundled `.tgz` in place while keeping the package version and
artifact filename. The per-account Profile intentionally retains the old
installed package, so the source tree and newly built App may be correct while
an existing merchant continues to run the broken package. The release gate must
therefore verify a changed plugin has a new semantic version, a new artifact
filename, and matching entries in the Profile artifact map and bootstrap list.

## 插件加载故障门禁

对打包插件执行新增、删除、升级、启用、停用或其他变更前，必须阅读
`docs/plugin-load-incidents.zh.md`。本次变更如果造成或修复 Profile、Bundle、Cordis
Entry、Client Module 或 UI Slot 加载故障，交付前必须补充故障记录。记录应尽可能关联
自动化发布检查，并明确仍需真实 UI 验收的边界；不得写入商户数据或凭据。

## Local Windows UKey signing runner

Windows packaging and signing run as separate jobs. The GitHub-hosted Windows runner builds an unsigned NSIS installer and uploads a short-lived workflow artifact. A local macOS ARM64 runner downloads it, signs the installer with Jsign and the SafeNet UKey, regenerates the blockmap and `latest.yml`, and uploads the signed release set. The GitHub Release job cannot start unless signing succeeds.

Prepare the local runner once:

1. Register it with the `self-hosted`, `macOS`, and `ARM64` labels.
2. Install SafeNet Authentication Client and confirm `/usr/local/lib/libeTPkcs11.dylib` is readable.
3. Connect the UKey before pushing a release tag.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions** and create a repository secret named `DESKTOP_WINDOWS_SIGNING_PIN` containing the UKey PIN. For stronger release controls, use an environment secret and add the matching `environment` to the `sign-windows` job.
5. Restrict release tag creation and workflow changes to trusted maintainers. A self-hosted runner can access any secret injected into its job.

The workflow pins Jsign 7.5 by SHA-256 and uses the SafeNet `ETOKEN` store, SHA-256 signing, and a DigiCert RFC 3161 timestamp. GitHub injects the PIN only into the signing step. The step copies it to a mode-`600` temporary file, removes it from the shell environment, and deletes the file when the step exits. The workflow never prints the PIN or passes it as a command-line argument.

After a tag release succeeds, verify that the Windows installer shows the expected publisher and a valid RFC 3161 timestamp in its Digital Signatures properties. Never reuse a published tag; fix the issue and release a new version.

## Windows 登录页发包续接核查（2026-09-25）

范围：续接任务 `01a0d899-c5c9-7253-895c-cbc32a074b89`，核查 Windows
旧登录页的构建与发布链路。本节为日期限定的核查记录，不代表已公开发布。

- 历史候选分支 `codex/windows-login-parity-release@693e0b8` 的
  [CI 35907483586](https://github.com/13323232dong/opc-dsh-desktop-windows/actions/runs/35907483586)
  在 `npm ci` 缺少两个 `packages/ppt-bundles/` 的本地归档。
- 本次直接查询 Windows 远程 `main` 为 `ae7c4cc0d551d6f73614cb64dd8d803e26f11366`
  （源码版本 `0.7.79`）。主线已经包含注册、账号历史、密码显隐和记住密码；
  两个 PPT 包也已纳入 Git。233 个 `file:` 依赖均存在，228 个带 integrity
  的本地归档哈希全部匹配，独立工作区 `npm ci` 成功。不得再发布落后的
  `0.7.56` 候选来覆盖主线行为。
- 包内登录页检查新增 SHA-256 同源门禁：`dist/win-unpacked/resources/login.html`
  必须逐字节匹配本次检出的 `build/login.html`；保留原有品牌检查。
  仅出现 Evan 产品名不足以证明注册入口和完整登录行为已同步。
  `test/packaged-windows-login.test.ts` 以真实验证脚本子进程验证同源页面通过、
  仍使用 Evan 品牌的旧页面被拒绝、源码缺失时阻断；修改前后已验证先失败再通过。
- 定向发布测试 31 项通过，登录相关基线测试 34 项通过，typecheck 通过。
  完整测试默认并行首轮有 3 处超时；保持原超时阈值，使用
  `npm test -- --no-file-parallelism` 复核后 132 个文件、948 项全部通过。
  独立代码和安全审查未发现本次校验改动新增的问题。

### 尚未解除的发布阻塞

1. `release.yml` 的 Windows smoke 仍读取 `dsh-desktop*` 目录及根级
   `logs/harness.log`，实际应用使用 `opc-dsh-desktop*`，日志位于
   `accounts/v1/<accountKey>/logs/harness.log`。此外，smoke 清空用户数据后没有登录，
   而 `DesktopAuthController` 在无会话时只显示登录页，不会启动 Harness。
   仅修正目录不能消除超时。后续必须验证真实 EXE 登录页，再通过受管验收账号的
   正式登录流程检查 Harness、工作区和会话；不得绕过认证或跳过正式 smoke。
2. 当日 GitHub 查询显示 Windows 仓库没有自托管 Runner，仓库 Actions secret
   列表为空。现有 `sign-windows` 依赖 macOS ARM64 Runner、SafeNet UKey 和
   `DESKTOP_WINDOWS_SIGNING_PIN`。重新发布前必须从 GitHub 和签名环境复核。
3. 本次按项目规则执行 OPC 过渡仓库 `node scripts/opc-release.mjs preflight`
   未通过：共享检出并非 `main`，存在 197 个未提交/未跟踪文件，19 个候选分支
   未合并。没有修改或清理这些文件，也没有替其他任务合并或登记废弃分支。
4. `npm audit` 标记 4 个 high 包，源于 `image-size` 的两项公告：
   [JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) 和
   [ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) 无限循环风险，
   经 `pptxgenjs`、`dsh-ppt`、`dsh-ppt-composer` 传递。本次锁文件与主线一致，
   没有新增或升级依赖；供应链修复和验收需单独完成，不把审计告警视为已解决。

本次没有触发安装包构建、签名、官网部署或覆盖本机正式 App。生产服务器状态、
Windows 真机 UI、官网当前安装包和更新 feed 未在本次核验，均不得宣称通过。
