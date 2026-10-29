/**
 * LIFE, universal — the engine. Pure TypeScript: no React, no canvas, no storage of its own.
 *
 * The life is an append-only log. `fold` turns it into a state; `meets` asks a question of that
 * state; `eventsOf` turns what a conversation decided into rows for the log. The shell holds a
 * `Life` and the simulator in the test suite holds the very same functions, which is the point:
 * what the tests walk is what the player walks.
 */
import {compatOf, compatible} from './compat'
import type {Chapter, Cond, Effect, FlagValue, LifeEvent, LifePack, LifeState, MiniGame, MissionCall, PlayResult, SaveFile, Wear, WorkScope, CollectionEntry} from './types'

export const SAVE_VERSION = 1
/** A flag with this prefix is part of the person and outlives the chapter that raised it. */
export const LIFE_PREFIX = 'life:'

export const emptyState = (): LifeState => ({
  v: 1, started: false, chapter: null, room: null, spawn: 'start', time: 'day',
  flags: {}, heart: 0, coins: 0, paid: [], envelopes: {}, funds: {}, collection: {}, energy: 100, standing: 10, met: [], seen: [], bonds: {}, keeps: [], wear: 'plain', done: {}, finished: false,
})

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** One event. An event this build does not know leaves the state as it was. */
export function apply(state: LifeState, event: LifeEvent): LifeState {
  switch (event.t) {
    case 'started': return {...state, started: true}
    case 'chapter': {
      // a new chapter is a new day: what happened today is gone, who he is stays
      const flags: Record<string, FlagValue> = {}
      for (const [k, v] of Object.entries(state.flags)) if (k.startsWith(LIFE_PREFIX)) flags[k] = v
      // …and he has slept: a new day starts rested
      return {...state, chapter: event.id, flags, finished: false, energy: 100}
    }
    case 'moved': return {...state, room: event.room, spawn: event.spawn, time: event.time, seen: state.seen.includes(event.room) ? state.seen : [...state.seen, event.room]}
    case 'flag': return {...state, flags: {...state.flags, [event.k]: event.v}}
    case 'heart': return {...state, heart: clamp(state.heart + event.by, 0, 100)}
    case 'bond': return {...state, bonds: {...state.bonds, [event.who]: clamp((state.bonds[event.who] ?? 50) + event.by, 0, 100)}}
    case 'coins': return {...state, coins: Math.max(0, state.coins + event.by)}
    case 'paid': return (state.paid ?? []).includes(event.order) ? state
      : {...state, coins: Math.max(0, state.coins + event.by), paid: [...(state.paid ?? []), event.order]}
    case 'envelope': {
      // in: never more than the wallet holds; out: never more than the envelope holds — money is moved, not made
      const env = state.envelopes?.[event.id] ?? 0
      const moved = event.by > 0 ? Math.min(event.by, state.coins) : -Math.min(-event.by, env)
      if (!moved) return state
      return {...state, coins: state.coins - moved, envelopes: {...state.envelopes, [event.id]: env + moved}}
    }
    case 'fund': return {...state, funds: {...state.funds, [event.id]: Math.max(0, (state.funds?.[event.id] ?? 0) + event.by)}}
    // the collection: a copy given or lent must be at hand; a copy back must be out. Nothing is made from nothing.
    case 'collected': {
      const e = entryOf(state, event.item)
      return event.n > 0 ? withEntry(state, event.item, {...e, n: e.n + event.n}) : state
    }
    case 'gave': {
      const e = entryOf(state, event.item)
      return atHand(e) > 0 ? withEntry(state, event.item, {...e, n: e.n - 1}) : state
    }
    case 'lent': {
      const e = entryOf(state, event.item)
      return atHand(e) > 0 ? withEntry(state, event.item, {...e, lent: [...e.lent, event.to]}) : state
    }
    case 'returned': {
      const e = entryOf(state, event.item)
      return e.lent.length ? withEntry(state, event.item, {...e, lent: e.lent.slice(1)}) : state
    }
    case 'energy': return {...state, energy: clamp(state.energy + event.by, 0, 100)}
    case 'standing': return {...state, standing: clamp(state.standing + event.by, 0, 100)}
    case 'met': return state.met.includes(event.who) ? state
      : {...state, met: [...state.met, event.who]}
    case 'keep': return state.keeps.includes(event.item) ? state : {...state, keeps: [...state.keeps, event.item]}
    case 'wear': return {...state, wear: event.what}
    case 'time': return {...state, time: event.to}
    case 'ended': return {...state, done: {...state.done, [event.chapter]: event.ending}}
    case 'made': return {...state, made: {...state.made, [event.a.id]: event.a}}
    default: return state
  }
}

const entryOf = (state: LifeState, item: string): CollectionEntry => state.collection?.[item] ?? {n: 0, lent: []}
const withEntry = (state: LifeState, item: string, e: CollectionEntry): LifeState => ({...state, collection: {...state.collection, [item]: e}})
/** copies he can put his hand on: owned and not out on loan */
export const atHand = (e: CollectionEntry | undefined): number => e ? Math.max(0, e.n - e.lent.length) : 0
/** doubles: copies beyond the first that are at hand */
export const doublesOf = (state: LifeState, item: string): number => Math.max(0, atHand(state.collection?.[item]) - 1)

export const fold = (events: readonly LifeEvent[]): LifeState => events.reduce(apply, emptyState())

const WEARS: Record<Wear, Wear[]> = {plain: ['plain'], shirt: ['shirt', 'both'], scarf: ['scarf', 'both'], both: ['both']}

export function meets(state: LifeState, c: Cond | undefined): boolean {
  if (!c) return true
  if ('flag' in c) { const v = state.flags[c.flag]; return v !== undefined && v !== false }
  if ('not' in c) { const v = state.flags[c.not]; return v === undefined || v === false }
  if ('is' in c) return state.flags[c.is[0]] === c.is[1]
  if ('all' in c) return c.all.every(x => meets(state, x))
  if ('any' in c) return c.any.some(x => meets(state, x))
  if ('none' in c) return !c.none.some(x => meets(state, x))
  if ('min' in c) return state[c.min[0]] >= c.min[1]
  if ('bond' in c) return (state.bonds[c.bond[0]] ?? 50) >= c.bond[1]
  if ('has' in c) return state.keeps.includes(c.has)
  if ('wears' in c) return WEARS[c.wears].includes(state.wear)
  if ('fund' in c) return (state.funds?.[c.fund[0]] ?? 0) >= c.fund[1]
  if ('saved' in c) return (state.envelopes?.[c.saved[0]] ?? 0) >= c.saved[1]
  if ('owns' in c) return atHand(state.collection?.[c.owns[0]]) >= c.owns[1]
  // a returning client: the order was paid in a chapter that is not this one
  if ('worked' in c) return (state.paid ?? []).some(p => p.endsWith(`/${c.worked}`) && !p.startsWith(`${state.chapter}/`))
  return false
}

/** A clock is running when its start holds, its job is not done, and it has not already run out. */
export const clockRunning = (c: import('./types').ClockDef, state: LifeState): boolean =>
  meets(state, c.from) && !meets(state, c.until) && !meets(state, {flag: c.fail})

/** What the shell has to DO after a conversation, as opposed to what the log has to remember. */
export type Directive =
  | {d: 'goto'; room: string; spawn: string; time?: 'day' | 'night'}
  | {d: 'play'; game: MiniGame | null; id: string; mission?: MissionCall; scope: WorkScope; then: Effect[]; good: Effect[]; slip: Effect[]}
  | {d: 'card'; card: string}
  | {d: 'sound'; cue: string}
  | {d: 'end'; ending: string}
  | {d: 'cine'; id: string}
  | {d: 'doc'; id: string}
  | {d: 'live'; id: string}
  | {d: 'stamp'; kind: import('./types').StampKind; text: string}

/** Effects become log rows (what happened) and directives (what the screen does next). */
export function eventsOf(effects: readonly Effect[] | undefined, state: LifeState): {events: LifeEvent[]; directives: Directive[]} {
  const events: LifeEvent[] = [], directives: Directive[] = []
  for (const fx of effects ?? []) {
    switch (fx.e) {
      case 'flag': events.push({t: 'flag', k: fx.k, v: fx.v ?? true}); break
      case 'heart': events.push({t: 'heart', by: fx.by}); break
      case 'bond': events.push({t: 'bond', who: fx.who, by: fx.by}); break
      case 'coins': events.push({t: 'coins', by: fx.by}); break
      case 'pay': events.push({t: 'paid', order: orderId(state, fx.order), by: fx.by}); break
      case 'envelope': events.push({t: 'envelope', id: fx.id, by: fx.by}); break
      case 'fund': events.push({t: 'fund', id: fx.id, by: fx.by}); break
      // out of the envelope and into the till: back to the wallet for a moment, then gone (never more than it held)
      case 'spend': { const n = Math.min(fx.by, state.envelopes?.[fx.from] ?? 0); if (n > 0) events.push({t: 'envelope', id: fx.from, by: -n}, {t: 'coins', by: -n}); break }
      case 'collect': events.push({t: 'collected', item: fx.item, n: fx.n ?? 1}); break
      case 'give': events.push({t: 'gave', item: fx.item, to: fx.to}); break
      case 'lend': events.push({t: 'lent', item: fx.item, to: fx.to}); break
      case 'back': events.push({t: 'returned', item: fx.item}); break
      case 'energy': events.push({t: 'energy', by: fx.by}); break
      case 'standing': events.push({t: 'standing', by: fx.by}); break
      case 'keep': events.push({t: 'keep', item: fx.item}); break
      case 'wear': events.push({t: 'wear', what: fx.what}); break
      case 'time': events.push({t: 'time', to: fx.to}); break
      case 'goto': directives.push({d: 'goto', room: fx.room, spawn: fx.spawn, time: fx.time}); break
      case 'play': directives.push({d: 'play', game: fx.game, id: fx.id, ...(fx.mission ? {mission: fx.mission} : {}), scope: fx.scope ?? 'full', then: fx.then ?? [], good: fx.good ?? [], slip: fx.slip ?? []}); break
      case 'card': directives.push({d: 'card', card: fx.card}); break
      case 'sound': directives.push({d: 'sound', cue: fx.cue}); break
      case 'end': if (state.chapter) directives.push({d: 'end', ending: fx.ending}); break
      case 'cine': directives.push({d: 'cine', id: fx.id}); break
      case 'doc': directives.push({d: 'doc', id: fx.id}); break
      case 'live': directives.push({d: 'live', id: fx.id}); break
      case 'stamp': directives.push({d: 'stamp', kind: fx.kind, text: fx.text}); break
    }
  }
  return {events, directives}
}

/** The id an order is paid under: the chapter it was done in, then the order. */
export const orderId = (state: LifeState, order: string): string => `${state.chapter ?? '-'}/${order}`
/** Has this order been paid already? (a second route to the same work asks this before it offers to pay) */
export const isPaid = (state: LifeState, order: string): boolean => (state.paid ?? []).includes(orderId(state, order))

/** What a small game does once it has been played: `then` always, then `good` (for 'good' and 'ok') or `slip`. */
export const afterPlay = (d: Extract<Directive, {d: 'play'}>, result: PlayResult): Effect[] => [...d.then, ...(result === 'slip' ? d.slip : d.good)]

/** The coins a game is about, for its tray and its target: what `then` and `good` would pay. */
export const playAmount = (d: Extract<Directive, {d: 'play'}>): number => [...d.then, ...d.good].reduce((n, fx) => n + ((fx.e === 'coins' || fx.e === 'pay') && fx.by > 0 ? fx.by : 0), 0)

export const chapterOf = (pack: LifePack, id: string | null): Chapter | null => pack.chapters.find(c => c.id === id) ?? null
/** The chapter after this one. With the state, chapters whose `when` does not hold for this life (a route not taken) are skipped. */
export function nextChapter(pack: LifePack, id: string, state?: LifeState): Chapter | null {
  const i = pack.chapters.findIndex(c => c.id === id)
  if (i < 0) return null
  for (let j = i + 1; j < pack.chapters.length; j++) { const c = pack.chapters[j]!; if (!state || !c.when || meets(state, c.when)) return c }
  return null
}

/** Chapters this life has not lived and could: a book that grew after the save was written. Routes not taken are not counted. */
export function untold(pack: LifePack, state: LifeState): Chapter[] {
  return pack.chapters.filter(c => !state.done[c.id] && (!c.when || meets(state, c.when)))
}

/** The rows that open a chapter: the chapter itself, then the room the day begins in. */
export function openChapter(chapter: Chapter): LifeEvent[] {
  return [{t: 'chapter', id: chapter.id}, {t: 'moved', room: chapter.start.room, spawn: chapter.start.spawn, time: chapter.start.time}]
}

/* ───────────── the life the shell holds ───────────── */

export type LifeStore = {read(key: string): string | null; write(key: string, value: string): void; clear(key: string): void}
/**
 * The one save key. Season One (29.10.2026) is THE script: a life saved by the second edition (`…:life:story2`) or the
 * first (`…:life`) is never read, so it is silently ignored — left in place, not deleted — and the supporter starts
 * the new season from its first episode.
 */
export const saveKey = (clubId: string) => `fan-life:club:${clubId}:life:season1`

export class Life {
  private log: LifeEvent[]
  private current: LifeState
  private readonly listeners = new Set<(s: LifeState) => void>()

  constructor(readonly pack: LifePack, events: readonly LifeEvent[] = [], private readonly store?: LifeStore) {
    this.log = [...events]
    this.current = fold(this.log)
  }

  get state(): LifeState { return this.current }
  events(): readonly LifeEvent[] { return this.log }

  dispatch(...events: LifeEvent[]): LifeState {
    if (!events.length) return this.current
    this.log.push(...events)
    this.current = events.reduce(apply, this.current)
    this.save()
    for (const fn of this.listeners) fn(this.current)
    return this.current
  }

  subscribe(fn: (s: LifeState) => void): () => void {
    this.listeners.add(fn)
    fn(this.current)
    return () => { this.listeners.delete(fn) }
  }

  /** Begin, or begin again: the first chapter of the pack. */
  begin(): LifeState {
    const first = this.pack.chapters[0]
    if (!first) return this.current
    this.log = []
    this.current = emptyState()
    return this.dispatch({t: 'started', pack: this.pack.version}, ...openChapter(first))
  }

  /** The day again, from its morning. The log is cut back to where the chapter opened. */
  restartChapter(): LifeState {
    const at = this.log.map(e => e.t).lastIndexOf('chapter')
    if (at < 0) return this.current
    const id = (this.log[at] as {id: string}).id, chapter = chapterOf(this.pack, id)
    if (!chapter) return this.current
    this.log = this.log.slice(0, at)
    this.current = fold(this.log)
    return this.dispatch(...openChapter(chapter))
  }

  save(): void {
    if (!this.store) return
    const file: SaveFile = {v: SAVE_VERSION, club: this.pack.clubId, pack: this.pack.version, events: this.log, savedAt: new Date().toISOString()}
    try { this.store.write(saveKey(this.pack.clubId), JSON.stringify(file)) } catch { /* a full or private store never stops the game */ }
  }

  static load(pack: LifePack, store: LifeStore): Life {
    try {
      const raw = store.read(saveKey(pack.clubId))
      if (raw) {
        const file = JSON.parse(raw) as Partial<SaveFile>
        // a life saved against chapters that no longer exist cannot be folded into this pack
        if (file.v === SAVE_VERSION && file.club === pack.clubId && Array.isArray(file.events) && readable(pack, file.events as LifeEvent[])) return new Life(pack, file.events as LifeEvent[], store)
      }
    } catch { /* an unreadable save is a new life */ }
    return new Life(pack, [], store)
  }
}

/** A save is readable when every chapter and room it names still exists in the pack (one rule, shared with the card: ./compat). */
export function readable(pack: LifePack, events: readonly LifeEvent[]): boolean {
  return compatible(compatOf(pack), events)
}
