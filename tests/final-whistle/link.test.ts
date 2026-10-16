import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {memoryStore, useDurableStore} from '@/lib/master/durable'

const {issueLinkCode, redeemLink} = await import('@/lib/final-whistle/link')
const {getDestination} = await import('@/lib/final-whistle/service')
afterEach(() => useDurableStore(null))
beforeEach(() => useDurableStore(memoryStore()))
const now = new Date('2026-10-16T12:00:00Z')

describe('link by code', () => {
  it('ignores anything that is not /link', async () => { expect(await redeemLink('/start', 5, now)).toBeNull(); expect(await redeemLink('hello', 5, now)).toBeNull() })
  it('links the chat once with the right code, then the code is spent', async () => {
    const {code} = await issueLinkCode(now)
    expect(await redeemLink(`/link ${code.toLowerCase()}`, 4242, now)).toMatch(/^Linked/)
    expect((await getDestination())?.chatId).toBe('4242')
    expect(await redeemLink(`/link ${code}`, 9999, now)).toMatch(/not valid/)
    expect((await getDestination())?.chatId).toBe('4242')
  })
  it('expires after 15 minutes and burns after five wrong tries', async () => {
    const a = await issueLinkCode(now)
    expect(await redeemLink(`/link ${a.code}`, 1111, new Date(now.getTime() + 16 * 60_000))).toMatch(/not valid/)
    const b = await issueLinkCode(now)
    for (let i = 0; i < 5; i++) await redeemLink('/link AAAAAAAA', 1111, now)
    expect(await redeemLink(`/link ${b.code}`, 1111, now)).toMatch(/not valid/)
    expect(await getDestination()).toBeNull()
  })
  it('refuses groups and a missing code politely', async () => {
    expect(await redeemLink('/link', 5, now)).toMatch(/code/)
    expect(await redeemLink('/link ABCD2345', -100, now)).toBeNull()
  })
})
