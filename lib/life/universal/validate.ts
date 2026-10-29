/**
 * LIFE, universal — the checks a chapter has to pass before anybody plays it.
 *
 * These are the faults that do not crash and do not show in a screenshot: a door to a room the
 * pack does not have, a person who can be spoken to and has nothing to say, a goal waiting on a
 * flag nothing raises. Each is one line here; each was a week of somebody's time in the
 * hand-authored LIFE.
 */
import type {Chapter, Cond, Effect, LifePack} from './types'
import {beatFlag} from './world'

const flagsOf = (c: Cond | undefined, out: Set<string>): Set<string> => {
  if (!c) return out
  if ('flag' in c) out.add(c.flag)
  else if ('not' in c) out.add(c.not)
  else if ('is' in c) out.add(c.is[0])
  else if ('all' in c) c.all.forEach(x => flagsOf(x, out))
  else if ('any' in c) c.any.forEach(x => flagsOf(x, out))
  else if ('none' in c) c.none.forEach(x => flagsOf(x, out))
  return out
}

function effectsOf(chapter: Chapter): Effect[] {
  const out: Effect[] = []
  const walk = (list: readonly Effect[] | undefined) => { for (const fx of list ?? []) { out.push(fx); if (fx.e === 'play') { walk(fx.then); walk(fx.good); walk(fx.slip) } } }
  for (const t of chapter.talks) for (const b of t.branches) { walk(b.then); for (const c of b.choices ?? []) walk(c.then) }
  return out
}

export function validateChapter(pack: Pick<LifePack, 'rooms' | 'cast'>, chapter: Chapter, earlierFlags: ReadonlySet<string> = new Set()): string[] {
  const issues: string[] = [], say = (m: string) => issues.push(`${chapter.id}: ${m}`)
  const talks = new Map(chapter.talks.map(t => [t.id, t]))
  if (talks.size !== chapter.talks.length) say('duplicate talk id')
  const room = (id: string, what: string) => { if (!Object.hasOwn(pack.rooms, id)) say(`${what} names a room the pack does not have: ${id}`); return pack.rooms[id] }
  const start = room(chapter.start.room, 'start')
  if (start && !start.spawns[chapter.start.spawn]) say(`start spawn missing: ${chapter.start.room}.${chapter.start.spawn}`)
  for (const p of chapter.cast) {
    const r = room(p.room, `cast ${p.who}`)
    if (r && !r.slots[p.slot]) say(`cast ${p.who}: no slot ${p.room}.${p.slot}`)
    if (!Object.hasOwn(pack.cast, p.who)) say(`cast: unknown person ${p.who}`)
    if (p.talk && !talks.has(p.talk)) say(`cast ${p.who}: no talk ${p.talk}`)
  }
  const spotIds = new Set<string>()
  for (const s of chapter.spots) {
    if (spotIds.has(s.id)) say(`duplicate spot id ${s.id}`); spotIds.add(s.id)
    const r = room(s.room, `spot ${s.id}`)
    if (r && !r.spots[s.spot]) say(`spot ${s.id}: no spot ${s.room}.${s.spot}`)
    if (!talks.has(s.talk)) say(`spot ${s.id}: no talk ${s.talk}`)
    if (!s.label.trim()) say(`spot ${s.id}: no label`)
  }
  const doorIds = new Set<string>()
  for (const d of chapter.doors) {
    if (doorIds.has(d.id)) say(`duplicate door id ${d.id}`); doorIds.add(d.id)
    const r = room(d.room, `door ${d.id}`), to = room(d.to, `door ${d.id} target`)
    if (r && !r.doors[d.door]) say(`door ${d.id}: no door ${d.room}.${d.door}`)
    if (to && !to.spawns[d.spawn]) say(`door ${d.id}: no spawn ${d.to}.${d.spawn}`)
    if (d.needs && !d.blocked) say(`door ${d.id}: a locked door has to say why`)
    if (!d.label.trim()) say(`door ${d.id}: no label`)
  }
  for (const b of chapter.beats) { room(b.room, `beat ${b.id}`); if (!talks.has(b.talk)) say(`beat ${b.id}: no talk ${b.talk}`) }
  const raised = new Set<string>(chapter.beats.map(b => beatFlag(b.id)))
  const endings = new Set<string>()
  for (const fx of effectsOf(chapter)) {
    if (fx.e === 'flag') raised.add(fx.k)
    if (fx.e === 'end') { endings.add(fx.ending); if (!chapter.endings[fx.ending]) say(`ending not defined: ${fx.ending}`) }
    if (fx.e === 'goto') { const r = room(fx.room, 'goto'); if (r && !r.spawns[fx.spawn]) say(`goto: no spawn ${fx.room}.${fx.spawn}`) }
    if (fx.e === 'card' && !chapter.cards?.some(c => c.id === fx.card)) say(`card not defined: ${fx.card}`)
    if (fx.e === 'keep' && !chapter.keepsakes?.some(k => k.id === fx.item)) say(`keepsake not defined: ${fx.item}`)
    if (fx.e === 'bond' && !Object.hasOwn(pack.cast, fx.who)) say(`bond with unknown person ${fx.who}`)
    if (fx.e === 'cine' && !chapter.cines?.some(c => c.id === fx.id)) say(`cine not defined: ${fx.id}`)
    if (fx.e === 'doc' && !chapter.docs?.some(c => c.id === fx.id)) say(`interview not defined: ${fx.id}`)
    if (fx.e === 'live' && !chapter.lives?.some(c => c.id === fx.id)) say(`live night not defined: ${fx.id}`)
    if (fx.e === 'live' && !chapter.anchor) say(`live night ${fx.id} with no archive row under it`)
  }
  // Season One: what the screen stages has to name people who exist and say something
  const who = (id: string, what: string) => { if (id !== 'me' && id !== 'all' && id !== 'think' && !Object.hasOwn(pack.cast, id)) say(`${what}: unknown person ${id}`) }
  for (const c of chapter.cines ?? []) { if (!c.shots.length) say(`cine ${c.id}: no shots`); for (const sh of c.shots) { sh.on?.forEach(x => who(x, `cine ${c.id}`)); sh.act?.forEach(a => who(a.who, `cine ${c.id}`)); if (sh.say?.who && sh.say.who !== 'me') who(sh.say.who, `cine ${c.id}`) } }
  for (const d of chapter.docs ?? []) { who(d.who, `interview ${d.id}`); if (!d.lines.some(l => !l.when)) say(`interview ${d.id}: no line that is always said`) }
  for (const l of chapter.lives ?? []) { l.with.forEach(x => who(x, `live ${l.id}`)); if (!l.end.unread.length) say(`live ${l.id}: nothing to say over a night it cannot read`) }
  for (const b of chapter.barks ?? []) { who(b.who, `bark ${b.id}`); room(b.room, `bark ${b.id}`); if (!b.lines.length) say(`bark ${b.id}: no lines`) }
  for (const c of chapter.clocks ?? []) {
    raised.add(c.fail)
    if (c.talk && !talks.has(c.talk)) say(`clock ${c.id}: no talk ${c.talk}`)
    if (!(c.s > 0)) say(`clock ${c.id}: no time on it`)
  }
  for (const id of chapter.side ?? []) if (!chapter.objectives.some(o => o.id === id)) say(`side job is not an objective: ${id}`)
  const ep = chapter.episode
  if (ep?.open?.doc && !chapter.docs?.some(d => d.id === ep.open!.doc)) say(`cold open: no interview ${ep.open.doc}`)
  if (ep?.open?.cine && !chapter.cines?.some(c => c.id === ep.open!.cine)) say(`cold open: no cine ${ep.open.cine}`)
  if (ep?.flash && !chapter.cines?.some(c => c.id === ep.flash!.cine)) say(`flash: no cine ${ep.flash.cine}`)
  for (const id of ep?.close ?? []) if (!chapter.docs?.some(d => d.id === id)) say(`end card: no interview ${id}`)
  for (const id of chapter.episode?.main ?? []) if (!chapter.objectives.some(o => o.id === id)) say(`main mission is not an objective: ${id}`)
  if (!endings.size) say('nothing ends the chapter')
  for (const key of Object.keys(chapter.endings)) if (!endings.has(key)) say(`ending never reached by any effect: ${key}`)
  for (const [key, e] of Object.entries(chapter.endings)) if (e.keep && !chapter.keepsakes?.some(k => k.id === e.keep)) say(`ending ${key}: keepsake not defined: ${e.keep}`)
  for (const t of chapter.talks) {
    if (!t.branches.length) { say(`talk ${t.id}: empty`); continue }
    if (t.branches[t.branches.length - 1]!.when) say(`talk ${t.id}: the last branch must have no condition — there is always something to say`)
    for (const [i, b] of t.branches.entries()) {
      if (!b.lines.length) say(`talk ${t.id}[${i}]: no lines`)
      for (const l of b.lines) { if (!l.t.trim()) say(`talk ${t.id}[${i}]: empty line`); if (l.who && l.who !== 'me' && l.who !== 'think' && !Object.hasOwn(pack.cast, l.who)) say(`talk ${t.id}[${i}]: unknown speaker ${l.who}`) }
      if (b.next && !talks.has(b.next)) say(`talk ${t.id}[${i}]: next → missing talk ${b.next}`)
      const ids = new Set<string>()
      for (const c of b.choices ?? []) {
        if (ids.has(c.id)) say(`talk ${t.id}[${i}]: duplicate choice ${c.id}`); ids.add(c.id)
        if (c.next && !talks.has(c.next)) say(`talk ${t.id}[${i}].${c.id}: next → missing talk ${c.next}`)
      }
      // a question whose every answer is conditional can leave the player with a box and nothing to press
      if (b.choices?.length && b.choices.every(c => c.when)) say(`talk ${t.id}[${i}]: every choice is conditional — one must always be there`)
      // a moment that runs out must fall on an answer that is always there
      if (b.timer && !(b.choices ?? []).some(c => c.id === b.timer!.pick && !c.when)) say(`talk ${t.id}[${i}]: the timer's answer ${b.timer.pick} is not an unconditional choice`)
    }
  }
  const used = new Set<string>()
  flagsOf(chapter.when, used)
  const read = (c: Cond | undefined) => flagsOf(c, used)
  chapter.cast.forEach(p => read(p.when)); chapter.spots.forEach(s => read(s.when)); chapter.doors.forEach(d => { read(d.when); read(d.needs) })
  chapter.beats.forEach(b => read(b.when)); chapter.objectives.forEach(o => read(o.done))
  chapter.talks.forEach(t => t.branches.forEach(b => { read(b.when); b.choices?.forEach(c => read(c.when)) }))
  chapter.clocks?.forEach(c => { read(c.from); read(c.until) }); chapter.barks?.forEach(b => read(b.when))
  for (const k of used) if (!raised.has(k) && !earlierFlags.has(k)) say(`flag is read and never raised: ${k}`)
  if (!chapter.objectives.length) say('no objective: the player is never told what the day wants')
  const referenced = new Set<string>([...chapter.cast.map(p => p.talk), ...chapter.spots.map(s => s.talk), ...chapter.beats.map(b => b.talk), ...(chapter.clocks ?? []).map(c => c.talk)].filter((x): x is string => !!x))
  chapter.talks.forEach(t => t.branches.forEach(b => { if (b.next) referenced.add(b.next); b.choices?.forEach(c => { if (c.next) referenced.add(c.next) }) }))
  for (const t of chapter.talks) if (!referenced.has(t.id)) say(`talk is written and nothing opens it: ${t.id}`)
  return issues
}

/** Flags a chapter leaves behind for the ones after it (`life:` flags). */
export function lifeFlagsOf(chapter: Chapter): string[] {
  return effectsOf(chapter).flatMap(fx => fx.e === 'flag' && fx.k.startsWith('life:') ? [fx.k] : [])
}

/* ───────────── money spent without a check (owner's spec §2, §8) ───────────── */

/**
 * The purses a spend can come out of: the wallet (`coins`) and every fund held for others (`fund:coach`). A fund is
 * floored at zero exactly like the wallet, so spending it needs the same check.
 */
type Purse = string
/** What a condition guarantees a purse holds (`min coins` / `fund` reached through `all`; `any` and `none` guarantee nothing). */
function guaranteed(c: Cond | undefined, purse: Purse = 'coins'): number {
  if (!c) return 0
  if (purse === 'coins' && 'min' in c && c.min[0] === 'coins') return c.min[1]
  if ('fund' in c && purse === `fund:${c.fund[0]}`) return c.fund[1]
  if ('saved' in c && purse === `saved:${c.saved[0]}`) return c.saved[1]
  if ('all' in c) return Math.max(0, ...c.all.map(x => guaranteed(x, purse)))
  return 0
}
/** What a list of effects takes out of each purse straight away (a play's `then` happens whatever the go). */
function spendOf(list: readonly Effect[] | undefined, into: Map<Purse, number> = new Map()): Map<Purse, number> {
  for (const fx of list ?? []) {
    if (fx.e === 'coins' && fx.by < 0) into.set('coins', (into.get('coins') ?? 0) - fx.by)
    if (fx.e === 'fund' && fx.by < 0) into.set(`fund:${fx.id}`, (into.get(`fund:${fx.id}`) ?? 0) - fx.by)
    if (fx.e === 'spend' && fx.by > 0) into.set(`saved:${fx.from}`, (into.get(`saved:${fx.from}`) ?? 0) + fx.by)
    if (fx.e === 'play') spendOf(fx.then, into)
  }
  return into
}

/**
 * Every choice (or branch) that spends coins — or money held for others — without a condition saying the purse
 * holds it. The engine floors both at zero, which is not a price check: the player "buys" with money he does not
 * have. `tests/fixtures/life-unguarded-spends.json` holds today's offenders: it may only shrink (it is empty).
 */
export function unguardedSpends(pack: Pick<LifePack, 'chapters'>): string[] {
  const out: string[] = []
  for (const ch of pack.chapters) {
  // A screenplay option is chosen in one talk and done in another (`<scene>:act`): the choice sets a pick
  // flag, and the branch that spends is gated on that pick. The purse was checked when the choice was
  // offered, so a branch gated on a guarded pick is guarded too (#275's F03 shirt is bought that way).
  const picked = new Map<string, Cond[]>()
  for (const t of ch.talks) for (const b of t.branches) for (const c of b.choices ?? []) {
    for (const fx of c.then ?? []) if (fx.e === 'flag' && typeof fx.v === 'string') {
      const k = `${fx.k}=${fx.v}`
      picked.set(k, [...(picked.get(k) ?? []), {all: [b.when ?? {all: []}, c.when ?? {all: []}]}])
    }
  }
  const viaPick = (c: Cond | undefined, purse: Purse): number => {
    if (!c) return 0
    if ('is' in c && Array.isArray(c.is)) return Math.max(0, ...(picked.get(`${c.is[0]}=${String(c.is[1])}`) ?? []).map(x => guaranteed(x, purse)))
    if ('all' in c) return Math.max(0, ...c.all.map(x => viaPick(x, purse)))
    return 0
  }
  const over = (spent: Map<Purse, number>, ...holds: Cond[]): boolean =>
    [...spent].some(([purse, n]) => n > Math.max(0, ...holds.map(h => Math.max(guaranteed(h, purse), viaPick(h, purse)))))
  for (const t of ch.talks) t.branches.forEach((b, i) => {
    const bw = b.when ?? {all: []}
    if (!b.choices?.length) { if (over(spendOf(b.then), bw)) out.push(`${ch.id}:${t.id}[${i}]`) }
    for (const c of b.choices ?? []) if (over(spendOf(c.then), bw, c.when ?? {all: []})) out.push(`${ch.id}:${t.id}:${c.id}`)
  })
  }
  return out
}

export function validatePack(pack: LifePack): string[] {
  const issues: string[] = [], earlier = new Set<string>(), ids = new Set<string>()
  for (const chapter of pack.chapters) {
    if (ids.has(chapter.id)) issues.push(`duplicate chapter id ${chapter.id}`); ids.add(chapter.id)
    issues.push(...validateChapter(pack, chapter, earlier))
    lifeFlagsOf(chapter).forEach(k => earlier.add(k))
  }
  return issues
}
