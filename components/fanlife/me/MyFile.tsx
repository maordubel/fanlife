'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { xiNames } from '@/app/me/file/actions'
import type { MeClub } from '@/app/me/data'
import { xiKey } from '@/lib/clubs/activity'
import { closetMine } from '@/lib/collector/api'
import type { Closet } from '@/lib/collector/types'
import { wearLivery } from '@/lib/club-livery'
import { fl } from '@/lib/fanlife/copy'
import { FORMATIONS } from '@/lib/game/formations'

import { beenList, readBeen, type BeenRow } from '@/lib/fanlife/been'

import { lifeOf } from './MeArea'

/**
 * "My file" — The Worker's /tik/file for a hub: every XI this device saved, every LIFE it started,
 * the shirts in the closet and the wanted list. Read after mount; names come from the club packs.
 */
type SavedXI = { club: MeClub; formation: string; rows: { slot: string; role: string; id: string }[]; captain: string | null; names: Record<string, string> }
type Life = { club: MeClub; chapters: number; at: string | null }
type Labels = Record<string, { label: string; club: string }>

const fmt = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

function readXI(club: MeClub): Omit<SavedXI, 'names'> | null {
  try {
    const raw = localStorage.getItem(xiKey(club.id))
    if (!raw || raw.length > 20000) return null
    const p = JSON.parse(raw) as { formation?: unknown; picks?: Record<string, unknown>; captain?: unknown }
    const formation = typeof p.formation === 'string' && Object.hasOwn(FORMATIONS, p.formation) ? p.formation : null
    if (!formation || !p.picks || typeof p.picks !== 'object') return null
    const rows = FORMATIONS[formation]!.slots.flatMap((s) => { const id = p.picks![s.slotId]; return typeof id === 'string' ? [{ slot: s.slotId, role: s.role, id }] : [] })
    return rows.length ? { club, formation, rows, captain: typeof p.captain === 'string' ? p.captain : null } : null
  } catch { return null }
}

export function MyFile({ clubs, labels }: { clubs: MeClub[]; labels: Labels }) {
  const [xis, setXis] = useState<SavedXI[] | null>(null)
  const [lives, setLives] = useState<Life[]>([])
  const [closet, setCloset] = useState<Closet | null>(null)
  const [been, setBeen] = useState<(BeenRow & { key: string })[]>([])
  useEffect(() => {
    let live = true
    setBeen(beenList(readBeen()))
    const found = clubs.map(readXI).filter((x): x is Omit<SavedXI, 'names'> => !!x)
    void Promise.all(found.map(async (x) => ({ ...x, names: await xiNames(x.club.id, x.rows.map((r) => r.id)).catch(() => ({})) })))
      .then((rows) => { if (live) setXis(rows) })
    setLives(clubs.map((club) => ({ club, ...lifeOf(club.id) })).filter((l) => l.chapters > 0))
    void closetMine().then((r) => { if (live && r.ok) setCloset(r) })
    return () => { live = false }
  }, [clubs])

  const held = closet?.items.filter((i) => i.state === 'held' || i.state === 'reserved') ?? []
  const name = (slug: string) => labels[slug]?.label ?? slug

  return (
    <div className="fl-me">
      <section className="fl-me-section" aria-labelledby="file-xi">
        <h2 id="file-xi">{fl('file.xi.title')}</h2>
        {xis === null ? null : xis.length === 0 ? <p className="fl-me-note">{fl('file.xi.none')}</p> : (
          <ul className="fl-file-xis">
            {xis.map((x) => (
              <li key={x.club.id} style={wearLivery(x.club)}>
                <header><span className="mag-badge" data-livery={x.club.pattern} aria-hidden="true">{x.club.initials}</span><b>{x.club.name}</b><small>{x.formation}</small></header>
                <ol>{x.rows.map((r) => <li key={r.slot}><span>{r.role}</span>{x.names[r.id] ?? '—'}{x.captain === r.id ? <em> (C)</em> : null}</li>)}</ol>
                <Link className="mag-chip min-h-tap" href={`/clubs/${x.club.id}/xi`}>{fl('me.clubs.open')} →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fl-me-section" id="been" aria-labelledby="file-been">
        <h2 id="file-been">{fl('file.been.title')}</h2>
        {been.length === 0 ? <p className="fl-me-note">{fl('file.been.none')}</p> : (
          <ul className="fl-me-clubs fl-been-list">
            {been.map((b) => { const club = clubs.find((c) => c.id === b.club); return club ? (
              <li key={b.key} style={wearLivery(club)}>
                <span className="mag-badge" data-livery={club.pattern} aria-hidden="true">{club.initials}</span>
                <div><b dir="auto">{b.label}</b><small>{club.name} · {b.on ? (b.on.length === 4 ? b.on : fmt(b.on)) : fl('file.been.undated')}</small></div>
                <span className="fl-been-star" aria-hidden="true">★</span>
              </li>) : null })}
          </ul>
        )}
      </section>

      <section className="fl-me-section" aria-labelledby="file-life">
        <h2 id="file-life">{fl('file.life.title')}</h2>
        {lives.length === 0 ? <p className="fl-me-note">{fl('file.life.none')}</p> : (
          <ul className="fl-me-clubs">
            {lives.map((l) => (
              <li key={l.club.id} style={wearLivery(l.club)}>
                <span className="mag-badge" data-livery={l.club.pattern} aria-hidden="true">{l.club.initials}</span>
                <div><b>{l.club.name}</b><small>{fl('file.life.at', { n: l.chapters, of: l.club.lifeChapters || l.chapters, when: l.at ? fmt(l.at) : '—' })}</small></div>
                <Link className="mag-chip min-h-tap" href={`/clubs/${l.club.id}/life`}>{fl('me.clubs.open')} →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fl-me-section" aria-labelledby="file-shirts">
        <h2 id="file-shirts">{fl('file.shirts.title')}</h2>
        {held.length === 0 ? <p className="fl-me-note">{fl('file.shirts.none')}</p> : <ul className="fl-file-list">{held.map((i) => <li key={i.id}>{name(i.archiveSlug)}{i.size ? <small> · {i.size}</small> : null}</li>)}</ul>}
        <h2>{fl('file.wants.title')}</h2>
        {!closet || closet.wants.length === 0 ? <p className="fl-me-note">{fl('file.wants.none')}</p> : <ul className="fl-file-list">{closet.wants.map((w) => <li key={w.id}>{name(w.archiveSlug)}</li>)}</ul>}
        <Link className="mag-cta red" href="/closet">{fl('me.closet.open')} →</Link>
      </section>
    </div>
  )
}
