'use client'
/**
 * Hands, not words: the small things a supporter does in LIFE.
 *
 * Every game ends one of three ways — `good`, `ok`, `slip` — and none of them can fail the chapter:
 * the story's own effects are the play's `then`, which always happens; what skill earns is `good`
 * (for good and ok), and a slip simply gets the `slip` list instead. Each game is at most twenty
 * seconds, works by touch, by mouse and by keyboard, says in words what the moving part is showing,
 * and has a way out ("That will do") that is a slip, never a trap.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {MiniGame as Game, PlayResult} from '@/lib/life/universal/types'
import styles from './life.module.css'
import g from './MiniGame.module.css'

type Copy = Record<string, string>
export type MiniGameProps = {
  game: Game
  id: string
  /** the coins the game is about (`playAmount`): the size of the tray in 'count'. */
  amount: number
  copy: Copy
  reduced: boolean
  cue: (name: string) => void
  onDone: (result: PlayResult) => void
}
type Inner = MiniGameProps & {finish: (r: PlayResult) => void}

/** English source for every word this file prints, so a game is never mute when a catalogue has not caught up. */
const EN: Record<string, string> = {
  'game.result.good': 'Clean.', 'game.result.ok': 'Good enough.', 'game.result.slip': 'It got away from you.',
  'game.result.good.sub': 'Exactly as it should be.', 'game.result.ok.sub': 'Nobody saw the wobble.', 'game.result.slip.sub': 'It happens. The day goes on.',
  'game.skip': 'That will do',
  'game.tune.title': 'Find the station', 'game.clap.title': 'Clap with them', 'game.carry.title': 'Keep it steady', 'game.count.title': 'Count them',
  'game.tune.help2': 'Turn the dial until the voice comes clear — before the signal fades.',
  'game.clap.help2': 'Clap as the ring closes on the circle. Eight beats.',
  'game.clap.early': 'Early', 'game.clap.hit': 'Hits',
  'game.carry.help2': 'Lean against the drift and keep the mark inside the dashed lane.',
  'game.count.help2': 'Touch every coin once. Leave the buttons alone.', 'game.count.dud': 'Button, not a coin', 'game.count.left': 'Left', 'game.count.slips': 'Wrong',
  'game.kick.title': 'Take the penalty', 'game.kick.help': 'Tap when the ring is where you want it. The keeper has not read the programme. Three kicks.',
  'game.kick.shoot': 'Shoot', 'game.kick.goal': 'GOAL', 'game.kick.saved': 'Saved', 'game.kick.wide': 'Wide', 'game.kick.aim': 'Pick your corner', 'game.kick.pitch': 'Penalty area',
  'game.chant.title': 'Answer the stand', 'game.chant.help': 'Listen to the pattern the stand gives you, then give it back, beat for beat. Two rounds.',
  'game.chant.button': 'Chant', 'game.chant.listen': 'Listen…', 'game.chant.now': 'Now you', 'game.chant.ready': 'Get ready', 'game.chant.round': 'Round',
  'game.time': 'Time left',
}
const T = (copy: Copy, key: string): string => copy[key] ?? EN[key] ?? ''

/** The same game opens the same way twice: a dial does not move while nobody is looking. */
function seeded(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 1000) / 1000
}
function rng(id: string): () => number {
  let a = Math.floor(seeded(id) * 4294967295) + 1
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const buzz = (ms: number) => { try { navigator.vibrate?.(ms) } catch { /* a phone that will not buzz is not a problem */ } }

/** A press that does not wait for the finger to lift, and still works for the keyboard and for a screen reader. */
function tapProps(fn: () => void) {
  const isKey = (e: React.KeyboardEvent) => e.key === ' ' || e.key === 'Enter'
  return {
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && e.button !== 0) return; fn() },
    onKeyDown: (e: React.KeyboardEvent) => { if (!isKey(e)) return; e.preventDefault(); if (!e.repeat) fn() },
    onKeyUp: (e: React.KeyboardEvent) => { if (isKey(e)) e.preventDefault() },
    onClick: (e: React.MouseEvent) => { if (e.detail === 0) fn() },
  }
}

function useLatest<T>(v: T) { const r = useRef(v); r.current = v; return r }

/** A time bar the game drives from its own clock, without a render per frame. */
function Meter({fill, copy}: {fill: React.RefObject<HTMLSpanElement>; copy: Copy}) {
  return <div className={g.meter} role="img" aria-label={T(copy, 'game.time')}><span ref={fill} className={g.meterFill} /></div>
}
function setMeter(el: HTMLElement | null, left: number) { if (el) { el.style.transform = `scaleX(${clamp(left, 0, 1)})`; el.dataset.low = left < 0.25 ? 'true' : 'false' } }

/* ───────────── tune ───────────── */

function Tune({id, copy, cue, reduced, finish}: Inner) {
  const LIMIT = 11000, HOLD = 600, FAST = 6000
  const target = useMemo(() => 14 + Math.round(seeded(id) * 72), [id])
  const [value, setValue] = useState(() => (target > 50 ? 8 : 92))
  const [flick, setFlick] = useState(0)
  const off = Math.abs(value - target), clear = off <= 3, near = off <= 14
  const bar = useRef<HTMLSpanElement>(null), began = useRef(0), holding = useRef(false)
  const live = useLatest({finish, clear})
  useEffect(() => {
    began.current = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const spent = now - began.current
      setMeter(bar.current, 1 - spent / LIMIT)
      if (spent >= LIMIT && !live.current.clear && !holding.current) { live.current.finish('slip'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live])
  useEffect(() => {
    if (!clear) { holding.current = false; return }
    holding.current = true
    const spent = performance.now() - began.current
    const timer = window.setTimeout(() => { buzz(18); live.current.finish(spent <= FAST ? 'good' : 'ok') }, HOLD)
    return () => { window.clearTimeout(timer); holding.current = false }
  }, [clear, live, value])
  useEffect(() => {
    if (reduced || near) return
    const t = window.setInterval(() => setFlick(n => n + 1), 140)
    return () => window.clearInterval(t)
  }, [reduced, near])
  const noise = reduced || clear ? 0 : (((value * 31 + flick * 17) % 7) - 3) * (near ? 0.12 : 0.3)
  const strength = clamp(1 - off / 40, 0, 1) * 12 + noise
  return (
    <div className={g.stage}>
      <Meter fill={bar} copy={copy} />
      <div className={g.dial} aria-hidden="true" data-clear={clear ? 'true' : 'false'}>
        {Array.from({length: 12}, (_, i) => <span key={i} data-on={strength > i ? 'true' : 'false'} style={{blockSize: `${22 + i * 6}%`}} />)}
      </div>
      <p className={g.status} role="status">{clear ? T(copy, 'game.tune.clear') || 'There. Hold it.' : near ? T(copy, 'game.tune.near') || 'Almost' : T(copy, 'game.tune.static') || 'Static'}</p>
      <input className={g.range} type="range" min={0} max={100} step={1} value={value} aria-label={T(copy, 'game.tune.dial') || 'Dial'}
        onChange={e => { setValue(Number(e.target.value)); cue('tick') }} />
    </div>
  )
}

/* ───────────── clap ───────────── */

function Clap({copy, reduced, cue, finish}: Inner) {
  const PERIOD = 900, BEATS = 8, WIN = reduced ? 230 : 150
  const ring = useRef<HTMLDivElement>(null)
  const t0 = useRef(0), marks = useRef<(boolean | null)[]>(Array(BEATS).fill(null)), stray = useRef(0), over = useRef(false)
  const [pips, setPips] = useState<(boolean | null)[]>(() => Array(BEATS).fill(null))
  const [say, setSay] = useState<'on' | 'early' | 'late' | null>(null)
  const live = useLatest({finish, cue})
  useEffect(() => {
    over.current = false; marks.current = Array(BEATS).fill(null); stray.current = 0
    t0.current = performance.now() + PERIOD
    let raf = 0
    const tick = (now: number) => {
      const rel = now - t0.current
      // the ring and the judge read the one clock: p is 1 at the instant a beat is due
      const p = rel < 0 ? 1 + rel / PERIOD : rel > (BEATS - 1) * PERIOD ? 1 : (rel % PERIOD) / PERIOD
      const nearest = clamp(Math.round(rel / PERIOD), 0, BEATS - 1)
      if (ring.current) { ring.current.style.setProperty('--p', String(clamp(p, 0, 1))); ring.current.dataset.now = Math.abs(now - (t0.current + nearest * PERIOD)) <= WIN ? 'true' : 'false' }
      let changed = false
      marks.current.forEach((m, k) => { if (m === null && now > t0.current + k * PERIOD + WIN) { marks.current[k] = false; changed = true } })
      if (changed) setPips([...marks.current])
      if (rel > (BEATS - 1) * PERIOD + WIN + 280 && !over.current) {
        over.current = true
        const hits = marks.current.filter(Boolean).length
        live.current.finish(hits >= 6 && stray.current <= 3 ? 'good' : hits >= 3 ? 'ok' : 'slip')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live, WIN])
  const clap = useCallback(() => {
    if (over.current) return
    const now = performance.now(), rel = now - t0.current
    live.current.cue('clap')
    let best = -1, bd = Infinity
    marks.current.forEach((m, k) => { const d = Math.abs(now - (t0.current + k * PERIOD)); if (m === null && d < bd) { best = k; bd = d } })
    if (best >= 0 && bd <= WIN) { marks.current[best] = true; setSay('on'); buzz(12) }
    else { stray.current += 1; setSay(rel / PERIOD - Math.round(rel / PERIOD) < 0 ? 'early' : 'late') }
    setPips([...marks.current])
  }, [live, WIN])
  const hits = pips.filter(Boolean).length
  return (
    <div className={g.stage}>
      <div className={g.clap} aria-hidden="true"><i className={g.clapTarget} /><i ref={ring} className={g.clapCue} data-now="false" /><b className={g.clapHub}>{hits}</b></div>
      <div className={g.pips} aria-hidden="true">{pips.map((p, i) => <span key={i} className={g.pip} data-s={p === true ? 'hit' : p === false ? 'miss' : 'wait'} />)}</div>
      <p className={g.status} role="status">{say === 'on' ? T(copy, 'game.clap.with') || 'With them' : say === 'early' ? T(copy, 'game.clap.early') : say === 'late' ? T(copy, 'game.clap.late') || 'A beat behind.' : ' '}</p>
      <button type="button" className={g.btn} {...tapProps(clap)}>{T(copy, 'game.clap.button') || 'Clap'}</button>
    </div>
  )
}

/* ───────────── carry ───────────── */

function Carry({id, copy, finish}: Inner) {
  const LENGTH = 7000, BAND = 0.34
  const pos = useRef(0), vel = useRef(0), lean = useRef(0), out = useRef(0)
  const [view, setView] = useState({p: 0})
  const bar = useRef<HTMLSpanElement>(null)
  const live = useLatest({finish})
  useEffect(() => {
    let raf = 0, prev = performance.now()
    const began = prev, seed = seeded(id) * 10
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now
      const t = (now - began) / 1000
      // a slow sway and a quicker one on top of it: a load that has opinions
      const drift = Math.sin(t * 1.3 + seed) * 0.55 + Math.sin(t * 2.9 + seed * 2) * 0.3
      vel.current += (drift + lean.current * 1.9) * dt
      vel.current *= 0.94
      pos.current = clamp(pos.current + vel.current * dt * 2.2, -1, 1)
      if (Math.abs(pos.current) === 1) vel.current = 0
      if (Math.abs(pos.current) > BAND) out.current += dt
      setView({p: pos.current})
      setMeter(bar.current, 1 - (now - began) / LENGTH)
      if (now - began >= LENGTH) {
        const away = out.current / (LENGTH / 1000)
        live.current.finish(away < 0.15 ? 'good' : away < 0.4 ? 'ok' : 'slip')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const key = (e: KeyboardEvent) => {
      const down = e.type === 'keydown'
      if (e.key === 'ArrowLeft' || e.key === 'a') { lean.current = down ? -1 : 0; e.preventDefault() }
      if (e.key === 'ArrowRight' || e.key === 'd') { lean.current = down ? 1 : 0; e.preventDefault() }
    }
    window.addEventListener('keydown', key); window.addEventListener('keyup', key)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); window.removeEventListener('keyup', key) }
  }, [id, live])
  const hold = (dir: number) => ({
    onPointerDown: () => { lean.current = dir }, onPointerUp: () => { lean.current = 0 }, onPointerLeave: () => { lean.current = 0 }, onPointerCancel: () => { lean.current = 0 },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') lean.current = dir }, onKeyUp: () => { lean.current = 0 },
  })
  const steady = Math.abs(view.p) < BAND
  return (
    <div className={g.stage}>
      <Meter fill={bar} copy={copy} />
      {/* the lane is a physical left and right, whatever the page direction */}
      <div className={g.lane} dir="ltr" aria-hidden="true"><i /><span style={{insetInlineStart: `${50 + view.p * 44}%`}} data-steady={steady ? 'true' : 'false'} /></div>
      <p className={g.status} role="status">{steady ? T(copy, 'game.carry.steady') || 'Steady' : T(copy, 'game.carry.wobble') || 'It wobbles. It always does.'}</p>
      <div className={g.pair} dir="ltr">
        <button type="button" className={g.btn} aria-label={T(copy, 'game.carry.left') || 'Lean left'} {...hold(-1)}>◀</button>
        <button type="button" className={g.btn} aria-label={T(copy, 'game.carry.right') || 'Lean right'} {...hold(1)}>▶</button>
      </div>
    </div>
  )
}

/* ───────────── count ───────────── */

function Count({id, amount, copy, cue, finish}: Inner) {
  const real = clamp(Math.round(amount), 4, 12), fake = Math.max(2, Math.floor(real / 3))
  const LIMIT = Math.min(15000, 7000 + real * 700)
  const items = useMemo(() => {
    const r = rng(id), list = [...Array(real).fill('coin'), ...Array(fake).fill('dud')] as ('coin' | 'dud')[]
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j]!, list[i]!] }
    return list
  }, [id, real, fake])
  const [taken, setTaken] = useState<ReadonlySet<number>>(() => new Set())
  const [hit, setHit] = useState<ReadonlySet<number>>(() => new Set())
  const bar = useRef<HTMLSpanElement>(null), began = useRef(0), over = useRef(false)
  const errors = useRef(0), got = useRef(0)
  const live = useLatest({finish, cue})
  const grade = useCallback((timedOut: boolean): PlayResult => {
    if (!timedOut) return errors.current <= 1 ? 'good' : errors.current <= 3 ? 'ok' : 'slip'
    return got.current / real >= 0.7 && errors.current <= 2 ? 'ok' : 'slip'
  }, [real])
  useEffect(() => {
    began.current = performance.now(); over.current = false
    let raf = 0
    const tick = (now: number) => {
      const spent = now - began.current
      setMeter(bar.current, 1 - spent / LIMIT)
      if (spent >= LIMIT && !over.current) { over.current = true; live.current.finish(grade(true)); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [LIMIT, grade, live])
  const touched = useRef<Set<number>>(new Set())
  const touch = (i: number) => {
    if (over.current || touched.current.has(i)) return
    touched.current.add(i)
    if (items[i] === 'dud') {
      errors.current += 1; buzz(30); live.current.cue('tick')
      setHit(s => new Set(s).add(i))
      return
    }
    live.current.cue('coin'); buzz(8)
    got.current += 1
    setTaken(s => new Set(s).add(i))
    if (got.current >= real) { over.current = true; window.setTimeout(() => live.current.finish(grade(false)), 260) }
  }
  return (
    <div className={g.stage}>
      <Meter fill={bar} copy={copy} />
      <div className={g.tray}>
        {items.map((kind, i) => kind === 'coin'
          ? <button key={i} type="button" className={g.coin} aria-pressed={taken.has(i)} aria-label={`${T(copy, 'game.count.coin') || 'Coin worth'} 1`} onClick={() => touch(i)} />
          : <button key={i} type="button" className={g.dud} data-hit={hit.has(i) ? 'true' : 'false'} aria-label={T(copy, 'game.count.dud')} onClick={() => touch(i)} />)}
      </div>
      <p className={g.tally} role="status">
        <span>{T(copy, 'game.count.total') || 'Counted'}: <bdi>{taken.size}</bdi> / <bdi>{real}</bdi></span>
        <s>{T(copy, 'game.count.slips')}: <bdi>{hit.size}</bdi></s>
      </p>
    </div>
  )
}

/* ───────────── kick ───────────── */

type Shot = 'goal' | 'saved' | 'wide'
const GOAL = {x0: 62, x1: 258, top: 46, line: 128}
const KEEPER_REACH = 25, KEEPER_TOP = 66, FLIGHT = 360

function Kick({id, copy, cue, reduced, finish}: Inner) {
  const KICKS = 3, AIM_LIMIT = 4500
  const sp = reduced ? 0.6 : 1
  const phase = useRef<'aim' | 'fly' | 'rest'>('aim'), kickNo = useRef(0), began = useRef(0), shotsRef = useRef<Shot[]>([])
  const reticle = useRef<SVGGElement>(null), keeper = useRef<SVGGElement>(null), ball = useRef<SVGGElement>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [flash, setFlash] = useState<Shot | null>(null)
  const seed = useMemo(() => { const r = rng(id); return {a: r() * 6, b: r() * 6, c: r() * 6} }, [id])
  const live = useLatest({finish, cue})
  const SPEED = [[1.1, 1.7, 1.5], [1.4, 2.1, 2.0], [1.7, 2.6, 2.5]] as const
  const aimAt = useCallback((t: number) => {
    const s = SPEED[kickNo.current]!
    return {x: 160 + 118 * Math.sin(t * s[0] * sp + seed.a), y: 88 + 54 * Math.sin(t * s[1] * sp + seed.b)}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, seed])
  const keeperAt = useCallback((t: number) => 160 + 64 * Math.sin(t * SPEED[kickNo.current]![2] * sp + seed.c),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp, seed])
  const place = (el: SVGGElement | null, x: number, y: number, scale = 1, dur = 0) => {
    if (!el) return
    el.style.transition = dur && !reduced ? `transform ${dur}ms cubic-bezier(.2,.7,.3,1)` : 'none'
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }
  const startKick = useCallback(() => {
    phase.current = 'aim'; began.current = performance.now(); setFlash(null)
    place(ball.current, 160, 176, 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    startKick()
    let raf = 0
    const tick = (now: number) => {
      if (phase.current === 'aim') {
        const t = (now - began.current) / 1000, a = aimAt(t)
        place(reticle.current, a.x, a.y); place(keeper.current, keeperAt(t), GOAL.line)
        if (now - began.current >= AIM_LIMIT) shoot()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const shoot = () => {
    if (phase.current !== 'aim') return
    phase.current = 'fly'
    const t = (performance.now() - began.current) / 1000, a = aimAt(t), kx = keeperAt(t + FLIGHT / 1000)
    const inGoal = a.x > GOAL.x0 + 4 && a.x < GOAL.x1 - 4 && a.y > GOAL.top && a.y < GOAL.line
    const saved = inGoal && Math.abs(a.x - kx) <= KEEPER_REACH && a.y >= KEEPER_TOP
    const outcome: Shot = !inGoal ? 'wide' : saved ? 'saved' : 'goal'
    live.current.cue('whistle'); buzz(14)
    place(ball.current, a.x, a.y, 0.7, FLIGHT)
    place(keeper.current, kx, GOAL.line, 1, FLIGHT)
    place(reticle.current, -100, -100)
    window.setTimeout(() => {
      setFlash(outcome); live.current.cue(outcome === 'goal' ? 'roar' : 'murmur'); if (outcome === 'goal') buzz(40)
      const next = [...shotsRef.current, outcome]
      shotsRef.current = next; setShots(next)
      phase.current = 'rest'
      window.setTimeout(() => {
        if (next.length >= KICKS) {
          const goals = next.filter(s => s === 'goal').length
          live.current.finish(goals >= 2 ? 'good' : goals === 1 ? 'ok' : 'slip')
        } else { kickNo.current = next.length; startKick() }
      }, 900)
    }, FLIGHT + 40)
  }
  return (
    <div className={g.stage}>
      <div className={g.balls} aria-hidden="true">{Array.from({length: KICKS}, (_, i) => <span key={i} className={g.ball} data-k={shots[i] ?? 'wait'} />)}</div>
      <div className={g.pitch} onPointerDown={shoot}>
        <svg viewBox="0 0 320 200" role="img" aria-label={T(copy, 'game.kick.pitch')}>
          <defs><pattern id="net" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H8M0 0V8" stroke="var(--l-rule)" strokeWidth="1" fill="none" /></pattern></defs>
          <rect x={GOAL.x0} y={GOAL.top} width={GOAL.x1 - GOAL.x0} height={GOAL.line - GOAL.top} fill="url(#net)" />
          <path d={`M${GOAL.x0} ${GOAL.line}V${GOAL.top}H${GOAL.x1}V${GOAL.line}`} fill="none" stroke="var(--l-ink)" strokeWidth="5" strokeLinejoin="miter" />
          <path d="M20 128H300" stroke="var(--l-ink)" strokeWidth="2" /><path d="M70 188H250V128" stroke="var(--l-rule)" strokeWidth="2" fill="none" />
          <circle cx="160" cy="176" r="2.5" fill="var(--l-ink)" />
          <g ref={keeper} style={{transform: 'translate(160px, 128px)'}}>
            <rect x="-8" y="-34" width="16" height="30" fill="var(--l-prime)" stroke="var(--l-ink)" strokeWidth="2" /><circle cx="0" cy="-42" r="7" fill="var(--l-paper)" stroke="var(--l-ink)" strokeWidth="2" />
            <rect x="-24" y="-31" width="48" height="7" fill="var(--l-ink)" /><rect x="-8" y="-4" width="6" height="8" fill="var(--l-ink)" /><rect x="2" y="-4" width="6" height="8" fill="var(--l-ink)" />
          </g>
          <g ref={ball} style={{transform: 'translate(160px, 176px)'}}>
            <circle r="9" fill="var(--l-paper)" stroke="var(--l-ink)" strokeWidth="2.5" /><path d="M0 -4 4 -1 2.5 4H-2.5L-4 -1Z" fill="var(--l-ink)" />
          </g>
          <g ref={reticle} style={{transform: 'translate(160px, 88px)'}}>
            <circle r="13" fill="none" stroke="var(--l-ink)" strokeWidth="3" strokeDasharray="6 4" /><circle r="3" fill="var(--l-prime)" stroke="var(--l-ink)" strokeWidth="1.5" />
            <path d="M-19 0H-9M9 0H19M0 -19V-9M0 9V19" stroke="var(--l-ink)" strokeWidth="3" />
          </g>
        </svg>
      </div>
      <p className={g.flash} role="status" data-k={flash ?? 'none'}>{flash ? T(copy, `game.kick.${flash}`) : T(copy, 'game.kick.aim')}</p>
      <button type="button" className={g.btn} {...tapProps(shoot)}>{T(copy, 'game.kick.shoot')}</button>
    </div>
  )
}

/* ───────────── chant ───────────── */

const STEP = 420, LEAD = 700, GAP = 500, TAIL = 400, ROUND = LEAD + 8 * STEP + GAP + 8 * STEP + TAIL
const PATTERNS = ['10110100', '10010110', '11010010', '10101001', '11001010', '10011010']

function Chant({id, copy, cue, reduced, finish}: Inner) {
  const ROUNDS = 2, WIN = (reduced ? 0.5 : 0.45) * STEP
  const pats = useMemo(() => { const i = Math.floor(seeded(id) * PATTERNS.length); return [PATTERNS[i]!, PATTERNS[(i + 3) % PATTERNS.length]!].map(p => [...p].map(c => c === '1')) }, [id])
  const t0 = useRef(0), over = useRef(false), lastCue = useRef(-1)
  const marks = useRef<('hit' | 'miss' | null)[][]>(pats.map(() => Array(8).fill(null)))
  const strays = useRef(0)
  const strayAt = useRef<number | null>(null)
  const [view, setView] = useState({r: 0, ph: 'lead' as 'lead' | 'call' | 'respond' | 'gap', step: -1})
  const [, bump] = useState(0)
  const live = useLatest({finish, cue})
  const respondAt = (r: number) => r * ROUND + LEAD + 8 * STEP + GAP
  useEffect(() => {
    over.current = false; t0.current = performance.now(); marks.current = pats.map(() => Array(8).fill(null)); strays.current = 0
    let raf = 0
    const tick = (now: number) => {
      const el = now - t0.current, r = Math.min(ROUNDS - 1, Math.floor(el / ROUND)), rel = el - r * ROUND
      const callRel = rel - LEAD, respRel = rel - (LEAD + 8 * STEP + GAP)
      let ph: 'lead' | 'call' | 'respond' | 'gap' = 'lead', step = -1
      if (callRel >= 0 && callRel < 8 * STEP) { ph = 'call'; step = Math.floor(callRel / STEP) }
      else if (respRel >= -WIN && respRel < 8 * STEP + WIN) { ph = 'respond'; step = clamp(Math.floor(respRel / STEP), 0, 7) }
      else if (callRel >= 8 * STEP) ph = 'gap'
      if (ph === 'call' && pats[r]![step] && lastCue.current !== r * 8 + step) { lastCue.current = r * 8 + step; live.current.cue('tick') }
      let changed = false
      pats.forEach((p, ri) => p.forEach((on, i) => { if (on && marks.current[ri]![i] === null && now > t0.current + respondAt(ri) + i * STEP + WIN) { marks.current[ri]![i] = 'miss'; changed = true } }))
      setView(v => (v.r === r && v.ph === ph && v.step === step ? v : {r, ph, step}))
      if (changed) bump(n => n + 1)
      if (el > ROUNDS * ROUND - TAIL + 200 && !over.current) {
        over.current = true
        let earned = 0, total = 0
        pats.forEach((p, ri) => p.forEach((on, i) => { if (on) { total++; if (marks.current[ri]![i] === 'hit') earned++ } }))
        const ratio = Math.max(0, earned - strays.current * 0.5) / total
        live.current.finish(ratio >= 0.75 ? 'good' : ratio >= 0.4 ? 'ok' : 'slip')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pats, live, WIN])
  const chant = useCallback(() => {
    if (over.current) return
    const now = performance.now(), el = now - t0.current, r = Math.min(ROUNDS - 1, Math.floor(el / ROUND))
    const respRel = el - respondAt(r)
    if (respRel < -WIN || respRel > 8 * STEP + WIN) return
    live.current.cue('clap')
    let best = -1, bd = Infinity
    pats[r]!.forEach((on, i) => { const d = Math.abs(respRel - i * STEP); if (on && marks.current[r]![i] === null && d < bd) { best = i; bd = d } })
    if (best >= 0 && bd <= WIN) { marks.current[r]![best] = 'hit'; buzz(12) }
    else { strays.current += 1; strayAt.current = clamp(Math.round(respRel / STEP), 0, 7); buzz(6) }
    bump(n => n + 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pats, live, WIN])
  const now = view.ph === 'respond'
  return (
    <div className={g.stage}>
      <div className={g.rounds} aria-hidden="true">{Array.from({length: ROUNDS}, (_, i) => <span key={i} className={g.pip} data-s={i < view.r ? 'hit' : i === view.r ? 'miss' : 'wait'} />)}</div>
      <div className={g.beats} dir="ltr" aria-hidden="true">
        {Array.from({length: 8}, (_, i) => {
          const m = marks.current[view.r]?.[i] ?? null
          const lit = view.ph === 'call' && view.step === i && !!pats[view.r]?.[i]
          return <span key={i} className={g.beat} data-lit={lit ? 'true' : 'false'} data-s={now ? (m ?? 'wait') : 'wait'} data-head={now && view.step === i ? 'true' : 'false'} data-stray={now && strayAt.current === i && strays.current > 0 ? 'true' : 'false'} />
        })}
      </div>
      <p className={g.status} role="status">{view.ph === 'lead' ? T(copy, 'game.chant.ready') : now ? T(copy, 'game.chant.now') : T(copy, 'game.chant.listen')}{' · '}{T(copy, 'game.chant.round')} <bdi>{view.r + 1}</bdi> / <bdi>{ROUNDS}</bdi></p>
      <button type="button" className={g.btn} aria-disabled={!now} {...tapProps(chant)}>{T(copy, 'game.chant.button')}</button>
    </div>
  )
}

/* ───────────── the frame ───────────── */

export function MiniGame(props: MiniGameProps) {
  const {game, copy, reduced, onDone} = props
  // the way out arrives after a moment, so it is not pressed by the thumb that opened the game
  const [skip, setSkip] = useState(false)
  const [verdict, setVerdict] = useState<PlayResult | null>(null)
  useEffect(() => { const t = window.setTimeout(() => setSkip(true), 2500); return () => window.clearTimeout(t) }, [])
  const latest = useLatest({onDone, reduced})
  const finished = useRef(false), timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const finish = useCallback((result: PlayResult) => {
    if (finished.current) return
    finished.current = true
    setVerdict(result)
    timer.current = window.setTimeout(() => latest.current.onDone(result), latest.current.reduced ? 500 : 950)
  }, [latest])
  const leave = useCallback(() => {
    if (finished.current) { window.clearTimeout(timer.current); latest.current.onDone(verdictRef.current ?? 'slip'); return }
    finished.current = true; latest.current.onDone('slip')
  }, [latest])
  const verdictRef = useRef<PlayResult | null>(null)
  verdictRef.current = verdict
  const inner: Inner = {...props, finish}
  const help = copy[`game.${game}.help2`] ?? EN[`game.${game}.help2`] ?? copy[`game.${game}.help`] ?? EN[`game.${game}.help`] ?? ''
  return (
    <section className={`${styles.game} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-game-title" data-game={game} data-still={reduced ? 'true' : 'false'}>
      <h2 id="life-game-title" className={styles.cardTitle}>{copy[`game.${game}.title`] ?? EN[`game.${game}.title`]}</h2>
      <p className={styles.help}>{help}</p>
      {game === 'tune' && <Tune {...inner} />}
      {game === 'clap' && <Clap {...inner} />}
      {game === 'carry' && <Carry {...inner} />}
      {game === 'count' && <Count {...inner} />}
      {game === 'kick' && <Kick {...inner} />}
      {game === 'chant' && <Chant {...inner} />}
      <button type="button" className={`${styles.quiet} min-h-tap`} onClick={leave} data-life="game-skip" hidden={!skip}>{T(copy, 'game.skip')}</button>
      {verdict && (
        <div className={g.verdict} data-result={verdict} role="status" data-life="game-result">
          <b>{T(copy, `game.result.${verdict}`)}</b><small>{T(copy, `game.result.${verdict}.sub`)}</small>
        </div>
      )}
    </section>
  )
}
