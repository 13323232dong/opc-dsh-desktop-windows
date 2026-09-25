import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

describe('assistant local path links', () => {
  it('links Codex-style path references even when they are not turn deliverables', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-deliverables'),
      'utf8'
    )

    expect(patch).toContain('localPathReference(value)')
    expect(patch).toContain('paths ?? []')
    expect(patch).toContain('#L\\d+')
    expect(patch).toContain('[A-Za-z]:[\\\\/]')
    const installed = await readFile(path.join(
      projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-deliverables/lib/client.js'
    ), 'utf8')
    expect(installed).toContain('if (file === void 0) owner.openFile(path);')
    expect(installed).toContain('else opener.open(sessionId, file.seq, file.index);')
  })
})
