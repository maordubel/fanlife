'use client'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import type {LiveryPattern} from '@/lib/club-livery'
import {dwellMs} from '@/lib/fixtures/rotation'

/** One card of the rotation, fully resolved on the server: the client formats time and nothing else. */
export type RotatorItem = {
  clubId: string
  club: string
  opponent: string
  initials: string
  primary: string
  on: string
  type: string
  pattern: LiveryPattern
  kickoff: string
  dateOnly: boolean
  clubSide: 'home' | 'away'
  competition: string | null
  venue: string | null
  href: string
  tag: 'live' | 'today' | 'soon' | 'later' | 'tbc'
}
export type RotatorCopy = {
  next: string; cta: string; home: string; away: string; vs: string; pause: string; play: string
  live: string; today: string; soon: string; later: string; tbc: string; tbcLine: string; tbcCta: string
}

const wear = (x: {primary: string; on: string; type: string}): CSSProperties => ({['--club-primary' as string]: x.primary, ['--club-on-primary' as string]: x.on, ['--club-type' as string]: x.type})

export function FixtureRotator({items, copy, locale}: {items: RotatorItem[]; copy: RotatorCopy; locale: string}) {
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [when, setWhen] = useState<string[] | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(q.matches)
    const on = () => setReduced(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  // kick-off is shown in the reader's own time zone, so it can only be written after mount
  useEffect(() => {
    setWhen(items.map(f => !f.kickoff ? '' : new Intl.DateTimeFormat(locale, f.dateOnly ? {dateStyle: 'full', timeZone: 'UTC'} : {dateStyle: 'full', timeStyle: 'short'}).format(new Date(f.kickoff))))
  }, [items, locale])
  useEffect(() => {
    if (reduced || held || pinned || items.length < 2) return
    const t = window.setTimeout(() => setI(n => (n + 1) % items.length), dwellMs(items[i]!.tag === 'tbc' ? 'later' : items[i]!.tag))
    return () => window.clearTimeout(t)
  }, [i, reduced, held, pinned, items])

  const f = items[i]
  if (!f) return null
  const tagWord = copy[f.tag]
  return (
    <div ref={box} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} onTouchStart={() => setHeld(true)}>
      <div className="mag-chips" role="tablist" aria-label={copy.next}>
        {items.map((x, n) => (
          <button key={x.clubId} role="tab" type="button" className="mag-chip min-h-tap" aria-selected={n === i} style={wear(x)}
            onClick={() => { setI(n); setPinned(true) }}>
            <i /><span>{x.initials}</span>
          </button>
        ))}
        {!reduced && items.length > 1 && (
          <button type="button" className="mag-chip min-h-tap" aria-pressed={pinned} onClick={() => setPinned(p => !p)}>{pinned ? copy.play : copy.pause}</button>
        )}
      </div>
      <article className="mag-fixture" style={wear(f)} role="tabpanel" aria-live={pinned || held ? 'off' : 'polite'}>
        <span className="mag-band" data-livery={f.pattern} aria-hidden="true" />
        <div className="mag-fixture-body">
          {f.tag === 'tbc' ? <>
          <span className="mag-kicker">{tagWord}</span>
          <h3><span>{f.club}</span></h3>
          <p className="mag-fixture-meta">{copy.tbcLine}</p>
          <Link className="mag-cta red" href={f.href}>{copy.tbcCta}<span aria-hidden="true">→</span></Link>
          </> : <>
          <span className="mag-kicker">{tagWord} · {f.clubSide === 'home' ? copy.home : copy.away}</span>
          <h3><span>{f.club}</span> {copy.vs} {f.opponent}</h3>
          <p className="mag-fixture-meta">
            <time dateTime={f.kickoff}>{when ? when[i] : f.kickoff.slice(0, 10)}</time>
            {f.competition ? <> · {f.competition}</> : null}
            {f.venue ? <> · {f.venue}</> : null}
          </p>
          <Link className="mag-cta red" href={f.href}>{copy.cta}<span aria-hidden="true">→</span></Link>
          </>}
        </div>
      </article>
    </div>
  )
}
