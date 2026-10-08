import {ROOMS} from '../rooms'
import type {Branch, Chapter, Choice, Cond, Effect, Line, Placement, Talk} from '../types'
import type {Callback, ChapterScript, Option, SceneScript, Speech, Words} from './types'
import {echoCallbacks} from './echo'
import {inTown, LABEL, pathRooms, ROLE_SLOT, SLOT_PREF, SPOT_PREF, townDoors} from './town'

/** Most callbacks one scene may carry: every combination that can hold at once is a branch of its own. */
export const MAX_CALLBACKS = 4
const ECHO = ['life:night:win', 'life:night:loss', 'life:night:draw']

/** The condition as it will read once an option's own flag effects have been applied: the cut it triggers may depend on what the same choice records. */
function settle(c: Cond, fx: readonly Effect[]): Cond {
  const set = new Map<string, string | number | boolean>()
  for (const e of fx) if (e.e === 'flag') set.set(e.k, e.v ?? true)
  const go = (x: Cond): Cond => {
    if ('is' in x && set.has(x.is[0])) return set.get(x.is[0]) === x.is[1] ? {all: []} : {any: []}
    if ('flag' in x && set.has(x.flag)) return set.get(x.flag) ? {all: []} : {any: []}
    if ('not' in x && set.has(x.not)) return set.get(x.not) ? {any: []} : {all: []}
    if ('all' in x) return {all: x.all.map(go)}
    if ('any' in x) return {any: x.any.map(go)}
    if ('none' in x) return {none: x.none.map(go)}
    return x
  }
  return go(c)
}

const allOf = (...cs: (Cond | undefined)[]): Cond => ({all: cs.filter((c): c is Cond => !!c)})

/** Every non-empty combination of callbacks, largest first: when several hold they are all told, never just the first. */
export function callbackSubsets(callbacks: readonly Callback[]): Callback[][] {
  const out: Callback[][] = []
  const n = callbacks.length
  for (let mask = (1 << n) - 1; mask > 0; mask--) {
    const chosen = callbacks.filter((_, i) => mask & (1 << i))
    const groups = chosen.map(c => c.group).filter((g): g is string => !!g)
    if (new Set(groups).size !== groups.length) continue   // two of one exclusive group cannot hold together
    out.push(chosen)
  }
  return out.sort((a, b) => b.length - a.length)
}

/** A choice records intent. Its consequences are committed only after the world action. */
export function compileScript(script: ChapterScript, locale: 'en' | 'he'): Chapter {
  const he = locale === 'he'
  const word = (w: Words) => w[he ? 1 : 0]
  const lines = (ss: readonly Speech[]): Line[] => ss.map(s => ({who: s[0], t: s[he ? 2 : 1]}))
  const scenes = script.scenes, ids = new Map(scenes.map((s, i) => [s.id, i]))
  const doneF = (id: string) => `story:${script.id}:${id}:done`, pickF = (id: string) => `story:${script.id}:${id}:pick`
  const afterOf = (s: SceneScript, i: number): string[] => s.after ?? (i > 0 ? [scenes[i - 1]!.id] : [])
  scenes.forEach((s, i) => { for (const a of afterOf(s, i)) if (!(ids.has(a) && ids.get(a)! < i)) throw new Error(`STORY_AFTER:${script.id}.${s.id}→${a}`) })
  const openC = (s: SceneScript, i: number): Cond => allOf(...afterOf(s, i).map(a => ({flag: doneF(a)}) as Cond), {not: doneF(s.id)}, s.when)
  const choosingC = (s: SceneScript, i: number): Cond => allOf(openC(s, i), {not: pickF(s.id)})
  const doingC = (s: SceneScript): Cond => allOf({flag: pickF(s.id)}, {not: doneF(s.id)})
  const sayDone: Line[] = [{who: null, t: he ? 'הרגע הזה כבר קרה. אפשר להמשיך.' : 'This moment has already happened. Keep going.'}]

  const talks: Talk[] = [], mains: Placement[] = [], companions: Placement[] = [], follows: Placement[] = [], spots: Chapter['spots'] = []
  const beats: Chapter['beats'] = [], objectives: Chapter['objectives'] = [], endings: Chapter['endings'] = {}
  const roomsUsed = new Set<string>([scenes[0]!.room])
  const east: {dest: string; when: Cond}[] = []
  const endingFrom = new Map<string, string>()

  // ───── who is in the room: one slot per person, never two on one spot
  const slotMemo = new Map<string, string>()
  const slotFor = (used: Set<string>, room: string, who: string, wanted?: string, group = ''): string => {
    const geo = ROOMS[room]
    if (!geo) throw new Error(`STORY_ROOM:${room}`)
    const memo = `${group}|${room}|${who}`
    if (wanted) { if (!geo.slots[wanted]) throw new Error(`STORY_SLOT:${room}.${wanted}`); used.add(wanted); slotMemo.set(memo, wanted); return wanted }
    const known = slotMemo.get(memo)
    if (known) return known
    const role = ROLE_SLOT[room]?.[who]
    const order = [...(role ? [role] : []), ...(SLOT_PREF[room] ?? []), ...Object.keys(geo.slots)].filter((k, i, a) => geo.slots[k] && a.indexOf(k) === i)
    const free = order.find(k => !used.has(k)) ?? order[0]!
    used.add(free); slotMemo.set(memo, free)
    return free
  }
  const spotFor = (room: string, wanted: string | undefined, avoid?: string): string => {
    const geo = ROOMS[room]
    if (!geo) throw new Error(`STORY_ROOM:${room}`)
    if (wanted) { if (!geo.spots[wanted]) throw new Error(`STORY_SPOT:${room}.${wanted}`); return wanted }
    const order = [...(SPOT_PREF[room] ?? []), ...Object.keys(geo.spots)].filter(k => geo.spots[k])
    return order.find(k => k !== avoid) ?? order[0]!
  }
  const sharedUse = new Map<string, Map<string, Set<string>>>()
  const usedIn = (s: SceneScript, room: string) => {
    const key = s.hub ?? s.id
    if (!sharedUse.has(key)) sharedUse.set(key, new Map())
    const rooms = sharedUse.get(key)!
    if (!rooms.has(room)) rooms.set(room, new Set())
    return rooms.get(room)!
  }

  // what a scene says by itself when the person it is with is not here
  const without = (ss: readonly Speech[], who: string): Speech[] => ss.filter(s => s[0] !== who)
  const soloLines = (s: SceneScript): Speech[] => {
    const own = s.solo ?? without(s.lines, s.who)
    if (!own.length) throw new Error(`STORY_SOLO:${s.id} has no lines without ${s.who}`)
    return [...own]
  }
  const alone: Speech = [null, 'You do it by yourself.', 'אתה עושה את זה לבד.']

  scenes.forEach((scene, n) => {
    if (!ROOMS[scene.room]) throw new Error(`STORY_ROOM:${scene.room}`)
    const root = `${scene.id}:${'choose'}`, task = `${scene.id}:act`, pick = pickF(scene.id)
    const open = openC(scene, n), choosing = choosingC(scene, n), doing = doingC(scene)
    const present: Cond | undefined = scene.presence
    const group = scene.hub ?? scene.id
    const locations = scene.locations ?? [{room: scene.room, when: {all: []} as Cond}]
    for (const l of locations) roomsUsed.add(l.room)
    if (scene.east) east.push({dest: scene.east, when: {any: [open, doing]}})

    // everyone who speaks in this scene is in the room while it is open
    const speakers = new Set<string>()
    const note = (ss: readonly Speech[] | undefined) => ss?.forEach(x => { if (x[0] && x[0] !== 'me') speakers.add(x[0]) })
    note(scene.lines); note(scene.action); scene.callbacks?.forEach(c => note(c.lines)); scene.options.forEach(o => { note(o.reply); note(o.action) })
    speakers.delete(scene.who)
    for (const g of scene.company ?? []) speakers.delete(g.who)
    for (const e of scene.escort ?? []) speakers.delete(e.who)

    for (const location of locations) {
      const used = usedIn(scene, location.room)
      const chooseHere: Cond = allOf(choosing, location.when), doHere: Cond = allOf(doing, location.when)
      mains.push({who: scene.who, room: location.room, slot: slotFor(used, location.room, scene.who, location.slot ?? scene.slot, group), talk: root,
        when: present ? allOf(chooseHere, present) : chooseHere, mark: true})
      for (const guest of scene.company ?? []) companions.push({who: guest.who, room: location.room, slot: guest.slot, when: allOf(open, location.when, guest.when), mark: false})
      for (const who of speakers) companions.push({who, room: location.room, slot: slotFor(used, location.room, who, undefined, group), when: allOf(open, location.when), mark: false})
      beats.push({id: `${root}:${location.room}`, room: location.room, when: chooseHere, talk: root})
      const act = spotFor(location.room, location.spot ?? scene.spot)
      spots.push({id: `${root}:${location.room}`, room: location.room, spot: spotFor(location.room, undefined, act), talk: root, when: chooseHere, verb: 'look', label: word(scene.title)})
      spots.push({id: `${task}:${location.room}`, room: location.room, spot: act, talk: task, when: doHere, verb: scene.verb ?? 'use', label: word(scene.task)})
    }
    for (const e of scene.escort ?? []) for (const room of e.rooms) {
      if (!ROOMS[room]) throw new Error(`STORY_ROOM:${room}`)
      roomsUsed.add(room)
      follows.push({who: e.who, room, slot: slotFor(usedIn(scene, room), room, e.who, undefined, group), follow: true, when: open, mark: false})
    }

    // ───── the opening conversation
    const choices = (suffix: string): Choice[] => scene.options.map(o => ({id: o.id, t: word(o.text), when: o.when, then: [{e: 'flag' as const, k: pick, v: o.id}], next: `${scene.id}:${o.id}:${suffix}`}))
    const entry = afterOf(scene, n).length === 0
    const callbacksHere: Callback[] = [...(entry ? echoCallbacks(scene.who, he) : []), ...(scene.callbacks ?? [])]
    const stacks = callbackSubsets(callbacksHere)
    const branches: Branch[] = []
    if (present) branches.push({when: allOf(choosing, {none: [present]}), lines: lines(soloLines(scene)), choices: choices('solo')})
    for (const subset of stacks) branches.push({when: allOf(choosing, present, ...subset.map(c => c.when)), lines: [...subset.flatMap(c => lines(c.lines)), ...lines(scene.lines)], choices: choices('reply')})
    branches.push({when: choosing, lines: lines(scene.lines), choices: choices('reply')})
    branches.push({lines: sayDone})
    talks.push({id: root, branches})
    for (const o of scene.options) {
      talks.push({id: `${scene.id}:${o.id}:reply`, branches: [{lines: lines(o.reply)}]})
      if (present) {
        const reply = o.soloReply ?? without(o.reply, scene.who)
        talks.push({id: `${scene.id}:${o.id}:solo`, branches: [{lines: lines(reply.length ? reply : [alone])}]})
      }
    }

    // ───── what doing it does
    const successors = scenes.filter((m, j) => afterOf(m, j).includes(scene.id))
    const next = successors.length === 1 && afterOf(successors[0]!, scenes.indexOf(successors[0]!)).length === 1 && !successors[0]!.when ? successors[0]! : null
    const here = scene.locations?.[0]?.room ?? scene.room
    const mustCut = !!next && (next.cut === true || !next.locations && (!inTown(here) || !inTown(next.room) || (pathRooms(here, next.room)?.length ?? 99) > 4))
    const destinations = next && mustCut ? (next.locations ?? [{room: next.room, when: {all: []} as Cond}]) : [null]
    const last = n === scenes.length - 1 || !!scene.final
    const actionBranches: Branch[] = []
    const wearBranches = (o: Option): {when?: Cond; fx: Effect[]}[] => {
      if (!o.wearAdd) return [{fx: []}]
      const other = o.wearAdd === 'shirt' ? 'scarf' : 'shirt'
      return [
        {when: {any: [{wears: other}, {wears: 'both'}]}, fx: [{e: 'wear', what: 'both'}]},
        {when: {all: [{wears: 'plain'}]}, fx: [{e: 'wear', what: o.wearAdd}]},
        {when: {all: [{wears: o.wearAdd}]}, fx: [{e: 'wear', what: o.wearAdd}]},
      ]
    }
    for (const o of scene.options) for (const dest of destinations) for (const wear of wearBranches(o)) for (const solo of present ? [true, false] : [false]) {
      const done: Effect[] = [...(scene.sound ? [{e: 'sound' as const, cue: scene.sound}] : []), ...(o.effects ?? []), ...wear.fx,
        {e: 'flag', k: `life:decision:${scene.id}`, v: o.id}, {e: 'flag', k: doneF(scene.id)}]
      if (last) for (const k of ECHO) done.push({e: 'flag', k, v: false})
      if (last) {
        done.push({e: 'flag', k: `story:${script.id}:complete`}, {e: 'keep', item: script.keepsake.id}, {e: 'end', ending: o.id})
        if (endingFrom.get(o.id) && endingFrom.get(o.id) !== scene.id) throw new Error(`STORY_ENDING_DUP:${script.id}.${o.id}`)
        endingFrom.set(o.id, scene.id)
        endings[o.id] = {title: word(script.title), body: word(o.text) + ' — ' + o.reply.map(s => s[he ? 2 : 1]).join(' '), keep: script.keepsake.id}
      } else if (next) {
        if (next.night !== scene.night) done.push({e: 'time', to: next.night ? 'night' : 'day'})
        if (dest) done.push({e: 'goto', room: dest.room, spawn: 'start', ...(next.night ? {time: 'night' as const} : {})})
      }
      const spoken = solo ? without([...scene.action, ...(o.action ?? [])], scene.who) : [...scene.action, ...(o.action ?? [])]
      const effects: Effect[] = scene.game
        ? [{e: 'play', game: scene.game, id: `${scene.id}:${o.id}`, then: done, ...(scene.reward?.good ? {good: scene.reward.good} : {}), ...(scene.reward?.slip ? {slip: scene.reward.slip} : {})}]
        : done
      actionBranches.push({
        when: allOf(doing, {is: [pick, o.id]}, dest ? settle(dest.when, o.effects ?? []) : undefined, wear.when, present ? (solo ? {none: [present]} : present) : undefined),
        lines: lines(spoken.length ? spoken : [alone]), then: effects,
      })
    }
    talks.push({id: task, branches: [...actionBranches, {lines: sayDone}]})
  })

  // ───── the day's errands, in order; scenes that may be done in either order are offered together
  const taskOf = (s: SceneScript) => word(s.task)
  const done = (id: string): Cond => ({flag: doneF(id)})
  const handled = new Set<string>()
  scenes.forEach((s, n) => {
    const roomHint = s.locations ? {} : {room: s.room}
    if (s.hub && !handled.has(s.hub)) {
      const group = scenes.filter(x => x.hub === s.hub)
      handled.add(s.hub)
      objectives.push({id: `hub:${s.hub}`, t: group.map(taskOf).join(he ? ', או ' : ', or '), done: {any: group.map(x => done(x.id))}})
    }
    // a scene that cannot happen on this road (its `when` is false once everything before it is done) is not asked for
    const skipped: Cond | null = s.when ? allOf(...afterOf(s, n).map(a => done(a)), {none: [s.when]}) : null
    objectives.push({id: s.id, t: taskOf(s), ...roomHint, done: skipped ? {any: [done(s.id), skipped]} : done(s.id)})
  })

  // two scenes offered together in different rooms cannot have each other's person speaking: that person is only in one of them
  scenes.forEach(a => scenes.forEach(b => {
    if (a === b || !a.hub || a.hub !== b.hub) return
    const roomsA = new Set((a.locations ?? [{room: a.room}]).map(l => l.room)), roomsB = (b.locations ?? [{room: b.room}]).map(l => l.room)
    if (roomsB.every(r => roomsA.has(r))) return
    const spoken = [a.lines, a.action, ...(a.callbacks ?? []).map(c => c.lines), ...a.options.flatMap(x => [x.reply, x.action ?? []])].flat()
    if (spoken.some(x => x[0] === b.who)) throw new Error(`STORY_HUB_SPEAKER:${script.id}.${a.id} has ${b.who} speaking, but ${b.who} is in ${b.id}'s room`)
  }))

  // a street can send people one way at a time: two scenes pointing the east door at different places must not be open together
  const ancestors = (i: number, seen = new Set<number>()): Set<number> => { for (const a of afterOf(scenes[i]!, i)) { const j = ids.get(a)!; if (!seen.has(j)) { seen.add(j); ancestors(j, seen) } } return seen }
  scenes.forEach((a, i) => scenes.forEach((b, j) => {
    if (j <= i || !a.east || !b.east || a.east === b.east) return
    if (!ancestors(j).has(i)) throw new Error(`STORY_EAST:${script.id}.${a.id}/${b.id} point the street's east door at two places while both are open`)
  }))

  // the walk between one errand and the next is part of the place
  const roomsOf = (s: SceneScript) => s.locations?.map(l => l.room) ?? [s.room]
  scenes.forEach((s, i) => {
    const before = afterOf(s, i).length ? afterOf(s, i).flatMap(a => roomsOf(scenes[ids.get(a)!]!)) : [scenes[0]!.room]
    for (const from of before) for (const to of roomsOf(s)) for (const r of pathRooms(from, to) ?? []) roomsUsed.add(r)
  })
  const label = (room: string) => word(LABEL[room] ?? [room, room])
  const doors = townDoors(roomsUsed, east, label)
  const first = scenes[0]!
  return {
    id: script.id, act: script.act, age: script.age, title: word(script.title), kicker: he ? `גיל ${script.age}` : `Age ${script.age}`, intro: word(script.intro),
    start: {room: first.locations?.[0]?.room ?? first.room, spawn: 'start', time: first.night ? 'night' : 'day'},
    cast: [...follows, ...mains, ...companions], spots, doors, beats, talks, objectives, endings,
    keepsakes: [{id: script.keepsake.id, name: word(script.keepsake.name), note: word(script.keepsake.note)}],
  }
}
