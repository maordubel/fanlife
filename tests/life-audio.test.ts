/**
 * הקהל כמכונת מצבים — the crowd is one loop and one state, whatever the director asks.
 *
 * A fake Web Audio: every node records what was asked of it, `decodeAudioData` answers
 * at once, `fetch` hands back an empty buffer. What is checked is the SHAPE of the
 * machine — one murmur loop however many states pass, one cut per entry, the loop
 * dropped on OFF, a dark tab suspending the clock — not what it sounds like.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'


import { CROWD_PLAN, CROWD_STATES, LifeAudio } from '@/lib/life/runtime/audio'

type Call = { target: string; value: number; at: number }

class FakeParam {
  value = 0
  calls: Call[] = []
  constructor(private name: string) {}
  setTargetAtTime(value: number, at: number) {
    this.calls.push({ target: this.name, value, at })
    this.value = value
  }
  setValueAtTime(value: number) {
    this.value = value
  }
  exponentialRampToValueAtTime() {}
}

class FakeNode {
  connect(node: FakeNode) {
    return node
  }
  disconnect() {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam('gain')
}
class FakeFilter extends FakeNode {
  type = 'lowpass'
  Q = new FakeParam('Q')
  frequency = new FakeParam('frequency')
}
class FakeOsc extends FakeNode {
  type = 'sine'
  frequency = new FakeParam('frequency')
  start() {}
  stop() {}
}
class FakeSource extends FakeNode {
  buffer: unknown = null
  loop = false
  playbackRate = new FakeParam('rate')
  started = 0
  stopped = 0
  start() {
    this.started += 1
    FakeContext.last.started.push(this)
  }
  stop() {
    this.stopped += 1
  }
}
class FakeBuffer {
  constructor(public duration: number) {}
  getChannelData() {
    return new Float32Array(10)
  }
}

class FakeContext {
  gains: FakeGain[] = []
  /** every filter the game makes, so a test can ask what colour the street was given */
  filters: FakeFilter[] = []
  static last: FakeContext
  state: 'running' | 'suspended' = 'running'
  currentTime = 0
  sampleRate = 22050
  destination = new FakeNode()
  started: FakeSource[] = []
  constructor() {
    FakeContext.last = this
  }
  createGain() {
    const gain = new FakeGain()
    // every gain the game makes, so a test can ask what was ducked and by how much
    this.gains.push(gain)
    return gain
  }
  createBiquadFilter() {
    const filter = new FakeFilter()
    this.filters.push(filter)
    return filter
  }
  createOscillator() {
    return new FakeOsc()
  }
  createBufferSource() {
    return new FakeSource()
  }
  createBuffer(_c: number, length: number, rate: number) {
    return new FakeBuffer(length / rate)
  }
  decodeAudioData(bytes?: ArrayBuffer) {
    const buffer = new FakeBuffer(23.5)
    ;(buffer as FakeBuffer & { key?: string }).key = (bytes as (ArrayBuffer & { key?: string }) | undefined)?.key ?? ''
    return Promise.resolve(buffer)
  }
  suspend() {
    this.state = 'suspended'
    return Promise.resolve()
  }
  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
}

const listeners: Record<string, Array<() => void>> = {}
let visibility = 'visible'

function install() {
  const storage = new Map<string, string>()
  Object.assign(globalThis, {
    window: {
      AudioContext: FakeContext,
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
      },
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (id: number) => clearTimeout(id),
    },
    document: {
      get visibilityState() {
        return visibility
      },
      addEventListener: (name: string, fn: () => void) => {
        ;(listeners[name] ??= []).push(fn)
      },
      createElement: () => ({ canPlayType: () => 'probably' }),
    },
    /**
     * The fake remembers WHICH cut was asked for, because since 6.9.2026 a match has more
     * than one looping layer in it — the reactive murmur, the constant bed, and on a derby
     * the chant — and a test that cannot tell them apart cannot check any of them.
     */
    fetch: (url: string) => {
      // the key rides ON the bytes, not in a module variable: two cuts load at once and a
      // shared variable is whichever of them resolved last
      const key = String(url).split('/').pop()?.replace(/\.(ogg|m4a)$/, '') ?? ''
      const bytes = new ArrayBuffer(8) as ArrayBuffer & { key?: string }
      bytes.key = key
      return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(bytes) })
    },
  })
}

const tick = async () => {
  // fetch → arrayBuffer → decode → then: microtasks only, timers are faked
  for (let i = 0; i < 12; i += 1) await Promise.resolve()
}

/** the sources started on the crowd bus that loop — there must only ever be one alive */
const keyOf = (s: { buffer?: unknown }) => ((s.buffer ?? {}) as { key?: string }).key ?? ''
const allLoops = () => FakeContext.last.started.filter((s) => s.loop && (s.buffer as FakeBuffer)?.duration === 23.5)
/** the reactive ground — the one the state machine opens, closes and colours */
const loops = () => allLoops().filter((s) => keyOf(s) === 'crowd-real-murmur')
/** the constant bed under every match, and the derby chant over it */
const beds = () => allLoops().filter((s) => keyOf(s) === 'crowd-bed')
const chants = () => allLoops().filter((s) => keyOf(s) === 'chant-derby')
const oneShots = () => FakeContext.last.started.filter((s) => !s.loop)

describe('the crowd state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    install()
    visibility = 'visible'
    for (const k of Object.keys(listeners)) delete listeners[k]
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('names the seven states the brief asked for', () => {
    expect(CROWD_STATES).toEqual(['LOW_MURMUR', 'BUILDING_TENSION', 'CHANT', 'NEAR_MISS', 'GOAL_BURST', 'AFTERMATH', 'FINAL_WHISTLE'])
    for (const state of CROWD_STATES) expect(CROWD_PLAN[state as keyof typeof CROWD_PLAN]).toBeDefined()
    // a goal is louder than a murmur, and the end goes to nothing
    expect(CROWD_PLAN.GOAL_BURST.level).toBeGreaterThan(CROWD_PLAN.LOW_MURMUR.level)
    expect(CROWD_PLAN.FINAL_WHISTLE.level).toBe(0)
  })

  it('starts one murmur loop and keeps it through every state', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    expect(loops()).toHaveLength(1)
    for (const state of ['BUILDING_TENSION', 'CHANT', 'NEAR_MISS', 'GOAL_BURST', 'AFTERMATH'] as const) {
      audio.crowd(state)
      await tick()
    }
    expect(loops()).toHaveLength(1)
    expect(audio.crowdState).toBe('AFTERMATH')
    expect(audio.crowdHistory.map((h) => h.state)).toEqual(['LOW_MURMUR', 'BUILDING_TENSION', 'CHANT', 'NEAR_MISS', 'GOAL_BURST', 'AFTERMATH'])
  })

  /**
   * שתי שכבות של יום משחק — Maor, 6.9.2026: the constant bed under every match, and the
   * chant over it only when the fixture is a derby.
   *
   * The bed must not care what the ground is doing (it is the room, not the reaction), and
   * the chant must never appear at an ordinary match — that is the whole point of it.
   */
  it('lays the constant bed under every match, derby or not', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    expect(beds(), 'no bed under the match').toHaveLength(1)
    expect(chants(), 'a chant at a match that is not a derby').toHaveLength(0)
    for (const state of ['BUILDING_TENSION', 'GOAL_BURST', 'AFTERMATH'] as const) {
      audio.crowd(state)
      await tick()
    }
    expect(beds(), 'the bed restarted with a state change').toHaveLength(1)
  })

  it('puts the chant over the bed on a derby, and only there', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setDerby(true)
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    expect(beds()).toHaveLength(1)
    expect(chants(), 'the derby has no chant').toHaveLength(1)
    audio.crowd('GOAL_BURST')
    await tick()
    // a goal swallows the song; it does not stop it
    expect(chants(), 'the chant was restarted by a goal').toHaveLength(1)
  })

  it('takes both layers down with the match', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setDerby(true)
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    const [bed] = beds()
    const [chant] = chants()
    audio.crowd('OFF')
    expect(bed!.stopped, 'the bed played on after the match').toBe(1)
    expect(chant!.stopped, 'the chant played on after the match').toBe(1)
  })

  it('fires the entry cut once per state, not once per call', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    const before = oneShots().length
    audio.crowd('GOAL_BURST')
    audio.crowd('GOAL_BURST')
    audio.crowd('GOAL_BURST')
    await tick()
    await tick()
    expect(oneShots().length - before).toBe(1)
  })

  it('drops the loop on OFF and after the final whistle', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    const [loop] = loops()
    audio.crowd('OFF')
    expect(loop!.stopped).toBe(1)
    expect(audio.crowdState).toBe('OFF')
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    expect(loops()).toHaveLength(2)
    audio.crowd('FINAL_WHISTLE')
    vi.advanceTimersByTime(9500)
    expect(audio.crowdState).toBe('OFF')
    expect(loops()[1]!.stopped).toBe(1)
  })

  it('cancels the old state’s timers when the state moves on', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    audio.crowd('BUILDING_TENSION')
    await tick()
    const before = oneShots().length
    audio.crowd('LOW_MURMUR')
    vi.advanceTimersByTime(20000)
    await tick()
    // no second "build" rise fired under the murmur
    expect(oneShots().length).toBe(before)
  })

  it('suspends the clock when the tab goes dark and resumes it once, without a second loop', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('CHANT')
    await tick()
    await tick()
    visibility = 'hidden'
    for (const fn of listeners.visibilitychange ?? []) fn()
    expect(FakeContext.last.state).toBe('suspended')
    vi.advanceTimersByTime(30000)
    visibility = 'visible'
    for (const fn of listeners.visibilitychange ?? []) fn()
    await tick()
    expect(FakeContext.last.state).toBe('running')
    expect(loops()).toHaveLength(1)
  })

  it('keeps the mute preference across engines', () => {
    const a = new LifeAudio()
    a.setMuted(true)
    const b = new LifeAudio()
    expect(b.muted).toBe(true)
    b.setMuted(false)
    expect(new LifeAudio().muted).toBe(false)
  })

  it('the room ambience "park" is the owner’s recording and the crowd has real cuts', () => {
    const manifest = JSON.parse(require('node:fs').readFileSync('public/life/sfx/manifest.json', 'utf8')) as Record<string, { loop: boolean; seconds: number; source?: string }>
    for (const key of ['amb-park', 'park-wave', 'crowd-real-goal', 'crowd-real-murmur', 'crowd-real-build', 'crowd-real-miss', 'crowd-real-after', 'crowd-real-final']) {
      expect(manifest[key], key).toBeDefined()
      expect(manifest[key]!.source).toBe('maor-2026-09-05')
      for (const ext of ['ogg', 'm4a']) expect(require('node:fs').existsSync(`public/life/sfx/${key}.${ext}`), `${key}.${ext}`).toBe(true)
    }
    expect(manifest['amb-park']!.loop).toBe(true)
    expect(manifest['crowd-real-murmur']!.loop).toBe(true)
    expect(manifest['crowd-real-goal']!.loop).toBe(false)
  })
})

/**
 * שלושה מקורות, ותו לא — 6.9.2026.
 *
 * Maor listened to the game and said what it was: everything that was synthesised sounds
 * terrible, keep the three recordings I gave you. This is that instruction, written as a
 * test, so the sixty-third synthesised footstep cannot come back by accident.
 */
describe('רק מה שמאור הקליט', () => {
  const REAL = [
    'amb-park', 'park-wave',
    'crowd-real-murmur', 'crowd-real-build', 'crowd-real-goal',
    'crowd-real-miss', 'crowd-real-after', 'crowd-real-final',
    'amb-theme',
  ]

  /**
   * שתי ההקלטות של יום המשחק — wired on 6.9.2026, still on their way.
   *
   * Maor sent two more: a constant bed for every match, and the derby chant to sit over
   * it. The code that mixes them is in (`audio.ts` → `ensureMatchLayers`), the allow-list
   * lets them through, and until the files are in `public/life/sfx` they simply resolve to
   * nothing and the ground sounds exactly as it did. This list is what keeps that honest.
   */
  /**
   * שלוש הקלטות נוספות — delivered 6.9.2026, hours after the wiring went in: the constant
   * match bed, "על הזין" for the derby, and the opening of "שירים ושערים" for the radio.
   * They are his recordings like the rest, so they belong in REAL rather than in a pending
   * list, and every rule below applies to them: a manifest row, both encodings, and a
   * source that starts with his name.
   */
  const DELIVERED_0609 = ['crowd-bed', 'chant-derby', 'radio-open']

  it('the allow-list is exactly his recordings, and nothing else', () => {
    expect([...LifeAudio.allowed].sort()).toEqual([...REAL, ...DELIVERED_0609].sort())
  })

  it('the library says nothing exists that he did not record', () => {
    const manifest = JSON.parse(require('node:fs').readFileSync('public/life/sfx/manifest.json', 'utf8')) as Record<string, { source?: string }>
    for (const key of [...REAL, ...DELIVERED_0609]) expect(Object.keys(manifest), key).toContain(key)
    for (const key of Object.keys(manifest)) {
      expect(manifest[key]!.source, `${key} has no recording behind it`).toMatch(/^maor-/)
    }
  })

  it('every allowed cut is two files on disk, ogg and m4a', () => {
    const { existsSync } = require('node:fs')
    for (const key of [...REAL, ...DELIVERED_0609]) {
      for (const ext of ['ogg', 'm4a']) {
        expect(existsSync(`public/life/sfx/${key}.${ext}`), `${key}.${ext}`).toBe(true)
      }
    }
  })

  /**
   * A pending recording is either fully here or fully absent — never half.
   *
   * Half a delivery is the worst state: one browser plays it, the other is silent, and
   * nobody notices for a month. When Maor's two files land, this is what makes sure both
   * encodings and the manifest row arrived with them.
   */
  it('a matchday layer is either fully delivered or not delivered at all', () => {
    const { existsSync, readFileSync } = require('node:fs')
    const manifest = JSON.parse(readFileSync('public/life/sfx/manifest.json', 'utf8')) as Record<string, unknown>
    for (const key of DELIVERED_0609) {
      const parts = [existsSync(`public/life/sfx/${key}.ogg`), existsSync(`public/life/sfx/${key}.m4a`), key in manifest]
      const there = parts.filter(Boolean).length
      expect(there === 0 || there === 3, `${key} is half-delivered: ogg/m4a/manifest = ${parts.join('/')}`).toBe(true)
    }
  })

  it('refuses a synthesised key without touching a bus, and says so to its caller', () => {
    const audio = new LifeAudio()
    audio.wake()
    const before = FakeContext.last.started.length
    // the old library, one of each family: a step, a door, a whistle, a click, a room tone
    for (const key of ['step-street-1', 'door', 'whistle-1', 'ui-click', 'amb-room', 'darbuka-dum', 'crowd-goal'] as never[]) {
      // `true` is the contract: the caller must NOT fall back to anything
      expect(audio.play(key), String(key)).toBe(true)
    }
    expect(FakeContext.last.started.length, 'a refused key started a source').toBe(before)
  })

  it('the one-shots the game still calls make no sound at all', () => {
    const audio = new LifeAudio()
    audio.wake()
    const before = FakeContext.last.started.length
    audio.step('street'); audio.step('floor'); audio.page(); audio.tick(); audio.thud()
    audio.door(); audio.whistle(3); audio.radioOn(true); audio.radioOn(false); audio.roar(2)
    expect(FakeContext.last.started.length).toBe(before)
  })

  it('the tune plays under an ordinary room and not on the ground', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setAmbience('interior')
    await tick()
    const music = FakeContext.last.started.filter((s) => s.loop)
    expect(music.length, 'no tune under a room').toBeGreaterThan(0)
  })

  it('his street plays outdoors and stops indoors', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setAmbience('day')
    await tick()
    await tick()
    const outdoors = FakeContext.last.started.length
    expect(outdoors).toBeGreaterThan(0)
    audio.setAmbience('kitchen')
    await tick()
    // nothing new is started for a kitchen: the tune is already running, the street stops
    expect(FakeContext.last.started.length).toBe(outdoors)
  })
})

/**
 * המיקס שמספר את הסיפור — Mission 01 §24.
 *
 * Standing in a stadium listening to a radio from another one is the whole mechanic of
 * 12.5.1990, and the mix is how it is felt: the ground ducks while somebody listens and
 * comes back afterwards. These lock the shape of that, not the exact numbers.
 */
describe('להקשיב לרדיו באמצע אצטדיון', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    install()
    visibility = 'visible'
    for (const k of Object.keys(listeners)) delete listeners[k]
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ducks the whole ground and lets it back up', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    audio.listen(0.3)
    const ducked = FakeContext.last.gains.some((g) => g.gain.calls.some((c) => c.value === 0.3))
    expect(ducked, 'nothing ducked when the radio came up').toBe(true)
    audio.listen(1)
    const back = FakeContext.last.gains.some((g) => g.gain.calls.filter((c) => c.value === 1).length > 0)
    expect(back, 'the ground never came back').toBe(true)
  })

  it('takes the bed and the chant down with it', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setDerby(true)
    audio.crowd('LOW_MURMUR')
    await tick()
    await tick()
    const [bed] = beds()
    const [chant] = chants()
    expect(bed, 'no bed to duck').toBeTruthy()
    expect(chant, 'no chant to duck').toBeTruthy()
    audio.listen(0.05)
    // both layers were asked to go almost silent, not stopped
    expect(bed!.stopped, 'the bed was stopped instead of ducked').toBe(0)
    expect(chant!.stopped, 'the chant was stopped instead of ducked').toBe(0)
  })
})

/**
 * העשור על הרחוב — one recording, three rooms (7.9.2026).
 *
 * The street in this game was recorded in the 2020s and plays from 1983 to 2000. The
 * honest treatment is a filter, not a second recording, and these lock the two things
 * that could go wrong with it: that the colour is actually applied to his street rather
 * than sitting in a table nobody reads, and that it MOVES when the life moves on a decade
 * instead of being frozen at whatever the first chapter set.
 *
 * Nothing here asserts a frequency. The numbers are a mix decision and will be tuned; the
 * SHAPE — earlier is darker, later is brighter, and the two are different — is the promise.
 */
describe('צבע הרחוב לפי העשור', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    install()
    visibility = 'visible'
    for (const k of Object.keys(listeners)) delete listeners[k]
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('gives the street a top and a bottom, and the eighties are darker than the two-thousands', async () => {
    const eighties = new LifeAudio()
    eighties.wake()
    eighties.setDecade('80s')
    eighties.setAmbience('day')
    await tick()
    await tick()
    const early = FakeContext.last.filters.filter((f) => f.type === 'lowpass').map((f) => f.frequency.value)
    expect(early.length, 'the street got no colour at all').toBeGreaterThan(0)

    install()
    const noughties = new LifeAudio()
    noughties.wake()
    noughties.setDecade('00s')
    noughties.setAmbience('day')
    await tick()
    await tick()
    const late = FakeContext.last.filters.filter((f) => f.type === 'lowpass').map((f) => f.frequency.value)
    expect(Math.max(...late)).toBeGreaterThan(Math.max(...early))
  })

  it('opens the street up when the life moves into a later decade', async () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setDecade('80s')
    audio.setAmbience('day')
    await tick()
    await tick()
    const lowpass = FakeContext.last.filters.find((f) => f.type === 'lowpass')
    const before = lowpass?.frequency.value ?? 0
    audio.setDecade('90s')
    const asked = lowpass?.frequency.calls.map((c) => c.value) ?? []
    expect(asked.some((value) => value > before), 'the street stayed in 1984').toBe(true)
  })

  it('ignores a decade it is already in', () => {
    const audio = new LifeAudio()
    audio.wake()
    audio.setDecade('80s')
    audio.setAmbience('day')
    const before = FakeContext.last.filters.length
    audio.setDecade('80s')
    expect(FakeContext.last.filters.length).toBe(before)
  })
})
