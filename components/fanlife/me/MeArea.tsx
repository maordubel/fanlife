'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { activityKey, readActivity, xiKey } from '@/lib/clubs/activity'
import { closetMine } from '@/lib/collector/api'
import type { Closet } from '@/lib/collector/types'
import { wearLivery } from '@/lib/club-livery'
import { fl } from '@/lib/fanlife/copy'
import { handleLabel } from '@/lib/fanlife/collector/labels'
import { beenList, readBeen, type BeenRow } from '@/lib/fanlife/been'
import { BEGAN, barsOf, NAME_MAX, rankOf, readCard, writeCard, type MeCard } from '@/lib/fanlife/me'
import { saveKey } from '@/lib/life/universal/engine'

import type { MeClub } from '@/app/me/data'

import { GoogleAccount } from './GoogleAccount'
import { crestFor } from '@/lib/clubs/crest'
import { Badge } from '@/components/clubs/Badge'
import { DrawnShirt } from '@/components/fanlife/DrawnShirt'

/**
 * "Me" — The Worker's personal area (app/tik: the card, the oath, the story, the editor, the
 * standing, the closet door) for a hub of clubs. Everything is read from this device after mount,
 * so the first render is the empty reading and server and client agree on every character.
 */
type Played = { club: MeClub; rounds: number; best: number; xi: boolean; life: number; lifeAt: string | null; been: number }
type Tab = 'card' | 'oath' | 'story' | 'details'

export function lifeOf(club: string): { chapters: number; at: string | null } {
  try {
    const raw = localStorage.getItem(saveKey(club))
    if (!raw) return { chapters: 0, at: null }
    const file = JSON.parse(raw) as { events?: { t: string }[]; savedAt?: string }
    return { chapters: (file.events ?? []).filter((e) => e.t === 'chapter').length, at: typeof file.savedAt === 'string' ? file.savedAt : null }
  } catch {
    return { chapters: 0, at: null }
  }
}

function played(clubs: MeClub[], been: BeenRow[]): Played[] {
  return clubs.map((club) => {
    let has = false
    try { has = localStorage.getItem(activityKey(club.id)) !== null || localStorage.getItem(xiKey(club.id)) !== null } catch { /* no storage */ }
    const a = readActivity(club.id)
    const life = lifeOf(club.id)
    const rounds = a.trivia.completed + a.memory.completed + a.polls.completed + a['blind-cow'].completed
    return { club, rounds: has ? rounds : 0, best: a.trivia.best, xi: a.xi, life: life.chapters, lifeAt: life.at, been: been.filter((b) => b.club === club.id).length }
  })
}

const fmt = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

export function MeArea({ clubs }: { clubs: MeClub[] }) {
  const [card, setCard] = useState<MeCard | null>(null)
  const [rows, setRows] = useState<Played[]>([])
  const [closet, setCloset] = useState<Closet | null>(null)
  const [been, setBeen] = useState<BeenRow[]>([])
  const [tab, setTab] = useState<Tab>('card')
  const reread = useCallback(() => {
    setCard(readCard())
    const days = beenList(readBeen())
    setBeen(days)
    setRows(played(clubs, days))
    void closetMine().then((r) => setCloset(r.ok ? r : null))
  }, [clubs])
  useEffect(reread, [reread])

  const club = clubs.find((c) => c.id === card?.club) ?? null
  const total = rows.reduce((n, r) => n + r.rounds, 0)
  const rank = rankOf(total)
  const active = rows.filter((r) => r.rounds || r.xi || r.life || r.been)

  const held = closet ? closet.items.filter((i) => i.state === 'held' || i.state === 'reserved').length : 0
  const blanks = rows.filter((r) => r.club.core && !(r.rounds || r.xi || r.life || r.been))

  return (
    <>
      <div className="wkc-l wkc-me-l">
        <div className="wkc-me-tabs" role="tablist" aria-label={fl('me.title')}>
          <div className="wk-seg" role="presentation">
            {(['card', 'oath', 'story'] as const).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className="min-h-tap" onClick={() => setTab(id)}>{fl(`me.tab.${id}`)}</button>
            ))}
          </div>
          <button type="button" role="tab" aria-selected={tab === 'details'} className="wk-btn paper min-h-tap wkc-edit" onClick={() => setTab('details')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-5L16 4l4 4L9 19z M14 6l4 4" /></svg>{fl('me.tab.details')}
          </button>
        </div>
        <div role="tabpanel" className="wkc-me-panel">
          {tab === 'card' ? <Card card={card} club={club} rank={rank} /> : null}
          {tab === 'oath' ? <Oath card={card} club={club} /> : null}
          {tab === 'story' ? <Story card={card} club={club} rows={rows} closet={closet} been={been} /> : null}
          {tab === 'details' ? <Details card={card} clubs={clubs} onSave={(next) => { setCard(writeCard(next)); setTab('card') }} /> : null}
        </div>
        <GoogleAccount onChange={reread} />
      </div>

      <div className="wkc-r wkc-me-r">
        <section className="wkc-sec" aria-labelledby="me-clubs">
          <div className="wkc-h2">
            <div><p className="wk-banner">{fl('me.clubs.kicker')}</p><h2 className="wkc-h2-t green" id="me-clubs">{fl('me.clubs.title')}</h2></div>
            <span className="wk-k wk-muted">{fl('me.rank.note', { n: total })}</span>
          </div>
          <p className="wk-small wkc-note-p">{fl('me.clubs.note')}</p>
          <ol className="wkc-rungs" aria-label={fl(`me.rank.${rank}`)}>
            {RUNGS.map((at, i) => (
              <li key={at} className={i < rank ? 'done' : i === rank ? 'on' : undefined} aria-current={i === rank ? 'true' : undefined}>
                <b>{fl(`me.rank.${i}` as 'me.rank.0')}</b>
                <small>{i === 0 ? fl('me.rank.from', { n: at }) : fl('me.rank.at', { n: at })}</small>
                <span className="wk-k">{i < rank ? fl('me.rank.passed') : i === rank ? fl('me.rank.you', { n: total }) : fl('me.rank.togo', { n: at - total })}</span>
              </li>
            ))}
          </ol>
          <div className="wkc-pass">
            <p className="wkc-pass-head"><span className="wk-k">{fl('me.passport')}</span><span className="wk-k wk-muted">{fl(`me.rank.${rank}` as 'me.rank.0')}</span></p>
            {active.map((r, i) => (
              <div key={r.club.id} className="wkc-visa" data-flip={i % 2 === 1 || undefined} style={wearLivery(r.club)}>
                <Stamp club={r.club} rounds={r.rounds} tilt={i % 2 ? 7 : -8} />
                <div className="wkc-visa-t">
                  <b className="wk-head">{r.club.name}</b>
                  <span className="wk-small">{[fl('me.clubs.rounds', { n: r.rounds }), r.best ? fl('me.clubs.best', { n: r.best }) : null, r.xi ? fl('me.clubs.xi') : null, r.life ? fl('me.clubs.life', { n: r.life, of: r.club.lifeChapters || r.life }) : null, r.been ? fl('me.clubs.been', { n: r.been }) : null].filter(Boolean).join(' · ')}</span>
                  <Link className="wk-k wkc-open" href={`/clubs/${r.club.id}`}>{fl('me.clubs.open')} →</Link>
                </div>
              </div>
            ))}
            {blanks.length ? (
              <div className="wkc-blank">
                <span className="wk-k wk-muted">{fl('me.passport.blank')}</span>
                <ul>
                  {blanks.map((r) => (
                    <li key={r.club.id}><Link href={`/clubs/${r.club.id}`} aria-label={fl('me.passport.notyet', { club: r.club.name })} style={wearLivery(r.club)}><Badge club={r.club} /></Link></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="wk-panel wkc-closet" aria-labelledby="me-closet">
          <div className="wk-redplate wkc-closet-rail" aria-hidden="true">
            <DrawnShirt id="me-rail-1" className="wkc-rail-shirt" />
            <DrawnShirt id="me-rail-2" className="wkc-rail-shirt" stripe="var(--mag-navy)" />
            <DrawnShirt id="me-rail-3" className="wkc-rail-shirt" />
            {held ? <span className="wk-burst white wkc-closet-burst"><b className="wk-num">{held}</b><small className="wk-k">{fl('me.closet.shirts')}</small></span> : null}
          </div>
          <div className="wkc-closet-t">
            <h2 id="me-closet" className="wk-head red">{fl('me.closet.title')}</h2>
            <p className="wkc-closet-body">{closet && (closet.items.length || closet.wants.length) ? fl('me.closet.body', { have: held, want: closet.wants.length }) : fl('me.closet.empty')}</p>
            {closet ? (
              <>
                <p className="wk-small">{closet.profile.identityMode === 'anonymous' ? fl('me.closet.identity.anon') : fl('me.closet.identity', { who: handleLabel(closet.label) })}</p>
                <p className="wkc-links"><Link className="wk-k" href="/closet#identity-title">{fl('me.closet.identity.change')}</Link><Link className="wk-k" href="/closet/contributions">{fl('contrib.me')}</Link></p>
              </>
            ) : null}
            <Link className="wk-btn red block" href="/closet">{fl('me.closet.open')} →</Link>
          </div>
        </section>
      </div>
    </>
  )
}

/** the standing's four rungs — the same numbers rankOf() reads (lib/fanlife/me) */
const RUNGS = [0, 5, 20, 60] as const

/** a passport visa: the club's name round the rim, the rounds in the middle, printed in the club's ink */
function Stamp({ club, rounds, tilt }: { club: MeClub; rounds: number; tilt: number }) {
  const top = `st-${club.id}-t`, bottom = `st-${club.id}-b`
  return (
    <svg className="wkc-stamp" viewBox="0 0 160 160" style={{ transform: `rotate(${tilt}deg)` }} aria-hidden="true" focusable="false">
      <defs><path id={top} d="M 30 80 A 50 50 0 0 1 130 80" /><path id={bottom} d="M 19 80 A 61 61 0 0 0 141 80" /></defs>
      <g fill="none" stroke="currentColor"><circle cx="80" cy="80" r="75" strokeWidth="5" /><circle cx="80" cy="80" r="67" strokeWidth="2" /><circle cx="80" cy="80" r="41" strokeWidth="2.5" /></g>
      <text className="wkc-stamp-rim"><textPath href={`#${top}`} startOffset="50%" textAnchor="middle">{club.name.toUpperCase()}</textPath></text>
      <text className="wkc-stamp-city"><textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">{`★ ${club.city.toUpperCase()} ★`}</textPath></text>
      <text x="80" y="92" textAnchor="middle" className="wkc-stamp-n">{rounds}</text>
      <text x="80" y="108" textAnchor="middle" className="wkc-stamp-u">ROUNDS</text>
      <path d="M14 80 h7 M139 80 h7" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

function Card({ card, club, rank }: { card: MeCard | null; club: MeClub | null; rank: number }) {
  const bars = useMemo(() => barsOf(card?.memberNo ?? 'FL-0000'), [card?.memberNo])
  const blank = !card?.name && !club
  return (
    <article className="wkc-card" style={wearLivery(club) ?? { ['--club-primary' as string]: 'var(--mag-vermilion)' }} aria-label={fl('me.card.kicker')}>
      <span className="wkc-card-slot" aria-hidden="true" />
      <header className="wk-stripes wkc-card-head">
        {club ? <span className="wkc-card-crest">{crestFor(club.id) ? <Badge club={club} /> : <span className="mag-band" data-livery={club.pattern} aria-hidden="true"><b>{club.initials}</b></span>}</span> : null}
        <span className="wk-tag ink">{fl('me.card.kicker')}</span>
        <span className="wk-tag wkc-card-no">{fl('me.card.member')}<b className="wk-num">{card?.memberNo ?? '—'}</b></span>
      </header>
      <div className="wkc-card-body">
        <div className="wkc-card-who">
          <h2 className="wk-logo red">{card?.name || fl('me.card.anon')}</h2>
          <p className="wk-head">{club ? club.name : fl('me.card.noClub')}</p>
          <span className="wk-stamp wkc-card-rank">{fl(`me.rank.${rank}` as 'me.rank.0')}</span>
        </div>
        {card?.number ? (
          <span className="wkc-card-number" aria-label={`${fl('me.card.number')} ${card.number}`}>
            <DrawnShirt id="me-card-no" hanger={false} number={card.number} stripe="var(--club-primary, var(--mag-vermilion))" className="wkc-card-shirt" />
            <span className="wk-k wk-muted">{fl('me.card.mynumber')}</span>
          </span>
        ) : null}
      </div>
      <dl className="wkc-card-boxes">
        <div><dt>{fl('me.card.since')}</dt><dd data-blank={!card?.since || undefined}>{card?.since ?? '—'}</dd></div>
        <div><dt>{fl('me.card.began')}</dt><dd data-blank={!card?.began || undefined}>{card?.began ? fl(`me.began.${card.began}`) : '—'}</dd></div>
        <div><dt>{fl('me.card.first')}</dt><dd data-blank={!card?.first || undefined}>{card?.first || '—'}</dd></div>
        <div><dt>{fl('me.card.joined')}</dt><dd>{card ? fmt(card.joined) : '—'}</dd></div>
      </dl>
      <footer className="wkc-card-foot">
        <span className="wkc-card-bars" aria-hidden="true">{bars.map((w, i) => <i key={i} style={{ width: w * 2 }} data-on={i % 2 === 0 || undefined} />)}</span>
        <span className="wkc-card-sign"><b>{card?.name || ''}</b><span className="wk-k wk-muted">{fl('me.card.sign')}</span></span>
      </footer>
      {blank ? <p className="wkc-card-empty">{fl('me.card.empty')}</p> : null}
    </article>
  )
}

function Oath({ card, club }: { card: MeCard | null; club: MeClub | null }) {
  if (!card || !club) return <p className="wk-cap white">{fl('me.oath.empty')}</p>
  const name = card.name || fl('me.card.anon')
  const lines = [
    fl('me.oath.l1', { name, club: club.name }),
    card.since ? fl('me.oath.l2', { year: card.since }) : null,
    card.began ? fl('me.oath.l3', { began: fl(`me.began.${card.began}`).toLowerCase() }) : null,
    card.first ? fl('me.oath.l4', { first: card.first }) : null,
    card.number ? fl('me.oath.l5', { number: card.number }) : null,
    fl('me.oath.l6'),
  ].filter(Boolean)
  return (
    <section className="wkc-oath" style={wearLivery(club)}>
      <p className="wk-cap white">{fl('me.oath.intro')}</p>
      <ol className="wk-panel shadow">{lines.map((l, i) => <li key={i} className="wk-head">{l}</li>)}</ol>
    </section>
  )
}

function Story({ card, club, rows, closet, been }: { card: MeCard | null; club: MeClub | null; rows: Played[]; closet: Closet | null; been: BeenRow[] }) {
  const beats: { at: string; sort: string; text: string }[] = []
  if (card?.since && club) beats.push({ at: String(card.since), sort: `${card.since}`, text: fl('me.story.since', { club: club.name }) })
  if (card) beats.push({ at: fmt(card.joined), sort: card.joined, text: fl('me.story.joined') })
  for (const r of rows) if (r.life && r.lifeAt) beats.push({ at: fmt(r.lifeAt), sort: r.lifeAt, text: fl('me.story.life', { club: r.club.name, n: r.life }) })
  for (const b of been) beats.push({ at: b.on ? (b.on.length === 4 ? b.on : fmt(b.on)) : '—', sort: b.on ?? '9999', text: fl('me.story.been', { label: b.label }) })
  const first = closet?.items.map((i) => i.createdAt).sort()[0]
  if (first) beats.push({ at: fmt(first), sort: first, text: fl('me.story.closet') })
  beats.sort((a, b) => a.sort.localeCompare(b.sort))
  if (beats.length < 2 && !first && !been.length) return <p className="wk-cap white">{fl('me.story.empty')}</p>
  return (
    <section className="wkc-story">
      <p className="wk-cap white">{fl('me.story.intro')}</p>
      <ol>{beats.map((b, i) => <li key={i}><time className="wk-num">{b.at}</time><span>{b.text}</span></li>)}</ol>
    </section>
  )
}

function Details({ card, clubs, onSave }: { card: MeCard | null; clubs: MeClub[]; onSave: (c: MeCard) => void }) {
  const [draft, setDraft] = useState<MeCard | null>(card)
  const [saved, setSaved] = useState(false)
  useEffect(() => setDraft(card), [card])
  if (!draft) return null
  const set = <K extends keyof MeCard>(k: K, v: MeCard[K]) => { setSaved(false); setDraft({ ...draft, [k]: v }) }
  const year = new Date().getFullYear()
  return (
    <form className="fl-form wkc-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); setSaved(true) }}>
      <label>{fl('me.form.name')}<input value={draft.name} maxLength={NAME_MAX} onChange={(e) => set('name', e.target.value)} autoComplete="nickname" /><small>{fl('me.form.nameHint')}</small></label>
      <label>{fl('me.form.club')}<select value={draft.club ?? ''} onChange={(e) => set('club', e.target.value || null)}><option value="">{fl('me.form.pick')}</option>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>{fl('me.form.year')}<select value={draft.since ?? ''} onChange={(e) => set('since', e.target.value ? Number(e.target.value) : null)}><option value="">—</option>{Array.from({ length: year - 1929 }, (_, i) => year - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
      <fieldset><legend>{fl('me.form.began')}</legend><div className="wk-opts three">{BEGAN.map((b) => <button key={b} type="button" className="wk-opt min-h-tap" aria-pressed={draft.began === b} onClick={() => set('began', draft.began === b ? null : b)}>{fl(`me.began.${b}`)}</button>)}</div></fieldset>
      <label>{fl('me.form.first')}<input value={draft.first} maxLength={60} onChange={(e) => set('first', e.target.value)} /><small>{fl('me.form.firstHint')}</small></label>
      <fieldset><legend>{fl('me.form.number')}</legend><div className="wk-opts wkc-numbers"><button type="button" className="wk-opt min-h-tap" aria-pressed={draft.number === null} onClick={() => set('number', null)}>{fl('me.form.none')}</button>{Array.from({ length: 99 }, (_, i) => i + 1).map((n) => <button key={n} type="button" className="wk-opt min-h-tap" aria-pressed={draft.number === n} onClick={() => set('number', n)}>{n}</button>)}</div></fieldset>
      <div className="fl-form-actions"><button type="submit" className="wk-btn red min-h-tap">{fl('me.form.save')}</button>{saved ? <span role="status">{fl('me.form.saved')}</span> : null}</div>
    </form>
  )
}
