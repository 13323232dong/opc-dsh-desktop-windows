# DSH 0.1.5-rc.2 compatibility audit

Status: candidate only. This document does not authorize a desktop release or
any server deployment.

## Scope

- Candidate branch: `codex/dsh-upstream-0.1.5-compat`
- Desktop baseline: `main` at `3bac228`
- Current embedded harness: `0.1.2-rc.1`
- Candidate harness: `dsh-v0.1.5-rc.2` (`fb2c4b9`)
- OPC business services, tenant data, Agent Registry, Agent Memory, and the
  production Linux deployment are explicitly out of scope.

The desktop application consumes a pinned, locally packed DSH npm package set.
It is not a fork of the upstream source tree, so the update must replace that
package set after upstream build and verification. A Git merge between the
desktop repository and `deepseek-harness` would be an invalid upgrade method.

## Upstream assessment

`dsh-v0.1.5-rc.2` is the latest public upstream DSH tag checked on 2026-09-11.
The `rc.2` release itself is small, but the accumulated change from
`0.1.2-rc.1` is not. The relevant breaking surfaces are:

| Surface | Upstream direction | OPC impact |
| --- | --- | --- |
| Session persistence | Session V3 and lifecycle-scoped `SessionHandle` | Existing direct event/persistence reads require adaptation. |
| Agent lifecycle | Creation is async; caller passes the agent explicitly | Agent Teams child-run orchestration requires verification and likely adaptation. |
| Client layout | Global panels use `main` and `sidebar.panellist`; legacy conversation views moved beneath `main` | Conversation-view workspaces must be migrated. |
| Persona and inbox | Persona is prefix/suffix; inbox is typed and agent-owned | Must not emulate removed APIs; use explicit agent lifecycle calls. |
| File UI | Official uploader and multi-tab sidebar added | Do not replace OPC asset ownership or attachment semantics; avoid duplicate UI entry points. |

Upstream Session V3 migration is one-way. Candidate testing must use a copied
desktop data directory. Existing user session data must never be opened by the
candidate application during this phase.

## Active-plugin static audit

The table reflects the exact `.tgz` artifacts selected by
`@opc/dsh-desktop-profile`, not merely source folders or stale artifacts.

| Plugin | Finding | Candidate disposition |
| --- | --- | --- |
| `@nanmicoder/dsh-agent-teams` | Reads `child.session.events`, calls `sessionPersistence.inspect`, and registers `conversation.chat.node`. | Blocker: adapt and rerun team creation, recovery, mailbox and chat-card tests. |
| `@opc/dsh-task-tracker` | Uses `sessionPersistence` and `session.events`. | Blocker: migrate to the SessionHandle-compatible read path. |
| `@opc/dsh-brand` | Registers `sidebar.brand.*` and `conversation.hero.brand.mark`. | Client migration: map to current sidebar/main slots. |
| `@opc/dsh-assets` | Registers `conversation.view`. | Client migration: move to `main` panel contract. |
| `@opc/dsh-viral-chase` | Registers `conversation.view`. | Client migration: move to `main` panel contract. |
| `dsh-file-picker` | Registers `conversation.input.left`. | Client-slot smoke test; adapt only if removed. |
| `@opc/dsh-session-context` | Uses `conversation.input.left` and projects session events. | Client-slot and session-read migration. |
| `@opc/dsh-file-attachments` | Uses `conversation.input.attachments`. | Keep OPC attachment ownership; verify against official uploader to prevent duplicate submit handlers. |
| `@opc/dsh-realtime-voice` | Uses conversation/layout/slot client packages. | Client-slot and load/unload test. |
| `@omdsh-dev/dsh-genui` | Peer range already includes `>=0.1.1 <0.2.0`. | Rebuild/load test only, unless slot validation fails. |
| Tool-only OPC plugins | No inspected direct use of the changed session or panel APIs. | Rebuild and tool-registration smoke test. |

All active plugin peer dependency ranges accept `0.1.5`, but peer-range
acceptance is only install compatibility. It is not runtime compatibility.

## Required compatibility boundary

Do not change OPC business behavior to match upstream features. Add a small
runtime-compatibility plugin/module instead:

1. `SessionReader`: expose a read-only interface backed by the old persistence
   API on the legacy harness and `SessionHandle` on the candidate harness.
2. `PanelRegistry`: map OPC workspace registrations to the current `main` and
   `sidebar.panellist` contracts; keep one active entry point per function.
3. `AgentLifecycle`: contain async creation/resume/stop semantics and explicit
   agent ownership for Agent Teams.
4. `RuntimeCapabilities`: feature-detect the candidate APIs so plugins fail
   closed with a visible compatibility error, rather than partially rendering.

The compatibility layer may translate DSH runtime contracts. It must not access
tenant records, bypass tool policy, or change Agent Registry/Memory behavior.

## Gate before any merge

1. Build upstream `0.1.5-rc.2` and produce vendor and DSH tarball sets.
2. Replace only the candidate branch's embedded harness directory and update
   its profile version plus package references.
3. Clean-install the candidate desktop app and verify all profile artifacts.
4. Run unit tests for SessionReader, PanelRegistry and AgentLifecycle.
5. Run desktop smoke tests: launch, login, normal chat, session restore,
   plugin install/uninstall, Agent Teams creation/recovery, task tracker,
   asset workspace, attachment upload, voice control and tool registration.
6. Launch with a copied empty DSH home and verify no console errors.
7. Only after these pass may this branch be proposed for review. It must not be
   merged into `main`, packaged, or deployed without a separate approval.
