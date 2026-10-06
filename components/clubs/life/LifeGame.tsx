'use client'
/**
 * LIFE, universal — the shell.
 *
 * Three things meet here and none of them knows the others' business:
 *  · the engine (`lib/life/universal`) — the append-only life, the conversations, what is true;
 *  · the voxel runtime (`public/life/voxel/play.js`, in an iframe) — a room, a body that walks;
 *  · this file — every word the supporter reads, as DOM, in the club's own tokens.
 *
 * The shell never decides what happens. It asks the engine what the room holds, tells the
 * runtime to draw it, and turns what the runtime reports (he reached a door, he pressed the
 * button next to somebody) into the engine's own calls. What the simulator in the test suite
 * walks is therefore exactly what is walked here.
 */
import {ENABLED_LOCALES} from '@/lib/clubs/locale'
import Link from 'next/link'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {chapterOf, eventsOf, Life, meets, nextChapter, openChapter, type Directive, type LifeStore} from '@/lib/life/universal/engine'
import type {CardDef, Chapter, LifePack, LifeState} from '@/lib/life/universal/types'
import {beatFlag, beatFor, nameOf, Runner, throughDoor, type RunnerView, type Scene} from '@/lib/life/universal/world'
import {cityOf, roomName, SITES, type Place} from '@/lib/life/universal/city'
import {CityMap} from './CityMap'
import {MeSheet} from './MeSheet'
import {MiniGame} from './MiniGame'
import {instantText, Typed, type TypedHandle} from './Typed'
import {skyOf} from '@/lib/life/universal/sky'
import {people, roomConfig, type PlayEvent, type PlayRuntime, type PlayTarget} from './runtime'
import {LifeSound} from './sound'
import styles from './life.module.css'

type Copy = Record<string, string>
type Phase = 'boot' | 'title' | 'chapter' | 'play' | 'ending' | 'finished'
type TalkContext = {actor: string | null; beat: string | null}
type Overlay = {k: 'card'; card: CardDef} | {k: 'game'; d: Extract<Directive, {d: 'play'}>} | null
type Props = {pack: LifePack; locale: 'en' | 'he'; copy: Copy; hubHref: string; langHref: {en: string; he: string}; legacyHref: string | null}

/* where the room sits on the glass: on a phone it takes the upper part and lifts clear of the page while somebody is speaking */
const FRAME = {phone: {top: 0.8, bottom: -0.4}, talk: {top: 0.8, bottom: -0.06}, wide: {top: 0.86, bottom: -0.78}}
const MOVE: Record<string, [number, number]> = {
  arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  // up is INTO the room, which is away from the camera
  arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
}

function browserStore(): LifeStore {
  return {
    read: k => { try { return window.localStorage.getItem(k) } catch { return null } },
    write: (k, v) => { try { window.localStorage.setItem(k, v) } catch { /* a full or private store never stops the game */ } },
    clear: k => { try { window.localStorage.removeItem(k) } catch { /* nothing to clear */ } },
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function LifeGame({pack, locale, copy, hubHref, langHref, legacyHref}: Props) {
  const story = locale === 'en' ? {} : {lang: 'en', dir: 'ltr' as const}
  const [state, setState] = useState<LifeState | null>(null)
  const [phase, setPhase] = useState<Phase>('boot')
  const [cardAt, setCardAt] = useState(0)
  const [ready, setReady] = useState(false)
  const [roomUp, setRoomUp] = useState(false)
  const [scene, setScene] = useState<Scene | null>(null)
  const [target, setTarget] = useState<PlayTarget>(null)
  const [talk, setTalk] = useState<(TalkContext & {view: RunnerView}) | null>(null)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [place, setPlace] = useState<{id: string; name: string} | null>(null)
  const known = useRef<Set<string>>(new Set())
  const typing = useRef<TypedHandle | null>(null)
  const hang = useRef<{x: number; y: number} | null>(null)
  const [typed, setTyped] = useState(true)
  const sheetEl = useRef<HTMLElement | null>(null)
  const actEl = useRef<HTMLButtonElement | null>(null)
  const arrival = useRef<{id: string; name: string} | null>(null)
  const [menu, setMenu] = useState<'closed' | 'menu' | 'confirm'>('closed')
  const [failed, setFailed] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [wide, setWide] = useState(false)
  const [touch, setTouch] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [reload, setReload] = useState(0)
  const [sheet, setSheet] = useState<'none' | 'map' | 'me'>('none')
  const [intro, setIntro] = useState<{id: string; name: string; role: string; blurb: string} | null>(null)

  const life = useRef<Life | null>(null)
  const rt = useRef<PlayRuntime | null>(null)
  const frame = useRef<HTMLIFrameElement | null>(null)
  const sound = useRef<LifeSound | null>(null)
  const runner = useRef<Runner | null>(null)
  const live = useRef({phase: 'boot' as Phase, talk: null as TalkContext | null, overlay: false, menu: false, sheet: false, scene: null as Scene | null, time: 'day', wide: false})
  const entered = useRef<(() => void) | null>(null)
  const dismiss = useRef<(() => void) | null>(null)
  const skipped = useRef(new Set<string>())
  const timers = useRef<number[]>([])
  const keys = useRef(new Set<string>())
  const primary = useRef<HTMLButtonElement | null>(null)

  const chapter = useMemo<Chapter | null>(() => (state ? chapterOf(pack, state.chapter) : null), [pack, state])
  const chapterNo = chapter ? pack.chapters.findIndex(c => c.id === chapter.id) + 1 : 0
  live.current.phase = phase
  live.current.talk = talk
  live.current.overlay = !!overlay
  live.current.menu = menu !== 'closed'
  live.current.sheet = sheet !== 'none'
  live.current.scene = scene
  live.current.wide = wide

  const cue = useCallback((name: string) => { sound.current?.play(name) }, [])
  const later = useCallback((fn: () => void, ms: number) => { const t = window.setTimeout(fn, ms); timers.current.push(t); return t }, [])
  const say = useCallback((text: string) => { setToast(text); later(() => setToast(cur => (cur === text ? null : cur)), 4200) }, [later])

  /* ───────────── the life ───────────── */
  useEffect(() => {
    const l = Life.load(pack, browserStore())
    life.current = l
    known.current = new Set(l.state.seen)
    sound.current = new LifeSound()
    setSoundOn(sound.current.on)
    const off = l.subscribe(setState)
    setPhase('title')
    const timerList = timers.current
    return () => { off(); sound.current?.close(); timerList.forEach(t => window.clearTimeout(t)) }
  }, [pack])

  useEffect(() => {
    const q = window.matchMedia('(min-width: 900px)'), c = window.matchMedia('(pointer: coarse)'), m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { setWide(q.matches); setTouch(c.matches); setReduced(m.matches); rt.current?.frame(q.matches ? FRAME.wide : FRAME.phone) }
    sync()
    q.addEventListener('change', sync); c.addEventListener('change', sync); m.addEventListener('change', sync)
    return () => { q.removeEventListener('change', sync); c.removeEventListener('change', sync); m.removeEventListener('change', sync) }
  }, [])

  /* ───────────── the room ───────────── */
  const enterRoom = useCallback((at?: {x: number; z: number; yaw?: number}) => new Promise<void>(resolve => {
    const l = life.current, r = rt.current, ch = l && chapterOf(pack, l.state.chapter)
    const built = l && ch ? roomConfig(pack, ch, l.state, live.current.wide ? FRAME.wide : FRAME.phone, at) : null
    if (!l || !r || !built) { resolve(); return }
    setRoomUp(false); setTarget(null)
    live.current.scene = built.scene; live.current.time = l.state.time
    setScene(built.scene)
    skipped.current.clear()
    entered.current = resolve
    // a place he has never stood in opens wide and is named; one he knows just settles
    const room = l.state.room
    const first = !!room && !known.current.has(room)
    if (room) known.current.add(room)
    // named once the room is actually up, so a slow load never spends the card before anybody sees the place
    arrival.current = first && room ? {id: room, name: roomName(pack, room, ch)} : null
    const kind = room ? SITES[room]?.kind : undefined
    const outdoors = !!kind && kind !== 'home' && kind !== 'work' && kind !== 'abroad'
    const sky = skyOf(ch?.id ?? '', l.state.time, outdoors)
    if (!r.enter({...built.config, reveal: first, weather: sky.weather, mood: sky.mood})) { entered.current = null; resolve(); return }
  }), [pack])

  const startTalk = useCallback((id: string, ctx: TalkContext) => {
    const l = life.current, ch = l && chapterOf(pack, l.state.chapter)
    if (!l || !ch) return false
    const run = new Runner(ch, l.state, events => l.dispatch(...events))
    const view = run.start(id)
    if (!view) return false
    runner.current = run
    rt.current?.freeze(true)
    setTalk({...ctx, view})
    // an introduction: the first time he speaks with somebody, the life writes it down and the screen says who it is
    const who = ctx.actor ?? view.lines.find(x => x.who && x.who !== 'me')?.who ?? null
    if (who && !l.state.met.includes(who) && pack.cast[who]) {
      l.dispatch({t: 'met', who})
      const m = pack.cast[who]!
      setIntro({id: who, name: nameOf(pack, ch, who), role: m.role, blurb: m.blurb})
      later(() => setIntro(cur => (cur?.id === who ? null : cur)), 5200)
    }
    return true
  }, [later, pack])

  /** After anything happened: redraw who is here, play the beat that is waiting, or hand the room back. */
  const settle = useCallback(async () => {
    const l = life.current, r = rt.current
    if (!l || !r || live.current.phase !== 'play') return
    const ch = chapterOf(pack, l.state.chapter), room = l.state.room
    if (!ch || !room) return
    // "after the shift": the same room at another hour is drawn again, with him standing where he stood
    if (l.state.time !== live.current.time) { const w = r.where(); await enterRoom(w ? {x: w.x, z: w.z} : undefined) }
    const now = people(pack, ch, l.state, room)
    live.current.scene = now.scene
    setScene(now.scene)
    r.update(now.play)
    const beat = beatFor(ch, l.state, room)
    if (beat && !skipped.current.has(beat.id)) { r.freeze(true); later(() => { if (!startTalk(beat.talk, {actor: null, beat: beat.id})) r.freeze(false) }, 420); return }
    r.freeze(false)
    // a beat that was closed before its end comes back by itself — nothing in a day can be lost by closing a box
    if (beat) later(() => { skipped.current.delete(beat.id); if (!live.current.talk && !live.current.overlay && !live.current.menu) void settle() }, 6000)
  }, [enterRoom, later, pack, startTalk])

  /** A walk from the map: one `moved` per street, each through a door that is open; the room is drawn once, where he ends up. */
  const travel = useCallback((place: Place) => {
    const l = life.current
    if (!l || !place.route.ok) return
    const walked = place.route.doors
    setSheet('none'); cue('door')
    for (const d of walked) {
      const through = throughDoor({to: d.to, spawn: d.spawn, time: d.time ?? null}, l.state)
      if (through.ok) l.dispatch(...through.events)
    }
    void enterRoom().then(settle)
  }, [cue, enterRoom, settle])

  const finishChapter = useCallback((ending: string) => {
    const l = life.current, ch = l && chapterOf(pack, l.state.chapter)
    if (!l || !ch) return
    const keep = ch.endings[ending]?.keep
    l.dispatch({t: 'ended', chapter: ch.id, ending}, ...(keep ? [{t: 'keep' as const, item: keep}] : []))
    rt.current?.freeze(true)
    rt.current?.emote('tender', 8)
    cue('end')
    setPhase('ending')
  }, [cue, pack])

  /** What the screen has to do once a box closes: a card, a small game, a cut, an ending — in the order they were written. */
  const perform = useCallback(async (directives: Directive[]): Promise<boolean> => {
    const l = life.current
    if (!l) return false
    const queue = [...directives]
    while (queue.length) {
      const d = queue.shift()!
      if (d.d === 'sound') cue(d.cue)
      else if (d.d === 'card') {
        const card = chapterOf(pack, l.state.chapter)?.cards?.find(c => c.id === d.card)
        if (card) await new Promise<void>(res => { dismiss.current = res; cue('page'); setOverlay({k: 'card', card}) })
      } else if (d.d === 'play') {
        await new Promise<void>(res => { dismiss.current = res; setOverlay({k: 'game', d}) })
        const after = eventsOf(d.then, l.state)
        l.dispatch(...after.events)
        queue.unshift(...after.directives)
      } else if (d.d === 'goto') {
        l.dispatch({t: 'moved', room: d.room, spawn: d.spawn, time: d.time ?? l.state.time})
        await enterRoom()
      } else if (d.d === 'end') { finishChapter(d.ending); return true }
    }
    return false
  }, [cue, enterRoom, finishChapter, pack])

  const closeTalk = useCallback(async (completed: boolean) => {
    const run = runner.current, ctx = live.current.talk, l = life.current
    runner.current = null
    setTalk(null)
    rt.current?.focus(null)
    if (!run || !l) return
    if (!completed) {
      // leaving applies nothing; what earlier boxes of the chain already did stays done
      run.directives.filter(d => d.d === 'sound').forEach(d => cue((d as {cue: string}).cue))
      if (ctx?.beat) skipped.current.add(ctx.beat)
      void settle()
      return
    }
    if (await perform(run.directives)) return
    if (run.resume && startTalk(run.resume, {actor: ctx?.actor ?? null, beat: ctx?.beat ?? null})) return
    if (ctx?.beat) l.dispatch({t: 'flag', k: beatFlag(ctx.beat), v: true})
    void settle()
  }, [cue, perform, settle, startTalk])

  const advance = useCallback(() => {
    const run = runner.current
    if (!run || !live.current.talk) return
    if (typing.current?.finish()) return
    const before = run.view()
    if (before.index >= before.lines.length - 1 && before.choices.length) return
    cue('page')
    const view = run.advance()
    if (view.done) void closeTalk(true)
    else setTalk(t => (t ? {...t, view} : t))
  }, [closeTalk, cue])

  const choose = useCallback((id: string) => {
    const run = runner.current
    if (!run) return
    cue('tick')
    const view = run.choose(id)
    if (view.done) void closeTalk(true)
    else setTalk(t => (t ? {...t, view} : t))
  }, [closeTalk, cue])

  /* the camera goes to whoever is speaking */
  const talking = !!talk
  /* a line that carries a feeling bends the picture while it is on screen; the next one lets it go */
  const roomNow = state?.room ?? null, timeNow = state?.time ?? 'day'
  const lineMood = talk ? talk.view.lines[talk.view.index]?.mood ?? null : null
  useEffect(() => { rt.current?.emote(lineMood, 30) }, [lineMood, talk?.view.talk])
  /* the town sounds like where it is: a crowd that is far away, nearer the closer he walks to the ground */
  useEffect(() => {
    if (phase !== 'play' || !roomNow) { sound.current?.bed(0); sound.current?.ambience(null); return }
    const me = SITES[roomNow], grounds = Object.values(SITES).filter(x => x.kind === 'stadium')
    if (!me) { sound.current?.bed(0); sound.current?.ambience(null); return }
    /* and the place has its own air, a real recording, not a hiss */
    const air: Record<string, string> = {home: roomNow === 'kitchen' ? 'amb-kitchen' : 'amb-room', school: 'amb-classroom', street: timeNow === 'night' ? 'amb-street-dusk' : 'amb-street-day', pitch: 'amb-park', work: 'amb-hall', bus: roomNow === 'bus-station' ? 'amb-station' : 'amb-bus', stadium: roomNow === 'tunnel' ? 'amb-tunnel' : 'amb-stadium', abroad: 'amb-street-day'}
    sound.current?.ambience(air[me.kind] ?? null, me.kind === 'home' ? 0.22 : 0.3)
    const d = Math.min(...grounds.map(g => Math.hypot(g.x - me.x, g.y - me.y)))
    const indoors = me.kind === 'home' || me.kind === 'school' || me.kind === 'work'
    sound.current?.bed((Math.max(0, 1 - d / 70) * (indoors ? 0.45 : 1)) * (timeNow === 'night' ? 1.15 : 1))
  }, [phase, roomNow, timeNow])
  useEffect(() => { if (!wide) rt.current?.frame(talking ? FRAME.talk : FRAME.phone) }, [talking, wide])
  useEffect(() => {
    if (!talk) return
    const who = talk.view.lines[talk.view.index]?.who
    const inRoom = who && who !== 'me' && live.current.scene?.actors.some(a => a.id === who) ? who : talk.actor
    rt.current?.focus(inRoom ?? null)
  }, [talk])

  /* ───────────── what the runtime says ───────────── */
  const onPlay = useCallback((e: PlayEvent) => {
    const l = life.current
    if (e.type === 'ready') { setReady(true); return }
    if (e.type === 'error') { setFailed(e.message || 'error'); return }
    if (e.type === 'entered') {
      setRoomUp(true)
      const at = arrival.current
      arrival.current = null
      if (at) { setPlace(at); cue('reveal'); rt.current?.emote('wonder', 3); later(() => setPlace(cur => (cur?.id === at.id ? null : cur)), 3800) }
      const done = entered.current; entered.current = null; done?.(); return
    }
    if (e.type === 'target') { setTarget(e.target); return }
    if (e.type === 'step') { sound.current?.setSurface(['floor', 'street', 'terrace', 'stairs'].includes(e.surface) ? e.surface : 'floor'); cue('step'); return }
    if (!l || live.current.phase !== 'play' || live.current.talk || live.current.overlay) return
    const sc = live.current.scene
    if (e.type === 'act') {
      const talkId = e.kind === 'actor' ? sc?.actors.find(a => a.id === e.id)?.talk : sc?.spots.find(s => s.id === e.id)?.talk
      if (talkId) startTalk(talkId, {actor: e.kind === 'actor' ? e.id : null, beat: null})
    } else if (e.type === 'locked') {
      const door = sc?.doors.find(d => d.id === e.id)
      say(door?.blocked ?? copy.locked!)
    } else if (e.type === 'exit') {
      const door = sc?.doors.find(d => d.id === e.id), through = door && throughDoor(door, l.state)
      if (through?.ok) { cue('door'); l.dispatch(...through.events); void enterRoom().then(settle) }
      else { if (door?.blocked) say(door.blocked); rt.current?.freeze(false) }
    }
  }, [copy.locked, cue, enterRoom, later, say, settle, startTalk])
  const onPlayRef = useRef(onPlay)
  onPlayRef.current = onPlay

  /* the iframe hands over its runtime once the world is built */
  useEffect(() => {
    const host = window as unknown as {__vxHostReady?: (p: PlayRuntime) => void}
    const attach = (p: PlayRuntime) => { rt.current = p; p.on(e => onPlayRef.current(e)); setReady(true) }
    host.__vxHostReady = attach
    const poll = window.setInterval(() => {
      const w = frame.current?.contentWindow as unknown as {__vxPlay?: PlayRuntime; __ready?: boolean; __err?: string[]} | null
      if (w?.__ready && w.__vxPlay && rt.current !== w.__vxPlay) attach(w.__vxPlay)
      if (w?.__ready) window.clearInterval(poll)
    }, 250)
    const giveUp = window.setTimeout(() => { if (!rt.current) setFailed('timeout') }, 30000)
    return () => { window.clearInterval(poll); window.clearTimeout(giveUp); delete host.__vxHostReady; rt.current = null }
  }, [reload])

  /* ───────────── phases ───────────── */
  const beginDay = useCallback(() => {
    sound.current?.wake()
    setPhase('play')
    live.current.phase = 'play'
    void enterRoom().then(settle)
  }, [enterRoom, settle])

  const openChapterCard = useCallback(() => { setCardAt(0); setPhase('chapter') }, [])

  const begin = useCallback((fresh: boolean) => {
    const l = life.current
    if (!l) return
    sound.current?.wake()
    if (fresh || !l.state.started || !chapterOf(pack, l.state.chapter)) { l.begin(); openChapterCard(); return }
    if (l.state.done[l.state.chapter!]) { setPhase(nextChapter(pack, l.state.chapter!) ? 'ending' : 'finished'); return }
    openChapterCard()
  }, [openChapterCard, pack])

  const toNext = useCallback(() => {
    const l = life.current, next = l?.state.chapter ? nextChapter(pack, l.state.chapter) : null
    if (!l) return
    if (!next) { setPhase('finished'); return }
    l.dispatch(...openChapter(next))
    openChapterCard()
  }, [openChapterCard, pack])

  const closeOverlay = useCallback(() => { const done = dismiss.current; dismiss.current = null; setOverlay(null); done?.() }, [])

  const restartChapter = useCallback(() => {
    const l = life.current
    if (!l) return
    runner.current = null; setTalk(null); setOverlay(null); dismiss.current = null; setMenu('closed')
    l.restartChapter()
    openChapterCard()
  }, [openChapterCard])

  const toggleSound = useCallback(() => { const s = sound.current; if (!s) return; s.set(!s.on); s.wake(); setSoundOn(s.on) }, [])

  /* the room stands still while a card, a game or the drawer is open */
  useEffect(() => {
    if (phase !== 'play' || !roomUp) return
    if (menu !== 'closed' || sheet !== 'none') rt.current?.freeze(true)
    else if (!talk && !overlay) rt.current?.freeze(false)
  }, [menu, overlay, phase, roomUp, sheet, talk])

  /* ───────────── keys ───────────── */
  useEffect(() => {
    const axis = () => {
      let x = 0, y = 0
      keys.current.forEach(k => { const m = MOVE[k]; if (m) { x += m[0]; y += m[1] } })
      rt.current?.axis(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)))
      rt.current?.run(keys.current.has('shift'))
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(), field = (e.target as HTMLElement | null)?.tagName === 'INPUT'
      if (k === 'escape') {
        if (live.current.sheet) setSheet('none')
        else if (live.current.menu) setMenu('closed')
        else if (live.current.talk) void closeTalk(false)
        else if (live.current.phase === 'play' && !live.current.overlay) setMenu('menu')
        return
      }
      if (live.current.phase !== 'play' || live.current.menu || live.current.overlay) return
      if (live.current.sheet) { if (k === 'm') setSheet('none'); return }
      if (k === 'm' && !live.current.talk && !field) { e.preventDefault(); setSheet('map'); return }
      if (live.current.talk) {
        if ((k === 'e' || k === 'enter' || k === ' ') && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') { e.preventDefault(); advance() }
        const n = Number(k)
        if (n >= 1 && n <= 9) { const run = runner.current, c = run?.view().choices[n - 1]; if (run && c && run.view().index >= run.view().lines.length - 1) choose(c.id) }
        return
      }
      if (field) return
      if (MOVE[k] || k === 'shift') { keys.current.add(k); axis(); if (MOVE[k]) e.preventDefault(); return }
      if (k === 'e' || k === 'enter' || k === ' ') { if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return; e.preventDefault(); sound.current?.wake(); rt.current?.act() }
    }
    const up = (e: KeyboardEvent) => { keys.current.delete(e.key.toLowerCase()); axis() }
    const blur = () => { keys.current.clear(); axis() }
    const inner = frame.current?.contentWindow ?? null
    const targets: (Window | null)[] = [window, ready ? inner : null]
    targets.forEach(t => { t?.addEventListener('keydown', down); t?.addEventListener('keyup', up); t?.addEventListener('blur', blur) })
    return () => targets.forEach(t => { try { t?.removeEventListener('keydown', down); t?.removeEventListener('keyup', up); t?.removeEventListener('blur', blur) } catch { /* the frame is gone */ } })
  }, [advance, choose, closeTalk, ready])

  /* a card that opens takes the focus; the supporter is never left pressing nothing */
  useEffect(() => { primary.current?.focus({preventScroll: true}) }, [phase, cardAt, overlay, talk?.view.talk, talk?.view.index, menu])

  /* a probe may ask what the shell believes — only when the device was told to answer (the QA harness sets the key) */
  useEffect(() => {
    let on = false
    try { on = window.localStorage.getItem('fan-life:life:probe') === '1' } catch { /* no storage, no probe */ }
    if (!on) return
    const host = window as unknown as {__lifeProbe?: unknown}
    host.__lifeProbe = {
      state: () => life.current?.state ?? null, scene: () => live.current.scene, runtime: () => rt.current, phase: () => live.current.phase,
      busy: () => !!live.current.talk || live.current.overlay || live.current.menu,
      plan: () => {
        const st = life.current?.state, ch = st && chapterOf(pack, st.chapter)
        if (!st || !ch) return null
        const open = ch.objectives.find(o => !meets(st, o.done))
        return {objective: open?.id ?? null, room: open?.room ?? null, doors: ch.doors.filter(d => meets(st, d.when)).map(d => ({id: d.id, room: d.room, to: d.to, locked: !meets(st, d.needs)}))}
      },
    }
    return () => { delete host.__lifeProbe }
  }, [pack])

  /* ───────────── the stick (touch) ───────────── */
  const stick = useRef<{id: number; cx: number; cy: number} | null>(null)
  const [knob, setKnob] = useState({x: 0, y: 0})
  const stickMove = (e: React.PointerEvent) => {
    const s = stick.current
    if (!s || s.id !== e.pointerId) return
    const R = 46, dx = (e.clientX - s.cx) / R, dy = (e.clientY - s.cy) / R, m = Math.hypot(dx, dy), k = m > 1 ? 1 / m : 1
    setKnob({x: dx * k, y: dy * k})
    rt.current?.axis(dx * k, dy * k)
  }
  const stickEnd = () => { stick.current = null; setKnob({x: 0, y: 0}); rt.current?.axis(0, 0) }

  const line = talk ? talk.view.lines[talk.view.index] : null
  const playing = phase === 'play'
  const idle = playing && roomUp && !talk && !overlay && menu === 'closed' && sheet === 'none'
  const targetText = (() => {
    if (!target || !scene) return null
    if (target.kind === 'actor') { const a = scene.actors.find(x => x.id === target.id); return a ? {verb: copy.talkTo!, name: a.name} : null }
    if (target.kind === 'spot') { const s = scene.spots.find(x => x.id === target.id); return s ? {verb: copy[`verb.${s.verb}`] ?? copy.act!, name: s.label} : null }
    const d = scene.doors.find(x => x.id === target.id)
    return d ? {verb: d.locked ? copy.locked! : copy.go!, name: d.label} : null
  })()
  /* the line is set down a letter at a time; the choices arrive when it has finished */
  useEffect(() => { setTyped(instantText()) }, [talk?.view.talk, talk?.view.index])
  const typedDone = useCallback(() => setTyped(true), [])
  /* the name balloon hangs over whatever he is facing; off the glass, it falls back to the corner */
  useEffect(() => {
    if (!idle || !target || !targetText) return
    let raf = 0
    const loop = () => {
      const el = actEl.current, r = rt.current
      if (el && r) {
        const p = r.project(target.kind, target.id), par = el.offsetParent as HTMLElement | null
        if (p && par && p.x > 0.03 && p.x < 0.97 && p.y > 0.14 && p.y < 0.88) {
          const W = par.clientWidth, H = par.clientHeight, w = el.offsetWidth, h = el.offsetHeight, rtl = getComputedStyle(el).direction === 'rtl'
          const want = p.x * W, c = Math.min(W - w / 2 - 8, Math.max(w / 2 + 8, want)), ty = Math.max(64, p.y * H - h - 14)
          const tx = rtl ? c - W + w / 2 : c - w / 2
          // the camera never quite rests; a balloon that drifts a pixel is a balloon nobody can tap, so it moves only when the target does
          const last = hang.current
          if (el.dataset.float !== 'true' || !last || Math.abs(last.x - tx) > 2.5 || Math.abs(last.y - ty) > 2.5) {
            hang.current = {x: tx, y: ty}
            el.dataset.float = 'true'
            el.style.transform = `translate(${tx}px, ${ty}px)`
            el.style.setProperty('--tail', `${rtl ? c - want : want - c}px`)
          }
        } else if (el.dataset.float === 'true') { el.dataset.float = 'false'; el.style.transform = ''; hang.current = null }
      }
      raf = window.requestAnimationFrame(loop)
    }
    raf = window.requestAnimationFrame(loop)
    const btn = actEl.current
    return () => { window.cancelAnimationFrame(raf); if (btn) { btn.dataset.float = 'false'; btn.style.transform = '' } }
  }, [idle, target, targetText])
  /* the tail of the speech box points at whoever is talking */
  const talkWho = line?.who ?? null
  useEffect(() => {
    const el = sheetEl.current
    if (!el) return
    const aim = () => {
      const a = talkWho && talkWho !== 'me' ? scene?.actors.find(x => x.id === talkWho) : null
      const p = a ? rt.current?.project('actor', a.id) : null
      if (!p) { el.dataset.tail = 'none'; return }
      const rtl = getComputedStyle(el).direction === 'rtl', f = Math.min(0.9, Math.max(0.1, rtl ? 1 - p.x : p.x))
      el.dataset.tail = 'on'; el.style.setProperty('--tail', String(f))
    }
    aim()
    const t1 = window.setTimeout(aim, 450), t2 = window.setTimeout(aim, 1400)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [talkWho, talk?.view.index, scene])
  /* ───────────── what is drawn ───────────── */
  if (!state) return <div className={styles.life} data-phase="boot"><p className={styles.loading} role="status">{copy.loading}</p></div>

  const objectives = chapter?.objectives ?? []
  const firstOpen = chapter && state ? objectives.findIndex(o => !doneObjective(o.done, state)) : -1
  const current = firstOpen >= 0 ? objectives[firstOpen]! : null
  const lastLine = !!talk && talk.view.index >= talk.view.lines.length - 1
  const speaker = !line || line.who === null ? null : line.who === 'me' ? copy.you! : chapter ? nameOf(pack, chapter, line.who) : line.who
  const ending = chapter && state.done[chapter.id] ? chapter.endings[state.done[chapter.id]!] : null
  const keepsake = (id: string | undefined) => { for (const c of pack.chapters) { const k = c.keepsakes?.find(x => x.id === id); if (k) return k } return null }
  const chapterCards: CardDef[] = chapter?.prelude ?? []
  const prelude = phase === 'chapter' && cardAt < chapterCards.length ? chapterCards[cardAt]! : null
  const saved = state.started && !!chapter

  const scoreboard = (card: CardDef) => {
    const m = card.archive?.match
    if (!m || !card.stage) return null
    const final = card.stage === 'result'
    return (
      <div className={styles.board} data-life="scoreboard" data-stage={card.stage} data-result={final ? m.result : 'pending'}>
        <p className={styles.boardMeta}>{final ? copy['score.final'] : copy['score.kickoff']}{card.archive?.hint ? <> · <bdi>{card.archive.hint}</bdi></> : null}</p>
        <div className={styles.boardRow} dir="ltr">
          <span className={styles.boardTeam} data-us={m.us === 'home' ? 'true' : 'false'}>{m.home}</span>
          <span className={styles.boardScore} data-hidden={final ? 'false' : 'true'}><bdi>{final ? `${m.homeGoals}–${m.awayGoals}` : '–'}</bdi></span>
          <span className={styles.boardTeam} data-us={m.us === 'away' ? 'true' : 'false'}>{m.away}</span>
        </div>
        <p className={styles.boardMeta}>{copy['score.home']} · {copy['score.away']}{final && <> · {copy[`score.${m.result}`]}</>}</p>
        {final && m.note && <p className={styles.boardMeta}>{copy['score.note']}: <bdi>{m.note}</bdi></p>}
        {m.detail && (
          <div className={styles.boardDetail} data-life="match-detail">
            {final && m.detail.scorers.length > 0 && <p><b>{copy['score.scorers']}</b> {m.detail.scorers.map((g, i) => <span key={i}>{i > 0 && ' · '}<bdi>{g.name}{g.minute !== null ? ` ${g.minute}′` : ''}</bdi></span>)}</p>}
            {m.detail.lineup.length > 0 && <p><b>{copy['score.lineup']}</b> <bdi>{m.detail.lineup.join(' · ')}</bdi></p>}
            {m.detail.bench.length > 0 && <p><b>{copy['score.bench']}</b> <bdi>{m.detail.bench.join(' · ')}</bdi></p>}
          </div>
        )}
      </div>
    )
  }

  const archiveBlock = (card: CardDef) => card.archive && (
    <div className={styles.archive}>
      {scoreboard(card)}
      <p className={styles.stamp}>{card.archive.precision === 'day' && card.archive.on
        ? <>{copy.archiveDate} · <time dateTime={card.archive.on}><bdi>{new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${card.archive.on}T00:00:00Z`))}</bdi></time></>
        : <>{copy.archiveYear} · <bdi>{card.archive.year}</bdi></>}</p>
      {card.archive.sources.length > 0 && <p className={styles.sources}>{copy.sources}: {card.archive.sources.map((s, i) => (
        <span key={i}>{i > 0 && ' · '}{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer"><bdi>{s.publisher}</bdi></a> : <bdi>{s.publisher}</bdi>}</span>
      ))}</p>}
    </div>
  )

  return (
    <div className={styles.life} data-phase={phase} data-wide={wide ? 'true' : 'false'} data-talking={talk ? 'true' : 'false'} data-life="root" data-room={state.room ?? ''} data-chapter={state.chapter ?? ''}>
      <div className={styles.stage}>
        <iframe key={reload} ref={frame} className={styles.world} src={`/life/voxel/play.html?club=${encodeURIComponent(pack.clubId)}`} title={copy.title} tabIndex={-1} aria-hidden="true" />
        {playing && !roomUp && !failed && <p className={styles.loading} role="status">{copy.loading}</p>}
        {failed && <div className={styles.failed} role="alert"><p>{failed === 'timeout' ? copy.loadFailed : copy.noWebgl}</p><button type="button" className={`${styles.button} min-h-tap`} onClick={() => { setFailed(null); setReady(false); rt.current = null; setReload(n => n + 1) }}>{copy.retry}</button></div>}
        {place && <div className={styles.place} role="status" data-life="place" key={place.id}><small>{copy['place.new']}</small><b {...story}>{place.name}</b></div>}
        {toast && <p className={styles.toast} role="status" {...story}>{toast}</p>}
        {idle && targetText && (
          <button type="button" ref={actEl} className={`${styles.act} min-h-tap`} data-life="act" data-locked={target?.locked ? 'true' : 'false'} onClick={() => { sound.current?.wake(); rt.current?.act() }}>
            <span className={styles.actVerb}>{targetText.verb}</span><span className={styles.actName} {...(target?.kind === 'actor' ? {} : story)}><bdi>{targetText.name}</bdi></span>{!touch && <kbd aria-hidden="true">E</kbd>}
          </button>
        )}
        {idle && touch && (
          <div className={styles.stick} role="application" aria-label={copy.stickAria} dir="ltr"
            onPointerDown={e => { const r = e.currentTarget.getBoundingClientRect(); stick.current = {id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2}; e.currentTarget.setPointerCapture(e.pointerId); sound.current?.wake(); stickMove(e) }}
            onPointerMove={stickMove} onPointerUp={stickEnd} onPointerCancel={stickEnd}>
            <span style={{transform: `translate(${knob.x * 30}px, ${knob.y * 30}px)`}} />
          </div>
        )}
      </div>

      {playing && chapter && (
        <header className={styles.strip}>
          <span className={styles.mark} aria-hidden="true">{pack.skin.initials}</span>
          <div className={styles.stripText}>
            <p className={styles.serial}>№ {pad2(chapterNo)} · {copy.age} <bdi>{chapter.age}</bdi></p>
            <p className={styles.stripTitle} {...story}>{chapter.title}</p>
          </div>
          <div className={styles.hudButtons}>
            <button type="button" className={`${styles.menuButton} min-h-tap`} onClick={() => setSheet('map')} aria-haspopup="dialog" data-life="map-open">{copy.map}</button>
            <button type="button" className={`${styles.menuButton} min-h-tap`} onClick={() => setSheet('me')} aria-haspopup="dialog" data-life="me-open">{copy.me}</button>
            <button type="button" className={`${styles.menuButton} min-h-tap`} onClick={() => setMenu('menu')} aria-haspopup="dialog" data-life="menu-open">{copy.menu}</button>
          </div>
        </header>
      )}

      {playing && chapter && !talk && (
        <div className={styles.meterRow} data-life="meters">
          <span className={styles.meterChip} data-meter="coins">{copy['me.coins']} <b><bdi>{state.coins}</bdi></b></span>
          <span className={styles.meterChip} data-meter="energy" data-low={state.energy < 25 ? 'true' : 'false'}>{copy['me.energy']} <i aria-hidden="true"><b style={{display: 'block', inlineSize: `${Math.max(0, Math.min(100, state.energy))}%`}} /></i><b><bdi>{Math.round(state.energy)}</bdi></b></span>
          <span className={styles.meterChip} data-meter="standing">{copy['me.standing']} <b><bdi>{Math.round(state.standing)}</bdi></b></span>
        </div>
      )}

      {intro && !talk && (
        <aside className={styles.intro} role="status" data-life="intro"><small>{copy.intro}</small><b {...story}>{intro.name}</b><small {...story}>{intro.role} — {intro.blurb}</small></aside>
      )}

      {playing && chapter && current && !talk && (
        <p className={styles.chip} data-life="objective"><span>{copy.today}</span> <span {...story}>{current.t}</span></p>
      )}

      {playing && chapter && (
        <aside className={styles.programme} aria-label={copy.objective}>
          <h2 className={styles.heading}>{copy.objective}</h2>
          <ol className={styles.objectives}>
            {objectives.map((o, i) => { const done = doneObjective(o.done, state); return (firstOpen < 0 || i <= firstOpen) && (
              <li key={o.id} data-done={done ? 'true' : 'false'} aria-current={i === firstOpen ? 'step' : undefined}><span aria-hidden="true">{done ? '✓' : pad2(i + 1)}</span><span {...story}>{o.t}</span>{done && <span className="sr-only"> — {copy.done}</span>}</li>
            ) })}
          </ol>
          <h2 className={styles.heading}>{copy.inRoom}</h2>
          <p className={styles.cast}>{scene?.actors.length ? scene.actors.map(a => a.name).join(' · ') : copy.nobody}</p>
          <dl className={styles.keys}>
            <div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>{copy['keys.move']}</dd></div>
            <div><dt><kbd>E</kbd></dt><dd>{copy['keys.act']}</dd></div>
            <div><dt><kbd>Shift</kbd></dt><dd>{copy['keys.run']}</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>{copy['keys.leave']}</dd></div>
          </dl>
        </aside>
      )}

      {playing && talk && line && (
        <section ref={sheetEl} className={styles.sheet} aria-label={speaker ?? copy.title} data-life="dialogue" data-narration={line.who === null ? 'true' : 'false'}>
          <button type="button" className={`${styles.leave} min-h-tap`} onClick={() => void closeTalk(false)} aria-label={copy.leave} data-life="leave">×</button>
          {speaker && <p className={styles.speaker} data-me={line.who === 'me' ? 'true' : 'false'}><bdi>{speaker}</bdi></p>}
          <Typed className={styles.line} aria-live="polite" data-life="line" key={`${talk.view.talk}:${talk.view.index}`} text={line.t} onClick={() => typing.current?.finish()} handle={typing} onDone={typedDone} {...story} />
          {lastLine && talk.view.choices.length > 0 ? (!typed ? null : (
            <ol className={styles.choices} data-life="choices">
              {talk.view.choices.map((c, i) => (
                <li key={c.id} style={{'--i': i} as React.CSSProperties}><button type="button" ref={i === 0 ? primary : undefined} className={`${styles.choice} min-h-tap`} onClick={() => choose(c.id)} data-choice={c.id}><span aria-hidden="true">{i + 1}</span><span {...story}>{c.t}</span></button></li>
              ))}
            </ol>
          )) : (
            <button type="button" ref={primary} className={`${styles.more} min-h-tap`} onClick={advance} data-life="continue">{copy.more} <span aria-hidden="true">▸</span></button>
          )}
        </section>
      )}

      {phase === 'title' && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-title" data-life="title">
          <div className={styles.ticket}>
            <p className={styles.serial}>{pack.club.name} · {pack.club.city}</p>
            <h1 id="life-title" className={styles.poster}>{copy.title}</h1>
            <p className={styles.lede}>{copy.tagline}</p>
            <div className={styles.actions}>
              {saved && <button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={() => begin(false)} data-life="continue-life">{copy.continue} · {copy.chapter} {chapterNo} {copy.of} {pack.chapters.length}</button>}
              {!saved && <button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={() => begin(true)} data-life="begin">{copy.begin}</button>}
              {saved && <button type="button" className={`${styles.quiet} min-h-tap`} onClick={() => setMenu('confirm')}>{copy.startOver}</button>}
            </div>
            <dl className={styles.stub}>
              <div><dt>{copy.hubChapters}</dt><dd><bdi>{pack.chapters.length}</bdi></dd></div>
              <div><dt>{copy.nights}</dt><dd><bdi>{pack.provenance.anchoredChapters}</bdi></dd></div>
              <div><dt>{copy.readiness}</dt><dd>{copy.readinessPartial}</dd></div>
            </dl>
            <details className={styles.about}>
              <summary className="min-h-tap">{copy.readiness}</summary>
              <p>{copy.provenance}</p><p>{copy.fiction}</p>{locale !== 'en' && <p>{copy.storyLanguage}</p>}
              <ul lang="en" dir="ltr">{pack.readiness.reasons.map(r => <li key={r}>{r}</li>)}</ul>
            </details>
            <nav className={styles.links} aria-label={copy.language}>
              <Link className="min-h-tap" href={hubHref}>{copy.backToClub}</Link>
                            {ENABLED_LOCALES.length>1&&<Link className="min-h-tap" href={langHref.he} hrefLang="he" lang="he">{copy.hebrew}</Link>}
              {legacyHref && <Link className="min-h-tap" href={legacyHref}>{copy.hubLegacy}</Link>}
            </nav>
            <a className={`${styles.credit} min-h-tap`} href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer" aria-label={copy.creditAria}>{copy.credit}</a>
          </div>
        </section>
      )}

      {phase === 'chapter' && chapter && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-card-title" data-life={prelude ? 'prelude' : 'chapter-card'}>
          {prelude ? (
            <div className={styles.ticket} data-kind="archive" key={prelude.id}>
              <p className={styles.serial}>{copy.archive} · <span {...story}>{prelude.kicker}</span></p>
              <h2 id="life-card-title" className={styles.cardTitle} lang={prelude.archive?.locale} dir="auto">{prelude.title}</h2>
              {prelude.body && <p className={styles.lede} lang={prelude.archive?.locale} dir="auto">{prelude.body}</p>}
              {archiveBlock(prelude)}
              <div className={styles.actions}><button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={() => { cue('page'); setCardAt(n => n + 1) }} data-life="card-next">{copy.next}</button></div>
            </div>
          ) : (
            <div className={styles.ticket} key={chapter.id}>
              <p className={styles.serial}>{copy.chapter} {pad2(chapterNo)} {copy.of} {pad2(pack.chapters.length)}</p>
              <p className={styles.ageBig} aria-hidden="true">{chapter.age}</p>
              <p className={styles.kicker} {...story}>{chapter.kicker}</p>
              <h2 id="life-card-title" className={styles.cardTitle} {...story}>{chapter.title}</h2>
              <p className={styles.lede} {...story}>{chapter.intro}</p>
              <div className={styles.actions}><button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={beginDay} disabled={!ready} data-life="begin-day">{ready ? copy.beginDay : copy.loading}</button></div>
            </div>
          )}
        </section>
      )}

      {phase === 'ending' && chapter && ending && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-card-title" data-life="ending" data-ending={state.done[chapter.id]}>
          <div className={styles.ticket}>
            <p className={styles.serial}>{copy.ending} · {copy.age} <bdi>{chapter.age}</bdi></p>
            <h2 id="life-card-title" className={styles.cardTitle} {...story}>{ending.title}</h2>
            <p className={styles.lede} {...story}>{ending.body}</p>
            {keepsake(ending.keep) && <div className={styles.kept}><p className={styles.stamp}>{copy.kept}</p><p className={styles.keptName} {...story}>{keepsake(ending.keep)!.name}</p><p {...story}>{keepsake(ending.keep)!.note}</p></div>}
            <div className={styles.actions}><button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={toNext} data-life="next-chapter">{nextChapter(pack, chapter.id) ? copy.nextChapter : copy.theEnd}</button></div>
          </div>
        </section>
      )}

      {phase === 'finished' && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-card-title" data-life="finished">
          <div className={styles.ticket}>
            <p className={styles.serial}>{pack.club.name}</p>
            <h2 id="life-card-title" className={styles.cardTitle}>{copy.finished}</h2>
            <p className={styles.lede}>{copy.finishedNote}</p>
            <h3 className={styles.heading}>{copy.yourEndings}</h3>
            <ol className={styles.lifeLine}>
              {pack.chapters.filter(c => state.done[c.id]).map(c => <li key={c.id}><span><bdi>{c.age}</bdi></span><span {...story}>{c.endings[state.done[c.id]!]?.title ?? c.title}</span></li>)}
            </ol>
            <Box pack={pack} state={state} copy={copy} story={story} />
            <div className={styles.actions}>
              <button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={() => begin(true)}>{copy.again}</button>
              <Link className={`${styles.quiet} min-h-tap`} href={hubHref}>{copy.backToClub}</Link>
            </div>
            <a className={`${styles.credit} min-h-tap`} href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer" aria-label={copy.creditAria}>{copy.credit}</a>
          </div>
        </section>
      )}

      {overlay?.k === 'card' && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-card-title" data-life="archive-card" data-clear="true">
          <div className={styles.ticket} data-kind="archive">
            <p className={styles.serial}>{overlay.card.kicker}</p>
            <h2 id="life-card-title" className={styles.cardTitle} lang={overlay.card.archive?.locale} dir="auto">{overlay.card.title}</h2>
            {overlay.card.body && <p className={styles.lede} lang={overlay.card.archive?.locale} dir="auto">{overlay.card.body}</p>}
            {archiveBlock(overlay.card)}
            <div className={styles.actions}><button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={closeOverlay} data-life="card-close">{copy.next}</button></div>
          </div>
        </section>
      )}

      {overlay?.k === 'game' && (
        <div className={`${styles.cover} z-[60]`} data-clear="true" data-life="game">
          <MiniGame game={overlay.d.game} id={overlay.d.id} amount={overlay.d.then.reduce((n, fx) => n + (fx.e === 'coins' && fx.by > 0 ? fx.by : 0), 0) || 8} copy={copy} reduced={reduced} cue={cue} onDone={closeOverlay} />
        </div>
      )}

      {sheet === 'map' && playing && chapter && (
        <CityMap city={cityOf(pack, chapter, state)} clubId={pack.clubId} night={state.time === 'night'} copy={copy} story={story} onTravel={travel} onClose={() => setSheet('none')} />
      )}
      {sheet === 'me' && playing && chapter && <MeSheet pack={pack} chapter={chapter} state={state} copy={copy} locale={locale} story={story} onClose={() => setSheet('none')} />}

      {menu !== 'closed' && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-menu-title" data-life="menu">
          <div className={styles.ticket}>
            {menu === 'confirm' ? (
              <>
                <h2 id="life-menu-title" className={styles.cardTitle}>{copy.startOver}</h2>
                <p className={styles.lede}>{copy.startOverConfirm}</p>
                <div className={styles.actions}>
                  <button type="button" ref={primary} className={`${styles.quiet} min-h-tap`} onClick={() => setMenu('closed')}>{copy.no}</button>
                  <button type="button" className={`${styles.button} min-h-tap`} onClick={() => { setMenu('closed'); runner.current = null; setTalk(null); setOverlay(null); begin(true) }}>{copy.yes}</button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.serial}>{pack.club.name}</p>
                <h2 id="life-menu-title" className={styles.cardTitle}>{copy.menuTitle}</h2>
                <div className={styles.menuList}>
                  <button type="button" ref={primary} className={`${styles.button} min-h-tap`} onClick={() => setMenu('closed')} data-life="menu-resume">{copy.resume}</button>
                  <button type="button" className={`${styles.row} min-h-tap`} onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? copy.soundOn : copy.soundOff}</button>
                  <button type="button" className={`${styles.row} min-h-tap`} onClick={restartChapter}>{copy.restartChapter}<small>{copy.restartChapterNote}</small></button>
                  <button type="button" className={`${styles.row} min-h-tap`} onClick={() => setMenu('confirm')}>{copy.startOver}</button>
                </div>
                <Box pack={pack} state={state} copy={copy} story={story} />
                <nav className={styles.links} aria-label={copy.language}>
                  <Link className="min-h-tap" href={hubHref}>{copy.backToClub}</Link>
                                    {ENABLED_LOCALES.length>1&&<Link className="min-h-tap" href={langHref.he} hrefLang="he" lang="he">{copy.hebrew}</Link>}
                </nav>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

const doneObjective = (c: Chapter['objectives'][number]['done'], state: LifeState): boolean => meets(state, c)

function Box({pack, state, copy, story}: {pack: LifePack; state: LifeState; copy: Copy; story: {lang?: string; dir?: 'ltr'}}) {
  const kept = state.keeps.flatMap(id => { for (const c of pack.chapters) { const k = c.keepsakes?.find(x => x.id === id); if (k) return [{...k, age: c.age}] } return [] })
  return (
    <section className={styles.box} aria-label={copy.box} data-life="box">
      <h3 className={styles.heading}>{copy.box}</h3>
      {kept.length === 0 ? <p className={styles.muted}>{copy.boxEmpty}</p> : (
        <ul>{kept.map(k => <li key={k.id}><span className={styles.boxAge}><bdi>{k.age}</bdi></span><span><b lang={k.id.startsWith('night:') ? undefined : story.lang} dir="auto">{k.name}</b><small {...story}>{k.note}</small></span></li>)}</ul>
      )}
    </section>
  )
}
