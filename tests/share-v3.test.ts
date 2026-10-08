import {describe,expect,it} from 'vitest'
import {SHARE_TEMPLATES} from '@/lib/share/v3/templates'
import {renderShare,shareCaption,SHARE_FORMATS,type ShareAssets,type ShareFormat} from '@/lib/share/v3/render'
import {sharePalette,shareClubs,shareClub,auditColours,SHARE_PAPER} from '@/lib/share/v3/theme'
import {contrast} from '@/lib/clubs/theme'
import {archiveShare,blindCowShare,coverShare,kitShare,lineupShare,memoryShare,onThisDayShare,terraceShare,timelineShare,triviaShare,validateDraft,xiShare,dailyShare,goalShare,rumbleShare} from '@/lib/share/v3/adapters'
import {REGISTRY} from '@/lib/master/registry'
import {existsSync} from 'node:fs'

/** Share Studio V3 (owner, 8.10.2026): every card × format × club, honest data, the club's own colours. */
const assets:ShareAssets={logo:'data:,',shirt:'data:,',fontCss:'',art:Object.fromEntries(['archive-objects','away-supporters','father-child','footballer','scarf-fan','shirt-exchange','terrace-crowd','vintage-shirt'].map(a=>[a,'data:,'])) as ShareAssets['art']}
const measure=(s:string,n:number)=>s.length*n*.56
const FORMATS=Object.keys(SHARE_FORMATS) as ShareFormat[]

describe('V3 kit',()=>{
 it('ships 24 compositions and every asset they draw',()=>{
  expect(SHARE_TEMPLATES).toHaveLength(24)
  for(const t of SHARE_TEMPLATES)expect(existsSync(`public/share/v3/art/${t.art}.webp`)).toBe(true)
  for(const f of ['FLBowlby','FLKarantina','FLArchivo','FLCourier','FLSerif'])expect(existsSync(`public/share/v3/fonts/${f}.woff2`)).toBe(true)
 })
 it('has a palette for every registry club; readable type is 4.5:1 on the paper',()=>{
  expect(shareClubs().map(c=>c.id)).toEqual(REGISTRY.map(c=>c.id))
  for(const c of shareClubs())for(const mode of ['club','mono'] as const){const P=sharePalette(c,mode);expect(contrast(P.red,SHARE_PAPER)).toBeGreaterThanOrEqual(4.5);expect(contrast(P.navy,SHARE_PAPER)).toBeGreaterThanOrEqual(4.5);expect(contrast(P.onPrimary,P.primary)).toBeGreaterThanOrEqual(3)}
 })
 it('keeps AEK and Dortmund yellow, takes red from Panathinaikos and green from Olympiacos',()=>{
  expect(sharePalette(shareClub('aek-athens')!).primary).toBe('#F3C613')
  expect(sharePalette(shareClub('borussia-dortmund')!).primary).toBe('#FCDD09')
  for(const t of SHARE_TEMPLATES)for(const f of FORMATS){
   for(const id of ['panathinaikos','olympiacos']){const r=renderShare(t,{...t,club:id,link:`https://${shareClub(id)!.sub}.fanlife.dubelteam.com/`},f,{assets,measure});expect(auditColours(r.svg,shareClub(id)!)).toEqual([])}
  }
 })
 it('renders every template × format × club with no forbidden colour',()=>{
  for(const c of shareClubs())for(const t of SHARE_TEMPLATES)for(const f of FORMATS){
   const r=renderShare(t,{...t,club:c.id,link:`https://${c.sub}.fanlife.dubelteam.com/`},f,{assets,measure})
   expect(r.warnings.filter(w=>w.startsWith('Forbidden')),`${c.id} ${t.id} ${f}`).toEqual([])
   expect(r.svg).toContain(`data-club="${c.id}"`)
  }
 })
 it('prints the person’s words instead of the stock line, and a nickname only when chosen',()=>{
  const t=SHARE_TEMPLATES[2]!,base={...t,club:'aek-athens',link:'https://aekathens.fanlife.dubelteam.com/'}
  expect(renderShare(t,{...base,statement:'Nine from twelve, on the bus.'},'story',{assets,measure}).svg).toContain('Nine from twelve, on the bus.')
  expect(renderShare(t,{...base,alias:'Kostas'},'story',{assets,measure}).svg).not.toContain('KOSTAS')
  expect(renderShare(t,{...base,alias:'Kostas',showAlias:true},'story',{assets,measure}).svg).toContain('BY KOSTAS')
  expect(renderShare(t,{...base,statement:'<script>'},'story',{assets,measure}).svg).not.toContain('<script>')
 })
})

describe('adapters',()=>{
 const run={seed:42,cursor:3}
 const drafts=[
  coverShare('olympiacos',['All-time XI','Trivia wing']),
  triviaShare('panathinaikos',{...run,correct:9,answered:12,marks:[true,true,false,true,true,true,false,true,true,false,true,true],score:840,bestCombo:4,topic:'history'}),
  xiShare('aek-athens',{formation:'4-3-3',lines:[['A'],['B','C','D','E'],['F','G','H'],['I','J','K']],captain:'F'}),
  memoryShare('zrinjski-mostar',{...run,moves:18,pairs:6}),
  terraceShare('hapoel-tel-aviv',{question:'Who would you build around?',pick:'A player'}),
  lineupShare('olympiacos',{title:'Olympiacos v AEK',on:'2004-05-01',competition:'League',correct:8,forbidden:['Secret Name']}),
  kitShare('olympiacos',{right:2,forbidden:['Adidas']}),
  blindCowShare('panathinaikos',{clues:2,total:6,wrong:0,solved:true,seconds:34.2,forbidden:['Hidden Man','p-1']}),
  archiveShare('hapoel-petah-tikva',{eventId:'hapoel-petah-tikva:e1',title:'A cup final',when:'1955',source:'RSSSF'}),
  onThisDayShare('olympiacos',{eventId:'olympiacos:e2',title:'A title',on:'1983-05-24',source:'UEFA'}),
  timelineShare('olympiacos',{...run,correct:4,total:5,marks:[true,true,false,true,true]}),
  dailyShare('olympiacos',{slug:'trivia',name:'Trivia wing'}),
  goalShare('panathinaikos',{seed:7,points:64,max:100,forbidden:['Scorer Name']}),
  rumbleShare('olympiacos',{seed:11,us:3,them:2,five:[{position:'GK',name:'A'},{position:'DF',name:'B'},{position:'MF',name:'C'},{position:'FW',name:'D'},{position:'FW',name:'E'}],bill:'€15M'}),
 ]
 it('every builder passes the contract and links to the club’s own host',()=>{
  for(const d of drafts){expect(validateDraft(d),d.template.id).toEqual([]);expect(new URL(d.data.link).host).toBe(`${shareClub(d.data.club)!.sub}.fanlife.dubelteam.com`)}
 })
 it('a same-run link is the SAME round: seed and the original cursor, with the filters',()=>{
  const u=new URL(drafts[1]!.data.link);expect(u.pathname).toBe('/clubs/panathinaikos/trivia');expect(u.searchParams.get('seed')).toBe('42');expect(u.searchParams.get('r')).toBe('3');expect(u.searchParams.get('topic')).toBe('history')
 })
 it('trivia marks agree with the score; XI carries all eleven',()=>{
  expect(drafts[1]!.data.rows.filter(x=>x==='✓')).toHaveLength(9);expect(drafts[1]!.data.main).toBe('9/12')
  expect(drafts[2]!.data.rows).toHaveLength(11)
 })
 it('refuses a card that names the secret, wherever it hides',()=>{
  const b=blindCowShare('panathinaikos',{clues:2,total:6,wrong:0,solved:true,seconds:1,forbidden:['Hidden Man']});b.data.statement='It was Hidden Man!'
  expect(validateDraft(b)).toContain('spoiler')
  const k=kitShare('olympiacos',{right:3,forbidden:['Adidas']});k.data.rows=['Adidas','x','y'];expect(validateDraft(k)).toContain('spoiler')
 })
 it('refuses a foreign or wrong-club link',()=>{
  const d=triviaShare('olympiacos',{...run,correct:1,answered:1,marks:[true],score:1,bestCombo:1})
  expect(validateDraft({...d,data:{...d.data,link:'https://evil.example/clubs/olympiacos/trivia?seed=1&r=1'}})).toContain('link-foreign')
  expect(validateDraft({...d,data:{...d.data,link:'https://olympiacos.fanlife.dubelteam.com/clubs/panathinaikos/trivia?seed=1&r=1'}})).toContain('link-club-mismatch')
  expect(validateDraft({...d,data:{...d.data,link:'https://olympiacos.fanlife.dubelteam.com/clubs/olympiacos/trivia'}})).toContain('link-not-same-run')
 })
 it('every builder renders in every format without overflow warnings beyond its slots',()=>{
  for(const d of drafts)for(const f of FORMATS){const r=renderShare(d.template,d.data,f,{assets,measure});expect(r.warnings.filter(w=>/Forbidden|slots|needs all|must match/.test(w)),`${d.template.id} ${f}`).toEqual([])}
 })
 it('the caption carries the statement and the link, nothing the card does not',()=>{
  const d=drafts[1]!,c=shareCaption(d.template,d.data);expect(c).toContain('I remembered 9 of 12.');expect(c).toContain(d.data.link)
 })
 it('goal and rumble: the same deal, the five picked, the scorer never printed',()=>{
  const g=drafts.find(d=>d.template.id==='09-goal-freeze')!,r=drafts.find(d=>d.template.id==='10-rumble-five')!
  expect(new URL(g.data.link).searchParams.get('seed')).toBe('7');expect(g.data.main).toBe('64/100')
  const leak={...g,data:{...g.data,statement:'Scorer Name did it'}};expect(validateDraft(leak)).toContain('spoiler')
  expect(r.data.rows).toEqual(['GK · A','DF · B','MF · C','FW · D','FW · E']);expect(new URL(r.data.link).searchParams.get('seed')).toBe('11');expect(r.data.detail).toMatch(/simulated/)
 })
 it('a timeline card shows every placed mark, not the first five',()=>{
  const t=timelineShare('olympiacos',{seed:1,cursor:0,correct:7,total:10,marks:[true,true,false,true,true,true,false,true,false,true]})
  expect(t.data.rows).toHaveLength(10);expect(validateDraft(t)).toEqual([])
  expect(renderShare(t.template,t.data,'story',{assets,measure}).warnings.filter(w=>/slots/.test(w))).toEqual([])
 })
})

describe('story frame (8.10.2026)',()=>{
 const t=SHARE_TEMPLATES[2]!,base={...t,club:'panathinaikos',link:'https://panathinaikos.fanlife.dubelteam.com/'}
 it('keeps reading text out of the 260px Instagram bands; the person’s words are a printed quote',()=>{
  const svg=renderShare(t,{...base,statement:'Nine from twelve, on the bus.'},'story',{assets,measure}).svg
  const ys=[...svg.matchAll(/<text x="[\d.-]+" y="([\d.-]+)"[^>]*data-field="(headline|context|detail|cta|site)[^"]*"/g)].map(m=>Number(m[1]))
  expect(ys.length).toBeGreaterThan(4)
  for(const y of ys){expect(y).toBeGreaterThan(260);expect(y).toBeLessThan(1920-200)}
  expect(svg).toContain('“');expect(svg).toContain('Nine from twelve, on the bus.')
 })
})
