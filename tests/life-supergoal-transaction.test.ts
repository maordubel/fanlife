import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { CHAPTER } from '@/lib/life/content/chapters'
import { LifeEngine } from '@/lib/life/engine'
import { apply, type LifeEvent } from '@/lib/life/events'
import {
  PACKET_PENDING,
  PACKET_SIZE,
  STICKERS,
  haveOf,
  packetClosed,
  packetQuote,
  packetReplay,
  purchasePacket,
  setSoldIn,
  stickerFlag,
  stickersIn,
  tornFlag,
} from '@/lib/life/stickers'
import type { LifeState } from '@/lib/life/types'
import { DEVELOPMENT_ANCHOR } from '@/lib/life/anchors'
import { LifeBus } from '@/lib/life/runtime/bus'
import { DialogueRunner } from '@/lib/life/runtime/dialogue'

import { WALK_AWAY, WorldSim } from './fixtures/lifeWorldSim'

/**
 * סופרגול — ONE purchase transaction, end to end (delta 90, §21.6).
 *
 * *"Money and card grants are state transactions. Animation is presentation."* Every case
 * of the Definition of Done is a test here, against the pure `purchasePacket` every
 * counter calls (the shop through `LifeRuntime.buyPacket`, the kiosk's dialogue effect
 * through the same function once Workstream A routes it): golden, not enough money, no
 * album this decade, an empty packet pool, a double tap, a reload between the charge and
 * the reveal, and A4 still completable after zero, one or several packets.
 */

function lifeAt(chapter: string, agorot: number): LifeEngine {
  const def = CHAPTER[chapter]
  if (!def) throw new Error(chapter)
  const engine = new LifeEngine(DEFAULT_IDENTITY, def.year)
  engine.dispatch({ t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute }, { t: 'chapter.entered', chapter })
  engine.dispatch({ t: 'money.changed', agorot: agorot - engine.state.agorot, why: 'test' })
  return engine
}

const fold = (state: LifeState, events: readonly LifeEvent[]) => events.reduce(apply, state)
const moneyOut = (events: readonly LifeEvent[]) =>
  events.filter((e): e is Extract<LifeEvent, { t: 'money.changed' }> => e.t === 'money.changed').reduce((n, e) => n + e.agorot, 0)

describe('סופרגול — the purchase', () => {
  it('golden: price and wallet known before, one charge, three cards granted once, the reveal owed', () => {
    const engine = lifeAt('1986', 1000)
    const quote = packetQuote(engine.state)
    expect(quote.status).toBe('ok')
    expect(quote.price).toBe(100)
    expect(quote.wallet).toBe(1000)
    expect(quote.seasonHe).toBeTruthy()
    const bought = purchasePacket(engine.state)
    expect(moneyOut(bought.events)).toBe(-100)
    expect(bought.reveal?.ids).toHaveLength(PACKET_SIZE)
    engine.dispatch(...bought.events)
    expect(engine.state.agorot).toBe(900)
    // the album moved at once, by exactly what came out
    const counts = new Map<string, number>()
    for (const id of bought.reveal?.ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1)
    for (const [id, n] of counts) expect(haveOf(engine.state, id)).toBe((bought.reveal?.before[id] ?? 0) + n)
    expect(packetReplay(engine.state)?.ids).toEqual(bought.reveal?.ids)
  })

  it('marks new and duplicate by what was stuck in BEFORE this packet', () => {
    const engine = lifeAt('1986', 1000)
    const first = purchasePacket(engine.state)
    engine.dispatch(...first.events, ...packetClosed(fold(engine.state, first.events)))
    const second = purchasePacket(engine.state)
    for (const id of second.reveal?.ids ?? []) expect(second.reveal?.before[id]).toBe(haveOf(engine.state, id))
  })

  it('a double tap is ONE packet: the second tap is the same reveal and moves nothing', () => {
    const engine = lifeAt('1986', 1000)
    const first = purchasePacket(engine.state)
    engine.dispatch(...first.events)
    const second = purchasePacket(engine.state)
    expect(second.replay).toBe(true)
    expect(second.events).toEqual([])
    expect(second.reveal).toEqual(first.reveal)
    expect(engine.state.agorot).toBe(900)
  })

  it('putting the reveal down closes it — and the next packet is a new packet, charged once', () => {
    const engine = lifeAt('1986', 1000)
    engine.dispatch(...purchasePacket(engine.state).events)
    engine.dispatch(...packetClosed(engine.state))
    expect(packetReplay(engine.state)).toBeNull()
    expect(packetClosed(engine.state)).toEqual([])
    const next = purchasePacket(engine.state)
    expect(next.replay).toBe(false)
    expect(moneyOut(next.events)).toBe(-100)
  })

  it('reload after the charge and before the reveal: the log folds to the same album, and the reveal replays', () => {
    const engine = lifeAt('1986', 1000)
    const bought = purchasePacket(engine.state)
    engine.dispatch(...bought.events)
    const reloaded = new LifeEngine(DEFAULT_IDENTITY, CHAPTER['1986']?.year ?? 0, engine.log())
    expect(reloaded.state.agorot).toBe(900)
    expect(packetReplay(reloaded.state)).toEqual(bought.reveal)
    // and a buy on the reloaded life does not charge again
    expect(purchasePacket(reloaded.state).events).toEqual([])
    for (const sticker of STICKERS) expect(haveOf(reloaded.state, sticker.id)).toBe(haveOf(engine.state, sticker.id))
  })

  it('not enough money: said with the price and the pocket, nothing moves', () => {
    const engine = lifeAt('1986', 0)
    const bought = purchasePacket(engine.state)
    expect(bought.quote.status).toBe('short')
    expect(bought.quote.sayHe).toBe('מעטפה: 1 ₪ · יש לך 0 ₪ · חסר 1 ₪')
    expect(bought.events).toEqual([])
    expect(bought.reveal).toBeNull()
  })

  it('no album this decade: said, not a dead button, and nothing charged', () => {
    const engine = lifeAt('2000-title', 100000)
    expect(setSoldIn(engine.state)).toBeNull()
    const bought = purchasePacket(engine.state)
    expect(bought.quote.status).toBe('none')
    expect(bought.quote.sayHe).toBeTruthy()
    expect(bought.events).toEqual([])
  })

  it('an empty pool is explained BEFORE the money — never charged for a packet with nothing in it', () => {
    const engine = lifeAt('1986', 1000)
    // every eighties card that a packet could hold, torn out: nothing left to deal
    for (const sticker of STICKERS) if (!sticker.neverInPacket) engine.dispatch({ t: 'flag.raised', flag: tornFlag(sticker.id) })
    const bought = purchasePacket(engine.state)
    expect(bought.quote.status).toBe('empty')
    expect(bought.events).toEqual([])
    expect(engine.state.agorot).toBe(1000)
  })

  it('never sells a page no envelope can add to (the 1992/93 hole found by the Batch 0 matrix)', () => {
    const engine = lifeAt('1993-cup', 1000)
    const set = setSoldIn(engine.state)
    expect(set).not.toBeNull()
    expect(stickersIn(set as never).some((sticker) => !sticker.neverInPacket)).toBe(true)
    expect(purchasePacket(engine.state).quote.status).toBe('ok')
  })

  it('writes the money, the cards and the pending mark in ONE dispatch list, and the pending mark last-but-page', () => {
    const bought = purchasePacket(lifeAt('1986', 1000).state)
    const flags = bought.events.filter((e) => e.t === 'flag.set').map((e) => (e as { flag: string }).flag)
    expect(flags).toContain(PACKET_PENDING)
    for (const id of bought.reveal?.ids ?? []) expect(flags).toContain(stickerFlag(id))
  })
})

describe('סופרגול — the shell only shows it', () => {
  const read = (path: string) => readFileSync(path, 'utf8')

  it('the runtime buys through purchasePacket, and closing the reveal is the runtime’s', () => {
    const game = read('lib/life/runtime/game.ts')
    expect(game).toContain('purchasePacket(engine.state)')
    expect(game).toContain('closePacket')
    const stage = read('app/life/LifeStage.tsx')
    expect(stage).toContain('runtime.current?.closePacket()')
  })

  it('the reveal has two doors — the album, and back to the room', () => {
    const card = read('components/life/PacketCard.tsx')
    expect(card).toContain("onClose('album')")
    expect(card).toContain("onClose('room')")
    expect(card).toContain('role="dialog"')
  })

  it('the counter prints the price and the pocket before the button', () => {
    const shop = read('components/life/ShopCard.tsx')
    expect(shop).toContain('packetQuote(state)')
    expect(shop).toContain('data-life="shop-sg-quote"')
  })

  it('a reload owes the reveal: the shell replays a pending packet', () => {
    expect(read('app/life/stage/useLifeRuntime.ts')).toContain('packetReplay(engine.state)')
  })
})

/**
 * A4 — the envelope against the shirt (§21.2). The temptation stays a temptation: whether
 * the boy spends nothing, one shekel or several on packets, the chapter still reaches its
 * end for a player who only reads what the room shows him.
 */
describe('סופרגול — A4 keeps its opportunity cost and never blocks the chapter', () => {
  for (const packets of [0, 1, 3]) {
    it(`a4-shirt ends after ${packets} packet(s)`, () => {
      const sim = new WorldSim('a4-shirt')
      sim.onMinigame = (id, world) => {
        if (id.startsWith('chore:story:')) world.go(world.location)
      }
      sim.engine.dispatch({ t: 'money.changed', agorot: 300, why: 'test' })
      const before = sim.state.agorot
      let bought = 0
      for (let n = 0; n < packets; n += 1) {
        const purchase = purchasePacket(sim.state)
        if (purchase.events.length === 0) break
        sim.engine.dispatch(...purchase.events, ...packetClosed(fold(sim.state, purchase.events)))
        bought += 1
      }
      expect(bought).toBe(packets)
      expect(sim.state.agorot).toBe(before - packets * 100)
      const pressed = new Set<string>()
      for (let step = 0; step < 400 && sim.endings.length === 0; step += 1) {
        const here = sim.location
        const things = sim.things()
        const key = String(Object.keys(sim.state.flags).length)
        const fresh = things.find((thing) => thing.kind !== 'exit' && !pressed.has(`${here}|${thing.id}|${key}`))
        if (fresh && fresh.kind !== 'exit') {
          pressed.add(`${here}|${fresh.id}|${key}`)
          sim.press(fresh.id, (choices) => choices.find((c) => c.enabled)?.id ?? WALK_AWAY)
          sim.wait(1)
          continue
        }
        const door = things.find((thing) => thing.kind === 'exit' && !thing.locked)
        if (door) {
          sim.exit(door.id)
          sim.wait(2)
          continue
        }
        sim.wait(20)
      }
      expect(sim.endings.length, `a4 with ${packets} packets never ended`).toBeGreaterThan(0)
    })
  }
})

/**
 * The kiosk's own voice (Rafi's dialogue) is the SAME transaction — and a second envelope
 * is a second purchase, not a "repeat" the follow-up resolver may shorten to a sentence.
 * Before delta 90 the second "מעטפת סופרגול. 1 ₪." at the counter played a follow-up line
 * and sold nothing (the `packet` effect was dropped as an already-heard branch).
 */
describe('סופרגול — through the kiosk dialogue', () => {
  function buyAtKiosk(engine: LifeEngine) {
    const bus = new LifeBus()
    const seen: { packet: unknown[]; toast: string[] } = { packet: [], toast: [] }
    let choices: { id: string; enabled?: boolean }[] = []
    let open = false
    bus.on('dialogue', (payload) => {
      open = payload !== null
      choices = payload?.choices ?? []
    })
    bus.on('packet', (value) => {
      if (value) seen.packet.push(value)
    })
    bus.on('toast', (value) => {
      if (value) seen.toast.push(value.text)
    })
    const runner = new DialogueRunner(
      engine,
      bus,
      { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined },
      DEVELOPMENT_ANCHOR,
    )
    expect(runner.start('kiosk-man')).toBe(true)
    let picked = false
    for (let guard = 0; guard < 40 && open; guard += 1) {
      if (choices.length && !picked) {
        const card = choices.find((c) => c.id === 'card')
        expect(card?.enabled).toBe(true)
        runner.choose('card')
        picked = true
        continue
      }
      if (choices.length) {
        runner.leave()
        break
      }
      runner.advance()
    }
    if (open) runner.leave()
    return seen
  }

  it('two envelopes in a row: two charges, two reveals, the pending mark closed between them', () => {
    const engine = lifeAt('1986', 500)
    engine.dispatch({ t: 'moved', to: 'kiosk' })
    const first = buyAtKiosk(engine)
    expect(first.packet.length).toBe(1)
    expect(engine.state.agorot).toBe(400)
    engine.dispatch(...packetClosed(engine.state))
    const second = buyAtKiosk(engine)
    expect(second.packet.length, `second visit said: ${second.toast.join(' / ')}`).toBe(1)
    expect(engine.state.agorot).toBe(300)
  })

  it('a double tap before the reveal is put down charges once and shows the same packet', () => {
    const engine = lifeAt('1986', 500)
    engine.dispatch({ t: 'moved', to: 'kiosk' })
    const first = buyAtKiosk(engine)
    const again = buyAtKiosk(engine)
    expect(engine.state.agorot).toBe(400)
    expect(again.packet).toEqual(first.packet)
  })
})
