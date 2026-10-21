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
import {buildLevel, cluesShown, type Level} from '@/lib/life/rush/level'
import {IDLE, resultOf, startSim, stepSim, STEP, type Input, type Sim} from '@/lib/life/rush/sim'
import {ASSIST_AFTER_FAILS, type MissionResult, type MissionSpec} from '@/lib/life/rush/spec'
import {rushWord, type RushKey, type RushLocale} from '@/lib/life/rush/words'
import type {Quality, Stage} from '@/lib/life/rush-render/stage'
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
}

const fmt = (s: number) => { const v = Math.max(0, Math.round(s)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` }
const ENDING_SECONDS = 2.4

export function RushHost({spec, skin, locale, reduced, gateLabel, quality, cue, onDone}: RushHostProps) {
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
  const [stickAt, setStickAt] = useState<{x: number; y: number; dx: number; dy: number} | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<Stage | null>(null)
  const simRef = useRef<Sim | null>(null)
  const phaseRef = useRef<Phase>('brief')
  const camRef = useRef(spec.camera)
  const keys = useRef<Record<string, boolean>>({})
  const act = useRef(false)
  const stick = useRef({id: -1, ox: 0, oy: 0, x: 0, y: 0})
  const endT = useRef(0)
  const introT = useRef(0)
  const hud = {clock: useRef<HTMLElement | null>(null), clockPlate: useRef<HTMLDivElement | null>(null), legs: useRef<HTMLElement | null>(null), seen: useRef<HTMLElement | null>(null), left: useRef<HTMLElement | null>(null), progress: useRef<HTMLElement | null>(null)}
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
    endT.current = 0
    introT.current = reduced ? 0 : 1.4
    setOutcome(null)
    setClueKeys(level.place === 'crowd' ? cluesShown(level, 0) : [])
    setCam(spec.camera)
    if (!reduced) { setCut(false); requestAnimationFrame(() => setCut(true)) }
    sfx('whistle')
    setPhase('play')
  }, [level, reduced, spec.camera])

  /* the loop: fixed steps for the simulation, one picture per frame */
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, shownClues = -1, tiredSaid = false, stride = 0
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
      const real = Math.min((now - last) / 1000, 0.25); last = now
      const sim = simRef.current, stage = stageRef.current
      const ph = phaseRef.current
      if (!sim || !stage) return
      if (ph === 'play' || ph === 'ending') {
        if (introT.current > 0) introT.current -= real
        const input = ph === 'play' && introT.current <= 0 ? pad() : IDLE
        acc += real
        let steps = 0
        while (acc >= STEP && steps < 12) {
          stepSim(level, sim, input, STEP)
          if (input.act) { act.current = false; input.act = false }
          for (const e of sim.events) {
            // what a knock cost, in the clock's own seconds — nothing in story mode
            const cost = (n: number) => { if (!sim.assist) pop(`−${n}s`) }
            if (e.k === 'hit') { say(w(`ev.${e.by}`), 1400); cost(e.by === 'car' ? 9 : e.by === 'throw' ? 8 : e.by === 'police' ? 24 : 5); sfx(e.by === 'police' ? 'whistle' : 'bounce') }
            else if (e.k === 'caught') { say(w('ev.caught'), 1800); cost(24); sfx('whistle') }
            else if (e.k === 'wrong') { say(w('ev.wrong'), 1200); cost(12); sfx('tick') }
            else if (e.k === 'found') { say(w('ev.found'), 1600); sfx('reveal') }
            else if (e.k === 'grab') { say(w('ev.grab'), 1200); sfx('keep') }
            else if (e.k === 'drop') { say(w('ev.drop'), 1400); sfx('bounce') }
            else if (e.k === 'voice') { say(w(e.key), 2600); if (e.key.endsWith('.3') || e.key.endsWith('.4') || e.key.endsWith('.2')) sfx('murmur') }
            else if (e.k === 'end') { phaseRef.current = 'ending'; setPhase('ending'); endT.current = 0; sfx(e.outcome === 'slip' ? 'murmur' : 'roar') }
          }
          acc -= STEP; steps++
        }
        if (acc > STEP * 12) acc = 0
        // feet on the pavement: one step a stride, faster when he runs
        if (ph === 'play' && level.place !== 'road' && sim.speed > 1.5) { stride += real * (1.6 + sim.speed * 0.28); if (stride >= 1) { stride = 0; sfx('step') } }
        if (sim.stamina < 0.25 && !tiredSaid && level.place !== 'road') { tiredSaid = true; say(w('ev.tired'), 1800) }
        if (sim.stamina > 0.9) tiredSaid = false
        if (level.place === 'crowd') { const n = cluesShown(level, sim.t).length; if (n !== shownClues) { shownClues = n; setClueKeys(cluesShown(level, sim.t)) } }
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
        hud.clockPlate.current?.setAttribute('data-low', String(left < level.timeScale * 15))
        if (hud.legs.current) hud.legs.current.style.inlineSize = `${Math.round(sim.stamina * 100)}%`
        if (hud.seen.current) hud.seen.current.style.inlineSize = `${Math.round(sim.seen * 100)}%`
        const g = level.home && sim.back ? level.home : level.goal
        const dist = Math.hypot(g.x - sim.x, g.z - sim.z)
        if (hud.left.current) hud.left.current.textContent = level.place === 'crowd' ? '' : `${Math.round(dist)} m`
        if (hud.progress.current) hud.progress.current.style.inlineSize = `${Math.round(Math.min(1, Math.max(0, 1 - dist / level.length)) * 100)}%`
      }
      stage.render(sim, {cam: camRef.current, ending: ph === 'ending' || ph === 'result', endT: endT.current, outcome: sim.ended, intro: introT.current}, ph === 'pause' ? 0 : real)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [level, say, pop, w]) // eslint-disable-line react-hooks/exhaustive-deps

  /* the keyboard */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      const ph = phaseRef.current
      if (ph === 'play') {
        if (e.code === 'KeyV' && level.place !== 'road') setCam(c => c === 'chase' ? 'eyes' : 'chase')
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
  const clockKey = level.place === 'crowd' ? 'hud.clock.find' : 'hud.clock'
  const anchor = spec.anchor

  return (
    <div className={`${css.rush} z-[60]`} dir={rtl ? 'rtl' : 'ltr'} lang={locale} role="dialog" aria-modal="true" aria-label={spec.title} data-life="rush" data-phase={phase}>
      <canvas ref={canvasRef} className={css.canvas} aria-hidden="true" />
      <div className={css.cut} data-on={cut && phase === 'play'} aria-hidden="true" />

      {(phase === 'play' || phase === 'ending') && (
        <div className={css.hud}>
          <div ref={hud.clockPlate} className={`${css.plate} ${css.clock}`} data-low="false"><span>{w(clockKey)}</span><b ref={hud.clock}>{fmt(level.realSeconds * level.timeScale)}</b></div>
          <div className={`${css.plate} ${css.meters}`}>
            <span>{w(verbKey)} · <bdi ref={hud.left} /></span>
            <div className={css.bar} aria-hidden="true"><i ref={hud.progress} /></div>
            {level.place !== 'road' && <><span>{w('hud.legs')}</span><div className={css.bar} aria-hidden="true"><i ref={hud.legs} style={{inlineSize: '100%'}} /></div></>}
            {level.place === 'yard' && <><span>{w('hud.seen')}</span><div className={css.bar} data-hot="true" aria-hidden="true"><i ref={hud.seen} style={{inlineSize: '0%'}} /></div></>}
          </div>
          {assist && <div className={`${css.plate} ${css.story}`}>{w('hud.story')}</div>}
          {clueKeys.length > 0 && <div className={`${css.plate} ${css.clues}`} aria-live="polite">{w('hud.clue')}: {clueKeys.map(c => w(`clue.${c}`)).join(' · ')}</div>}
          <button type="button" className={`${css.pauseBtn} min-h-tap`} aria-label={w('hud.pause')} onClick={() => setPhase('pause')}>Ⅱ</button>
          <div className={css.sub} aria-live="polite"><span data-on={!!sub}>{sub ?? ''}</span></div>
          {toast && <div className={css.toast} aria-hidden="true"><span>{toast}</span></div>}
          {touch ? (
            <>
              <div className={css.stickZone} onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp} />
              {stickAt && <div className={css.stick} data-on="true" style={{insetBlockStart: stickAt.y, insetInlineStart: rtl ? window.innerWidth - stickAt.x : stickAt.x}}><i style={{transform: `translate(${stickAt.dx}px, ${stickAt.dy}px)`}} /></div>}
              <div className={css.pads}>
                {level.place !== 'road' && <button type="button" className={`${css.pad} min-h-tap`} aria-pressed={cam === 'eyes'} onClick={() => setCam(c => c === 'chase' ? 'eyes' : 'chase')}>{w('hud.camera')}</button>}
                {level.place === 'crowd' && <button type="button" className={`${css.pad} min-h-tap`} onPointerDown={e => { e.preventDefault(); act.current = true }}>{w('hud.act')}</button>}
                <button type="button" className={`${css.pad} min-h-tap`} data-big="true" data-on={sprintOn} onPointerDown={e => { e.preventDefault(); setSprintOn(true) }} onPointerUp={() => setSprintOn(false)} onPointerLeave={() => setSprintOn(false)} onPointerCancel={() => setSprintOn(false)}>{w('hud.sprint')}</button>
              </div>
            </>
          ) : <p className={css.keys}>{w(level.place === 'road' ? 'brief.controls.drive' : 'brief.controls.keys')}</p>}
        </div>
      )}

      {phase === 'brief' && (
        <div className={css.cover}>
          <section className={css.ticket}>
            <p className={css.kicker}><span>{w('brief.kicker')} · {w(verbKey)}</span><span>{w(spec.mandatory ? 'brief.required' : 'brief.optional')}</span></p>
            <h2 id="rush-title" className={css.title}>{spec.title}</h2>
            <p className={css.brief}>{spec.brief}</p>
            {anchor ? (
              <div className={css.archive}><b>{w('brief.archive')}</b><span lang={anchor.locale} dir="auto">{anchor.title}</span></div>
            ) : <p className={css.fine}>{w('brief.neutral')}</p>}
            <p className={css.fine}>{w(touch ? 'brief.controls.touch' : level.place === 'road' ? 'brief.controls.drive' : 'brief.controls.keys')}</p>
            <div className={css.actions}>
              {!spec.mandatory && <button type="button" className={`${css.btn} min-h-tap`} onClick={skip} data-life="rush-skip">{w('brief.skip')}</button>}
              <button type="button" ref={primary} className={`${css.btn} min-h-tap`} data-primary="true" onClick={() => begin(assist)} data-life="rush-go">{w('brief.go')}</button>
            </div>
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
            <p className={css.brief}>{w(`res.${outcome.outcome}.sub`)}</p>
            <p className={css.fine}>{outcome.outcome === 'slip' ? w('res.late') : `${fmt(outcome.clockLeft)} ${w('res.left')}`}</p>
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
