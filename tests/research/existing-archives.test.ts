import {describe,it,expect} from 'vitest'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {loadBundle} from '@/lib/research/bundle'
import {dateFitsSeason} from '@/lib/club-research/rules'
import {packageAdapter} from '@/lib/master/adapters/package'
import stPauliWave from '@/club-packs/st-pauli/wave-existing-archive-2026-10-09.json'
import zrinjskiWave from '@/club-packs/zrinjski-mostar/wave-existing-archive-2026-10-09.json'

describe('Completion of existing archives',()=>{
 it('keeps the existing eight static clubs and offers both existing packages in the control room',()=>{
  expect([...CORE_CLUB_IDS].sort()).toEqual(['aek-athens','celtic','hapoel-petah-tikva','hapoel-tel-aviv','olympiacos','panathinaikos','st-pauli','zrinjski-mostar'])
  for(const club of ['st-pauli','zrinjski-mostar'])expect(packageAdapter.available?.(club)).toBe(true)
 })
 for(const [club,wave,total] of [['st-pauli',stPauliWave,1454],['zrinjski-mostar',zrinjskiWave,36]] as const){
  it(club+': candidates have real non-future dates, known sources and separate native identities',()=>{
   const bundle=loadBundle(club)!
   expect(bundle).not.toBeNull()
   expect(bundle.matches).toHaveLength(total)
   expect(new Set(bundle.matches.map(m=>m.providerMatchId)).size).toBe(total)
   const refs=new Set(bundle.sources.map(s=>s.id))
   for(const m of bundle.matches){
    expect(m.sport).toBe('football')
    expect(m.playedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(m.playedOn).toISOString().slice(0,10)).toBe(m.playedOn)
    expect(m.playedOn<='2026-10-09').toBe(true)
    expect(dateFitsSeason(m.season,m.playedOn)).toBe(true)
    expect(m.sourceIds.every((id:string)=>refs.has(id))).toBe(true)
    expect(m.status).toBe('review')
    expect(m.approvedBy).toBeNull()
   }
   expect(bundle.lineups).toEqual([])
   expect(bundle.goals).toEqual([])
   for(const p of bundle.players){
    expect(p.personId).toBeNull()
    expect(p.productionId).toBeNull()
    expect(p.identityState).toBe('unresolved')
    expect(p.sourceIds.length).toBeGreaterThan(0)
   }
   expect(wave.players).toEqual([])
  })
  it(club+': connects the existing-archive records, all approved by the owner on 2026-10-09 and feeding gameplay',async()=>{
   const result=(await loadClub(club))!
   const newEvents=result.data.archive.filter(f=>f.id.includes(':ea-'))
   expect(newEvents.length).toBeGreaterThanOrEqual(total)
   expect(newEvents.every(f=>f.status==='approved'&&f.approvedAt==='2026-10-09'&&/Maor Harel/.test(String(f.approvedBy)))).toBe(true)
   expect(result.data.timeline.every(f=>f.status==='approved')).toBe(true)
   expect(result.data.timeline.some(f=>f.id.includes(':ea-'))).toBe(true)
   expect(result.data.matches?.every(f=>f.status==='approved')).toBe(true)
   expect(result.diagnostics.filter(d=>d.record.includes('ea-')&&['SOURCE_INVALID','SOURCE_MISSING','FACT_INVALID','DATE_INVALID','ID_INVALID'].includes(d.code))).toEqual([])
   expect(result.data.archive.filter(f=>f.status==='approved').length).toBeGreaterThanOrEqual(newEvents.length)
   if(club==='st-pauli')expect(result.data.trophies).toHaveLength(6)
  })
 }
 it('holds conflicting fields out of matches and records missing seasons honestly',()=>{
  const z=loadBundle('zrinjski-mostar')!
  expect(z.conflicts).toHaveLength(6)
  expect(z.matches.every(m=>m.competition==='wwin-liga-bih')).toBe(true)
  const dir=join(process.cwd(),'research-staging','st-pauli')
  const gaps=JSON.parse(readFileSync(join(dir,'coverage-gaps.json'),'utf8'))
  expect(gaps.length).toBeGreaterThan(0)
  expect(gaps.every((g:any)=>g.completeArchiveClaim===false)).toBe(true)
  for(const club of ['st-pauli','zrinjski-mostar']){
   const root=join(process.cwd(),'research-staging',club)
   expect(existsSync(join(root,'manifest.json'))).toBe(true)
   expect(JSON.parse(readFileSync(join(root,'manifest.json'),'utf8')).completeArchiveClaim).toBe(false)
   for(const name of readdirSync(root).filter(n=>n.endsWith('.json')&&!['manifest.json','dry-run-report.json'].includes(n))){
    const rows=JSON.parse(readFileSync(join(root,name),'utf8'))
    expect(new Set(rows.map((r:any)=>r.id)).size).toBe(rows.length)
   }
  }
 })
})
