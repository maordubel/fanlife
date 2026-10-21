import Link from 'next/link'
import {deskHref} from '@/lib/master/attention'
import {clubMissions} from '@/lib/clubs/life/rush'
import {engineClubIds, loadClub} from '@/lib/clubs/resolver'
import type {Features} from '@/lib/features'
import type {Fit, FitState} from '@/lib/life/rush/fit'
import {MISSION_TEMPLATES} from '@/lib/life/rush/templates'

/**
 * Games → LIFE · Missions (ADR-fanlife-0013). Every RUSH mission × every club, read from the club's own archive by
 * the same Fitter LIFE uses. Nothing here switches a mission on: a mission plays wherever a script asks for it and
 * the club can hold it. What this screen gives the owner is the research — what is missing, why, and where to look.
 */
const GLYPH: Record<FitState, string> = {READY: '●', NEUTRAL: '○', HELD: '◐', IRRELEVANT: '–'}
const LABEL: Record<FitState, string> = {READY: 'Ready — stands on a dated night from the archive', NEUTRAL: 'Plays without a date or a name', HELD: 'Waiting for research', IRRELEVANT: 'Not part of this club’s story'}

export function MissionsCard({features}: {features: Features}) {
  const on = features.lifeRush
  return <section className="crm-exp" aria-labelledby="exp-rush-h">
    <span className="desk-stamp" data-ok={on || undefined}>{on ? 'Open to fans' : 'Owner preview'}</span>
    <div><h2 id="exp-rush-h">LIFE · Missions</h2><p>Choices in LIFE that become a mission — fitted to each club from its own archive.</p></div>
    <p className="desk-actions"><Link className="desk-btn" href={deskHref('games', {view: 'missions'})}>Missions →</Link></p>
  </section>
}

export async function MissionsDesk({features}: {features: Features}) {
  const ids = await engineClubIds()
  const rows = (await Promise.all(ids.map(async id => {
    const club = await loadClub(id).catch(() => null)
    return club ? {id, name: club.data.identity.name, fits: clubMissions(club.data)} : null
  }))).filter((r): r is {id: string; name: string; fits: Fit[]} => !!r).sort((a, b) => a.name.localeCompare(b.name))
  const research = rows.flatMap(r => r.fits.filter(f => f.state === 'HELD').flatMap(f => f.research.filter(t => t.grade === 'critical').map(t => ({club: r.name, ...t}))))
  const cell = (r: {fits: Fit[]}, id: string) => r.fits.find(f => f.template === id)
  return <div className="desk-content crm-games">
    <header className="desk-head"><p className="desk-kicker">Games · LIFE</p><h1 className="desk-h1">Missions, club by club</h1>
      <p className="desk-fine">Each square is one mission at one club, decided by that club’s own archive. {features.lifeRush ? 'Missions are open to fans.' : 'Missions are off for fans; your owner session already plays them.'} Switch them in Settings → Features.</p></header>
    <ul className="crm-legend" aria-label="Legend">{(Object.keys(GLYPH) as FitState[]).map(k => <li key={k}><span aria-hidden="true">{GLYPH[k]}</span>{LABEL[k]}</li>)}</ul>
    <div className="crm-matrix-wrap" role="region" aria-label="Mission matrix" tabIndex={0}>
      <table className="crm-matrix">
        <thead><tr><th scope="col">Club</th>{MISSION_TEMPLATES.map(t => <th key={t.id} scope="col"><span>{t.verb}</span><small>{t.neutralTitle}</small></th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><th scope="row"><bdi>{r.name}</bdi></th>{MISSION_TEMPLATES.map(t => {
          const f = cell(r, t.id)
          const title = f ? `${LABEL[f.state]}${f.anchor ? ` · ${f.anchor.title} (${f.anchor.on ?? f.anchor.year})` : ''}` : ''
          return <td key={t.id} data-mission={f?.state}><span title={title} aria-label={`${r.name}, ${t.neutralTitle}: ${title}`}>{f ? GLYPH[f.state] : ''}</span></td>
        })}</tr>)}</tbody>
      </table>
    </div>
    <section className="desk-sub" aria-labelledby="rush-research-h">
      <h2 id="rush-research-h">Research that would open a mission</h2>
      {research.length ? <ol className="crm-gate-list">{research.map((t, i) => <li key={i}><span><b><bdi>{t.club}</bdi> · {MISSION_TEMPLATES.find(m => m.id === t.template)?.neutralTitle}</b><small>Needs {t.want}. {t.why} Look in: {t.find}.</small></span></li>)}</ol>
        : <p className="desk-fine">Every club can play every mission it should. Nothing is waiting on research.</p>}
    </section>
    <p className="desk-actions"><Link className="desk-btn ghost" href={deskHref('games', {})}>All gates</Link></p>
  </div>
}
