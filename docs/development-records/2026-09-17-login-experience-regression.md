# 桌面登录页回退与 Windows 同步核查

## 2026-09-17：登录体验回退

旧发布的 `build/login.html` 退回为精简表单，丢失账号历史、密码显隐、记住密码、商户注册及验证码倒计时。问题来自合并旧认证实现造成的源码回退，不是 macOS 缓存。

恢复完整登录表单并沿用平台凭据架构：账号标签与密码分开存储，记住的密码经 Electron safeStorage 加密，IPC 限制为本地主框架登录页。当前正式品牌遵循 `build/release-brand-contract.json`，为 `Evan超级管家`。

## 2026-09-25：Windows 构建基线与导航保护

来源任务：`01a0d899-c5c9-7253-895c-cbc32a074b89` 的续接；基准 `ae7c4cc0d551d6f73614cb64dd8d803e26f11366`。

已验证事实：

- 旧 Windows 分支 `693e0b8` 的 CI `35907483586` 在 `npm ci` 因两个 `packages/ppt-bundles/*.tgz` 缺失失败。主线已包含这些依赖、完整登录页和当前安装包名。基准主线 Windows CI `36137847971` 的依赖安装、全量测试、类型检查及安装包构建全部通过。
- 不应把旧分支的版本号和完整文件集重新覆盖主线。旧分支独有的有效保护是切回登录页时递增导航版本并停止旧加载；其他品牌与注册实现已在主线。
- 进一步发现 `openHarness()` 等待 Cookie 清理后，未在 `loadURL()` 前检查导航版本；即使登录页已打开，旧调用仍可抢回页面。
- 回归测试提取并执行真实 `openHarness()` 与 `showLoginPage()`，延迟 Cookie 清理完成。修复前结果为 `harness`，补充导航失效和加载前检查后应保持 `login`。该测试验证调用顺序，不代表完成 Windows 真机界面验收。

门禁：`test/accounts/desktop-login-entry.test.ts` 同时检查完整登录控件、受保护 IPC 和过期导航；`test/runtime.test.ts` 检查 `ERR_ABORTED (-3)` 不触发恢复。构建须来自干净且同步的主线，发布前仍须验收实际 Windows 登录、注册及错误状态。

未完成项：最终修复版本的 Windows 安装、登录/注册真实 UI 与重启验收；不得据此记录官网已更新。
