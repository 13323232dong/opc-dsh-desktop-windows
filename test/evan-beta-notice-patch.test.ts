import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const settingsPatch = resolve(
  import.meta.dirname,
  '../patches/@deepseek-ai+dsh-client-ui-settings-models+0.1.2-rc.1.patch',
)

describe('Evan beta notice patch', () => {
  it('keeps the beta notice branded as Evan instead of the upstream Harness product', async () => {
    const source = await readFile(settingsPatch, 'utf8')

    const additions = source
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .join('\n')
    const removals = source
      .split('\n')
      .filter((line) => line.startsWith('-') && !line.startsWith('---'))
      .join('\n')

    expect(additions).toContain('Evan Super Butler is currently in beta')
    expect(additions).toContain('Evan超级管家目前处于内测阶段')
    expect(additions).not.toContain('DeepSeek Harness 0.1 remains in testing')
    expect(additions).not.toContain('DeepSeek Harness 目前的 0.1 版本仍处在')
    expect(removals).toContain('DeepSeek Harness 0.1 remains in testing')
    expect(removals).toContain('DeepSeek Harness 目前的 0.1 版本仍处在')
  })
})
