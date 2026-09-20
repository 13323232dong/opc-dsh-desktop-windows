# 桌面端插件加载故障台账

> 用途：记录会阻断或降级 DSH Desktop Profile、Cordis Entry、Client Module 或 UI Slot 加载的真实故障，并把每次修复转化为可执行的发布门禁。
>
> 记录边界：只写已验证的技术事实。商户身份、会话内容、密码、Token、Cookie、HMAC 密钥及供应商原始鉴权错误不得进入本台账。

## 登记规则

### 2026-09-20：访谈完成后入口消失与语音模式混用

- 已验证根因：客户端对 completed/skipped 返回 null；语音复用仅比较 sessionId，没有比较 mode，服务端原先由会话 ID 推断访谈。
- 修复：0.1.6 常驻访谈入口，完成后显示“完善资料”；HTTP 与 WebSocket 显式携带 work/interview，同会话不同模式重新连接。普通模式不读取访谈问题、不写答案；访谈模式校验租户会话。
- 边界：已完成或跳过后的补充交流明确告知不会自动改写已保存档案，不重置原资料。尚未接入补充档案自动保存。
- 门禁：实际 VoiceRuntime 同 ID 切换模式回归、服务端模式隔离与补充访谈提示回归、包内常驻入口检查。真实桌面结果待本次打包后补充。

### 2026-09-20：访谈与工作语音切换的启动竞态

- 范围：实时语音插件 0.1.4 及更早版本的同窗口入口切换。
- 已验证：旧 session/open 晚返回会在退出或切换后启动旧连接；同一入口再次点击会关掉已缩小的语音。运行实际 VoiceRuntime 的异步测试先失败后通过。
- 修复：0.1.5 用 generation 隔离旧回调，序列化 session/open，退出时取消且请求设 8 秒超时；迟到的麦克风轨道立即释放。同入口展开当前 Overlay，不重连；标题显示“访谈中/工作对话中”。
- 门禁：4 项异步行为回归（过期请求、退出、挂起请求、缩小恢复），插件 122 项测试及桌面包内版本、哈希、模式标签检查。此记录不宣称跨窗口或多设备全局互斥。
- 交付证据：桌面提交 90e8e0b 已合入并推送 main；main 全量 120 文件 / 903 测试、typecheck、正式包品牌校验通过。安装包内语音 artifact SHA-256 为 f088623dc3dbeabc2c7a2db108a0e6abcd1383f6b57ff9344a7a310228fc354d。
- 真实桌面验收：访谈自动恢复到“访谈中 / 聆听中”，收起后再次点击访谈入口保持聆听；工作入口切换为“工作对话中”，但两次连接失败，未宣称该路径通过。随后有并行构建及应用重启，剩余退出/重启验收中断；不得覆盖并行发布物或将此结果记为全通过。

### 2026-09-20：语音访谈界面可打开但降级为普通助手

- 范围：实时语音插件 0.1.3；本次用户反馈的访谈入口。
- 已验证根因：插件 GET `/api/v1/agent/onboarding/interview` 不在桌面 Broker 白名单，也不是平台状态接口。正确接口为 `/api/v1/agent/onboarding/status`，响应中的访谈位于 `interview` 字段；读取失败后原实现以空上下文继续普通语音。
- 修复：0.1.4 使用正确状态路由并解析平台响应；供应商 SessionStarted 后主动播报当前访谈问题。同步 Profile、bootstrap 与 manifest，避免只改源码仍装旧包。
- 证据：新增平台状态响应契约测试先失败后通过；插件 118 项测试通过。包内稳定标识由桌面测试检查。
- 未决：真实语音回答推进需安装后验收；本条不代表已验证用户麦克风输入或供应商播报。

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
| 修复 | `0.1.1` 先将标签改为 `label: () => 'AI 客服'` 并增加 macOS 辅助功能授权入口；安装后续验发现其 `lib/client.cjs` 仍是普通 CommonJS，未按 DSH 协议调用 `window.__ModuleLoader__.load`。`0.1.2` 改为带精确包 ID 的 `factory(require)` 模块产物，桌面 Profile、bootstrap 与 release manifest 统一锁定 `0.1.2`。 |
| 预防门禁 | 插件测试和 `test/plugins/wechat-customer-service.test.ts` 都直接检查构建/正式 tgz 内 `lib/client.cjs` 的模块加载器包装，同时检查函数式标签、授权工具、看板操作和 release manifest 哈希。 |
| 验证 | 插件 37 项测试、类型检查、原生 helper 和客户端构建通过，插件审计为 0 漏洞。正式 App 冷启动界面验收在本次发布后补记。 |
| 关联提交 | 插件权限入口 `25fb44ae09b9eaf7f826ab1783784c97d6df0614`；插件客户端模块修复 `dbdde59`；桌面首次集成 `5ae1b44` |
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

## 2026-09-18：访谈入口仍加载旧的实时语音插件

| 项目 | 记录 |
| --- | --- |
| 状态 | 已修复并完成已登录账户的安装后验证 |
| 受影响范围 | 从旧桌面版本升级、且 Profile 曾引用本地开发链接或旧实时语音 artifact 的账户。 |
| 用户症状 | 点击“开始访谈”后短暂禁用再恢复，没有语音 Overlay 或可理解的错误提示。 |
| 稳定复现证据 | 发布包包含 `@opc/dsh-realtime-voice` `0.1.2`，但桌面启动器的 artifact map 仍指向 `0.1.1`。运行中 Profile 因而继续解析旧版本，返回的访谈失败被旧客户端静默处理。 |
| 已验证根因 | Profile release manifest 与 `OPC_DESKTOP_PLUGINS` 启动器 artifact map 版本漂移。包内有新 tgz 并不保证既有账户运行时会替换旧依赖。 |
| 修复 | 启动器 artifact map 改为 `opc-dsh-realtime-voice-0.1.2.tgz`；新增测试模拟旧 `link:` 依赖，要求启动时精确替换为当前包内 artifact。 |
| 预防门禁 | `test/plugins/release-manifest.test.ts` 校验 release manifest 与 bootstrap artifact map 完全一致；`test/plugins/opc-profile-bootstrap.test.ts` 校验旧开发链接会被正式 artifact 覆盖。 |
| 验证 | 定向 13 项测试、类型检查和 macOS arm64 打包通过。正式 App 的账户隔离 Profile 已加载 `0.1.2`；点击入口会显示“登录状态已失效，请重新登录后继续访谈”，不再无反馈。 |
| 关联提交 | `d0964f8 fix: align desktop voice bootstrap artifact`；合并 `62524b5`。 |
| 遗留风险 | 当前本机测试账户的桌面登录会话已失效，无法在不重新登录的情况下完成真实语音 Overlay 验收；新注册自动建立桌面会话的路径仍需使用可登录的新商户账户复测。 |

## 2026-09-18：AI 客服全局草稿升级的 Profile 版本一致性

| 项目 | 记录 |
| --- | --- |
| 状态 | 已完成打包前静态门禁；安装后真实界面验收待执行 |
| 受影响范围 | `@opc/DSH-ai-customer-service` 从 `0.1.7` 升级至 `0.1.10` 的 macOS 桌面 Profile。 |
| 用户症状 | 升级后若 Profile、启动器 artifact map 与内置 tgz 版本不一致，桌面可能继续运行旧插件，导致“全局微信草稿”工具或看板不出现。 |
| 稳定复现证据 | 既有启动流程会按 `OPC_DESKTOP_PLUGINS` 的 artifact 名称替换桌面内置依赖；仅更新 release manifest 不足以替换旧包。 |
| 已验证根因 | 这是桌面 Profile 的版本映射约束，不是本次插件运行时故障。`0.1.10` 的包名、版本和 SHA-256 已与 manifest、Profile artifact map 和启动器 map 对齐。 |
| 修复 | 内置 artifact 更新为 `opc-DSH-ai-customer-service-0.1.10.tgz`，并将 Profile manifest、启动器 map 和测试期望同步至 `0.1.10`。该版本新增全局微信未读消息的回复草稿能力，只写入微信输入框，不发送消息。 |
| 预防门禁 | `test/plugins/wechat-customer-service.test.ts` 校验 release manifest、启动器 artifact map、tgz 元数据和客户端工具注册；正式打包前运行全量测试、类型检查、构建与 macOS arm64 打包。 |
| 验证 | 插件自身 47 项测试、构建、类型检查及高危依赖审计均已通过；桌面集成定向测试 10 项和类型检查已通过。安装后将验证 AI 客服标签和 `wechat_customer_service_global_preview` 工具可见。 |
| 关联提交 | `53cd450 feat: draft global replies in WeChat`；桌面合并 `cd5c1fb feat: integrate global WeChat reply drafts`。 |
| 遗留风险 | 静态与打包检查不代表微信界面自动化已实际写入草稿；必须在最终安装的 App 中完成真实界面验收，且不得把草稿写入误报为消息已发送。 |

## 2026-09-20：追爆工作台顶部参考输入被旧插件固化为只读

| 项目 | 记录 |
| --- | --- |
| 状态 | 已修复并完成正式 App 冷启动真实界面验收 |
| 受影响范围 | `@opc/dsh-viral-chase` 0.1.12，桌面端 0.7.18 的“追爆创作”顶部参考视频输入区 |
| 用户症状 | 工作台已显示，但顶部参考内容框无法输入或粘贴，旁边只显示不可用的“查看制作费用”；无任务时也不能从工作台创建任务。 |
| 稳定复现证据 | 正式 App 中键盘输入不改变该字段；0.1.12 源码和 tgz 均包含 `aria-label="当前参考链接" readOnly`。底部对话输入框可正常输入，排除全局键盘或焦点故障。 |
| 已验证根因 | 八卡改版把顶部字段实现为只读任务摘要，没有接入已经存在的会话级 `POST /plugins/opc-viral-chase/jobs` 创建接口。若桌面 Profile 或 bootstrap 仍固定旧 artifact，即使新 tgz 已放入目录也不会加载。 |
| 修复 | 插件 0.1.13 增加分享文本安全解析、可编辑输入、会话级任务创建、防并发重复提交和结果提示；桌面 0.7.19 的 Profile 与 bootstrap 同步固定 0.1.13。 |
| 预防门禁 | 插件测试检查顶部字段没有 `readOnly`、分享文本解析和创建 API；桌面 Profile 与 bootstrap 升级测试同时固定 artifact 版本，正式包内再检查稳定标识。 |
| 验证 | 插件构建、类型检查及 73 项测试通过；桌面定向测试 17 项、完整串行测试 902 项、类型检查、品牌门禁、构建和打包通过。正式 `/Applications/Evan超级管家.app` 首次运行及完整冷重启后，顶部字段均可实际输入，输入后“创建追爆任务”按钮由禁用变为可用。验收截图：`docs/images/viral-source-input-0.7.19.png`。 |
| 关联提交 | 平台功能提交 `2d8ca01`、平台 `main` 合并 `be14332`；桌面功能提交 `0303f36`、桌面 `main` 合并 `f86f7ba`。 |
| 遗留风险 | 本次只验证输入和按钮状态，没有点击创建任务，因而没有覆盖线上任务创建接口；也没有调用任何付费 Provider。创建任务、参考分析和生产链路仍需分别验收。 |

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
