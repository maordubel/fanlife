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
import { Badge } from '@/components/clubs/Badge'

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

  const dayOf = (on: string | null) => {
    if (!on) return null
    if (on.length === 4) return { d: null, m: null, y: on }
    const at = new Date(on)
    return Number.isNaN(at.getTime()) ? null : { d: String(at.getUTCDate()), m: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(at), y: String(at.getUTCFullYear()) }
  }

  return (
    <>
      <div className="wkc-l wkc-file-l">
        <section className="wkc-sec" aria-labelledby="file-xi">
          <div className="wkc-h2"><h2 id="file-xi" className="wkc-h2-t cyan">{fl('file.xi.title')}</h2>{xis?.length ? <span className="wk-k wk-muted">{fl('file.xi.count', { n: xis.length })}</span> : null}</div>
          {xis === null ? null : xis.length === 0 ? <p className="wk-cap white">{fl('file.xi.none')}</p> : (
            <ul className="wkc-xis">
              {xis.map((x) => (
                <li key={x.club.id} className="wk-panel shadow wkc-xi" style={wearLivery(x.club)}>
                  <span className="wkc-clip" aria-hidden="true" />
                  <header className="wkc-xi-head"><Badge club={x.club} /><span><b className="wk-head">{x.club.name}</b><small className="wk-k wk-muted">{fl('file.xi.saved')}</small></span><span className="wk-tag ink">{x.formation}</span></header>
                  <div className="wk-pitch wkc-xi-pitch">
                    <span className="wkc-xi-lines" aria-hidden="true" />
                    <ol>{x.rows.map((r) => {
                      const slot = FORMATIONS[x.formation]!.slots.find((sl) => sl.slotId === r.slot)
                      return (
                        <li key={r.slot} style={{ insetInlineStart: `${slot?.x ?? 50}%`, insetBlockStart: `${slot?.y ?? 50}%` }} data-gk={r.role === 'GK' || undefined}>
                          <span className="wkc-xi-shirt" aria-hidden="true" />
                          <span className="wkc-xi-name"><span className="sr-only">{r.role} </span>{x.names[r.id] ?? '—'}{x.captain === r.id ? <em className="wkc-xi-c"> (C)</em> : null}</span>
                        </li>
                      )
                    })}</ol>
                  </div>
                  <Link className="wk-seeall" href={`/clubs/${x.club.id}/xi`}>{fl('file.xi.open')} <span aria-hidden="true">→</span></Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wkc-sec" id="been" aria-labelledby="file-been">
          <div className="wkc-h2"><h2 id="file-been" className="wkc-h2-t red">{fl('file.been.title')}</h2>{been.length ? <span className="wk-k wk-muted">{fl('file.been.count', { n: been.length })}</span> : null}</div>
          {been.length === 0 ? <p className="wk-cap white">{fl('file.been.none')}</p> : (
            <ul className="wkc-tickets">
              {been.map((b) => { const club = clubs.find((c) => c.id === b.club); const day = dayOf(b.on); return club ? (
                <li key={b.key} className="wk-ticket wkc-been" style={wearLivery(club)}>
                  <div className="wkc-been-t">
                    <span className="wkc-been-k"><Badge club={club} /><span className="wk-k red">★ {fl('file.been.stamp')} · {club.name}</span></span>
                    <b dir="auto">{b.label}</b>
                  </div>
                  <span className="wk-ticket-stub wkc-been-stub">{day ? <>{day.d ? <b className="wk-num">{day.d}</b> : null}{day.m ? <small className="wk-k">{day.m}</small> : null}<b className="wk-num wkc-been-y">{day.y}</b></> : <small className="wk-k">{fl('file.been.undated')}</small>}</span>
                </li>) : null })}
            </ul>
          )}
        </section>
      </div>

      <div className="wkc-r wkc-file-r">
        <section className="wkc-sec" aria-labelledby="file-life">
          <div className="wkc-h2"><h2 id="file-life" className="wkc-h2-t navy">{fl('file.life.title')}</h2></div>
          {lives.length === 0 ? <p className="wk-cap white">{fl('file.life.none')}</p> : (
            <ul className="wkc-rows">
              {lives.map((l) => (
                <li key={l.club.id} style={wearLivery(l.club)}>
                  <Badge club={l.club} />
                  <div><b className="wk-head">{l.club.name}</b><small>{fl('file.life.at', { n: l.chapters, of: l.club.lifeChapters || l.chapters, when: l.at ? fmt(l.at) : '—' })}</small></div>
                  <Link className="wk-btn paper wkc-row-go" href={`/clubs/${l.club.id}/life`}>{fl('me.clubs.open')} →</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wkc-sec" aria-labelledby="file-shirts">
          <div className="wkc-h2"><h2 id="file-shirts" className="wkc-h2-t orange">{fl('file.shirts.title')}</h2>{held.length ? <span className="wk-k wk-muted">{fl('shirts.count', { n: held.length })}</span> : null}</div>
          {held.length === 0 ? <p className="wk-cap white">{fl('file.shirts.none')}</p> : (
            <ul className="wkc-swing">{held.map((i) => <li key={i.id}><svg viewBox="0 0 60 34" aria-hidden="true"><path d="M30 12 a6 6 0 1 1 6 -6 M30 12 V15 L4 30 H56 L30 15" /></svg><b>{name(i.archiveSlug)}</b>{i.size ? <small className="wk-k wk-muted">{i.size}</small> : null}</li>)}</ul>
          )}
        </section>

        <section className="wkc-sec" aria-labelledby="file-wants">
          <div className="wkc-h2"><h2 id="file-wants" className="wkc-h2-t navy">{fl('file.wants.title')}</h2>{closet?.wants.length ? <span className="wk-k wk-muted">{fl('shirts.count', { n: closet.wants.length })}</span> : null}</div>
          {!closet || closet.wants.length === 0 ? <p className="wk-cap white">{fl('file.wants.none')}</p> : (
            <ul className="wkc-posters">{closet.wants.map((w) => <li key={w.id}><span className="wk-shout sm wkc-poster-shout" aria-hidden="true">{fl('file.wants.shout')}</span><b className="wk-head">{name(w.archiveSlug)}</b><small className="wk-k red">♡ {fl('file.wants.looking')}</small></li>)}</ul>
          )}
          <Link className="wk-btn red block" href="/closet">{fl('me.closet.open')} →</Link>
        </section>
      </div>
    </>
  )
}
