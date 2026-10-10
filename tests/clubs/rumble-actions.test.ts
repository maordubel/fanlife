import {describe,it,expect,vi} from 'vitest'
vi.setConfig({testTimeout:180_000})
vi.mock('next/headers',()=>({headers:()=>new Headers({host:'fanlife.dubelteam.com'})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['celtic','aek-athens','olympiacos'].map(id=>({id,status:'live',gates:[9]}))})}))
import {playRumble,rumbleDeal} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {loadClub} from '@/lib/clubs/resolver'
import {ratedPool,dealDraft} from '@/lib/clubs/rumble'
import {affordableSeed} from '@/lib/clubs/rumble-show'
import {encodeDuel} from '@/lib/clubs/rumble-duel'

async function side(id:string,seed0:number){const d=(await loadClub(id))!.data,pool=ratedPool(d),seed=affordableSeed(s=>dealDraft(pool,s),seed0),picks=dealDraft(pool,seed).map(c=>c.slice().sort((a,b)=>a.price-b.price)[0]!.id);return {d,pool,seed,picks}}
describe('gate 9 · head to head, on the server',()=>{
 it('plays your club against another club and names whose five it was',async()=>{
  const me=await side('celtic',3),vsPool=ratedPool((await loadClub('aek-athens'))!.data)
  const seed=affordableSeed(s=>dealDraft(me.pool,s,{kind:'club',pool:vsPool}),3),picks=dealDraft(me.pool,seed,{kind:'club',pool:vsPool}).map(c=>c.slice().sort((a,b)=>a.price-b.price)[0]!.id)
  const r=await playRumble('celtic',me.d.version,seed,picks,'aek-athens')
  expect(r).not.toBeNull();expect(r!.rivalClub).toBe('aek-athens');expect(r!.script.them.every(p=>vsPool.some(x=>x.id===p.id))).toBe(true)
  expect(JSON.stringify(r)).not.toMatch(/"rating"/)
  expect(await rumbleDeal('celtic',seed,'aek-athens')).toEqual(dealDraft(me.pool,seed,{kind:'club',pool:vsPool}))
 })
 it('an unknown or locked club as opponent is refused, never swapped for something else',async()=>{
  const me=await side('celtic',5)
  expect(await playRumble('celtic',me.d.version,me.seed,me.picks,'nowhere-fc')).toBeNull()
  expect(await rumbleDeal('celtic',me.seed,'nowhere-fc')).toBeNull()
 })
 it('a friend\'s link is played as written — including the same club on both sides — and a forged one is refused',async()=>{
  const friend=await side('aek-athens',8),token=encodeDuel({c:'aek-athens',s:friend.seed,p:friend.picks})
  // I play for AEK too: the draft I am dealt has none of his five
  const me=(await loadClub('aek-athens'))!.data,pool=ratedPool(me),deal=await rumbleDeal('aek-athens',friend.seed+1,undefined,token)
  expect(deal).not.toBeNull();expect(deal!.flat().some(c=>friend.picks.includes(c.id))).toBe(false)
  const picks=deal!.map(c=>c.slice().sort((a,b)=>a.price-b.price)[0]!.id),r=await playRumble('aek-athens',me.version,friend.seed+1,picks,undefined,token)
  expect(r?.rivalClub).toBe('aek-athens');expect(r!.script.them.map(p=>p.id).sort()).toEqual([...friend.picks].sort())
  // a five the board never offered (the five most expensive men of the club) cannot be put in a link
  const best=['GK','DF','MF','MF','FW'].map((p,i)=>pool.filter(c=>c.position===p).sort((a,b)=>b.price-a.price)[i>3?1:0]!.id)
  const offered=new Set(dealDraft(friend.pool,friend.seed).flat().map(c=>c.id))
  if(!best.every(id=>offered.has(id))){expect(await rumbleDeal('aek-athens',1,undefined,encodeDuel({c:'aek-athens',s:friend.seed,p:best}))).toBeNull()}
  expect(await rumbleDeal('aek-athens',1,undefined,'garbage!!')).toBeNull()
 })
})
