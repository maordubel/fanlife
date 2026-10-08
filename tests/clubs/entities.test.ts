import {describe,expect,it} from 'vitest'
import {buildEntries,decodeArchive,encodeArchive,fold,mentionedIn,precisionOf,seasonsIn,tokensOf,validDay} from '@/lib/clubs/entities'
import type {ClubData,Fact,HistoricalEvent,ClubPlayer,Source} from '@/lib/clubs/contract'

const base={researchedAt:'2026-10-01',approvedAt:'2026-10-01',approvedBy:'owner',notes:'Approved. Scope: date and title.',status:'approved' as const,confidence:3 as const}
const src:Source[]=[{id:'s1',title:'Club history',url:'https://example.test/a',publisher:'Club',access:'available',checkedAt:'2026-10-01'},{id:'s2',title:'League site',url:null,publisher:'League',access:'available',checkedAt:'2026-10-01'}]
const ev=(id:string,title:string,on:string|null,year:number|null,hint='',extra:Partial<Fact<HistoricalEvent>>={}):Fact<HistoricalEvent>=>({...base,id,sources:['s1','s2'],value:{id,name:title,on,precision:on?'day':year?'year':'unknown',year,hint,sport:'football',sensitive:false},...extra})
const pl=(id:string,name:string,aliases:string[]=[],pos:ClubPlayer['positions']=['FW'],from:number|null=1990,to:number|null=1999):Fact<ClubPlayer>=>({...base,id,sources:['s1'],value:{id,name,positions:pos,fromYear:from,toYear:to,aliases}})
const pack=(archive:Fact<HistoricalEvent>[],players:Fact<ClubPlayer>[]=[],rivals:string[]=[],seasons:string[]=[]):Pick<ClubData,'archive'|'timeline'|'sources'>&Pick<ClubData,'players'|'rivals'|'seasons'>=>({
 archive,timeline:[],sources:src,players,
 rivals:rivals.map((n,i)=>({...base,id:`r${i}`,sources:['s1'],value:{id:`r${i}`,name:n}})),
 seasons:seasons.map((n,i)=>({...base,id:`se${i}`,sources:['s1'],value:{id:`se${i}`,name:n}})),
})

describe('gate 12 entity read model',()=>{
 it('keeps precision honest: a year-only or undated moment never gets a day',()=>{
  const es=buildEntries(pack([ev('a','Cup final','2001-05-13',2001),ev('b','Title won',null,2022),ev('c','Founded',null,null)]))
  expect(es.map(e=>[e.id,precisionOf(e),e.on]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))).toEqual([['a','day','2001-05-13'],['b','year',null],['c','unknown',null]])
 })
 it('rejects an impossible date shape instead of passing it on',()=>{
  expect(validDay('2001-02-29')).toBe(false);expect(validDay('2000-02-29')).toBe(true);expect(validDay('2001-13-01')).toBe(false);expect(validDay('2001-5-1')).toBe(false)
  const [e]=buildEntries(pack([ev('x','Bad date','2001-02-30',2001)]))
  expect(e!.on).toBeNull()
 })
 it('projects players as their own kind, without the approval note as a hint',()=>{
  const es=buildEntries(pack([],[pl('p1','Ivan Horvat',['I. Horvat'],['GK'],1990,1995)]))
  expect(es).toHaveLength(1);expect(es[0]).toMatchObject({kind:'player',on:null,year:null,hint:'',player:{positions:['GK'],from:1990,to:1995,aliases:['I. Horvat']}})
 })
 it('does not show the carried-forward legacy boilerplate as a note',()=>{
  const es=buildEntries(pack([ev('a','Match','2001-05-13',2001,'',{approvedBy:'legacy-curation',notes:'Existing curated eligibility carried forward.'})]))
  expect(es[0]).toMatchObject({legacy:true,note:null})
 })
 it('links a moment to the player it names — by full name or a multi-word alias — and only that',()=>{
  const es=buildEntries(pack([ev('m1','Goran Karačić scores twice','2010-03-03',2010),ev('m2','Derby win','2011-04-04',2011,'Decided by Marko Perić'),ev('m3','A quiet day','2012-01-01',2012,'Karačić was not there')],
   [pl('p1','Goran Karačić'),pl('p2','Marko Perić',['M. Perić','Marko Peric Senior'])]))
  const by=new Map(es.map(e=>[e.id,e]))
  expect(by.get('m1')!.names).toEqual(['p1'])   // diacritics folded, whole name
  expect(by.get('m2')!.names).toEqual(['p2'])   // named in the hint
  expect(by.get('m3')!.names).toEqual([])        // a surname alone is never a link
  expect(mentionedIn(es,'p1').map(e=>e.id)).toEqual(['m1'])
 })
 it('never links through a name two players share, nor inside a longer name',()=>{
  const es=buildEntries(pack([ev('m1','Ivan Perić scores','2010-03-03',2010),ev('m2','Ivan Perićević scores','2010-03-04',2010)],[pl('p1','Ivan Perić'),pl('p2','Ivan Perić')]))
  expect(es.find(e=>e.id==='m1')!.names).toEqual([])
  const one=buildEntries(pack([ev('m1','Ivan Perićević scores','2010-03-04',2010)],[pl('p1','Ivan Perić')]))
  expect(one[0]!.names).toEqual([])
 })
 it('records the rival and season a moment names literally',()=>{
  const es=buildEntries(pack([ev('m1','Hapoel Tel Aviv 3–0 Hapoel Petah Tikva','2026-09-18',2026,'League 2025/26'),ev('m2','A friendly','2026-01-01',2026,'Season 2025/266')],[],['Hapoel Tel Aviv'],['2025/26','2024/25']))
  expect(es.find(e=>e.id==='m1')!.refs).toEqual([{kind:'rival',id:'r0',name:'Hapoel Tel Aviv'},{kind:'season',id:'se0',name:'2025/26'}])
  expect(es.find(e=>e.id==='m2')!.refs).toEqual([])  // 2025/266 is not the 2025/26 season
 })
 it('season labels are found as written, not inside longer digit runs',()=>{
  expect(seasonsIn('x 2007/08 y',[{id:'a',name:'2007/08'}])).toHaveLength(1)
  expect(seasonsIn('x 12007/08',[{id:'a',name:'2007/08'}])).toHaveLength(0)
  expect(seasonsIn('x 2007/08/09',[{id:'a',name:'2007/08'}])).toHaveLength(0)
  expect(seasonsIn('x 2007/08',[{id:'a',name:'Premier League'}])).toHaveLength(0)
 })
 it('a single-word rival is matched only when it is a long, whole word',()=>{
  const es=buildEntries(pack([ev('m1','Match v Panathinaikos','2010-03-03',2010),ev('m2','Match v Panathinaikosian','2010-03-04',2010)],[],['Panathinaikos']))
  expect(es.find(e=>e.id==='m1')!.refs.map(r=>r.id)).toEqual(['r0']);expect(es.find(e=>e.id==='m2')!.refs).toEqual([])
 })
 it('folds case and diacritics only — never a fuzzy match',()=>{
  expect(fold('KARAČIĆ')).toBe('karacic');expect(tokensOf('Goran Karačić-Perić')).toEqual(['goran','karacic','peric'])
 })
 it('wire form round-trips and ships every source it needs, once',()=>{
  const es=buildEntries(pack([ev('m1','Goran Karačić scores','2010-03-03',2010,'hint'),ev('m2','Title',null,2022,'',{approvedBy:'legacy-curation'})],[pl('p1','Goran Karačić')],['Rival FC'],[]))
  const wire=encodeArchive(es,src)
  expect(decodeArchive(JSON.parse(JSON.stringify(wire)))).toEqual(es)
  expect(Object.keys(wire.sources).sort()).toEqual(['s1','s2'])
  expect(wire.srcSets.length).toBeLessThanOrEqual(2)
  expect(JSON.stringify(wire)).not.toContain('undefined')
 })
})
