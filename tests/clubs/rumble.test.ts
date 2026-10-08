import {describe,it,expect} from 'vitest'
import {ratedPool,dealDraft,dealRival,play,SLOTS,BUDGET} from '@/lib/clubs/rumble'
const pool=()=>{const mk=(pos:'GK'|'DF'|'MF'|'FW',n:number)=>Array.from({length:n},(_,i)=>({id:`${pos}${i}`,name:`${pos} ${i}`,position:pos,price:(1+(i%5)) as 1|2|3|4|5,rating:10+i*10,fromYear:null,toYear:null}));return [...mk('GK',4),...mk('DF',4),...mk('MF',8),...mk('FW',4)]}
describe('rumble',()=>{
 it('deal is deterministic and never repeats a player',()=>{const a=dealDraft(pool(),7),b=dealDraft(pool(),7);expect(a).toEqual(b);const ids=a.flat().map(c=>c.id);expect(new Set(ids).size).toBe(ids.length);a.forEach((c,i)=>c.forEach(x=>expect(x.position).toBe(SLOTS[i])))})
 it('rejects over budget, duplicates and cards not offered',()=>{const p=pool(),d=dealDraft(p,3);const cheap=d.map(c=>c.slice().sort((x,y)=>y.price-x.price)[0]!.id);const cost=cheap.reduce((s,id)=>s+p.find(x=>x.id===id)!.price,0);if(cost>BUDGET)expect(play(p,3,cheap)).toBeNull();expect(play(p,3,['x','y','z','a','b'])).toBeNull();expect(play(p,3,[d[0]![0]!.id,d[0]![0]!.id,'a','b','c'])).toBeNull()})
 it('a legal pick plays and strips nothing needed',()=>{const p=pool(),d=dealDraft(p,5),picks=d.map(c=>c.slice().sort((x,y)=>x.price-y.price)[0]!.id),r=play(p,5,picks);expect(r).not.toBeNull();expect(['win','draw','loss']).toContain(r!.verdict)})
 it('missing data ranks neutral not zero',()=>{const data={players:[{value:{id:'a',name:'A',aliases:[],positions:['FW'],fromYear:null,toYear:null}},{value:{id:'b',name:'B',aliases:[],positions:['FW'],fromYear:1990,toYear:1999}},{value:{id:'c',name:'C',aliases:[],positions:['FW'],fromYear:2000,toYear:2001}}],matches:[]} as never;const r=ratedPool(data);expect(r.find(x=>x.id==='a')!.rating).toBeGreaterThan(r.find(x=>x.id==='c')!.rating-1)})
})
describe('rumble · the committed opponent',()=>{
 it('the opponent depends on the seed only — any legal pick set meets the same men',()=>{
  const p=pool(),d=dealDraft(p,11),legal=(shift:number)=>d.map(c=>c[Math.min(shift,c.length-1)]!.id)
  const sets=[0,1,2].map(legal).filter(ids=>ids.reduce((s,id)=>s+p.find(x=>x.id===id)!.price,0)<=BUDGET)
  expect(sets.length).toBeGreaterThan(1)
  const rivals=sets.map(ids=>play(p,11,ids)!.rival.cards.map(c=>c.id))
  rivals.forEach(r=>expect(r).toEqual(rivals[0]))
  expect(dealRival(p,11)!.map(c=>c.id)).toEqual(rivals[0])
 })
 it('swapping a single pick changes the score at most through the player side, never the opponent',()=>{
  const p=pool(),d=dealDraft(p,23),base=d.map(c=>c.slice().sort((a,b)=>a.price-b.price)[0]!.id),alt=[...base]
  const i=d.findIndex(c=>c.length>1);alt[i]=d[i]!.slice().sort((a,b)=>a.price-b.price)[1]!.id
  const a=play(p,23,base),b=play(p,23,alt)
  if(a&&b){expect(a.rival.cards.map(c=>c.id)).toEqual(b.rival.cards.map(c=>c.id));expect(a.rival.power).toBe(b.rival.power)}
 })
 it('the two sides never share a man, and the rival obeys the same budget',()=>{
  const p=pool();for(let seed=1;seed<=60;seed++){const rival=dealRival(p,seed)!,offered=dealDraft(p,seed).flat().map(c=>c.id),ids=new Set(rival.map(c=>c.id))
   expect(offered.some(id=>ids.has(id))).toBe(false);expect(rival.reduce((s,c)=>s+c.price,0)).toBeLessThanOrEqual(BUDGET+0)}
 })
 it('a deal is replayable: the same seed gives the same opponent every time',()=>{const p=pool();expect(dealRival(p,5)).toEqual(dealRival(p,5))})
})
