# OPC macOS Client Implementation Status

Last updated: 2026-09-06

## Completed

- The desktop application has its own bundle ID, user-data namespace, and
  disabled upstream update feed.
- `tenantId + userId` derives a stable opaque account key. Each account gets
  an independently owned DSH home, workspace, logs, and owner metadata.
- Account changes are fail-closed: the active Runtime stops and its registered
  child processes are terminated before another account can start.
- macOS credentials use Keychain generic-password records with service
  `cc.ohmycode.opc.desktop` and account
  `tenant:<tenantId>:user:<userId>`. Secrets are sent through stdin, never in
  command arguments or logs.
- The local capability Broker binds only to a random loopback port, issues a
  per-Runtime ephemeral token, strips caller-supplied identity headers, and
  proxies only a compile-time OPC route allowlist.
- Ego Lite discovery and account-specific browser profiles are available. Its
  first supported navigation allowlist is limited to Feishu domains.
- The per-account Runtime factory supplies the account DSH paths and only the
  current Runtime's Broker environment to Harness.
- The immutable OPC Profile validates package closure and rejects Node-only
  client-bundle imports before a plugin can be declared compatible.

## Deliberately Pending

The production OPC API currently provides Web/DSH SSO only. It does not expose
a desktop authorization-code + PKCE endpoint, device grant, or a desktop token
refresh endpoint. The client therefore contains an injected `DesktopAuthProvider`
and refuses to activate DSH without a verified desktop session. It must not use
browser cookies as a desktop credential.

Before the main Electron bootstrap is switched from the upstream shared
`harness/` location to `AccountRuntimeManager`, add a separate cloud contract:

1. `GET /api/v1/desktop/authorize` with PKCE challenge and loopback/custom URI
   redirect validation.
2. `POST /api/v1/desktop/token` with one-time code exchange and refresh token
   rotation.
3. `POST /api/v1/desktop/revoke` for sign-out and account switching.
4. Strict tenant/user/session claims and rate limits on every grant endpoint.

That is intentionally a separate cloud/API change. It does not change the Web
DSH SSO flow or production Runtime Gateway.

## Verification

The current focused suite has 86 passing tests across contracts, accounts,
Runtime isolation, Broker/Ego, profile closure, release boundaries, and the
new account Harness factory. `npm run build` also passes.

The repository-wide typecheck still has unrelated upstream mobile bridge and
JavaScript declaration errors. They are recorded separately and are not hidden
as desktop account-isolation success.
