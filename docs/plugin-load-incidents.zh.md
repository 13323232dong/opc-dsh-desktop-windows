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

## 2026-09-18：AI 客服客户端标签未出现

| 项目 | 记录 |
| --- | --- |
| 状态 | 代码与插件包已修复；安装后正式 App 界面验收待执行 |
| 受影响范围 | `@opc/DSH-ai-customer-service` `0.1.0` 的 Client Module；桌面 DSH 对话页顶层标签 |
| 用户症状 | 工具已注册且 Agent 可调用状态检查，但对话同级位置没有“AI 客服”标签。 |
| 稳定复现证据 | 正式 DSH 真实对话中可看到工具轨迹，但顶层只显示其他已有标签；解包 `0.1.0` 可见 `conversation.view` 的 `label` 是字符串。 |
| 已验证根因 | 当前 DSH Slot 契约要求 `label` 为可调用函数；插件传入字符串，导致 Client Module 不能正常注册该标签。 |
| 修复 | 插件 `0.1.1` 改为 `label: () => 'AI 客服'`，同时增加 macOS 辅助功能授权工具和看板入口；桌面 Profile、bootstrap 与 release manifest 统一锁定 `0.1.1`。 |
| 预防门禁 | `test/plugins/wechat-customer-service.test.ts` 直接解包正式 tgz，检查函数式标签、授权工具和看板操作；另校验包哈希与 release manifest 一致。 |
| 验证 | 插件 36 项测试通过；桌面相关 23 项测试与 TypeScript 类型检查通过。正式 App 冷启动界面验收在本次发布后补记。 |
| 关联提交 | 插件 `25fb44ae09b9eaf7f826ab1783784c97d6df0614`；桌面集成 `5ae1b44` |
| 遗留风险 | 静态包检查不能替代安装后 Slot 渲染和 macOS 权限交互；未完成真实 UI 验收前不得标记发布成功。 |

## 2026-09-18：桌面内置插件被误当社区插件迁移

| 项目 | 记录 |
| --- | --- |
| 状态 | 代码已修复；正式 App Profile 冷启动验收待执行 |
| 受影响范围 | 已有账户且 Profile 依赖指向 App 内 `Resources/opc-profile/plugins/*.tgz` 的 macOS 桌面端 |
| 用户症状 | 启动时先长时间停留，写入 `.generations-deferred.json` 后回退使用旧 Profile；等待后虽可进入 DSH，但发布门禁视为失败。 |
| 稳定复现证据 | 实机延迟标记记录 `@opc/dsh-brand failed peer validation`，且多个 peer 的真实路径落在 `/Applications/Evan-AI管家.app/Contents/Resources/...`；单元测试可复现迁移器尝试安装 `@opc/dsh-brand`。 |
| 已验证根因 | 迁移器把除 DSH 核心包外的所有 Profile dependency/bundle 都当作社区插件，没有区分桌面 Profile 管理的内置 tgz。生成器随后按社区插件闭包校验 peer，正确地拒绝了位于 App 资源树的依赖，但该路径本不应进入社区插件迁移。 |
| 修复 | 启动器将当前 App 的绝对插件目录和审核过的桌面插件名单同时传给迁移器；只有名称在名单中且 `file:` 源的直接父目录精确等于当前 App 资源目录时才留在共享树。其他外部路径仍走原有安全校验。无社区插件时清理过期延迟标记。 |
| 预防门禁 | `test/generation-migration.test.ts` 验证内置插件不进入 generation、真实社区插件仍迁移、内置 dependency 和 bundle 保留，以及无迁移项时清除过期延迟标记。 |
| 验证 | 相关 23 项测试与 TypeScript 类型检查通过；未放宽 `verifyGenerationPeers`。安装后正式 App 尚需确认不再产生新的延迟标记。 |
| 关联提交 | 桌面集成 `5ae1b44` |
| 遗留风险 | 已有 Profile 的过期标记由新启动流清理；不手工删除用户 Profile、插件数据或凭据。Windows 路径仍由精确传入的当前资源目录约束，但本次真实验收范围仅为 macOS。 |

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
