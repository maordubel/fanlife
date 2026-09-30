import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveMechanicCatalog } from '@/app/life/mechanicCatalog'
import { DEVELOPMENT_ANCHOR } from '@/lib/life/anchors'
import {
  ACTIVITIES,
  ACTIVITY_CONVERSATIONS,
  CROWD_FLAG,
  NEIGHBOUR_OFFER,
  activityChapters,
  alreadySettled,
  doneFlag,
  isStageA,
  settleActivity,
  type ActivityDef,
  type MechanicRequest,
} from '@/lib/life/activities'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { CHAPTER, CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import type { Conversation, Effect } from '@/lib/life/content/script'
import { STORY_CHORES, STORY_CHORE_PREFIX } from '@/lib/life/content/storyChores'
import { LifeEngine } from '@/lib/life/engine'
import { apply, type LifeEvent } from '@/lib/life/events'
import { GIGS, gigActivity, gigChapters, gigFlag, gigPay, isPaid, kindOf, offerFlag, offeredIn } from '@/lib/life/gigs'
import { OFFER_KIND_HE, activityQuote, offerEntries, offerLineHe, offersNow, startable } from '@/lib/life/offers'
import { LifeBus } from '@/lib/life/runtime/bus'
import { DialogueRunner } from '@/lib/life/runtime/dialogue'
import { SHOP_CHAPTERS, shopId } from '@/lib/life/shirts'
import { packetQuote, purchasePacket, setSoldIn } from '@/lib/life/stickers'
import type { LifeState, LocationId } from '@/lib/life/types'
import { SCENE, exitInEra, inEra, sceneIn, whenFor } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

/**
 * BATCH 0 — the economy's two matrices, kept as regression fixtures (delta 90, §25).
 *
 * *"Do not patch the reported sentence, button, hotspot or video. Repair the shared
 * contract that made that report possible."* So before and after any fix, this suite
 * generates the WHOLE table and compares it with the one in `tests/fixtures/`:
 *
 *  · **every ActivityId × every chapter it exists in**, through the §22.8 row — eligible,
 *    room reachable, host standing there, discoverable, Help can say it, the start is
 *    reachable, the mechanic has something to deal (or says why not), it loads, walking
 *    away settles nothing but a third of the time, it settles, the room is the same room,
 *    time and energy land once, the pay is right for its kind, a game pays nothing, the
 *    room answers afterwards, and a reload mid-way loses nothing;
 *  · **every Supergoal purchase entry point**, per chapter it is reachable in — what the
 *    counter would say at an empty pocket and at a full one, before any money moves.
 *
 * A row that fails lists its dead cells in `dead`, and the fixture holds them — so a new
 * dead row fails this file, and a row that was fixed shows up as a diff to commit.
 * `UPDATE_LIFE_MATRIX=1 npx vitest run tests/life-economy-matrix.test.ts` rewrites both.
 *
 * The harness is the real `DialogueRunner` over the real `LifeEngine` and the real mechanic
 * catalogue — no content rule lives here (the same contract as `fixtures/lifeWorldSim.ts`).
 */

const UPDATE = process.env.UPDATE_LIFE_MATRIX === '1'
const CATALOG = resolveMechanicCatalog()
const ACTIVITY_FIXTURE = 'tests/fixtures/life-activity-matrix.json'
const PACKET_FIXTURE = 'tests/fixtures/life-supergoal-matrix.json'

/** the mechanic kinds the life has a board for — read off the sheet itself, not listed twice */
const BOARDS = new Set(
  [...readFileSync('components/life/MechanicSheet.tsx', 'utf8').matchAll(/^\s+(\w+): lazyBoard\(/gm)].map((m) => m[1] as string),
)

/** the choice ids that START something, in the order a willing player picks them */
const GO = ['do', 'order', 'sit', 'join', 'answer', 'help', 'open', 'build', 'dig']
const NEVER = new Set(['later', 'nothing', 'rail', 'no', 'leave'])

function lifeAt(chapter: string): LifeEngine {
  const def = CHAPTER[chapter]
  if (!def) throw new Error(`no chapter ${chapter}`)
  const engine = new LifeEngine(DEFAULT_IDENTITY, def.year)
  engine.dispatch({ t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute }, { t: 'chapter.entered', chapter })
  const entry = def.entry?.(engine.state) ?? []
  if (entry.length) engine.dispatch(...entry)
  return engine
}

/** the room build's own writes (`WorldScene.rollWorkOffers`), with every rotated row DEALT — "if it is on offer, can it be played" */
function dealAll(engine: LifeEngine) {
  for (const gig of GIGS) if (isPaid(gig) && !engine.state.flags[offerFlag(gig)]) engine.dispatch({ t: 'flag.raised', flag: offerFlag(gig) })
  if (!engine.state.flags[NEIGHBOUR_OFFER]) engine.dispatch({ t: 'flag.raised', flag: NEIGHBOUR_OFFER })
  if (!engine.state.flags[CROWD_FLAG]) engine.dispatch({ t: 'flag.set', flag: CROWD_FLAG, value: 'אחד|שניים' })
}

/**
 * every room the doors of this chapter reach from where it starts — the map's own walk
 * (`WorldScene.places`). With `state` the doors' `when` is asked (open NOW); without it the
 * walk is structural — a door that opens with the story (`area: 'ussishkin'`) still counts.
 */
function reachableRooms(state: LifeState | null, chapter: string): Set<LocationId> {
  const start = CHAPTER[chapter]?.start.location as LocationId
  const seen = new Set<LocationId>([start])
  const queue: LocationId[] = [start]
  while (queue.length) {
    const here = queue.shift() as LocationId
    const base = SCENE[here as keyof typeof SCENE]
    if (!base) continue
    for (const exit of sceneIn(base, chapter).exits) {
      if (!exitInEra(exit, chapter) || (state && !meets(state, whenFor(exit, chapter)))) continue
      if (!(exit.to in SCENE) || seen.has(exit.to)) continue
      seen.add(exit.to)
      queue.push(exit.to)
    }
  }
  return seen
}

type Started =
  | { kind: 'mechanic'; request: MechanicRequest }
  | { kind: 'minigame'; id: string }
  | { kind: 'toto' }
  | { kind: 'bag' }
  | { kind: 'card'; channel: string }
  | { kind: 'said'; text: string }
  | { kind: 'silent' }

/** open the room's conversation and take the willing path until something starts */
function start(engine: LifeEngine, act: string): Started {
  const bus = new LifeBus()
  let open = false
  let choices: { id: string; enabled?: boolean }[] = []
  let got: Started | null = null
  let toast: string | null = null
  bus.on('dialogue', (payload) => {
    open = payload !== null
    choices = payload?.choices ?? []
  })
  bus.on('mechanic', (request) => {
    if (request) got = { kind: 'mechanic', request }
  })
  bus.on('toto', (value) => {
    if (value) got = { kind: 'toto' }
  })
  bus.on('bag', (value) => {
    if (value) got = { kind: 'bag' }
  })
  for (const channel of ['coin', 'penalty', 'hoops', 'pitch'] as const) {
    bus.on(channel, (value) => {
      if (value) got = { kind: 'card', channel }
    })
  }
  bus.on('toast', (value) => {
    if (value) toast = value.text
  })
  const runner = new DialogueRunner(
    engine,
    bus,
    {
      travel: () => undefined,
      minigame: (id) => {
        got = { kind: 'minigame', id }
      },
      ending: () => undefined,
      onOpen: () => undefined,
    },
    DEVELOPMENT_ANCHOR,
    {},
    CATALOG,
  )
  if (!runner.start(act)) return { kind: 'silent' }
  for (let guard = 0; guard < 60 && open && !got; guard += 1) {
    if (choices.length) {
      const enabled = choices.filter((c) => c.enabled && !NEVER.has(c.id))
      const pick =
        GO.map((id) => enabled.find((c) => c.id === id)).find(Boolean) ??
        enabled.find((c) => c.id.startsWith('do-')) ??
        enabled[0]
      if (!pick) break
      runner.choose(pick.id)
      continue
    }
    runner.advance()
  }
  if (open) runner.leave()
  return got ?? (toast ? { kind: 'said', text: toast } : { kind: 'silent' })
}

const fold = (state: LifeState, events: readonly LifeEvent[]) => events.reduce(apply, state)

type Row = {
  activity: string
  chapter: string
  kind: string
  where: string
  /** placed — some room of this chapter stands the offer in it at all; false is a registry chapter no room hosts */
  placed: boolean
  reachable: string
  host: boolean
  discoverable: string
  help: boolean
  start: string
  loads: string
  cancel: string
  settles: boolean
  sameRoom: boolean
  once: boolean
  pay: string
  after: string
  reload: string
  dead: string[]
}

function row(def: ActivityDef, chapter: string): Row {
  const engine = lifeAt(chapter)
  dealAll(engine)
  const entries = offerEntries(chapter).filter((entry) => entry.activity?.id === def.id)
  const rooms = reachableRooms(null, chapter)
  const openNow = reachableRooms(engine.state, chapter)
  const entry = entries.find((e) => openNow.has(e.where)) ?? entries.find((e) => rooms.has(e.where)) ?? entries[0]
  const where = entry?.where ?? def.where
  const dead: string[] = []
  const out: Row = {
    activity: def.id,
    chapter,
    kind: activityQuote(engine.state, def.id).kind,
    placed: entries.length > 0,
    where,
    reachable: openNow.has(where) ? 'yes' : rooms.has(where) ? 'once the story opens the door' : 'no',
    host: Boolean(entry),
    discoverable: 'no',
    help: false,
    start: 'no',
    loads: 'no',
    cancel: 'no',
    settles: false,
    sameRoom: false,
    once: false,
    pay: 'no',
    after: 'no',
    reload: 'no',
    dead,
  }
  // A chapter the registry allows and no room hosts is not a dead row — the player never
  // meets it — but it is listed (`unplaced` below) so a room that DROPS an activity is seen.
  if (!out.placed) return { ...out, discoverable: 'unplaced', start: 'unplaced', loads: 'unplaced', dead }
  if (out.reachable === 'no') dead.push('reachable')

  // discoverable — standing in the room, at the chapter's own hour, then at the hours its `when`s ask for
  engine.dispatch({ t: 'moved', to: where })
  const find = () => offersNow(engine.state).find((offer) => offer.activity === def.id && offer.where === where && startable(offer))
  let offer = find()
  for (const at of [17 * 60 + 50, 20 * 60]) {
    if (offer || engine.state.minute >= at) continue
    engine.dispatch({ t: 'clock.advanced', minutes: at - engine.state.minute })
    offer = find()
    if (offer) out.discoverable = `after ${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')}`
  }
  if (offer && out.discoverable === 'no') out.discoverable = 'yes'
  // the boy's own bag is his, in his room — not an offer of the day, so "?" does not list it
  const own = def.kind === 'myBag'
  if (own) out.discoverable = 'his own (not an offer)'
  if (!offer && !own) dead.push('discoverable')
  out.help = own || Boolean(offer && offerLineHe(offer).startsWith(OFFER_KIND_HE[offer.kind]))
  if (!out.help) dead.push('help')

  // start → what opens
  const log = engine.log().length
  const before = engine.state
  const started = entry ? start(engine, entry.act) : ({ kind: 'silent' } as Started)
  out.start = started.kind === 'said' ? `said: ${started.text}` : started.kind
  if (started.kind === 'silent') dead.push('start')
  if (started.kind === 'mechanic') out.loads = BOARDS.has(started.request.kind) ? 'board' : `NO BOARD for ${started.request.kind}`
  else if (started.kind === 'minigame') {
    const id = started.id.replace(/^chore:/, '')
    out.loads = id.startsWith(STORY_CHORE_PREFIX)
      ? STORY_CHORES[id.slice(STORY_CHORE_PREFIX.length)] ? 'story chore' : 'NO STORY CHORE'
      : GIGS.some((gig) => gig.id === id) ? 'chore scene' : `NO GIG ${id}`
  } else if (started.kind === 'toto') out.loads = 'toto card'
  else if (started.kind === 'bag') out.loads = 'bag card'
  else if (started.kind === 'said') out.loads = 'refusal said'
  if (out.loads.startsWith('NO') || out.loads === 'no') dead.push('loads')

  // reload between the handshake and the result: the log folded again, nothing settled
  const reloaded = new LifeEngine(DEFAULT_IDENTITY, CHAPTER[chapter]?.year ?? 0, engine.log()).state
  const lost = reloaded.agorot !== before.agorot || reloaded.minute !== before.minute
  const slot = def.gig ? GIGS.find((gig) => gig.id === def.gig) : undefined
  const claimed = slot ? Boolean(reloaded.flags[gigFlag(slot)]) && !before.flags[gigFlag(slot)] : false
  out.reload = lost ? 'LOST' : claimed ? 'slot claimed at handshake' : 'safe'
  if (lost) dead.push('reload')
  void log

  // the result, settled by the life's own rules (the shell and the chore scene call exactly this)
  const state = engine.state
  const away = settleActivity(state, def.id, { completed: false, score: 0 })
  const awayState = fold(state, away.events)
  out.cancel =
    away.paid === 0 && !awayState.flags[doneFlag(def.id)] && awayState.minute - state.minute === Math.round(def.minutes / 3)
      ? def.kind === 'chore'
        ? 'timed (the chore ends itself)'
        : 'walk away: a third of the time, nothing else'
      : 'WRONG'
  if (out.cancel === 'WRONG') dead.push('cancel')

  const full = settleActivity(state, def.id, { completed: true, score: 1, pay: 1 })
  const after = fold(state, full.events)
  out.settles = full.events.some((event) => event.t === 'activity.completed')
  if (!out.settles) dead.push('settles')
  out.sameRoom = after.location === state.location
  if (!out.sameRoom) dead.push('sameRoom')
  const request = { activity: def.id, runs: state.activities[def.id]?.runs ?? 0 }
  // exactly one clock step of the activity's minutes and one energy step of its cost
  const clocks = full.events.filter((event) => event.t === 'clock.advanced')
  const tired = full.events.filter((event) => event.t === 'energy.changed' && event.delta === -def.energy)
  const minutesOk = def.minutes === 0 ? clocks.length === 0 : clocks.length === 1 && clocks[0]?.t === 'clock.advanced' && clocks[0].minutes === def.minutes
  const energyOk = def.energy === 0 || tired.length === 1
  out.once = minutesOk && energyOk && !alreadySettled(state, request) && alreadySettled(after, request)
  if (!out.once) dead.push('once')

  const kind = out.kind
  if (kind === 'play') out.pay = full.paid === 0 ? 'none (play)' : 'PAID PLAY'
  else if (!def.pay) out.pay = full.paid === 0 ? 'none' : 'PAID'
  else if (def.slot === 'favour' && isStageA(chapter)) out.pay = full.paid === 0 ? 'none (Stage A favour)' : 'PAID IN STAGE A'
  else if (state.flags[`work:paid:${chapter}`] && def.slot === 'work' && !def.claimsAtHandshake) out.pay = 'slot spent'
  else if (def.id === 'neighbour' && full.paid === 0) out.pay = 'a plate or a favour owed (her gift, off the seed)'
  else out.pay = full.paid > 0 ? `${Math.round(full.paid / 100)} ₪` : def.perContent ? 'row already paid' : 'UNPAID'
  if (/PAID PLAY|PAID IN|UNPAID|^PAID$/.test(out.pay)) dead.push('pay')

  const talk = ACTIVITY_CONVERSATIONS[def.id].after
  out.after = talk === null ? 'none (intentional)' : DIALOGUE[talk] ? talk : `MISSING ${talk}`
  if (out.after.startsWith('MISSING')) dead.push('after')
  return out
}

/* ------------------------------------------------------------------ the jobs that are only jobs */

type GigRow = { gig: string; chapter: string; kind: string; placed: boolean; where: string; start: string; pay: string; dead: string[] }

/** every GIGS row that is not an activity in its chapter (Stage A's jobs, the ball, the coin) — placed, started, priced by kind */
function gigRows(): GigRow[] {
  const rows: GigRow[] = []
  for (const gig of GIGS) {
    for (const chapter of gigChapters(gig)) {
      if (gigActivity(gig, chapter) && gig.opens !== 'toto') continue
      const engine = lifeAt(chapter)
      dealAll(engine)
      const entry = offerEntries(chapter).find((e) => e.gig?.id === gig.id)
      const dead: string[] = []
      const kind = kindOf(gig)
      const pay = gigPay(gig, chapter)
      const r: GigRow = { gig: gig.id, chapter, kind, placed: Boolean(entry), where: entry?.where ?? gig.where, start: 'no', pay: kind === 'play' ? (pay === 0 ? 'none (play)' : 'PAID PLAY') : `${pay} ₪`, dead }
      if (r.pay === 'PAID PLAY') dead.push('pay')
      if (!entry) {
        if (gig.spot !== false) dead.push('placed')
        rows.push(r)
        continue
      }
      engine.dispatch({ t: 'moved', to: entry.where })
      if (!meets(engine.state, entry.when)) engine.dispatch({ t: 'clock.advanced', minutes: Math.max(0, 17 * 60 + 50 - engine.state.minute) })
      const started = start(engine, entry.act)
      r.start = started.kind === 'minigame' ? started.id : started.kind === 'card' ? started.channel : started.kind === 'said' ? `said: ${started.text}` : started.kind
      if (started.kind === 'silent') dead.push('start')
      if (started.kind === 'minigame' && !GIGS.some((row) => `chore:${row.id}` === started.id)) dead.push('loads')
      rows.push(r)
    }
  }
  return rows
}

/* ------------------------------------------------------------------ supergoal entry points */

const effectsIn = (conversation: Conversation) =>
  conversation.branches.flatMap((branch) => [
    ...(branch.then ?? []).map((effect) => ({ choice: null as string | null, when: branch.when, effect })),
    ...(branch.choices ?? []).flatMap((choice) => choice.then.map((effect) => ({ choice: choice.id, when: choice.when, text: choice.text, effect }))),
  ])

/** conversation ids the rooms of a chapter can open, and every node a `goto` takes them to */
function reachableConversations(chapter: string): Map<string, LocationId> {
  const out = new Map<string, LocationId>()
  const queue: string[] = []
  for (const base of Object.values(SCENE)) {
    const room = sceneIn(base, chapter)
    for (const actor of room.actors) if (actor.talk && inEra(actor, chapter) && !out.has(actor.talk)) (out.set(actor.talk, base.id as LocationId), queue.push(actor.talk))
    for (const spot of room.hotspots) if (inEra(spot, chapter) && !out.has(spot.act)) (out.set(spot.act, base.id as LocationId), queue.push(spot.act))
  }
  while (queue.length) {
    const id = queue.shift() as string
    const conversation = DIALOGUE[id]
    if (!conversation) continue
    for (const { effect } of effectsIn(conversation)) {
      if ((effect as Effect).e === 'goto') {
        const node = (effect as { node: string }).node
        if (!out.has(node)) (out.set(node, out.get(id) as LocationId), queue.push(node))
      }
    }
  }
  return out
}

type PacketRow = {
  entry: string
  chapter: string
  where: string
  /** the price the button's text or condition claims, in agorot — null when it states none */
  claims: number | null
  price: number
  set: string | null
  empty: string
  full: string
  dead: string[]
}

function packetRows(): PacketRow[] {
  const rows: PacketRow[] = []
  const playable = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.id)
  for (const chapter of playable) {
    const conversations = reachableConversations(chapter)
    const engine = lifeAt(chapter)
    const poor = { ...engine.state, agorot: 0 }
    const rich = { ...engine.state, agorot: 100000 }
    const quote = (state: LifeState) => {
      const q = packetQuote(state)
      return q.status === 'ok' ? 'ok' : `${q.status}: ${q.sayHe ?? ''}`
    }
    for (const [id, where] of conversations) {
      const conversation = DIALOGUE[id]
      if (!conversation) continue
      for (const site of effectsIn(conversation)) {
        if ((site.effect as Effect).e !== 'packet') continue
        const claims = (site.when as { minAgorot?: number } | undefined)?.minAgorot ?? null
        const q = packetQuote(rich)
        const dead: string[] = []
        if (!setSoldIn(engine.state)) dead.push('offered where no album is sold')
        if (claims !== null && claims !== q.price) dead.push(`button says ${claims / 100} ₪, packet costs ${q.price / 100} ₪`)
        rows.push({
          entry: `dialogue:${id}${site.choice ? `/${site.choice}` : ''}`,
          chapter,
          where,
          claims,
          price: q.price,
          set: q.set,
          empty: quote(poor),
          full: quote(rich),
          dead,
        })
      }
    }
    if (SHOP_CHAPTERS.includes(chapter) && conversations.has(shopId(chapter))) {
      const q = packetQuote(engine.state)
      rows.push({
        entry: 'shop:counter',
        chapter,
        where: conversations.get(shopId(chapter)) as string,
        claims: null,
        price: q.price,
        set: q.set,
        empty: quote(poor),
        full: quote(rich),
        dead: [],
      })
    }
  }
  return rows
}

/* ------------------------------------------------------------------ the fixtures */

function holds<T>(path: string, rows: T[]) {
  if (UPDATE || !existsSync(path)) {
    writeFileSync(path, `${JSON.stringify(rows, null, 1)}\n`)
    return
  }
  const kept = JSON.parse(readFileSync(path, 'utf8')) as T[]
  expect(rows, `${path} moved — rerun with UPDATE_LIFE_MATRIX=1 and read the diff`).toEqual(kept)
}

const ACTIVITY_ROWS = ACTIVITIES.flatMap((def) => activityChapters(def).map((chapter) => row(def, chapter)))

describe('BATCH 0 — every ActivityId through the §22.8 row', () => {
  it('matches the kept matrix (regression fixture)', () => {
    holds(ACTIVITY_FIXTURE, ACTIVITY_ROWS)
  })

  it('has no dead row — every activity that exists can be found, started, played, settled once and returned from', () => {
    const dead = ACTIVITY_ROWS.filter((r) => r.dead.length > 0).map((r) => `${r.activity}@${r.chapter}: ${r.dead.join(', ')}`)
    expect(dead, dead.join('\n')).toEqual([])
  })

  it('lists the registry chapters no room hosts — kept, so a room that drops an activity shows up', () => {
    const unplaced = ACTIVITY_ROWS.filter((r) => !r.placed).map((r) => `${r.activity}@${r.chapter}`)
    holds('tests/fixtures/life-activity-unplaced.json', unplaced)
  })

  it('never pays for play, and never labels a paid thing as play', () => {
    for (const r of ACTIVITY_ROWS) if (r.kind === 'play' && r.placed) expect(r.pay, `${r.activity}@${r.chapter}`).toMatch(/^none/)
    for (const gig of GIGS) if (kindOf(gig) === 'play') expect(isPaid(gig)).toBe(false)
  })

  it('keeps the rotation a rotation — and the Help shows exactly what it dealt', () => {
    // a paid rotating row that the week dealt is in "?" the moment its room is known
    for (const chapter of ['1993-cup', '1996-army', '1999-cup']) {
      const engine = lifeAt(chapter)
      const dealt = offeredIn(chapter, engine.state.rng.seed)
      for (const gig of GIGS) if (dealt.has(gig.id)) engine.dispatch({ t: 'flag.raised', flag: offerFlag(gig) })
      const listed = new Set(offersNow(engine.state).map((offer) => offer.gig))
      for (const gig of GIGS) {
        if (!isPaid(gig) || gig.rotates === false || !listed.has(gig.id)) continue
        expect(dealt.has(gig.id), `${gig.id} is in Help in ${chapter} but the week did not deal it`).toBe(true)
      }
    }
  })
})

const GIG_ROWS = gigRows()

describe('BATCH 0 — every job that is only a job (GIGS rows outside the activity table)', () => {
  it('matches the kept matrix (regression fixture)', () => {
    holds('tests/fixtures/life-gig-matrix.json', GIG_ROWS)
  })

  it('has no dead row — placed, started, and a game never quotes a wage', () => {
    const dead = GIG_ROWS.filter((r) => r.dead.length > 0).map((r) => `${r.gig}@${r.chapter}: ${r.dead.join(', ')}`)
    expect(dead, dead.join('\n')).toEqual([])
  })

  it('never lets a mechanic activity end in silence — every one that can come up empty has a fallback or a sentence', () => {
    for (const def of ACTIVITIES) {
      if (def.kind === 'chore' || def.kind === 'route' || def.kind === 'myBag' || def.kind === 'trivia') continue
      expect(Boolean(def.fallback || def.emptyHe), def.id).toBe(true)
    }
  })
})

const PACKET_ROWS = packetRows()

describe('BATCH 0 — every Supergoal purchase entry point', () => {
  it('matches the kept matrix (regression fixture)', () => {
    holds(PACKET_FIXTURE, PACKET_ROWS)
  })

  it('explains every refusal BEFORE a shekel moves, at every counter in every chapter', () => {
    for (const r of PACKET_ROWS) {
      expect(r.empty === 'ok' || r.empty.includes(':'), `${r.entry}@${r.chapter}`).toBe(true)
      if (r.set) expect(r.empty.startsWith('short') || r.empty.startsWith('empty'), `${r.entry}@${r.chapter}: ${r.empty}`).toBe(true)
    }
  })

  it('refuses in words, and charges nothing, in every chapter no album is sold in', () => {
    for (const chapter of CHAPTERS.filter((c) => c.playable !== false).map((c) => c.id)) {
      const state = { ...lifeAt(chapter).state, agorot: 100000 }
      const bought = purchasePacket(state)
      if (setSoldIn(state)) continue
      expect(bought.events, chapter).toEqual([])
      expect(bought.quote.sayHe, chapter).toBeTruthy()
    }
  })
})
