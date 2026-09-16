# 桌面端当前登录账号展示修复记录

## 背景

桌面版 DSH 的“设置 → 账号”已显示登录状态，但商户名与账号名长期显示“加载中”。经追踪，线上 `/api/v1/auth/me` 已返回名称，桌面认证层却只保存了租户、用户和登录会话 ID，导致 DSH Host 没有可展示的名称投影。

## 变更范围

- `src/shared/account-contracts.ts`：在桌面身份对象中增加可选的商户名和账号名显示字段，并对其长度和控制字符进行限制。
- `src/main/accounts/opc-desktop-auth-provider.ts`：保留服务器断言的显示名称，不把它们作为权限依据。
- `src/main/runtime/opc-runtime-factory.ts`：向 DSH Host 注入只读 `OPC_DSH_TENANT_NAME` 与 `OPC_DSH_ACCOUNT_NAME` 环境变量。
- `test/accounts/opc-desktop-auth-provider.test.ts`、`test/runtime/opc-runtime-factory.test.ts`：覆盖名称保留和传入 DSH 环境的行为。

## 用户可见变化

重新启动桌面应用后，“设置 → 账号”会同时显示当前商户名称和当前登录账号名称，不再只显示“已登录 / 加载中”。

## 安全边界

- 租户隔离、账号目录、凭据选择和服务端授权继续只使用稳定 ID。
- 名称只用于本机 DSH 的只读界面展示，不能由浏览器或 Agent 指定。
- 不写入 Cookie、访问令牌、密码、密钥或本机路径。

## 验证

- 定向测试：`test/accounts/opc-desktop-auth-provider.test.ts` 与 `test/runtime/opc-runtime-factory.test.ts`，共 6 项通过。
- TypeScript 类型检查通过。
- 待平台插件与桌面 `main` 合并、重打包后，以正式桌面应用“设置 → 账号”截图完成最终验收。

## 已知限制

- 算力余额使用独立受保护接口读取，本次只修复当前账号识别和名称展示。
