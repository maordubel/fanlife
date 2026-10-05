/**
 * LIFE, universal — the engine. Pure TypeScript: no React, no canvas, no storage of its own.
 *
 * The life is an append-only log. `fold` turns it into a state; `meets` asks a question of that
 * state; `eventsOf` turns what a conversation decided into rows for the log. The shell holds a
 * `Life` and the simulator in the test suite holds the very same functions, which is the point:
 * what the tests walk is what the player walks.
 */
import type {Chapter, Cond, Effect, FlagValue, LifeEvent, LifePack, LifeState, SaveFile, Wear} from './types'

export const SAVE_VERSION = 1
/** A flag with this prefix is part of the person and outlives the chapter that raised it. */
export const LIFE_PREFIX = 'life:'

export const emptyState = (): LifeState => ({
  v: 1, started: false, chapter: null, room: null, spawn: 'start', time: 'day',
  flags: {}, heart: 0, coins: 0, bonds: {}, keeps: [], wear: 'plain', done: {}, finished: false,
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
      return {...state, chapter: event.id, flags, finished: false}
    }
    case 'moved': return {...state, room: event.room, spawn: event.spawn, time: event.time}
    case 'flag': return {...state, flags: {...state.flags, [event.k]: event.v}}
    case 'heart': return {...state, heart: clamp(state.heart + event.by, 0, 100)}
    case 'bond': return {...state, bonds: {...state.bonds, [event.who]: clamp((state.bonds[event.who] ?? 50) + event.by, 0, 100)}}
    case 'coins': return {...state, coins: Math.max(0, state.coins + event.by)}
    case 'keep': return state.keeps.includes(event.item) ? state : {...state, keeps: [...state.keeps, event.item]}
    case 'wear': return {...state, wear: event.what}
    case 'time': return {...state, time: event.to}
    case 'ended': return {...state, done: {...state.done, [event.chapter]: event.ending}}
    default: return state
  }
}

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
  if ('min' in c) return (c.min[0] === 'heart' ? state.heart : state.coins) >= c.min[1]
  if ('bond' in c) return (state.bonds[c.bond[0]] ?? 50) >= c.bond[1]
  if ('has' in c) return state.keeps.includes(c.has)
  if ('wears' in c) return WEARS[c.wears].includes(state.wear)
  return false
}

/** What the shell has to DO after a conversation, as opposed to what the log has to remember. */
export type Directive =
  | {d: 'goto'; room: string; spawn: string; time?: 'day' | 'night'}
  | {d: 'play'; game: 'tune' | 'clap' | 'carry' | 'count'; id: string; then: Effect[]}
  | {d: 'card'; card: string}
  | {d: 'sound'; cue: string}
  | {d: 'end'; ending: string}

/** Effects become log rows (what happened) and directives (what the screen does next). */
export function eventsOf(effects: readonly Effect[] | undefined, state: LifeState): {events: LifeEvent[]; directives: Directive[]} {
  const events: LifeEvent[] = [], directives: Directive[] = []
  for (const fx of effects ?? []) {
    switch (fx.e) {
      case 'flag': events.push({t: 'flag', k: fx.k, v: fx.v ?? true}); break
      case 'heart': events.push({t: 'heart', by: fx.by}); break
      case 'bond': events.push({t: 'bond', who: fx.who, by: fx.by}); break
      case 'coins': events.push({t: 'coins', by: fx.by}); break
      case 'keep': events.push({t: 'keep', item: fx.item}); break
      case 'wear': events.push({t: 'wear', what: fx.what}); break
      case 'time': events.push({t: 'time', to: fx.to}); break
      case 'goto': directives.push({d: 'goto', room: fx.room, spawn: fx.spawn, time: fx.time}); break
      case 'play': directives.push({d: 'play', game: fx.game, id: fx.id, then: fx.then ?? []}); break
      case 'card': directives.push({d: 'card', card: fx.card}); break
      case 'sound': directives.push({d: 'sound', cue: fx.cue}); break
      case 'end': if (state.chapter) directives.push({d: 'end', ending: fx.ending}); break
    }
  }
  return {events, directives}
}

export const chapterOf = (pack: LifePack, id: string | null): Chapter | null => pack.chapters.find(c => c.id === id) ?? null
export function nextChapter(pack: LifePack, id: string): Chapter | null {
  const i = pack.chapters.findIndex(c => c.id === id)
  return i >= 0 ? pack.chapters[i + 1] ?? null : null
}

/** The rows that open a chapter: the chapter itself, then the room the day begins in. */
export function openChapter(chapter: Chapter): LifeEvent[] {
  return [{t: 'chapter', id: chapter.id}, {t: 'moved', room: chapter.start.room, spawn: chapter.start.spawn, time: chapter.start.time}]
}

/* ───────────── the life the shell holds ───────────── */

export type LifeStore = {read(key: string): string | null; write(key: string, value: string): void; clear(key: string): void}
export const saveKey = (clubId: string) => `fan-life:club:${clubId}:life`

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

/** A save is readable when every chapter and room it names still exists in the pack. */
export function readable(pack: LifePack, events: readonly LifeEvent[]): boolean {
  const chapters = new Set(pack.chapters.map(c => c.id))
  return events.every(e => (e.t !== 'chapter' || chapters.has(e.id)) && (e.t !== 'moved' || Object.hasOwn(pack.rooms, e.room)))
}
