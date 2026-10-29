'use client'
/**
 * LIFE · Season One — the archive night, played around him.
 *
 * The board says only what the club's approved record says: the two sides as recorded, the score, and — where the
 * record lists every one of the club's goals with its minute and the other side did not score — a clock that runs to
 * those minutes. Anything less and there is no clock: the goals of one side come in one by one with no minute shown,
 * and when both sides scored (their order is not recorded) the night builds to the final score and nothing in between.
 * A row whose title is not a scoreline is printed as recorded, with no score at all.
 *
 * Everything else on this screen is the room: the people beside him and the noise he makes. Fiction, and marked so.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {ArchiveRef, Line, LiveDef} from '@/lib/life/universal/types'
import s from './season.module.css'

type Copy = Record<string, string>
type Ev = {at: number; kind: 'goal' | 'against' | 'talk' | 'end'; line?: Line; scorer?: string; minute?: number | null}
const word = (copy: Copy, k: string, en: string) => copy[k] ?? en
/** seconds of a night: long enough to feel it, short enough to stay */
const RUN = 44

export type LiveResult = {noise: number; held: boolean}

export function MatchLive({anchor, def, nameOf, heroize, reduced, cue, celebrate, onDone, copy, locale}: {
  anchor: ArchiveRef; def: LiveDef; nameOf: (id: string) => string; heroize: (t: string) => string
  reduced: boolean; cue: (n: string) => void; celebrate: () => void; onDone: (r: LiveResult) => void; copy: Copy; locale: string
}) {
  const m = anchor.match ?? null
  const ours = m ? (m.us === 'home' ? m.homeGoals : m.awayGoals) : 0, theirs = m ? (m.us === 'home' ? m.awayGoals : m.homeGoals) : 0
  const scorers = useMemo(() => m?.detail?.scorers ?? [], [m])
  /** a clock only when every goal of the night has a recorded minute: the club's own, and none against */
  const clocked = !!m && theirs === 0 && ours > 0 && scorers.length === ours && scorers.every(x => x.minute !== null)
  const plan = useMemo<Ev[]>(() => {
    const ev: Ev[] = []
    const talk = (lines: Line[], from: number, to: number) => lines.forEach((l, i) => ev.push({at: from + (to - from) * ((i + 1) / (lines.length + 1)), kind: 'talk', line: l}))
    if (!m) { talk(def.before, 2, 14); ev.push({at: 16, kind: 'end'}); return ev.sort((a, b) => a.at - b.at) }
    if (clocked) {
      // the clock runs 0 → 90 over RUN seconds; each goal falls on its recorded minute
      const t = (min: number) => 3 + (min / 90) * (RUN - 6)
      scorers.forEach(g => ev.push({at: t(g.minute!), kind: 'goal', scorer: g.name, minute: g.minute}))
      const first = Math.min(...scorers.map(g => t(g.minute!)))
      talk(def.before, 2, Math.max(4, first - 2))
      ev.push({at: RUN, kind: 'end'})
    } else if (ours > 0 && theirs > 0) {
      // both scored and the order is not recorded: the night builds to the result, nothing invented in between
      talk(def.before, 2, 18)
      ev.push({at: 20, kind: 'end'})
    } else {
      const n = ours || theirs, kind = ours ? 'goal' as const : 'against' as const
      talk(def.before, 2, 7)
      const named = ours && scorers.length === ours ? scorers : []
      for (let i = 0; i < n; i++) ev.push({at: 9 + i * (Math.min(28, 6 * n) / n), kind, ...(named[i] ? {scorer: named[i]!.name} : {}), minute: null})
      ev.push({at: 9 + Math.min(28, 6 * n) + 4, kind: 'end'})
    }
    return ev.sort((a, b) => a.at - b.at)
  }, [m, clocked, def.before, ours, theirs, scorers])

  const [t, setT] = useState(0)
  const [us, setUs] = useState(0), [them, setThem] = useState(0)
  const [shout, setShout] = useState<{kind: 'goal' | 'against'; scorer?: string; minute?: number | null} | null>(null)
  const [voice, setVoice] = useState<Line | null>(null)
  const [over, setOver] = useState(false)
  const [noise, setNoise] = useState(0)
  const [held, setHeld] = useState(false)
  const next = useRef(0), hold = useRef(0), started = useRef(false)
  const doneBtn = useRef<HTMLButtonElement | null>(null)

  useEffect(() => { if (!started.current) { started.current = true; cue('whistle') } }, [cue])
  // the night's own clock: it stands while a goal is being shouted
  useEffect(() => {
    if (over) return
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(.1, (now - last) / 1000); last = now
      if (hold.current > 0) hold.current -= dt
      else setT(x => x + dt * (reduced ? 1.6 : 1))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [over, reduced])
  useEffect(() => {
    while (next.current < plan.length && plan[next.current]!.at <= t) {
      const e = plan[next.current++]!
      if (e.kind === 'talk' && e.line) setVoice(e.line)
      if (e.kind === 'goal') { setUs(n => n + 1); setShout({kind: 'goal', scorer: e.scorer, minute: e.minute}); celebrate(); cue('roar'); hold.current = 3.2; const l = def.goal[(us) % Math.max(1, def.goal.length)]; if (l) setVoice(l) }
      if (e.kind === 'against') { setThem(n => n + 1); setShout({kind: 'against'}); cue('murmur'); hold.current = 2.6; const l = def.against[them % Math.max(1, def.against.length)]; if (l) setVoice(l) }
      if (e.kind === 'end') {
        if (m && !clocked && ours > 0 && theirs > 0) { setUs(ours); setThem(theirs) }
        setOver(true); setShout(null); cue('whistle')
        const r = m ? m.result : 'unread'
        const end = def.end[r as 'won' | 'lost' | 'drew' | 'unread'] ?? def.end.unread
        if (end[0]) setVoice(end[0])
        if (r === 'won') celebrate()
      }
    }
  }, [t, plan, celebrate, cue, def, m, clocked, ours, theirs, us, them])
  useEffect(() => { if (!shout) return; const id = window.setTimeout(() => setShout(null), 2600); return () => window.clearTimeout(id) }, [shout])
  useEffect(() => { if (over) doneBtn.current?.focus({preventScroll: true}) }, [over])

  const minute = clocked ? Math.min(90, Math.max(0, Math.round(((t - 3) / (RUN - 6)) * 90))) : null
  const make = useCallback(() => { setNoise(n => n + 1); if (noise % 4 === 0) cue('tick') }, [cue, noise])
  const finish = useCallback(() => onDone({noise, held}), [onDone, noise, held])
  const skip = useCallback(() => { if (!over) { setT(RUN + 60); return } finish() }, [over, finish])
  const speaker = voice?.who && voice.who !== 'me' && voice.who !== 'think' ? nameOf(voice.who) : voice?.who === 'me' ? word(copy, 'you', 'You') : null
  const date = anchor.on ? new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${anchor.on}T00:00:00Z`)) : String(anchor.year)

  return (
    <section className={s.live} data-at={def.at} data-life="live" role="region" aria-label={word(copy, 's1.live', 'Live')} data-over={over ? 'true' : 'false'}>
      <div className={s.board} data-life="live-board">
        <div className={s.boardTop}>
          <span><bdi>{date}</bdi>{anchor.hint ? <> · <bdi lang={anchor.locale} dir="auto">{anchor.hint}</bdi></> : null}</span>
          <span className={s.livePill}>{over ? word(copy, 'score.final', 'Full time') : <><i aria-hidden="true" />{word(copy, 's1.live', 'Live')}</>}</span>
        </div>
        {m ? (
          <div className={s.teams} dir="ltr">
            <span className={s.team} data-us={m.us === 'home' ? 'true' : 'false'} lang={anchor.locale} dir="auto">{m.home}</span>
            <span className={s.score} aria-live="polite"><bdi>{m.us === 'home' ? us : them}–{m.us === 'home' ? them : us}</bdi></span>
            <span className={s.team} data-us={m.us === 'away' ? 'true' : 'false'} lang={anchor.locale} dir="auto">{m.away}</span>
          </div>
        ) : <p className={s.team} lang={anchor.locale} dir="auto">{anchor.title}</p>}
        {minute !== null && !over && <span className={s.minute}><bdi>{minute}′</bdi></span>}
      </div>

      <div className={s.feed}>
        {shout ? (
          <>
            <span className={s.shout} data-life="live-goal">{shout.kind === 'goal' ? word(copy, 's1.goal', 'GOAL!') : word(copy, 's1.against', 'No…')}</span>
            {shout.scorer && <span className={s.scorer} lang={anchor.locale} dir="auto">{shout.scorer}{shout.minute != null ? <bdi> {shout.minute}′</bdi> : null}</span>}
          </>
        ) : voice ? (
          <div className={s.voice} key={voice.t}>{speaker && <b><bdi>{speaker}</bdi></b>}<p style={voice.who === 'think' ? {fontStyle: 'italic'} : undefined}>{heroize(voice.t)}</p></div>
        ) : null}
        {over && (
          <div className={s.record} data-life="live-record">
            <small>{word(copy, 'archive', 'From the archive')}</small>
            <b lang={anchor.locale} dir="auto">{anchor.title}</b>
            {anchor.sources.length > 0 && <span>{word(copy, 'sources', 'Sources')}: {anchor.sources.map((x, i) => <span key={i}>{i > 0 && ' · '}{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer"><bdi>{x.publisher}</bdi></a> : <bdi>{x.publisher}</bdi>}</span>)}</span>}
          </div>
        )}
      </div>

      <div className={s.liveFoot}>
        {!over ? (
          <>
            <button type="button" className={`${s.noise} min-h-tap`} data-hot={shout?.kind === 'goal' ? 'true' : 'false'} onClick={make}
              onPointerDown={() => setHeld(true)} data-life="live-noise">{shout?.kind === 'goal' ? word(copy, 's1.jump', 'Jump!') : word(copy, 's1.noise', 'Make noise')}</button>
            <span className={s.meter} aria-hidden="true"><b style={{inlineSize: `${Math.min(100, noise * 4)}%`}} /></span>
            <button type="button" className={`${s.quiet} min-h-tap`} onClick={skip} data-life="live-skip">{word(copy, 's1.toEnd', 'To full time')} ›</button>
          </>
        ) : (
          <button type="button" ref={doneBtn} className={`${s.btn} min-h-tap`} onClick={finish} data-life="live-done">{word(copy, 's1.goOn', 'Go on')}</button>
        )}
      </div>
    </section>
  )
}
