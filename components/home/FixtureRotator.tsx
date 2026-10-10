'use client'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import type {LiveryPattern} from '@/lib/club-livery'
import {dwellMs} from '@/lib/fixtures/rotation'
import { Badge } from '@/components/clubs/Badge'

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
  next: string; cta: string; of: string; prev: string; fwd: string; home: string; away: string; vs: string; pause: string; play: string
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
    setWhen(items.map(f => !f.kickoff ? '' : new Intl.DateTimeFormat(locale, f.dateOnly ? {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'} : {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(f.kickoff))))
  }, [items, locale])
  useEffect(() => {
    if (reduced || held || pinned || items.length < 2) return
    const t = window.setTimeout(() => setI(n => (n + 1) % items.length), dwellMs(items[i]!.tag === 'tbc' ? 'later' : items[i]!.tag))
    return () => window.clearTimeout(t)
  }, [i, reduced, held, pinned, items])

  const f = items[i]
  if (!f) return null
  const tagWord = copy[f.tag]
  const step = (d: number) => { setI(n => (n + d + items.length) % items.length); setPinned(true) }
  // One slim ticket, not a wall of chips (owner, 7.10.2026: "smaller, more modest"). Every club is still on the roll.
  return (
    <div ref={box} className="mag-next" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} onTouchStart={() => setHeld(true)}>
      {items.length > 1 && <button type="button" className="mag-next-step min-h-tap" aria-label={copy.prev} onClick={() => step(-1)}><span aria-hidden="true">‹</span></button>}
      <Link className="mag-next-card" href={f.href} style={wear(f)} aria-live={pinned || held ? 'off' : 'polite'}>
        <Badge club={f}/>
        <span className="mag-next-txt">
          <small>{tagWord}{f.tag === 'tbc' ? null : <> · {f.clubSide === 'home' ? copy.home : copy.away}</>}</small>
          {f.tag === 'tbc'
            ? <b><span>{f.club}</span></b>
            : <b><span>{f.club}</span> {copy.vs} {f.opponent}</b>}
          {f.tag === 'tbc'
            ? <i>{copy.tbcLine}</i>
            : <i><time dateTime={f.kickoff}>{when ? when[i] : f.kickoff.slice(0, 10)}</time>{f.competition ? <> · {f.competition}</> : null}</i>}
        </span>
        <span className="mag-next-go" aria-hidden="true">→</span>
      </Link>
      {items.length > 1 && <button type="button" className="mag-next-step min-h-tap" aria-label={copy.fwd} onClick={() => step(1)}><span aria-hidden="true">›</span></button>}
      {items.length > 1 && <p className="mag-next-count">
        <span>{i + 1} {copy.of} {items.length}</span>
        {!reduced && <button type="button" className="min-h-tap" aria-pressed={pinned} onClick={() => setPinned(p => !p)}>{pinned ? copy.play : copy.pause}</button>}
      </p>}
    </div>
  )
}
