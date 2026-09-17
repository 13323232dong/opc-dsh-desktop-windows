# Desktop Login Experience Regression

Date: 2026-09-17

## Evidence

The released `build/login.html` was a 22-line minimal form. The full account
history, password-visibility control, remembered-password handling, merchant
registration, and verification-code countdown had been removed when an older
desktop-auth implementation was integrated during the product rename.

This was a source regression, not a macOS cache or LaunchServices issue.

## Resolution

The login page now remains `Evan-AI管家` while using the current platform
credential architecture. Account labels are stored separately; any password
selected for remembering is encrypted through Electron safeStorage (Keychain
on macOS and DPAPI on Windows). Renderer IPC is limited to the local main-frame
login page. Registration requests use the existing OPC authentication endpoints.

## Guardrail

`test/accounts/desktop-login-entry.test.ts` asserts the complete login surface
and the required protected IPC handlers. Brand-only changes must run this test
before packaging so a small template cannot silently replace the login flow.
