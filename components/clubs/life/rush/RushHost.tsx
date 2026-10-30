'use client'
/**
 * LIFE · RUSH — the host. TOWN stops, the picture cuts, the mission plays, and one `MissionResult`
 * goes back to LIFE. This component owns the glass (every word is DOM, in the supporter's language)
 * and the input; `lib/life/rush/sim.ts` owns what happens and `./stage.ts` draws it.
 *
 * The rules it keeps (ADR-fanlife-0013):
 *  · a mission never dead-ends: a slip carries the day on, two slips open story mode;
 *  · a mandatory mission has no skip, everything else can be skipped from the briefing or the pause;
 *  · a device that cannot draw the mission hands the day back as `ok` — the story is never blocked by a GPU;
 *  · three.js is loaded only when a mission starts, never with LIFE itself.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import {buildLevel, cluesShown, patrolAt, type Level} from '@/lib/life/rush/level'
import {flatSight} from '@/lib/life/rush/flat'
import {COST, IDLE, nearSearch, resultOf, startSim, stepSim, stepTarget, STEP, type Input, type Sim} from '@/lib/life/rush/sim'
import type {SearchKind} from '@/lib/life/rush/level'
import {ASSIST_AFTER_FAILS, type MissionResult, type MissionSpec} from '@/lib/life/rush/spec'
import {RUSH_WORDS, rushWord, type RushKey, type RushLocale} from '@/lib/life/rush/words'
import type {Quality, Stage} from '@/lib/life/rush-render/stage'
import {drawMap} from '@/lib/life/rush-render/minimap'
import {cardFor} from '@/lib/life/rush/cards'
import css from './rush.module.css'

type Phase = 'brief' | 'play' | 'pause' | 'ending' | 'result' | 'error'
export type RushHostProps = {
  spec: MissionSpec
  skin: VoxelSkin
  locale: RushLocale
  reduced: boolean
  /** the club's gate as its own signs write it ("Gate 5", "ΘΥΡΑ 7") */
  gateLabel: string
  quality?: Quality
  /** LIFE's own sound (the same recordings the day uses); silent when absent */
  cue?: (name: string) => void
  onDone: (result: MissionResult) => void
  /** the QA stand only: hands the running simulation and its level to a probe (`window.__rush`) */
  probe?: boolean
}

const fmt = (s: number) => { const v = Math.max(0, Math.round(s)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` }
const ENDING_SECONDS = 2.4
/** the countdown before the run: the camera comes down from the crane while it counts */
const INTRO_SECONDS = 2.4

export function RushHost({spec, skin, locale, reduced, gateLabel, quality, cue, onDone, probe}: RushHostProps) {
  const cueRef = useRef(cue)
  useEffect(() => { cueRef.current = cue }, [cue])
  const sfx = (name: string) => { try { cueRef.current?.(name) } catch { /* a sound that fails is silence */ } }
  const w = useCallback((k: RushKey | string, vars: Record<string, string> = {}) => rushWord(locale, k, {gate: gateLabel, ...vars}), [locale, gateLabel])
  const level = useMemo<Level>(() => buildLevel(spec), [spec])
  const [phase, setPhase] = useState<Phase>('brief')
  const [fails, setFails] = useState(0)
  const [assist, setAssist] = useState(false)
  const [outcome, setOutcome] = useState<MissionResult | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cam, setCam] = useState(spec.camera)
  const [cut, setCut] = useState(false)
  const [touch, setTouch] = useState(false)
  const [clueKeys, setClueKeys] = useState<string[]>([])
  const [sprintOn, setSprintOn] = useState(false)
  /** the first time the thumb has not touched the stick yet: a ghost stick shows where it lives */
  const [ghost, setGhost] = useState(true)
  const [stickAt, setStickAt] = useState<{x: number; y: number; dx: number; dy: number} | null>(null)
  const [objIx, setObjIx] = useState(0)
  const [extras, setExtras] = useState(0)
  const [objFlash, setObjFlash] = useState(false)
  /** 3 · 2 · 1 · GO over the crane coming down — the moment the day becomes a game */
  const [count, setCount] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<Stage | null>(null)
  const simRef = useRef<Sim | null>(null)
  /** a sim that never moves: the place behind the briefing, seen from the crane before the run starts */
  const previewRef = useRef<Sim | null>(null)
  const phaseRef = useRef<Phase>('brief')
  const camRef = useRef(spec.camera)
  const keys = useRef<Record<string, boolean>>({})
  const act = useRef(false)
  /* close up: the place within reach of his hands, and the one he is going through */
  const nearKind = useRef<SearchKind | null>(null), emptyN = useRef(0)
  const [near, setNear] = useState<SearchKind | null>(null)
  const eye = useRef<HTMLDivElement | null>(null)
  const [searching, setSearching] = useState<SearchKind | null>(null)
  const [found, setFound] = useState<{kind: string; n: number} | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const emptyKinds = useRef(new Set<string>())
  const stick = useRef({id: -1, ox: 0, oy: 0, x: 0, y: 0})
  const endT = useRef(0)
  const introT = useRef(0)
  const hud = {clock: useRef<HTMLElement | null>(null), clockPlate: useRef<HTMLDivElement | null>(null), legs: useRef<HTMLElement | null>(null), seen: useRef<HTMLElement | null>(null), left: useRef<HTMLElement | null>(null), progress: useRef<HTMLElement | null>(null), arrow: useRef<HTMLElement | null>(null), dist: useRef<HTMLElement | null>(null), map: useRef<HTMLCanvasElement | null>(null)}
  const primary = useRef<HTMLButtonElement | null>(null)
  const done = useRef(false)
  const sprintOnRef = useRef(false)
  useEffect(() => { sprintOnRef.current = sprintOn }, [sprintOn])

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { camRef.current = cam }, [cam])
  useEffect(() => { try { setTouch(window.matchMedia('(pointer: coarse)').matches) } catch { /* no media queries */ } }, [])
  useEffect(() => { if (phase === 'brief' || phase === 'result' || phase === 'pause' || phase === 'error') primary.current?.focus() }, [phase])

  const finish = useCallback((r: MissionResult) => { if (done.current) return; done.current = true; onDone(r) }, [onDone])

  const say = useCallback((text: string, ms = 2600) => {
    setSub(text)
    window.setTimeout(() => setSub(cur => cur === text ? null : cur), ms)
  }, [])
  const pop = useCallback((text: string) => { setToast(text); window.setTimeout(() => setToast(cur => cur === text ? null : cur), 1200) }, [])

  /* the picture: loaded once, kept until the host closes */
  useEffect(() => {
    let alive = true
    const canvas = canvasRef.current
    if (!canvas) return
    const q: Quality = quality ?? (((navigator as {deviceMemory?: number}).deviceMemory ?? 8) <= 3 || window.matchMedia('(pointer: coarse)').matches ? 'lite' : 'high')
    import('@/lib/life/rush-render/stage').then(({createStage}) => {
      if (!alive) return
      try {
        const st = createStage({canvas, level, spec, skin, quality: q, reduced, gateLabel})
        stageRef.current = st
        st.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight)
      } catch { setPhase('error') }
    }).catch(() => { if (alive) setPhase('error') })
    const onResize = () => stageRef.current?.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize); stageRef.current?.dispose(); stageRef.current = null }
  }, [level, spec, skin, quality, reduced, gateLabel])

  const begin = useCallback((withAssist: boolean) => {
    simRef.current = startSim(level, withAssist)
    // the QA stand, or a device the LIFE harness marked for probing (the same key LifeGame's own probe reads)
    let marked = false
    try { marked = window.localStorage.getItem('fan-life:life:probe') === '1' } catch { /* no storage */ }
    if (probe || marked) (window as unknown as {__rush?: unknown}).__rush = {sim: simRef.current, level}
    endT.current = 0
    introT.current = reduced ? 0 : INTRO_SECONDS
    if (!reduced) {
      const beat = INTRO_SECONDS / 4
      ;['3', '2', '1', 'GO'].forEach((n, i) => window.setTimeout(() => { setCount(n); sfx(n === 'GO' ? 'whistle' : 'clock-tick') }, i * beat * 1000))
      window.setTimeout(() => setCount(null), (INTRO_SECONDS + 0.5) * 1000)
    }
    setOutcome(null)
    setClueKeys(level.place === 'crowd' ? cluesShown(level, 0) : [])
    setObjIx(0); setExtras(0)
    setCam(spec.camera)
    if (!reduced) { setCut(false); requestAnimationFrame(() => setCut(true)) }
    if (reduced) sfx('whistle')
    setPhase('play')
  }, [level, reduced, spec.camera, probe])

  /* the loop: fixed steps for the simulation, one picture per frame */
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, shownClues = -1, tiredSaid = false, stride = 0, mapTick = 0
    const pad = (): Input => {
      const k = keys.current
      let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + stick.current.x
      let z = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0) + stick.current.y
      let sprint = !!(k.ShiftLeft || k.ShiftRight) || sprintOnRef.current
      let a = act.current
      try {
        for (const g of navigator.getGamepads?.() ?? []) {
          if (!g) continue
          const ax = g.axes[0] ?? 0, az = g.axes[1] ?? 0
          if (Math.abs(ax) > 0.15) x += ax
          if (Math.abs(az) > 0.15) z += az
          if (g.buttons[5]?.pressed || g.buttons[7]?.pressed) sprint = true
          if (g.buttons[0]?.pressed) a = true
        }
      } catch { /* no gamepads */ }
      // the screen is mirrored for a Hebrew reader only in its words, never in its world: right is right
      return {x, z, sprint, act: a}
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const wall = (now - last) / 1000, real = Math.min(wall, 0.25); last = now
      const ph = phaseRef.current
      if (!previewRef.current) previewRef.current = startSim(level)
      const sim = ph === 'brief' ? previewRef.current : simRef.current, stage = stageRef.current
      if (!sim || !stage) return
      if (ph === 'play' || ph === 'ending') {
        // the countdown is on the wall clock, like the numbers on the glass, however slow the frames come
        if (introT.current > 0) introT.current -= Math.min(wall, 1)
        const input = ph === 'play' && introT.current <= 0 ? pad() : IDLE
        // the clock does not run while the countdown does: the run starts on GO
        acc += introT.current > 0 ? 0 : real
        let steps = 0
        while (acc >= STEP && steps < 12) {
          stepSim(level, sim, input, STEP)
          if (input.act) { act.current = false; input.act = false }
          for (const e of sim.events) {
            // what a knock cost, in the clock's own seconds — nothing in story mode
            const cost = (n: number) => { if (!sim.assist) pop(`−${n}s`) }
            if (e.k === 'hit') { say(w(`ev.${e.by}`), 1400); cost(COST[e.by]); sfx(e.by === 'police' ? 'whistle' : 'bounce') }
            else if (e.k === 'caught') { say(w('ev.caught'), 1800); cost(24); sfx('whistle'); sfx('caught') }
            else if (e.k === 'wrong') { say(w('ev.wrong'), 1200); cost(12); sfx('tick') }
            else if (e.k === 'found') { say(w('ev.found'), 1600); sfx('reveal') }
            else if (e.k === 'grab') { say(w('ev.grab'), 1200); sfx('keep') }
            else if (e.k === 'drop') { say(w('ev.drop'), 1400); sfx('bounce') }
            else if (e.k === 'voice') { say(w(e.key), 2600); if (e.key.endsWith('.3') || e.key.endsWith('.4') || e.key.endsWith('.2')) sfx('murmur') }
            else if (e.k === 'end') { phaseRef.current = 'ending'; setPhase('ending'); endT.current = 0; sfx(e.outcome === 'slip' ? 'murmur' : 'roar') }
            else if (e.k === 'step') { setObjIx(e.next < 0 ? level.steps.length : e.next); setObjFlash(true); window.setTimeout(() => setObjFlash(false), 900); sfx('objective') }
            else if (e.k === 'talk') say(w(e.key), 3000)
            else if (e.k === 'pickup') { if (e.extra) { setExtras(n => n + 1); pop(`+${e.bonus}s · ${w(`got.${e.kind}`)}${e.streak > 1 ? ` · ${w('ev.streak', {n: String(e.streak)})}` : ''}`) } else { /* the thing the job is for: a stamp the whole screen feels, in every mission, not a toast */ setFound(f => ({kind: String(e.kind), n: (f?.n ?? 0) + 1})) } sfx(e.kind === 'coin' ? 'coin' : e.kind === 'paint' ? 'spray' : 'pickup') }
            else if (e.k === 'chant') { say(w('ev.chant'), 1800); pop(`+${e.bonus}s`); sfx('roar') }
            else if (e.k === 'favour') { say(w(`fav.${e.kind}`), 2400); pop(`+${e.bonus}s`); sfx('keep') }
            else if (e.k === 'surge') { say(w('ev.surge'), 2200); sfx('murmur') }
            else if (e.k === 'noise') { say(w('ev.noise'), 1500); sfx('clang') }
            else if (e.k === 'missed') { say(w('ev.missed'), 2200); cost(20); sfx('murmur') }
            else if (e.k === 'notyet') say(w('ev.notyet'), 2000)
            else if (e.k === 'escort') { say(w(`esc.${e.state}`), 1800); if (e.state !== 'ok') sfx('tick') }
            else if (e.k === 'search') {
              // close up: the place he is going through is named; what it gave (or did not) comes in the pop
              if (e.state === 'start') { setSearching(e.kind); sfx('tick') }
              else { setSearching(null); if (e.state === 'empty') { emptyN.current++; /* the place answers in its own words the first time; after that, a shrug */ const own = `ev.empty.${e.kind}` as RushKey, seen = emptyKinds.current; if (!seen.has(e.kind)) { seen.add(e.kind); say(w(own), 2600) } else pop(w(`ev.empty.${(emptyN.current % 4) + 1}` as RushKey)); sfx('tick') } }
            }
            else if (e.k === 'creak') { say(w(e.loud ? 'ev.creak.loud' : 'ev.creak'), 1400); sfx(e.loud ? 'clang' : 'tick') }
          }
          acc -= STEP; steps++
        }
        if (acc > STEP * 12) acc = 0
        // feet on the pavement: one step a stride, faster when he runs
        if (ph === 'play' && level.place !== 'road' && sim.speed > 1.5) { stride += real * (1.6 + sim.speed * 0.28); if (stride >= 1) { stride = 0; sfx('step') } }
        if (sim.stamina < 0.25 && !tiredSaid && level.place !== 'road') { tiredSaid = true; say(w('ev.tired'), 1800) }
        if (sim.stamina > 0.9) tiredSaid = false
        if (level.place === 'crowd') { const n = cluesShown(level, sim.t, sim.asked).length; if (n !== shownClues) { shownClues = n; setClueKeys(cluesShown(level, sim.t, sim.asked)) } }
        if (ph === 'ending') {
          endT.current += real
          if (endT.current > ENDING_SECONDS) {
            const r = resultOf(level, sim)
            phaseRef.current = 'result'; setPhase('result'); setOutcome(r)
            if (r.outcome === 'slip') setFails(f => f + 1)
          }
        }
        // HUD by reference: no React render per frame
        const left = Math.max(0, sim.clock)
        if (hud.clock.current) hud.clock.current.textContent = fmt(left)
        hud.clockPlate.current?.setAttribute('data-low', String(left < level.timeScale * 15)); rootRef.current?.setAttribute('data-low', String(left < level.timeScale * 10 && left > 0))
        if (hud.legs.current) hud.legs.current.style.inlineSize = `${Math.round(sim.stamina * 100)}%`
        if (hud.seen.current) hud.seen.current.style.inlineSize = `${Math.round(sim.seen * 100)}%`
        // at home at night: an eye that opens as her look comes round to where he is (only when she could see him at all)
        if (eye.current && level.place === 'flat' && level.verb === 'sneak') {
          let k = 0
          for (const p of level.patrols) {
            if (!p.range) continue
            const at = patrolAt(p, sim.t), d = Math.hypot(sim.x - at.x, sim.z - at.z)
            if (d > p.range || !flatSight(at, sim)) continue
            let a = Math.atan2(sim.x - at.x, sim.z - at.z) - at.face; a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)))
            k = Math.max(k, 1 - Math.min(1, Math.max(0, a - p.fov / 2) / 1.1))
          }
          const st = k >= 0.98 ? 'on' : k > 0.45 ? 'turning' : k > 0 ? 'away' : 'off'
          if (eye.current.dataset.state !== st) { eye.current.dataset.state = st; eye.current.textContent = st === 'off' ? '' : w(`hud.eye.${st}` as RushKey) }
          eye.current.style.setProperty('--open', String(k))
        }
        const g = level.home && sim.back ? level.home : level.goal
        const dist = Math.hypot(g.x - sim.x, g.z - sim.z)
        if (hud.left.current) hud.left.current.textContent = level.place === 'crowd' ? '' : `${Math.round(dist)} m`
        // progress through the steps, and through the one that is open
        const tg = stepTarget(level, sim)
        const td = tg ? Math.hypot(tg.x - sim.x, tg.z - sim.z) : 0
        if (hud.progress.current) hud.progress.current.style.inlineSize = `${Math.round(Math.min(1, (Math.min(sim.step, level.steps.length) + Math.max(0, 1 - td / 120)) / Math.max(1, level.steps.length)) * 100)}%`
        const pointed = !!tg && !(level.place === 'crowd' && level.steps[sim.step]?.kind === 'goal')
        if (hud.dist.current) hud.dist.current.textContent = pointed ? `${Math.round(td)} m` : ''
        // the compass: where the next step is, from the way he faces (chase) or looks (eyes)
        if (hud.arrow.current) {
          hud.arrow.current.style.opacity = pointed ? '1' : '0'
          // at home the camera never turns with him, so the arrow points on the screen; elsewhere it points from the way he faces
          if (tg) { const rel = Math.atan2(tg.x - sim.x, tg.z - sim.z) - (level.place === 'flat' ? Math.PI : sim.heading); hud.arrow.current.style.transform = `rotate(${-rel}rad)` }
        }
        // the place within reach of his hands: the act button names it
        const ns = sim.searchI < 0 ? nearSearch(level, sim) : -1, nk = ns >= 0 ? level.searches[ns]!.kind : null
        if (nk !== nearKind.current) { nearKind.current = nk; setNear(nk) }
        mapTick++
        if (hud.map.current && level.place !== 'road' && mapTick % 2 === 0) { const c = hud.map.current.getContext('2d'); if (c) drawMap(c, level, sim, skin, hud.map.current.clientWidth || 112) }
      }
      stage.render(sim, {cam: camRef.current, ending: ph === 'ending' || ph === 'result', endT: endT.current, outcome: sim.ended, intro: introT.current, brief: ph === 'brief'}, ph === 'pause' ? 0 : real)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [level, say, pop, w, skin]) // eslint-disable-line react-hooks/exhaustive-deps

  /* the keyboard */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      const ph = phaseRef.current
      if (ph === 'play') {
        if (e.code === 'KeyV' && level.place !== 'road' && level.place !== 'flat') setCam(c => c === 'chase' ? 'eyes' : 'chase')
        if (e.code === 'KeyE' || e.code === 'Space') { act.current = true; e.preventDefault() }
        if (e.code === 'Escape' || e.code === 'KeyP') { setPhase('pause'); e.preventDefault() }
        if (e.code.startsWith('Arrow')) e.preventDefault()
      } else if (ph === 'pause' && e.code === 'Escape') { setPhase('play'); e.preventDefault() }
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {}; if (phaseRef.current === 'play') setPhase('pause') }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [level.place])

  /* the thumb stick */
  const rtl = locale === 'he'
  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setGhost(false)
    if (phaseRef.current !== 'play') return
    stick.current = {id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0}
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setStickAt({x: e.clientX, y: e.clientY, dx: 0, dy: 0})
  }
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stick.current.id) return
    let dx = e.clientX - stick.current.ox, dy = e.clientY - stick.current.oy
    const d = Math.hypot(dx, dy), m = 52
    if (d > m) { dx *= m / d; dy *= m / d }
    stick.current.x = dx / m; stick.current.y = dy / m
    setStickAt(s => s ? {...s, dx, dy} : s)
  }
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => { if (e.pointerId !== stick.current.id) return; stick.current = {id: -1, ox: 0, oy: 0, x: 0, y: 0}; setStickAt(null) }

  const skip = () => finish({outcome: 'ok', clockLeft: 0, evidence: [], assisted: false, skipped: true})
  const deviceFailed = () => finish({outcome: 'ok', clockLeft: 0, evidence: [], assisted: true, skipped: false})
  const storyAvailable = fails >= ASSIST_AFTER_FAILS
  const verbKey = `verb.${spec.verb}`
  const card = cardFor(spec.template)
  const curStep = level.steps[objIx]
  const objective = phase === 'play' || phase === 'ending' ? (curStep ? w(curStep.key) : w('hud.done')) : ''
  const extrasOf = level.pickups.filter(p => p.step === null).length
  const canAct = level.place === 'crowd' || level.noises.length > 0 || level.favours.length > 0 || level.steps.some(x => x.kind === 'talk') || level.searches.length > 0
  const actHot = curStep?.kind === 'talk' || !!near
  // a mission whose clock is its own (the school bus, the bus home) says so; else the place's own clock
  const ownClock = `hud.clock.${spec.template}` as RushKey
  const clockKey: RushKey = ownClock in RUSH_WORDS.en ? ownClock : level.place === 'crowd' ? 'hud.clock.find' : 'hud.clock'
  const anchor = spec.anchor

  return (
    <div className={`${css.rush} z-[60]`} dir={rtl ? 'rtl' : 'ltr'} lang={locale} role="dialog" aria-modal="true" aria-label={spec.title} data-life="rush" data-phase={phase} ref={rootRef}>
      <canvas ref={canvasRef} className={css.canvas} aria-hidden="true" />
      <div className={css.cut} data-on={cut && phase === 'play'} aria-hidden="true" />
      {/* the thing came out of the place: a beat the whole screen feels, then the hunt goes on */}
      {found && <div className={css.found} key={found.n} aria-hidden="true"><b>{w('hud.found')}</b><span>{w(`got.${found.kind}` as RushKey)}</span></div>}
      <div className={css.tension} aria-hidden="true" />
      {count && <div className={css.count} aria-hidden="true" key={count} data-go={count === 'GO'}><span>{count === 'GO' ? w('brief.go') : count}</span></div>}

      {(phase === 'play' || phase === 'ending') && (
        <div className={css.hud}>
          <div ref={hud.clockPlate} className={`${css.plate} ${css.clock}`} data-low="false"><span>{w(clockKey)}</span><b ref={hud.clock}>{fmt(level.realSeconds * level.timeScale)}</b><em className={css.low}>{w('hud.low')}</em></div>
          <div className={`${css.plate} ${css.meters}`}>
            <span>{w(verbKey)} · <bdi ref={hud.left} /></span>
            <div className={css.bar} aria-hidden="true"><i ref={hud.progress} /></div>
            {level.place !== 'road' && <><span>{w('hud.legs')}</span><div className={css.bar} aria-hidden="true"><i ref={hud.legs} style={{inlineSize: '100%'}} /></div></>}
            {(level.place === 'yard' || level.verb === 'sneak') && <><span>{w('hud.seen')}</span><div className={css.bar} data-hot="true" aria-hidden="true"><i ref={hud.seen} style={{inlineSize: '0%'}} /></div></>}
          </div>
          {assist && <div className={`${css.plate} ${css.story}`}>{w('hud.story')}</div>}
          {objective && (
            <div className={`${css.plate} ${css.objective}`} data-flash={objFlash} aria-live="polite" data-life="rush-objective">
              <span className={css.objStep}>{w('hud.step', {n: String(Math.min(objIx + 1, level.steps.length)), m: String(level.steps.length)})}</span>
              <b>{objective}</b>
              <span className={css.objDist}><i ref={hud.arrow} className={css.arrow} aria-hidden="true" /><bdi ref={hud.dist} /></span>
            </div>
          )}
          {extrasOf > 0 && <div className={`${css.plate} ${css.extras}`} data-low={level.place === 'yard' || level.verb === 'sneak'}><span>{w('hud.extras')}</span><b><bdi>{extras}/{extrasOf}</bdi></b></div>}
          {level.place !== 'road' && <canvas ref={hud.map} className={css.map} width={224} height={224} aria-label={w('hud.map')} role="img" />}
          {clueKeys.length > 0 && <div className={`${css.plate} ${css.clues}`} aria-live="polite">{w('hud.clue')}: {clueKeys.map(c => w(`clue.${c}`)).join(' · ')}</div>}
          <button type="button" className={`${css.pauseBtn} min-h-tap`} aria-label={w('hud.pause')} onClick={() => setPhase('pause')}>Ⅱ</button>
          {level.place === 'flat' && level.verb === 'sneak' && <div ref={eye} className={css.eye} data-state="off" aria-live="polite" />}
          {(searching || (near && phase === 'play')) && <div className={css.prompt} data-on={!!searching} aria-live="polite">{searching ? <>{w('hud.searching')} <b>{w(`search.${searching}` as RushKey)}</b></> : <>{!touch && <kbd>E</kbd>} {w('hud.search')} · <b>{w(`search.${near}` as RushKey)}</b></>}</div>}
          <div className={css.sub} aria-live="polite"><span data-on={!!sub}>{sub ?? ''}</span></div>
          {toast && <div className={css.toast} role="status" aria-live="polite"><span>{toast}</span></div>}
          {touch ? (
            <>
              {ghost && phase === 'play' && <div className={css.ghost} aria-hidden="true"><i /><span>{w('hud.drag')}</span></div>}
              <div className={css.stickZone} onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp} />
              {stickAt && <div className={css.stick} data-on="true" style={{insetBlockStart: stickAt.y, insetInlineStart: rtl ? window.innerWidth - stickAt.x : stickAt.x}}><i style={{transform: `translate(${stickAt.dx}px, ${stickAt.dy}px)`}} /></div>}
              <div className={css.pads}>
                {level.place !== 'road' && level.place !== 'flat' && <button type="button" className={`${css.pad} min-h-tap`} aria-pressed={cam === 'eyes'} onClick={() => setCam(c => c === 'chase' ? 'eyes' : 'chase')}>{w('hud.camera')}</button>}
                {canAct && <button type="button" className={`${css.pad} min-h-tap`} data-hot={actHot} onPointerDown={e => { e.preventDefault(); act.current = true }}>{near ? w('hud.search') : w(level.place === 'crowd' && level.steps[objIx]?.kind === 'goal' ? 'hud.act' : 'hud.use')}</button>}
                <button type="button" className={`${css.pad} min-h-tap`} data-big="true" data-on={sprintOn} onPointerDown={e => { e.preventDefault(); setSprintOn(true) }} onPointerUp={() => setSprintOn(false)} onPointerLeave={() => setSprintOn(false)} onPointerCancel={() => setSprintOn(false)}>{w('hud.sprint')}</button>
              </div>
            </>
          ) : <p className={css.keys}>{w(level.place === 'road' ? 'brief.controls.drive' : level.place === 'flat' ? (level.verb === 'sneak' ? 'brief.controls.keys.night' : level.searches.length ? 'brief.controls.keys.home' : 'brief.controls.keys.flat') : 'brief.controls.keys')}</p>}
        </div>
      )}

      {phase === 'brief' && (
        <div className={css.cover} data-scene={!card}>
          <section className={css.ticket}>
            {/* eslint-disable-next-line @next/next/no-img-element -- grey bytes ship as measured: a re-encode may tint them (rule 61) */}
            {card && <img className={css.card} src={card} alt="" width={1200} height={675} decoding="async" />}
            <p className={css.kicker}><span>{w('brief.kicker')} · {w(verbKey)}</span>{spec.mandatory && <span>{w('brief.required')}</span>}</p>
            <h2 id="rush-title" className={css.title}>{spec.title}</h2>
            <p className={css.brief}>{spec.brief}</p>
            {anchor ? (
              <div className={css.archive}><b>{w('brief.archive')}</b><span lang={anchor.locale} dir="auto">{anchor.title}</span></div>
            ) : <p className={css.fine}>{w('brief.neutral')}</p>}
            <p className={css.fine}>{w(touch ? 'brief.controls.touch' : level.place === 'road' ? 'brief.controls.drive' : level.place === 'flat' ? (level.verb === 'sneak' ? 'brief.controls.keys.night' : level.searches.length ? 'brief.controls.keys.home' : 'brief.controls.keys.flat') : 'brief.controls.keys')}</p>
            <div className={css.actions}>
              <button type="button" ref={primary} className={`${css.btn} ${css.go} min-h-tap`} data-primary="true" onClick={() => begin(assist)} data-life="rush-go">{w('brief.go')}</button>
            </div>
            {/* the way out is there for whoever needs it, and quiet for everybody else: the mission is the invitation */}
            {!spec.mandatory && <button type="button" className={`${css.quiet} min-h-tap`} onClick={skip} data-life="rush-skip">{w('brief.skip')}</button>}
          </section>
        </div>
      )}

      {phase === 'pause' && (
        <div className={css.cover}>
          <section className={css.ticket} aria-labelledby="rush-pause">
            <h2 id="rush-pause" className={css.title}>{w('pause.title')}</h2>
            {assist && <p className={css.fine}>{w('pause.story.on')}</p>}
            <div className={css.actions}>
              {!spec.mandatory && <button type="button" className={`${css.btn} min-h-tap`} onClick={skip}>{w('pause.skip')}</button>}
              {storyAvailable && !assist && <button type="button" className={`${css.btn} min-h-tap`} onClick={() => { setAssist(true); if (simRef.current) simRef.current.assist = true; setPhase('play') }}>{w('pause.story')}</button>}
              <button type="button" className={`${css.btn} min-h-tap`} onClick={() => begin(assist)}>{w('pause.restart')}</button>
              <button type="button" ref={primary} className={`${css.btn} min-h-tap`} data-primary="true" onClick={() => setPhase('play')}>{w('pause.resume')}</button>
            </div>
          </section>
        </div>
      )}

      {phase === 'result' && outcome && (
        <div className={css.cover}>
          <section className={css.ticket} aria-labelledby="rush-result" data-life="rush-result" data-outcome={outcome.outcome}>
            <p className={css.kicker}><span>{spec.title}</span></p>
            <h2 id="rush-result" className={css.big}>{w(`res.${outcome.outcome}`)}</h2>
            <p className={css.brief}>{w(`res.${outcome.outcome}.sub.${spec.template}`) || w(`res.${outcome.outcome}.sub`)}</p>
            {outcome.score && <p className={css.stars} aria-label={`${w('res.stars')}: ${outcome.score.stars}/3`} data-life="rush-stars">{[1, 2, 3].map(i => <span key={i} data-on={i <= outcome.score!.stars}>★</span>)}</p>}
            <p className={css.fine}>{outcome.outcome === 'slip' ? w('res.late') : `${fmt(outcome.clockLeft)} ${w('res.left')}`}</p>
            {outcome.score && outcome.score.extrasOf > 0 && <p className={css.fine}>{w('res.extras', {n: String(outcome.score.extras), m: String(outcome.score.extrasOf)})}{outcome.score.chants ? ` · ${w('res.chants', {n: String(outcome.score.chants)})}` : ''}{outcome.score.streak > 1 ? ` · ${w('res.streak', {n: String(outcome.score.streak)})}` : ''}</p>}
            {outcome.score && outcome.score.favours > 0 && <p className={css.fine}>{w('res.favours', {n: String(outcome.score.favours)})}</p>}
            {outcome.score && outcome.outcome !== 'slip' && !assist && <p className={css.fine} data-life="rush-knocks">{outcome.score.knocks ? w('res.knocks', {n: String(outcome.score.knocks), s: String(outcome.score.lost)}) : w('res.clean')}</p>}
            {anchor && <RecordedNight anchor={anchor} locale={locale} label={w('res.record')} source={w('res.source')} />}
            <div className={css.actions}>
              {outcome.outcome === 'slip' && storyAvailable && !assist && <button type="button" className={`${css.btn} min-h-tap`} onClick={() => { setAssist(true); begin(true) }}>{w('res.story')}</button>}
              {outcome.outcome === 'slip' && <button type="button" className={`${css.btn} min-h-tap`} onClick={() => begin(assist)}>{w('res.again')}</button>}
              <button type="button" ref={primary} className={`${css.btn} min-h-tap`} data-primary="true" onClick={() => finish(outcome)} data-life="rush-back">{w('res.carry')}</button>
            </div>
          </section>
        </div>
      )}

      {phase === 'error' && (
        <div className={css.cover}>
          <section className={css.ticket} role="alertdialog" aria-labelledby="rush-error">
            <h2 id="rush-error" className={css.title}>{spec.title}</h2>
            <p className={css.brief}>{w('err.webgl')}</p>
            <div className={css.actions}><button type="button" ref={primary} className={`${css.btn} min-h-tap`} data-primary="true" onClick={deviceFailed}>{w('res.carry')}</button></div>
          </section>
        </div>
      )}
    </div>
  )
}

/**
 * The night the mission stands on, printed exactly as the archive recorded it: the row's own title in its
 * own language, the day only when the archive knows the day (else the year), and who recorded it. Nothing
 * here is composed — a NEUTRAL or HELD mission has no anchor and shows nothing.
 */
function RecordedNight({anchor, locale, label, source}: {anchor: NonNullable<MissionSpec['anchor']>; locale: string; label: string; source: string}) {
  const when = anchor.precision === 'day' && anchor.on
    ? new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${anchor.on}T00:00:00Z`))
    : String(anchor.year)
  const src = anchor.sources[0]
  return (
    <div className={css.archive} data-life="rush-record">
      <b>{label}</b>
      <span lang={anchor.locale} dir="auto">{anchor.title}</span>
      <span className={css.recordMeta}><bdi>{when}</bdi>{src ? <> · {source}: {src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer">{src.publisher || src.title}</a> : <bdi>{src.publisher || src.title}</bdi>}</> : null}</span>
    </div>
  )
}
