import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const mock = vi.hoisted(() => ({
  state: { clubs: [{ id: 'hapoel-tel-aviv', status: 'live', gates: [1, 2, 7] }] },
  shared: vi.fn(() => 'canonical-shared-game'),
}))
vi.mock('@/lib/master/store', () => ({ readState: async () => mock.state, stateUnavailable: () => true }))
vi.mock('@/lib/clubs/resolver', () => ({ loadClub: async () => ({ data: { gates: {
  xi: { playable: true }, trivia: { playable: true }, polls: { playable: true },
} } }) }))
vi.mock('@/app/clubs/[slug]/[gate]/page', () => ({ default: mock.shared }))
vi.mock('next/navigation', async original => ({ ...await original<typeof import('next/navigation')>(), notFound: () => { throw new Error('NOT_FOUND') } }))

import TelegramHome from '@/app/telegram/page'
import TelegramGate from '@/app/telegram/[club]/[gate]/page'

// Vitest's JSX transform is classic; Next uses the automatic runtime for these server pages.
beforeAll(() => vi.stubGlobal('React', React))
afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  mock.state.clubs = [{ id: 'hapoel-tel-aviv', status: 'live', gates: [1, 2, 7] }]
  mock.shared.mockClear()
})

describe('Telegram follows the same public fallback policy as the main site', () => {
  it('still lists a published playable club when the write store is unavailable', async () => {
    const page = await TelegramHome({ searchParams: {} })
    const html = renderToStaticMarkup(page.props.children)
    expect(html).toContain('href="/telegram?club=hapoel-tel-aviv"')
    expect(html).not.toContain('club list is temporarily unavailable')
  })
  it('opens the canonical game from the approved public fallback', async () => {
    expect(await TelegramGate({ params: { club: 'hapoel-tel-aviv', gate: 'trivia' }, searchParams: {} })).toBe('canonical-shared-game')
    expect(mock.shared).toHaveBeenCalledOnce()
  })
  it('continues to refuse paused, unpublished and switched-off games', async () => {
    for (const status of ['paused', 'research']) {
      mock.state.clubs[0]!.status = status
      await expect(TelegramGate({ params: { club: 'hapoel-tel-aviv', gate: 'trivia' }, searchParams: {} })).rejects.toThrow('NOT_FOUND')
    }
    mock.state.clubs[0]!.status = 'live'; mock.state.clubs[0]!.gates = [1]
    await expect(TelegramGate({ params: { club: 'hapoel-tel-aviv', gate: 'trivia' }, searchParams: {} })).rejects.toThrow('NOT_FOUND')
    expect(mock.shared).not.toHaveBeenCalled()
  })
})
