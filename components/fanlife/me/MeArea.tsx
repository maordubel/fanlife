'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { activityKey, readActivity, xiKey } from '@/lib/clubs/activity'
import { closetMine } from '@/lib/collector/api'
import type { Closet } from '@/lib/collector/types'
import { wearLivery } from '@/lib/club-livery'
import { fl } from '@/lib/fanlife/copy'
import { beenList, readBeen, type BeenRow } from '@/lib/fanlife/been'
import { BEGAN, barsOf, NAME_MAX, rankOf, readCard, writeCard, type MeCard } from '@/lib/fanlife/me'
import { saveKey } from '@/lib/life/universal/engine'

import type { MeClub } from '@/app/me/data'

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
  useEffect(() => {
    setCard(readCard())
    const days = beenList(readBeen())
    setBeen(days)
    setRows(played(clubs, days))
    void closetMine().then((r) => { if (r.ok) setCloset(r) })
  }, [clubs])

  const club = clubs.find((c) => c.id === card?.club) ?? null
  const total = rows.reduce((n, r) => n + r.rounds, 0)
  const rank = rankOf(total)
  const active = rows.filter((r) => r.rounds || r.xi || r.life || r.been)

  return (
    <div className="fl-me">
      <div className="fl-me-tabs" role="tablist" aria-label={fl('me.title')}>
        {(['card', 'oath', 'story', 'details'] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="min-h-tap" onClick={() => setTab(id)}>{fl(`me.tab.${id}`)}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'card' ? <Card card={card} club={club} rank={rank} /> : null}
        {tab === 'oath' ? <Oath card={card} club={club} /> : null}
        {tab === 'story' ? <Story card={card} club={club} rows={rows} closet={closet} been={been} /> : null}
        {tab === 'details' ? <Details card={card} clubs={clubs} onSave={(next) => { setCard(writeCard(next)); setTab('card') }} /> : null}
      </div>

      <section className="fl-me-section" aria-labelledby="me-clubs">
        <div className="mag-head"><div><p className="mag-kicker">{fl('me.clubs.kicker')}</p><h2 className="mag-h2" id="me-clubs">{fl('me.clubs.title')}</h2><p className="mag-fine">{fl('me.clubs.note')}</p></div></div>
        <p className="fl-me-rank"><b>{fl(`me.rank.${rank}`)}</b> <span>{fl('me.rank.note', { n: total })}</span></p>
        <ul className="fl-me-clubs">
          {(active.length ? active : rows.filter((r) => r.club.core)).map((r) => (
            <li key={r.club.id} style={wearLivery(r.club)}>
              <span className="mag-badge" data-livery={r.club.pattern} aria-hidden="true">{r.club.initials}</span>
              <div>
                <b>{r.club.name}</b>
                {r.rounds || r.xi || r.life || r.been ? (
                  <small>{[fl('me.clubs.rounds', { n: r.rounds }), r.best ? fl('me.clubs.best', { n: r.best }) : null, r.xi ? fl('me.clubs.xi') : null, r.life ? fl('me.clubs.life', { n: r.life, of: r.club.lifeChapters || r.life }) : null, r.been ? fl('me.clubs.been', { n: r.been }) : null].filter(Boolean).join(' · ')}</small>
                ) : <small>{fl('me.clubs.none')}</small>}
              </div>
              <Link className="mag-chip min-h-tap" href={`/clubs/${r.club.id}`}>{fl('me.clubs.open')} →</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="fl-me-section fl-me-closet" aria-labelledby="me-closet">
        <h2 id="me-closet">{fl('me.closet.title')}</h2>
        <p>{closet && (closet.items.length || closet.wants.length) ? fl('me.closet.body', { have: closet.items.filter((i) => i.state === 'held' || i.state === 'reserved').length, want: closet.wants.length }) : fl('me.closet.empty')}</p>
        <Link className="mag-cta red" href="/closet">{fl('me.closet.open')} →</Link>
      </section>
    </div>
  )
}

function Card({ card, club, rank }: { card: MeCard | null; club: MeClub | null; rank: number }) {
  const bars = useMemo(() => barsOf(card?.memberNo ?? 'FL-0000'), [card?.memberNo])
  const blank = !card?.name && !club
  return (
    <article className="fl-card" style={wearLivery(club) ?? { ['--club-primary' as string]: 'var(--mag-vermilion)' }} aria-label={fl('me.card.kicker')}>
      <header className="fl-card-head"><span>{fl('me.card.kicker')}</span><span>{fl('me.card.member')} <b>{card?.memberNo ?? '—'}</b></span></header>
      <div className="fl-card-body">
        <div className="fl-card-who">
          {club ? <span className="mag-band fl-card-badge" data-livery={club.pattern} aria-hidden="true"><b>{club.initials}</b></span> : null}
          <h2>{card?.name || fl('me.card.anon')}</h2>
          <p className="fl-card-club">{club ? club.name : fl('me.card.noClub')}</p>
          <p className="fl-card-rank">{fl(`me.rank.${rank}` as 'me.rank.0')}</p>
        </div>
        {card?.number ? <span className="fl-card-number" aria-label={`${fl('me.card.number')} ${card.number}`}>{card.number}</span> : null}
      </div>
      <dl className="fl-card-boxes">
        <div><dt>{fl('me.card.since')}</dt><dd>{card?.since ?? '—'}</dd></div>
        <div><dt>{fl('me.card.began')}</dt><dd>{card?.began ? fl(`me.began.${card.began}`) : '—'}</dd></div>
        <div><dt>{fl('me.card.first')}</dt><dd>{card?.first || '—'}</dd></div>
        <div><dt>{fl('me.card.joined')}</dt><dd>{card ? fmt(card.joined) : '—'}</dd></div>
      </dl>
      <footer className="fl-card-foot">
        <span className="fl-card-bars" aria-hidden="true">{bars.map((w, i) => <i key={i} style={{ width: w * 2 }} data-on={i % 2 === 0 || undefined} />)}</span>
        <span className="fl-card-sign">{fl('me.card.sign')} <b>{card?.name || ''}</b></span>
      </footer>
      {blank ? <p className="fl-card-empty">{fl('me.card.empty')}</p> : null}
    </article>
  )
}

function Oath({ card, club }: { card: MeCard | null; club: MeClub | null }) {
  if (!card || !club) return <p className="fl-me-note">{fl('me.oath.empty')}</p>
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
    <section className="fl-oath" style={wearLivery(club)}>
      <p className="fl-me-note">{fl('me.oath.intro')}</p>
      <ol>{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
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
  if (beats.length < 2 && !first && !been.length) return <p className="fl-me-note">{fl('me.story.empty')}</p>
  return (
    <section className="fl-story">
      <p className="fl-me-note">{fl('me.story.intro')}</p>
      <ol>{beats.map((b, i) => <li key={i}><time>{b.at}</time><span>{b.text}</span></li>)}</ol>
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
    <form className="fl-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); setSaved(true) }}>
      <label>{fl('me.form.name')}<input value={draft.name} maxLength={NAME_MAX} onChange={(e) => set('name', e.target.value)} autoComplete="nickname" /><small>{fl('me.form.nameHint')}</small></label>
      <label>{fl('me.form.club')}<select value={draft.club ?? ''} onChange={(e) => set('club', e.target.value || null)}><option value="">{fl('me.form.pick')}</option>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>{fl('me.form.year')}<select value={draft.since ?? ''} onChange={(e) => set('since', e.target.value ? Number(e.target.value) : null)}><option value="">—</option>{Array.from({ length: year - 1929 }, (_, i) => year - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
      <fieldset><legend>{fl('me.form.began')}</legend><div className="fl-chips">{BEGAN.map((b) => <button key={b} type="button" className="min-h-tap" aria-pressed={draft.began === b} onClick={() => set('began', draft.began === b ? null : b)}>{fl(`me.began.${b}`)}</button>)}</div></fieldset>
      <label>{fl('me.form.first')}<input value={draft.first} maxLength={60} onChange={(e) => set('first', e.target.value)} /><small>{fl('me.form.firstHint')}</small></label>
      <fieldset><legend>{fl('me.form.number')}</legend><div className="fl-numbers"><button type="button" className="min-h-tap" aria-pressed={draft.number === null} onClick={() => set('number', null)}>{fl('me.form.none')}</button>{Array.from({ length: 99 }, (_, i) => i + 1).map((n) => <button key={n} type="button" className="min-h-tap" aria-pressed={draft.number === n} onClick={() => set('number', n)}>{n}</button>)}</div></fieldset>
      <div className="fl-form-actions"><button type="submit" className="mag-cta red min-h-tap">{fl('me.form.save')}</button>{saved ? <span role="status">{fl('me.form.saved')}</span> : null}</div>
    </form>
  )
}
