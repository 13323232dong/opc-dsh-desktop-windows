# 追爆主人公媒体流桌面 Broker

日期：2026-09-19。

## 背景

桌面追爆插件此前只能通过 JSON Broker 请求主人公列表和任务数据。主人公原始视频上传、视频预览、肖像预览和声音试听属于二进制媒体，若继续走 JSON 请求体或 `Response.text()`，会受到 64 KiB 请求上限并损坏媒体字节。

## 本次修改

- 为已认证的 `cloud.proxy` capability 增加专用 `media-upload` 子路由，仅允许把 MP4/MOV 原始字节流转发到固定的主人公上传接口。
- 上传请求只接受受限 MIME、合法文件名、明确 Content-Length、Session、Agent 和幂等键；Broker 防护上限为 512 MiB。当前线上主人公上传接口的业务上限约为 100 MiB，超过服务端上限时由线上接口返回明确的业务拒绝，不代表桌面承诺可上传 512 MiB。
- 租户、用户、Cookie 与 OPC 身份头均由客户端输入中剔除，登录 Cookie 只由桌面主进程注入。
- 主人公 `video`、`portrait`、`voice` 三类读取继续使用固定云端路径白名单，但响应改为逐字节流式转发，并保留 Content-Type、Content-Length、Content-Range 和 Accept-Ranges。
- 媒体传输使用 5 分钟空闲超时，而不是 5 分钟总墙钟超时；持续收到或转发分块时会重置计时。客户端断开时取消上游请求；禁止跟随云端重定向，避免把认证上下文发送到非预期地址。

## 信任边界

- Runtime Token 是桌面为已加载 Runtime 发放的账户级 capability token，不证明请求中 `x-session-id` 来自某个真实会话，也不能把该字段当成登录身份。
- 真正的用户隔离仍由桌面主进程持有并注入的 OPC 登录 Cookie 与线上服务端鉴权完成。Session、Agent 字段只作为当前同账号运行时内的业务归属和审计元数据，并经过格式限制；Broker 不接受插件自行传入租户、用户、Cookie 或 OPC 身份头。
- 因此同一账号下获得 `cloud.proxy` capability 与 Runtime Token 的受信插件，可以代表该账号访问本白名单中的主人公媒体接口。该能力不跨账号，也不扩大到白名单外接口；插件安装与 capability 分配本身仍是安全边界。

## 验证

- 新增 Broker 集成测试，覆盖二进制字节不变、Range 响应、断线取消、登录门禁、伪造身份头剔除、文件名与大小边界、实际字节数不匹配，以及总耗时超过测试空闲阈值但持续分块的慢上传和慢下载。
- 运行桌面 TypeScript 类型检查和 Broker 测试。

## 边界

本提交只提供桌面 Broker 的受控媒体通道，不修改线上 API，也不打包或安装桌面应用。共享追爆插件仍需使用该专用上传路由，之后从干净 `main` 打包并进行真实桌面验收。
