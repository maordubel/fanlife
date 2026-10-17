import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const mock = vi.hoisted(() => ({
  state: { clubs: [{ id: 'hapoel-tel-aviv', status: 'live', gates: [1, 2, 7] }],features:{allFootball:false} },
  shared: vi.fn(() => 'canonical-shared-game'),
  timeline: vi.fn(() => 'canonical-timeline'),
  life: vi.fn(() => 'canonical-life'),
}))
vi.mock('@/lib/master/store', () => ({ readState: async () => mock.state, stateUnavailable: () => true }))
vi.mock('@/lib/clubs/resolver', () => ({ loadClub: async () => ({ data: { gates: {
  xi: { playable: true }, trivia: { playable: true }, polls: { playable: true },
} } }) }))
vi.mock('@/app/clubs/[slug]/[gate]/page', () => ({ default: mock.shared }))
vi.mock('@/app/clubs/[slug]/timeline/page', () => ({ default: mock.timeline }))
vi.mock('@/app/clubs/[slug]/life/page', () => ({ default: mock.life }))
vi.mock('next/navigation', async original => ({ ...await original<typeof import('next/navigation')>(), notFound: () => { throw new Error('NOT_FOUND') } }))

import TelegramHome from '@/app/telegram/page'
import TelegramGate from '@/app/telegram/[club]/[gate]/page'

// Vitest's JSX transform is classic; Next uses the automatic runtime for these server pages.
beforeAll(() => vi.stubGlobal('React', React))
afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  mock.state.clubs = [{ id: 'hapoel-tel-aviv', status: 'live', gates: [1, 2, 7] }]
  mock.state.features.allFootball = false
  mock.shared.mockClear()
  mock.timeline.mockClear()
  mock.life.mockClear()
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
  it('offers the original Our Games page and hides All Football until publicly enabled', async () => {
    const html=renderToStaticMarkup((await TelegramHome({searchParams:{}})).props.children)
    expect(html).toContain('href="/our-games"')
    expect(html).not.toContain('href="/all-football"')
    mock.state.features.allFootball=true
    expect(renderToStaticMarkup((await TelegramHome({searchParams:{}})).props.children)).toContain('href="/all-football"')
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
  it('dispatches the ten added gates through their existing pages', async () => {
    mock.state.clubs[0]!.gates = Array.from({length:13},(_,i)=>i+1)
    for (const gate of ['lineup','kit-builder','kits','memory','goal','royal-rumble','blind-cow','derby','archive']) {
      expect(await TelegramGate({params:{club:'hapoel-tel-aviv',gate},searchParams:{seed:'42',r:'3'}})).toBe('canonical-shared-game')
      expect(mock.shared).toHaveBeenLastCalledWith({params:{slug:'hapoel-tel-aviv',gate},searchParams:{seed:'42',r:'3',lang:'en'}})
    }
    expect(await TelegramGate({params:{club:'hapoel-tel-aviv',gate:'timeline'},searchParams:{mode:'thread'}})).toBe('canonical-timeline')
    expect(mock.timeline).toHaveBeenCalledWith({params:{slug:'hapoel-tel-aviv'},searchParams:{mode:'thread',lang:'en'}})
    mock.state.clubs[0]!.gates = [1]
    await expect(TelegramGate({params:{club:'hapoel-tel-aviv',gate:'timeline'},searchParams:{}})).rejects.toThrow('NOT_FOUND')
  })
  it('opens LIFE only for published clubs and never calls it for paused/research clubs', async () => {
    expect(await TelegramGate({params:{club:'hapoel-tel-aviv',gate:'life'},searchParams:{}})).toBe('canonical-life')
    mock.life.mockClear()
    for (const status of ['paused','research','review']) {
      mock.state.clubs[0]!.status = status
      await expect(TelegramGate({params:{club:'hapoel-tel-aviv',gate:'life'},searchParams:{}})).rejects.toThrow('NOT_FOUND')
    }
    expect(mock.life).not.toHaveBeenCalled()
  })
})
