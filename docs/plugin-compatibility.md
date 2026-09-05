# OPC macOS Desktop Plugin Compatibility

`@opc/dsh-desktop-profile` is the only source of truth for the plugins that a
packaged macOS client may compose. It intentionally stores package identities,
version targets, client injection requirements, and **relative artifact names**;
it never embeds a developer-machine path, `node_modules` path, provider secret,
or tenant configuration.

## Profile input contract

Every profile plugin must declare:

- `name`: a package in the immutable desktop registry.
- `version`: the packaged plugin release version.
- `artifact`: `plugins/<package-safe-name>.tgz`; local paths, `file:` values,
  parent traversal, and `node_modules` references are rejected.
- `client`: whether the plugin has a browser bundle.
- `clientInject`: only Harness 0.1.2-rc.1 client modules declared in the profile
  package may be injected.
- `requires`: package dependencies that are also registered in the same
  profile. No implicit package discovery is permitted.

The profile is immutable at runtime. Tenant-specific configuration, role
permissions, cloud access tokens, workspace paths, and local broker endpoints
are supplied by the account Runtime owner, never by the profile artifact.

## First batch matrix

| Group | Desktop disposition | Current gate |
| --- | --- | --- |
| Brand, Agent Teams, assets, workbench, attachments, operations, task tracking, viral chase, session context | Client and Runtime | Browser bundle import scan plus Harness 0.1.2-rc.1 injection closure validation |
| Voice and secure QR | Client and Runtime | Same bundle checks; their runtime services retain server-only credential access |
| Context retrieval, Douyin, Feishu, inspiration, publish precheck | Runtime only | Do not add a client bundle until an explicit browser entry is reviewed |
| Computer Use | Local Capability Broker adapter | DSH plugin never directly reaches macOS APIs; the desktop broker owns the capability grant |
| Mobile control | Runtime only in first desktop release | Enable through broker integration only after device pairing and approval contracts land |

All first-batch OPC plugins are currently marked `requires-adapter-validation`
against Harness `0.1.2-rc.1`. The manifest is a packaging and safety boundary,
not a claim that legacy `0.1.0-rc.6/.8` client code is already compatible.

## Build gate

Run:

```sh
node scripts/plugins/build-opc-profile.mjs --out /tmp/opc-desktop-profile \
  --client /absolute/path/to/built-opc-plugin-client.js
npx vitest run test/plugins
```

The build step writes only `opc-desktop-profile.json`. A release assembler must
place built, hash-verified plugin `.tgz` files at the exact artifact paths named
by that manifest. It must first scan each declared client entry with
`scanClientBundleSource`; a finding for `fs`, `child_process`, or another
Node-only module blocks the release. This directly prevents the class of
`client-modules: require("fs") missed the module table` boot failure.
