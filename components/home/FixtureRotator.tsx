'use client'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import {createPortal} from 'react-dom'
import type {LiveryPattern} from '@/lib/club-livery'
import { Badge } from '@/components/clubs/Badge'
import {Icon} from '@/components/weekly/Icon'

/** One line of the coupon, fully resolved on the server: the client formats time and nothing else. */
export type RotatorItem = {
  clubId: string
  club: string
  opponent: string
  /** the opponent's crest from the universe's library (OFFSIDES, ecosystem/crests); null = name only */
  opponentCrest?: string | null
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
  kicker: string; coupon: string; cols: string; all: string; note: string; close: string
  home: string; away: string; vs: string
  live: string; today: string; soon: string; later: string; tbc: string; tbcLamp: string
}

/** Lines printed on the coupon itself; the rest are one tap away in the sheet. A phone shows the first four (hub.css). */
const ON_COUPON = 6
const ON_PHONE = 4

const wear = (x: {primary: string; on: string; type: string}): CSSProperties => ({['--club-primary' as string]: x.primary, ['--club-on-primary' as string]: x.on, ['--club-type' as string]: x.type})

/**
 * NEXT UP — FOR REAL, as THE WEEKLY's coupon (rule 124, boards Hub-M / Hub-D): every club on the roll, one numbered line
 * each, in the order the feed gives (on now, today, this week, later, then the clubs with nothing confirmed). It used to be
 * a ‹ › rotator; now nothing moves and nothing scrolls sideways — the first lines are printed, "All N clubs' next matches"
 * opens the full coupon in a sheet. A club without a confirmed match says so and its line takes you to the club (rule 98).
 */
export function FixtureRotator({items, copy, locale}: {items: RotatorItem[]; copy: RotatorCopy; locale: string}) {
  const [when, setWhen] = useState<string[] | null>(null)
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null), closeRef = useRef<HTMLButtonElement>(null)
  // kick-off is shown in the reader's own time zone, so it can only be written after mount
  useEffect(() => {
    setWhen(items.map(f => !f.kickoff ? '' : new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, f.dateOnly ? {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'} : {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(f.kickoff))))
  }, [items, locale])
  useEffect(() => {
    if (!open) return
    const opener = btn.current
    const root = document.documentElement, prev = root.style.overflow
    root.style.overflow = 'hidden'; closeRef.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', key)
    return () => { root.style.overflow = prev; window.removeEventListener('keydown', key); opener?.focus() }
  }, [open])

  const line = (f: RotatorItem, i: number, onPick?: () => void) => (
    <li key={f.clubId}>
      <Link className="wkh-fx" href={f.href} style={wear(f)} onClick={onPick}>
        <b className="wkh-fx-no wk-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</b>
        <span className="wkh-fx-crest"><Badge club={f}/></span>
        <span className="wkh-fx-t">
          <b>{f.club}</b>
          {f.tag === 'tbc'
            ? <small>{copy.vs} <span className="wkh-blank" aria-hidden="true"/> {copy.tbc}</small>
            : <small>{f.clubSide === 'home' ? copy.home : copy.away} · {copy.vs} {f.opponentCrest ? <img className="wkh-fx-opp" src={f.opponentCrest} alt="" width={16} height={16} loading="lazy" decoding="async"/> : null}{f.opponent}<br/><time dateTime={f.kickoff}>{when ? when[i] : f.kickoff.slice(0, 10)}</time>{f.competition ? <> · {f.competition}</> : null}</small>}
        </span>
        <span className={`wk-lamp wkh-fx-lamp${f.tag === 'live' ? ' red' : ''}`}>{f.tag === 'tbc' ? copy.tbcLamp : copy[f.tag]}</span>
      </Link>
    </li>
  )
  const head = <div className="wkh-coupon-bar"><b className="wk-head white">{copy.coupon}</b><span className="wk-k white">{copy.cols}</span></div>
  const sheet = open ? <div className="wk-portal" lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
    <div className="wk-scrim" onClick={() => setOpen(false)} aria-hidden="true"/>
    <div className="wk-sheet narrow wkh-next-sheet z-[91]" role="dialog" aria-modal="true" aria-labelledby="wkh-next-sheet-h">
      <div className="wk-sheet-head">
        <div><p className="wk-banner wkh-red">{copy.kicker}</p><h2 id="wkh-next-sheet-h" className="wk-logo red wk-tilt wkh-sheet-title">{copy.coupon}</h2></div>
        <button ref={closeRef} type="button" className="wk-icon min-h-tap" onClick={() => setOpen(false)} aria-label={copy.close}><Icon name="close"/></button>
      </div>
      <div className="wk-coupon wkh-coupon"><div className="wkh-coupon-bar"><span className="wk-k white">{copy.cols}</span></div><ol className="wkh-fx-list">{items.map((f, i) => line(f, i, () => setOpen(false)))}</ol><p className="wk-small wkh-coupon-note">{copy.note}</p></div>
    </div>
  </div> : null

  return <>
    <div className="wk-coupon wkh-coupon">
      <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 18M8.5 15.5L20 6"/></svg></span>
      {head}
      <ol className="wkh-fx-list wkh-fx-short">{items.slice(0, ON_COUPON).map((f, i) => line(f, i))}</ol>
      <p className="wk-small wkh-coupon-note">{copy.note}</p>
    </div>
    {items.length > ON_PHONE && <button ref={btn} type="button" className={`wk-seeall min-h-tap wkh-seeall${items.length > ON_COUPON ? '' : ' wkh-m-only'}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span>{copy.all.replace('{n}', String(items.length))}</span><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>}
    {sheet && typeof document !== 'undefined' ? createPortal(sheet, document.body) : null}
  </>
}
