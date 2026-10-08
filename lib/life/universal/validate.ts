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
  }
  if (!endings.size) say('nothing ends the chapter')
  for (const key of Object.keys(chapter.endings)) if (!endings.has(key)) say(`ending never reached by any effect: ${key}`)
  for (const [key, e] of Object.entries(chapter.endings)) if (e.keep && !chapter.keepsakes?.some(k => k.id === e.keep)) say(`ending ${key}: keepsake not defined: ${e.keep}`)
  for (const t of chapter.talks) {
    if (!t.branches.length) { say(`talk ${t.id}: empty`); continue }
    if (t.branches[t.branches.length - 1]!.when) say(`talk ${t.id}: the last branch must have no condition — there is always something to say`)
    for (const [i, b] of t.branches.entries()) {
      if (!b.lines.length) say(`talk ${t.id}[${i}]: no lines`)
      for (const l of b.lines) { if (!l.t.trim()) say(`talk ${t.id}[${i}]: empty line`); if (l.who && l.who !== 'me' && !Object.hasOwn(pack.cast, l.who)) say(`talk ${t.id}[${i}]: unknown speaker ${l.who}`) }
      if (b.next && !talks.has(b.next)) say(`talk ${t.id}[${i}]: next → missing talk ${b.next}`)
      const ids = new Set<string>()
      for (const c of b.choices ?? []) {
        if (ids.has(c.id)) say(`talk ${t.id}[${i}]: duplicate choice ${c.id}`); ids.add(c.id)
        if (c.next && !talks.has(c.next)) say(`talk ${t.id}[${i}].${c.id}: next → missing talk ${c.next}`)
      }
      // a question whose every answer is conditional can leave the player with a box and nothing to press
      if (b.choices?.length && b.choices.every(c => c.when)) say(`talk ${t.id}[${i}]: every choice is conditional — one must always be there`)
    }
  }
  const used = new Set<string>()
  const read = (c: Cond | undefined) => flagsOf(c, used)
  chapter.cast.forEach(p => read(p.when)); chapter.spots.forEach(s => read(s.when)); chapter.doors.forEach(d => { read(d.when); read(d.needs) })
  chapter.beats.forEach(b => read(b.when)); chapter.objectives.forEach(o => read(o.done))
  chapter.talks.forEach(t => t.branches.forEach(b => { read(b.when); b.choices?.forEach(c => read(c.when)) }))
  for (const k of used) if (!raised.has(k) && !earlierFlags.has(k)) say(`flag is read and never raised: ${k}`)
  if (!chapter.objectives.length) say('no objective: the player is never told what the day wants')
  const referenced = new Set<string>([...chapter.cast.map(p => p.talk), ...chapter.spots.map(s => s.talk), ...chapter.beats.map(b => b.talk)].filter((x): x is string => !!x))
  chapter.talks.forEach(t => t.branches.forEach(b => { if (b.next) referenced.add(b.next); b.choices?.forEach(c => { if (c.next) referenced.add(c.next) }) }))
  for (const t of chapter.talks) if (!referenced.has(t.id)) say(`talk is written and nothing opens it: ${t.id}`)
  return issues
}

/** Flags a chapter leaves behind for the ones after it (`life:` flags). */
export function lifeFlagsOf(chapter: Chapter): string[] {
  return effectsOf(chapter).flatMap(fx => fx.e === 'flag' && fx.k.startsWith('life:') ? [fx.k] : [])
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
