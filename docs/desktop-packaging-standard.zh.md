# Evan超级管家桌面打包标准

更新日期：2026-09-19

## 本次重复问题

1. 产品名曾在 `伟东 OPC`、`Evan-AI管家`、`Evan超级管家` 之间漂移。
2. App 名称修正后，图标仍可能来自旧 Worktree、旧 `.icns/.ico`、旧 `dist` 或系统缓存。
3. 原 `verify:brand` 只验证“源文件与复制后的文件一致”，不能判断源文件本身是否为用户已批准版本。
4. `build/app-icon.png` 更新后，正式构建没有强制重新生成 `.icns/.ico`，可能出现 UI Logo、App 图标和安装包图标不同步。
5. 功能插件已更新，但桌面包仍可能引用旧 `.tgz` 或旧 Profile，导致“源码有功能、安装包没有功能”。
6. 从功能分支或临时 Worktree 直接打包，会把未合并功能、旧品牌资源和不同插件版本混入同一产物。
7. 只看 Dock 图标会被 macOS 缓存误导；只看源码或构建成功也无法证明最终安装包正确。

## 唯一正式基线

- 产品名：`Evan超级管家`
- App：`Evan超级管家.app`
- macOS ARM64 DMG：`Evan超级管家-mac-arm64.dmg`
- macOS ARM64 ZIP：`Evan超级管家-mac-arm64.zip`
- 安装路径：`/Applications/Evan超级管家.app`
- 品牌契约：`build/release-brand-contract.json`
- 正式构建来源：干净、同步、测试通过的 `main`

历史名称只允许用于迁移检测，禁止出现在新产物名称、登录页和用户可见品牌位置。

## 不可绕过的流水线

1. 合并门禁：所有计划交付的功能分支先进入 `main`；开发中或未验收功能不得混入。
2. 清洁门禁：记录 commit，确认 `main` 与远程一致、工作树干净，不从临时 Worktree 打正式包。
3. 品牌门禁：执行 `verify:release-contract`，校验名称、路径、产物模板和已批准图标哈希。
4. 图标生成：每次从 `build/app-icon.png` 重新生成 `.icns/.ico`，不复用历史衍生文件。
5. 插件门禁：核对 Profile 声明、实际 `.tgz`、插件版本和哈希，缺失或版本漂移立即停止。
6. 测试门禁：全量测试、typecheck、build 和目标平台打包必须全部成功。
7. 包内门禁：直接检查 `.app/Contents/Resources`，验证图标、登录页、Profile、插件、品牌静态资源和关键 bundle。
8. 产物门禁：App、DMG、ZIP 名称必须精确匹配契约，并记录 SHA-256。
9. 安装门禁：停止旧进程，只覆盖唯一正式路径，不删除账号、会话、工作区或钥匙串数据。
10. 缓存刷新：重新注册 LaunchServices 并刷新 Dock，再启动正式路径。
11. 真实验收：检查 Finder、Dock、登录页、Harness 侧边栏、插件入口和本次功能；重启后复验。
12. 交付记录：记录 commit、版本、产物路径、哈希、插件清单、验收截图、签名状态和回滚目标。

任一步失败，状态只能是“构建失败”或“验收未完成”，不得覆盖为“已发布”。

## 品牌图标变更规则

图标不能由打包人员临时判断。变更流程固定为：

1. 用户确认最终图标预览。
2. 替换 `build/app-icon.png` 和对应 Evan Logo 源文件。
3. 更新 `build/release-brand-contract.json` 中的 SHA-256。
4. 重新生成 `.icns/.ico`。
5. 运行品牌契约、单元测试和包内校验。
6. 安装后检查四个用户可见位置并保存证据。

没有用户确认时，品牌契约哈希不得改变。

## 当前已修复的门禁缺口

- 新增版本化品牌契约和已批准图标哈希。
- `npm run build` 会先重新生成平台图标，再验证品牌契约。
- macOS 正式打包完成后自动验证 App、DMG、ZIP、包内 PNG、实际 App `icon.icns` 和登录页名称。
- 新增单元测试，防止旧产品名重新进入 Electron Builder 配置。

本次实证：安装包的 `Resources/icon.png` 已是橙色 E，但 `Resources/icon.icns` 仍是旧鲸鱼；Finder 与 Dock 使用后者，因此用户看到旧图标。新门禁会直接拒绝这种“两套图标同时存在”的包。

仍需持续维护的部分：插件版本清单和真实 UI 截图属于每次发布的动态证据，不能用一次固定哈希永久替代。
