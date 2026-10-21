import { describe, expect, it } from 'vitest'
import { competitorBrowserUrl } from '../src/main/competitor-browser'
const origin = 'http://127.0.0.1:4567'
const path = '/plugins/opc-douyin-comment-ops/browser'
const valid = `${origin}${path}#${'a'.repeat(48)}`
describe('competitor system browser boundary', () => {
  it('opens only the current harness module with a single-use ticket', () => {
    expect(competitorBrowserUrl(valid, origin)).toBe(valid)
  })
  it.each([undefined, 'https://evil.test' + path, valid.replace(':4567', ':4568'), valid.replace(path, '/other'), valid.replace('#', '?sessionId=x#'), valid.replace('a'.repeat(48), 'short'), valid.replace('127.0.0.1', 'user@127.0.0.1')])('rejects untrusted URL %s', input => {
    expect(() => competitorBrowserUrl(input, origin)).toThrow()
  })
  it('requires an active harness', () => { expect(() => competitorBrowserUrl(valid, undefined)).toThrow() })
})
