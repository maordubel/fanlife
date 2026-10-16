'use client'
import {useEffect, useMemo, useState} from 'react'
import {renderFinalWhistle} from '@/lib/share/v3/final-whistle'
import {canvasMeasure, loadShareAssets} from '@/lib/share/v3/client'
import {shareClubs} from '@/lib/share/v3/theme'
import type {ShareAssets} from '@/lib/share/v3/render'
import type {FinalResult} from '@/lib/fixtures/types'

const ev = {source: 'thesportsdb', providerEventId: 'SAMPLE', rawStatus: 'Match Finished', status: 'FT', observedAt: '2026-10-17T18:10:00.000Z', providerUpdatedAt: null} as const
const mk = (o: Partial<FinalResult>): FinalResult => ({clubId: 'x', kickoff: '2026-10-17T16:00:00.000Z', home: 'HOME CLUB', away: 'AWAY TEAM', homeScore: 2, awayScore: 1, clubSide: 'home', opponent: 'AWAY TEAM', competition: 'League', providerEventId: 'SAMPLE', dateOnly: false, finalStatus: 'FT', regulationScore: null, afterExtraTimeScore: null, penalties: null, competitionKind: 'league', evidence: {...ev}, ...o})
const CASES: Array<[string, Partial<FinalResult>]> = [
  ['Home win · league', {}], ['Away win · cup', {clubSide: 'away', homeScore: 0, awayScore: 2, competitionKind: 'cup', competition: 'Cup'}],
  ['Draw · league', {homeScore: 1, awayScore: 1}], ['Loss', {homeScore: 0, awayScore: 3}], ['10–0', {homeScore: 10, awayScore: 0}], ['0–0', {homeScore: 0, awayScore: 0}],
  ['After extra time', {finalStatus: 'AET', competitionKind: 'cup', competition: 'Cup'}], ['Penalties won', {finalStatus: 'PEN', homeScore: 1, awayScore: 1, penalties: {home: 4, away: 3}, competitionKind: 'cup', competition: 'Cup'}],
  ['Penalties lost', {finalStatus: 'PEN', homeScore: 2, awayScore: 2, penalties: {home: 2, away: 4}, competitionKind: 'cup', competition: 'Cup'}],
]
export function FinalWhistleGallery() {
  const clubs = useMemo(() => shareClubs(), [])
  const [club, setClub] = useState('hapoel-tel-aviv'), [assets, setAssets] = useState<ShareAssets | null>(null)
  useEffect(() => { const q = new URLSearchParams(location.search).get('club'); if (q) setClub(q); loadShareAssets().then(setAssets) }, [])
  const c = clubs.find(x => x.id === club) ?? clubs[0]!
  const cards = useMemo(() => !assets ? [] : CASES.map(([name, o]) => {
    const r = renderFinalWhistle({club: c.id, sample: true, result: mk({...o, clubId: c.id, home: o.clubSide === 'away' ? 'OTHER FC' : c.name.toUpperCase(), away: o.clubSide === 'away' ? c.name.toUpperCase() : 'AWAY TEAM'})}, {assets, measure: canvasMeasure})
    return {name, url: URL.createObjectURL(new Blob([r.svg], {type: 'image/svg+xml'})), warnings: r.warnings}
  }), [assets, c])
  return <main lang="en" dir="ltr" style={{padding: 16}} data-testid="final-whistle-gallery" data-ready={assets ? '1' : '0'}>
    <h1 className="mag-h2">Final Whistle · {c.name}</h1>
    <p><select aria-label="Club" value={club} onChange={e => setClub(e.target.value)} className="min-h-tap">{clubs.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></p>
    <ul style={{listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16}}>
      {cards.map(({name, url, warnings}) => <li key={name}><img src={url} alt={name} style={{width: '100%', border: '2px solid var(--mag-ink)'}}/><small>{name}{warnings.length ? ` · ⚠ ${warnings.join(' ')}` : ''}</small></li>)}
    </ul>
  </main>
}
