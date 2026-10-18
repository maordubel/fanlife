import {describe,it,expect} from 'vitest'
import {mergeHistorical} from '@/lib/clubs/history-wave'
import {loadClubBase} from '@/lib/clubs/resolver'
import {buildEntries} from '@/lib/clubs/entities'
import petah from '@/club-packs/hapoel-petah-tikva/wave-history-2026-10-18.json'

const source={id:'s',title:'Season record',url:'https://example.org/season',publisher:'Museum',access:'available',checkedAt:'2026-10-18'}
const fact=(id:string,on:string,name:string,extra={})=>({id,status:'approved',confidence:2,sources:['s'],researchedAt:'2026-10-18',approvedAt:'2026-10-18',approvedBy:'owner: test',notes:'',value:{on,name,...extra}})
describe('historical source reconciliation',()=>{
 it('preserves the existing identifier, approval and eleven when another source agrees',()=>{
  const old=fact('old','1967-09-19','Hapoel Petah Tikva 5-1 Maccabi Shaarayim',{lineup:['Documented starter'],scorers:[{name:'Documented scorer'}]})
  const incoming=fact('new','1967-09-19','Hapoel Petah Tikva 5-1 Maccabi Shaarayim',{season:'1966/68',lineup:[],scorers:[]})
  const pack={matches:[old],sources:[],archive:[]}
  const wave={matches:[incoming],sources:[source]}
  const merged=mergeHistorical(pack,wave)
  expect(merged.conflicts).toEqual([])
  expect(merged.pack.matches).toHaveLength(1)
  expect(merged.pack.matches[0]).toMatchObject({...old,value:{...old.value,season:'1966/68'}})
  expect(merged.pack.archive).toHaveLength(1)
  expect(mergeHistorical(merged.pack,wave).pack).toEqual(merged.pack)
 })
 it('withholds contradictory opponents/scores from both matches and chronology',()=>{
  const old=fact('old','2000-01-01','Zrinjski Mostar 1-0 Velez')
  for(const name of ['Zrinjski Mostar 2-0 Velez','Zrinjski Mostar 1-0 Sarajevo']){
   const r=mergeHistorical({matches:[old],archive:[],sources:[]},{matches:[fact('new','2000-01-01',name)],sources:[source]})
   expect(r.pack.matches).toEqual([old]);expect(r.pack.archive).toEqual([])
   expect(r.conflicts).toHaveLength(1)
  }
 })
 it('does not choose between two fixtures on the same day',()=>{
  const a=fact('a','2000-01-01','Zrinjski Mostar 1-0 Velez'),b=fact('b','2000-01-01','Zrinjski Mostar 1-0 Sarajevo')
  const r=mergeHistorical({matches:[],archive:[],sources:[]},{matches:[a,b],sources:[source]})
  expect(r.pack.matches).toEqual([]);expect(r.pack.archive).toEqual([]);expect(r.conflicts).toHaveLength(2)
 })
 it('keeps archive-only administrative context away from match-score input',()=>{
  expect(petah.matches.some(f=>f.id==='history-hpt-1727')).toBe(false)
  expect(petah.archive.find(f=>f.id==='history-hpt-1727-context')?.value.name).toContain('abandoned')
  expect(petah.matches.find(f=>f.id==='history-hpt-1388')?.value.season).toBe('1966/68')
  const neutral=petah.matches.find(f=>f.id==='history-hpt-2175')!.value
  expect(neutral).toMatchObject({neutral:true,clubGoals:2,opponentGoals:0})
  expect('home' in neutral).toBe(false)
 })
})

describe('recovered evidence reaches the actual club feature inputs',()=>{
 for(const id of ['hapoel-petah-tikva','zrinjski-mostar'])it(id,async()=>{
  const r=(await loadClubBase(id))!,d=r.data,entries=buildEntries(d)
  const matches=d.matches!.filter(f=>f.id.includes(':history-'))
  expect(matches.length).toBeGreaterThan(id==='hapoel-petah-tikva'?2800:750)
  expect(d.trivia.questions.some(q=>q.factIds.some(f=>f.includes(':history-')))).toBe(true)
  expect(d.memory.some(p=>p.pair.includes(':history-'))).toBe(true)
  expect(d.timeline.some(f=>f.id.includes(':history-'))).toBe(true)
  expect(entries.some(e=>e.id.includes(':history-'))).toBe(true)
  expect(d.matches!.some(f=>Array.isArray((f.value as {lineup?:string[]}).lineup)&&(f.value as {lineup:string[]}).lineup.length===11)).toBe(true)
  expect(d.sources.filter(s=>s.id.startsWith('history-')).every(s=>s.access==='available'&&s.checkedAt==='2026-10-18')).toBe(true)
  const excluded=new Set(r.diagnostics.filter(x=>x.code==='HISTORY_CONFLICT').map(x=>x.record))
  expect(d.matches!.every(f=>!excluded.has(f.id))).toBe(true)
  expect(d.timeline.every(f=>!excluded.has(f.id.replace(/-moment$/,'')))).toBe(true)
 },30000)
})
