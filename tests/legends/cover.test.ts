import {describe,expect,it} from 'vitest'
import {autopilot} from '@/lib/legends/lab'
import {COVER_FIELDS,bigWin,coverOk,coversFor,lateDecider,type CoverData} from '@/lib/legends/cover'
import {COVER_FORMATS,renderCover} from '@/lib/legends/cover-render'
import {REGISTRY} from '@/lib/master/registry'
import {auditColours,shareClub} from '@/lib/share/v3/theme'
import type {Fixture,MatchEventRow,SeasonRecord} from '@/lib/legends/types'
import {LEAGUE} from './fixtures'

const measure=(s:string,n:number)=>s.length*n*0.62            // a wide estimate: wider than the real faces
const assets={logo:'data:image/webp;base64,AAAA',fontCss:''}
const rec=(o:Partial<SeasonRecord>={}):SeasonRecord=>({ordinal:3,place:1,of:6,points:41,w:13,d:2,l:0,gf:44,ga:9,champion:true,playoff:false,grant:6,bonus:2,cash:12.5,squad:['secret-id'],topScorer:{id:'p1',name:'Žarko Đurđević-Łukasiewicz',goals:17},...o})
const ev=(seq:number,minute:number,side:0|1,player='a'):MatchEventRow=>({seq,minute,kind:'goal',side,player})
const fx=(id:string,round:number,home:string,away:string,goals:[number,number],events:MatchEventRow[]):Fixture=>({id,round,home,away,result:{goals,pens:null,events,seed:1}})

describe('U05 · cover data',()=>{
 it('holds only the public fields — nothing of the owner, the cash or the squad',()=>{
  const covers=coversFor({club:'olympiacos',clubName:'Olympiacos',record:rec(),archive:null})
  expect(covers.map(c=>c.kind)).toEqual(['champions','season'])
  for(const c of covers){expect(Object.keys(c).sort()).toEqual([...COVER_FIELDS].sort());expect(coverOk(c)).toBe(true)
   const text=JSON.stringify(c);for(const secret of ['12.5','secret-id','owner','cash','grant','token'])expect(text).not.toContain(secret)}
  expect(coverOk({...covers[0]!,owner:'x'})).toBe(false)
 })
 it('the title cover needs the title; a season without one still has a review',()=>{
  expect(coversFor({club:'x',clubName:'X',record:rec({champion:false,place:3}),archive:null}).map(c=>c.kind)).toEqual(['season'])
  const c=coversFor({club:'x',clubName:'X',record:rec({champion:true,playoff:true}),archive:null})[0]!;expect(c.stamp).toBe('WON THE PLAY-OFF')
 })
 it('the late-drama definition: the last goal of the match, by us, from the 80th minute, that wins by one or levels from behind',()=>{
  const win=fx('w',4,'me','them',[2,1],[ev(1,10,1),ev(2,30,0),ev(3,88,0,'hero')])
  const eq=fx('e',5,'them','me',[1,1],[ev(1,20,0),ev(2,85,1,'sub')])
  const early=fx('z',6,'me','them',[2,1],[ev(1,10,1),ev(2,30,0),ev(3,60,0)])
  const conceded=fx('c',7,'me','them',[2,2],[ev(1,10,1),ev(2,81,0),ev(3,89,1)])
  const bigLead=fx('b',8,'me','them',[3,0],[ev(1,10,0),ev(2,20,0),ev(3,89,0)])
  expect(lateDecider([early,conceded,bigLead],'me')).toBeNull()
  expect(lateDecider([win],'me')).toMatchObject({kind:'winner',minute:88,player:'hero',round:4})
  expect(lateDecider([eq],'me')).toMatchObject({kind:'equaliser',minute:85})
  expect(lateDecider([eq,win],'me')!.kind).toBe('winner')
  // a log that does not reproduce the score is refused rather than guessed at
  expect(lateDecider([fx('x',1,'me','them',[2,1],[ev(1,89,0)])],'me')).toBeNull()
 })
 it('the biggest win is the widest margin, then the most goals, then the earlier round',()=>{
  const a=fx('a',2,'me','them',[3,0],[]),b=fx('b',3,'them','me',[0,4],[]),c=fx('c',1,'me','them',[5,2],[])
  expect(bigWin([a,b,c],'me')).toMatchObject({gf:4,ga:0,round:3,against:'them'})
 })
 it('a real career offers covers whose numbers equal its own saved result',()=>{
  const r=autopilot(LEAGUE[0]!,LEAGUE.slice(1,4),2,'cvr',undefined,'c0ffee00000000bb');expect(r.error).toBeNull()
  const c=r.career!,a=c.pendingArchive![0]!,record=c.history[0]!
  const covers=coversFor({club:c.clubId,clubName:c.clubName,record,archive:a})
  const season=covers.find(x=>x.kind==='season')!;expect(season.big).toBe(`${record.place}${['st','nd','rd'][record.place-1]??'th'} of ${record.of}`)
  expect(covers.every(x=>x.season===record.ordinal&&coverOk(x))).toBe(true)
  const win=covers.find(x=>x.kind==='big-win');if(win){const m=win.big.match(/^(\d+)–(\d+)$/)!;expect(+m[1]!-+m[2]!).toBeGreaterThan(0)}
 })
})

describe('U05 · the drawing',()=>{
 const base:CoverData={v:1,kind:'champions',club:REGISTRY[0]!.id,clubName:REGISTRY[0]!.name,season:3,headline:'CHAMPIONS',big:'Season 3',label:'The title is ours.',lines:['41 points','13 won · 2 drawn · 0 lost','44 scored · 9 conceded'],star:{name:'Žarko Đurđević',detail:'17 goals'},stamp:'LEAGUE WINNERS'}
 it('draws both sizes for every club, with no colour the club’s policy forbids and no overflow',()=>{
  expect(REGISTRY.length).toBeGreaterThanOrEqual(8)
  for(const club of REGISTRY)for(const format of ['story','feed'] as const){
   const {svg,warnings}=renderCover({...base,club:club.id,clubName:club.name},{format,assets,measure})
   expect(warnings,`${club.id} ${format}`).toEqual([])
   expect(svg).toContain(`width="${COVER_FORMATS[format].w}" height="${COVER_FORMATS[format].h}"`)
   expect(auditColours(svg,shareClub(club.id)!)).toEqual([])
  }
 })
 it('survives the longest names, diacritics, a two-digit score and extra-time wording',()=>{
  const hard:CoverData={...base,kind:'late-winner',headline:'LATE EQUALISER',big:'12–11',label:'against Šibenik Građanski Športski Klub Dugopolje',lines:['Season 12, round 30','120′ after extra time'],star:{name:'Đorđe Žarković-Ćosić Łukasiewicz-Ñuñez',detail:'120′'},clubName:'Panathinaikos Athletic Club of Athens'}
  for(const format of ['story','feed'] as const){const {warnings,svg}=renderCover(hard,{format,assets,measure});expect(warnings.filter(w=>!/does not fit/.test(w))).toEqual([]);expect(svg).toContain('12–11')}
 })
 it('hides the alias by default; shows it only when switched on, and never prints an empty one',()=>{
  const off=renderCover(base,{format:'story',assets,measure,alias:'GoldenBoot'}).svg
  expect(off).not.toContain('GoldenBoot');expect(off).not.toContain('Manager:')
  expect(renderCover(base,{format:'story',assets,measure,alias:'GoldenBoot',showAlias:true}).svg).toContain('Manager: GoldenBoot')
  expect(renderCover(base,{format:'story',assets,measure,alias:'  ',showAlias:true}).svg).not.toContain('Manager:')
 })
 it('refuses a payload with a field a public cover may not carry, and escapes markup in names',()=>{
  expect(()=>renderCover({...base,owner:'abc'} as unknown as CoverData,{format:'story',assets,measure})).toThrow()
  expect(renderCover({...base,clubName:'A<B>&"C'},{format:'feed',assets,measure}).svg).not.toContain('A<B>')
 })
 it('keeps the story’s reserved bands free of reading text',()=>{
  const {svg}=renderCover(base,{format:'story',assets,measure})
  const texts=[...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*font-size="([\d.]+)"/g)].map(m=>({y:+m[1]!,size:+m[2]!}))
  // body copy (anything not in the masthead or footer slabs) sits between 260 and 1660
  const body=texts.filter(t=>t.y>260&&t.y<1660);expect(body.length).toBeGreaterThan(4)
 })
})
