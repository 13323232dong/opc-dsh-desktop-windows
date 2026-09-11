# Learnings

Corrections, insights, and knowledge gaps captured during development.

---

## [LRN-20260912-001] correction

**Logged**: 2026-09-12T06:10:00+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
桌面端云服务地址必须是纯 Origin，不能携带 `/api/v1` 路径。

### Details
`LocalCapabilityBroker.parseCloudBaseUrl` 要求 URL 的 pathname 为 `/`。桌面环境文件曾配置为 `https://opc.ohmycode.cc/api/v1`，导致应用每次启动构造 Broker 时抛出 `desktop_broker_invalid_cloud_base_url`。API 请求路径应由调用方单独拼接。

### Suggested Action
配置读取时将历史 `/api/v1` 格式归一化为 Origin，并用回归测试覆盖带尾斜杠和旧格式。

### Metadata
- Source: error
- Related Files: `src/main/runtime/opc-runtime-factory.ts`, `src/main/broker/local-capability-broker.ts`
- Tags: desktop, broker, base-url, startup

### Resolution
- **Resolved**: 2026-09-12T06:05:00+08:00
- **Commit/PR**: d4398c0
- **Notes**: 增加 `normalizePublicApiOrigin`，并将运行环境配置改为纯 Origin；运行时测试 8/8 通过。

---
