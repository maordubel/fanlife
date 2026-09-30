import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { entity } from '@/lib/archive/graph'
import { BANK, LIVED_MIN, livedSoloPool, pickSolo, soloPool } from '@/lib/game/blind-cow/bank'
import { canDealRoyalRumble, pairedRoyalRumbleDrafts, playRoyalRumble, royalRumbleRoundDrafts } from '@/lib/game/royal-rumble'
import { royalRumbleLivedSeed, royalRumbleRoundSeed } from '@/lib/game/royal-rumble-seeds'
import { toSelection } from '@/lib/game/royal-rumble-public'
import { lifeBridge, lifeDoors, lifeTriviaDoors } from '@/lib/life/bridge'
import { cleanChapters, livedPlayerIds, livedPlayers, livedRumbleWindow, livedSeasons, stayedWithMe } from '@/lib/life/livedPool'
import { completedChapters } from '@/lib/life/memoryPassport'
import { eraServable } from '@/lib/links/eraTrivia'

/**
 * ONE RED WORLD — the LIFE payoffs (§10, §11, §15, §18, §19). Three promises, each asserted:
 * nothing opens before a chapter is FINISHED, no answer reaches the page, and the canonical
 * Royal Rumble of a seed does not move.
 */

const ROOT = process.cwd()
const src = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const footballChapters = lifeBridge()
  .filter((row) => row.entityIds.some((id) => id.startsWith('season:') && entity(id)?.sport === 'football'))
  .map((row) => row.chapterId)
const allChapters = lifeBridge().map((row) => row.chapterId)

describe('nothing unlocks before a chapter is finished', () => {
  it('entering a chapter is not living it', () => {
    expect(completedChapters([{ t: 'chapter.entered', chapter: '1986' }])).toEqual([])
    expect(completedChapters([{ t: 'chapter.completed', chapter: '1986' }])).toEqual(['1986'])
  })

  it('no finished chapter → an empty pool everywhere', () => {
    expect(cleanChapters([])).toEqual([])
    expect(livedPlayers([])).toEqual([])
    expect(livedSeasons([])).toEqual([])
    expect(livedRumbleWindow([])).toBeNull()
    expect(livedSoloPool(livedPlayerIds([]))).toEqual([])
    expect(stayedWithMe([], ['p_0000000000'])).toEqual([])
  })

  it('a client cannot claim a chapter the bridge does not know, nor pass anything but ids', () => {
    expect(cleanChapters(['nope', 42, { chapter: '1986' }, '../1986', ''])).toEqual([])
    expect(cleanChapters('1986')).toEqual([])
    const known = allChapters[0]!
    expect(cleanChapters([known, known])).toEqual([known])
  })

  it('the lived pool is archive fact: master ids only, football seasons only', () => {
    expect(footballChapters.length).toBeGreaterThan(0)
    const pool = livedPlayers(footballChapters)
    expect(pool.length).toBeGreaterThan(0)
    for (const p of pool) expect(p.id).toMatch(/^p_[0-9a-f]{10}$/)
    for (const season of livedSeasons(allChapters)) expect(entity(`season:${season}`)?.sport).toBe('football')
  })

  it('the clients ask only after the save says a chapter is finished', () => {
    for (const file of ['components/blind-cow/BlindCowGame.tsx', 'app/royal-rumble/LivedRumbleDoor.tsx', 'app/royal-rumble/lived/LivedRumble.tsx', 'components/life/StayedWithMe.tsx']) {
      const code = src(file)
      expect(code, file).toContain('readCompletedChapters')
      expect(code, file).toMatch(/length === 0/)
    }
  })

  it('the memory wall says "את זה כבר ראית ב-LIFE" only for a finished chapter', () => {
    const board = src('app/memory/MemoryBoard.tsx')
    expect(board).toContain('readCompletedChapters')
    expect(board).toMatch(/livedDone\.includes\(chapter\)/)
    expect(board).toContain("t('redworld.memory.lived')")
  })
})

describe('§11 — the chapter recap offers era trivia only where the gate can serve it', () => {
  it('every trivia door is an era round the gate deals in full', () => {
    const doors = lifeTriviaDoors()
    expect(Object.keys(doors).length).toBeGreaterThan(0)
    for (const [chapter, door] of Object.entries(doors)) {
      expect(allChapters).toContain(chapter)
      expect(door.kind).toBe('trivia')
      const m = /^\/trivia\/general\?era=((?:19|20)\d0)$/.exec(door.href)
      expect(m, door.href).not.toBeNull()
      expect(eraServable(Number(m![1]))).toBe(true)
    }
  })

  it('stays out of the moment doors, which remain at most two', () => {
    for (const list of Object.values(lifeDoors())) {
      expect(list.length).toBeLessThanOrEqual(2)
      expect(list.some((door) => door.kind === 'trivia')).toBe(false)
    }
  })

  it('an era the gate cannot fill is never offered', () => {
    expect(eraServable(1900)).toBe(false)
    expect(eraServable(1985)).toBe(false)
  })
})

describe('§19 — Blind Cow "מהשנים שחיית": the answer never leaves the server', () => {
  it('the lobby learns a yes/no only', () => {
    const actions = src('app/blind-cow/actions.ts')
    expect(actions).toMatch(/export async function livedFilterOpen\(chapters: string\[\]\): Promise<boolean>/)
    expect(actions).toContain('LIVED_MIN')
  })

  it('no client file imports the pool, the bank or the chapter → player map', () => {
    for (const file of ['components/blind-cow/BlindCowGame.tsx', 'app/royal-rumble/LivedRumbleDoor.tsx', 'app/royal-rumble/lived/LivedRumble.tsx', 'components/life/StayedWithMe.tsx', 'app/memory/MemoryBoard.tsx']) {
      const code = src(file)
      expect(code, file).not.toMatch(/lib\/life\/livedPool|lib\/life\/bridge|blind-cow\/bank/)
    }
  })

  it('a lived solo run draws only from the lived pool, and the floor is ten', () => {
    expect(LIVED_MIN).toBe(10)
    const ids = livedPlayerIds(allChapters)
    const pool = livedSoloPool(ids)
    for (const q of pool) expect(ids.has(q.targetPlayerId)).toBe(true)
    if (pool.length >= LIVED_MIN) {
      for (let i = 0; i < 20; i += 1) {
        const q = pickSolo('lived', [], pool)
        expect(q && ids.has(q.targetPlayerId)).toBe(true)
      }
    }
    // the ordinary filters never see the lived chip, and without a pool it deals nothing
    expect(soloPool('lived')).toEqual([])
    expect(pickSolo('lived', [])).toBeNull()
    expect(BANK.questions.length).toBeGreaterThan(pool.length)
  })
})

describe('§18 — the themed Rumble never touches the canonical one', () => {
  // the canonical boards of three seeds, hashed BEFORE the themed mode existed (28.9.2026) and
  // re-pinned when the balance version went 2→3, when the owner re-priced players, and when FLEX left the draft (29.9.2026, Gate 9): the deal is salted with the
  // version, so a new price ladder is a new board by design. The themed mode still changes nothing.
  const CANON: Array<[number, number, string]> = [
    [12345, 0, '1dda974f7d6e9321491d9d972ad2c2f82caacd90021d34d82d954a1190dda971'],
    [7, 2, 'e6727b88879b608c91e17dc9cb25b3c24e1dd17d238526fa2965313b04d8c19e'],
    [2026, 1, '63bf38eb1dae4f4f7d1ca02e9f7c8ccf6c6676b713dc4b63154196804629c40e'],
  ]
  const hashOf = (seed: number, cursor: number) => {
    const { draft, shuffleDraft } = royalRumbleRoundDrafts(seed, cursor)
    const body = JSON.stringify([
      draft.seed,
      shuffleDraft.seed,
      [draft, shuffleDraft].map((d) => d.slots.map((x) => x.offers.map((o) => `${o.player.slug}:${o.offeredAs}:${o.player.price}`))),
    ])
    return createHash('sha256').update(body).digest('hex')
  }

  it('the canonical board of a seed is the one it always was', () => {
    for (const [seed, cursor, hash] of CANON) expect(hashOf(seed, cursor)).toBe(hash)
  })

  it('has its own seed namespace', () => {
    for (const [seed, cursor] of CANON) {
      expect(royalRumbleLivedSeed(seed, cursor)).not.toBe(royalRumbleRoundSeed(seed, cursor))
      expect(royalRumbleLivedSeed(seed, cursor)).toBe(royalRumbleLivedSeed(seed, cursor))
    }
  })

  it('deals only lived men, and dealing it leaves the canonical board as it was', () => {
    const window = livedRumbleWindow(allChapters)
    if (!window) {
      // the archive cannot fill a board from the lived years: the mode stays shut, and says so
      expect(canDealRoyalRumble({ only: livedPlayers(allChapters).map((p) => p.slug) })).toBe(false)
      return
    }
    const only = new Set(window.only)
    const { draft, shuffleDraft } = pairedRoyalRumbleDrafts(royalRumbleLivedSeed(12345), window)
    for (const d of [draft, shuffleDraft]) for (const slot of d.slots) for (const offer of slot.offers) expect(only.has(offer.player.slug)).toBe(true)
    // a themed five is checked against its own window: the gate's window would not have dealt it
    const picks = draft.slots.map((slot) => slot.offers.slice().sort((a, b) => a.player.price - b.player.price)[0] ?? null)
    const selection = toSelection(picks)
    const themed = selection ? playRoyalRumble(draft.seed, selection, window) : null
    if (themed && selection) expect(themed.opponent.every((o) => only.has(o.player.slug))).toBe(true)
    for (const [seed, cursor, hash] of CANON) expect(hashOf(seed, cursor)).toBe(hash)
  })

  it('the client window is cut to `before` — a client can never send a pool', () => {
    const actions = src('app/royal-rumble/actions.ts')
    expect(actions).toMatch(/const cut = window && typeof window\.before === 'number'/)
    expect(actions).toMatch(/livedRumbleWindow\(cleanChapters\(chapters\)\)/)
  })

  it('is a separate, named route that keeps no history and hands over no challenge', () => {
    expect(src('app/royal-rumble/lived/page.tsx')).toContain("t('redworld.rumble.title')")
    const run = src('app/royal-rumble/RoyalRumbleRun.tsx')
    expect(run).toMatch(/if \(!embedded && !themed\)/)
    expect(run).toMatch(/roundSeed !== undefined && !themed/)
  })
})

describe('§10 — "מה נשאר איתי"', () => {
  it('answers only with men already on the XI who belong to a finished chapter', () => {
    const lived = livedPlayers(allChapters)
    if (lived.length === 0) return
    const inXI = lived[0]!
    const out = stayedWithMe(allChapters, [inXI.id, 'p_ffffffffff', 'not-a-man'])
    expect(out.map((p) => p.id)).toEqual([inXI.id])
    expect(stayedWithMe([], [inXI.id])).toEqual([])
  })
})
