# Errors

Command failures and integration errors.

---

## [ERR-20260912-001] desktop_broker_invalid_cloud_base_url

**Logged**: 2026-09-12T06:10:00+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
桌面端重启时 LocalCapabilityBroker 因云端地址包含 API 路径而启动失败。

### Error
```text
desktop_broker_invalid_cloud_base_url
```

### Context
- 桌面应用启动阶段构造 `LocalCapabilityBroker`。
- 配置值为带 `/api/v1` 的 HTTPS 地址。
- Broker 只接受纯 Origin。

### Suggested Fix
统一使用 `https://opc.ohmycode.cc` 作为 Broker 基地址；API 路径由请求单独拼接。

### Metadata
- Reproducible: yes
- Related Files: `src/main/runtime/opc-runtime-factory.ts`

### Resolution
- **Resolved**: 2026-09-12T06:05:00+08:00
- **Commit/PR**: d4398c0

---
