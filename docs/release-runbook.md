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
