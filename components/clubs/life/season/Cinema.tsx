'use client'
/**
 * LIFE · Season One — the broadcast layer the shell draws over the room.
 *
 * Every piece here is DOM in the club's own tokens; the picture underneath is the 3D runtime, which the shell drives
 * (a shot, an act, the interview studio). Nothing here decides what happens: the shell hands each piece what to show
 * and what to call when the player taps, skips or runs out of time.
 */
import {useEffect, useRef, useState} from 'react'
import type {StampKind} from '@/lib/life/universal/types'
import s from './season.module.css'

type Copy = Record<string, string>
const word = (copy: Copy, k: string, en: string) => copy[k] ?? en

/** A staged scene: letterbox, grain, one caption at a time. A tap moves the scene on; Skip ends it. */
export function CineLayer({caption, onTap, onSkip, copy}: {caption: {who: string | null; text: string; kind: 'say' | 'think' | 'room'} | null; onTap: () => void; onSkip: () => void; copy: Copy}) {
  const skip = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { skip.current?.focus({preventScroll: true}) }, [])
  return (
    <div className={`${s.layer} ${s.bars}`} data-life="cine" role="region" aria-label={word(copy, 's1.scene', 'Scene')}>
      <div className={s.vignette} aria-hidden="true" />
      <div className={s.grain} aria-hidden="true" />
      <button type="button" className={s.tapNext} onClick={onTap} aria-label={word(copy, 's1.next', 'Next')} data-life="cine-next" />
      <button type="button" ref={skip} className={s.skip} onClick={onSkip} data-life="cine-skip">{word(copy, 's1.skip', 'Skip')} ›</button>
      {caption && (
        <div className={s.caption} data-think={caption.kind === 'think' ? 'true' : 'false'} data-room={caption.kind === 'room' ? 'true' : 'false'} aria-live="polite" key={caption.text}>
          {caption.who && <b><bdi>{caption.who}</bdi></b>}
          <p>{caption.text}</p>
        </div>
      )}
    </div>
  )
}

/** The interview, 2026: the lower third, the timecode, one line at a time; a portrait where the studio cannot be drawn. */
export function DocLayer({name, role, when, line, index, total, studio, onNext, onSkip, copy}: {
  name: string; role: string; when: string; line: string; index: number; total: number; studio: boolean
  onNext: () => void; onSkip: () => void; copy: Copy
}) {
  const skip = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { skip.current?.focus({preventScroll: true}) }, [])
  return (
    <div className={`${s.layer} ${s.bars} ${s.doc}`} data-life="doc" role="region" aria-label={`${word(copy, 's1.interview', 'Interview')} · ${name}`}>
      {!studio && <div className={s.portrait} aria-hidden="true"><span>{Array.from(name)[0] ?? '·'}</span></div>}
      <div className={s.vignette} aria-hidden="true" />
      <div className={s.grain} aria-hidden="true" />
      <button type="button" className={s.tapNext} onClick={onNext} aria-label={word(copy, 's1.next', 'Next')} data-life="doc-next" />
      <button type="button" ref={skip} className={s.skip} onClick={onSkip} data-life="doc-skip">{word(copy, 's1.skip', 'Skip')} ›</button>
      <p className={s.timecode} aria-hidden="true"><i />{word(copy, 's1.interview', 'Interview')} · <bdi>{when}</bdi></p>
      <div className={s.lower}>
        <span className={s.lowerName}><bdi>{name}</bdi></span>
        <span className={s.lowerRole}>{role}</span>
      </div>
      <div className={s.quote} aria-live="polite">
        <p key={index}>“{line}”</p>
        {total > 1 && <span className={s.dots} aria-hidden="true">{Array.from({length: total}, (_, i) => <i key={i} data-on={i <= index ? 'true' : 'false'} />)}</span>}
      </div>
    </div>
  )
}

/** A rubber stamp across the screen: a job done, a job missed, something new. It goes by itself. */
export function StampLayer({kind, text, copy}: {kind: StampKind; text: string; copy: Copy}) {
  const words: Record<StampKind, string> = {passed: word(copy, 's1.stamp.passed', 'Job done'), failed: word(copy, 's1.stamp.failed', 'Missed it'), unlocked: word(copy, 's1.stamp.unlocked', 'New job'), new: word(copy, 's1.stamp.new', 'New'), secret: word(copy, 's1.stamp.secret', 'Secret')}
  return (
    <div className={s.stampWrap} role="status" data-life="stamp" data-kind={kind}>
      <div className={s.stamp} data-kind={kind}>
        <span className={s.stampWord}>{words[kind]}</span>
        <span className={s.stampText}>{text}</span>
      </div>
    </div>
  )
}

/** The job, under the HUD: the episode, what to do now (★ when it is THE mission), the clock, the side jobs. */
export function MissionBar({label, job, main, clock, sides, copy}: {label: string; job: string | null; main: boolean; clock: {left: number; label: string} | null; sides: number; copy: Copy}) {
  const mm = clock ? `${Math.floor(clock.left / 60)}:${String(Math.max(0, Math.floor(clock.left % 60))).padStart(2, '0')}` : ''
  return (
    <div className={s.mission} data-life="mission-bar">
      {job && <p className={s.missionJob} data-main={main ? 'true' : 'false'}><span><small>{label}</small><br />{job}</span></p>}
      {clock && <p className={s.clock} data-hot={clock.left <= 20 ? 'true' : 'false'} data-life="clock" role="timer" aria-label={`${clock.label} ${mm}`}><small>{clock.label}</small><bdi>{mm}</bdi></p>}
      {sides > 0 && <p className={s.sideJobs} data-life="side-jobs">+{sides} {sides === 1 ? word(copy, 's1.side', 'side job') : word(copy, 's1.sides', 'side jobs')}</p>}
    </div>
  )
}

/** A line above somebody's head as he walks past. Placed by the shell (it knows where the head is on the glass). */
export function BarkBubble({x, y, text}: {x: number; y: number; text: string}) {
  return <p className={s.bark} style={{insetInlineStart: `${x}px`, insetBlockStart: `${y}px`}} data-life="bark" aria-live="polite">{text}</p>
}

/** The episode's title card. On the first episode of a new life it also asks his name. */
/** sounds that follow the cards (the shell's cue: real files first, a synthesised stand-in while one loads) */
type Cue = (name: string) => void
const calm = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

export function EpisodeOpen({no, of, age, title, logline, askName, name, onName, onPlay, ready, copy, texts = [], box = null, onCue}: {
  no: number; of: number; age: number; title: string; logline: string
  askName: boolean; name: string; onName: (v: string) => void; onPlay: () => void; ready: boolean; copy: Copy
  /** the season's first seconds: messages on a phone, 2026 */
  texts?: {from: string; t: string}[]
  /** the thing out of the box this episode is about */
  box?: {item: string; line: string; img?: string | null} | null
  onCue?: Cue
}) {
  const btn = useRef<HTMLButtonElement | null>(null), field = useRef<HTMLInputElement | null>(null)
  useEffect(() => { (askName ? field.current : btn.current)?.focus({preventScroll: true}) }, [askName])
  // each message buzzes as it lands (the CSS lands them every .9s), then the box is opened; with reduced motion all at once, once
  const cueRef = useRef(onCue); cueRef.current = onCue
  const nTexts = texts.length, hasBox = !!box
  useEffect(() => {
    const play = (n: string) => cueRef.current?.(n)
    if (calm()) { if (nTexts) play('phone-text'); else if (hasBox) play('box-lid'); return }
    const ts = Array.from({length: nTexts}, (_, i) => window.setTimeout(() => play('phone-text'), (i * 0.9 + 0.4) * 1000))
    if (hasBox) ts.push(window.setTimeout(() => play('box-lid'), (nTexts * 0.9 + 0.5) * 1000))
    return () => ts.forEach(t => window.clearTimeout(t))
  }, [nTexts, hasBox])
  return (
    <section className={`${s.card} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="s1-title" data-life="episode-open" style={{'--s1-after': `${texts.length * 0.9}s`} as React.CSSProperties}>
      {texts.length > 0 && (
        <ol className={s.phone} data-life="phone" aria-label={word(copy, 's1.phone', 'Messages')}>
          <li className={s.phoneHead}><span>{texts[0]!.from}</span><span>2026</span></li>
          {texts.map((m, i) => <li key={i} className={s.text} style={{'--s1-i': i} as React.CSSProperties}>{m.t}</li>)}
        </ol>
      )}
      {box && (
        <div className={s.box} data-life="box">
          {box.img && <img className={s.boxImg} src={box.img} alt="" width={160} height={160} decoding="async" />}
          <p className={s.boxKick}>{word(copy, 's1.box', 'From the box')}</p>
          <p className={s.boxItem}>{box.item}</p>
          <p className={s.boxLine}>{box.line}</p>
        </div>
      )}
      <p className={s.kick}><b>{word(copy, 's1.season', 'Season One')}</b> {word(copy, 's1.episode', 'Episode')} <bdi>{no}</bdi>/<bdi>{of}</bdi> · {word(copy, 'age', 'Age')} <bdi>{age}</bdi></p>
      <h2 id="s1-title" className={s.big}>{title}</h2>
      <p className={s.log}>{logline}</p>
      {askName && (
        <div className={s.nameField}>
          <label htmlFor="s1-name">{word(copy, 's1.name', 'His name')}</label>
          <input id="s1-name" ref={field} value={name} maxLength={18} autoComplete="off" spellCheck={false} onChange={e => onName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && ready && name.trim()) onPlay() }} data-life="hero-name" />
        </div>
      )}
      <div className={s.row}>
        <button type="button" ref={btn} className={`${s.btn} min-h-tap`} disabled={!ready || (askName && !name.trim())} onClick={onPlay} data-life="episode-play">{ready ? word(copy, 's1.play', 'Play') : word(copy, 'loading', 'Loading…')}</button>
      </div>
    </section>
  )
}

/** The end of an episode: what happened (done and missed, in order), what he kept, and what is next. */
export function EpisodeEnd({no, title, ledger, kept, next, onNext, last, copy, secrets = {found: [], total: 0}, tease = null, letter = null, onCue}: {
  no: number; title: string; ledger: {kind: StampKind; text: string}[]; kept: {name: string; note: string; img?: string | null} | null; next: string | null
  onNext: () => void; last: boolean; copy: Copy
  /** the secrets the interviews told him, out of all this episode holds: the rest are on the roads he did not take */
  secrets?: {found: string[]; total: number}
  /** one line under "Next": a question, never an answer */
  tease?: string | null
  /** the season's envelope, opened on the last card */
  letter?: {head: string; lines: string[]; sign: string; after: string} | null
  onCue?: Cue
}) {
  const [opened, setOpened] = useState(false)
  const btn = useRef<HTMLButtonElement | null>(null)
  const [shown, setShown] = useState(0)
  useEffect(() => { btn.current?.focus({preventScroll: true}) }, [])
  // the ledger is read out one row at a time, like a scoreline coming in
  useEffect(() => { if (shown >= ledger.length) return; const t = window.setTimeout(() => { setShown(n => n + 1); onCue?.('ledger') }, 380); return () => window.clearTimeout(t) }, [shown, ledger.length, onCue])
  const open = () => { onCue?.('envelope-tear'); window.setTimeout(() => onCue?.('letter'), calm() ? 0 : 420); setOpened(true) }
  return (
    <section className={`${s.card} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="s1-end" data-life="episode-end">
      <p className={s.kick}><b>{word(copy, 's1.episode', 'Episode')} <bdi>{no}</bdi></b> {word(copy, 's1.over', 'is over')}</p>
      <h2 id="s1-end" className={s.big}>{title}</h2>
      {ledger.length > 0 && (
        <ol className={s.ledger} data-life="ledger">
          {ledger.slice(0, shown).map((r, i) => <li key={i} data-kind={r.kind}><span>{r.kind === 'failed' ? word(copy, 's1.stamp.failed', 'Missed it') : r.kind === 'new' ? word(copy, 's1.remember', 'Remember') : word(copy, 's1.stamp.passed', 'Job done')}</span><span>{r.text}</span></li>)}
        </ol>
      )}
      {kept && <div className={s.kept}>{kept.img && <img className={s.keptImg} src={kept.img} alt="" width={120} height={120} decoding="async" />}<p className={s.log}><b>{word(copy, 'kept', 'Kept')}:</b> {kept.name} — {kept.note}</p></div>}
      {secrets.total > 0 && (
        <div className={s.secrets} data-life="secrets" data-found={secrets.found.length} data-total={secrets.total}>
          <p className={s.secretsHead}><b>{word(copy, 's1.secrets', 'Secrets heard')}</b> <bdi>{secrets.found.length}</bdi>/<bdi>{secrets.total}</bdi></p>
          <ul>
            {secrets.found.map((t, i) => <li key={`f${i}`}>{t}</li>)}
            {Array.from({length: Math.max(0, secrets.total - secrets.found.length)}, (_, i) => <li key={`q${i}`} data-locked="true" aria-label={word(copy, 's1.secretLocked', 'Not heard yet')}>? ? ?</li>)}
          </ul>
          {secrets.found.length < secrets.total && <p className={s.secretsHint}>{word(copy, 's1.secretsHint', 'The rest are on the roads you did not take.')}</p>}
        </div>
      )}
      {letter && (opened ? (
        <div className={s.letter} data-life="letter">
          <p className={s.letterHead}>{letter.head}</p>
          {letter.lines.map((l, i) => <p key={i} style={{'--s1-i': i} as React.CSSProperties}>{l}</p>)}
          <p className={s.letterSign}>{letter.sign}</p>
          <p className={s.letterAfter}>{letter.after}</p>
        </div>
      ) : (
        <button type="button" className={`${s.envelope} min-h-tap`} onClick={open} data-life="envelope"><img className={s.envImg} src="/life/season/box/envelope.webp" alt="" width={72} height={52} decoding="async" />{word(copy, 's1.envelope', 'Open the envelope')}</button>
      ))}
      {!letter && !last && <p className={s.sealed} data-life="sealed">{word(copy, 's1.sealed', 'The envelope stays sealed. Not until the last one.')}</p>}
      {next && <p className={s.next}>{word(copy, 's1.next.episode', 'Next')} · <b>{next}</b></p>}
      {tease && <p className={s.tease} data-life="tease">{tease}</p>}
      <div className={s.row}>
        <button type="button" ref={btn} className={`${s.btn} min-h-tap`} onClick={onNext} data-life="next-chapter" disabled={!!letter && !opened}>{last ? word(copy, 's1.goOn', 'Go on') : word(copy, 's1.nextEpisode', 'Next episode')}</button>
      </div>
    </section>
  )
}

/** The moment's fuse: a bar that drains while a timed choice stands. */
export function Fuse({seconds}: {seconds: number}) {
  return <span className={s.fuse} aria-hidden="true" style={{'--s1-fuse': `${seconds}s`} as React.CSSProperties}><b /></span>
}

/** The card between a flash-forward and the day: "Two hours earlier". */
export function TimeCard({text}: {text: string}) {
  return <div className={s.timeCard} data-life="time-card" role="status"><p>{text}</p></div>
}
