'use client'
/**
 * LIFE · the hood — the host. The open neighbourhood on the glass: the supporter walks it himself (thumb stick or WASD),
 * talks with TALK / E, and a job comes only from a person. `lib/life/hood/run.ts` decides what happens, `rush-render/stage.ts`
 * draws it, this file owns the input and the words (every string from `lib/life/hood/words.ts`). It never ends: a device that
 * cannot draw the street shows a card, nothing else is a fail state.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import {hoodLevel, hoodSpec, type HoodClub} from '@/lib/life/hood/level'
import {openStep, personNear, startHood, stepHood, type HoodRun} from '@/lib/life/hood/run'
import {hoodWord, type HoodKey} from '@/lib/life/hood/words'
import {STEP, stepTarget, type Input} from '@/lib/life/rush/sim'
import type {PersonId} from '@/lib/life/hood/types'
import type {Quality, Stage} from '@/lib/life/rush-render/stage'
import {drawMap} from '@/lib/life/rush-render/minimap'
import css from './hood.module.css'

export type HoodHostProps = {club: HoodClub; seed?: number; time?: 'day' | 'night'; quality?: Quality; reduced?: boolean; /** the QA stand only: exposes the run as `window.__hood` */ probe?: boolean}

export function HoodHost({club, seed = 1, time = 'day', quality, reduced = false, probe}: HoodHostProps) {
  const level = useMemo(() => hoodLevel(club, seed), [club, seed])
  const spec = useMemo(() => hoodSpec(club.id, seed, time), [club.id, seed, time])
  const runRef = useRef<HoodRun | null>(null)
  if (!runRef.current || runRef.current.level !== level) runRef.current = startHood(level)
  const canvasRef = useRef<HTMLCanvasElement | null>(null), stageRef = useRef<Stage | null>(null)
  const keys = useRef<Record<string, boolean>>({}), act = useRef(false), stick = useRef({id: -1, ox: 0, oy: 0, x: 0, y: 0})
  const camRef = useRef<'chase' | 'eyes'>('chase'), pausedRef = useRef(false), sprintRef = useRef(false)
  const hud = {arrow: useRef<HTMLElement | null>(null), dist: useRef<HTMLElement | null>(null), map: useRef<HTMLCanvasElement | null>(null)}
  const [touch, setTouch] = useState(false), [cam, setCam] = useState<'chase' | 'eyes'>('chase'), [paused, setPaused] = useState(false), [error, setError] = useState(false)
  const [sprintOn, setSprintOn] = useState(false), [ghost, setGhost] = useState(true), [stickAt, setStickAt] = useState<{x: number; y: number; dx: number; dy: number} | null>(null)
  const [jobState, setJobState] = useState<HoodRun['job']>('idle'), [objIx, setObjIx] = useState(-1), [carry, setCarry] = useState<{batteries: number; scarf: boolean}>({batteries: 0, scarf: false})
  const [place, setPlace] = useState<string | null>(null), [nearId, setNearId] = useState<PersonId | null>(null)
  const [sub, setSub] = useState<{who: string; text: string} | null>(null), [toast, setToast] = useState<string | null>(null)

  /** the names the words print: the cast's first name, or the role's own word */
  const names = useMemo(() => {
    const out: Record<string, string> = {}
    for (const p of level.hood!.people) out[p.id] = p.name ?? hoodWord(`hood.who.${p.id}` as HoodKey)
    return out
  }, [level])
  const vars = useMemo(() => ({mate: names.mate!, kiosk: names.kiosk === hoodWord('hood.who.kiosk') ? hoodWord('hood.who.kiosk').toLowerCase() : `${names.kiosk}’s kiosk`, name: ''}), [names])
  const w = useCallback((k: string, extra: Record<string, string> = {}) => hoodWord(k, {...vars, ...extra}), [vars])
  const say = useCallback((who: string, text: string, ms = 3600) => { setSub({who, text}); window.setTimeout(() => setSub(c => c?.text === text ? null : c), ms) }, [])
  const pop = useCallback((t: string) => { setToast(t); window.setTimeout(() => setToast(c => c === t ? null : c), 1400) }, [])

  useEffect(() => { try { setTouch(window.matchMedia('(pointer: coarse)').matches) } catch { /* no media queries */ } }, [])
  useEffect(() => { camRef.current = cam }, [cam])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { sprintRef.current = sprintOn }, [sprintOn])

  /* the picture */
  useEffect(() => {
    let alive = true
    const canvas = canvasRef.current
    if (!canvas) return
    const q: Quality = quality ?? (window.matchMedia('(pointer: coarse)').matches ? 'lite' : 'high')
    import('@/lib/life/rush-render/stage').then(({createStage}) => {
      if (!alive) return
      try { const st = createStage({canvas, level, spec, skin: club.skin, quality: q, reduced, gateLabel: club.skin.strings.gate ?? club.skin.strings.ground ?? ''}); stageRef.current = st; st.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight) } catch { setError(true) }
    }).catch(() => { if (alive) setError(true) })
    const onResize = () => stageRef.current?.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize); stageRef.current?.dispose(); stageRef.current = null }
  }, [level, spec, club.skin, quality, reduced])

  /* the loop: fixed steps for the simulation, one picture per frame */
  useEffect(() => {
    const run = runRef.current!
    if (probe) (window as unknown as {__hood?: unknown}).__hood = run
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
      const stage = stageRef.current
      if (!stage) return
      const {sim} = run
      if (!pausedRef.current) {
        acc += real
        let n = 0
        while (acc >= STEP && n < 12) {
          const input = pad()
          const ev = stepHood(run, input)
          if (input.act) act.current = false
          for (const e of ev) {
            if (e.k === 'say') say(names[e.who] ?? '', w(e.key), 4200)
            else if (e.k === 'job') { setJobState(run.job); pop(w(e.state === 'start' ? 'hood.ev.job' : 'hood.ev.done')) }
            else if (e.k === 'step') setObjIx(openStep(run))
            else if (e.k === 'pickup') { setCarry(c => ({...c, batteries: c.batteries + 1})); pop(w('hood.ev.battery')) }
            else if (e.k === 'hit') pop(w('hood.ev.hit'))
            else if (e.k === 'place') setPlace(e.id)
          }
          acc -= STEP; n++
        }
        if (acc > STEP * 12) acc = 0
        const tg = openStep(run) >= 0 ? stepTarget(level, sim) : null
        if (hud.arrow.current) { hud.arrow.current.style.opacity = tg ? '1' : '0'; if (tg) hud.arrow.current.style.transform = `rotate(${-(Math.atan2(tg.x - sim.x, tg.z - sim.z) - sim.heading)}rad)` }
        if (hud.dist.current) hud.dist.current.textContent = tg ? `${Math.round(Math.hypot(tg.x - sim.x, tg.z - sim.z))} m` : ''
        const np = personNear(run)?.id ?? null
        const key = np ?? ''
        if (key !== ph) { ph = key; setNearId(np) }
        if (run.job === 'active' && run.sim.step > 1) setCarry(c => c.scarf ? c : {...c, scarf: true})
        tick++
        if (hud.map.current && tick % 2 === 0) { const c = hud.map.current.getContext('2d'); if (c) drawMap(c, level, sim, club.skin, hud.map.current.clientWidth || 96) }
      }
      stage.render(sim, {cam: camRef.current, ending: false, endT: 0, outcome: null, intro: 0, hood: {job: run.job}}, pausedRef.current ? 0 : real)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [level, say, pop, w, names, club.skin, probe])

  /* the keyboard */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      if (e.code === 'KeyV') setCam(c => c === 'chase' ? 'eyes' : 'chase')
      if (e.code === 'KeyE' || e.code === 'Space') { act.current = true; e.preventDefault() }
      if (e.code === 'Escape' || e.code === 'KeyP') { setPaused(p => !p); e.preventDefault() }
      if (e.code.startsWith('Arrow')) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {} }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])

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

  const job = level.hood!.jobs[0]!
  const stepKey = objIx >= 0 ? level.steps[objIx]?.key : null
  const objective = jobState === 'active' && stepKey ? w(stepKey) : jobState === 'done' ? w('hood.hud.done') : w('hood.free')
  const carrying = [carry.batteries ? `${carry.batteries} ${w('hood.item.battery')}` : '', carry.scarf ? w('hood.item.scarf') : ''].filter(Boolean).join(' · ') || w('hood.hud.none')
  const placeName = place ? w(`hood.place.${place}`) : w('hood.place.street')

  return (
    <div className={css.hoodRoot} role="application" aria-label={w('hood.kicker')} data-life="hood" data-job={jobState}>
      <canvas ref={canvasRef} className={css.hoodCanvas} aria-hidden="true" />
      <div className={css.hoodHud}>
        <div className={css.hoodPlate + ' ' + css.hoodJob} aria-live="polite" data-life="hood-job">
          <small>{jobState === 'active' ? `${w('hood.hud.job')} · ${w(job.titleKey)}` : w('hood.kicker')}</small>
          <b>{objective}</b>
          {jobState === 'active' && <span><i ref={hud.arrow} className={css.hoodArrow} aria-hidden="true" /><bdi ref={hud.dist} /></span>}
        </div>
        <div className={css.hoodPlate + ' ' + css.hoodCarry}><small>{w('hood.hud.carrying')}: </small>{carrying}</div>
        <canvas ref={hud.map} className={css.hoodMap} width={224} height={224} role="img" aria-label={w('hood.hud.map')} />
        <button type="button" className={css.hoodPause} aria-label={w('hood.hud.pause')} style={{pointerEvents: 'auto'}} onClick={() => setPaused(true)}>Ⅱ</button>
        <div className={css.hoodPlate + ' ' + css.hoodPlace} data-life="hood-place">{placeName}</div>
        <div className={css.hoodSay} aria-live="polite"><div data-on={!!sub}>{sub && <><b>{sub.who}</b><span>{sub.text}</span></>}</div></div>
        {toast && <div className={css.hoodToast} role="status"><span>{toast}</span></div>}
        {touch ? (
          <>
            {ghost && <div className={css.hoodGhost} aria-hidden="true"><i /><span>{w('hood.touch')}</span></div>}
            <div className={css.hoodStickZone} onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp} />
            {stickAt && <div className={css.hoodStick} style={{insetBlockStart: stickAt.y, insetInlineStart: stickAt.x}}><i style={{transform: `translate(${stickAt.dx}px, ${stickAt.dy}px)`}} /></div>}
            <div className={css.hoodPads}>
              <button type="button" className={css.hoodPad} aria-pressed={cam === 'eyes'} onClick={() => setCam(c => c === 'chase' ? 'eyes' : 'chase')}>{w('hood.hud.camera')}</button>
              <button type="button" className={css.hoodPad} data-hot={!!nearId} onPointerDown={e => { e.preventDefault(); act.current = true }}>{w('hood.hud.talk')}</button>
              <button type="button" className={css.hoodPad} data-big="true" data-on={sprintOn} onPointerDown={e => { e.preventDefault(); setSprintOn(true) }} onPointerUp={() => setSprintOn(false)} onPointerLeave={() => setSprintOn(false)} onPointerCancel={() => setSprintOn(false)}>{w('hood.hud.sprint')}</button>
            </div>
          </>
        ) : <p className={css.hoodKeys}>{w('hood.free.keys')}</p>}
      </div>
      {paused && (
        <div className={css.hoodCover}><section className={css.hoodCard} aria-labelledby="hood-pause">
          <h2 id="hood-pause">{w('hood.pause.title')}</h2>
          <button type="button" className={css.hoodBtn} data-primary="true" autoFocus onClick={() => setPaused(false)}>{w('hood.pause.resume')}</button>
        </section></div>
      )}
      {error && <div className={css.hoodCover}><section className={css.hoodCard} role="alertdialog"><h2>{w('hood.kicker')}</h2><p>{w('hood.err')}</p></section></div>}
    </div>
  )
}
