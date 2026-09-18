# 追爆主人公媒体流桌面 Broker

日期：2026-09-19。

## 背景

桌面追爆插件此前只能通过 JSON Broker 请求主人公列表和任务数据。主人公原始视频上传、视频预览、肖像预览和声音试听属于二进制媒体，若继续走 JSON 请求体或 `Response.text()`，会受到 64 KiB 请求上限并损坏媒体字节。

## 本次修改

- 为已认证的 `cloud.proxy` capability 增加专用 `media-upload` 子路由，仅允许把 MP4/MOV 原始字节流转发到固定的主人公上传接口。
- 上传请求只接受受限 MIME、合法文件名、明确 Content-Length、Session、Agent 和幂等键；最大 512 MiB。租户、用户、Cookie 与 OPC 身份头均由客户端输入中剔除，登录 Cookie 只由桌面主进程注入。
- 主人公 `video`、`portrait`、`voice` 三类读取继续使用固定云端路径白名单，但响应改为逐字节流式转发，并保留 Content-Type、Content-Length、Content-Range 和 Accept-Ranges。
- 媒体传输使用独立 5 分钟超时，客户端断开时取消上游请求；禁止跟随云端重定向，避免把认证上下文发送到非预期地址。

## 验证

- 新增 Broker 集成测试，覆盖二进制字节不变、Range 响应、断线取消、登录门禁、伪造身份头剔除、文件名与大小边界、实际字节数不匹配。
- 运行桌面 TypeScript 类型检查和 Broker 测试。

## 边界

本提交只提供桌面 Broker 的受控媒体通道，不修改线上 API，也不打包或安装桌面应用。共享追爆插件仍需使用该专用上传路由，之后从干净 `main` 打包并进行真实桌面验收。
