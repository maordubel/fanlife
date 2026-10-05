'use client'
/**
 * Hands, not words: the four small things a supporter does in LIFE.
 *
 * None of them can be failed and none of them keeps a score. Each has a way out that is always
 * there ("That will do"), works by touch, by mouse and by keyboard, and says in words what the
 * moving part is showing.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {MiniGame as Game} from '@/lib/life/universal/types'
import styles from './life.module.css'

type Copy = Record<string, string>
type Props = {game: Game; id: string; amount: number; copy: Copy; reduced: boolean; cue: (name: string) => void; onDone: () => void}

/** The same game opens the same way twice: a dial does not move while nobody is looking. */
function seeded(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 1000) / 1000
}

function Tune({id, copy, cue, onDone}: Props) {
  const target = useMemo(() => 14 + Math.round(seeded(id) * 72), [id])
  const [value, setValue] = useState(() => (target > 50 ? 8 : 92))
  const off = Math.abs(value - target), clear = off <= 3, near = off <= 14
  const held = useRef<number | null>(null)
  useEffect(() => {
    if (!clear) { held.current = null; return }
    const timer = window.setTimeout(onDone, 950)
    return () => window.clearTimeout(timer)
  }, [clear, onDone, value])
  const strength = Math.max(0, 1 - off / 40)
  return (
    <>
      <div className={styles.dial} aria-hidden="true">
        {Array.from({length: 12}, (_, i) => <span key={i} data-on={strength * 12 > i ? 'true' : 'false'} style={{blockSize: `${22 + i * 6}%`}} />)}
      </div>
      <p className={styles.gameState} role="status">{clear ? copy['game.tune.clear'] : near ? copy['game.tune.near'] : copy['game.tune.static']}</p>
      <input className={styles.range} type="range" min={0} max={100} step={1} value={value} aria-label={copy['game.tune.dial']}
        onChange={e => { setValue(Number(e.target.value)); cue('tick') }} />
    </>
  )
}

function Clap({copy, reduced, cue, onDone}: Props) {
  const PERIOD = 900, NEED = 6
  const start = useRef(0)
  const [claps, setClaps] = useState(0)
  const [last, setLast] = useState<'with' | 'late' | null>(null)
  useEffect(() => { start.current = performance.now() }, [])
  const clap = useCallback(() => {
    const phase = ((performance.now() - start.current) % PERIOD) / PERIOD, onBeat = phase < 0.2 || phase > 0.8
    cue('clap')
    setLast(onBeat || reduced ? 'with' : 'late')
    setClaps(n => { const next = n + 1; if (next >= NEED) window.setTimeout(onDone, 380); return next })
  }, [cue, onDone, reduced])
  return (
    <>
      <div className={styles.ring} aria-hidden="true" data-still={reduced ? 'true' : 'false'}><span /><b>{Math.min(claps, NEED)}</b></div>
      <p className={styles.gameState} role="status">{last === 'with' ? copy['game.clap.with'] : last === 'late' ? copy['game.clap.late'] : ' '}</p>
      <button type="button" className={`${styles.big} min-h-tap`} onClick={clap} disabled={claps >= NEED}>{copy['game.clap.button']}</button>
    </>
  )
}

function Carry({id, copy, onDone}: Props) {
  const LENGTH = 7000
  const pos = useRef(0), vel = useRef(0), lean = useRef(0), began = useRef(0)
  const [view, setView] = useState({p: 0, t: 0})
  useEffect(() => {
    let raf = 0, prev = performance.now(), seed = seeded(id) * 10
    began.current = prev
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now
      const t = (now - began.current) / 1000
      // a slow sway and a quicker one on top of it: a load that has opinions
      const drift = Math.sin(t * 1.3 + seed) * 0.55 + Math.sin(t * 2.9 + seed * 2) * 0.3
      vel.current += (drift + lean.current * 1.9) * dt
      vel.current *= 0.94
      pos.current = Math.max(-1, Math.min(1, pos.current + vel.current * dt * 2.2))
      if (Math.abs(pos.current) === 1) vel.current = 0
      setView({p: pos.current, t: Math.min(1, (now - began.current) / LENGTH)})
      if (now - began.current >= LENGTH) { onDone(); return }
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
  }, [id, onDone])
  const hold = (dir: number) => ({
    onPointerDown: () => { lean.current = dir }, onPointerUp: () => { lean.current = 0 }, onPointerLeave: () => { lean.current = 0 }, onPointerCancel: () => { lean.current = 0 },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') lean.current = dir }, onKeyUp: () => { lean.current = 0 },
  })
  const steady = Math.abs(view.p) < 0.34
  return (
    <>
      {/* the track is a physical left and right, whatever the page direction */}
      <div className={styles.track} dir="ltr" aria-hidden="true"><i /><span style={{insetInlineStart: `${50 + view.p * 44}%`}} data-steady={steady ? 'true' : 'false'} /></div>
      <div className={styles.progress} aria-hidden="true"><span style={{inlineSize: `${view.t * 100}%`}} /></div>
      <p className={styles.gameState} role="status">{steady ? copy['game.carry.steady'] : copy['game.carry.wobble']}</p>
      <div className={styles.pair} dir="ltr">
        <button type="button" className={`${styles.big} min-h-tap`} aria-label={copy['game.carry.left']} {...hold(-1)}>◀</button>
        <button type="button" className={`${styles.big} min-h-tap`} aria-label={copy['game.carry.right']} {...hold(1)}>▶</button>
      </div>
    </>
  )
}

function Count({amount, copy, cue, onDone}: Props) {
  const total = Math.max(3, Math.min(20, amount))
  const [taken, setTaken] = useState<ReadonlySet<number>>(() => new Set())
  const take = (i: number) => {
    if (taken.has(i)) return
    const next = new Set(taken); next.add(i)
    cue('coin'); setTaken(next)
    if (next.size >= total) window.setTimeout(onDone, 420)
  }
  return (
    <>
      <div className={styles.coins}>
        {Array.from({length: total}, (_, i) => (
          <button key={i} type="button" className={`${styles.coin} min-h-tap`} aria-pressed={taken.has(i)} aria-label={`${copy['game.count.coin']} 1 · ${i + 1} ${copy.of} ${total}`} onClick={() => take(i)} />
        ))}
      </div>
      <p className={styles.gameState} role="status">{copy['game.count.total']}: <bdi>{taken.size}</bdi></p>
    </>
  )
}

export function MiniGame(props: Props) {
  const {game, copy, onDone} = props
  // the way out arrives after a moment, so it is not pressed by the thumb that opened the game
  const [skip, setSkip] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setSkip(true), 2500); return () => window.clearTimeout(t) }, [])
  const finished = useRef(false)
  const done = useCallback(() => { if (finished.current) return; finished.current = true; onDone() }, [onDone])
  const inner = {...props, onDone: done}
  return (
    <section className={`${styles.game} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-game-title" data-game={game}>
      <p className={styles.serial} aria-hidden="true">№ {props.id.toUpperCase()}</p>
      <h2 id="life-game-title" className={styles.cardTitle}>{copy[`game.${game}.title`]}</h2>
      <p className={styles.help}>{copy[`game.${game}.help`]}</p>
      {game === 'tune' && <Tune {...inner} />}
      {game === 'clap' && <Clap {...inner} />}
      {game === 'carry' && <Carry {...inner} />}
      {game === 'count' && <Count {...inner} />}
      <button type="button" className={`${styles.quiet} min-h-tap`} onClick={done} data-life="game-skip" hidden={!skip}>{copy['game.skip']}</button>
    </section>
  )
}
