import {describe,it,expect} from 'vitest'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {dealDraft,play,BUDGET,type Rated} from '@/lib/clubs/rumble'
import {affordableSeed,canAfford,cheapestFive,lineUp,reelStops,reelStrip,screenPos,shuffleSeed,stageMatch} from '@/lib/clubs/rumble-show'
import {allowedColours,kitFor,rumbleWardrobe,SWATCH} from '@/lib/clubs/rumble-kit'
import {clubTheme,forbiddenColor} from '@/lib/clubs/theme'
import type {KitView} from '@/lib/clubs/gate-content'

const pool=():Rated[]=>{const mk=(pos:'GK'|'DF'|'MF'|'FW',n:number)=>Array.from({length:n},(_,i)=>({id:`${pos}${i}`,name:`${pos} Player ${i}`,position:pos,price:(1+(i%5)) as 1|2|3|4|5,rating:10+i*9,fromYear:1990+i*3,toYear:1993+i*3}));return [...mk('GK',4),...mk('DF',4),...mk('MF',8),...mk('FW',4)]}
const kit=(id:string,season:string,type:string,colours:string[],design='stripes'):KitView=>({id,season,type,maker:null,design,colours,sources:[]})

describe('rumble reels — the slot machine is deterministic and honest',()=>{
 it('the same seed rolls the same strip, and every strip lands on its own card',()=>{
  const board=dealDraft(pool(),11)
  for(let slot=0;slot<board.length;slot++)for(let reel=0;reel<board[slot]!.length;reel++){
   const a=reelStrip(board,slot,reel,11),b=reelStrip(board,slot,reel,11)
   expect(a).toEqual(b)
   expect(a[a.length-1]).toBe(board[slot]![reel]!.name)
   expect(a.length).toBe(9)
   for(let i=1;i<a.length;i++)expect(a[i],'no name repeats in the window').not.toBe(a[i-1])
  }
 })
 it('another seed rolls another strip',()=>{
  const board=dealDraft(pool(),11)
  expect(reelStrip(board,0,0,11)).not.toEqual(reelStrip(board,0,0,12))
 })
 it('reels stop left to right inside the 700–900 ms reveal, and not at all under reduced motion',()=>{
  const stops=reelStops(3,false,420,180)
  expect(stops).toEqual([420,600,780])
  expect(Math.max(...stops)).toBeLessThanOrEqual(900)
  expect(reelStops(3,true)).toEqual([0,0,0])
 })
})

describe('rumble board economy',()=>{
 it('the shuffle is a different, replayable deal',()=>{
  expect(shuffleSeed(5)).toBe(shuffleSeed(5));expect(shuffleSeed(5)).not.toBe(5)
  expect(Number.isSafeInteger(shuffleSeed(5))).toBe(true)
 })
 it('a dealt board is always affordable, or the chain moves on to one that is',()=>{
  const p=pool(),deal=(s:number)=>dealDraft(p,s)
  for(let seed=1;seed<200;seed++){const s=affordableSeed(deal,seed);expect(cheapestFive(deal(s))).toBeLessThanOrEqual(BUDGET)}
 })
 it('a card that would strand the five is faded',()=>{
  const card=(id:string,price:1|2|3|4|5)=>({id,name:id,position:'MF' as const,price,fromYear:null,toYear:null})
  const draft=[[card('a',5),card('b',1)],[card('c',5),card('d',1)],[card('e',5),card('f',1)],[card('g',5),card('h',1)],[card('i',5),card('j',1)]]
  const picks=['a','c',null,null,null]
  expect(canAfford(draft,picks,2,draft[2]![0]!)).toBe(false) // 5+5+5 + 1+1 = 17
  expect(canAfford(draft,picks,2,draft[2]![1]!)).toBe(true)
  expect(canAfford(draft,[null,null,null,null,null],0,draft[0]![0]!)).toBe(true)
 })
})

describe('rumble match — staged on the server, told exactly',()=>{
 it('goal events equal the score, on the right sides, minutes strictly rising, nobody scores in goal',()=>{
  const p=pool()
  for(let seed=1;seed<120;seed++){
   const board=dealDraft(p,seed),picks=board.map(c=>[...c].sort((a,b)=>a.price-b.price)[0]!.id)
   const r=play(p,seed,picks);if(!r)continue
   const sc=stageMatch(r,seed),again=stageMatch(r,seed)
   expect(sc).toEqual(again)
   const goals=sc.events.filter(e=>e.type==='goal')
   expect(goals.filter(g=>g.side==='us').length).toBe(r.goals[0])
   expect(goals.filter(g=>g.side==='them').length).toBe(r.goals[1])
   for(let i=1;i<sc.events.length;i++)expect(sc.events[i]!.minute).toBeGreaterThan(sc.events[i-1]!.minute)
   for(const g of goals){const side=g.side==='us'?sc.us:sc.them;expect(side.find(x=>x.id===g.player)!.position).not.toBe('GK');if(g.assist)expect(g.assist).not.toBe(g.player)}
   expect(sc.final).toEqual({us:r.goals[0],them:r.goals[1],winner:r.verdict==='win'?'us':r.verdict==='loss'?'them':'draw'})
   expect(sc.us.map(x=>x.position)).toEqual(['GK','DF','MF','MF','FW'])
   expect(sc.events.length).toBeGreaterThanOrEqual(5)
   // the rival plays by the same budget
   expect(sc.bills.them).toBeLessThanOrEqual(BUDGET)
   // no rating ever leaves in the script
   expect(JSON.stringify(sc)).not.toContain('rating')
  }
 })
})

describe('rumble pitch geometry',()=>{
 it('no two men of one five stand on top of each other, and the halves never cross',()=>{
  const card=(id:string,position:'GK'|'DF'|'MF'|'FW')=>({id,name:id,position,price:1 as const,fromYear:null,toYear:null})
  for(const side of ['us','them'] as const){
   const five=lineUp([card('g','GK'),card('d','DF'),card('m1','MF'),card('m2','MF'),card('f','FW')],side).map(screenPos)
   for(let i=0;i<five.length;i++)for(let j=i+1;j<five.length;j++){const a=five[i]!,b=five[j]!;expect(Math.abs(a.x-b.x)>=20||Math.abs(a.y-b.y)>=9.5,`${i}/${j}`).toBe(true)}
   for(const p of five)expect(side==='us'?p.y>50:p.y<50).toBe(true)
  }
 })
})

describe('rumble kits — every club, never a rival colour',()=>{
 it('drops rival colours: green for Olympiacos, red for Panathinaikos, nothing for Hapoel Tel Aviv',()=>{
  const oly=clubTheme({id:'olympiacos',primary:'#C8102E'}),pao=clubTheme({id:'panathinaikos',primary:'#0B7A3B'}),hta=clubTheme({id:'hapoel-tel-aviv',primary:'#B02D10'})
  expect(allowedColours(['red','green','white'],h=>forbiddenColor(oly,h))).toEqual(['red','white'])
  expect(allowedColours(['red','green','white'],h=>forbiddenColor(pao,h))).toEqual(['green','white'])
  expect(allowedColours(['red','cream','black'],h=>forbiddenColor(hta,h))).toEqual(['red','cream','black'])
 })
 it('never paints a colour the magazine cannot (yellow and gold included)',()=>{
  expect(allowedColours(['yellow','gold','orange','red'],()=>false)).toEqual(['red'])
  expect(Object.keys(SWATCH)).not.toContain('yellow')
 })
 it('dresses each side in the documented kit nearest the man\'s years, home for yours and away for theirs',()=>{
  const w=rumbleWardrobe([kit('h1','1995/96','home',['red','white']),kit('h2','2015/16','home',['red','white']),kit('a1','2016/17','away',['navy','red']),kit('x','2010/11','home',['yellow'])],()=>false)
  expect(w.home.map(k=>k.id)).toEqual(['h1','h2'])
  expect(kitFor({fromYear:1993,toYear:1998},'us',w)).toEqual({source:'archive',kit:w.home[0]})
  expect(kitFor({fromYear:2012,toYear:2020},'us',w)).toEqual({source:'archive',kit:w.home[1]})
  expect(kitFor({fromYear:null,toYear:null},'us',w)).toEqual({source:'archive',kit:w.home[1]})
  expect(kitFor({fromYear:1990,toYear:1991},'them',w)).toEqual({source:'archive',kit:w.away[0]})
 })
 it('a club with no documented kit wears its livery — never an empty box',()=>{
  const w=rumbleWardrobe([],()=>false)
  expect(kitFor({fromYear:2000,toYear:2001},'us',w)).toEqual({source:'livery',variant:'home'})
  expect(kitFor({fromYear:2000,toYear:2001},'them',w)).toEqual({source:'livery',variant:'away'})
 })
 it('a kit left with no allowed colour is not worn',()=>{
  const oly=clubTheme({id:'olympiacos',primary:'#C8102E'})
  const w=rumbleWardrobe([kit('g','2001/02','home',['green'])],h=>forbiddenColor(oly,h))
  expect(w.home).toEqual([])
 })
 it('the rumble components hold no raw colour and no Worker (Hebrew) strings',()=>{
  const dir=join(process.cwd(),'components/clubs/rumble')
  for(const f of readdirSync(dir)){const t=readFileSync(join(dir,f),'utf8');expect(/#[0-9a-f]{3,8}\b/i.test(t),f).toBe(false);expect(/[֐-׿]/.test(t),f).toBe(false);expect(/yellow|gold/i.test(t.replace(/\/\*[\s\S]*?\*\//g,'')),f).toBe(false);expect(t.includes('royal-rumble/i18n'),f).toBe(false)}
 })
})
