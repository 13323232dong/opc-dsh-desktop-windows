# 桌面端插件加载故障台账

> 用途：记录会阻断或降级 DSH Desktop Profile、Cordis Entry、Client Module 或 UI Slot 加载的真实故障，并把每次修复转化为可执行的发布门禁。
>
> 记录边界：只写已验证的技术事实。商户身份、会话内容、密码、Token、Cookie、HMAC 密钥及供应商原始鉴权错误不得进入本台账。

## 登记规则

出现下列任一情况必须新增记录或补充既有记录：

1. Profile 无法启动、被回退到恢复页或 Safe Mode。
2. 出现 `Failed to load plugins`、Bundle/Entry/Client Module/Slot 加载错误。
3. 新包已发布但既有账户仍加载旧插件，或 Profile artifact map 与实际包不一致。
4. 插件升级、启停、安装或卸载造成启动、渲染或关键入口不可用。

每条记录必须包含：发现日期、受影响版本和范围、症状、复现条件、已验证根因、修复、预防门禁、验证证据、遗留风险和关联提交。根因未确认时只能标记为“待验证”。

## 2026-09-17：客户端工作台 Bundle 缺失导致登录后无法启动

| 项目 | 记录 |
| --- | --- |
| 状态 | 已修复并已加入发布门禁 |
| 受影响范围 | 含 `@opc/dsh-assets-workbench` 的桌面 Profile；登录后 Harness 解析 Profile Bundle 时失败 |
| 用户症状 | 进入账户后无法进入正常工作台，出现插件不兼容/恢复路径；业务入口无法继续验证 |
| 稳定复现证据 | Harness 报 `profile bundle "@opc/dsh-assets-workbench" declares no dsh.bundle in its package.json` |
| 已验证根因 | 该包是 client-only 插件，但其发布 tarball 的 `package.json` 未声明 `dsh.bundle.patch`，也没有对应 patch 文件。源码 TypeScript 构建成功不足以验证 DSH Profile 可组合。 |
| 修复 | 增加无副作用的 `cordis.patch.yml`，在 tarball 声明 `dsh.bundle.patch`；插件版本从 `0.1.0` 升至 `0.1.1`，并同步 Profile artifact map、Desktop bootstrap artifact map 与 release manifest。 |
| 预防门禁 | `test/plugins/release-manifest.test.ts` 遍历 Profile 插件 tarball，校验包名、版本、`dsh.bundle.patch`、patch 文件存在性，以及 Profile artifact map 与 bootstrap artifact map 一致。任何失败均阻断打包和安装。 |
| 验证 | `npm test`（856 passed）、`npm run typecheck`、`npm run package:mac:arm64` 通过；正式 App 冷启动后不再进入插件不兼容恢复页。 |
| 关联提交 | `0f73385 fix: validate desktop profile plugin bundles`；`f15cac8 fix: refresh bundled workbench plugin versions` |
| 遗留风险 | Bundle 门禁证明包可被 Profile 解析，不替代真实冷启动、Client Module 图和 UI Slot 验收。每次桌面插件变更仍需在安装后的正式 App 真实操作验证。 |

## 复盘模板

```markdown
## YYYY-MM-DD：简短故障标题

| 项目 | 记录 |
| --- | --- |
| 状态 | 调查中 / 已修复 / 已回滚 |
| 受影响范围 | 版本、插件、平台和用户可见范围 |
| 用户症状 | 不含敏感数据的可观察现象 |
| 稳定复现证据 | 版本、最小步骤和安全日志摘要 |
| 已验证根因 | 明确区分已验证原因与待验证假设 |
| 修复 | 代码、配置或发布物变更 |
| 预防门禁 | 新增或强化的自动化检查 |
| 验证 | 测试、冷启动和真实 UI 验收 |
| 关联提交 | commit SHA 与标题 |
| 遗留风险 | 尚未覆盖的边界和后续动作 |
```
