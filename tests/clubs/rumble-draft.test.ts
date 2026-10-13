import {describe,it,expect,vi} from 'vitest'
vi.setConfig({testTimeout:600_000})
vi.mock('next/headers',()=>({headers:()=>new Headers({host:'fanlife.dubelteam.com'})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['celtic','aek-athens','olympiacos'].map(id=>({id,status:'live',gates:[9]}))})}))
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
import {xiPool} from '@/lib/clubs/rumble-xi/pool'
import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import {xiReadiness} from '@/lib/clubs/rumble-xi/readiness'
import {XI_BUDGETS,budgetFor} from '@/lib/clubs/rumble-xi/types'
import {botDraft,confirmCheck,replay} from '@/lib/draft-core/engine'
import {cardOf,draftRules} from '@/lib/clubs/rumble-draft'
import {draftContext,draftStep,draftPlay} from '@/lib/clubs/rumble-draft-server'

/** a seed whose rotating budget is `b` */
const seedFor=(b:number,k:number)=>{for(let s=k*7+1;;s++)if(budgetFor(s)===b)return s}

describe('Gate 9 on real clubs',()=>{
 it('every core club that opens the gate can finish a five and every ready shape at every budget, for three temperaments',async()=>{
  const rows:string[]=[]
  for(const id of CORE_CLUB_IDS){
   const c=await loadClub(id);if(!c||!c.data.gates['royal-rumble']?.playable)continue
   const pool=ratedPool(c.data),cards=pool.map(cardOf),t0=Date.now()
   for(const style of ['premium','budget','random','value'] as const){
    const b=botDraft(draftRules('five',3),cards,3,style);expect(b.error,`${id} five ${style}`).toBeNull()
   }
   for(const f of FORMATION_IDS){
    if(!xiReadiness(xiPool(c.data),f).ready)continue
    for(const bud of XI_BUDGETS){
     const seed=seedFor(bud,2),rules=draftRules('xi',seed,f)
     for(const style of ['premium','budget','random'] as const){
      const b=botDraft(rules,xiPool(c.data).map(cardOf),seed,style);expect(b.error,`${id} ${f} €${bud} ${style}`).toBeNull()
      expect(confirmCheck(rules,xiPool(c.data).map(cardOf),b.state)).toBeNull()
      expect(replay(rules,xiPool(c.data).map(cardOf),seed,b.log).ok).toBe(true)
     }
    }
   }
   rows.push(`${id}:${pool.length}men ${Date.now()-t0}ms`)
  }
  console.log(rows.join('\n'))
 })
 it('the server replays a log, refuses a tampered one, and decides the match only after a legal lock',async()=>{
  const id=CORE_CLUB_IDS.find(x=>x==='celtic')??CORE_CLUB_IDS[0]!,c=(await loadClub(id))!
  const a={slug:id,version:c.data.version,mode:'five' as const,seed:11},ctx=(await draftContext({...a,log:[]}))!
  const b=botDraft(ctx.rules,ctx.cards,11,'value'),t0=Date.now()
  const view=await draftStep({...a,log:b.log});expect(view.ok).toBe(true)
  console.log('replay of a full five',Date.now()-t0,'ms')
  const played=await draftPlay({...a,log:b.log});expect(played?.verdict).toBeTruthy()
  // a man the table never showed is refused whatever his price
  const forged=[...b.log];const pickAt=forged.findIndex(x=>x.t==='pick');forged[pickAt]={t:'pick',id:ctx.cards.find(x=>x.price===5&&!b.state.picks.some(p=>p.id===x.id))!.id}
  const shown=replay(ctx.rules,ctx.cards,11,b.log.slice(0,pickAt));const onTable=shown.ok&&shown.state.offers.some(o=>o.id===(forged[pickAt] as {id:string}).id)
  if(!onTable)expect((await draftStep({...a,log:forged})).ok).toBe(false)
  expect((await draftStep({...a,log:[{t:'pick',id:ctx.cards[0]!.id}]})).ok).toBe(false)
  expect((await draftStep({...a,log:'x'})).ok).toBe(false)
  expect(await draftPlay({...a,log:b.log.slice(0,-2)})).toBeNull()
  expect(JSON.stringify(view)+JSON.stringify(played)).not.toMatch(/"rating"|"reputation"/)
 })
 it('an eleven is replayed and decided on the server too, in any shape',async()=>{
  const id='celtic',c=(await loadClub(id))!,seed=seedFor(33,4),f=FORMATION_IDS.find(x=>xiReadiness(xiPool(c.data),x).ready)!
  const a={slug:id,version:c.data.version,mode:'xi' as const,seed,formation:f,rival:'same'},ctx=(await draftContext({...a,log:[]}))!
  const b=botDraft(ctx.rules,ctx.cards,seed,'random');expect(b.error).toBeNull()
  const out=await draftPlay({...a,log:b.log});expect(out?.verdict).toBeTruthy();expect(out?.rivalClub).toBe(id)
  expect((await draftStep({...a,formation:'9-9-9',log:[]})).ok).toBe(false)
 })
})
