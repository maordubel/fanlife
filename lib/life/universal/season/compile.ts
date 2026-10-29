/**
 * LIFE · Season One — an episode script becomes a chapter.
 *
 * The output is the engine's own `Chapter`: the same placements, spots, doors, beats, talks and objectives every other
 * chapter is made of, so the shell, the simulator and the validator need nothing new to play it. What is new rides on
 * the optional Season One fields (`episode`, `clocks`, `barks`, `cines`, `docs`, `lives`, `side`).
 *
 * The one rule this compiler exists for: a step is DONE before it is talked about. Its talk opens on a short set-up,
 * plays the hands (a game, a mission) or simply does the thing, then reacts — and only then, if the step asks, puts a
 * question with a clock on it.
 */
import {ROOMS} from '../rooms'
import {callbackSubsets} from '../screenplay/compile'
import {LABEL, pathRooms, ROLE_SLOT, SLOT_PREF, townDoors} from '../screenplay/town'
import type {Beat, Branch, Chapter, Choice, Cond, Effect, Line, Objective, Placement, SpotUse, Talk} from '../types'
import type {EpisodeScript, Opt, Say, Step} from './write'

export const SEASON = 1
export const EPISODES_IN_SEASON = 6

const allOf = (...cs: (Cond | undefined)[]): Cond => ({all: cs.filter((c): c is Cond => !!c)})
const flagF = (k: string, v: string | number | boolean = true): Effect => ({e: 'flag', k, v})

export function compileEpisode(ep: EpisodeScript): Chapter {
  const F = (step: string, what: string) => `s${SEASON}:${ep.id}:${step}:${what}`
  const done = (id: string) => F(id, 'done'), slipF = (id: string) => F(id, 'slip')
  const steps = ep.steps, byId = new Map(steps.map(s => [s.id, s]))
  if (byId.size !== steps.length) throw new Error(`SEASON_STEP_DUP:${ep.id}`)

  // ───── order: what each step waits for
  const mainline = steps.filter(s => !s.side)
  const afterOf = (s: Step): string[] => {
    if (s.after) return s.after
    if (s.afterAny) return []
    if (s.side) return []
    const i = mainline.indexOf(s)
    if (i <= 0) return []
    const prev = mainline[i - 1]!
    if (s.hub && prev.hub === s.hub) return afterOf(mainline.find(x => x.hub === s.hub)!)
    if (prev.hub) return mainline.filter(x => x.hub === prev.hub).map(x => x.id)
    return [prev.id]
  }
  for (const s of steps) for (const a of afterOf(s)) if (!byId.has(a)) throw new Error(`SEASON_AFTER:${ep.id}.${s.id}→${a}`)
  for (const s of steps) for (const a of s.afterAny ?? []) if (!byId.has(a)) throw new Error(`SEASON_AFTER:${ep.id}.${s.id}→${a}`)
  const open = (s: Step): Cond => allOf(...afterOf(s).map(a => ({flag: done(a)}) as Cond), ...(s.afterAny ? [{any: s.afterAny.map(a => ({flag: done(a)}) as Cond)}] : []), {not: done(s.id)}, s.when)

  // ───── who stands where: one slot per person per room, never two on one
  const used = new Map<string, Map<string, string>>()
  const slotOf = (room: string, who: string, wanted?: string): string => {
    const geo = ROOMS[room]
    if (!geo) throw new Error(`SEASON_ROOM:${ep.id}:${room}`)
    if (!used.has(room)) used.set(room, new Map())
    const taken = used.get(room)!
    if (wanted) { if (!geo.slots[wanted]) throw new Error(`SEASON_SLOT:${ep.id}:${room}.${wanted}`); return wanted }
    const known = taken.get(who)
    if (known) return known
    const role = ROLE_SLOT[room]?.[who]
    const order = [...(role ? [role] : []), ...(SLOT_PREF[room] ?? []), ...Object.keys(geo.slots)].filter((k, i, a) => geo.slots[k] && a.indexOf(k) === i)
    const free = order.find(k => ![...taken.values()].includes(k)) ?? order[0]!
    taken.set(who, free)
    return free
  }
  const spotOk = (room: string, spot: string) => { if (!ROOMS[room]?.spots[spot]) throw new Error(`SEASON_SPOT:${ep.id}:${room}.${spot}`); return spot }

  const lines = (ss: readonly Say[]): Line[] => ss.map(s => ({...s}))
  const talks: Talk[] = [], mains: Placement[] = [], extras: Placement[] = [], follows: Placement[] = []
  const spots: SpotUse[] = [], beats: Beat[] = [], objectives: Objective[] = [], sides: Objective[] = []
  const endings: Chapter['endings'] = {}
  const rooms = new Set<string>([ep.start.room])
  const east: {dest: string; when: Cond}[] = []
  const keepWhen = ep.keep.when

  /** what ends the step: the episode's end (with the keepsake when it is earned) or a cut to the next room */
  const closing = (s: Step, ending: string, extra: Effect[]): Effect[] => {
    if (s.final) {
      endings[ending] = {title: ep.title, body: ep.logline, keep: ep.keep.id}
      return [...extra, flagF(`s${SEASON}:${ep.id}:complete`), {e: 'end', ending}]
    }
    if (s.cut) {
      rooms.add(s.cut.room)
      return [...extra, ...(s.cut.night !== undefined ? [{e: 'time' as const, to: s.cut.night ? 'night' as const : 'day' as const}] : []),
        {e: 'goto', room: s.cut.room, spawn: s.cut.spawn ?? 'start', ...(s.cut.night ? {time: 'night' as const} : {})}]
    }
    return extra
  }
  // the keepsake is given as the episode ends; a keepsake with a condition is given only on the lives that earned it
  const keepFx = (): Effect[] => keepWhen ? [] : [{e: 'keep', item: ep.keep.id}]

  for (const s of steps) {
    const at = s.at
    if (!ROOMS[at.room]) throw new Error(`SEASON_ROOM:${ep.id}:${at.room}`)
    rooms.add(at.room)
    const o = open(s), root = s.id, after = `${s.id}:after`
    if (s.east) east.push({dest: s.east, when: o})

    // ── the one who is asked, or the thing that is done
    if (at.who) mains.push({who: at.who, room: at.room, slot: slotOf(at.room, at.who, at.slot), talk: root, when: o, mark: true})
    if (at.spot) spots.push({id: s.id, room: at.room, spot: spotOk(at.room, at.spot), talk: root, when: o, verb: s.verb ?? 'use', label: s.goal})
    if (!at.who && !at.spot && !s.enter) throw new Error(`SEASON_NOWHERE:${ep.id}.${s.id}`)
    if (s.enter) beats.push({id: s.id, room: at.room, when: o, talk: root})
    for (const e of s.escort ?? []) for (const r of e.rooms) { rooms.add(r); follows.push({who: e.who, room: r, slot: slotOf(r, e.who), follow: true, when: o, mark: false}) }

    // everybody who speaks in this step is in the room while it is open
    const speakers = new Set<string>()
    const note = (ss: readonly Say[] | undefined) => ss?.forEach(x => { if (x.who && x.who !== 'me' && x.who !== 'think') speakers.add(x.who) })
    note(s.lines); note(s.react); note(s.slip); note(s.ask?.lines); s.callbacks?.forEach(c => note(c.lines)); s.ask?.options.forEach(x => note(x.reply))
    if (at.who) speakers.delete(at.who)
    for (const e of s.escort ?? []) speakers.delete(e.who)
    for (const who of speakers) extras.push({who, room: at.room, slot: slotOf(at.room, who), when: o, mark: false})

    // ── the objective
    // a step whose road was not taken (its `when` no longer holds) is not asked for
    const skipped: Cond | null = s.when ? {none: [s.when]} : null
    const obj: Objective = {id: s.id, t: s.goal, room: at.room, done: skipped ? {any: [{flag: done(s.id)}, skipped]} : {flag: done(s.id)}, ...(s.hub ? {hub: s.hub} : {})}
    ;(s.side ? sides : objectives).push(obj)

    // ── how it resolves: an answer (each its own reply and its own way on), or simply done
    const doneFx: Effect[] = [flagF(done(s.id))]
    const resolveChoices = (): Choice[] => s.ask!.options.map((x: Opt) => {
      const wear: Effect[] = x.wear ? [{e: 'wear', what: x.wear}] : []
      const hands: Effect[] = x.mission || x.game ? [{e: 'play', game: x.game ?? null, id: `${ep.id}:${s.id}:${x.id}`, ...(x.mission ? {mission: {template: x.mission.template, mandatory: x.mission.mandatory === true, ...(x.mission.beat ? {beat: x.mission.beat} : {})}} : {})}] : []
      // an answer that is not one yet leaves the step open and moves nothing on
      if (x.stay) return {id: x.id, t: x.text, ...(x.when ? {when: x.when} : {}), then: [...(x.fx ?? []), ...hands], next: `${s.id}:${x.id}`}
      return {id: x.id, t: x.text, ...(x.when ? {when: x.when} : {}), then: [...(s.fx ?? []), ...(x.fx ?? []), ...wear, {e: 'flag', k: `life:s1:${ep.id}:${s.id}`, v: x.id}, ...doneFx, ...hands], next: `${s.id}:${x.id}`}
    })
    // what ends the step (the episode's end, a cut) is said in the reply; closed before its end, the reply plays again
    // by itself, so a box shut by mistake never leaves a day with nothing left to do
    const closedF = s.final ? `s${SEASON}:${ep.id}:complete` : F(s.id, 'moved')
    const replies = (): Talk[] => s.ask!.options.map(x => ({id: `${s.id}:${x.id}`, branches: [{lines: lines(x.reply.length ? x.reply : [{who: null, t: '…'}]), ...(x.stay ? {} : {then: closing(s, x.id, [...(s.final ? keepFx() : []), ...(s.cut ? [flagF(closedF)] : [])])})}]}))
    if (s.ask && (s.final || s.cut)) for (const x of s.ask.options.filter(o => !o.stay))
      beats.push({id: `${s.id}:${x.id}:again`, room: at.room, when: allOf({flag: done(s.id)}, {is: [`life:s1:${ep.id}:${s.id}`, x.id]}, {not: closedF}), talk: `${s.id}:${x.id}`})
    const resolved = (base: Line[], when?: Cond): Branch => s.ask
      ? {...(when ? {when} : {}), lines: [...base, ...lines(s.ask.lines ?? [])], choices: resolveChoices(), ...(s.ask.timer ? {timer: {s: s.ask.timer, pick: s.ask.silent ?? s.ask.options[s.ask.options.length - 1]!.id}} : {})}
      : {...(when ? {when} : {}), lines: base, then: [...(s.fx ?? []), ...doneFx, ...closing(s, 'done', s.final ? keepFx() : [])]}
    if (s.ask?.timer && s.ask.silent && !s.ask.options.some(x => x.id === s.ask!.silent && !x.when)) throw new Error(`SEASON_SILENT:${ep.id}.${s.id}`)

    // ── the opening: the set-up with whatever it remembers in front of it
    const pre = lines(s.lines ?? [])
    const stacks = callbackSubsets((s.callbacks ?? []).map(c => ({when: c.when, lines: c.lines.map(l => [l.who, l.t, l.t] as const), ...(c.group ? {group: c.group} : {})})))
    const openings: {when?: Cond; lines: Line[]}[] = [
      ...stacks.map(sub => ({when: allOf(...sub.map(c => c.when)), lines: [...sub.flatMap(c => c.lines.map(l => ({who: l[0], t: l[1]}))), ...pre]})),
      {lines: pre},
    ]
    if (s.game || s.mission || s.show?.length) {
      if (!pre.length && !(s.callbacks ?? []).length && !s.enter) throw new Error(`SEASON_NO_SETUP:${ep.id}.${s.id} plays a game with nothing said first`)
      if (!(s.react ?? []).length && !s.ask?.lines?.length) throw new Error(`SEASON_NO_REACTION:${ep.id}.${s.id}`)
      const playedF = F(s.id, 'played')
      const hands = !!(s.game || s.mission)
      const play: Effect[] = hands
        ? [{e: 'play', game: s.game ?? null, id: `${ep.id}:${s.id}`, ...(s.mission ? {mission: {template: s.mission.template, mandatory: s.mission.mandatory === true, ...(s.mission.beat ? {beat: s.mission.beat} : {})}} : {}),
          then: [flagF(playedF)], good: [...(s.reward?.good ?? [])], slip: [flagF(slipF(s.id)), ...(s.reward?.slip ?? [])]}, ...(s.show ?? [])]
        : [flagF(playedF), ...(s.show ?? [])]
      const react = lines(s.react ?? []), slip = lines(s.slip ?? s.react ?? [])
      const reaction = (gate?: Cond): Branch[] => [
        ...(s.slip ? [resolved(slip.length ? slip : react, allOf(gate, {flag: slipF(s.id)}))] : []),
        resolved(react, gate),
      ].map(b => b.lines.length ? b : {...b, lines: [{who: null, t: '…'}]})
      // once the hands are done the doing is not asked for again: talking again picks up at the reaction
      talks.push({id: root, branches: [...reaction({flag: playedF}), ...openings.map(op => ({...(op.when ? {when: op.when} : {}), lines: op.lines.length ? op.lines : [{who: null, t: s.goal}], then: play, next: after}))]})
      talks.push({id: after, branches: reaction()})
    } else {
      const react = lines(s.react ?? [])
      talks.push({id: root, branches: openings.map(op => {
        const b = resolved([...op.lines, ...react], op.when)
        return b.lines.length ? b : {...b, lines: [{who: null, t: s.goal}]}
      })})
    }
    if (s.ask) talks.push(...replies())
    // the talk's last branch is always there: what is left to say once it has been done
    for (const t of talks.filter(x => x.id === root || x.id === after)) if (t.branches[t.branches.length - 1]!.when) t.branches.push({lines: [{who: null, t: 'Done. Keep going.'}]})
  }

  // ───── people who are just there
  const presence: Placement[] = (ep.people ?? []).map(p => { rooms.add(p.room); return {who: p.who, room: p.room, slot: slotOf(p.room, p.who, p.slot), ...(p.when ? {when: p.when} : {}), mark: false} })
  for (const b of ep.barks ?? []) rooms.add(b.room)

  // ───── the clock
  const clocks = ep.clock ? [{id: ep.clock.id, s: ep.clock.s, label: ep.clock.label, ...(ep.clock.from ? {from: ep.clock.from} : {}), until: ep.clock.until, fail: ep.clock.fail, talk: `clock:${ep.clock.id}`}] : undefined
  if (ep.clock) talks.push({id: `clock:${ep.clock.id}`, branches: [{lines: lines(ep.clock.lines), then: ep.clock.fx ?? []}]})

  // ───── the town between: every room on the way from the start to where things happen
  for (const r of [...rooms]) for (const p of pathRooms(ep.start.room, r) ?? []) rooms.add(p)
  const label = (r: string) => (LABEL[r] ?? [r, r])[0]
  const doors = townDoors(rooms, east, label)

  const keepsakes = [{id: ep.keep.id, name: ep.keep.name, note: ep.keep.note}]
  // a keepsake with a condition is handed over by the episode's own last steps, through `fx`
  return {
    id: ep.id, act: ep.act, age: ep.age, title: ep.title, kicker: `Episode ${ep.no}`, intro: ep.intro,
    start: {room: ep.start.room, spawn: ep.start.spawn ?? 'start', time: ep.start.night ? 'night' : 'day'},
    cast: [...follows, ...mains, ...extras, ...presence],
    spots, doors, beats, talks, objectives: [...objectives, ...sides], endings, keepsakes,
    ...(ep.anchor ? {anchor: ep.anchor, centrepiece: true} : {}),
    ...(ep.when ? {when: ep.when} : {}),
    episode: {season: SEASON, no: ep.no, of: EPISODES_IN_SEASON, logline: ep.logline, main: steps.filter(s => s.main).map(s => s.id), ...(ep.next ? {next: ep.next} : {}), ...(ep.open ? {open: ep.open} : {}), ...(ep.close ? {close: ep.close} : {}),
      ...(ep.texts ? {texts: ep.texts} : {}), ...(ep.box ? {box: ep.box} : {}), ...(ep.flash ? {flash: ep.flash} : {}), ...(ep.tease ? {tease: ep.tease} : {}), ...(ep.letter ? {letter: ep.letter} : {})},
    ...(clocks ? {clocks} : {}),
    ...(ep.barks ? {barks: ep.barks.map((b, i) => ({id: `${ep.id}:bark:${i}`, who: b.who, room: b.room, ...(b.when ? {when: b.when} : {}), lines: b.lines}))} : {}),
    ...(ep.cines ? {cines: ep.cines} : {}),
    ...(ep.docs ? {docs: ep.docs} : {}),
    ...(ep.lives ? {lives: ep.lives} : {}),
    ...(sides.length ? {side: sides.map(x => x.id)} : {}),
  }
}
