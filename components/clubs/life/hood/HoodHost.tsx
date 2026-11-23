'use client'
/**
 * LIFE · the hood — the game. A full shell around the open neighbourhood: title, new life, intro cinematic, pause, district map,
 * kit bag, conversations, job card. `lib/life/hood/shell.ts` is the flow, `run.ts` the street's rules, `talk.ts` the conversations,
 * `rush-render/stage.ts` the picture. This file owns the input and wires them; every string comes from `lib/life/hood/words.ts`.
 * Nothing here ends the game: a device that cannot draw the street shows a card, nothing else is a fail state.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {hoodLevel, hoodSpec, type HoodClub} from '@/lib/life/hood/level'
import {acceptJob, openStep, personNear, startHood, stepHood, type HoodEvent, type HoodRun} from '@/lib/life/hood/run'
import {hoodWord, type HoodKey} from '@/lib/life/hood/words'
import {IDLE, STEP, type Input} from '@/lib/life/rush/sim'
import type {PersonId, PlaceId} from '@/lib/life/hood/types'
import {accentFor, brandAccent, cleanName, clockText, initialShell, isCrane, isFull, reduce, type Shell, type ShellEvent} from '@/lib/life/hood/shell'
import {advance, choose, nodeOf, talkScript, type TalkScript} from '@/lib/life/hood/talk'
import {bagOf, carryOf} from '@/lib/life/hood/bag'
import {hudTarget, metresTo, ringProgress} from '@/lib/life/hood/district'
import {browserStore, DEFAULT_SETTINGS, readSave, readSettings, restore, snapshot, writeSave, writeSettings, type HoodSave, type HoodSettings} from '@/lib/life/hood/save'
import type {Quality, Stage} from '@/lib/life/rush-render/stage'
import {drawMap} from '@/lib/life/rush-render/minimap'
import {Hud, RING_LEN, type Banner} from './Hud'
import {Talk} from './Talk'
import {Boot, Cinematic, Help, JobCard, NameEntry, Pause, Settings, Title} from './Screens'
import {MapScreen} from './MapScreen'
import {WatchCard} from '../watch/WatchCard'
import {watchFor, type WatchAnswer} from '@/lib/life/watch'
import {BagScreen} from './BagScreen'
import css from './hood.module.css'

export type HoodHostProps = {club: HoodClub; seed?: number; time?: 'day' | 'night' | 'dusk'; quality?: Quality; reduced?: boolean; /** the QA stand only: exposes the run as `window.__hood` and the shell as `window.__hoodShell` */ probe?: boolean; /** `play`: skip the title and start roaming (the QA stand) */ start?: 'title' | 'play'}

/** where the intro's camera subject stands on each beat: along the main street, mid-block, never on a crossing */
const INTRO_Z = [8, -48, -108, -270]

export function HoodHost({club, seed = 1, time = 'dusk', quality, reduced = false, probe, start = 'title'}: HoodHostProps) {
  const level = useMemo(() => hoodLevel(club, seed), [club, seed])
  const spec = useMemo(() => hoodSpec(club.id, seed, time), [club.id, seed, time])
  const runRef = useRef<HoodRun | null>(null)
  if (!runRef.current || runRef.current.level !== level) runRef.current = startHood(level)
  const canvasRef = useRef<HTMLCanvasElement | null>(null), stageRef = useRef<Stage | null>(null)
  const keys = useRef<Record<string, boolean>>({}), act = useRef(false), stick = useRef({id: -1, ox: 0, oy: 0, x: 0, y: 0})
  const camRef = useRef<'chase' | 'eyes'>('chase'), sprintRef = useRef(false)
  const hud = {arrow: useRef<HTMLElement | null>(null), dist: useRef<HTMLElement | null>(null), map: useRef<HTMLCanvasElement | null>(null), ring: useRef<SVGCircleElement | null>(null), clock: useRef<HTMLElement | null>(null)}

  const shellRef = useRef<Shell>(initialShell)
  const [shell, setShell] = useState<Shell>(initialShell)
  const [settings, setSettings] = useState<HoodSettings>(DEFAULT_SETTINGS)
  const [osReduced, setOsReduced] = useState(false), [touch, setTouch] = useState(false), [coarse, setCoarse] = useState(false)
  const [cam, setCam] = useState<'chase' | 'eyes'>('chase'), [error, setError] = useState(false), [ready, setReady] = useState(false), [bootGone, setBootGone] = useState(false)
  const [sprintOn, setSprintOn] = useState(false), [ghost, setGhost] = useState(true), [stickAt, setStickAt] = useState<{x: number; y: number; dx: number; dy: number} | null>(null)
  const [jobState, setJobState] = useState<HoodRun['job']>('idle'), [objIx, setObjIx] = useState(-1)
  const [place, setPlace] = useState<string | null>(null), [nearId, setNearId] = useState<PersonId | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [talk, setTalk] = useState<{script: TalkScript; id: string} | null>(null)
  const [waypoint, setWaypoint] = useState<PlaceId | null>(null), [wear, setWear] = useState(true), [mapKey, setMapKey] = useState(0)
  const [savedName, setSavedName] = useState(''), [coach, setCoach] = useState(true), [watch, setWatch] = useState<WatchAnswer | null>(null)
  const waypointRef = useRef<PlaceId | null>(null), wayLabelRef = useRef(''), pendingDone = useRef(false), wearRef = useRef(true)
  const storeRef = useRef<ReturnType<typeof browserStore>>(null)
  const timers = useRef<{banner: number; place: number}>({banner: 0, place: 0}), bannerId = useRef(0)

  const reducedEff = reduced || settings.reduced || osReduced
  const qualityEff: Quality = settings.quality ?? quality ?? (coarse ? 'lite' : 'high')
  const {accent, on: onAccent} = useMemo(() => accentFor(club.skin), [club.skin])
  const brand = useMemo(() => brandAccent(club.skin), [club.skin])

  /** the names the words print: the cast's first name, or the role's own word */
  const names = useMemo(() => {
    const out: Record<string, string> = {}
    for (const p of level.hood!.people) out[p.id] = p.name ?? hoodWord(`hood.who.${p.id}` as HoodKey)
    return out
  }, [level])
  const vars = useMemo(() => ({mate: names.mate!, kiosk: names.kiosk === hoodWord('hood.who.kiosk') ? hoodWord('hood.who.kiosk').toLowerCase() : `${names.kiosk}’s kiosk`, name: shell.name}), [names, shell.name])
  const w = useCallback((k: string, extra: Record<string, string> = {}) => hoodWord(k, {...vars, ...extra}), [vars])

  /* the flow */
  const go = useCallback((e: ShellEvent) => {
    const next = reduce(shellRef.current, e)
    if (next === shellRef.current) return
    shellRef.current = next
    if (next.screen !== 'playing') { stick.current = {id: -1, ox: 0, oy: 0, x: 0, y: 0}; act.current = false; keys.current = {}; sprintRef.current = false; setSprintOn(false); setStickAt(null) }
    setShell(next)
  }, [])
  const persist = useCallback(() => {
    const run = runRef.current!
    writeSave(storeRef.current, club.id, snapshot(run, shellRef.current.name, waypointRef.current, wearRef.current))
  }, [club.id])
  const freshRun = useCallback(() => {
    runRef.current = startHood(level)
    if (probe) (window as unknown as {__hood?: unknown}).__hood = runRef.current
    setJobState('idle'); setObjIx(-1); setWaypoint(null); waypointRef.current = null; setWear(true); wearRef.current = true; pendingDone.current = false; setPlace(null); setTalk(null)
  }, [level, probe])
  const loadSave = useCallback((s: HoodSave) => {
    freshRun()
    const run = runRef.current!
    restore(run, s)
    setJobState(run.job); setObjIx(openStep(run)); setWaypoint(s.waypoint); waypointRef.current = s.waypoint; setWear(s.wear); wearRef.current = s.wear
  }, [freshRun])

  const showBanner = useCallback((kind: Banner['kind'], title: string, sub?: string) => {
    window.clearTimeout(timers.current.banner)
    setBanner({id: ++bannerId.current, kind, title, sub})
    timers.current.banner = window.setTimeout(() => setBanner(null), kind === 'major' ? 2600 : 1700)
  }, [])

  const openTalk = useCallback((who: PersonId, key: string) => {
    const run = runRef.current!, j = run.level.hood!.jobs[0]!
    const script = talkScript(who, key, {job: run.job, giver: j.giver, offerKey: j.offerKey})
    setTalk({script, id: script.start}); go({t: 'talk'})
  }, [go])

  const handle = useCallback((evs: HoodEvent[]) => {
    const run = runRef.current!, j = run.level.hood!.jobs[0]!
    for (const e of evs) {
      if (e.k === 'say') { if (shellRef.current.screen === 'playing') openTalk(e.who, e.key) }
      else if (e.k === 'job') {
        setJobState(run.job)
        if (e.state === 'start') { showBanner('major', w('hood.banner.job'), w(j.titleKey)); persist() } else { pendingDone.current = true; persist() }
      } else if (e.k === 'step') {
        setObjIx(openStep(run))
        if (run.job === 'active' && e.next > j.from) showBanner('minor', w('hood.banner.step'))
        persist()
      } else if (e.k === 'pickup') showBanner('minor', w('hood.banner.battery'))
      else if (e.k === 'hit') showBanner('minor', w('hood.ev.hit'))
      else if (e.k === 'place') {
        window.clearTimeout(timers.current.place)
        if (e.id) {
          setPlace(e.id); timers.current.place = window.setTimeout(() => setPlace(null), 2600)
          if (waypointRef.current === e.id) { setWaypoint(null); waypointRef.current = null; showBanner('minor', w('hood.hud.arrived', {place: w(`hood.place.${e.id}`)})) }
        } else setPlace(null)
      }
    }
  }, [openTalk, persist, showBanner, w])

  const endTalk = useCallback(() => {
    setTalk(null); go({t: 'talkEnd'})
    if (pendingDone.current) { pendingDone.current = false; go({t: 'jobDone'}) }
    persist()
  }, [go, persist])
  const onGo = useCallback(() => { if (!talk) return; const s = advance(talk.script, talk.id); if (s.node) setTalk({...talk, id: s.node.id}); else endTalk() }, [talk, endTalk])
  const onChoose = useCallback((i: number) => {
    if (!talk) return
    const s = choose(talk.script, talk.id, i)
    if (s.effect === 'accept') handle(acceptJob(runRef.current!))
    if (s.node) setTalk({...talk, id: s.node.id}); else endTalk()
  }, [talk, endTalk, handle])

  const finishIntro = useCallback(() => { freshRun(); go({t: 'introDone'}); persist() }, [freshRun, go, persist])
  const startNew = useCallback((raw: string) => { go({t: 'name', name: cleanName(raw)}) }, [go])
  const doContinue = useCallback(() => {
    const s = readSave(storeRef.current, club.id)
    if (!s) return
    loadSave(s); go({t: 'continue', name: s.name})
  }, [club.id, loadSave, go])
  const changeSettings = useCallback((s: HoodSettings) => { setSettings(s); writeSettings(storeRef.current, s) }, [])

  /* start: storage, preferences, the first screen */
  useEffect(() => {
    storeRef.current = browserStore()
    setSettings(readSettings(storeRef.current))
    try { setTouch(window.matchMedia('(pointer: coarse)').matches); setCoarse(window.matchMedia('(pointer: coarse)').matches) } catch { /* no media queries */ }
    let mq: MediaQueryList | null = null
    const f = () => setOsReduced(!!mq?.matches)
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); f(); mq.addEventListener('change', f) } catch { /* nothing */ }
    return () => { try { mq?.removeEventListener('change', f) } catch { /* nothing */ } }
  }, [])
  useEffect(() => { camRef.current = cam }, [cam])
  useEffect(() => { sprintRef.current = sprintOn }, [sprintOn])
  useEffect(() => { waypointRef.current = waypoint; wayLabelRef.current = waypoint ? w(`hood.place.${waypoint}`) : '' }, [waypoint, w])
  useEffect(() => { wearRef.current = wear }, [wear])
  useEffect(() => {
    if (!ready || shellRef.current.screen !== 'boot') return
    const s = readSave(storeRef.current, club.id)
    setSavedName(s?.name ?? '')
    go({t: 'booted', hasSave: !!s, play: start === 'play', name: s?.name ?? ''})
  }, [ready, club.id, go, start])
  useEffect(() => { if (shell.screen !== 'boot') { const t = window.setTimeout(() => setBootGone(true), 900); return () => window.clearTimeout(t) } }, [shell.screen])
  useEffect(() => () => { window.clearTimeout(timers.current.banner); window.clearTimeout(timers.current.place) }, [])
  useEffect(() => { if (probe) { const win = window as unknown as {__hood?: unknown; __hoodShell?: unknown}; win.__hood = runRef.current; win.__hoodShell = {go, get screen() { return shellRef.current.screen }, openTalk} } }, [probe, go, openTalk])

  /* the picture */
  useEffect(() => {
    let alive = true
    const canvas = canvasRef.current
    if (!canvas) return
    import('@/lib/life/rush-render/stage').then(({createStage}) => {
      if (!alive) return
      try { const st = createStage({canvas, level, spec, skin: club.skin, quality: qualityEff, reduced: reducedEff, gateLabel: club.skin.strings.gate ?? club.skin.strings.ground ?? ''}); stageRef.current = st; st.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight); setReady(true) } catch { setError(true) }
    }).catch(() => { if (alive) setError(true) })
    const onResize = () => stageRef.current?.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize); stageRef.current?.dispose(); stageRef.current = null }
  }, [level, spec, club.skin, qualityEff, reducedEff])

  /* the loop: fixed steps for the simulation, one picture per frame */
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, tick = 0, ph = ''
    const pad = (): Input => {
      const k = keys.current
      const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + stick.current.x
      const z = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0) + stick.current.y
      return {x, z, sprint: !!(k.ShiftLeft || k.ShiftRight) || sprintRef.current, act: act.current}
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const real = Math.min((now - last) / 1000, 0.25); last = now
      const stage = stageRef.current, run = runRef.current!
      if (!stage) return
      const {sim} = run, scr = shellRef.current.screen
      const playing = scr === 'playing'
      if (playing || isCrane(scr)) {
        acc += real
        let n = 0
        while (acc >= STEP && n < 12) {
          const input = shellRef.current.screen === 'playing' ? pad() : IDLE
          const ev = stepHood(run, input)
          if (input.act) act.current = false
          if (shellRef.current.screen === 'playing') handle(ev)
          acc -= STEP; n++
          if (shellRef.current.screen !== scr) break
        }
        if (acc > STEP * 12) acc = 0
      } else acc = 0
      if (playing) {
        const tg = hudTarget(run, waypointRef.current)
        if (hud.arrow.current) { hud.arrow.current.style.opacity = tg ? '1' : '0'; if (tg) hud.arrow.current.style.transform = `rotate(${-(Math.atan2(tg.x - sim.x, tg.z - sim.z) - sim.heading)}rad)` }
        if (hud.dist.current) hud.dist.current.textContent = tg ? (tg.kind === 'waypoint' && wayLabelRef.current ? `${wayLabelRef.current} · ` : '') + `${metresTo(run, tg)} m` : ''
        const np = personNear(run)?.id ?? null
        if ((np ?? '') !== ph) { ph = np ?? ''; setNearId(np) }
        tick++
        if (hud.map.current && tick % 2 === 0) { const c = hud.map.current.getContext('2d'); if (c) drawMap(c, level, sim, club.skin, hud.map.current.clientWidth || 80) }
        if (tick % 6 === 0) {
          if (hud.ring.current) hud.ring.current.style.strokeDashoffset = String(RING_LEN * (1 - ringProgress(run)))
          if (hud.clock.current) hud.clock.current.textContent = clockText(sim.t)
        }
      }
      const live = playing || isCrane(scr) || scr === 'dialogue'
      stage.render(sim, {cam: playing || scr === 'dialogue' ? camRef.current : 'chase', ending: false, endT: 0, outcome: null, intro: 0, brief: isCrane(scr), hood: {job: run.job}}, live ? real : 0)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [level, club.skin, handle])

  /* progress is saved while he plays, and when the page goes away */
  useEffect(() => {
    const id = window.setInterval(() => { if (shellRef.current.screen === 'playing') persist() }, 8000)
    const hide = () => { if (document.visibilityState === 'hidden' && shellRef.current.screen !== 'title' && shellRef.current.screen !== 'boot' && shellRef.current.screen !== 'name' && shellRef.current.screen !== 'intro') persist() }
    document.addEventListener('visibilitychange', hide)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', hide) }
  }, [persist])

  /* the keyboard */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const scr = shellRef.current.screen, t = e.target as HTMLElement | null
      if (e.code === 'Escape') {
        e.preventDefault()
        if (scr === 'intro') finishIntro(); else if (scr === 'cutscene') go({t: 'cutDone'}); else if (scr === 'dialogue') endTalk(); else { if (scr === 'playing') persist(); go({t: 'esc'}) }
        return
      }
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (scr === 'playing') {
        keys.current[e.code] = true
        if (e.code === 'KeyV') setCam(c => c === 'chase' ? 'eyes' : 'chase')
        if (e.code === 'KeyE' || e.code === 'Space') { act.current = true; e.preventDefault() }
        if (e.code === 'KeyP') go({t: 'open', to: 'pause'})
        if (e.code === 'KeyM') go({t: 'open', to: 'map'})
        if (e.code === 'KeyB') go({t: 'open', to: 'bag'})
        if (e.code.startsWith('Arrow')) e.preventDefault()
      } else if (scr === 'map' || scr === 'bag' || scr === 'pause') {
        if (e.code === 'KeyM') go(scr === 'map' ? {t: 'back'} : {t: 'open', to: 'map'})
        if (e.code === 'KeyB') go(scr === 'bag' ? {t: 'back'} : {t: 'open', to: 'bag'})
      }
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {} }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [go, finishIntro, endTalk, persist])

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => { setGhost(false); stick.current = {id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0}; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setStickAt({x: e.clientX, y: e.clientY, dx: 0, dy: 0}) }
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stick.current.id) return
    let dx = e.clientX - stick.current.ox, dy = e.clientY - stick.current.oy
    const d = Math.hypot(dx, dy), m = 52
    if (d > m) { dx *= m / d; dy *= m / d }
    stick.current.x = dx / m; stick.current.y = dy / m
    setStickAt(s => s ? {...s, dx, dy} : s)
  }
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => { if (e.pointerId !== stick.current.id) return; stick.current = {id: -1, ox: 0, oy: 0, x: 0, y: 0}; setStickAt(null) }

  /* what the HUD says */
  const run = runRef.current!, job = level.hood!.jobs[0]!
  const stepKey = objIx >= 0 ? level.steps[objIx]?.key : null
  const active = jobState === 'active' && !!stepKey
  const wayName = waypoint ? w(`hood.place.${waypoint}`) : ''
  const kicker = active ? `${w(job.titleKey)} · ${w('hood.hud.objective', {n: String(objIx - job.from + 1), m: String(job.steps)})}` : jobState === 'done' ? w(job.titleKey) : waypoint ? w('hood.hud.waypoint') : w('hood.kicker')
  const objective = active ? w(stepKey!) : jobState === 'done' ? w('hood.hud.done') : waypoint ? wayName : w('hood.free')
  const nearPerson = nearId ? w('hood.hud.talk.to', {name: names[nearId] ?? ''}) : null
  const placeName = place ? w(`hood.place.${place}`) : null
  const screen = shell.screen
  const lookV = screen === 'title' || screen === 'name' || screen === 'intro' || screen === 'boot' ? 'title' : isFull(screen) ? 'dim' : 'none'
  const introLines = [1, 2, 3, 4].map(n => w(`hood.intro.${n}`)), outroLines = [1, 2].map(n => w(`hood.outro.${n}`))
  const onIntroBeat = (i: number) => { const r = runRef.current!; r.sim.x = 0; r.sim.z = INTRO_Z[i] ?? INTRO_Z[0]!; r.sim.vx = 0; r.sim.vz = 0 }
  const clubHref = `/clubs/${club.id}`
  const talkNode = talk ? nodeOf(talk.script, talk.id) : null

  return (
    <div className={css.lgRoot} style={{'--lg-brand': brand, '--lg-accent': accent, '--lg-on-accent': onAccent} as React.CSSProperties} role="application" aria-label={w('hood.brand')} data-life="hood" data-screen={screen} data-job={jobState} data-reduced={reducedEff}>
      <canvas ref={canvasRef} className={css.lgCanvas} data-look={lookV} aria-hidden="true" />
      <div className={css.lgVeil} data-v={screen === 'dialogue' ? 'talk' : lookV === 'title' ? 'title' : 'none'} />
      <Hud
        w={w} refs={hud} hidden={screen !== 'playing'} touch={touch} cam={cam} sprintOn={sprintOn} ghost={coach && ghost} onCoachOk={() => setCoach(false)}
        kicker={kicker} objective={objective} free={!active} hasTarget={!!hudTarget(run, waypoint)}
        place={placeName} banner={banner} near={nearPerson} cash={0} stickAt={stickAt}
        onMap={() => go({t: 'open', to: 'map'})} onPause={() => { persist(); go({t: 'open', to: 'pause'}) }} onBag={() => go({t: 'open', to: 'bag'})} onCam={() => setCam(c => c === 'chase' ? 'eyes' : 'chase')}
        onTalk={() => { act.current = true }} onSprint={setSprintOn}
        stick={{down: onStickDown, move: onStickMove, up: onStickUp}}
      />
      {screen === 'title' && <Title w={w} club={club.skin.name} clubHref={clubHref} hasSave={shell.hasSave} saveName={savedName} onContinue={doContinue} onNew={() => go({t: 'new'})} onSettings={() => go({t: 'open', to: 'settings'})} />}
      {screen === 'name' && <NameEntry w={w} clean={cleanName} onGo={startNew} onBack={() => go({t: 'esc'})} />}
      {screen === 'intro' && <Cinematic lines={introLines} w={w} reduced={reducedEff} onBeat={onIntroBeat} onDone={finishIntro} />}
      {screen === 'cutscene' && <Cinematic lines={outroLines} w={w} reduced={reducedEff} ms={3000} onDone={() => go({t: 'cutDone'})} />}
      {screen === 'dialogue' && talkNode && <Talk portrait={talkNode.who} key={`${talk!.script.who}-${talkNode.id}`} node={talkNode} name={names[talkNode.who] ?? ''} w={w} reduced={reducedEff} onGo={onGo} onChoose={onChoose} onLeave={endTalk} />}
      {screen === 'pause' && <Pause w={w} club={club.skin.name} name={shell.name} onResume={() => go({t: 'resume'})} onMap={() => { setMapKey(k => k + 1); go({t: 'open', to: 'map'}) }} onBag={() => go({t: 'open', to: 'bag'})} onSettings={() => go({t: 'open', to: 'settings'})} onHelp={() => go({t: 'open', to: 'help'})} onQuit={() => { persist(); setSavedName(shell.name); go({t: 'quit'}) }} />}
      {screen === 'settings' && <Settings w={w} s={settings} quality={qualityEff} onChange={changeSettings} onBack={() => go({t: 'back'})} />}
      {screen === 'help' && <Help w={w} onBack={() => go({t: 'back'})} />}
      {screen === 'map' && <MapScreen w={w} run={run} waypoint={waypoint} wayLabel={wayName} accent={accent} mapKey={mapKey} reduced={reducedEff} onWaypoint={id => { setWaypoint(id); waypointRef.current = id; persist() }} onClose={() => go({t: 'back'})} onTab={() => go({t: 'open', to: 'bag'})} />}
      {screen === 'bag' && <BagScreen w={w} items={bagOf(carryOf(run), wear)} accent={accent} second={accentFor({...club.skin, p: club.skin.s, s: club.skin.p}).accent} onWear={v => { setWear(v); wearRef.current = v; persist() }} onClose={() => go({t: 'back'})} onTab={() => go({t: 'open', to: 'map'})} />}
      {screen === 'jobdone' && <JobCard w={w} title={w(job.titleKey)} onGo={() => { let a: WatchAnswer | null = null; try { a = watchFor(club.id, {}) } catch { a = null } if (a) setWatch(a); go({t: 'cardDone'}) }} onMap={() => { go({t: 'cardDone'}); go({t: 'open', to: 'map'}) }} />}
      {watch && screen === 'playing' && <div className={css.lgWatch}><WatchCard highlights={watch.highlights} more={watch.moreHighlights} ourFilm={watch.ourFilm} ourFilmFit={watch.ourFilmFit} accent={accent} onContinue={() => setWatch(null)} /></div>}
      {!bootGone && <Boot w={w} out={screen !== 'boot'} />}
      {error && <div className={css.lgErr}><section className={css.lgCard} role="alertdialog" aria-label={w('hood.boot.err')}><h2>{w('hood.brand')}</h2><p>{w('hood.err')}</p></section></div>}
    </div>
  )
}
